"use client";
import React, { useState, useRef, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, X, Shield } from 'lucide-react';
import { signIn, signOut } from "next-auth/react";
import { setAppValue } from "@/lib/appStorage";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { Loader } from "@/components/Loader";
import OnboardingFlow from "@/components/OnboardingFlow";

import { Users, UserCheck, Calendar, Briefcase, Database, Server, BookOpen, Clock, Crown, Building } from 'lucide-react';
import { cn } from "@/lib/utils"
import { GradientCheckbox } from "@/components/ui/checkbox"
import { motion } from "motion/react";

const ALL_FEATURES = (isRtl: boolean) => [
  {
    label: isRtl ? "المرضى (سجلات طبية)" : "Patients (EHR)",
    limits: { basic: isRtl ? "50" : "50", silver: isRtl ? "200" : "200", gold: isRtl ? "∞" : "∞" },
    included: { basic: true, silver: true, gold: true },
    icon: <Users size={20} />,
  },
  {
    label: isRtl ? "الجلسات الشهرية" : "Monthly Sessions",
    limits: { basic: isRtl ? "100" : "100", silver: isRtl ? "500" : "500", gold: isRtl ? "∞" : "∞" },
    included: { basic: true, silver: true, gold: true },
    icon: <Calendar size={20} />,
  },
  {
    label: isRtl ? "حسابات الأخصائيين" : "Therapist Accounts",
    limits: { basic: isRtl ? "20" : "20", silver: isRtl ? "50" : "50", gold: isRtl ? "∞" : "∞" },
    included: { basic: true, silver: true, gold: true },
    icon: <UserCheck size={20} />,
  },
  {
    label: isRtl ? "إدارة المواعيد" : "Appointment Management",
    limits: { basic: null, silver: null, gold: null },
    included: { basic: true, silver: true, gold: true },
    icon: <Briefcase size={20} />,
  },
  {
    label: isRtl ? "التقارير والتحليلات" : "Reports & Analytics",
    limits: { basic: null, silver: null, gold: null },
    included: { basic: false, silver: true, gold: true },
    icon: <Server size={20} />,
  },
  {
    label: isRtl ? "التغذية العلاجية" : "Clinical Nutrition",
    limits: { basic: null, silver: null, gold: null },
    included: { basic: false, silver: true, gold: true },
    icon: <Database size={20} />,
  },
  {
    label: isRtl ? "المكتبة العلاجية" : "Rehab Library",
    limits: { basic: null, silver: null, gold: null },
    included: { basic: false, silver: false, gold: true },
    icon: <BookOpen size={20} />,
  },
  {
    label: isRtl ? "رسائل التذكير (SMS/WA)" : "Reminders (SMS/WA)",
    limits: { basic: null, silver: null, gold: null },
    included: { basic: false, silver: false, gold: true },
    icon: <Clock size={20} />,
  },
  {
    label: isRtl ? "الدعم الفني" : "Support",
    limits: { basic: isRtl ? "بريد إلكتروني" : "Email", silver: isRtl ? "هاتفي سريع" : "Phone", gold: isRtl ? "VIP 24/7" : "VIP 24/7" },
    included: { basic: true, silver: true, gold: true },
    icon: <Crown size={20} />,
  },
  {
    label: isRtl ? "المراكز" : "Centers",
    limits: { basic: isRtl ? "1" : "1", silver: isRtl ? "1" : "1", gold: isRtl ? "2" : "2" },
    included: { basic: true, silver: true, gold: true },
    icon: <BuildingIcon size={20} />,
  },
];

function BuildingIcon(props: { size?: number }) {
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01" /><path d="M16 6h.01" /><path d="M12 6h.01" />
      <path d="M12 10h.01" /><path d="M12 14h.01" />
      <path d="M16 10h.01" /><path d="M16 14h.01" />
      <path d="M8 10h.01" /><path d="M8 14h.01" />
    </svg>
  );
}

const getPlans = (isRtl: boolean) => {
  const allFeatures = ALL_FEATURES(isRtl);
  return [
    {
      id: "basic", name: isRtl ? "الأساسية" : "Starter", price: 500,
      description: isRtl ? "مثالية للعيادات الصغيرة والناشئة" : "Great for small businesses and startups",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: false,
      features: allFeatures.filter((f) => f.included.basic).map((f) => ({ text: `${f.label} (${f.limits.basic})`, icon: f.icon })),
    },
    {
      id: "silver", name: isRtl ? "الفضية" : "Silver", price: 1000,
      description: isRtl ? "قيمة ممتازة للعيادات المتوسطة والنشطة" : "Best value for growing clinics",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: true,
      features: allFeatures.filter((f) => f.included.silver).map((f) => ({ text: `${f.label}${f.limits.silver ? ` (${f.limits.silver})` : ""}`, icon: f.icon })),
    },
    {
      id: "gold", name: isRtl ? "الذهبية" : "Gold", price: 1500,
      description: isRtl ? "خطة متقدمة مع أمان معزز وصول غير محدود" : "Advanced plan with enhanced security",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: false,
      features: allFeatures.filter((f) => f.included.gold).map((f) => ({ text: `${f.label}${f.limits.gold ? ` (${f.limits.gold})` : ""}`, icon: f.icon })),
    },
  ];
};

