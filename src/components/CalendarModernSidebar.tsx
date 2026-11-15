"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Bell, BookOpen, Building, Calendar, ChevronLeft, CreditCard, FileText, Home, LogOut, Menu, MessageSquare, Settings, Shield, ShieldAlert, Stethoscope, Users, X, Apple, Crown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { supabase } from "@/lib/supabase";

export default function CalendarModernSidebar() {
  const pathname = usePathname();
  const { user, logout, activeBranchId, setActiveBranchId } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const { hasPermission } = usePermissions();
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchMenu, setBranchMenu] = useState(false);
  const isRtl = language === "ar";

  useEffect(() => {
    if (!user?.clinicId) return;
    let alive = true;
    supabase.from("branches").select("id,short_name,full_name").eq("clinic_id", user.clinicId)
      .order("created_at", { ascending: true }).then(({ data }) => { if (alive) setBranches(data || []); });
    return () => { alive = false; };
  }, [user?.clinicId]);

  const branchName = activeBranchId
    ? (branches.find((item) => item.id === activeBranchId)?.short_name || branches.find((item) => item.id === activeBranchId)?.full_name || (isRtl ? "الفرع الحالي" : "Current branch"))
    : (user?.shortName || (isRtl ? "الفرع الرئيسي" : "Main branch"));

  const navItems = [
    { label: isRtl ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: Home },
    { label: isRtl ? "جدول المواعيد" : "Appointments", href: "/calendar", icon: Calendar },
    { label: isRtl ? "سجلات المرضى" : "Patients", href: "/patients", icon: Users },
    { label: isRtl ? "المكتبة الإكلينيكية" : "Clinical library", href: "/clinical-library", icon: BookOpen },
    { label: isRtl ? "التغذية العلاجية" : "Clinical nutrition", href: "/clinical-nutrition", icon: Apple },
    { label: isRtl ? "الفواتير والمالية" : "Billing & finance", href: "/billing", icon: CreditCard },
    { label: isRtl ? "الموارد البشرية" : "Human resources", href: "/hr", icon: Building },
    { label: isRtl ? "إدارة فريق العمل" : "Staff management", href: "/staff", icon: Stethoscope },
    { label: isRtl ? "تقارير الأداء والتحليلات" : "Analytics & reports", href: "/analytics", icon: BarChart3 },
    ...(user?.roleKey === "platform_admin" ? [
      { label: isRtl ? "إدارة المنصة" : "Platform administration", href: "/platform", icon: ShieldAlert },
      { label: isRtl ? "إدارة المحتوى" : "Content management", href: "/platform/cms", icon: FileText },
    ] : []),
    { label: isRtl ? "إعدادات المركز" : "Clinic settings", href: "/profile", icon: Settings },
    { label: isRtl ? "الصلاحيات" : "Permissions", href: "/permissions", icon: Shield },
    { label: isRtl ? "الاشتراك والباقات" : "Subscription & plans", href: "/subscription", icon: Crown },
    { label: isRtl ? "الرسائل" : "Messages", href: "/chat", icon: MessageSquare },
    { label: isRtl ? "الإشعارات" : "Notifications", href: "/notifications", icon: Bell },
  ].filter((item) => {
    if (item.href === "/analytics" && !hasPermission("view_analytics")) return false;
    if (item.href === "/profile" && !hasPermission("manage_settings")) return false;
    if (item.href === "/permissions" && !hasPermission("manage_settings")) return false;
    if (item.href === "/staff" && !hasPermission("manage_staff")) return false;
    if (user?.roleKey === "admin") return true;
    if (user?.roleKey === "doctor") return !["/billing", "/staff", "/analytics", "/profile", "/permissions"].includes(item.href);
    if (user?.roleKey === "receptionist") return ["/dashboard", "/patients", "/billing", "/calendar", "/chat", "/notifications"].includes(item.href);
    return true;
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={isRtl ? "فتح القائمة" : "Open menu"}
        className="fixed top-3 right-3 z-[70] rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-md md:hidden">
        <Menu size={21} />
      </button>
      {open && <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setOpen(false)} className="fixed inset-0 z-[70] bg-slate-950/40 md:hidden" />}
      <aside dir={isRtl ? "rtl" : "ltr"} className={`fixed inset-y-0 z-[80] flex w-[250px] flex-col bg-[#17134f] text-white shadow-2xl transition-transform duration-200 ${isRtl ? "right-0" : "left-0"} ${open ? "translate-x-0" : isRtl ? "translate-x-full md:translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src={user?.logoUrl || "/logo.png"} alt="Prime Physio" className="h-11 w-11 rounded-xl bg-white/10 object-contain p-1" />
          <div className="min-w-0"><b className="block text-base">برايم فيزيو</b><span className="text-[10px] text-white/60">{isRtl ? "تأهيل وعلاج طبيعي متقدم" : "Advanced physiotherapy"}</span></div>
          <button onClick={() => setOpen(false)} className="mr-auto rounded-lg p-1 text-white/70 hover:bg-white/10 md:hidden"><X size={18} /></button>
        </div>
        <div className="relative px-3 py-4">
          <button onClick={() => setBranchMenu((v) => !v)} className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] p-3 text-start hover:bg-white/10">
            <span className="rounded-lg bg-white/10 p-2"><Building size={18} /></span>
            <span className="min-w-0 flex-1"><small className="block text-[10px] text-white/55">{isRtl ? "الفرع الحالي" : "Current branch"}</small><b className="block truncate text-xs">{branchName}</b></span>
            <ChevronLeft size={16} />
          </button>
          {branchMenu && <div className="absolute left-3 right-3 top-[76px] z-20 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-800 shadow-xl">
            <button onClick={() => { setActiveBranchId(null); setBranchMenu(false); }} className="w-full rounded-lg px-3 py-2 text-start text-xs hover:bg-slate-100">{isRtl ? "كل الفروع" : "All branches"}</button>
            {branches.map((branch) => <button key={branch.id} onClick={() => { setActiveBranchId(branch.id); setBranchMenu(false); }} className="w-full rounded-lg px-3 py-2 text-start text-xs hover:bg-slate-100">{branch.short_name || branch.full_name}</button>)}
          </div>}
        </div>
        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
          {navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/")); return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-3 text-xs transition ${active ? "bg-white text-[#241d78] font-bold shadow-md" : "text-white/75 hover:bg-white/10 hover:text-white"}`}>
              <Icon size={18} /><span>{item.label}</span>
            </Link>
          ); })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-400/30 text-sm font-bold">{(user?.name || "P").slice(0,1)}</span><span className="min-w-0 flex-1"><b className="block truncate text-xs">{user?.name || "—"}</b><small className="block truncate text-[10px] text-white/55">{user?.role || ""}</small></span></div>
          <div className="flex items-center justify-between text-xs"><button onClick={toggleLanguage} className="rounded-lg bg-white/10 px-3 py-2 hover:bg-white/15">{isRtl ? "English" : "العربية"}</button><button onClick={logout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white"><LogOut size={15} />{isRtl ? "خروج" : "Log out"}</button></div>
        </div>
      </aside>
    </>
  );
}
