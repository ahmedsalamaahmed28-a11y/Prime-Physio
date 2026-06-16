"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Calendar, 
  Users, 
  CreditCard, 
  Menu, 
  X, 
  Activity,
  ChevronLeft,
  MessageSquare,
  User,
  Settings,
  Shield,
  Lock,
  Stethoscope,
  Plus,
  ShieldAlert,
  ShieldCheck,
  LogOut,
  Check,
  Building,
  BarChart3,
  Sparkles,
  Search,
  Bell,
  Apple,
  BookOpen,
  Crown,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { usePWA } from "@/components/PWAProvider";
import { supabase } from "@/lib/supabase";

interface SystemNotification {
  id: string;
  titleAr: string;
  titleEn: string;
  detailsAr: string;
  detailsEn: string;
  createdAt: string;
}

interface SidebarItem {
  nameKey: string;
  href: string;
  icon: any;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { nameKey: "nav_home", href: "/", icon: Home },
  { nameKey: "nav_patients", href: "/patients", icon: Users },
  { nameKey: "nav_billing", href: "/billing", icon: CreditCard },
  { nameKey: "nav_staff", href: "/staff", icon: Stethoscope },
  { nameKey: "nav_analytics", href: "/analytics", icon: BarChart3 },
  { nameKey: "nav_nutrition", href: "/clinical-nutrition", icon: Apple },
  { nameKey: "nav_library", href: "/clinical-library", icon: BookOpen },
  { nameKey: "nav_subscription", href: "/subscription", icon: Crown },
  { nameKey: "nav_clinic_settings", href: "/profile", icon: Settings },
  { nameKey: "nav_permissions", href: "/permissions", icon: Shield },
  { nameKey: "nav_logout", href: "/logout", icon: LogOut },
];

