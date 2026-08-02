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
    <div className={`min-h-screen bg-[#F3F4F6] flex flex-col ${isRtl ? "md:flex-row-reverse" : "md:flex-row"} text-slate-800`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col w-[260px] ${
        isRtl ? "border-l right-0" : "border-r left-0"
      } bg-[#111827] text-slate-300 fixed top-0 bottom-0 z-10 pt-8 pb-4 shadow-xl overflow-y-auto`}>
        
        {/* Brand */}
        <div className="flex flex-col items-center justify-center mb-8 px-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-white">Prime<span className="text-indigo-400">OS</span></h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Super Admin</p>
        </div>

        {/* Links */}
        <nav className="flex-1 px-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span>{isRtl ? item.nameAr : item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-4 border-t border-white/10 mt-4">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className={`w-5 h-5 shrink-0 ${isRtl ? "rotate-180" : ""}`} />
            <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE HEADER & SIDEBAR ─────────────────────────── */}
      <div className="md:hidden flex items-center justify-between bg-[#111827] text-white p-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          <span className="font-bold">PrimeOS</span>
        </div>
        <button onClick={toggleSidebar} className="p-2 -mr-2 text-slate-300">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={closeSidebar}>
          <div 
            className={`absolute top-0 bottom-0 w-[260px] bg-[#111827] flex flex-col ${isRtl ? "right-0" : "left-0"}`} 
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
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                      active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
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
      <main className={`flex-1 w-full ${isRtl ? "md:pr-[260px]" : "md:pl-[260px]"} min-h-screen flex flex-col`}>
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10 hidden md:flex shadow-sm">
          <div className="text-sm font-medium text-slate-500">
            {isRtl ? "لوحة تحكم المنصة" : "Platform Administration"}
          </div>
          <div className="flex items-center gap-4">
             <UserDropdown />
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-x-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
