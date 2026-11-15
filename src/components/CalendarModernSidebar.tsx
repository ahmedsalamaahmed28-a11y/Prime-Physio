"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, BarChart3, Bell, BookOpen, Building, Calendar, CreditCard, FileText, Home, LogOut, Menu, MessageSquare, Settings, Shield, ShieldAlert, Stethoscope, Users, X, Apple, Crown, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { supabase } from "@/lib/supabase";

import "./calendar-sidebar.css";

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
    supabase.from("branches").select("id,short_name,full_name").eq("clinic_id", user.clinicId).order("created_at", { ascending: true })
      .then(({ data }) => { if (alive) setBranches(data || []); });
    return () => { alive = false; };
  }, [user?.clinicId]);

  const branchName = activeBranchId
    ? (branches.find((b) => b.id === activeBranchId)?.short_name || branches.find((b) => b.id === activeBranchId)?.full_name || (isRtl ? "الفرع الحالي" : "Current branch"))
    : (user?.shortName || (isRtl ? "الفرع الرئيسي" : "Main branch"));

  const navItems = [
    { label: isRtl ? "لوحة التحكم" : "Dashboard", href: "/dashboard", icon: Home },
    { label: isRtl ? "جدول المواعيد" : "Appointments", href: "/calendar", icon: Calendar },
    { label: isRtl ? "سجلات المرضى" : "Patients", href: "/patients", icon: FileText },
    { label: isRtl ? "المكتبة الإكلينيكية" : "Clinical library", href: "/clinical-library", icon: Activity },
    { label: isRtl ? "التغذية العلاجية" : "Clinical nutrition", href: "/clinical-nutrition", icon: Activity },
    { label: isRtl ? "الفواتير والمالية" : "Billing & finance", href: "/billing", icon: CreditCard },
    { label: isRtl ? "الموارد البشرية" : "Human resources", href: "/hr", icon: Building },
    { label: isRtl ? "إدارة فريق العمل" : "Staff management", href: "/staff", icon: User },
    { label: isRtl ? "تقارير الأداء والتحليلات" : "Analytics & reports", href: "/analytics", icon: BarChart3 },
    ...(user?.roleKey === "platform_admin" ? [{ label: isRtl ? "إدارة المنصة" : "Platform administration", href: "/platform", icon: ShieldAlert }, { label: isRtl ? "إدارة المحتوى" : "Content management", href: "/platform/cms", icon: FileText }] : []),
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
        className="pp-calendar-mobile-menu fixed right-3 top-3 z-[65] rounded-xl border border-slate-200 bg-white p-2 text-slate-700 shadow-md md:hidden"><Menu size={21} /></button>
      {open && <button aria-label={isRtl ? "إغلاق القائمة" : "Close menu"} onClick={() => setOpen(false)} className="fixed inset-0 z-[69] bg-slate-950/30 md:hidden" />}
      <aside dir={isRtl ? "rtl" : "ltr"} className={"pp-calendar-sidebar " + (open ? "is-open" : "")}>
        <div className="pp-calendar-brand">
          <img src={user?.logoUrl || "/logo.png"} alt="Prime Physio" onError={(event) => { event.currentTarget.src = "/logo.png"; }} />
          <div><strong>برايم فيزيو</strong><span>{isRtl ? "تأهيل وعلاج طبيعي متقدم" : "Advanced physiotherapy"}</span></div>
          <button onClick={() => setOpen(false)} className="mr-auto rounded-lg p-1 text-slate-500 md:hidden"><X size={18} /></button>
        </div>
        <div className="pp-calendar-branch-wrap">
          <button className="pp-calendar-branch" onClick={() => setBranchMenu((v) => !v)}>
            <span className="pp-calendar-branch-icon"><Building size={18} /></span>
            <span className="min-w-0 flex-1 text-start"><small>{isRtl ? "الفرع الحالي" : "Current branch"}</small><b className="block truncate">{branchName}</b></span>
            <span className="text-slate-500">‹</span>
          </button>
          {branchMenu && <div className="pp-calendar-branch-menu">
            <button onClick={() => { setActiveBranchId(null); setBranchMenu(false); }}>{isRtl ? "كل الفروع" : "All branches"}</button>
            {branches.map((branch) => <button key={branch.id} onClick={() => { setActiveBranchId(branch.id); setBranchMenu(false); }}>{branch.short_name || branch.full_name}</button>)}
          </div>}
        </div>
        <nav className="pp-calendar-nav">
          {navItems.map((item) => { const Icon = item.icon; const active = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/")); return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={active ? "active" : ""}><Icon size={17} /><span>{item.label}</span></Link>
          ); })}
        </nav>
        <div className="pp-calendar-account">
          <div className="pp-calendar-account-user"><span className="pp-calendar-avatar"><User size={18} /></span><span className="min-w-0 flex-1"><b className="block truncate">{user?.name || "—"}</b><small className="block truncate">{user?.role || (isRtl ? "فريق العيادة" : "Clinic team")}</small></span></div>
          <div className="pp-calendar-account-actions"><span className="pp-calendar-online"><i />{isRtl ? "متصل" : "Online"}</span><button onClick={toggleLanguage} title={isRtl ? "تغيير اللغة" : "Change language"} className="text-xs">{isRtl ? "EN" : "عربي"}</button><button onClick={logout} title={isRtl ? "تسجيل الخروج" : "Log out"}><LogOut size={17} /></button></div>
        </div>
      </aside>
    </>
  );
}
