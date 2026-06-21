"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionProvider, signOut, useSession } from "next-auth/react";
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
}

interface AuthContextType {
  user: User | null;
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  loginWithGoogle: (email: string) => void;
  loginWithCredentials: (email: string, name: string, role: string) => void;
  registerWithSupabase: (email: string, pass: string, meta: any) => Promise<{ error?: string }>;
  loginWithSupabase: (email: string, pass: string) => Promise<{ error?: string }>;
  logout: () => void;
  isLoading: boolean;
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
    default:
      return "doctor";
  }
}

let autoProvisionAttempted = false;

async function enrichUserWithClinic(user: User): Promise<User> {
  // First, try server API (uses service_role — works for NextAuth users without Supabase session)
  try {
    const res = await fetch("/api/auth/enrich");
    if (res.ok) {
      const data = await res.json();
      if (data.clinicId) {
        user.clinicId = data.clinicId;
        user.roleKey = data.roleKey as User["roleKey"];
        user.role = data.roleAr;
        user.roleEn = data.roleEn;
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
      .eq("email", user.email)
      .maybeSingle();
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
      .eq("email", user.email)
      .maybeSingle();

    if (staff?.clinic_id) {
      user.clinicId = staff.clinic_id;
      user.roleKey = mapStaffRoleToRoleKey(staff.role);
      user.role = getArabicRoleLabel(user.roleKey);
      user.roleEn = getEnglishRoleLabel(user.roleKey);
      return user;
    }
  } catch {
    // Supabase queries failed (likely RLS for non-Supabase users) — proceed
  }

  // First-time Google signup — auto-provision clinic + staff
  const pendingSignup = await getAppValue<string>("pending_google_signup", "");
  if (pendingSignup === "true" && !autoProvisionAttempted) {
    autoProvisionAttempted = true;
    try {
      const res = await fetch("/api/auth/auto-provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, name: user.name }),
      });
      if (res.ok) {
        const data = await res.json();
        user.clinicId = data.clinicId;
        setAppValue("pending_google_signup", "").catch(() => {});
      } else {
        console.warn("[AutoProvision] API returned", res.status, await res.text().catch(() => ""));
      }
    } catch (e) {
      console.warn("[AutoProvision] Network error:", e);
    }
  }

  return user;
}

function AuthContextValueProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const { data: session, status } = useSession();

  useEffect(() => {
    const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";
    if (isAuthPage) {
      setIsLoading(false);
      return;
    }

    getAppValue<User | null>("current_user", null)
      .then((savedUser) => {
        if (savedUser) setUser(savedUser);
      })
      .catch((e) => console.error("Failed to load user session", e));

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, authSession) => {
      if (authSession?.user) {
        const pendingRole = (await getAppValue<string>("pending_role", "doctor")) || "doctor";
        const roleKey = (authSession.user.user_metadata?.role || pendingRole || "doctor") as "admin" | "doctor" | "receptionist";
        const name = authSession.user.user_metadata?.full_name || authSession.user.email?.split("@")[0] || "مستخدم";

        const newUser: User = {
          name: prefixArabicName(name, roleKey),
          email: authSession.user.email || "",
          initials: name.substring(0, 2).toUpperCase(),
          role: getArabicRoleLabel(roleKey),
          roleKey,
          bg:
            roleKey === "admin"
              ? "bg-gradient-to-br from-[#0d8a8a] to-[#085454]"
              : roleKey === "doctor"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-amber-500 to-orange-600",
          nameEn: prefixEnglishName(name, roleKey),
          roleEn: getEnglishRoleLabel(roleKey),
          initialsEn: name.substring(0, 2).toUpperCase(),
        };

        const enriched = await enrichUserWithClinic(newUser);

        setUser((prev) => {
          if (prev?.email === enriched.email && prev?.clinicId !== undefined) return prev;
          setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
          return enriched;
        });
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
      const loadRoleState = async () => {
        const currentUser = session.user!;
        const email = currentUser.email || "";
        const finalRoleKey = ((await getAppValue<string>("pending_role", "doctor")) || "doctor") as "admin" | "doctor" | "receptionist" | "platform_admin";

        const name = currentUser.name || email.split("@")[0];
        const initials = name.substring(0, 2).toUpperCase();
        const newUser: User = {
          name: prefixArabicName(name, finalRoleKey),
          email,
          initials,
          role: getArabicRoleLabel(finalRoleKey),
          roleKey: finalRoleKey,
          bg:
            finalRoleKey === "admin"
              ? "bg-gradient-to-br from-[#0d8a8a] to-[#085454]"
              : finalRoleKey === "doctor"
              ? "bg-gradient-to-br from-emerald-500 to-teal-600"
              : "bg-gradient-to-br from-amber-500 to-orange-600",
          image: currentUser.image || undefined,
          nameEn: prefixEnglishName(name, finalRoleKey),
          roleEn: `${getEnglishRoleLabel(finalRoleKey)} (Google)`,
          initialsEn: initials,
        };

        const enriched = await enrichUserWithClinic(newUser);
        setUser((prev) => {
          if (prev?.email === enriched.email && prev?.clinicId !== undefined) return prev;
          setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
          return enriched;
        });
      };

      loadRoleState();
    }
  }, [session, status]);

  const isAuthLoading = isLoading || status === "loading";

  useEffect(() => {
    if (!isAuthLoading) {
      const isAuthPage = pathname === "/login" || pathname === "/signup";
      const isSetupPage = pathname === "/subscribe" || pathname === "/centers/new";
      if (!pathname) return;
      if (!user && status !== "authenticated" && !isAuthPage) {
        window.location.href = "/login";
      } else if ((user || status === "authenticated") && isAuthPage) {
        if (pathname === "/signup") return;
        window.location.href = "/home";
      } else if ((user || status === "authenticated") && !isAuthPage && !isSetupPage) {
        if (user?.clinicId === undefined && user?.email) {
          const setupPaths = ["/login", "/signup", "/subscribe", "/centers/new"];
          if (!setupPaths.includes(pathname)) {
            window.location.href = "/login?setup=center";
          }
        }
      }
    }
  }, [user, pathname, isAuthLoading, status]);

  const loginWithGoogle = async (email: string) => {
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
    const enriched = await enrichUserWithClinic(newUser);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = "/home";
  };

  const loginWithCredentials = async (email: string, name: string, role: string) => {
    const initials = name.substring(0, 2).toUpperCase();
    const roleKey = (email.startsWith("admin")
      ? "admin"
      : email.startsWith("reception")
      ? "receptionist"
      : "doctor") as "admin" | "doctor" | "receptionist";

    const newUser: User = {
      name: prefixArabicName(name, roleKey),
      email,
      initials,
      role,
      roleKey,
      bg: "bg-gradient-to-br from-[#0d8a8a] to-[#085454]",
      nameEn: prefixEnglishName(name, roleKey),
      roleEn: getEnglishRoleLabel(roleKey),
      initialsEn: initials,
    };
    const enriched = await enrichUserWithClinic(newUser);
    setUser(enriched);
    setAppValue("current_user", enriched).catch((error) => console.error("Failed to persist user", error));
    window.location.href = "/home";
  };

  const registerWithSupabase = async (email: string, pass: string, meta: any) => {
    try {
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
    signOut({ callbackUrl: "/login" }).catch(() => {
      window.location.href = "/login";
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
    <AuthContext.Provider value={{ user, activeBranchId, setActiveBranchId, loginWithGoogle, loginWithCredentials, registerWithSupabase, loginWithSupabase, logout, isLoading: isAuthLoading }}>
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


