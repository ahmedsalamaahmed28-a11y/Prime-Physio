"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession, getSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { getAppValue, setAppValue } from "@/lib/appStorage";

interface User {
  name: string;
  nameEn?: string;
  email: string;
  initials: string;
  initialsEn?: string;
  role: string;
  roleEn?: string;
  roleKey: "admin" | "doctor" | "receptionist" | "platform_admin";
  bg: string;
  image?: string;
  clinicId?: string | null;
  isPlatformAdmin?: boolean;
  shortName?: string | null;
  logoUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  loginWithGoogle: (email: string) => Promise<void>;
  loginWithCredentials: (email: string, name: string, role: string) => Promise<void>;
  registerWithSupabase: (email: string, pass: string, meta: any) => Promise<{ error?: string }>;
  loginWithSupabase: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => void;
  isLoading: boolean;
  isEnriching: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function prefixArabicName(name: string, roleKey: string) {
  if (roleKey === "receptionist" || roleKey === "platform_admin") return name;
  if (name.startsWith("د.") || name.startsWith("د/")) return name;
  return `د. ${name}`;
}

function prefixEnglishName(name: string, roleKey: string) {
  if (roleKey === "receptionist" || roleKey === "platform_admin") return name;
  return name.startsWith("Dr.") ? name : `Dr. ${name.replace(/^د\.?\s*/, "").trim()}`;
}

function getArabicRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "مدير المنصة";
  if (roleKey === "admin") return "مدير العيادة";
  if (roleKey === "doctor") return "طبيب معالج";
  return "موظف استقبال";
}

function getEnglishRoleLabel(roleKey: string) {
  if (roleKey === "platform_admin") return "Platform Admin";
  if (roleKey === "admin") return "Clinic Admin";
  if (roleKey === "doctor") return "Doctor";
  return "Receptionist";
}

function mapStaffRoleToRoleKey(staffRole: string): "admin" | "doctor" | "receptionist" {
  switch (staffRole) {
    case "admin":
    case "مدير العياده":
      return "admin";
    case "موظف استقبال":
    case "receptionist":
      return "receptionist";
    case "استشاري علاج طبيعي":
    case "أخصائي علاج طبيعي":
    case "ممارس علاج طبيعي":
    case "doctor":
      return "doctor";
    default:
      return "receptionist";
  }
}

async function enrichUserWithClinic(user: User): Promise<User> {
  // First, try server API (uses service_role — works for NextAuth users without Supabase session)
  try {
    const preferredClinicId = typeof window !== 'undefined' ? sessionStorage.getItem("preferred_clinic_id") : null;
    const t = Date.now();
    const queryParams = preferredClinicId ? `?preferred_clinic_id=${preferredClinicId}&t=${t}` : `?t=${t}`;
    const res = await fetch(`/api/auth/enrich${queryParams}`);
    if (res.ok) {
      const data = await res.json();
      if (data.clinicId || data.roleKey === "platform_admin") {
        user.clinicId = data.clinicId;
        user.roleKey = data.roleKey as User["roleKey"];
        user.role = data.roleAr;
        user.roleEn = data.roleEn;
        user.shortName = data.shortName || null;
        user.logoUrl = data.logoUrl || null;
        if (data.roleKey === "platform_admin") {
          user.isPlatformAdmin = true;
        }
        return user;
      }
    }
  } catch {
    // API call failed — fall through to Supabase queries
  }

  try {
    // Check if platform super admin
    const { data: pa } = await supabase
      .from("platform_admins")
      .select("email")
      .eq("email", user.email).limit(1).maybeSingle();
    user.isPlatformAdmin = !!pa;

    if (pa) {
      user.roleKey = "platform_admin";
      user.role = getArabicRoleLabel("platform_admin");
      user.roleEn = getEnglishRoleLabel("platform_admin");
      user.clinicId = null;
      return user;
    }

    // Look up clinic_id + role from staff (source of truth for roleKey)
    const { data: staff } = await supabase
      .from("staff")
      .select("clinic_id, role")
      .eq("email", user.email).limit(1).maybeSingle();

    if (staff) {
      user.roleKey = mapStaffRoleToRoleKey(staff.role);
      user.role = getArabicRoleLabel(user.roleKey);
      user.roleEn = getEnglishRoleLabel(user.roleKey);
      if (staff.clinic_id) {
        user.clinicId = staff.clinic_id;
      } else {
        user.clinicId = null;
      }
      // Staff exists (even with null clinic_id) → skip auto-provision
      return user;
    }
  } catch {
    // Supabase queries failed (likely RLS for non-Supabase users) — proceed
  }

  // If we reach here, no staff record was found.
  // Auto-provision for new Google users
  const pendingGoogleSignup = typeof window !== 'undefined'
    ? await getAppValue<string>("pending_google_signup", "").catch(() => "")
    : "";
  if (pendingGoogleSignup === "true" && user.email) {
    try {
      const provisionRes = await fetch("/api/auth/auto-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      if (provisionRes.ok) {
        const provisionData = await provisionRes.json();
        if (provisionData.clinicId) {
          user.clinicId = provisionData.clinicId;
          user.roleKey = "admin";
          user.role = "مدير العيادة";
          user.roleEn = "Clinic Admin";
        }
      }
    } catch (e) {
      console.error("[enrichUserWithClinic] Auto-provision failed:", e);
    }
    await setAppValue("pending_google_signup", "").catch(() => {});
  }

  // We explicitly set clinicId to null so the app knows the user needs to complete onboarding if not provisioned.
  if (user.clinicId === undefined) {
    user.clinicId = null;
  }

  return user;
}

function AuthContextValueProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnriching, setIsEnriching] = useState(false);
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const nextAuthEmailRef = useRef<string | null>(null);

  // Never restore an authenticated user from localStorage. Only verified server sessions
  // (NextAuth) or a live Supabase Auth session may establish identity.
  useEffect(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (authSession?.user) {
        // Shadow sessions are only a bridge for RLS; NextAuth remains the actual web identity.
        if (authSession.user.app_metadata?.auth_source === "nextauth-shadow") return;
        // User metadata and browser storage are user-controlled; the staff table is the role source of truth.
        const roleKey = "doctor" as const;
        const name = authSession.user.user_metadata?.full_name || authSession.user.email?.split("@")[0] || "مستخدم";

        const newUser: User = {
          name: prefixArabicName(name, roleKey),
          email: authSession.user.email || "",
          initials: name.substring(0, 2).toUpperCase(),
          role: getArabicRoleLabel(roleKey),
          roleKey,
          bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
          nameEn: prefixEnglishName(name, roleKey),
          roleEn: getEnglishRoleLabel(roleKey),
          initialsEn: name.substring(0, 2).toUpperCase(),
        };

        setIsEnriching(true);
        const enriched = await enrichUserWithClinic(newUser);
        setIsEnriching(false);

        // Always accept the latest authoritative enrichment result. A previous null clinicId
        // must not block a later successful lookup for the same email.
        setUser(enriched);
        setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
        setAppValue("pending_role", "doctor").catch(() => {});
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setAppValue("current_user", null).catch(() => {});
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const sessionEmail = (session.user.email || "").toLowerCase();
      nextAuthEmailRef.current = sessionEmail;
      let active = true;

      const loadRoleState = async () => {
        const currentUser = session.user!;
        const email = currentUser.email || "";
        const pendingSignup = await getAppValue<string>("pending_google_signup", "").catch(() => "");
        // Never trust a role stored in localStorage. enrichUserWithClinic resolves it from the server-side staff record.
        const finalRoleKey = "doctor" as const;

        // Sync NextAuth session to Supabase so RLS policies work!
        try {
          const res = await fetch("/api/auth/supabase-session");
          if (res.ok) {
            const { session: supaSession } = await res.json();
            if (supaSession && active) {
              await supabase.auth.setSession({
                access_token: supaSession.access_token,
                refresh_token: supaSession.refresh_token,
              });
            }
          }
        } catch (err) {
          console.error("Failed to sync Supabase session:", err);
        }

        const name = currentUser.name || email.split("@")[0];
        const initials = name.substring(0, 2).toUpperCase();
        const newUser: User = {
          name: prefixArabicName(name, finalRoleKey),
          email,
          initials,
          role: getArabicRoleLabel(finalRoleKey),
          roleKey: finalRoleKey,
          bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
          image: currentUser.image || undefined,
          nameEn: prefixEnglishName(name, finalRoleKey),
          roleEn: `${getEnglishRoleLabel(finalRoleKey)} (Google)`,
          initialsEn: initials,
        };

        setIsEnriching(true);
        const enriched = await enrichUserWithClinic(newUser);
        if (!active) return;
        setIsEnriching(false);
        // Do not keep stale clinic data from an earlier enrichment attempt.
        setUser(enriched);
        setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
        // If new Google user just provisioned, send to setup/center to complete clinic info.
        if (enriched.clinicId && pendingSignup === "true" && typeof window !== "undefined") {
          window.location.href = "/setup/center";
        } else if (enriched.roleKey === "platform_admin" && typeof window !== "undefined" && (window.location.pathname === "/home" || window.location.pathname === "/setup" || window.location.pathname.startsWith("/manage") || window.location.pathname === "/signup")) {
          window.location.href = "/platform";
        }
      };

      loadRoleState();
      return () => { active = false; };
    } else if (status === "unauthenticated" && nextAuthEmailRef.current) {
      const expiredEmail = nextAuthEmailRef.current;
      nextAuthEmailRef.current = null;
      setIsEnriching(false);
      setUser((prev) => prev?.email?.toLowerCase() === expiredEmail ? null : prev);
      setAppValue("current_user", null).catch(() => {});
      // Revoke the long-lived Supabase shadow session when its NextAuth owner expires.
      supabase.auth.signOut().catch((error) => console.error("Failed to revoke expired shadow session:", error));
    }
  }, [session, status]);

  const isAuthLoading = isLoading || isEnriching || status === "loading";

  useEffect(() => {
    if (!isAuthLoading) {
      if (!pathname) return;

      // Landing page is always public
      if (pathname === "/") return;

      // Force platform_admin isolation
      if (user?.roleKey === "platform_admin") {
        if (!pathname.startsWith("/platform") && pathname !== "/logout") {
          window.location.href = "/platform";
          return;
        }
      }

      // Allow unauthenticated access to /[slug] branded login pages
      const knownPages = new Set(["home","admin","setup","login","manage","signup","logout","terms","privacy","subscribe","subscription","forgot-password","reset-password","my-centers","patients","doctors","calendar","billing","reports","chat","staff","settings","permissions","security","profile","analytics","appointments","packages","clinic-settings","clinical-library","clinical-nutrition","users-permissions","plans","center_setup"]);
      const isSlugPage = /^\/[a-z][a-z0-9-]+$/.test(pathname) && !knownPages.has(pathname.replace("/", ""));
      if (isSlugPage) return;
      if (pathname.startsWith("/setup") || pathname === "/plans" || pathname === "/center_setup") { if (user?.clinicId && !isEnriching) { window.location.href = user?.roleKey === "platform_admin" ? "/platform" : "/home"; } return; }
      if (!user && status !== "authenticated") {
        if (!pathname.startsWith("/manage") && pathname !== "/signup" && pathname !== "/") {
          window.location.href = "/manage";
        }
        return;
      }
      if (pathname === "/signup") return;
      if (pathname.startsWith("/manage")) return;
      // Redirect only after enrichment has confirmed that the account has no clinic.
      // undefined means the lookup is unresolved and must not trigger an onboarding redirect.
      if (user?.clinicId === null && !user?.isPlatformAdmin && user?.email && !isEnriching) {
        const setupPaths = ["/manage", "/signup", "/setup", "/setup/center", "/plans", "/center_setup"];
        if (!setupPaths.includes(pathname)) {
          window.location.href = "/setup";
        }
      }
    }
  }, [user, pathname, isAuthLoading, status]);

  const loginWithGoogle = async (email: string) => {
    const activeSession = await getSession();
    if (!activeSession?.user?.email || activeSession.user.email.toLowerCase() !== email.toLowerCase()) return;
    const name = email.split("@")[0];
    const uppercaseName = name.charAt(0).toUpperCase() + name.slice(1);
    const newUser: User = {
      name: `د. ${uppercaseName}`,
      email,
      initials: uppercaseName.substring(0, 2),
      role: "طبيب معالج (جوجل)",
      roleKey: "doctor",
      bg: "bg-gradient-to-br from-[#0d8a8a] to-[#085454]",
      nameEn: uppercaseName,
      roleEn: "Certified Therapist (Google)",
      initialsEn: uppercaseName.substring(0, 2),
    };
    setIsEnriching(true);
    const enriched = await enrichUserWithClinic(newUser);
    setIsEnriching(false);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = enriched.roleKey === "platform_admin" ? "/platform" : "/home";
  };

  const loginWithCredentials = async (email: string, name: string, _role: string) => {
    const activeSession = await getSession();
    if (!activeSession?.user?.email || activeSession.user.email.toLowerCase() !== email.toLowerCase()) return;
    const initials = name.substring(0, 2).toUpperCase();
    const roleKey = "doctor" as const;

    const newUser: User = {
      name: prefixArabicName(name, roleKey),
      email,
      initials,
      role: getArabicRoleLabel(roleKey),
      roleKey,
      bg: "bg-gradient-to-br from-[#0d8a8a] to-[#085454]",
      nameEn: prefixEnglishName(name, roleKey),
      roleEn: getEnglishRoleLabel(roleKey),
      initialsEn: initials,
    };
    setIsEnriching(true);
    const enriched = await enrichUserWithClinic(newUser);
    setIsEnriching(false);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = enriched.roleKey === "platform_admin" ? "/platform" : "/home";
  };

  const registerWithSupabase = async (email: string, pass: string, meta: any) => {
    try {
      const passwordCheck = await fetch("/api/auth/validate-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass }),
      });
      const passwordResult = await passwordCheck.json().catch(() => ({}));
      if (!passwordCheck.ok) return { error: passwordResult.error || "كلمة المرور لا تستوفي متطلبات الأمان" };

      const { error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: { data: meta },
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const loginWithSupabase = async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { error: error.message };
      return {};
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const logout = async () => {
    setUser(null);
    setAppValue("current_user", null).catch(() => {});
    await supabase.auth.signOut();
    signOut({ callbackUrl: "/manage" }).catch(() => {
      window.location.href = "/manage";
    });
  };

  useEffect(() => {
    if (!user && status !== "authenticated") return;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const TIMEOUT_MS = 30 * 60 * 1000;

    const resetTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        logout();
      }, TIMEOUT_MS);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [user, status]);

  return (
    <AuthContext.Provider value={{ user, activeBranchId, setActiveBranchId, loginWithGoogle, loginWithCredentials, registerWithSupabase, loginWithSupabase, logout, isLoading: isAuthLoading, isEnriching }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextValueProvider>{children}</AuthContextValueProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}




