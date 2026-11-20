import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { requireRole } from "@/app/api/utils/auth";
import { hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ conversationId: string }> };

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store, private" } });
}

async function getMembership(admin: any, clinicId: string, conversationId: string, email: string) {
  const { data, error } = await admin.from("chat_participants")
    .select("conversation_id,email,display_name,role,last_read_at")
    .eq("clinic_id", clinicId)
    .eq("conversation_id", conversationId)
    .eq("email", email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const clinic = await getClinicContext(req);
  if ("response" in clinic) return clinic.response;
  try {
    const auth = await requireRole(req, ["admin", "doctor", "receptionist"]);
    const { conversationId } = await context.params;
    const { data: conversation, error: conversationError } = await clinic.admin.from("chat_conversations")
      .select("id,kind,patient_id").eq("clinic_id", clinic.clinicId).eq("id", conversationId).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return fail("هذه المحادثة غير متاحة لحسابك", 404);
    if (conversation.kind === "patient" && !hasStaffPermission(clinic.staff, "view_patients")) {
      return fail("ليس لديك صلاحية مشاهدة محادثات المرضى", 403);
    }
    const membership = await getMembership(clinic.admin, clinic.clinicId, conversationId, auth.email);
    if (!membership) return fail("هذه المحادثة غير متاحة لحسابك", 404);

    const [{ data: messages, error: messagesError }, { data: participants, error: participantsError }] = await Promise.all([
      clinic.admin.from("chat_messages").select("id,conversation_id,sender_email,sender_name,body,created_at")
        .eq("clinic_id", clinic.clinicId).eq("conversation_id", conversationId).order("created_at", { ascending: true }).limit(250),
      clinic.admin.from("chat_participants").select("email,display_name,role,last_read_at")
        .eq("clinic_id", clinic.clinicId).eq("conversation_id", conversationId),
    ]);
    if (messagesError || participantsError) {
      console.error("[Messages API] Thread load failed", messagesError || participantsError);
      return fail("تعذر تحميل الرسائل", 500);
    }

    await clinic.admin.from("chat_participants").update({ last_read_at: new Date().toISOString() })
      .eq("clinic_id", clinic.clinicId).eq("conversation_id", conversationId).eq("email", auth.email);

    return NextResponse.json({ messages: messages || [], participants: participants || [], currentEmail: auth.email }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    console.error("[Messages API] Thread GET failed", error);
    return fail("حدث خطأ أثناء تحميل المحادثة", 500);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  const clinic = await getClinicContext(req);
  if ("response" in clinic) return clinic.response;
  try {
    const auth = await requireRole(req, ["admin", "doctor", "receptionist"]);
    if (!hasStaffPermission(clinic.staff, "send_messages")) {
      return fail("ليس لديك صلاحية إرسال الرسائل", 403);
    }
    const { conversationId } = await context.params;
    const { data: conversation, error: conversationError } = await clinic.admin.from("chat_conversations")
      .select("id,kind,patient_id").eq("clinic_id", clinic.clinicId).eq("id", conversationId).maybeSingle();
    if (conversationError) throw conversationError;
    if (!conversation) return fail("هذه المحادثة غير متاحة لحسابك", 404);
    if (conversation.kind === "patient" && !hasStaffPermission(clinic.staff, "view_patients")) {
      return fail("ليس لديك صلاحية إرسال رسائل في محادثات المرضى", 403);
    }
    const membership = await getMembership(clinic.admin, clinic.clinicId, conversationId, auth.email);
    if (!membership) return fail("هذه المحادثة غير متاحة لحسابك", 404);

    const body = await req.json();
    const messageText = typeof body?.body === "string" ? body.body.trim() : "";
    if (!messageText || messageText.length > 5000) return fail("اكتب رسالة لا تتجاوز 5000 حرف");
    const { data: message, error } = await clinic.admin.from("chat_messages").insert({
      conversation_id: conversationId,
      clinic_id: clinic.clinicId,
      sender_email: auth.email,
      sender_name: membership.display_name || auth.email,
      body: messageText,
    }).select("id,conversation_id,sender_email,sender_name,body,created_at").single();
    if (error || !message) {
      console.error("[Messages API] Message insert failed", error);
      return fail("تعذر إرسال الرسالة", 500);
    }

    await clinic.admin.from("chat_conversations").update({
      last_message_at: message.created_at,
      updated_at: message.created_at,
    }).eq("id", conversationId).eq("clinic_id", clinic.clinicId);

    return NextResponse.json({ message }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[Messages API] Message POST failed", error);
    return fail("حدث خطأ أثناء إرسال الرسالة", 500);
  }
}