const PricingSwitch = ({ onSwitch, isRtl }: { onSwitch: (value: string) => void; isRtl: boolean }) => {
  const [selected, setSelected] = useState("0");

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="flex justify-center">
      <div className="relative z-50 mx-auto flex w-fit rounded-full bg-neutral-50 border border-gray-200 p-1">
        <button
          onClick={() => handleSwitch("0")}
          className={`relative z-10 w-fit sm:h-12 h-10 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors ${
            selected === "0"
              ? "text-white"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "0" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-[#4F46BA]/40 border-[#4F46BA] bg-gradient-to-t from-[#4F46BA] via-[#6d28d9] to-[#7c3aed]"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative">{isRtl ? "شهري" : "Monthly"}</span>
        </button>

        <button
          onClick={() => handleSwitch("1")}
          className={`relative z-10 w-fit sm:h-12 h-10 flex-shrink-0 rounded-full sm:px-6 px-3 sm:py-2 py-1 font-medium transition-colors ${
            selected === "1"
              ? "text-white"
              : "text-muted-foreground hover:text-black"
          }`}
        >
          {selected === "1" && (
            <motion.span
              layoutId={"switch"}
              className="absolute top-0 left-0 sm:h-12 h-10 w-full rounded-full border-4 shadow-sm shadow-[#4F46BA]/40 border-[#4F46BA] bg-gradient-to-t from-[#4F46BA] via-[#6d28d9] to-[#7c3aed]"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {isRtl ? "سنوي" : "Yearly"}
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-[#4F46BA]">
              {isRtl ? "وفّر 20%" : "Save 20%"}
            </span>
          </span>
        </button>
      </div>
    </div>
  );
};

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-lg border bg-white px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-[#4F46BA] focus-visible:ring-[3px] focus-visible:ring-[#4F46BA]/20",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

const TABS = [
  { id: "centers", labelAr: "المراكز", labelEn: "Centers" },
  { id: "manage", labelAr: "إدارة", labelEn: "Manage" },
  { id: "plans", labelAr: "الباقات", labelEn: "Plans" },
  { id: "about", labelAr: "من نحن", labelEn: "About" },
  { id: "support", labelAr: "الدعم", labelEn: "Support" },
];

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader size={32} color="#4F46BA" /></div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const { language, toggleLanguage } = useLanguage();
  const isRtl = language === "ar";
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isOnboarding = searchParams?.get("onboard") === "1";
  const isDeleted = searchParams?.get("deleted") === "true";
  const [onboardStep, setOnboardStep] = useState<"plan" | "clinic" | "done">("plan");
  const [activeTab, setActiveTab] = useState("centers");
  const [billingPeriod, setBillingPeriod] = useState("monthly");

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotShowConfirm, setForgotShowConfirm] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotShowCode, setForgotShowCode] = useState("");
  const forgotOtpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // Auth state-aware tabs
  const [authTab, setAuthTab] = useState<"account" | "centers">("account");
  const [userData, setUserData] = useState<any>(null);
  const [userDataLoading, setUserDataLoading] = useState(true);
  const [allBranches, setAllBranches] = useState<any[]>([]);
  const [allBranchesLoading, setAllBranchesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetch("/api/auth/me")
        .then((r) => r.json())
        .then((data) => {
          setUserData(data);
          setUserDataLoading(false);
          if (data && (data.hasClinic === false || !data.subscription)) {
            window.location.href = "/setup";
          }
        })
        .catch(() => setUserDataLoading(false));
    } else {
      setUserData(null);
      setUserDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setAllBranchesLoading(true);
    fetch("/api/branches/all")
      .then((r) => r.json())
      .then((data) => {
        setAllBranches(data.branches || []);
        setAllBranchesLoading(false);
      })
      .catch(() => setAllBranchesLoading(false));
  }, []);

  const handleForgotSendOtp = async () => {
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError(isRtl ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إرسال رمز التحقق" : "Failed to send code"));
      if (data.devCode) {
        setForgotOtp(data.devCode.split("").slice(0, 4));
        setForgotShowCode(data.devCode);
      } else {
        setForgotShowCode("");
      }
      setForgotStep("otp");
      setTimeout(() => forgotOtpRefs[0].current?.focus(), 100);
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...forgotOtp];
    newOtp[idx] = val;
    setForgotOtp(newOtp);
    if (val && idx < 3) forgotOtpRefs[idx + 1].current?.focus();
  };

  const handleForgotOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) forgotOtpRefs[idx - 1].current?.focus();
  };

  const handleForgotVerify = async () => {
    const code = forgotOtp.join("");
    setForgotError("");
    if (code.length !== 4) {
      setForgotError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "رمز التحقق غير صحيح" : "Invalid code"));
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");
    if (forgotNewPassword.length < 6) {
      setForgotError(isRtl ? "كلمة المرور يجب أن تكون 6 أحرف على الأقل" : "Password must be at least 6 characters");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(isRtl ? "كلمة المرور غير متطابقة" : "Passwords do not match");
      return;
    }
    setForgotLoading(true);
    try {
      const code = forgotOtp.join("");
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          code,
          newPassword: forgotNewPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إعادة تعيين كلمة المرور" : "Failed to reset password"));
      setForgotStep("success");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(isRtl ? "يرجى إدخال البريد الإلكتروني وكلمة المرور" : "Please enter email and password");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(isRtl ? "البريد الإلكتروني أو كلمة المرور غير صحيحة" : "Invalid email or password");
        setIsLoading(false);
        return;
      }

      // Check if account is verified
      try {
        const checkRes = await fetch("/api/auth/check-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const checkData = await checkRes.json();
        if (!checkData.verified) {
          await signOut({ redirect: false });
          setError(isRtl ? "يرجى التحقق من بريدك الإلكتروني أولاً" : "Please verify your email first");
          setIsLoading(false);
          return;
        }
      } catch {}

      window.location.href = "/home";
    } catch (err) {
      setError(isRtl ? "حدث خطأ في الاتصال" : "Connection error");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsLoading(true);
    try {
      const result = await signIn("google", { callbackUrl: "/", redirect: false });
      if (result?.error) {
        setError(isRtl ? "فشل الاتصال بخدمة Google. تأكد من إعدادات الحساب." : "Failed to connect to Google. Check account configuration.");
        setIsLoading(false);
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch (e) {
      setError(isRtl ? "حدث خطأ أثناء الاتصال بخدمة Google" : "An error occurred while connecting to Google");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      {/* Navigation */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Prime Physio" fetchPriority="high" className="w-8 h-8 object-contain" />
              <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
            </div>
            {!isOnboarding && (
              <div className="flex items-center gap-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? "bg-[#4F46BA] text-white shadow-md"
                        : "text-slate-500 hover:text-[#4F46BA] hover:bg-[#4F46BA]/5"
                    }`}
                  >
                    {isRtl ? tab.labelAr : tab.labelEn}
                  </button>
                ))}
              </div>
            )}
            <div className="absolute left-4 sm:left-8 top-4">
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-500 hover:text-[#4F46BA] hover:border-[#4F46BA]/30 transition-all duration-200"
              >
                {isRtl ? "English" : "العربية"}
              </button>
            </div>
          </div>
        </div>
      </nav>
      {isOnboarding ? (
        <main className="flex-1 px-4 py-8 sm:py-12">
          <OnboardingFlow step={onboardStep} setStep={setOnboardStep} clinicId={user?.clinicId} isRtl={isRtl} />
        </main>
      ) : (
        <></>
      )}
      {!isOnboarding && (
      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className={activeTab === "centers" ? "max-w-6xl mx-auto space-y-8" : "hidden"}>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
                <span className="text-[11px] font-medium text-[#4F46BA]">
                  {isRtl ? "ابحث عن مركز" : "Search Center"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                {isRtl ? "Prime Physio" : "Prime Physio"}
                <span className="text-[#4F46BA]"> — {isRtl ? "نظام إدارة عيادات العلاج الطبيعي" : "Physical Therapy Management"}</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                {isRtl
                  ? "منصة متكاملة لإدارة عيادات العلاج الطبيعي - المرضى، الجلسات، التقارير، والفواتير"
                  : "Complete platform for managing physical therapy clinics — patients, sessions, reports, and billing."}
              </p>
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 max-w-xl mx-auto shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="" fetchPriority="high" className="w-8 h-8 object-contain" />
                <span className="text-sm font-semibold text-[#4F46BA]">Prime Physio</span>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isRtl ? "ابحث عن مركز..." : "Search for a center..."}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 transition-all"
              />
              {allBranchesLoading ? (
                <div className="flex justify-center py-4"><Loader size={20} color="#4F46BA" /></div>
              ) : (
                <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
                  {allBranches
                    .filter((b: any) =>
                      b.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      b.slug?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((branch: any) => (
                      <a
                        key={branch.id}
                        href={`/${branch.slug}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-slate-50 hover:border-slate-200 hover:shadow-sm transition-all"
                      >
                        {branch.logo_url ? (
                          <img src={branch.logo_url} alt="" className="w-8 h-8 object-contain rounded-lg" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-[#4F46BA]/10 flex items-center justify-center">
                            <Building className="w-4 h-4 text-[#4F46BA]" />
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-700">{branch.short_name}</p>
                          <p className="text-[10px] text-slate-400">{branch.slug}</p>
                        </div>
                      </a>
                    ))}
                  {allBranches.filter((b: any) =>
                    b.short_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    b.slug?.toLowerCase().includes(searchQuery.toLowerCase())
                  ).length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-4">
                      {isRtl ? "لا توجد نتائج" : "No results found"}
                    </p>
                  )}
                </div>
              )}
              <p className="mt-4 text-xs text-slate-400 text-center">
                {isRtl ? "Prime Physio — نظام إدارة عيادات العلاج الطبيعي" : "Prime Physio — Physical Therapy Clinics Management"}
              </p>
              <div className="flex flex-wrap justify-center gap-6 mt-4 pt-4 border-t border-slate-50 text-center">
                <div>
                  <div className="text-lg font-bold text-[#4F46BA]">{allBranches.length}+</div>
                  <div className="text-[10px] text-slate-400">{isRtl ? "مركز" : "Centers"}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#4F46BA]">{allBranches.length * 10}+</div>
                  <div className="text-[10px] text-slate-400">{isRtl ? "مستخدم" : "Users"}</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-[#4F46BA]">—</div>
                  <div className="text-[10px] text-slate-400">{isRtl ? "جلسة" : "Sessions"}</div>
                </div>
              </div>
            </div>
        </div>

        <div className={activeTab === "manage" ? "max-w-6xl mx-auto" : "hidden"}>
          {!user ? (
            <div className="flex flex-col lg:flex-row items-start gap-10 lg:gap-16 justify-center">
              <div className="flex-1 max-w-md space-y-4 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
                  <span className="text-[11px] font-medium text-[#4F46BA]">
                    {isRtl ? "إدارة العيادة" : "Clinic Management"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
                  {isRtl ? "سجل الدخول لإدارة عيادتك" : "Sign in to Manage Your Clinic"}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isRtl
                    ? "قم بتسجيل الدخول للوصول إلى لوحة التحكم وإدارة المرضى والجلسات والتقارير."
                    : "Sign in to access the dashboard and manage patients, sessions, and reports."}
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {[
                    { icon: "👥", labelAr: "إدارة المرضى", labelEn: "Patients" },
                    { icon: "📅", labelAr: "الجلسات", labelEn: "Sessions" },
                    { icon: "📊", labelAr: "التقارير", labelEn: "Reports" },
                    { icon: "💰", labelAr: "الفواتير", labelEn: "Billing" },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm">{f.icon}</span>
                      <span className="text-[11px] font-medium text-slate-500">{isRtl ? f.labelAr : f.labelEn}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full max-w-[380px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-1">
                    {[
                      { num: "1", labelAr: "الحساب", labelEn: "Account" },
                      { num: "2", labelAr: "المركز", labelEn: "Center" },
                      { num: "3", labelAr: "الباقة", labelEn: "Plan" },
                      { num: "4", labelAr: "الدخول", labelEn: "Login" },
                    ].map((s, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <span className="text-[10px] text-slate-300 mx-0.5">—</span>}
                        <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                          {s.num}. {isRtl ? s.labelAr : s.labelEn}
                        </span>
                      </React.Fragment>
                    ))}
                  </div>
                  <Link
                    href="/signup"
                    className="text-[10px] font-medium text-[#4F46BA] hover:text-[#4338ca] whitespace-nowrap"
                  >
                    {isRtl ? "حساب جديد؟" : "New?"}
                  </Link>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">
                      {isRtl ? "تسجيل الدخول" : "Sign In"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {isRtl ? "أدخل بياناتك للمتابعة" : "Enter your details to continue"}
                    </p>
                  </div>

                  {isDeleted && (
                    <div className="bg-emerald-50 border border-emerald-300 text-emerald-700 text-sm font-bold rounded-lg p-4 mb-4 text-center animate-in fade-in slide-in-from-top-2 duration-500">
                      {isRtl ? "✅ تم حذف الحساب بنجاح" : "✅ Account deleted successfully"}
                    </div>
                  )}
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">
                        {isRtl ? "البريد الإلكتروني" : "Email"}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type="email"
                          placeholder="example@email.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-10 text-slate-700"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">
                        {isRtl ? "كلمة المرور" : "Password"}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-10 pr-10 text-slate-700"
                        />
                        <div
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                        >
                          {showPassword ? (
                            <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                          ) : (
                            <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <GradientCheckbox
                          id="remember-me"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
                          size={18}
                        />
                        <label htmlFor="remember-me" className="text-xs text-slate-400 cursor-pointer select-none">
                          {isRtl ? "تذكرني" : "Remember me"}
                        </label>
                      </div>
                      <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","",""]); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotShowCode(""); setForgotError(""); }} className="group text-xs text-[#4F46BA] transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#4338ca] after:transition-all after:duration-300 hover:after:w-full">
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                    >
                  {isLoading ? (
                    <Loader size={16} color="white" />
                  ) : (
                    <span className="flex items-center justify-center gap-1">
                      {isRtl ? "تسجيل الدخول" : "Sign In"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                    </button>

                    <div className="relative flex items-center py-1">
                      <div className="flex-grow border-t border-slate-100" />
                      <span className="mx-3 text-xs text-slate-300">{isRtl ? "أو" : "or"}</span>
                      <div className="flex-grow border-t border-slate-100" />
                    </div>

                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                        <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                        <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                        <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                      </svg>
                      {isRtl ? "الدخول عبر Google" : "Sign in with Google"}
                    </button>

                    <p className="text-center text-xs text-slate-400">
                      {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
                      <Link href="/signup" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                        {isRtl ? "إنشاء حساب" : "Sign up"}
                      </Link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => setAuthTab("account")}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    authTab === "account"
                      ? "bg-[#4F46BA] text-white shadow-md"
                      : "text-slate-500 hover:text-[#4F46BA]"
                  }`}
                >
                  {isRtl ? "الحساب" : "Account"}
                </button>
                <button
                  onClick={() => setAuthTab("centers")}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    authTab === "centers"
                      ? "bg-[#4F46BA] text-white shadow-md"
                      : "text-slate-500 hover:text-[#4F46BA]"
                  }`}
                >
                  {isRtl ? "المراكز" : "Centers"}
                </button>
              </div>

              {authTab === "account" && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 space-y-6">
                  {userDataLoading ? (
                    <div className="flex justify-center py-8"><Loader size={24} color="#4F46BA" /></div>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-3">
                          {isRtl ? "بيانات الحساب" : "Account Details"}
                        </h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-400">{isRtl ? "البريد الإلكتروني" : "Email"}</span>
                            <span className="text-xs font-medium text-slate-700">{userData?.user?.email || user?.email}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-50">
                            <span className="text-xs text-slate-400">{isRtl ? "الاسم" : "Name"}</span>
                            <span className="text-xs font-medium text-slate-700">{userData?.user?.name || user?.name}</span>
                          </div>
                        </div>
                      </div>

                      {userData?.subscription && (
                        <div>
                          <h3 className="text-sm font-bold text-slate-800 mb-3">
                            {isRtl ? "بيانات الباقة" : "Subscription"}
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-400">{isRtl ? "الباقة" : "Plan"}</span>
                              <span className="text-xs font-medium text-slate-700">
                                {userData.subscription.plan_name === "basic" ? (isRtl ? "الأساسية" : "Basic")
                                  : userData.subscription.plan_name === "silver" ? (isRtl ? "الفضية" : "Silver")
                                  : (isRtl ? "الذهبية" : "Gold")}
                              </span>
                            </div>
                            <div className="flex items-center justify-between py-2 border-b border-slate-50">
                              <span className="text-xs text-slate-400">{isRtl ? "الحالة" : "Status"}</span>
                              <span className={`text-xs font-medium ${userData.subscription.status === "active" ? "text-emerald-600" : "text-red-600"}`}>
                                {userData.subscription.status === "active"
                                  ? (isRtl ? "نشط" : "Active")
                                  : userData.subscription.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!userData?.subscription && (
                        <div className="text-center py-4">
                          <p className="text-xs text-slate-400">
                            {isRtl ? "ليس لديك اشتراك نشط. اختر باقة للبدء." : "No active subscription. Choose a plan to start."}
                          </p>
                          <button onClick={() => window.location.href = "/setup"} className="mt-3 inline-block px-5 py-2 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-medium rounded-xl text-xs border-0 cursor-pointer">
                            {isRtl ? "اختيار باقة" : "Choose Plan"}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {authTab === "centers" && (
                <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">
                    {isRtl ? "مراكزي" : "My Centers"}
                  </h3>
                  {userDataLoading ? (
                    <div className="flex justify-center py-8"><Loader size={24} color="#4F46BA" /></div>
                  ) : userData?.branches?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {userData.branches.map((branch: any) => (
                        <a
                          key={branch.id}
                          href={`/${branch.slug}`}
                          className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-[#4F46BA]/30 hover:shadow-md transition-all"
                        >
                          {branch.logo_url ? (
                            <img src={branch.logo_url} alt="" className="w-10 h-10 object-contain rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[#4F46BA]/10 flex items-center justify-center">
                              <Building className="w-5 h-5 text-[#4F46BA]" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-bold text-slate-700">{branch.short_name}</p>
                            <p className="text-[10px] text-slate-400">{branch.full_name}</p>
                            <p className="text-[10px] text-[#4F46BA] mt-0.5">{`primephysio.vercel.app/${branch.slug}`}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 text-center py-4">
                      {isRtl ? "ليس لديك مراكز بعد. أنشئ مركزك الأول من " : "No centers yet. Create your first center from "}
                       <button onClick={() => { window.location.href = "/setup"; }} className="text-[#4F46BA] font-medium underline bg-transparent border-0 p-0 cursor-pointer">{isRtl ? "الإعداد" : "Setup"}</button>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={activeTab === "plans" ? "max-w-4xl mx-auto text-center space-y-6" : "hidden"}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
              <span className="text-[11px] font-medium text-[#4F46BA]">
                {isRtl ? "الباقات" : "Plans"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isRtl ? "اختر الباقة المناسبة لعيادتك" : "Choose the Right Plan for Your Clinic"}
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto">
              {isRtl
                ? "الباقة الأساسية مثالية للعيادات الصغيرة. الباقة الفضية للنمو. والباقة الذهبية لكل الإمكانيات."
                : "Basic is ideal for small clinics. Silver for growth. Gold unlocks everything."}
            </p>
            <div className="pb-2 pt-4">
              <PricingSwitch onSwitch={(v) => setBillingPeriod(v === "0" ? "monthly" : "yearly")} isRtl={isRtl} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-6 py-6 mx-auto relative z-10">
              {(() => {
                const PLANS = getPlans(isRtl).map(p => ({ ...p, yearlyPrice: Math.round(p.price * 12 * 0.8) }));
                return PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={`w-72 relative text-center border p-6 rounded-lg ${
                      plan.popular
                        ? "bg-indigo-500 text-white border-gray-500/30"
                        : "bg-white text-gray-800/80 border-gray-200"
                    }`}
                  >
                    {plan.popular && (
                      <p className="absolute px-3 text-sm -top-3.5 left-3.5 py-1 bg-[#8789FB] rounded-full text-white">
                        {isRtl ? "الأكثر طلباً" : "Most Popular"}
                      </p>
                    )}
                    <p className={`font-semibold ${plan.popular ? "pt-2" : ""}`}>{plan.name}</p>
                    {billingPeriod === "yearly" ? (
                      <div>
                        <h1 className="text-3xl font-semibold">
                          {plan.yearlyPrice.toLocaleString()}
                          <span className={`text-sm font-normal ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                            /{isRtl ? "سنة" : "year"}
                          </span>
                        </h1>
                        <p className={`text-xs font-medium mt-1 ${plan.popular ? "text-white/70" : "text-green-600"}`}>
                          {isRtl
                            ? `يعني ${Math.round(plan.yearlyPrice / 12).toLocaleString()} ج.م/شهر`
                            : `${Math.round(plan.yearlyPrice / 12).toLocaleString()} EGP/month`}
                        </p>
                      </div>
                    ) : (
                      <h1 className="text-3xl font-semibold">
                        {plan.price.toLocaleString()}
                        <span className={`text-sm font-normal ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                          /{isRtl ? "شهر" : "month"}
                        </span>
                      </h1>
                    )}
                    <ul className="list-none text-sm mt-6 space-y-1">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                            <path d="M7.162 13.5 2.887 9.225l1.07-1.069 3.205 3.207 6.882-6.882 1.069 1.07z" fill={plan.popular ? "currentColor" : "#6366F1"}/>
                          </svg>
                          <p className={`text-sm ${plan.popular ? "text-white" : "text-gray-500"}`}>{feature.text}</p>
                        </li>
                      ))}
                    </ul>
                    <Link href="/signup">
                      <button
                        type="button"
                        className={`text-sm w-full py-2 rounded font-medium mt-7 transition-all ${
                          plan.popular
                            ? "bg-white text-[#4F46BA] hover:bg-gray-200"
                            : "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]"
                        }`}
                      >
                        {isRtl ? "ابدأ الآن" : "Get Started"}
                      </button>
                    </Link>
                  </div>
                ));
              })()}
            </div>
        </div>

        <div className={activeTab === "about" ? "max-w-3xl mx-auto text-center space-y-6" : "hidden"}>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
              <span className="text-[11px] font-medium text-[#4F46BA]">
                {isRtl ? "من نحن" : "About Us"}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              {isRtl ? "Prime Physio — نظام إدارة العيادات الذكي" : "Prime Physio — Smart Clinic Management"}
            </h2>
            <p className="text-slate-400 text-sm max-w-2xl mx-auto leading-relaxed">
              {isRtl
                ? "برايم فيزيو هو نظام متكامل لإدارة عيادات العلاج الطبيعي، مصمم خصيصاً لتلبية احتياجات العيادات العربية. نوفر أدوات إدارة المرضى، والجلسات، والتقارير، والفواتير، والتقييمات العلاجية — كل ذلك في منصة واحدة سهلة الاستخدام."
                : "Prime Physio is a complete management system for physical therapy clinics, designed for Arabic-speaking clinics. We provide tools for patients, sessions, reports, billing, and therapeutic assessments — all in one easy-to-use platform."}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {[
                { icon: "👥", titleAr: "إدارة المرضى", titleEn: "Patient Management", descAr: "سجل كامل للمرضى مع تاريخ طبي وجلسات", descEn: "Complete patient records with medical history" },
                { icon: "📊", titleAr: "تقارير وتحليلات", titleEn: "Reports & Analytics", descAr: "إحصائيات دقيقة عن أداء العيادة", descEn: "Accurate clinic performance statistics" },
                { icon: "🔒", titleAr: "آمن وموثوق", titleEn: "Secure & Reliable", descAr: "بيانات مشفرة وحماية متقدمة للخصوصية", descEn: "Encrypted data with advanced privacy" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-5 text-center shadow-sm">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <div className="text-sm font-semibold text-slate-700">{isRtl ? item.titleAr : item.titleEn}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{isRtl ? item.descAr : item.descEn}</div>
                </div>
              ))}
            </div>
        </div>

        <div className={activeTab === "support" ? "max-w-3xl mx-auto space-y-6" : "hidden"}>
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#4F46BA]/10 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4F46BA]" />
                <span className="text-[11px] font-medium text-[#4F46BA]">
                  {isRtl ? "الدعم الفني" : "Technical Support"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">
                {isRtl ? "نحن هنا لمساعدتك" : "We're Here to Help"}
              </h2>
              <p className="text-slate-400 text-sm max-w-xl mx-auto">
                {isRtl
                  ? "تواصل مع فريق الدعم الفني عبر القنوات التالية"
                  : "Contact our support team through the following channels"}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
              {[
                { icon: "📧", labelAr: "البريد الإلكتروني", labelEn: "Email", value: "support@prime-physio.com" },
                { icon: "📱", labelAr: "واتساب", labelEn: "WhatsApp", value: "+201234567890" },
                { icon: "💬", labelAr: "تيليجرام", labelEn: "Telegram", value: "@prime_physio" },
                { icon: "▶️", labelAr: "يوتيوب", labelEn: "YouTube", value: "Prime Physio" },
              ].map((item, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3 shadow-sm">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="text-[11px] text-slate-400">{isRtl ? item.labelAr : item.labelEn}</div>
                    <div className="text-sm font-medium text-slate-700">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-slate-100 rounded-xl p-5 max-w-xl mx-auto shadow-sm text-center">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">
                {isRtl ? "الأسئلة الشائعة" : "FAQ"}
              </h3>
              <div className="space-y-2 text-right">
                {[
                  { qAr: "كيف يمكنني إنشاء حساب جديد؟", qEn: "How do I create a new account?", aAr: "يمكنك إنشاء حساب جديد من خلال صفحة التسجيل باستخدام البريد الإلكتروني أو حساب Google.", aEn: "You can create a new account from the signup page using email or Google." },
                  { qAr: "هل يمكنني تجربة النظام قبل الاشتراك؟", qEn: "Can I try the system before subscribing?", aAr: "نعم، الباقة الأساسية مجانية وتتيح لك تجربة جميع الميزات الأساسية.", aEn: "Yes, the Basic plan is free and lets you try all core features." },
                  { qAr: "كيف يمكنني ترقية باقتي؟", qEn: "How do I upgrade my plan?", aAr: "يمكنك الترقية من صفحة الباقات داخل لوحة التحكم بعد تسجيل الدخول.", aEn: "You can upgrade from the plans page in your dashboard after logging in." },
                ].map((faq, i) => (
                  <details key={i} className="group border border-slate-100 rounded-lg p-3">
                    <summary className="text-xs font-medium text-slate-600 cursor-pointer list-none flex items-center justify-between">
                      <span>{isRtl ? faq.qAr : faq.qEn}</span>
                      <span className="text-slate-300 group-open:rotate-180 transition-transform duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                      </span>
                    </summary>
                    <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{isRtl ? faq.aAr : faq.aEn}</p>
                  </details>
                ))}
              </div>
            </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setShowForgotModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-slate-100" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-800">
                  {isRtl ? "إعادة تعيين كلمة المرور" : "Reset Password"}
                </h3>
                <button onClick={() => setShowForgotModal(false)} className="text-slate-300 hover:text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {forgotError && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center">
                  {forgotError}
                </div>
              )}

              {forgotStep === "email" ? (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400">
                    {isRtl
                      ? "أدخل بريدك الإلكتروني المسجل به الحساب وسنرسل لك رمز تحقق"
                      : "Enter your registered email and we'll send you a verification code"}
                  </p>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="email"
                      placeholder="example@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 text-slate-700"
                    />
                  </div>
                  <button
                    onClick={handleForgotSendOtp}
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <Loader size={16} color="white" />
                    ) : (
                      isRtl ? "إرسال رمز التحقق" : "Send Code"
                    )}
                  </button>
                </div>
              ) : forgotStep === "otp" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {forgotShowCode
                        ? (isRtl
                            ? `رمز التحقق: ${forgotShowCode}`
                            : `Verification code: ${forgotShowCode}`)
                        : (isRtl ? "تم إرسال رمز التحقق إلى بريدك الإلكتروني" : "Code sent to your email")}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-3" dir="ltr">
                    {forgotOtp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={forgotOtpRefs[idx]}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleForgotOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleForgotOtpKeyDown(idx, e)}
                        className="w-12 h-14 text-center text-lg font-bold text-slate-800 border border-slate-200 rounded-lg focus:border-[#4F46BA] focus:ring-[3px] focus:ring-[#4F46BA]/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleForgotVerify}
                    disabled={forgotOtp.join("").length !== 4 || forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <Loader size={16} color="white" />
                    ) : (
                      isRtl ? "تأكيد" : "Verify"
                    )}
                  </button>
                  <button
                    onClick={() => { setForgotStep("email"); setForgotError(""); }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {isRtl ? "العودة" : "Back"}
                  </button>
                </div>
              ) : forgotStep === "reset" ? (
                <form onSubmit={handleForgotResetPassword} className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                    <Shield className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-medium">
                      {isRtl ? "تم التحقق. أدخل كلمة المرور الجديدة" : "Verified. Enter your new password"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">
                      {isRtl ? "كلمة المرور الجديدة" : "New Password"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        type={forgotShowPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        className="w-full pl-10 pr-10 text-slate-700"
                      />
                      <div
                        onClick={() => setForgotShowPassword(!forgotShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {forgotShowPassword ? (
                          <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        ) : (
                          <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">
                      {isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        type={forgotShowConfirm ? "text" : "password"}
                        placeholder="••••••••"
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        className="w-full pl-10 pr-10 text-slate-700"
                      />
                      <div
                        onClick={() => setForgotShowConfirm(!forgotShowConfirm)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
                      >
                        {forgotShowConfirm ? (
                          <Eye className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        ) : (
                          <EyeClosed className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                  >
                    {forgotLoading ? (
                      <Loader size={16} color="white" />
                    ) : (
                      <span className="flex items-center justify-center gap-1">
                        {isRtl ? "تغيير كلمة المرور" : "Change Password"}
                        <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                      </span>
                    )}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 rounded-lg p-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    <span className="text-sm font-medium">
                      {isRtl ? "تم إعادة تعيين كلمة المرور بنجاح" : "Password reset successfully"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isRtl
                      ? "يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة"
                      : "You can now sign in with your new password"}
                  </p>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white font-medium h-9 rounded-lg transition-all duration-200 text-sm"
                  >
                    {isRtl ? "تسجيل الدخول" : "Sign In"}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-slate-400">
                {isRtl ? "نظام إدارة عيادات العلاج الطبيعي" : "Physical Therapy Clinic Management System"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400">{isRtl ? "تابعنا:" : "Follow us:"}</span>
              <a href="https://www.youtube.com/@ptset" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-[#4F46BA] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
              <a href="https://whatsapp.com/channel/0029VagreCH1XquXLMBa2K2s" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-[#4F46BA] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://t.me/ptset" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-[#4F46BA] transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
              </a>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <Link href="/terms" className="hover:text-[#4F46BA] transition-colors">
                {isRtl ? "شروط الاستخدام" : "Terms of Use"}
              </Link>
              <span>-</span>
              <Link href="/privacy" className="hover:text-[#4F46BA] transition-colors">
                {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}