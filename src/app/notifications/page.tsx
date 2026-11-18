"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";
import {
  Bell, ShieldAlert, Activity, Calendar, Search, RefreshCw,
  FileText, Check, MessageSquare, Clock, Filter,
} from "lucide-react";

interface NotificationItem {
  id: string;
  titleAr: string;
  titleEn: string;
  detailsAr: string;
  detailsEn: string;
  createdAt: string;
  type: "broadcast" | "audit" | "clinic";
  readKey: string;
  isRead: boolean;
}

type FilterKey = "all" | "clinic" | "broadcast" | "audit";

export default function NotificationsPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [error, setError] = useState("");
  const [readSyncError, setReadSyncError] = useState("");

  const loadNotifications = useCallback(async (silent = false) => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser?.id) throw new Error(isRtl ? "تعذر التحقق من جلسة المستخدم لمزامنة القراءة." : "Could not verify the signed-in user for read synchronization.");
      const [broadcastResult, clinicResult, auditResult, readStatesResult] = await Promise.all([
        supabase.from("system_broadcasts")
          .select("id, title, message, created_at")
          .order("created_at", { ascending: false }).limit(30),
        user.clinicId
          ? supabase.from("notifications")
              .select("id, title_ar, title_en, body_ar, body_en, created_at")
              .eq("clinic_id", user.clinicId)
              .order("created_at", { ascending: false }).limit(100)
          : Promise.resolve({ data: [], error: null } as any),
        user.clinicId
          ? supabase.from("audit_logs")
              .select("id, action, entity, entity_id, details, created_at")
              .eq("clinic_id", user.clinicId)
              .order("created_at", { ascending: false }).limit(100)
          : Promise.resolve({ data: [], error: null } as any),
        supabase.from("notification_read_states").select("source, notification_id").eq("user_id", authUser.id),
      ]);

      if (broadcastResult.error && clinicResult.error && auditResult.error) {
        throw new Error(isRtl ? "تعذر تحميل الإشعارات. حاول مرة أخرى." : "Notifications could not be loaded. Please try again.");
      }

      const broadcasts: NotificationItem[] = (broadcastResult.data || []).map((item: any) => ({
        id: String(item.id),
        titleAr: `إشعار عام: ${item.title || "تنبيه"}`,
        titleEn: `System announcement: ${item.title || "Notice"}`,
        detailsAr: item.message || "",
        detailsEn: item.message || "",
        createdAt: item.created_at || new Date().toISOString(),
        type: "broadcast",
        readKey: `broadcast:${item.id}`,
        isRead: false,
      }));

      const clinicItems: NotificationItem[] = (clinicResult.data || []).map((item: any) => ({
        id: String(item.id),
        titleAr: item.title_ar || "تنبيه جديد",
        titleEn: item.title_en || "New notification",
        detailsAr: item.body_ar || "",
        detailsEn: item.body_en || "",
        createdAt: item.created_at || new Date().toISOString(),
        type: "clinic",
        readKey: `clinic:${item.id}`,
        isRead: false,
      }));

      const auditItems: NotificationItem[] = (auditResult.data || []).map((item: any) => {
        const action = String(item.action || "").toUpperCase();
        let titleAr = "تحديث في النظام";
        let titleEn = "System activity";
        if (action.includes("CREATE") || action === "INSERT") { titleAr = "إضافة سجل جديد"; titleEn = "New record added"; }
        else if (action.includes("UPDATE")) { titleAr = "تحديث بيانات"; titleEn = "Record updated"; }
        else if (action.includes("DELETE")) { titleAr = "حذف سجل"; titleEn = "Record deleted"; }
        else if (action.includes("LOGIN")) { titleAr = "تسجيل دخول"; titleEn = "New login"; }
        const entity = String(item.entity || "");
        const detailValue = item.details && typeof item.details === "object" ? (item.details.message || JSON.stringify(item.details)) : item.details;
        const details = [entity, detailValue || item.entity_id || ""].filter(Boolean).join(" • ");
        return {
          id: String(item.id),
          titleAr,
          titleEn,
          detailsAr: details || "تم تنفيذ عملية داخل النظام",
          detailsEn: details || "An action was performed in the system",
          createdAt: item.created_at || new Date().toISOString(),
          type: "audit" as const,
          readKey: `audit:${item.id}`,
          isRead: false,
        };
      });

      if (readStatesResult.error) throw readStatesResult.error;
      const savedReadKeys = new Set((readStatesResult.data || []).map((row: any) => `${row.source}:${row.notification_id}`));
      const combined = [...broadcasts, ...clinicItems, ...auditItems]
        .map((item) => ({
          ...item,
          isRead: savedReadKeys.has(item.readKey),
        }))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Persist read state in Supabase so it follows the signed-in user across devices.
      const readKeys = combined.map((item) => item.readKey);
      const readReceipts = combined.map((item) => ({
        user_id: authUser.id,
        source: item.type,
        notification_id: item.id,
        read_at: new Date().toISOString(),
      }));
      const syncErrors: unknown[] = [];
      if (readReceipts.length) {
        const { error: receiptError } = await supabase.from("notification_read_states")
          .upsert(readReceipts, { onConflict: "user_id,source,notification_id" });
        if (receiptError) syncErrors.push(receiptError);
      }

      if (syncErrors.length) {
        console.error("Failed to synchronize notification read state", syncErrors);
        setReadSyncError(isRtl ? "تعذر مزامنة حالة قراءة بعض الإشعارات." : "Some notification read states could not be synchronized.");
        setNotifications(combined);
      } else {
        setReadSyncError("");
        const readCombined = combined.map((item) => ({ ...item, isRead: true }));
        setNotifications(readCombined);
        if (user.email && readKeys.length) {
          const storageKey = `prime-physio:notifications:read:${user.clinicId || "no-clinic"}:${user.email.toLowerCase()}`;
          try {
            const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
            const existing = Array.isArray(saved) ? saved.filter((key): key is string => typeof key === "string") : [];
            localStorage.setItem(storageKey, JSON.stringify(Array.from(new Set([...existing, ...readKeys]))));
          } catch (storageError) {
            console.warn("Could not update local notification cache", storageError);
          }
          window.dispatchEvent(new CustomEvent("prime-physio:notifications-read", { detail: readKeys }));
        }
      }
    } catch (loadError) {
      console.error("Failed to load notifications", loadError);
      setError(loadError instanceof Error ? loadError.message : (isRtl ? "حدث خطأ غير متوقع." : "An unexpected error occurred."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, isRtl]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return notifications.filter((item) => {
      const matchesFilter = filter === "all" || item.type === filter;
      const title = isRtl ? item.titleAr : item.titleEn;
      const details = isRtl ? item.detailsAr : item.detailsEn;
      const matchesSearch = !term || `${title} ${details}`.toLocaleLowerCase().includes(term);
      return matchesFilter && matchesSearch;
    });
  }, [notifications, filter, search, isRtl]);

  const counts = useMemo(() => ({
    all: notifications.length,
    clinic: notifications.filter((item) => item.type === "clinic").length,
    broadcast: notifications.filter((item) => item.type === "broadcast").length,
    audit: notifications.filter((item) => item.type === "audit").length,
  }), [notifications]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString(isRtl ? "ar-EG" : "en-US", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit",
    });
  };

  const filterOptions: { key: FilterKey; ar: string; en: string; icon: any }[] = [
    { key: "all", ar: "الكل", en: "All", icon: MessageSquare },
    { key: "clinic", ar: "تنبيهات المركز", en: "Clinic", icon: Calendar },
    { key: "broadcast", ar: "إعلانات النظام", en: "Announcements", icon: Bell },
    { key: "audit", ar: "نشاط النظام", en: "Activity", icon: FileText },
  ];

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl space-y-5 sm:space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#4F46BA] via-[#6650CF] to-[#7c3aed] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-start">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-bold tracking-wide text-white/85">{isRtl ? "مركز التنبيهات" : "NOTIFICATION CENTER"}</p>
              <h1 className="!text-white text-2xl font-extrabold sm:text-3xl">{isRtl ? "الإشعارات" : "Notifications"}</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/85">{isRtl ? "تابع تحديثات مركزك وإعلانات المنصة وسجل النشاط في مكان واحد." : "Keep up with clinic updates, platform announcements, and activity in one place."}</p>
            </div>
          </div>
          <div className="notifications-total-card flex w-full shrink-0 items-center gap-4 self-start rounded-2xl px-5 py-3 text-white shadow-inner sm:w-auto sm:self-auto">
            <div className="min-w-0">
              <p className="text-2xl font-black leading-tight tabular-nums !text-white">{notifications.length}</p>
              <p className="mt-0.5 text-[11px] font-semibold leading-5 !text-indigo-100">{isRtl ? "إجمالي الإشعارات" : "Total notifications"}</p>
            </div>
            <button onClick={() => loadNotifications(true)} disabled={refreshing} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-indigo-950/20 !text-white transition hover:bg-indigo-950/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:cursor-not-allowed disabled:opacity-60" aria-label={isRtl ? "تحديث الإشعارات" : "Refresh notifications"}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isRtl ? "ابحث في الإشعارات..." : "Search notifications..."} className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#4F46BA] focus:bg-white focus:ring-4 focus:ring-[#4F46BA]/15 ${isRtl ? "pr-10 pl-4" : "pl-10 pr-4"}`} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-slate-400"><Filter size={14} />{isRtl ? "تصفية:" : "Filter:"}</span>
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const active = filter === option.key;
              return <button key={option.key} onClick={() => setFilter(option.key)} aria-pressed={active} className={`inline-flex min-h-9 items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46BA] focus-visible:ring-offset-2 ${active ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white shadow-md shadow-[#4F46BA]/20" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}><Icon size={14} />{isRtl ? option.ar : option.en}<span className={`rounded-md px-1.5 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-white text-slate-500"}`}>{counts[option.key]}</span></button>;
            })}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="font-extrabold text-slate-800">{isRtl ? "سجل الإشعارات" : "Notification history"}</h2><p className="mt-1 text-xs text-slate-400">{isRtl ? `عرض ${filtered.length} من ${notifications.length} إشعار` : `Showing ${filtered.length} of ${notifications.length} notifications`}</p></div>
          <span className={`hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold sm:inline-flex ${readSyncError ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}><Check size={14} />{readSyncError || (isRtl ? "حالة القراءة متزامنة" : "Read status synced")}</span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-slate-400"><Activity className="h-8 w-8 animate-spin text-[#4F46BA]" /><p className="text-sm">{isRtl ? "جاري تحميل الإشعارات..." : "Loading notifications..."}</p></div>
        ) : error ? (
          <div className="flex flex-col items-center px-6 py-16 text-center"><ShieldAlert className="mb-3 h-10 w-10 text-rose-400" /><p className="font-bold text-slate-700">{error}</p><button onClick={() => loadNotifications()} className="mt-4 rounded-xl bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-[#4F46BA]/20 transition hover:from-[#4338ca] hover:to-[#6d28d9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46BA]/40">{isRtl ? "إعادة المحاولة" : "Try again"}</button></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-20 text-center"><div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[#4F46BA]"><MessageSquare className="h-8 w-8" /></div><h3 className="font-extrabold text-slate-800">{search || filter !== "all" ? (isRtl ? "لا توجد نتائج مطابقة" : "No matching notifications") : (isRtl ? "لا توجد إشعارات حتى الآن" : "You're all caught up")}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{search || filter !== "all" ? (isRtl ? "جرّب تغيير كلمات البحث أو نوع الإشعار." : "Try changing your search or selected filter.") : (isRtl ? "ستظهر هنا التنبيهات الجديدة المتعلقة بمركزك والنظام." : "New clinic and system notifications will appear here.")}</p>{(search || filter !== "all") && <button onClick={() => { setSearch(""); setFilter("all"); }} className="mt-4 text-sm font-bold text-[#4F46BA] hover:underline">{isRtl ? "مسح التصفية" : "Clear filters"}</button>}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => {
              const isBroadcast = item.type === "broadcast";
              const isClinic = item.type === "clinic";
              const Icon = isBroadcast ? Bell : isClinic ? Calendar : Activity;
              const title = isRtl ? item.titleAr : item.titleEn;
              const details = isRtl ? item.detailsAr : item.detailsEn;
              return (
                <article key={item.readKey} className="group flex min-w-0 gap-3 px-4 py-4 transition hover:bg-slate-50/80 sm:gap-4 sm:px-6">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isBroadcast ? "bg-amber-50 text-amber-600" : isClinic ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-[#3525cd]"}`}><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="min-w-0 break-words text-sm font-extrabold text-slate-800">{title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isBroadcast ? "bg-amber-50 text-amber-700" : isClinic ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-800"}`}>{isBroadcast ? (isRtl ? "إعلان" : "Announcement") : isClinic ? (isRtl ? "المركز" : "Clinic") : (isRtl ? "نشاط" : "Activity")}</span></div>
                    {details && <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 [overflow-wrap:anywhere]">{details}</p>}
                    <p className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400"><Clock size={12} />{formatDate(item.createdAt)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      <p className="px-1 text-center text-[11px] leading-5 text-slate-400">{isRtl ? "يتم تمييز الإشعارات المعروضة كمقروءة تلقائيًا عند فتح هذه الصفحة." : "Notifications shown here are automatically marked as read when this page is opened."}</p>
    </div>
  );
}
