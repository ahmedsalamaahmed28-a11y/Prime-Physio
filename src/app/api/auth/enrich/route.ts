import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getAdminClient } from "@/lib/supabase";

function mapStaffRoleToRoleKey(role: string): string {
  const lower = role?.toLowerCase().trim();
  if (lower === "مدير العياده" || lower === "admin" || lower === "clinic_admin") return "admin";
  if (lower === "استشاري" || lower === "أخصائي" || lower === "ممارس" || lower === "doctor") return "doctor";
  if (lower === "موظف استقبال" || lower === "receptionist") return "receptionist";
  if (lower === "platform_admin" || lower === "مدير المنصة") return "platform_admin";
  return "doctor";
}

function getArabicRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "مدير المنصة";
  if (roleKey === "admin") return "مدير العيادة";
  if (roleKey === "doctor") return "طبيب معالج";
  return "موظف استقبال";
}

function getEnglishRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "Platform Admin";
  if (roleKey === "admin") return "Clinic Admin";
  if (roleKey === "doctor") return "Therapist";
  return "Receptionist";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ clinicId: null, role: null });
    }

    const admin = getAdminClient();
    const { data: staff, error } = await admin
      .from("staff")
      .select("clinic_id, role")
      .eq("email", session.user.email)
      .maybeSingle();

    if (error || !staff?.clinic_id) {
      return NextResponse.json({ clinicId: null, role: null });
    }

    const roleKey = mapStaffRoleToRoleKey(staff.role);
    return NextResponse.json({
      clinicId: staff.clinic_id,
      role: staff.role,
      roleKey,
      roleAr: getArabicRoleLabel(roleKey),
      roleEn: getEnglishRoleLabel(roleKey),
    });
  } catch {
    return NextResponse.json({ clinicId: null, role: null });
  }
}
