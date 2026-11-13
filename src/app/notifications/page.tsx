"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";
import { Bell, ShieldAlert, Activity, CalendarDays } from "lucide-react";

interface NotificationItem {
  id: string;
  titleAr: string;
  titleEn: string;
  detailsAr: string;
  detailsEn: string;
  createdAt: string;
  type: "broadcast" | "audit" | "clinic";
  readKey: string;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      
      // Fetch Broadcasts
      const { data: broadcasts } = await supabase
        .from("system_broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      const mappedBroadcasts: NotificationItem[] = (broadcasts || []).map((b: any) => ({
        id: b.id,
        titleAr: `📢 إشعار عام: ${b.title}`,
        titleEn: `📢 System Broadcast: ${b.title}`,
        detailsAr: b.message,
        detailsEn: b.message,
        createdAt: b.created_at || new Date().toISOString(),
        type: "broadcast",
        readKey: `broadcast:${b.id}`
      }));

      // Fetch clinic-scoped notifications such as public appointment requests
      let mappedClinicNotifications: NotificationItem[] = [];
      if (user?.clinicId) {
        const { data: clinicItems } = await supabase
          .from("notifications")
          .select("id, title_ar, title_en, body_ar, body_en, created_at")
          .eq("clinic_id", user.clinicId)
          .order("created_at", { ascending: false })
          .limit(50);

        mappedClinicNotifications = (clinicItems || []).map((item: any) => ({
          id: item.id,
          titleAr: item.title_ar || "تنبيه جديد",
          titleEn: item.title_en || "New notification",
          detailsAr: item.body_ar || "",
          detailsEn: item.body_en || "",
          createdAt: item.created_at || new Date().toISOString(),
          type: "clinic",
          readKey: `clinic:${item.id}`
        }));
      }

      // Fetch Audit Logs if clinic
      let mappedAudit: NotificationItem[] = [];
      if (user?.clinicId) {
        const { data: audit } = await supabase
          .from("audit_logs")
          .select("*")
          .eq("clinic_id", user.clinicId)
          .order("created_at", { ascending: false })
          .limit(50);

        mappedAudit = (audit || []).map((a: any) => {
          let titleAr = "تحديث في النظام";
          let titleEn = "System Update";
          
          if (a.action.includes("CREATE")) {
            titleAr = "إضافة جديدة"; titleEn = "New addition";
          } else if (a.action.includes("UPDATE")) {
            titleAr = "تعديل بيانات"; titleEn = "Data update";
          } else if (a.action.includes("DELETE")) {
            titleAr = "حذف بيانات"; titleEn = "Data deletion";
          } else if (a.action.includes("LOGIN")) {
            titleAr = "تسجيل دخول"; titleEn = "Login";
          }

          return {
            id: a.id,
            titleAr,
            titleEn,
            detailsAr: a.details || "تم تنفيذ عملية داخل النظام",
            detailsEn: a.details || "An action was performed",
            createdAt: a.created_at,
            type: "audit",
            readKey: `audit:${a.id}`
          };
        });
      }

      const combined = [...mappedBroadcasts, ...mappedClinicNotifications, ...mappedAudit].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setNotifications(combined);

      // Viewing the full notifications history marks the displayed items as read.
      const readKeys = combined.map((item) => item.readKey);
      if (user?.email && readKeys.length > 0) {
        const storageKey = `prime-physio:notifications:read:${user.clinicId || "no-clinic"}:${user.email.toLowerCase()}`;
        try {
          const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
          const existing = Array.isArray(saved) ? saved.filter((key): key is string => typeof key === "string") : [];
          localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set([...existing, ...readKeys]))));
        } catch (error) {
          console.warn("Could not persist notification read state", error);
        }
        window.dispatchEvent(new CustomEvent("prime-physio:notifications-read", { detail: readKeys }));
      }
      setLoading(false);
    }

    if (user) {
      fetchAll();
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-[#4F46BA]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{isRtl ? "كافة الإشعارات" : "All Notifications"}</h1>
            <p className="text-sm text-slate-500">{isRtl ? "سجل التنبيهات والأحداث الخاصة بالعيادة والنظام" : "History of all clinic and system alerts"}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              <Activity className="w-8 h-8 mx-auto mb-3 animate-spin text-[#4F46BA]" />
              <p>{isRtl ? "جاري تحميل الإشعارات..." : "Loading notifications..."}</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>{isRtl ? "لا توجد إشعارات حالياً" : "No notifications available"}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((item) => (
                <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === "broadcast" ? "bg-rose-50 text-rose-600" : item.type === "clinic" ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-[#4F46BA]"
                  }`}>
                    {item.type === "broadcast" ? <Bell className="w-5 h-5" /> : item.type === "clinic" ? <CalendarDays className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 mb-1">{isRtl ? item.titleAr : item.titleEn}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2">{isRtl ? item.detailsAr : item.detailsEn}</p>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {new Date(item.createdAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
