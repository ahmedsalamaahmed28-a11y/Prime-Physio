"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, useSession, getSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { getAppValue, setAppValue } from "@/lib/appStorage";
import { installClinicApiFetch, setClinicApiAccessToken } from "@/lib/clinic-api-fetch";
import { activateClinicSession, withNextAuthLoginLock } from "@/lib/clinic-session";

interface User {
  name: string;
  nameEn?: string;
  email: string;
  initials: string;
  initialsEn?: string;
  role: string;
  roleEn?: string;
  // Retained only for the separately authenticated platform-admin area; normal clinic login never assigns this role.
  roleKey: "admin" | "doctor" | "receptionist" | "platform_admin";
  isPlatformAdmin?: boolean;
  bg: string;
  image?: string;
  clinicId?: string | null;
  clinicSlug?: string | null;
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
  if (roleKey === "receptionist") return name;
  if (name.startsWith("د.") || name.startsWith("د/")) return name;
  return `د. ${name}`;
}

function prefixEnglishName(name: string, roleKey: string) {
  if (roleKey === "receptionist") return name;
  return name.startsWith("Dr.") ? name : `Dr. ${name.replace(/^د\.?\s*/, "").trim()}`;
}

function getArabicRoleLabel(roleKey: string) {
  if (roleKey === "admin") return "مدير العيادة";
  if (roleKey === "doctor") return "طبيب معالج";
  return "موظف استقبال";
}