interface Account {
  name: string;
  nameEn: string;
  email: string;
  initials: string;
  initialsEn: string;
  role: string;
  roleEn: string;
  roleKey: "admin" | "doctor" | "receptionist" | "platform_admin";
  bg: string;
  image?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, logout, isLoading, loginWithGoogle, loginWithCredentials } = useAuth();
  const { hasPermission } = usePermissions();
  const { language, toggleLanguage, t } = useLanguage();
  const { isOnline, pendingCount, isSyncing, syncNow } = usePWA();
  const [isOpen, setIsOpen] = useState(false); // Mobile sidebar state
  const [isProfileOpen, setIsProfileOpen] = useState(false); // Profile dropdown state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Notifications popover state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  
  const activeAccount = user;

  if (!activeAccount) return null;

  const displayAccountName = activeAccount.roleKey === "receptionist"
    ? activeAccount.name
    : activeAccount.name.startsWith("د.")
    ? activeAccount.name
    : `د. ${activeAccount.name}`;
  const displayAccountNameEn = activeAccount.roleKey === "receptionist"
    ? (activeAccount.nameEn || activeAccount.name)
    : activeAccount.roleKey === "admin"
    ? activeAccount.name
    : (activeAccount.nameEn || activeAccount.name).startsWith("Dr.")
    ? (activeAccount.nameEn || activeAccount.name)
    : `Dr. ${activeAccount.nameEn || activeAccount.name}`;

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
  const toggleProfile = () => {
    setIsProfileOpen(prev => !prev);
  };
  const toggleNotifications = () => {
    setIsNotificationsOpen(prev => !prev);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let active = true;

    const mapNotification = (row: any): SystemNotification => {
      const action = String(row.action || "").toUpperCase();
      const module = String(row.module || row.entity || "").toUpperCase();
      const details = String(row.details || row.entity_id || "");

      let titleAr = "تنبيه جديد";
      let titleEn = "New activity";
      if (action.includes("CREATE")) {
        titleAr = "تمت إضافة سجل جديد";
        titleEn = "New record created";
      } else if (action.includes("UPDATE")) {
        titleAr = "تم تحديث سجل";
        titleEn = "Record updated";
      } else if (action.includes("DELETE")) {
        titleAr = "تم حذف سجل";
        titleEn = "Record deleted";
      } else if (action.includes("LOGIN")) {
        titleAr = "تسجيل دخول جديد";
        titleEn = "New login";
      }

      return {
        id: row.id,
        titleAr: module ? `${titleAr} • ${module}` : titleAr,
        titleEn: module ? `${titleEn} • ${module}` : titleEn,
        detailsAr: details || "تم تنفيذ عملية داخل النظام",
        detailsEn: details || "An action was performed in the system",
        createdAt: row.created_at || new Date().toISOString(),
      };
    };

    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, action, entity, entity_id, details, created_at")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.warn("Failed to load notifications", error);
        return;
      }

      if (!active) return;
      setNotifications((data || []).map(mapNotification));
    };

    loadNotifications();

    const channel = supabase
      .channel("audit-log-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_logs" },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    const interval = window.setInterval(loadNotifications, 60000);

    return () => {
      active = false;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  if (pathname === "/login" || pathname === "/signup") {
    return <>{children}</>;
  }

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0d8a8a]"></div>
      </div>
    );
  }

  // Route protection: auth.tsx redirects unauthenticated users to /login
  if (!user) return null;

  const isRtl = language === "ar";

  return (
    <div className={`min-h-screen bg-slate-50/50 flex flex-col ${isRtl ? "md:flex-row-reverse" : "md:flex-row"} text-slate-800`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* SVG Gradient Definition for Icons (Wrapped in a display: none container) */}
      <div style={{ display: 'none' }} aria-hidden="true">
        <svg>
          <defs>
            <linearGradient id="tealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#159C9E" />
              <stop offset="100%" stopColor="#119094" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={`hidden md:flex print:hidden flex-col w-[210px] ${
        isRtl ? "border-l right-0" : "border-r left-0"
      } border-white/10 bg-gradient-to-b from-[#085454] to-[#0d8a8a] text-white fixed top-0 bottom-0 z-10 pt-8 pb-4 shadow-xl`}>
        {/* Clinic Brand / Logo in Center */}
        <div className="flex flex-col items-center justify-center mb-5 px-1">
          <img 
            src="/logo.png" 
            alt="Prime Physio" 
            className="h-20 w-full object-contain" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('brand-fallback');
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <div id="brand-fallback" className="hidden text-center">
            <h1 className="text-xl font-bold tracking-wider text-white">PRIME PHYSIO</h1>
            <p className="text-[10px] text-white/60">Clinic Management</p>
          </div>
        </div>

        {/* Divider line */}
        <div className="border-b border-white/10 mb-6 mx-4" />

        {/* Section Heading */}
        <div className="px-6 mb-3">
          <h3 className={`text-white/80 text-sm font-semibold ${isRtl ? "text-right" : "text-left"}`}>
            {t("nav_section_title")}
          </h3>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 flex flex-col gap-y-1 overflow-visible">
          {SIDEBAR_ITEMS.filter((item) => {
            if (item.href === "/analytics" && !hasPermission("view_analytics")) return false;
            if (item.href === "/profile" && !hasPermission("manage_settings")) return false;
            if (item.href === "/permissions" && !hasPermission("manage_settings")) return false;
            if (item.href === "/staff" && !hasPermission("manage_staff")) return false;
            
            const role = activeAccount?.roleKey || "doctor";
            if (role === "admin") return true;
            if (role === "doctor") {
              return !["/billing", "/staff", "/analytics", "/profile", "/permissions"].includes(item.href);
            }
            if (role === "receptionist") {
              return ["/", "/patients", "/billing", "/logout"].includes(item.href);
            }
            return true;
          }).map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const isLogout = item.href === "/logout";
            return (
              <Link 
                key={item.href} 
                href={isLogout ? "#" : item.href}
                onClick={(e) => {
                  if (isLogout) {
                    e.preventDefault();
                    logout();
                  }
                }}
              >
                <div
                  className={`flex items-center justify-between px-4 py-2 rounded-xl transition-all cursor-pointer ${
                    isRtl ? "" : "gap-3"
                  } ${
                    active
                      ? "border border-white/30 bg-white/5 font-bold"
                      : "font-medium hover:bg-white/10"
                  }`}
                >
                  <span className={`text-sm ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "flex-1"}`}>{t(item.nameKey)}</span>
                  <Icon 
                    className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isRtl ? "" : "ml-1"} ${active ? "text-white" : "text-white/90"}`} 
                  />
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 text-white">
          <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
            {activeAccount.image ? (
              <img src={activeAccount.image} alt={activeAccount.name} className="w-9 h-9 rounded-full object-cover shadow-sm border border-white/10" />
            ) : (
              <div className={`w-9 h-9 rounded-full shrink-0 ${activeAccount.bg} flex items-center justify-center text-sm font-bold text-white shadow-sm border border-white/10`}>
                {isRtl ? activeAccount.initials : (activeAccount.initialsEn || activeAccount.initials)}
              </div>
            )}
            <div className={`flex-1 min-w-0 ${isRtl ? "text-right" : "text-left"}`}>
              <p className={`text-xs font-semibold truncate ${isRtl ? "" : "font-sans"}`}>{isRtl ? displayAccountName : displayAccountNameEn}</p>
              <p className={`text-[10px] text-white/70 truncate ${isRtl ? "" : "font-sans"}`}>{isRtl ? activeAccount.role : (activeAccount.roleEn || activeAccount.role)}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT CONTAINER ────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col print:pr-0 print:pl-0 ${isRtl ? "md:pr-[210px]" : "md:pl-[210px]"}`}>
        
        {/* ─── GLOBAL HEADER ────────── */}
        <header className="h-16 border-b border-slate-200/80 bg-card text-card-foreground flex items-center justify-between px-6 sticky top-0 z-50 overflow-visible print:hidden" dir={isRtl ? "rtl" : "ltr"}>
          
          {/* Right Side: Quick Search & Mobile Hamburger */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button 
              onClick={toggleSidebar} 
              className="md:hidden p-1.5 rounded-lg border bg-muted/40 hover:bg-muted text-slate-700 transition-colors"
              aria-label={t("nav_section_title")}
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {/* Search Bar (Desktop) */}
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 rounded-xl px-3 py-1.5 w-80 border border-slate-200/50 relative z-50">
              <Search className="w-4 h-4 text-slate-400 shrink-0 pointer-events-none" />
              <input 
                type="text" 
                placeholder={t("search_placeholder")} 
                className={`bg-transparent border-0 outline-hidden text-xs text-slate-700 dark:text-slate-300 w-full placeholder:text-slate-400 relative z-50 ${isRtl ? "text-right" : "text-left"}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = e.currentTarget.value.trim();
                    window.location.href = `/patients?search=${encodeURIComponent(val)}`;
                  }
                }}
              />
            </div>

            {/* Mobile Brand */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                <Activity className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm text-slate-800">{t("main_clinic_title")}</span>
            </div>
          </div>

          {/* Left Side: ENG button, Messages icon, Notifications icon, Profile dropdown */}
          <div className="flex items-center gap-3 relative z-50">
            {/* Network Status Badge */}
            <button
              onClick={() => {
                if (isOnline && pendingCount > 0) {
                  syncNow();
                }
              }}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-semibold select-none transition-all duration-300 relative z-50
                ${isOnline 
                  ? "bg-emerald-50/40 border-emerald-200 text-emerald-800 dark:bg-emerald-950/10 dark:border-emerald-900 dark:text-emerald-400" 
                  : "bg-amber-50/50 border-amber-200 text-amber-800 dark:bg-amber-950/10 dark:border-amber-900 dark:text-amber-400"
                } ${pendingCount > 0 && isOnline ? "cursor-pointer hover:bg-emerald-100" : "cursor-default"}`}
            >
              {isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              <span className="hidden sm:inline">
                {isSyncing 
                  ? (isRtl ? "جاري المزامنة..." : "Syncing...") 
                  : isOnline 
                    ? (isRtl ? "متصل" : "Online") 
                    : (isRtl ? "وضع عدم الاتصال" : "Offline")
                }
              </span>
              {pendingCount > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold animate-pulse
                  ${isOnline 
                    ? "bg-emerald-200 text-emerald-900 dark:bg-emerald-800 dark:text-white" 
                    : "bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-white"
                  }`}
                >
                  {pendingCount} {isRtl ? "معلقة" : "pending"}
                </span>
              )}
            </button>

            {/* Language Switcher Button */}
            <button 
              onClick={toggleLanguage}
              className="text-xs font-semibold text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-100 h-9 px-2.5 border border-slate-200/80 bg-white relative z-50 cursor-pointer"
            >
              {t("lang_label")}
            </button>

             {/* Notifications Button with Badge '3' */}
             <div className="relative" ref={notificationsRef}>
               <button 
                 onClick={toggleNotifications}
                 className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                 title="الإشعارات"
               >
                 <Bell className="w-5 h-5" />
                 {notifications.length > 0 && (                   <span className="absolute top-1 right-1 min-w-4 h-4 px-0.5 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center border border-white">                     {notifications.length}                   </span>                 )}
               </button>

               {/* Notifications Popover */}
               {isNotificationsOpen && (
                 <div className={`absolute ${isRtl ? "left-0" : "right-0"} top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 shadow-2xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-3 duration-200`} dir={isRtl ? "rtl" : "ltr"}>
                   <div className="flex items-center justify-between border-b pb-2">
                     <span className="font-bold text-sm text-slate-800 dark:text-white">{isRtl ? "الإشعارات والتنبيهات" : "Notifications & Alerts"}</span>
                     <span className="text-[10px] text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full font-bold">{notifications.length} {isRtl ? "جديدة" : "new"}</span>
                   </div>
                   <div className="space-y-2.5 max-h-72 overflow-y-auto">
                     {notifications.length === 0 ? (
                       <div className="p-4 text-center text-xs text-slate-500">
                         {isRtl ? "لا توجد إشعارات حديثة بعد" : "No recent notifications yet"}
                       </div>
                     ) : notifications.map((item) => (
                       <div key={item.id} className="flex gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100/50 cursor-pointer">
                         <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
                           <Bell className="w-4.5 h-4.5" />
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="text-xs font-bold text-slate-800 dark:text-slate-250">{isRtl ? item.titleAr : item.titleEn}</p>
                           <p className="text-[10px] text-slate-500 truncate mt-0.5">{isRtl ? item.detailsAr : item.detailsEn}</p>
                           <p className="text-[9px] text-slate-400 mt-1">{new Date(item.createdAt).toLocaleString(isRtl ? "ar-EG" : "en-US")}</p>
                         </div>
                       </div>
                     ))}
                   </div>
                   <div className="border-t pt-2 text-center">
                     <button 
                       onClick={() => {
                         setIsNotificationsOpen(false);
                       }}
                       className="text-xs font-bold text-[#0d8a8a] hover:text-[#085454] transition-colors"
                     >
                       {isRtl ? "عرض كافة الإشعارات" : "View All Notifications"}
                     </button>
                   </div>
                 </div>
               )}
             </div>

            {/* Profile Avatar Trigger */}
            <div className="relative mr-1" ref={dropdownRef}>
              <button
                onClick={toggleProfile}
                className={`w-9 h-9 rounded-full ${activeAccount.bg} text-white font-bold text-sm flex items-center justify-center cursor-pointer shadow-md hover:scale-105 active:scale-95 transition-transform border border-white/20 p-0 overflow-hidden`}
              >
                {activeAccount.image ? (
                  <img src={activeAccount.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  isRtl ? activeAccount.initials : activeAccount.initialsEn
                )}
              </button>

              {/* Google-Style Dropdown Menu */}
              {isProfileOpen && (
                <div 
                  className={`absolute ${isRtl ? "left-0" : "right-0"} top-11 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 shadow-2xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200`}
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  {/* Platform Header */}
                  <div className="text-center pb-2 border-b">
                    <div className="text-sm font-extrabold text-[#0d8a8a] tracking-wider mb-1">Prime Physio</div>
                    <p className="text-[10px] text-muted-foreground">{isRtl ? "حساب إدارة المركز الطبي" : "Medical Center Management"}</p>
                  </div>

                  {/* Section 1: Current Account */}
                  <div className="space-y-2.5">
                    {activeAccount && (
                      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-150">
                        <div className={`w-8 h-8 rounded-full ${activeAccount.bg} text-white text-xs font-bold flex items-center justify-center overflow-hidden`}>
                          {activeAccount.image ? (
                            <img src={activeAccount.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            isRtl ? activeAccount.initials : (activeAccount.initialsEn || activeAccount.initials)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-bold text-slate-800 truncate ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "font-sans"}`}>{isRtl ? activeAccount.name : (activeAccount.nameEn || activeAccount.name)}</p>
                          <p className={`text-[10px] text-muted-foreground truncate ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "font-sans"}`}>{activeAccount.email}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-slate-100" />

                  {/* Section 2: Management Links */}
                  <div className="space-y-1">
                    {[
                      { label: t("profile"), href: "/profile", icon: User },
                      { label: t("nav_analytics"), href: "/analytics", icon: BarChart3, adminOnly: true },
                      { label: t("nav_clinic_settings"), href: "/clinic-settings", icon: Building, adminOnly: true },
                      { label: isRtl ? "إدارة المستخدمين والصلاحيات" : "Permissions & Users", href: "/users-permissions", icon: Shield, adminOnly: true },
                      { label: t("nav_billing"), href: "/billing", icon: CreditCard, staffOnly: true },
                      { label: isRtl ? "الأمان" : "Security & Signin", href: "/security", icon: Lock },
                    ].filter((link) => {
                      const role = activeAccount?.roleKey || "doctor";
                      if (role === "admin") return true;
                      if (link.adminOnly) return false;
                      if (link.staffOnly && role === "doctor") return false;
                      return true;
                    }).map((link) => {
                      const Icon = link.icon;
                      return (
                        <Link key={link.href} href={link.href} onClick={() => setIsProfileOpen(false)}>
                          <div className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-100 ${
                            isRtl ? "" : "flex-row-reverse"
                          }`}>
                            <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
                              <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-xs font-medium">{link.label}</span>
                            </div>
                            <ChevronLeft className={`w-3.5 h-3.5 text-slate-300 ${isRtl ? "" : "rotate-180"}`} />
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* Platform Admin section */}
                  {activeAccount?.roleKey === "platform_admin" && (
                    <>
                      <hr className="border-slate-100" />
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 px-1">{isRtl ? "إدارة المنصة" : "Platform"}</div>
                        {[
                          { label: isRtl ? "لوحة التحكم" : "Admin Panel", href: "/admin", icon: ShieldAlert },
                        ].map((link) => {
                          const Icon = link.icon;
                          return (
                            <Link key={link.href} href={link.href} onClick={() => setIsProfileOpen(false)}>
                              <div className={`flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer text-slate-700 hover:text-slate-900 transition-colors border border-transparent hover:border-slate-100 ${
                                isRtl ? "" : "flex-row-reverse"
                              }`}>
                                <div className={`flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
                                  <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                  <span className="text-xs font-medium">{link.label}</span>
                                </div>
                                <ChevronLeft className={`w-3.5 h-3.5 text-slate-300 ${isRtl ? "" : "rotate-180"}`} />
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <hr className="border-slate-100" />

                  {/* Section 3: Staff Management */}
                  {activeAccount?.roleKey === "admin" && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold text-slate-400 px-1">{isRtl ? "طاقم العمل" : "Staff"}</div>
                      <div className="flex gap-2">
                        <Link href="/staff#doctors" className="flex-1" onClick={() => setIsProfileOpen(false)}>
                          <Button variant="outline" size="sm" className={`w-full text-xs gap-1.5 h-9 rounded-lg border-slate-200 hover:bg-slate-50 ${isRtl ? "" : "flex-row-reverse"}`}>
                            <Stethoscope className="w-3.5 h-3.5 text-slate-500" />
                            {isRtl ? "الأطباء" : "Doctors"}
                          </Button>
                        </Link>
                        <Link href="/staff#employees" className="flex-1" onClick={() => setIsProfileOpen(false)}>
                          <Button variant="outline" size="sm" className={`w-full text-xs gap-1.5 h-9 rounded-lg border-slate-200 hover:bg-slate-50 ${isRtl ? "" : "flex-row-reverse"}`}>
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            {isRtl ? "الموظفون" : "Staff"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Logout Button */}
                  <div className="pt-2 border-t flex justify-start">
                    <Button 
                      onClick={() => {
                        setIsProfileOpen(false);
                        logout();
                      }}
                      variant="ghost" 
                      size="sm" 
                      className={`text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1.5 h-8 rounded-lg px-2 ${isRtl ? "" : "flex-row-reverse"}`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      {t("nav_logout")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
        </div>
      </header>

        {/* ─── MOBILE DRAWER (Slide-in RTL/LTR Overlay) ─────────────────────────── */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={closeSidebar} />

            {/* Drawer content */}
            <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-[#085454] to-[#0d8a8a] border-white/10 h-full pt-8 pb-4 shadow-2xl duration-200 pr-0 text-white ${
              isRtl ? "border-l mr-auto animate-in slide-in-from-right" : "border-r ml-auto animate-in slide-in-from-left"
            }`}>
              <div className={`flex items-center justify-between px-3 mb-5 ${isRtl ? "" : "flex-row-reverse"}`}>
                {/* Logo or Title */}
                <div className="flex flex-col items-center justify-center w-full">
                  <img 
                    src="/logo.png" 
                    alt="Prime Physio" 
                    className="h-18 object-contain mb-2" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.getElementById('mobile-brand-fallback');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div id="mobile-brand-fallback" className="hidden text-center">
                    <span className="font-bold text-lg text-white">PRIME PHYSIO</span>
                  </div>
                </div>
                <button 
                  onClick={closeSidebar}
                  className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 text-white/80 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Divider line */}
              <div className="border-b border-white/10 mb-6 mx-4" />

              {/* Section Heading */}
              <div className="px-5 mb-3">
                <h3 className={`text-white/80 text-sm font-semibold ${isRtl ? "text-right" : "text-left"}`}>{t("nav_section_title")}</h3>
              </div>

              <nav className="flex-1 px-3 flex flex-col gap-y-1 overflow-visible">
                {SIDEBAR_ITEMS.filter((item) => {
                  const role = activeAccount?.roleKey || "doctor";
                  if (role === "admin") return true;
                  if (role === "doctor") {
                    return !["/billing", "/staff", "/analytics", "/clinic-settings"].includes(item.href);
                  }
                  if (role === "receptionist") {
                    return ["/", "/messages", "/patients", "/billing", "/logout"].includes(item.href);
                  }
                  return true;
                }).map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  const isLogout = item.href === "/logout";
                  return (
                    <Link 
                      key={item.href} 
                      href={isLogout ? "#" : item.href} 
                      onClick={(e) => {
                        closeSidebar();
                        if (isLogout) {
                          e.preventDefault();
                          logout();
                        }
                      }}
                    >
                      <div
                        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all cursor-pointer ${
                          isRtl ? "" : "gap-3"
                        } ${
                          active
                            ? "border border-white/30 bg-white/5 font-bold"
                            : "font-medium hover:bg-white/10"
                        }`}
                      >
                        <span className={`text-sm ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "flex-1"}`}>{t(item.nameKey)}</span>
                        <Icon 
                          className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isRtl ? "" : "ml-1"} ${active ? "text-white" : "text-white/90"}`} 
                        />
                      </div>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-white/10 bg-white/5 text-white">
                <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <div className={`w-8 h-8 rounded-full ${activeAccount.bg} flex items-center justify-center text-xs font-bold text-white shadow-sm border border-white/10`}>
                    {isRtl ? activeAccount.initials : activeAccount.initialsEn}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold truncate ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "font-sans"}`}>{isRtl ? displayAccountName : displayAccountNameEn}</p>
                    <p className={`text-[10px] text-white/70 truncate ${isRtl ? "text-right" : "text-left"} ${isRtl ? "" : "font-sans"}`}>{isRtl ? activeAccount.role : activeAccount.roleEn}</p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── MAIN CONTENT AREA ────────────────────────────────────────────── */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0">
          {children}
        </main>
        
      </div>
      
    </div>
  );
}




