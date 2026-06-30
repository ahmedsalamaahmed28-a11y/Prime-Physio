"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
  Clock,
  BarChart3,
  Sparkles,
  Search,
  Bell,
  Apple,
  BookOpen,
  Crown,
  Wifi,
  WifiOff,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";

import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { usePWA } from "@/components/PWAProvider";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { supabase } from "@/lib/supabase";
import { UserDropdown } from "@/components/UserDropdown";
import { Loader } from "@/components/Loader";

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
  { nameKey: "nav_home", href: "/home", icon: Home },
  { nameKey: "nav_admin", href: "/admin", icon: ShieldAlert },
  { nameKey: "nav_calendar", href: "/calendar", icon: Calendar },
  { nameKey: "nav_appointments", href: "/appointments", icon: Clock },
  { nameKey: "nav_patients", href: "/patients", icon: Users },
  { nameKey: "nav_ai_assistant", href: "/ai-assistant", icon: Bot },
  { nameKey: "nav_billing", href: "/billing", icon: CreditCard },
  { nameKey: "nav_staff", href: "/staff", icon: Stethoscope },
  { nameKey: "nav_hr", href: "/hr", icon: Building },
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
  const router = useRouter();
  const { user, logout, isLoading, loginWithGoogle, loginWithCredentials, activeBranchId, setActiveBranchId, isEnriching } = useAuth();
  const { hasPermission } = usePermissions();
  const { language, toggleLanguage, t } = useLanguage();
  const { isOnline, pendingCount, isSyncing, syncNow } = usePWA();
  const [isOpen, setIsOpen] = useState(false); // Mobile sidebar state
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // Notifications popover state
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [branchLogo, setBranchLogo] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);
  
  const activeAccount = user;

  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close notifications popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setIsNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!user?.clinicId || !activeBranchId) {
      setBranchLogo(user?.logoUrl || null);
      setBranchName(user?.shortName || null);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("branches")
          .select("logo_url, short_name")
          .eq("id", activeBranchId)
          .single();
        if (data) {
          setBranchLogo(data.logo_url || user?.logoUrl || null);
          setBranchName(data.short_name || user?.shortName || null);
        } else {
          setBranchLogo(user?.logoUrl || null);
          setBranchName(user?.shortName || null);
        }
      } catch {
        setBranchLogo(user?.logoUrl || null);
        setBranchName(user?.shortName || null);
      }
    })();
  }, [user?.clinicId, activeBranchId, user?.logoUrl, user?.shortName]);

    const knownDashboardPages = new Set(["home","hr","admin","patients","doctors","calendar","billing","reports","chat","staff","settings","subscription","permissions","security","profile","analytics","appointments","packages","clinic-settings","clinical-library","clinical-nutrition","users-permissions"]);
    const isSlugPage = /^\/[a-z][a-z0-9-]+$/.test(pathname || "") && !knownDashboardPages.has((pathname || "").replace("/", ""));
    const p = pathname || "";
    const isAuthPage = p === "/" || p === "/manage" || p.startsWith("/manage/") || p === "/signup" || p === "/forgot-password" || p === "/reset-password" || p === "/setup" || p.startsWith("/setup/") || p === "/subscribe" || p === "/plans" || p === "/centers" || p === "/about" || p === "/support" || p === "/center_setup" || isSlugPage;

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Wait for enrichUserWithClinic to set clinicId before rendering pages
  if (activeAccount && activeAccount.clinicId === undefined) {
    return <LoadingSpinner />;
  }

  if (!activeAccount) {
    if (isLoading) {
      return <LoadingSpinner />;
    }
    return null;
  }

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

  const isActive = (href: string) => {
    if (!pathname) return false;
    if (href === "/home") return pathname === "/home";
    return pathname.startsWith(href);
  };

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);
  const toggleNotifications = () => setIsNotificationsOpen(prev => !prev);

  const isRtl = language === "ar";

  return (
    <div className={`min-h-screen bg-slate-50/50 flex flex-col ${isRtl ? "md:flex-row-reverse" : "md:flex-row"} text-slate-800`} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* ─── DESKTOP SIDEBAR ─────────────────────────────────── */}
      <aside className={`hidden md:flex print:hidden flex-col w-[210px] ${
        isRtl ? "border-l right-0" : "border-r left-0"
      } border-white/10 bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] text-white fixed top-0 bottom-0 z-10 pt-8 pb-4 shadow-xl`}>
        {/* Clinic Brand / Logo in Center */}
        <div className="flex flex-col items-center justify-center mb-5 px-3">
          <img 
            src={branchLogo || "/logo.png"} 
            alt={branchName || "Prime Physio"} 
            className="h-16 object-contain mb-1.5" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.getElementById('brand-fallback');
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <div id="brand-fallback" className="hidden text-center">
            <h1 className="text-lg font-bold tracking-wider text-white">{branchName || "PRIME PHYSIO"}</h1>
            <p className="text-[10px] text-white/60">{branchName ? "" : "Clinic Management"}</p>
          </div>
          {branchName && (
            <span className="text-[11px] text-white/70 text-center leading-tight max-w-full truncate px-1">
              {branchName}
            </span>
          )}
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
            if (item.href === "/admin" && activeAccount?.roleKey !== "platform_admin") return false;
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
              return ["/home", "/patients", "/billing", "/calendar", "/appointments", "/ai-assistant", "/logout"].includes(item.href);
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
                <Loader size={14} color="#119094" />
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
                     <span className="text-[10px] text-[#4F46BA] bg-indigo-50 px-2 py-0.5 rounded-full font-bold">{notifications.length} {isRtl ? "جديدة" : "new"}</span>
                   </div>
                   <div className="space-y-2.5 max-h-72 overflow-y-auto">
                     {notifications.length === 0 ? (
                       <div className="p-4 text-center text-xs text-slate-500">
                         {isRtl ? "لا توجد إشعارات حديثة بعد" : "No recent notifications yet"}
                       </div>
                     ) : notifications.map((item) => (
                       <div key={item.id} className="flex gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100/50 cursor-pointer">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-[#4F46BA] flex items-center justify-center shrink-0">
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
                        className="text-xs font-bold text-[#4F46BA] hover:text-[#4338ca] transition-colors"
                     >
                       {isRtl ? "عرض كافة الإشعارات" : "View All Notifications"}
                     </button>
                   </div>
                 </div>
               )}
             </div>

            {/* Profile Avatar Trigger */}
            <div className="relative mr-1">
              <UserDropdown
                user={{
                  name: isRtl ? activeAccount.name : (activeAccount.nameEn || activeAccount.name),
                  username: activeAccount.email,
                  avatar: activeAccount.image,
                  initials: isRtl ? activeAccount.initials : (activeAccount.initialsEn || activeAccount.initials),
                  status: "online",
                }}
                onAction={(action) => {
                  switch (action) {
                    case "profile":
                      router.push("/profile");
                      break;
                    case "settings":
                      router.push("/clinic-settings");
                      break;
                    case "notifications":
                      toggleNotifications();
                      break;
                    case "upgrade":
                      router.push("/subscription");
                      break;
                    case "logout":
                      logout();
                      break;
                    default:
                      break;
                  }
                }}
              />
            </div>
        </div>
      </header>

        {/* ─── MOBILE DRAWER (Slide-in RTL/LTR Overlay) ─────────────────────────── */}
        {isOpen && (
          <div className="md:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={closeSidebar} />

            {/* Drawer content */}
            <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-gradient-to-b from-[#4F46BA] to-[#7c3aed] border-white/10 h-full pt-8 pb-4 shadow-2xl duration-200 pr-0 text-white ${
              isRtl ? "border-l mr-auto animate-in slide-in-from-right" : "border-r ml-auto animate-in slide-in-from-left"
            }`}>
              <div className={`flex items-center justify-between px-3 mb-5 ${isRtl ? "" : "flex-row-reverse"}`}>
                {/* Logo or Title */}
                <div className="flex flex-col items-center justify-center w-full">
                  <img 
                    src={branchLogo || "/logo.png"} 
                    alt="Prime Physio" 
                    className="h-14 object-contain mb-1.5" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.getElementById('mobile-brand-fallback');
                      if (fallback) fallback.style.display = 'block';
                    }}
                  />
                  <div id="mobile-brand-fallback" className="hidden text-center">
                    <span className="font-bold text-base text-white">PRIME PHYSIO</span>
                  </div>
                  {branchName && (
                    <span className="text-[11px] text-white/70 text-center leading-tight max-w-full truncate px-1">
                      {branchName}
                    </span>
                  )}
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
                  if (item.href === "/admin" && activeAccount?.roleKey !== "platform_admin") return false;
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
                    return ["/home", "/patients", "/billing", "/calendar", "/chat", "/logout"].includes(item.href);
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
        <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto print:p-0 min-h-[500px] contain-layout">
          {children}
        </main>
        
      </div>
      
    </div>
  );
}