function getEnglishRoleLabel(roleKey: string) {
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
  const storedPreferredClinicId = typeof window !== "undefined" ? sessionStorage.getItem("preferred_clinic_id") : null;
  // Credentials login stores the verified clinic ID in the signed NextAuth JWT.
  // Use that server-authenticated scope if browser sessionStorage is unavailable.
  const preferredClinicId = storedPreferredClinicId || user.clinicId || null;
  try {
    const t = Date.now();
    const queryParams = preferredClinicId ? `?preferred_clinic_id=${preferredClinicId}&t=${t}` : `?t=${t}`;
    const res = await fetch(`/api/auth/enrich${queryParams}`, { signal: AbortSignal.timeout(12000) });
    // A denied clinic selection is a confirmed membership failure; never fall back
    // to an unscoped browser query after the server rejects the requested tenant.
    if (res.status === 403) {
      if (typeof window !== "undefined") sessionStorage.removeItem("preferred_clinic_id");
      user.clinicId = null;
      return user;
    }
    // A failed server lookup is not proof that the user has no clinic.
    if (res.status >= 500) return user;
    // A clinic-specific login must fail closed if the authoritative membership
    // endpoint does not confirm the requested tenant (including an expired session).
    if (preferredClinicId && !res.ok) {
      if (typeof window !== "undefined") sessionStorage.removeItem("preferred_clinic_id");
      user.clinicId = null;
      return user;
    }
    if (res.ok) {
      const data = await res.json();
      if (typeof data.displayName === "string" && data.displayName.trim()) {
        const cleanName = data.displayName.trim();
        user.name = prefixArabicName(cleanName, user.roleKey);
        user.nameEn = prefixEnglishName(cleanName, user.roleKey);
        user.initials = cleanName.substring(0, 2).toUpperCase();
        user.initialsEn = cleanName.substring(0, 2).toUpperCase();
      }
      if (data.clinicId || data.roleKey) {
        user.clinicId = data.clinicId;
        user.clinicSlug = typeof data.clinicSlug === "string" ? data.clinicSlug : null;
        user.roleKey = data.roleKey as User["roleKey"];
        user.isPlatformAdmin = data.roleKey === "platform_admin" || data.isPlatformAdmin === true;
        user.role = data.roleAr;
        user.roleEn = data.roleEn;
        user.shortName = data.shortName || null;
        user.logoUrl = data.logoUrl || null;
        // Keep the selected clinic scope for the full browser session. Other auth
        // effects can enrich the same login concurrently; clearing it here lets a
        // second request misclassify the clinic owner as an unscoped center manager.
        return user;
      }
      // A successful server-side lookup with no membership is authoritative.
      // Do not fall through to browser queries that may fail because of RLS/session sync.
      if (!data.clinicId && !data.roleKey && !preferredClinicId) {
        user.clinicId = null;
        user.isPlatformAdmin = false;
        return user;
      }
      if (preferredClinicId) {
        // The server confirmed that the signed-in identity has no membership in this tenant.
        if (typeof window !== "undefined") sessionStorage.removeItem("preferred_clinic_id");
        user.clinicId = null;
        return user;
      }
    }
  } catch {
    // A timeout or network failure must not trigger unscoped browser-side lookups.
    // Leave clinicId unresolved so the UI can show a retryable error instead of
    // waiting forever or risking cross-clinic access.
    if (preferredClinicId && typeof window !== "undefined") {
      sessionStorage.removeItem("preferred_clinic_id");
      user.clinicId = null;
    }
    return user;
  }

  try {
    // Look up clinic_id + role from staff (source of truth for roleKey)
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("clinic_id, role")
      .eq("email", user.email).limit(1).maybeSingle();
    if (staffError) return user;

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
    // A failed lookup must remain unresolved; never convert it into a missing-clinic state.
    return user;
  }

  // No membership means this is a first-time onboarding account.
  // Do not create a clinic here: the user must choose a plan and submit clinic details first.
  if (typeof window !== "undefined") {
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
  const rawPathname = usePathname();
  // Normalize trailing slashes so /login.php and /login.php/ are treated identically.
  const pathname = (rawPathname || "/").replace(/[/]+$/, "") || "/";
  const { data: session, status } = useSession();
  const nextAuthEmailRef = useRef<string | null>(null);
  // Several auth providers can enrich the same login concurrently. Keep the
  // loading state active until every enrichment request has completed.
  const enrichmentCountRef = useRef(0);
  const beginEnrichment = () => {
    enrichmentCountRef.current += 1;
    setIsEnriching(true);
  };
  const endEnrichment = () => {
    enrichmentCountRef.current = Math.max(0, enrichmentCountRef.current - 1);
    setIsEnriching(enrichmentCountRef.current > 0);
  };

  // Install the same-origin API bridge before auth effects run.
  useEffect(() => installClinicApiFetch(), []);

  // Never restore an authenticated user from localStorage. Only verified server sessions
  // (NextAuth) or a live Supabase Auth session may establish identity.
  useEffect(() => {
    let active = true;
    let authEventVersion = 0;
    const pendingTimers = new Set<ReturnType<typeof setTimeout>>();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, authSession) => {
      const eventVersion = ++authEventVersion;
      setIsLoading(false);
      const metadata = authSession?.user?.app_metadata || {};
      const isClinicScoped = metadata.auth_source === "clinic-scoped-shadow";
      const scopedEmail = typeof metadata.canonical_email === "string"
        ? metadata.canonical_email.trim().toLowerCase()
        : "";
      const scopedClinicId = typeof metadata.clinic_id === "string" ? metadata.clinic_id : "";
      const scopedExpiry = Number(metadata.nextauth_expires_at || 0);
      const scopedSessionValid =
        isClinicScoped &&
        Boolean(scopedEmail && scopedClinicId) &&
        Number.isSafeInteger(scopedExpiry) &&
        scopedExpiry > Math.floor(Date.now() / 1000);
      setClinicApiAccessToken(scopedSessionValid ? authSession?.access_token || null : null);

      if (isClinicScoped && !scopedSessionValid) {
        setUser(null);
        setAppValue("current_user", null).catch(() => {});
        if (typeof window !== "undefined") {
          sessionStorage.setItem("prime-physio:tab-logged-out", "1");
          sessionStorage.removeItem("preferred_clinic_id");
          sessionStorage.removeItem("prime-physio:active-clinic-id");
        }
        const cleanupTimer = setTimeout(() => {
          pendingTimers.delete(cleanupTimer);
          void supabase.auth.signOut({ scope: "local" }).catch((error) => {
            console.error("Failed to clear expired clinic session:", error);
          });
        }, 0);
        pendingTimers.add(cleanupTimer);
        return;
      }

      if (!authSession?.user) {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setAppValue("current_user", null).catch(() => {});
        }
        return;
      }

      if (metadata.auth_source === "nextauth-shadow") return;
      const canonicalEmail = isClinicScoped
        ? scopedEmail
        : (authSession.user.email || "").trim().toLowerCase();
      if (!canonicalEmail) return;

      const roleKey = "doctor" as const;
      const name = authSession.user.user_metadata?.full_name || canonicalEmail.split("@")[0] || "مستخدم";
      const newUser: User = {
        name: prefixArabicName(name, roleKey),
        email: canonicalEmail,
        initials: name.substring(0, 2).toUpperCase(),
        role: getArabicRoleLabel(roleKey),
        roleKey,
        clinicId: isClinicScoped ? scopedClinicId : undefined,
        bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
        nameEn: prefixEnglishName(name, roleKey),
        roleEn: getEnglishRoleLabel(roleKey),
        initialsEn: name.substring(0, 2).toUpperCase(),
      };

      // Supabase warns against awaiting other Supabase operations inside its
      // auth-state callback. Defer enrichment until after the callback releases
      // the internal auth lock; the token is already available to the API bridge.
      beginEnrichment();
      const timer = setTimeout(() => {
        pendingTimers.delete(timer);
        void enrichUserWithClinic(newUser)
          .then((enriched) => {
            if (!active || eventVersion !== authEventVersion) return;
            setUser(enriched);
            setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
            setAppValue("pending_role", "doctor").catch(() => {});
          })
          .catch((error) => {
            console.error("Failed to enrich authenticated clinic user:", error);
          })
          .finally(() => endEnrichment());
      }, 0);
      pendingTimers.add(timer);
    });

    return () => {
      active = false;
      authEventVersion += 1;
      pendingTimers.forEach((timer) => clearTimeout(timer));
      pendingTimers.clear();
      authListener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const sessionEmail = (session.user.email || "").toLowerCase();
      nextAuthEmailRef.current = sessionEmail;
      let active = true;

      const loadRoleState = async () => {
        if (typeof window !== "undefined" && sessionStorage.getItem("prime-physio:tab-logged-out") === "1") return;

        // A verified clinic identity stored in this tab always wins over the
        // shared NextAuth cookie, which may have changed in another tab.
        const { data: tabAuth } = await supabase.auth.getSession();
        const tabMetadata = tabAuth.session?.user?.app_metadata || {};
        if (tabMetadata.auth_source === "clinic-scoped-shadow") {
          const tabEmail = typeof tabMetadata.canonical_email === "string"
            ? tabMetadata.canonical_email.trim().toLowerCase()
            : "";
          if (tabEmail && tabEmail !== sessionEmail) return;
          if (tabEmail === sessionEmail) return;
        }

        const currentUser = session.user!;
        const email = currentUser.email || "";
        const finalRoleKey = "doctor" as const;

        const requestedClinicId =
          typeof window !== "undefined" &&
          (window.location.pathname.replace(/\/+$/, "") || "/") === "/dashboard"
            ? new URLSearchParams(window.location.search).get("clinicId")
            : null;
        if (requestedClinicId) sessionStorage.setItem("preferred_clinic_id", requestedClinicId);

        const name = currentUser.name || email.split("@")[0];
        const initials = name.substring(0, 2).toUpperCase();
        const newUser: User = {
          name: prefixArabicName(name, finalRoleKey),
          email,
          initials,
          role: getArabicRoleLabel(finalRoleKey),
          roleKey: finalRoleKey,
          clinicId: typeof (currentUser as any).clinicId === "string" ? (currentUser as any).clinicId : undefined,
          bg: "bg-gradient-to-br from-emerald-500 to-teal-600",
          image: currentUser.image || undefined,
          nameEn: prefixEnglishName(name, finalRoleKey),
          roleEn: `${getEnglishRoleLabel(finalRoleKey)} (Google)`,
          initialsEn: initials,
        };

        beginEnrichment();
        const enriched = await enrichUserWithClinic(newUser);
        endEnrichment();
        if (!active) return;

        if (enriched.clinicId && !enriched.isPlatformAdmin) {
          try {
            await withNextAuthLoginLock(async () => {
              const latestSession = await getSession();
              const latestEmail = latestSession?.user?.email?.trim().toLowerCase();
              const latestExpiry = Date.parse(latestSession?.expires || "");
              if (
                !latestSession ||
                latestEmail !== enriched.email.trim().toLowerCase() ||
                !Number.isFinite(latestExpiry) ||
                latestExpiry <= Date.now()
              ) {
                throw new Error("The login identity changed in another tab; please sign in again in this tab.");
              }

              // The branded login may already have exchanged this tab's session.
              // Reuse it rather than issuing a second scoped refresh-token pair.
              const { data: currentTabAuth } = await supabase.auth.getSession();
              const currentMetadata = currentTabAuth.session?.user?.app_metadata || {};
              const currentExpiry = Number(currentMetadata.nextauth_expires_at || 0);
              if (
                currentMetadata.auth_source === "clinic-scoped-shadow" &&
                currentMetadata.canonical_email === enriched.email.trim().toLowerCase() &&
                currentMetadata.clinic_id === enriched.clinicId &&
                Number.isSafeInteger(currentExpiry) &&
                currentExpiry > Math.floor(Date.now() / 1000)
              ) return;

              await activateClinicSession(enriched.clinicId!, enriched.email);
            });
          } catch (error) {
            console.error("Failed to activate independent clinic session:", error);
            setClinicApiAccessToken(null);
            setUser(null);
            setAppValue("current_user", null).catch(() => {});
            setIsEnriching(false);
            return;
          }
        }

        setUser(enriched);
        setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
        const currentPath = typeof window !== "undefined" ? (window.location.pathname.replace(/[/]+$/, "") || "/") : "";
        const isClinicLandingPage = currentPath.startsWith("/clinic/");
        const isAuthEntryPath = currentPath === "/login.php" || currentPath === "/login" || currentPath === "/signup" || currentPath === "/rgstr.php" || currentPath === "/home" || currentPath.startsWith("/setup");
        if (enriched.clinicId && typeof window !== "undefined" && isAuthEntryPath && !isClinicLandingPage) {
          window.location.href = "/dashboard";
        } else if (enriched.clinicId === null && typeof window !== "undefined" && currentPath !== "/" && !currentPath.startsWith("/setup") && currentPath !== "/center-management" && currentPath !== "/center-management.php" && !/^\/(?:centers|overview|export|account|plans|notices)\.php$/.test(currentPath) && currentPath !== "/create-center" && currentPath !== "/addcenter.php" && currentPath !== "/my-centers/create" && !/^\/[a-z][a-z0-9-]+$/.test(currentPath) && !isClinicLandingPage) {
          window.location.href = "/overview.php/";
        }
      };

      loadRoleState();
      return () => { active = false; };
    } else if (status === "unauthenticated" && nextAuthEmailRef.current) {
      const previousNextAuthEmail = nextAuthEmailRef.current;
      nextAuthEmailRef.current = null;
      enrichmentCountRef.current = 0;
      setIsEnriching(false);

      // NextAuth's cookie is shared across tabs. A change in another tab must
      // not revoke this tab's independent sessionStorage-backed clinic identity.
      supabase.auth.getSession().then(({ data }) => {
        const metadata = data.session?.user?.app_metadata || {};
        if (metadata.auth_source === "clinic-scoped-shadow") {
          const scopedExpiry = Number(metadata.nextauth_expires_at || 0);
          if (Number.isSafeInteger(scopedExpiry) && scopedExpiry > Math.floor(Date.now() / 1000)) {
            return;
          }

          setClinicApiAccessToken(null);
          setUser((prev) => prev?.email?.toLowerCase() === String(metadata.canonical_email || "").toLowerCase() ? null : prev);
          setAppValue("current_user", null).catch(() => {});
          if (typeof window !== "undefined") {
            sessionStorage.setItem("prime-physio:tab-logged-out", "1");
            sessionStorage.removeItem("preferred_clinic_id");
            sessionStorage.removeItem("prime-physio:active-clinic-id");
          }
          return supabase.auth.signOut({ scope: "local" });
        }

        setUser((prev) => prev?.email?.toLowerCase() === previousNextAuthEmail ? null : prev);
        setAppValue("current_user", null).catch(() => {});
      }).catch((error) => console.error("Failed to validate tab session after NextAuth status change:", error));
    }
  }, [session, status]);

  const isAuthLoading = isLoading || isEnriching || status === "loading";

  useEffect(() => {
    if (!isAuthLoading) {
      if (!pathname) return;

      // Landing page and independent center landing pages are public.
      if (pathname === "/" || pathname.startsWith("/clinic/")) return;

      // Platform administration will use a separate login entry point.

      // Allow unauthenticated access to /[slug] branded login pages
      const knownPages = new Set(["home","dashboard","admin","setup","login","login.php","signup","logout","terms","privacy","subscribe","subscription","forgot-password","reset-password","my-centers","patients","doctors","calendar","billing","reports","chat","staff","settings","permissions","security","profile","analytics","appointments","packages","clinic-settings","clinical-library","clinical-nutrition","users-permissions","plans","center_setup","center-management","create-center","home.php","rgstr.php","center-management.php"]);
      const isSlugPage = /^\/[a-z][a-z0-9-]+$/.test(pathname) && !knownPages.has(pathname.replace("/", ""));
      if (isSlugPage) return;
      if (pathname.startsWith("/setup") || pathname === "/plans" || pathname === "/center_setup") { window.location.replace("/center-management"); return; }
      const tabWasLoggedOut = typeof window !== "undefined" && sessionStorage.getItem("prime-physio:tab-logged-out") === "1";
      if (!user && (status !== "authenticated" || tabWasLoggedOut)) {
        // Legal documents are public and must remain accessible without an account.
        if (
          pathname !== "/login.php" &&
          pathname !== "/login" &&
          pathname !== "/signup" &&
          pathname !== "/rgstr.php" &&
          pathname !== "/home.php" &&
          pathname !== "/" &&
          pathname !== "/privacy" &&
          pathname !== "/terms"
        ) {
          window.location.href = "/login.php/";
        }
        return;
      }
      if (pathname === "/create-center" || pathname === "/center-management") return;
      if (pathname === "/signup" || pathname === "/rgstr.php") return;
      // Redirect only after enrichment has confirmed that the account has no clinic.
      // undefined means the lookup is unresolved and must not trigger an onboarding redirect.
      if (user?.clinicId === null && !user?.isPlatformAdmin && user?.email && !isEnriching) {
        const setupPaths = ["/login.php", "/login", "/signup", "/rgstr.php", "/setup", "/setup/center", "/plans", "/center_setup", "/center-management", "/center-management.php", "/centers.php", "/overview.php", "/export.php", "/account.php", "/plans.php", "/notices.php", "/create-center", "/addcenter.php", "/my-centers/create", "/centers/new", "/my-centers/new"];
        if (!setupPaths.includes(pathname)) {
          window.location.href = "/overview.php/";
        }
      }
    }
  }, [user, pathname, isAuthLoading, status]);

  const loginWithGoogle = async (email: string) => {
    if (typeof window !== "undefined") sessionStorage.removeItem("prime-physio:tab-logged-out");
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
    beginEnrichment();
    const enriched = await enrichUserWithClinic(newUser);
    endEnrichment();
    if (enriched.clinicId && !enriched.isPlatformAdmin) await activateClinicSession(enriched.clinicId, enriched.email);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = enriched.clinicId ? "/dashboard" : "/overview.php/";
  };

  const loginWithCredentials = async (email: string, name: string, _role: string) => {
    if (typeof window !== "undefined") sessionStorage.removeItem("prime-physio:tab-logged-out");
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
    beginEnrichment();
    const enriched = await enrichUserWithClinic(newUser);
    endEnrichment();
    if (enriched.clinicId && !enriched.isPlatformAdmin) await activateClinicSession(enriched.clinicId, enriched.email);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = enriched.clinicId ? "/dashboard" : "/overview.php/";
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
    // Preserve the active clinic context before clearing the tenant selection.
    // The clinic slug is supplied by the server-side membership enrichment,
    // never inferred from user-editable profile data.
    const clinicSlug = user?.clinicSlug || null;
    const callbackUrl = clinicSlug
      ? `/${encodeURIComponent(clinicSlug)}`
      : "/login.php/";

    if (typeof window !== "undefined") {
      sessionStorage.removeItem("preferred_clinic_id");
      sessionStorage.setItem("prime-physio:tab-logged-out", "1");
    }
    setUser(null);
    setClinicApiAccessToken(null);
    setAppValue("current_user", null).catch(() => {});
    if (typeof window !== "undefined") sessionStorage.removeItem("prime-physio:active-clinic-id");
    // Keep the shared NextAuth cookie for other tabs and revoke only this tab session.
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch (error) {
      console.error("Local clinic sign-out failed:", error);
    } finally {
      window.location.replace(callbackUrl);
    }
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




