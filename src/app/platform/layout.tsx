"use client";

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
  ShieldCheck
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
  { name: "System Settings", nameAr: "إعدادات النظام", href: "/platform/settings", icon: Settings },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user && user.roleKey !== "platform_admin") {
      router.replace("/home");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <LoadingSpinner />;
  }

  if (user.roleKey !== "platform_admin") {
    return <LoadingSpinner />;
  }

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <div className={`min-h-screen bg-[#0B0F19] flex flex-col ${isRtl ? "md:flex-row-reverse" : "md:flex-row"} text-slate-200 relative overflow-hidden`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Premium Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col w-[280px] ${
        isRtl ? "border-l border-white/5 right-0" : "border-r border-white/5 left-0"
      } bg-[#131B2C]/80 backdrop-blur-2xl text-slate-300 fixed top-0 bottom-0 z-10 pt-8 pb-4 shadow-2xl overflow-y-auto`}>
        
        {/* Brand */}
        <div className="flex flex-col items-center justify-center mb-8 px-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20 ring-1 ring-white/10">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white">Prime<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-blue-400">OS</span></h1>
          <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 mt-2">
            <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-bold">Super Admin</p>
          </div>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 space-y-1.5">
          {SIDEBAR_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/40 ring-1 ring-white/10 translate-x-1"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className={`w-5 h-5 shrink-0 ${active ? "text-white" : "text-slate-500"}`} />
                <span>{isRtl ? item.nameAr : item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 mt-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors border border-transparent hover:border-rose-500/20"
          >
            <LogOut className={`w-5 h-5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE HEADER & SIDEBAR ─────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-[#131B2C]/90 backdrop-blur-xl border-b border-white/5 text-white p-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold tracking-widest text-lg">Prime<span className="text-indigo-400">OS</span></span>
        </div>
        <button onClick={toggleSidebar} className="p-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/10">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-md" onClick={closeSidebar}>
          <div 
            className={`absolute top-0 bottom-0 w-[280px] bg-[#131B2C] border-white/10 flex flex-col ${isRtl ? "right-0 border-l" : "left-0 border-r"}`} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-white/5">
              <span className="font-bold text-white tracking-widest">Prime<span className="text-indigo-400">OS</span></span>
              <button onClick={closeSidebar} className="text-slate-400 p-2 rounded-lg hover:bg-white/5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {SIDEBAR_ITEMS.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeSidebar}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      active ? "bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{isRtl ? item.nameAr : item.name}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/5">
              <button onClick={logout} className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-rose-400 font-semibold hover:bg-rose-500/10">
                <LogOut className={`w-5 h-5 ${isRtl ? "rotate-180" : ""}`} />
                <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT ────────────────────────────────────── */}
      <main className={`flex-1 w-full relative z-10 ${isRtl ? "md:pr-[280px]" : "md:pl-[280px]"} min-h-screen flex flex-col`}>
        {/* Top Header */}
        <header className="h-20 bg-[#131B2C]/70 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-30 hidden md:flex shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
            <div className="text-sm font-semibold tracking-wide text-slate-300">
              {isRtl ? "نظام إدارة المنصة السحابي" : "Cloud Platform Administration"}
            </div>
          </div>
          <div className="flex items-center gap-6">
             <UserDropdown />
          </div>
        </header>

        <div className="flex-1 p-6 md:p-8 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
