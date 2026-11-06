"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Users, Loader2, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  clinicName: string;
  created_at: string;
}

export default function PlatformUsersPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (user.roleKey !== "platform_admin") {
      router.replace("/");
      return;
    }
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
    setLoading(false);
  };

  const deleteUser = async (email: string) => {
    if (!confirm((isRtl ? "هل أنت متأكد من حذف هذا المستخدم؟" : "Are you sure you want to delete this user?"))) return;
    setDeleting(email);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, action: "delete" }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.email !== email));
      }
    } catch {}
    setDeleting(null);
  };

  const translateRole = (role: string) => {
    if (isRtl) return role;
    const roles: Record<string, string> = {
      "مدير العيادة": "Clinic Manager",
      "مدير العياده": "Clinic Manager",
      "مدير النظام": "System Administrator",
      "استشاري علاج طبيعي": "PT Consultant",
      "أخصائي علاج طبيعي": "Physical Therapist",
      "ممارس علاج طبيعي": "PT Practitioner",
      "موظف استقبال": "Receptionist",
      "platform_admin": "Platform Administrator",
      "admin": "Clinic Administrator",
      "doctor": "Doctor",
      "receptionist": "Receptionist",
    };
    return roles[role] || role;
  };

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-indigo-600" />
        <h1 className="text-xl font-bold text-slate-800">{isRtl ? "إدارة المستخدمين" : "User Management"}</h1>
        <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{isRtl ? "الكل" : "Total"}: {users.length}</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">{isRtl ? "لا يوجد مستخدمين مسجلين بعد" : "No users registered yet"}</div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-slate-600">
              <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "الاسم" : "Name"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "البريد الإلكتروني" : "Email"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "الدور" : "Role"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "العيادة" : "Clinic"}</th>
                  <th className="px-6 py-4 font-semibold">{isRtl ? "تاريخ التسجيل" : "Registration Date"}</th>
                  <th className="px-6 py-4 font-semibold text-center">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{u.name}</td>
                    <td className="px-6 py-4" dir="ltr" style={{ textAlign: "right" }}>{u.email}</td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-md text-xs font-medium">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{u.clinicName}</td>
                    <td className="px-6 py-4">{new Date(u.created_at).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => deleteUser(u.email)}
                        disabled={deleting === u.email}
                        className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors disabled:opacity-50"
                        title={isRtl ? "حذف المستخدم" : "Delete User"}
                      >
                        {deleting === u.email ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
