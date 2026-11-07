"use client";

import "./platform-tokens.css";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  LayoutDashboard,
  Building,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  HelpCircle,
  Sparkles,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  FileText
} from "lucide-react";
import { UserDropdown } from "@/components/UserDropdown";

const SIDEBAR_ITEMS = [
  { name: "Dashboard", nameAr: "نظرة عامة", href: "/platform", icon: LayoutDashboard },
  { name: "Clinics", nameAr: "العيادات", href: "/platform/clinics", icon: Building },
  { name: "Users", nameAr: "المستخدمين", href: "/platform/users", icon: Users },
  { name: "Subscriptions", nameAr: "الاشتراكات", href: "/platform/subscriptions", icon: CreditCard },
  { name: "Payments", nameAr: "المدفوعات", href: "/platform/payments", icon: DollarSign },
  { name: "Analytics", nameAr: "التحليلات", href: "/platform/analytics", icon: BarChart3 },
  { name: "Support", nameAr: "الدعم الفني", href: "/platform/support", icon: HelpCircle },
  { name: "AI Insights", nameAr: "تحليلات الذكاء الاصطناعي", href: "/platform/ai-insights", icon: Sparkles },
  { name: "Audit Logs", nameAr: "سجل النشاط", href: "/platform/audit-logs", icon: History },
  { name: "Content CMS", nameAr: "إدارة المحتوى", href: "/platform/cms", icon: FileText },
  { name: "System Settings", nameAr: "إعدادات النظام", href: "/platform/settings", icon: Settings },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isEnriching, logout } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isEnriching && user && user.roleKey !== "platform_admin") {
      router.replace("/home");
    }
  }, [user, isLoading, isEnriching, router]);

  if (isLoading || isEnriching || !user) {
    return <LoadingSpinner />;
  }

  if (user.roleKey !== "platform_admin") {
    return <LoadingSpinner />;
  }

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <div className={`pc-shell min-h-screen bg-[#F3F4F6] flex flex-col ${isRtl ? "md:flex-row-reverse" : "md:flex-row"} text-slate-800`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col w-[220px] ${
        isRtl ? "border-l right-0" : "border-r left-0"
      } border-white/10 bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white fixed top-0 bottom-0 z-10 pt-4 pb-2 shadow-xl overflow-y-auto`}>
        
        {/* Clinic Brand / Logo in Center */}
        <div className="flex flex-col items-center justify-center mb-6 px-3">
          <img 
            src="/logo.png" 
            alt="Prime Physio" 
            className="h-12 object-contain mb-1" 
          />
          <h1 className="text-base font-bold tracking-wider text-white">PRIME PHYSIO</h1>
          <p className="text-[10px] text-white/60 uppercase tracking-widest mt-1">Super Admin</p>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 w-full relative ${
                  active
                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/20"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{isRtl ? item.nameAr : item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 mt-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13px] font-semibold text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 transition-colors"
          >
            <LogOut className={`w-5 h-5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE HEADER & SIDEBAR ─────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-[#4F46BA] text-white p-4 sticky top-0 z-20 shadow-sm" dir={isRtl ? "rtl" : "ltr"}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <span className="font-bold">PrimeOS</span>
        </div>
        <div className="flex items-center gap-2">
        <button onClick={toggleLanguage} className="text-xs font-semibold border border-white/20 rounded-lg px-2 py-1.5">{isRtl ? "EN" : "عربي"}</button>
        <button onClick={toggleSidebar} className="p-2 -mr-2 text-slate-300">
          <Menu className="w-6 h-6" />
        </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={closeSidebar}>
          <div 
            className={`absolute top-0 bottom-0 w-[220px] bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white flex flex-col ${isRtl ? "right-0" : "left-0"}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <span className="font-bold text-white">PrimeOS Admin</span>
              <button onClick={closeSidebar} className="text-slate-400 p-1">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {SIDEBAR_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all duration-200 w-full relative ${
                      active
                        ? "bg-white/10 text-white shadow-sm ring-1 ring-white/20"
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{isRtl ? item.nameAr : item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button onClick={logout} className="flex items-center gap-3 px-3 py-3 w-full text-rose-400 font-medium">
                <LogOut className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
                <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────── */}
      <main className={`flex-1 w-full ${isRtl ? "md:pr-[220px]" : "md:pl-[220px]"} min-h-screen flex flex-col`}>
        {/* Top Header */}
        <header dir={isRtl ? "rtl" : "ltr"} className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 hidden md:flex shadow-sm">
          <div className="text-sm font-medium text-slate-500">
            {isRtl ? "لوحة تحكم المنصة" : "Platform Administration"}
          </div>
          <div className="flex items-center gap-3">
             <button onClick={toggleLanguage} className="text-xs font-semibold border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50">{isRtl ? "EN" : "عربي"}</button>
             <UserDropdown user={{
               name: user?.name || "مدير المنصة",
               username: user?.email || "",
               initials: user?.name ? user.name.charAt(0).toUpperCase() : "M",
               status: "online"
             }} />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
