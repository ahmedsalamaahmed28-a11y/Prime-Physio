"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/LanguageContext";
import { setAppValue } from "@/lib/appStorage";
import { Input } from "@/components/ui/input";
import { Mail, Lock, Eye, EyeClosed, ArrowRight, ShieldAlert, CheckCircle2, X, Activity, Users, Calendar, TrendingUp, Quote, Zap, Shield, Crown, Check, CreditCard, Loader2, AlertCircle, Clock } from "lucide-react";
import { CustomCheckbox } from "@/components/ui/checkbox";

const ALL_FEATURES = (isRtl: boolean) => [
  { label: isRtl ? "╪º┘ä┘à╪▒╪╢┘ë (╪│╪¼┘ä╪º╪¬ ╪╖╪¿┘è╪⌐)" : "Patients (EHR)", limits: { basic: isRtl ? "50" : "50", silver: isRtl ? "200" : "200", gold: isRtl ? "Γê₧" : "Γê₧" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä╪┤┘ç╪▒┘è╪⌐" : "Monthly Sessions", limits: { basic: isRtl ? "100" : "100", silver: isRtl ? "500" : "500", gold: isRtl ? "Γê₧" : "Γê₧" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "╪¡╪│╪º╪¿╪º╪¬ ╪º┘ä╪ú╪«╪╡╪º╪ª┘è┘è┘å" : "Therapist Accounts", limits: { basic: isRtl ? "20" : "20", silver: isRtl ? "50" : "50", gold: isRtl ? "Γê₧" : "Γê₧" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪º╪╣┘è╪»" : "Appointment Management", limits: { basic: null, silver: null, gold: null }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ┘ê╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬" : "Reports & Analytics", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: true, gold: true } },
  { label: isRtl ? "╪º┘ä╪¬╪║╪░┘è╪⌐ ╪º┘ä╪╣┘ä╪º╪¼┘è╪⌐" : "Clinical Nutrition", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: true, gold: true } },
  { label: isRtl ? "╪º┘ä┘à┘â╪¬╪¿╪⌐ ╪º┘ä╪╣┘ä╪º╪¼┘è╪⌐" : "Rehab Library", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: false, gold: true } },
  { label: isRtl ? "╪▒╪│╪º╪ª┘ä ╪º┘ä╪¬╪░┘â┘è╪▒ (SMS/WA)" : "Reminders (SMS/WA)", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: false, gold: true } },
  { label: isRtl ? "╪º┘ä╪»╪╣┘à ╪º┘ä┘ü┘å┘è" : "Support", limits: { basic: isRtl ? "╪¿╪▒┘è╪» ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Email", silver: isRtl ? "┘ç╪º╪¬┘ü┘è ╪│╪▒┘è╪╣" : "Phone", gold: isRtl ? "VIP 24/7" : "VIP 24/7" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "┘ü╪▒┘ê╪╣ ╪º┘ä╪╣┘è╪º╪»╪⌐" : "Clinic Branches", limits: { basic: isRtl ? "1" : "1", silver: isRtl ? "1" : "1", gold: isRtl ? "2" : "2" }, included: { basic: true, silver: true, gold: true } },
];

const getPlans = (isRtl: boolean) => {
  const allFeatures = ALL_FEATURES(isRtl);
  return [
    {
      id: "basic", name: isRtl ? "╪º┘ä╪ú╪│╪º╪│┘è╪⌐" : "Basic", nameEn: "STARTER", price: 500,
      subtitle: isRtl ? "┘ä┘ä╪╣┘è╪º╪»╪º╪¬ ╪º┘ä╪╡╪║┘è╪▒╪⌐ ┘ê╪º┘ä┘å╪º╪┤╪ª╪⌐" : "For small & startup clinics",
      icon: Zap, gradient: "from-slate-400 to-slate-500",
      features: allFeatures.map((f) => ({ ...f, included: f.included.basic, limit: f.limits.basic })),
    },
    {
      id: "silver", name: isRtl ? "╪º┘ä┘ü╪╢┘è╪⌐" : "Silver", nameEn: "PROFESSIONAL", price: 1000,
      subtitle: isRtl ? "┘ä┘ä╪╣┘è╪º╪»╪º╪¬ ╪º┘ä┘à╪¬┘ê╪│╪╖╪⌐ ┘ê╪º┘ä┘å╪┤╪╖╪⌐" : "For growing active clinics",
      icon: Shield, gradient: "from-cyan-500 to-blue-600",
      features: allFeatures.map((f) => ({ ...f, included: f.included.silver, limit: f.limits.silver })),
    },
    {
      id: "gold", name: isRtl ? "╪º┘ä╪░┘ç╪¿┘è╪⌐" : "Gold", nameEn: "ENTERPRISE", price: 1500,
      subtitle: isRtl ? "┘ä┘ä┘à╪▒╪º┘â╪▓ ╪º┘ä╪╖╪¿┘è╪⌐ ╪º┘ä┘â╪¿╪▒┘ë ┘ê╪º┘ä╪│┘ä╪º╪│┘ä" : "For large clinics & chains",
      icon: Crown, gradient: "from-[#FF8C00] via-[#FFC300] to-[#FFF082]",
      features: allFeatures.map((f) => ({ ...f, included: f.included.gold, limit: f.limits.gold })),
    },
  ];
};

