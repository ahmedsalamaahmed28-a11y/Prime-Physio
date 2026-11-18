import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { requireRole } from "@/app/api/utils/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const INACTIVE = new Set(["محذوف", "deleted", "inactive", "غير نشط"]);

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store, private" } });
}

export async function GET(req: NextRequest) {
  const context = await getClinicContext(req);
  if ("response" in context) return context.response;
  try {
    const auth = await requireRole(req, ["admin", "doctor", "receptionist"]);
    const { admin, clinicId } = context;
    const email = auth.email.toLowerCase();

    const [{ data: conversations, error: conversationError }, { data: staffRows, error: staffError }, { data: owners, error: ownersError }, { data: patients, error: patientsError }] = await Promise.all([
      admin.from("chat_conversations").select("id,clinic_id,kind,title,patient_id,created_by_email,created_at,updated_at,last_message_at").eq("clinic_id", clinicId).order("last_message_at", { ascending: false }).limit(150),
      admin.from("staff").select("email,name,role,status").eq("clinic_id", clinicId),
      admin.from("clinic_owners").select("owner_email").eq("clinic_id", clinicId),
      admin.from("patients").select("id,nameAr,phone").eq("clinic_id", clinicId).eq("is_archived", false).order("nameAr", { ascending: true }).limit(500),
    ]);
    if (conversationError || staffError || ownersError || patientsError) {
      console.error("[Messages API] Inbox query failed", conversationError || staffError || ownersError || patientsError);
      return fail("تعذر تحميل صندوق الرسائل. تأكد من تطبيق تحديث قاعدة البيانات.", 503);
    }

    const visibleStaff = (staffRows || []).filter((row: any) => row.email && !INACTIVE.has(String(row.status || "").trim().toLowerCase()));
    const ownerEmails = [...new Set((owners || []).map((row: any) => String(row.owner_email || "").toLowerCase()).filter(Boolean))];
    const ownerOnlyEmails = ownerEmails.filter((ownerEmail) => !visibleStaff.some((row: any) => String(row.email).toLowerCase() === ownerEmail));
    let ownerProfiles: any[] = [];
    if (ownerOnlyEmails.length) {
      const { data } = await admin.from("auth_accounts").select("email,name").in("email", ownerOnlyEmails);
      ownerProfiles = data || [];
    }

    const directory = [
      ...visibleStaff.map((row: any) => ({ email: String(row.email).toLowerCase(), name: row.name || row.email, role: row.role || "عضو فريق" })),
      ...ownerProfiles.map((row: any) => ({ email: String(row.email).toLowerCase(), name: row.name || row.email, role: "مدير المركز" })),
    ].filter((row: any, index: number, all: any[]) => all.findIndex((candidate) => candidate.email === row.email) === index);

    const ids = (conversations || []).map((item: any) => item.id);
    if (!ids.length) {
      return NextResponse.json({ conversations: [], directory: directory.filter((item: any) => item.email !== email), patients: patients || [], currentEmail: email });
    }

    const [{ data: memberships, error: membershipsError }, { data: latestMessages, error: messagesError }] = await Promise.all([
      admin.from("chat_participants").select("conversation_id,email,display_name,role,last_read_at").eq("clinic_id", clinicId).in("conversation_id", ids),
      admin.from("chat_messages").select("id,conversation_id,sender_email,sender_name,body,created_at").eq("clinic_id", clinicId).in("conversation_id", ids).order("created_at", { ascending: false }).limit(600),
    ]);
    if (membershipsError || messagesError) {
      console.error("[Messages API] Participant/message query failed", membershipsError || messagesError);
      return fail("تعذر تحميل المحادثات", 503);
    }

    const myConversationIds = new Set((memberships || []).filter((item: any) => item.email === email).map((item: any) => item.conversation_id));
    const memberMap = new Map<string, any[]>();
    for (const member of memberships || []) {
      if (!myConversationIds.has(member.conversation_id)) continue;
      const list = memberMap.get(member.conversation_id) || [];
      list.push(member);
      memberMap.set(member.conversation_id, list);
    }
    const latestMap = new Map<string, any>();
    const unreadMap = new Map<string, number>();
    for (const message of latestMessages || []) {
      if (!myConversationIds.has(message.conversation_id)) continue;
      if (!latestMap.has(message.conversation_id)) latestMap.set(message.conversation_id, message);
      if (message.sender_email !== email) {
        const mine = (memberMap.get(message.conversation_id) || []).find((item) => item.email === email);
        if (mine && new Date(message.created_at).getTime() > new Date(mine.last_read_at).getTime()) {
          unreadMap.set(message.conversation_id, (unreadMap.get(message.conversation_id) || 0) + 1);
        }
      }
    }

    const visibleConversations = (conversations || []).filter((item: any) => myConversationIds.has(item.id)).map((item: any) => ({
      ...item,
      participants: memberMap.get(item.id) || [],
      lastMessage: latestMap.get(item.id) || null,
      unreadCount: unreadMap.get(item.id) || 0,
    }));

    return NextResponse.json({
      conversations: visibleConversations,
      directory: directory.filter((item: any) => item.email !== email),
      patients: patients || [],
      currentEmail: email,
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[Messages API] Inbox failed", error);
    return fail("حدث خطأ أثناء تحميل الرسائل", 500);
  }
}

export async function POST(req: NextRequest) {
  const context = await getClinicContext(req);
  if ("response" in context) return context.response;
  try {
    const auth = await requireRole(req, ["admin", "doctor", "receptionist"]);
    const { admin, clinicId } = context;
    const body = await req.json();
    const kind = body?.kind === "patient" ? "patient" : "team";
    const titleInput = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
    const patientId = typeof body?.patientId === "string" ? body.patientId.trim() : "";
    const requestedEmails = Array.isArray(body?.participantEmails)
      ? [...new Set(body.participantEmails.filter((value: unknown): value is string => typeof value === "string").map((value: string) => value.trim().toLowerCase()))]
      : [];
    const firstMessage = typeof body?.firstMessage === "string" ? body.firstMessage.trim().slice(0, 5000) : "";
    if (kind === "patient" && !patientId) return fail("اختر المريض المرتبط بالمحادثة");
    if (!requestedEmails.includes(auth.email)) requestedEmails.push(auth.email);

    const [{ data: staffRows, error: staffError }, { data: owners, error: ownersError }] = await Promise.all([
      admin.from("staff").select("email,name,role,status").eq("clinic_id", clinicId),
      admin.from("clinic_owners").select("owner_email").eq("clinic_id", clinicId),
    ]);
    if (staffError || ownersError) return fail("تعذر التحقق من أعضاء المركز", 503);
    const activeStaff = (staffRows || []).filter((row: any) => row.email && !INACTIVE.has(String(row.status || "").trim().toLowerCase()));
    const allowedEmails = new Set([
      ...activeStaff.map((row: any) => String(row.email).toLowerCase()),
      ...(owners || []).map((row: any) => String(row.owner_email).toLowerCase()),
    ]);
    if (requestedEmails.some((item: string) => !allowedEmails.has(item))) return fail("يوجد عضو غير تابع لهذا المركز", 403);

    let patient: any = null;
    if (kind === "patient") {
      const { data, error } = await admin.from("patients").select("id,nameAr").eq("clinic_id", clinicId).eq("id", patientId).eq("is_archived", false).maybeSingle();
      if (error || !data) return fail("المريض غير موجود في هذا المركز", 404);
      patient = data;
    }

    const ownerOnlyEmails = requestedEmails.filter((item: string) => !activeStaff.some((row: any) => String(row.email).toLowerCase() === item));
    let ownerProfiles: any[] = [];
    if (ownerOnlyEmails.length) {
      const { data } = await admin.from("auth_accounts").select("email,name").in("email", ownerOnlyEmails);
      ownerProfiles = data || [];
    }
    const participantRows = requestedEmails.map((participantEmail: string) => {
      const staffMember = activeStaff.find((row: any) => String(row.email).toLowerCase() === participantEmail);
      const ownerProfile = ownerProfiles.find((row: any) => String(row.email).toLowerCase() === participantEmail);
      return {
        email: participantEmail,
        display_name: staffMember?.name || ownerProfile?.name || participantEmail,
        role: participantEmail === auth.email ? "member" : (staffMember?.role || "owner"),
      };
    });
    const title = kind === "patient"
      ? (titleInput || ("محادثة المريض: " + patient.nameAr))
      : (titleInput || (participantRows.length === 2 ? "محادثة مباشرة" : "محادثة فريق"));
    const { data: conversation, error: createError } = await admin.from("chat_conversations").insert({
      clinic_id: clinicId,
      kind,
      title,
      patient_id: kind === "patient" ? patientId : null,
      created_by_email: auth.email,
      created_by_name: participantRows.find((item: any) => item.email === auth.email)?.display_name || auth.email,
    }).select("id,clinic_id,kind,title,patient_id,created_at,updated_at,last_message_at").single();
    if (createError || !conversation) {
      console.error("[Messages API] Conversation creation failed", createError);
      return fail("تعذر إنشاء المحادثة", 500);
    }

    const { error: membersError } = await admin.from("chat_participants").insert(
      participantRows.map((item: any) => ({ conversation_id: conversation.id, clinic_id: clinicId, ...item, last_read_at: new Date().toISOString() }))
    );
    if (membersError) {
      await admin.from("chat_conversations").delete().eq("id", conversation.id).eq("clinic_id", clinicId);
      console.error("[Messages API] Participant creation failed", membersError);
      return fail("تعذر إضافة أعضاء المحادثة", 500);
    }

    let initialMessage = null;
    if (firstMessage) {
      const sender = participantRows.find((item: any) => item.email === auth.email);
      const { data, error } = await admin.from("chat_messages").insert({
        conversation_id: conversation.id, clinic_id: clinicId,
        sender_email: auth.email, sender_name: sender?.display_name || auth.email, body: firstMessage,
      }).select("id,conversation_id,sender_email,sender_name,body,created_at").single();
      if (error) {
        console.error("[Messages API] Initial message failed", error);
        return fail("تم إنشاء المحادثة لكن تعذر إرسال الرسالة الأولى", 500);
      }
      initialMessage = data;
      await admin.from("chat_conversations").update({ last_message_at: data.created_at, updated_at: data.created_at }).eq("id", conversation.id).eq("clinic_id", clinicId);
    }

    return NextResponse.json({ conversation: { ...conversation, participants: participantRows, lastMessage: initialMessage, unreadCount: 0 } }, { status: 201, headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("[Messages API] Create conversation failed", error);
    return fail("حدث خطأ أثناء إنشاء المحادثة", 500);
  }
}