const getCompareRows = (isRtl: boolean) => [
  { label: isRtl ? "╪º┘ä┘à╪▒╪╢┘ë (╪│╪¼┘ä╪º╪¬ ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è╪⌐)" : "Patients (EHR)", values: [isRtl ? "50 ┘à╪▒┘è╪╢" : "50 Patients", isRtl ? "200 ┘à╪▒┘è╪╢" : "200 Patients", isRtl ? "Γê₧ ╪║┘è╪▒ ┘à╪¡╪»┘ê╪»╪⌐" : "Γê₧ Unlimited"] },
  { label: isRtl ? "╪º┘ä╪¼┘ä╪│╪º╪¬ ╪º┘ä╪┤┘ç╪▒┘è╪⌐" : "Monthly Sessions", values: [isRtl ? "100" : "100", isRtl ? "500" : "500", isRtl ? "Γê₧ ╪║┘è╪▒ ┘à╪¡╪»┘ê╪»╪⌐" : "Γê₧ Unlimited"] },
  { label: isRtl ? "╪¡╪│╪º╪¿╪º╪¬ ╪º┘ä╪ú╪«╪╡╪º╪ª┘è┘è┘å" : "Therapist Accounts", values: [isRtl ? "20 ╪¡╪│╪º╪¿" : "20 Accounts", isRtl ? "50 ╪¡╪│╪º╪¿" : "50 Accounts", isRtl ? "Γê₧ ╪║┘è╪▒ ┘à╪¡╪»┘ê╪»╪⌐" : "Γê₧ Unlimited"] },
  { label: isRtl ? "╪º┘ä┘ü╪▒┘ê╪╣ ┘ê╪º┘ä┘à╪▒╪º┘â╪▓" : "Branches & Centers", values: [isRtl ? "1 ┘ü╪▒╪╣" : "1 Branch", isRtl ? "1 ┘ü╪▒╪╣" : "1 Branch", isRtl ? "2 ┘ü╪▒╪╣ (┘à╪▒╪¿┘ê╪╖╪⌐)" : "2 Branches (Linked)"] },
  { label: isRtl ? "╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à┘ê╪º╪╣┘è╪»" : "Appointments Mgmt", values: [true, true, true] },
  { label: isRtl ? "╪º┘ä╪¬╪║╪░┘è╪⌐ ╪º┘ä╪╣┘ä╪º╪¼┘è╪⌐" : "Clinical Nutrition", values: [false, true, true] },
  { label: isRtl ? "╪º┘ä┘à┘â╪¬╪¿╪⌐ ╪º┘ä╪╣┘ä╪º╪¼┘è╪⌐" : "Rehab Library", values: [false, false, true] },
  { label: isRtl ? "╪º┘ä╪¬┘é╪º╪▒┘è╪▒ ┘ê╪º┘ä╪¬╪¡┘ä┘è┘ä╪º╪¬" : "Reports & Analytics", values: [false, true, true] },
  { label: isRtl ? "╪▒╪│╪º╪ª┘ä ╪º┘ä╪¬╪░┘â┘è╪▒ SMS" : "SMS Reminders", values: [false, false, true] },
  { label: isRtl ? "┘à╪│╪¬┘ê┘ë ╪º┘ä╪»╪╣┘à ╪º┘ä┘ü┘å┘è" : "Support Level", values: [isRtl ? "Email/╪¬╪░╪º┘â╪▒" : "Email/Tickets", isRtl ? "┘ç╪º╪¬┘ü/╪│╪▒┘è╪╣" : "Phone/Fast", isRtl ? "VIP 24/7" : "VIP 24/7"] },
];

export default function LoginPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset" | "success">("email");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState(["", "", "", ""]);
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [forgotShowCode, setForgotShowCode] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const PLANS = getPlans(isRtl);
  const COMPARE_ROWS = getCompareRows(isRtl);
  const [activeTab, setActiveTab] = useState("login");
  const [showCompare, setShowCompare] = useState(false);
  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [payError, setPayError] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [payEmail, setPayEmail] = useState("");
  const [phone, setPhone] = useState("");

  const otpRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (forgotStep === "otp") {
      otpRefs[0].current?.focus();
    }
  }, [forgotStep]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    const cleanEmail = email.trim().toLowerCase();
    const result = await signIn("credentials", {
      email: cleanEmail,
      password: password.trim(),
      redirect: false,
    });

    if (result?.error) {
      setError(result.error === "CredentialsSignin"
        ? (isRtl ? "╪¿┘è╪º┘å╪º╪¬ ╪º┘ä╪»╪«┘ê┘ä ╪║┘è╪▒ ╪╡╪¡┘è╪¡╪⌐" : "Invalid login credentials")
        : result.error);
      setIsSubmitting(false);
      return;
    }

    window.location.href = "/";
  };

  const handleGoogleLogin = async () => {
    setError("");
    setIsSubmitting(true);
    await setAppValue("pending_role", "admin");
    await setAppValue("pending_google_signup", "true");
    signIn("google", { callbackUrl: "/" });
  };

  const handleUpgrade = (planId: string) => {
    setPayingPlan(planId);
    setPayError("");
    setShowBillingModal(true);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingPlan) return;
    setIsLoading(true);
    setPayError("");

    try {
      const res = await fetch("/api/paymob/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: payingPlan,
          billingData: {
            first_name: firstName, last_name: lastName,
            email: payEmail, phone_number: phone,
            apartment: "N/A", floor: "N/A", street: "N/A",
            building: "N/A", shipping_method: "PKG",
            postal_code: "00000", city: "Cairo",
            country: "EG", state: "Cairo",
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.iframeUrl) {
        setPayError(data.error || "╪¡╪»╪½ ╪«╪╖╪ú ╪ú╪½┘å╪º╪í ╪Ñ╪╣╪»╪º╪» ╪º┘ä╪»┘ü╪╣");
        setIsLoading(false);
        return;
      }

      setIframeUrl(data.iframeUrl);
      setShowBillingModal(false);
      setShowIframeModal(true);
    } catch {
      setPayError("╪¬╪╣╪░╪▒ ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪«╪º╪»┘à ╪º┘ä╪»┘ü╪╣. ╪¬╪¡┘é┘é ┘à┘å ╪º┘ä╪º╪¬╪╡╪º┘ä ╪¿╪º┘ä╪Ñ┘å╪¬╪▒┘å╪¬.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSendEmail = async () => {
    setForgotError("");
    if (!forgotEmail.trim()) {
      setForgotError(isRtl ? "┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Please enter your email");
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
      if (!res.ok) throw new Error(data.error || (isRtl ? "┘ü╪┤┘ä ╪Ñ╪▒╪│╪º┘ä ╪º┘ä╪▒┘à╪▓" : "Failed to send code"));
      if (data.devCode) setForgotShowCode(data.devCode);
      setForgotLoading(false);
      setForgotStep("otp");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "╪¡╪»╪½ ╪«╪╖╪ú" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const handleForgotOtpChange = (idx: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const newOtp = [...forgotOtp];
    newOtp[idx] = val;
    setForgotOtp(newOtp);
    if (val && idx < 3) otpRefs[idx + 1].current?.focus();
  };

  const handleForgotOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !forgotOtp[idx] && idx > 0) {
      otpRefs[idx - 1].current?.focus();
    }
  };

  const handleForgotVerifyOtp = async () => {
    const code = forgotOtp.join("");
    if (code.length !== 4) {
      setForgotError(isRtl ? "┘è╪▒╪¼┘ë ╪Ñ╪»╪«╪º┘ä ╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é ┘â╪º┘à┘ä╪º┘ï" : "Please enter the full code");
      return;
    }
    setForgotError("");
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "╪▒┘à╪▓ ╪║┘è╪▒ ╪╡╪¡┘è╪¡" : "Invalid code"));
      setForgotLoading(false);
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "╪¡╪»╪½ ╪«╪╖╪ú" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
    setForgotError("");
    if (forgotNewPassword.length < 6) {
      setForgotError(isRtl ? "┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ┘è╪¼╪¿ ╪ú┘å ╪¬┘â┘ê┘å 6 ╪ú╪¡╪▒┘ü ╪╣┘ä┘ë ╪º┘ä╪ú┘é┘ä" : "Password must be at least 6 characters");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(isRtl ? "┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪║┘è╪▒ ┘à╪¬╪╖╪º╪¿┘é╪⌐" : "Passwords do not match");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code: forgotOtp.join(""), newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "┘ü╪┤┘ä ╪¬╪¡╪»┘è╪½ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Failed to update password"));
      setForgotLoading(false);
      setForgotStep("success");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "╪¡╪»╪½ ╪«╪╖╪ú" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const navTabs = [
    { key: "centers", ar: "╪º┘ä┘à╪▒╪º┘â╪▓", en: "Centers" },
    { key: "management", ar: "╪Ñ╪»╪º╪▒╪⌐", en: "Management" },
    { key: "packages", ar: "╪º┘ä╪¿╪º┘é╪º╪¬", en: "Packages" },
    { key: "about", ar: "┘à┘å ┘å╪¡┘å", en: "About" },
    { key: "support", ar: "╪º┘ä╪»╪╣┘à", en: "Support" },
  ];

  const features = [
    { icon: Activity, ar: "╪│╪¼┘ä╪º╪¬ ╪╖╪¿┘è╪⌐ ╪░┘â┘è╪⌐", en: "Smart Medical Records", descAr: "╪Ñ╪»╪º╪▒╪⌐ ┘à╪¬┘â╪º┘à┘ä╪⌐ ┘ä┘à┘ä┘ü╪º╪¬ ╪º┘ä┘à╪▒╪╢┘ë ┘à╪╣ ╪¬┘ê╪½┘è┘é ╪ó┘ä┘è", descEn: "Complete patient file management with auto-documentation" },
    { icon: Calendar, ar: "╪¼╪»┘ê┘ä╪⌐ ┘à┘ê╪º╪╣┘è╪» ╪░┘â┘è╪⌐", en: "Smart Scheduling", descAr: "┘å╪╕╪º┘à ╪¡╪¼╪▓ ┘à╪¬╪╖┘ê╪▒ ┘à╪╣ ╪¬╪░┘â┘è╪▒╪º╪¬ ╪¬┘ä┘é╪º╪ª┘è╪⌐", descEn: "Advanced booking system with auto reminders" },
    { icon: Users, ar: "┘ü╪▒┘è┘é ╪╣┘à┘ä ┘à╪¬┘â╪º┘à┘ä", en: "Team Management", descAr: "╪Ñ╪»╪º╪▒╪⌐ ╪╡┘ä╪º╪¡┘è╪º╪¬ ╪º┘ä╪ú╪╖╪¿╪º╪í ┘ê╪º┘ä┘à┘ê╪╕┘ü┘è┘å ╪¿╪│┘ç┘ê┘ä╪⌐", descEn: "Easy doctor and staff permission management" },
    { icon: TrendingUp, ar: "╪¬┘é╪º╪▒┘è╪▒ ┘ê╪¬╪¡┘ä┘è┘ä╪º╪¬", en: "Reports & Analytics", descAr: "╪Ñ╪¡╪╡╪º╪ª┘è╪º╪¬ ╪»┘é┘è┘é╪⌐ ┘ä╪ú╪»╪º╪í ╪º┘ä╪╣┘è╪º╪»╪⌐ ┘ê╪º┘ä╪Ñ┘è╪▒╪º╪»╪º╪¬", descEn: "Accurate clinic performance and revenue stats" },
  ];

  const testimonials = [
    { textAr: "┘à┘å ╪ú┘ü╪╢┘ä ╪ú┘å╪╕┘à╪⌐ ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä╪╣┘è╪º╪»╪º╪¬ ╪º┘ä┘ä┘è ╪º╪│╪¬╪«╪»┘à╪¬┘ç╪º. ┘ê┘ü╪▒ ╪╣┘ä┘è┘å╪º ┘ê┘é╪¬ ┘ê┘à╪¼┘ç┘ê╪» ┘â╪¿┘è╪▒.", textEn: "One of the best clinic management systems I've used. Saved us so much time and effort.", nameAr: "╪». ╪ú╪¡┘à╪» ╪│╪º┘ä┘à", nameEn: "Dr. Ahmed Salem", roleAr: "╪º╪│╪¬╪┤╪º╪▒┘è ╪╣┘ä╪º╪¼ ╪╖╪¿┘è╪╣┘è", roleEn: "PT Consultant" },
    { textAr: "╪¿╪╣╪» ╪º╪│╪¬╪«╪»╪º┘à Prime Physio╪î ╪▓╪º╪»╪¬ ╪Ñ┘å╪¬╪º╪¼┘è╪⌐ ╪º┘ä╪╣┘è╪º╪»╪⌐ ╪¿╪┤┘â┘ä ┘à┘ä╪¡┘ê╪╕.", textEn: "After using Prime Physio, our clinic productivity increased significantly.", nameAr: "╪». ┘à╪¡┘à╪» ╪╣┘ä┘è", nameEn: "Dr. Mohamed Ali", roleAr: "╪ú╪«╪╡╪º╪ª┘è ╪╣┘ä╪º╪¼ ╪╖╪¿┘è╪╣┘è", roleEn: "PT Specialist" },
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRtl ? "rtl" : "ltr"}>
      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
              <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {navTabs.map((tab) => (
                <span key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-all ${activeTab === tab.key ? "text-[#4F46BA] bg-indigo-50" : "text-slate-500 hover:text-[#4F46BA] hover:bg-slate-50"}`}>
                  {isRtl ? tab.ar : tab.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      </nav>

       {/* Getting Started Guide */}
       {activeTab === "guide" && (
         <div className="bg-gradient-to-b from-indigo-50/50 to-white border-b border-slate-100">
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
             <div className="text-center mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
                 {isRtl ? "≡ƒÜÇ ╪»┘ä┘è┘ä ╪º┘ä╪¿╪»╪í ┘à╪╣ ╪¿╪▒╪º┘è┘à ┘ü┘è╪▓┘è┘ê" : "≡ƒÜÇ Getting Started with Prime Physio"}
               </h2>
               <p className="text-slate-600 max-w-2xl mx-auto">
                 {isRtl
                   ? "╪½┘ä╪º╪½ ╪«╪╖┘ê╪º╪¬ ╪│┘ç┘ä╪⌐ ┘ä╪¿╪»╪í ╪▒╪¡┘ä╪¬┘â ┘à╪╣ ┘å╪╕╪º┘à ╪Ñ╪»╪º╪▒╪⌐ ╪╣┘è╪º╪»╪¬┘â"
                   : "Three simple steps to start managing your clinic"}
               </p>
             </div>

             <div className="grid md:grid-cols-3 gap-8">
               {/* Step 1 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   1∩╕ÅΓâú
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "╪Ñ┘å╪┤╪º╪í ╪º┘ä╪¡╪│╪º╪¿ ╪º┘ä╪┤╪«╪╡┘è" : "Create Your Account"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪º╪»╪«┘ä ╪╣┘ä┘ë ┘é╪º╪ª┘à╪⌐ ╪º┘ä╪Ñ╪»╪º╪▒╪⌐ ┘ê╪º╪«╪¬╪▒ ╪¬╪│╪¼┘è┘ä ╪¡╪│╪º╪¿ ╪¼╪»┘è╪»" : "Go to Management and select Sign Up"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪ú╪»╪«┘ä ╪º╪│┘à┘â ┘ê╪¿╪▒┘è╪» ╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘é┘ê┘è ┘ê┘â┘ä┘à╪⌐ ┘à╪▒┘ê╪▒ ╪ó┘à┘å╪⌐" : "Enter name, email and strong password"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪¬┘ü╪╣┘æ┘ä ╪¡╪│╪º╪¿┘â ╪╣╪¿╪▒ ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Verify email and activate account"}</span>
                   </li>
                 </ul>
               </div>

               {/* Step 2 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   2∩╕ÅΓâú
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "╪º┘ä╪º╪┤╪¬╪▒╪º┘â ┘ê╪Ñ┘å╪┤╪º╪í ╪º┘ä┘à╪▒┘â╪▓" : "Subscribe & Create Clinic"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪º╪«╪¬╪▒ ╪¿╪º┘é╪¬┘â ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ (╪ú╪│╪º╪│┘è╪⌐ / ┘ü╪╢┘è╪⌐ / ╪░┘ç╪¿┘è╪⌐)" : "Choose your subscription plan"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪ú╪»╪«┘ä ╪¿┘è╪º┘å╪º╪¬ ╪º┘ä┘à╪▒┘â╪▓ (╪º┘ä╪º╪│┘à╪î ╪º┘ä╪▒┘à╪▓ ╪º┘ä╪¬╪╣╪▒┘è┘ü┘è╪î ╪º┘ä╪┤╪╣╪º╪▒)" : "Enter clinic details and branding"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪ú┘â┘à┘ä ╪╣┘à┘ä┘è╪⌐ ╪º┘ä╪»┘ü╪╣ ┘ê╪º┘ä╪¬┘ü╪╣┘è┘ä" : "Complete payment and activation"}</span>
                   </li>
                 </ul>
               </div>

               {/* Step 3 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   3∩╕ÅΓâú
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "╪º┘ä╪»╪«┘ê┘ä ╪Ñ┘ä┘ë ╪º┘ä┘à┘å╪╡╪⌐" : "Access Your Platform"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪º╪»╪«┘ä ╪╣╪¿╪▒ ╪º┘ä╪▒╪º╪¿╪╖ ╪º┘ä┘à╪¿╪º╪┤╪▒ ┘ä┘ä┘à╪▒┘â╪▓" : "Use direct clinic link"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪ú┘ê ┘à┘å ╪«┘ä╪º┘ä ┘ä┘ê╪¡╪⌐ ╪¬╪¡┘â┘à ╪Ñ╪»╪º╪▒╪⌐ ╪º┘ä┘à╪▒╪º┘â╪▓" : "Or from management dashboard"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">ΓÇó</span>
                     <span>{isRtl ? "╪º╪¿╪»╪ú ╪º╪│╪¬╪«╪»╪º┘à ┘â┘ä ╪º┘ä┘à┘è╪▓╪º╪¬ ╪º┘ä╪ó┘å! ≡ƒÄë" : "Start using all features! ≡ƒÄë"}</span>
                   </li>
                 </ul>
               </div>
             </div>
           </div>
         </div>
        )}

       {/* Packages Section - Same design as subscription page */}
       {activeTab === "packages" && (
         <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16" dir={isRtl ? "rtl" : "ltr"}>
           <div className="text-center mb-4">
             <h1 className={`text-2xl font-extrabold text-slate-800 flex items-center justify-center gap-2`}>
               <Crown className="w-6 h-6 text-amber-500" />
               {isRtl ? "╪«╪╖╪╖ ╪º┘ä╪º╪┤╪¬╪▒╪º┘â" : "Subscription Plans"}
             </h1>
             <p className="text-sm text-slate-500 mt-1">{isRtl ? "╪º╪«╪¬╪▒ ╪º┘ä╪«╪╖╪⌐ ╪º┘ä┘à┘å╪º╪│╪¿╪⌐ ┘ä╪¡╪¼┘à ╪╣┘è╪º╪»╪¬┘â ┘ê╪º╪¡╪¬┘è╪º╪¼╪º╪¬┘â" : "Choose the right plan for your clinic's size and needs"}</p>
           </div>

           {/* Plans Grid */}
           <div className="flex flex-wrap items-center justify-center gap-6">
             {PLANS.map((plan) => {
               const isPro = plan.id === "silver";
               return (
                 <div key={plan.id} className={`w-72 text-center p-6 ${isPro ? "pb-14" : "pb-16"} rounded-lg relative ${isPro ? "bg-[#4F46BA] text-white border border-white/30" : "bg-white text-gray-800/80 border border-gray-200"}`}>
                   {isPro && (
                     <p className="absolute px-3 text-xs -top-3.5 left-3.5 py-1 bg-[#8789FB] rounded-full">
                       {isRtl ? "╪º┘ä╪ú┘â╪½╪▒ ╪╖┘ä╪¿╪º┘ï" : "Most Popular"}
                     </p>
                   )}
                   <p className={`font-semibold ${isPro ? "pt-2" : ""}`}>{plan.name}</p>
                   <h1 className="text-3xl font-semibold">
                     {plan.price.toLocaleString()}
                     <span className={`text-sm font-normal ${isPro ? "text-white/70" : "text-gray-500"}`}>{isRtl ? " ╪¼.┘à/╪┤┘ç╪▒" : " EGP/month"}</span>
                   </h1>
                   <ul className="list-none text-sm mt-6 space-y-1">
                     {plan.features.filter(f => f.included).map((f) => (
                       <li key={f.label} className="flex items-center gap-2">
                         <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                           <path d="M7.162 13.5 2.887 9.225l1.07-1.069 3.205 3.207 6.882-6.882 1.069 1.07z" fill={isPro ? "currentColor" : "#6366F1"}/>
                         </svg>
                         <p className={isPro ? "text-white" : "text-gray-500"}>
                           {f.label}
                           {f.limit && <span className={`text-[10px] ${isPro ? "text-white/70" : "text-indigo-400"}`}> ({f.limit})</span>}
                         </p>
                       </li>
                     ))}
                   </ul>
                   <button type="button" onClick={() => handleUpgrade(plan.id)}
                     className={`text-sm w-full py-2 rounded font-medium mt-7 transition-all ${isPro ? "bg-white text-indigo-600 hover:bg-gray-200" : "bg-indigo-500 text-white hover:bg-indigo-600"}`}
                   >
                     {isRtl ? `╪º╪┤╪¬╪▒╪º┘â ${plan.name}` : `Get ${plan.nameEn || plan.name}`}
                   </button>
                 </div>
               );
             })}
           </div>

           {/* Compare Toggle */}
           <div className="text-center">
             <button
               onClick={() => setShowCompare((v) => !v)}
               className={`inline-flex items-center gap-2 text-slate-500 hover:text-[#4F46BA] border border-slate-200 hover:border-[#4F46BA]/30 rounded-full px-6 py-2 text-xs font-bold transition-all ${isRtl ? "" : "flex-row-reverse"}`}
             >
               {showCompare ? (isRtl ? "╪Ñ╪«┘ü╪º╪í ╪¼╪»┘ê┘ä ╪º┘ä┘à┘é╪º╪▒┘å╪⌐" : "Hide Comparison Table") : (isRtl ? "┘à┘é╪º╪▒┘å╪⌐ ╪º┘ä╪«╪╖╪╖ ╪¿╪º┘ä╪¬┘ü╪╡┘è┘ä" : "Compare Plans in Detail")}
             </button>
           </div>

           {/* Comparison Table */}
           {showCompare && (
             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="border-b border-slate-100 bg-slate-50">
                       <th className={`p-4 text-slate-500 text-xs font-bold w-1/4 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "╪º┘ä┘à┘è╪▓╪⌐" : "Feature"}</th>
                       {PLANS.map((plan) => {
                         const Icon = plan.icon;
                         return (
                           <th key={plan.id} className="p-4 text-center">
                             <div className="flex flex-col items-center gap-1">
                               <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                                 <Icon className="w-3.5 h-3.5 text-white" />
                               </div>
                               <span className="text-xs font-extrabold text-slate-700">{isRtl ? `╪º┘ä╪«╪╖╪⌐ ${plan.name}` : `${plan.name} Plan`}</span>
                               <span className={`text-[10px] font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                 {plan.price.toLocaleString()} {isRtl ? "╪¼.┘à" : "EGP"}
                               </span>
                             </div>
                           </th>
                         );
                       })}
                     </tr>
                   </thead>
                   <tbody>
                     {COMPARE_ROWS.map((row, i) => (
                       <tr key={row.label} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                         <td className={`p-4 text-slate-600 text-xs font-medium ${isRtl ? "text-right" : "text-left"}`}>{row.label}</td>
                         {row.values.map((val, vi) => (
                           <td key={vi} className="p-4 text-center">
                             {typeof val === "boolean" ? (
                               <div className="flex justify-center">
                                 {val ? (
                                   <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${PLANS[vi].gradient} flex items-center justify-center`}>
                                     <Check className="w-3 h-3 text-white" />
                                   </div>
                                 ) : (
                                   <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                     <X className="w-3 h-3 text-slate-300" />
                                   </div>
                                 )}
                               </div>
                             ) : (
                               <span className={`text-xs font-bold bg-gradient-to-r ${PLANS[vi].gradient} bg-clip-text text-transparent`}>
                                 {val}
                               </span>
                             )}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
           )}
         </div>
       )}

       {/* Billing Form Modal */}
       {showBillingModal && payingPlan && (
         <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
             <div className={`h-1.5 w-full bg-gradient-to-r ${PLANS.find(p => p.id === payingPlan)?.gradient || "from-slate-400 to-slate-500"}`} />
             <div className="p-6 space-y-5">
               <div className="flex items-center justify-between">
                 <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                   <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${PLANS.find(p => p.id === payingPlan)?.gradient || "from-slate-400 to-slate-500"} flex items-center justify-center`}>
                     <CreditCard className="w-4 h-4 text-white" />
                   </div>
                   <div className={isRtl ? "text-right" : "text-left"}>
                     <p className="text-[10px] text-slate-400 font-bold">{isRtl ? "╪»┘ü╪╣ ╪ó┘à┘å ╪╣╪¿╪▒ Paymob" : "Secure Payment via Paymob"}</p>
                     <h3 className="text-sm font-extrabold text-slate-800">
                       {isRtl ? `╪º┘ä╪«╪╖╪⌐ ${PLANS.find(p => p.id === payingPlan)?.name}` : `${PLANS.find(p => p.id === payingPlan)?.name} Plan`} ΓÇö {PLANS.find(p => p.id === payingPlan)?.price.toLocaleString()} {isRtl ? "╪¼.┘à" : "EGP"}
                     </h3>
                   </div>
                 </div>
                 <button onClick={() => setShowBillingModal(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                   <X className="w-5 h-5" />
                 </button>
               </div>

               {payError && (
                 <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                   <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                   <p className="text-xs text-red-600">{payError}</p>
                 </div>
               )}

               <form onSubmit={handlePayment} className={`space-y-4 ${isRtl ? "text-right" : "text-left"}`}>
                 <div className="grid grid-cols-2 gap-3">
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-600">{isRtl ? "╪º┘ä╪º╪│┘à ╪º┘ä╪ú┘ê┘ä *" : "First Name *"}</label>
                     <input
                       required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                       placeholder={isRtl ? "┘à╪¡┘à╪»" : "John"}
                       className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-600">{isRtl ? "╪º┘ä╪º╪│┘à ╪º┘ä╪ú╪«┘è╪▒ *" : "Last Name *"}</label>
                     <input
                       required value={lastName} onChange={(e) => setLastName(e.target.value)}
                       placeholder={isRtl ? "╪ú╪¡┘à╪»" : "Doe"}
                       className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                     />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-600">{isRtl ? "╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è *" : "Email Address *"}</label>
                   <input
                     required type="email" value={payEmail} onChange={(e) => setPayEmail(e.target.value)}
                     placeholder="clinic@example.com" dir="ltr"
                     className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors text-left"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-600">{isRtl ? "╪▒┘é┘à ╪º┘ä┘ç╪º╪¬┘ü *" : "Phone Number *"}</label>
                   <input
                     required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                     placeholder="+201000000000" dir="ltr"
                     className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors text-left font-mono"
                   />
                 </div>
                 <p className={`text-[10px] text-slate-400 ${isRtl ? "" : "text-left"}`}>
                   {isRtl ? "≡ƒöÆ ╪»┘ü╪╣┘â ┘à╪¡┘à┘è ╪¿╪¬╪┤┘ü┘è╪▒ TLS 1.3 ╪╣╪¿╪▒ Paymob ΓÇö ┘ä╪º ┘å╪¡╪¬┘ü╪╕ ╪¿╪¿┘è╪º┘å╪º╪¬ ╪¿╪╖╪º┘é╪¬┘â" : "≡ƒöÆ Your payment is secured by TLS 1.3 via Paymob ΓÇö We do not store your card data"}
                 </p>
                 <button
                   type="submit"
                   disabled={isLoading}
                   className={`w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${PLANS.find(p => p.id === payingPlan)?.gradient || "from-slate-400 to-slate-500"} hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all`}
                 >
                   {isLoading ? (
                     <><Loader2 className="w-4 h-4 animate-spin" /> {isRtl ? "╪¼╪º╪▒┘è ╪Ñ╪╣╪»╪º╪» ╪º┘ä╪»┘ü╪╣..." : "Preparing Payment..."}</>
                   ) : (
                     <><CreditCard className="w-4 h-4" /> {isRtl ? "╪Ñ╪¬┘à╪º┘à ╪º┘ä╪»┘ü╪╣ ╪╣╪¿╪▒ Paymob" : "Complete Payment via Paymob"}</>
                   )}
                 </button>
               </form>
             </div>
           </div>
         </div>
       )}

       {/* Paymob iFrame Modal */}
       {showIframeModal && iframeUrl && (
         <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
             <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-sm font-bold text-slate-700">╪»┘ü╪╣ ╪ó┘à┘å ╪╣╪¿╪▒ Paymob</span>
               </div>
               <button
                 onClick={() => { setShowIframeModal(false); setIframeUrl(""); }}
                 className="text-slate-400 hover:text-slate-700 transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
             <iframe src={iframeUrl} className="w-full h-[600px] border-0" allow="payment" />
           </div>
         </div>
       )}

       {/* Hero & Login - Only show when not on guide or packages */}
       {activeTab !== "guide" && activeTab !== "packages" && (
       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="min-h-[calc(100vh-4rem)] flex items-center py-12 lg:py-0">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 w-full items-center">

            {/* Right side - Content */}
            <div className={`${isRtl ? "lg:order-2" : "lg:order-1"}`}>
              <div className="max-w-lg mx-auto lg:mx-0">
                <div className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 rounded-full px-3 py-1 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-semibold text-[#4F46BA] tracking-wide">
                    {isRtl ? "┘å╪╕╪º┘à ╪Ñ╪»╪º╪▒╪⌐ ╪╣┘è╪º╪»╪º╪¬ ┘à╪¬┘â╪º┘à┘ä" : "All-in-One Clinic Management"}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-4">
                  {isRtl ? (
                    <>╪º┘ä╪╖╪▒┘è┘é ┘å╪¡┘ê ╪╣┘è╪º╪»╪⌐<br />╪ú┘â╪½╪▒ <span className="text-[#4F46BA]">┘â┘ü╪º╪í╪⌐</span> ┘ê<span className="text-[#4F46BA]">╪¬┘å╪╕┘è┘à╪º┘ï</span></>
                  ) : (
                    <>The Path to a More<br /><span className="text-[#4F46BA]">Efficient</span> & <span className="text-[#4F46BA]">Organized</span> Clinic</>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-8">
                  {isRtl
                    ? "┘à┘å╪╡╪⌐ ┘à╪¬┘â╪º┘à┘ä╪⌐ ┘ä╪Ñ╪»╪º╪▒╪⌐ ╪╣┘è╪º╪»╪º╪¬ ╪º┘ä╪╣┘ä╪º╪¼ ╪º┘ä╪╖╪¿┘è╪╣┘è ΓÇö ╪│╪¼┘ä╪º╪¬ ╪╖╪¿┘è╪⌐╪î ╪¼╪»┘ê┘ä╪⌐ ┘à┘ê╪º╪╣┘è╪»╪î ┘ü┘ê╪º╪¬┘è╪▒╪î ╪¬┘é╪º╪▒┘è╪▒╪î ┘ê╪ú┘â╪½╪▒. ┘â┘ä ┘à╪º ╪¬╪¡╪¬╪º╪¼┘ç ┘ä╪Ñ╪»╪º╪▒╪⌐ ╪╣┘è╪º╪»╪¬┘â ╪¿┘â┘ü╪º╪í╪⌐."
                    : "A complete platform for physical therapy clinics ΓÇö medical records, scheduling, billing, reports, and more. Everything you need to run your clinic efficiently."
                  }
                </p>

                <div className="grid sm:grid-cols-2 gap-4 mb-10">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                        <f.icon className="w-4 h-4 text-[#4F46BA]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">{isRtl ? f.ar : f.en}</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">{isRtl ? f.descAr : f.descEn}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Testimonials */}
                <div className="hidden lg:block space-y-4">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <Quote className="w-3 h-3 text-[#4F46BA] mb-1 opacity-50" />
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {isRtl ? `"${t.textAr}"` : `"${t.textEn}"`}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#4F46BA] flex items-center justify-center text-[9px] font-bold text-white">
                          {isRtl ? t.nameAr.charAt(2) : t.nameEn.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">{isRtl ? t.nameAr : t.nameEn}</p>
                          <p className="text-[9px] text-slate-400">{isRtl ? t.roleAr : t.roleEn}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Left side - Login Form */}
            <div className={`${isRtl ? "lg:order-1" : "lg:order-2"}`}>
              <div className="max-w-sm mx-auto w-full">
                <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800">{isRtl ? "╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä" : "Sign In"}</h2>
                    <p className="text-xs text-slate-400 mt-1">{isRtl ? "┘à╪▒╪¡╪¿╪º┘ï ╪¿╪╣┘ê╪»╪¬┘â!" : "Welcome back!"}</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 mb-4 text-center flex items-center justify-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {successMsg && (
                    <div className="bg-green-50 border border-green-200 text-green-600 text-xs rounded-lg p-3 mb-4 text-center flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Email"}</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="example@primephysio.com"
                          className="w-full pl-10 text-slate-700 bg-white"
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Password"}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                          className="w-full pl-10 pr-10 text-slate-700 bg-white"
                          disabled={isSubmitting}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-300 hover:text-slate-500 transition-colors"
                        >
                          {showPassword ? <EyeClosed className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <CustomCheckbox
                          id="remember-me"
                          checked={rememberMe}
                          onChange={() => setRememberMe(!rememberMe)}
                        />
                        <label htmlFor="remember-me" className="text-xs text-slate-400 cursor-pointer select-none">
                          {isRtl ? "╪¬╪░┘â╪▒┘å┘è" : "Remember me"}
                        </label>
                      </div>
                      <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","",""]); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotShowCode(""); setForgotError(""); }} className="group text-xs text-[#4F46BA] transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#4338ca] after:transition-all after:duration-300 hover:after:w-full">
                        {isRtl ? "┘å╪│┘è╪¬ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒╪ƒ" : "Forgot password?"}
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="flex items-center justify-center gap-1">
                          {isRtl ? "╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä" : "Sign In"}
                          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="relative flex items-center py-2 my-2">
                    <div className="flex-grow border-t border-slate-100" />
                    <span className="mx-3 text-xs text-slate-300">{isRtl ? "╪ú┘ê" : "or"}</span>
                    <div className="flex-grow border-t border-slate-100" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                    className="w-full border border-slate-200 hover:border-slate-300 bg-white text-slate-600 font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.4-.9 2.6-1.9 3.4l3 2.3c1.7-1.6 2.7-4 2.7-6.9 0-.7-.1-1.4-.2-2.1H12z" />
                      <path fill="#34A853" d="M6.1 14.3l-.8.6-2.2 1.7A10 10 0 0 0 12 22c2.8 0 5.2-.9 6.9-2.4l-3-2.3c-.8.5-1.9.9-3.9.9-3 0-5.5-2-6.4-4.7z" />
                      <path fill="#FBBC05" d="M3.1 6.6A10 10 0 0 0 2 12c0 .8.1 1.6.3 2.3l4-3.1a6 6 0 0 1 0-1.7l-3.2-2.9z" />
                      <path fill="#4285F4" d="M12 5c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 12 2a10 10 0 0 0-8.9 5.5l4 3.1A5.8 5.8 0 0 1 12 5z" />
                    </svg>
                    {isRtl ? "╪º┘ä╪»╪«┘ê┘ä ╪╣╪¿╪▒ Google" : "Sign in with Google"}
                  </button>

                  <p className="text-center text-xs text-slate-400 mt-4">
                    {isRtl ? "┘ä┘è╪│ ┘ä╪»┘è┘â ╪¡╪│╪º╪¿╪ƒ" : "Don't have an account?"}{' '}
                    <Link href="/signup" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                      {isRtl ? "╪Ñ┘å╪┤╪º╪í ╪¡╪│╪º╪¿" : "Create one"}
                    </Link>
                  </p>
                </div>

                {/* Mobile testimonials */}
                <div className="lg:hidden mt-6 space-y-3">
                  {testimonials.map((t, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <Quote className="w-3 h-3 text-[#4F46BA] mb-1 opacity-50" />
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">
                        {isRtl ? `"${t.textAr}"` : `"${t.textEn}"`}
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#4F46BA] flex items-center justify-center text-[9px] font-bold text-white">
                          {isRtl ? t.nameAr.charAt(2) : t.nameEn.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-700">{isRtl ? t.nameAr : t.nameEn}</p>
                          <p className="text-[9px] text-slate-400">{isRtl ? t.roleAr : t.roleEn}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      )}

      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setShowForgotModal(false); } }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 sm:p-8 relative animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-3 left-3 text-slate-300 hover:text-slate-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {forgotStep === "email" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "┘å╪│┘è╪¬ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Forgot Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "╪ú╪»╪«┘ä ╪¿╪▒┘è╪»┘â ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è ┘ä╪Ñ╪╣╪º╪»╪⌐ ╪¬╪╣┘è┘è┘å ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Enter your email to reset your password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Email"}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="example@primephysio.com"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleForgotSendEmail}
                  disabled={forgotLoading}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "╪Ñ╪▒╪│╪º┘ä ╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é" : "Send Code"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
              </div>
            )}

            {forgotStep === "otp" && (
              <div className="space-y-4">
                <div className="text-center">
                  <ShieldAlert className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "╪¬╪ú┘â┘è╪» ╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é" : "Verify Code"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? `╪ú╪»╪«┘ä ╪º┘ä╪▒┘à╪▓ ╪º┘ä┘à╪▒╪│┘ä ╪Ñ┘ä┘ë ${forgotEmail}` : `Enter the code sent to ${forgotEmail}`}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                {forgotShowCode && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-2 text-center">
                    {isRtl ? `╪▒┘à╪▓ ╪º┘ä╪¬╪¡┘é┘é: ${forgotShowCode}` : `Dev code: ${forgotShowCode}`}
                  </div>
                )}

                <div className="flex items-center justify-center gap-3" dir="ltr">
                  {forgotOtp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs[idx]}
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
                  onClick={handleForgotVerifyOtp}
                  disabled={forgotLoading || forgotOtp.join("").length !== 4}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "╪¬╪ú┘â┘è╪»" : "Verify"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>

                <button onClick={() => setForgotStep("email")} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {isRtl ? "╪¬╪║┘è┘è╪▒ ╪º┘ä╪¿╪▒┘è╪» ╪º┘ä╪Ñ┘ä┘â╪¬╪▒┘ê┘å┘è" : "Change email"}
                </button>
              </div>
            )}

            {forgotStep === "reset" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "┘â┘ä┘à╪⌐ ┘à╪▒┘ê╪▒ ╪¼╪»┘è╪»╪⌐" : "New Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "╪ú╪»╪«┘ä ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¼╪»┘è╪»╪⌐" : "Enter your new password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪º┘ä╪¼╪»┘è╪»╪⌐" : "New Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "╪¬╪ú┘â┘è╪» ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Confirm Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <button
                  onClick={handleForgotResetPassword}
                  disabled={forgotLoading}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm disabled:opacity-50 flex items-center justify-center"
                >
                  {forgotLoading ? (
                    <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center gap-1">
                      {isRtl ? "╪¬╪¡╪»┘è╪½ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Update Password"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>
              </div>
            )}

            {forgotStep === "success" && (
              <div className="space-y-4 text-center">
                <div className="flex justify-center">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-slate-800">{isRtl ? "╪¬┘à ╪¬╪¡╪»┘è╪½ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒" : "Password Updated"}</h3>
                <p className="text-xs text-slate-400">{isRtl ? "╪¬┘à ╪¬╪¡╪»┘è╪½ ┘â┘ä┘à╪⌐ ╪º┘ä┘à╪▒┘ê╪▒ ╪¿┘å╪¼╪º╪¡. ┘è┘à┘â┘å┘â ╪º┘ä╪ó┘å ╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä." : "Your password has been updated. You can now sign in."}</p>
                <button
                  onClick={() => { setShowForgotModal(false); }}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm"
                >
                  {isRtl ? "╪¬╪│╪¼┘è┘ä ╪º┘ä╪»╪«┘ê┘ä" : "Sign In"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Prime Physio" className="w-5 h-5 object-contain" />
            <span className="text-[10px] font-bold text-slate-400">Prime Physio ┬⌐ 2026</span>
          </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "╪│┘è╪º╪│╪⌐ ╪º┘ä╪«╪╡┘ê╪╡┘è╪⌐" : "Privacy"}</span>
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "╪º┘ä╪┤╪▒┘ê╪╖" : "Terms"}</span>
            <Link href="/login" className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "╪º╪¬╪╡┘ä ╪¿┘å╪º" : "Contact"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
