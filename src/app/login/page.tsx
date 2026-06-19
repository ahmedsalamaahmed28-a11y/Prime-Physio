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
  { label: isRtl ? "المرضى (سجلات طبية)" : "Patients (EHR)", limits: { basic: isRtl ? "50" : "50", silver: isRtl ? "200" : "200", gold: isRtl ? "∞" : "∞" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "الجلسات الشهرية" : "Monthly Sessions", limits: { basic: isRtl ? "100" : "100", silver: isRtl ? "500" : "500", gold: isRtl ? "∞" : "∞" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "حسابات الأخصائيين" : "Therapist Accounts", limits: { basic: isRtl ? "20" : "20", silver: isRtl ? "50" : "50", gold: isRtl ? "∞" : "∞" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "إدارة المواعيد" : "Appointment Management", limits: { basic: null, silver: null, gold: null }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "التقارير والتحليلات" : "Reports & Analytics", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: true, gold: true } },
  { label: isRtl ? "التغذية العلاجية" : "Clinical Nutrition", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: true, gold: true } },
  { label: isRtl ? "المكتبة العلاجية" : "Rehab Library", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: false, gold: true } },
  { label: isRtl ? "رسائل التذكير (SMS/WA)" : "Reminders (SMS/WA)", limits: { basic: null, silver: null, gold: null }, included: { basic: false, silver: false, gold: true } },
  { label: isRtl ? "الدعم الفني" : "Support", limits: { basic: isRtl ? "بريد إلكتروني" : "Email", silver: isRtl ? "هاتفي سريع" : "Phone", gold: isRtl ? "VIP 24/7" : "VIP 24/7" }, included: { basic: true, silver: true, gold: true } },
  { label: isRtl ? "فروع العيادة" : "Clinic Branches", limits: { basic: isRtl ? "1" : "1", silver: isRtl ? "1" : "1", gold: isRtl ? "2" : "2" }, included: { basic: true, silver: true, gold: true } },
];

const getPlans = (isRtl: boolean) => {
  const allFeatures = ALL_FEATURES(isRtl);
  return [
    {
      id: "basic", name: isRtl ? "الأساسية" : "Basic", nameEn: "STARTER", price: 500,
      subtitle: isRtl ? "للعيادات الصغيرة والناشئة" : "For small & startup clinics",
      icon: Zap, gradient: "from-slate-400 to-slate-500",
      features: allFeatures.map((f) => ({ ...f, included: f.included.basic, limit: f.limits.basic })),
    },
    {
      id: "silver", name: isRtl ? "الفضية" : "Silver", nameEn: "PROFESSIONAL", price: 1000,
      subtitle: isRtl ? "للعيادات المتوسطة والنشطة" : "For growing active clinics",
      icon: Shield, gradient: "from-cyan-500 to-blue-600",
      features: allFeatures.map((f) => ({ ...f, included: f.included.silver, limit: f.limits.silver })),
    },
    {
      id: "gold", name: isRtl ? "الذهبية" : "Gold", nameEn: "ENTERPRISE", price: 1500,
      subtitle: isRtl ? "للمراكز الطبية الكبرى والسلاسل" : "For large clinics & chains",
      icon: Crown, gradient: "from-[#FF8C00] via-[#FFC300] to-[#FFF082]",
      features: allFeatures.map((f) => ({ ...f, included: f.included.gold, limit: f.limits.gold })),
    },
  ];
};

const getCompareRows = (isRtl: boolean) => [
  { label: isRtl ? "المرضى (سجلات إلكترونية)" : "Patients (EHR)", values: [isRtl ? "50 مريض" : "50 Patients", isRtl ? "200 مريض" : "200 Patients", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "الجلسات الشهرية" : "Monthly Sessions", values: [isRtl ? "100" : "100", isRtl ? "500" : "500", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "حسابات الأخصائيين" : "Therapist Accounts", values: [isRtl ? "20 حساب" : "20 Accounts", isRtl ? "50 حساب" : "50 Accounts", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "الفروع والمراكز" : "Branches & Centers", values: [isRtl ? "1 فرع" : "1 Branch", isRtl ? "1 فرع" : "1 Branch", isRtl ? "2 فرع (مربوطة)" : "2 Branches (Linked)"] },
  { label: isRtl ? "إدارة المواعيد" : "Appointments Mgmt", values: [true, true, true] },
  { label: isRtl ? "التغذية العلاجية" : "Clinical Nutrition", values: [false, true, true] },
  { label: isRtl ? "المكتبة العلاجية" : "Rehab Library", values: [false, false, true] },
  { label: isRtl ? "التقارير والتحليلات" : "Reports & Analytics", values: [false, true, true] },
  { label: isRtl ? "رسائل التذكير SMS" : "SMS Reminders", values: [false, false, true] },
  { label: isRtl ? "مستوى الدعم الفني" : "Support Level", values: [isRtl ? "Email/تذاكر" : "Email/Tickets", isRtl ? "هاتف/سريع" : "Phone/Fast", isRtl ? "VIP 24/7" : "VIP 24/7"] },
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
        ? (isRtl ? "بيانات الدخول غير صحيحة" : "Invalid login credentials")
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
        setPayError(data.error || "حدث خطأ أثناء إعداد الدفع");
        setIsLoading(false);
        return;
      }

      setIframeUrl(data.iframeUrl);
      setShowBillingModal(false);
      setShowIframeModal(true);
    } catch {
      setPayError("تعذر الاتصال بخادم الدفع. تحقق من الاتصال بالإنترنت.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSendEmail = async () => {
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
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل إرسال الرمز" : "Failed to send code"));
      if (data.devCode) setForgotShowCode(data.devCode);
      setForgotLoading(false);
      setForgotStep("otp");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
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
      setForgotError(isRtl ? "يرجى إدخال رمز التحقق كاملاً" : "Please enter the full code");
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
      if (!res.ok) throw new Error(data.error || (isRtl ? "رمز غير صحيح" : "Invalid code"));
      setForgotLoading(false);
      setForgotStep("reset");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const handleForgotResetPassword = async () => {
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
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase(), code: forgotOtp.join(""), newPassword: forgotNewPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isRtl ? "فشل تحديث كلمة المرور" : "Failed to update password"));
      setForgotLoading(false);
      setForgotStep("success");
    } catch (err: any) {
      setForgotError(err?.message || (isRtl ? "حدث خطأ" : "An error occurred"));
      setForgotLoading(false);
    }
  };

  const navTabs = [
    { key: "centers", ar: "المراكز", en: "Centers" },
    { key: "management", ar: "إدارة", en: "Management" },
    { key: "packages", ar: "الباقات", en: "Packages" },
    { key: "about", ar: "من نحن", en: "About" },
    { key: "support", ar: "الدعم", en: "Support" },
  ];

  const features = [
    { icon: Activity, ar: "سجلات طبية ذكية", en: "Smart Medical Records", descAr: "إدارة متكاملة لملفات المرضى مع توثيق آلي", descEn: "Complete patient file management with auto-documentation" },
    { icon: Calendar, ar: "جدولة مواعيد ذكية", en: "Smart Scheduling", descAr: "نظام حجز متطور مع تذكيرات تلقائية", descEn: "Advanced booking system with auto reminders" },
    { icon: Users, ar: "فريق عمل متكامل", en: "Team Management", descAr: "إدارة صلاحيات الأطباء والموظفين بسهولة", descEn: "Easy doctor and staff permission management" },
    { icon: TrendingUp, ar: "تقارير وتحليلات", en: "Reports & Analytics", descAr: "إحصائيات دقيقة لأداء العيادة والإيرادات", descEn: "Accurate clinic performance and revenue stats" },
  ];

  const testimonials = [
    { textAr: "من أفضل أنظمة إدارة العيادات اللي استخدمتها. وفر علينا وقت ومجهود كبير.", textEn: "One of the best clinic management systems I've used. Saved us so much time and effort.", nameAr: "د. أحمد سالم", nameEn: "Dr. Ahmed Salem", roleAr: "استشاري علاج طبيعي", roleEn: "PT Consultant" },
    { textAr: "بعد استخدام Prime Physio، زادت إنتاجية العيادة بشكل ملحوظ.", textEn: "After using Prime Physio, our clinic productivity increased significantly.", nameAr: "د. محمد علي", nameEn: "Dr. Mohamed Ali", roleAr: "أخصائي علاج طبيعي", roleEn: "PT Specialist" },
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
                 {isRtl ? "🚀 دليل البدء مع برايم فيزيو" : "🚀 Getting Started with Prime Physio"}
               </h2>
               <p className="text-slate-600 max-w-2xl mx-auto">
                 {isRtl
                   ? "ثلاث خطوات سهلة لبدء رحلتك مع نظام إدارة عيادتك"
                   : "Three simple steps to start managing your clinic"}
               </p>
             </div>

             <div className="grid md:grid-cols-3 gap-8">
               {/* Step 1 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   1️⃣
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "إنشاء الحساب الشخصي" : "Create Your Account"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "ادخل على قائمة الإدارة واختر تسجيل حساب جديد" : "Go to Management and select Sign Up"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "أدخل اسمك وبريد إلكتروني قوي وكلمة مرور آمنة" : "Enter name, email and strong password"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "تفعّل حسابك عبر البريد الإلكتروني" : "Verify email and activate account"}</span>
                   </li>
                 </ul>
               </div>

               {/* Step 2 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   2️⃣
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "الاشتراك وإنشاء المركز" : "Subscribe & Create Clinic"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "اختر باقتك المناسبة (أساسية / فضية / ذهبية)" : "Choose your subscription plan"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "أدخل بيانات المركز (الاسم، الرمز التعريفي، الشعار)" : "Enter clinic details and branding"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "أكمل عملية الدفع والتفعيل" : "Complete payment and activation"}</span>
                   </li>
                 </ul>
               </div>

               {/* Step 3 */}
               <div className="bg-white rounded-2xl border border-slate-100 p-8 hover:shadow-lg transition-shadow">
                 <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl font-bold text-[#4F46BA] mb-4">
                   3️⃣
                 </div>
                 <h3 className="text-lg font-bold text-slate-900 mb-3">
                   {isRtl ? "الدخول إلى المنصة" : "Access Your Platform"}
                 </h3>
                 <ul className="space-y-2 text-sm text-slate-600">
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "ادخل عبر الرابط المباشر للمركز" : "Use direct clinic link"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "أو من خلال لوحة تحكم إدارة المراكز" : "Or from management dashboard"}</span>
                   </li>
                   <li className="flex items-start gap-2">
                     <span className="text-[#4F46BA] font-bold mt-0.5">•</span>
                     <span>{isRtl ? "ابدأ استخدام كل الميزات الآن! 🎉" : "Start using all features! 🎉"}</span>
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
               {isRtl ? "خطط الاشتراك" : "Subscription Plans"}
             </h1>
             <p className="text-sm text-slate-500 mt-1">{isRtl ? "اختر الخطة المناسبة لحجم عيادتك واحتياجاتك" : "Choose the right plan for your clinic's size and needs"}</p>
           </div>

           {/* Plans Grid */}
           <div className="flex flex-wrap items-center justify-center gap-6">
             {PLANS.map((plan) => {
               const isPro = plan.id === "silver";
               return (
                 <div key={plan.id} className={`w-72 text-center p-6 ${isPro ? "pb-14" : "pb-16"} rounded-lg relative ${isPro ? "bg-[#4F46BA] text-white border border-white/30" : "bg-white text-gray-800/80 border border-gray-200"}`}>
                   {isPro && (
                     <p className="absolute px-3 text-xs -top-3.5 left-3.5 py-1 bg-[#8789FB] rounded-full">
                       {isRtl ? "الأكثر طلباً" : "Most Popular"}
                     </p>
                   )}
                   <p className={`font-semibold ${isPro ? "pt-2" : ""}`}>{plan.name}</p>
                   <h1 className="text-3xl font-semibold">
                     {plan.price.toLocaleString()}
                     <span className={`text-sm font-normal ${isPro ? "text-white/70" : "text-gray-500"}`}>{isRtl ? " ج.م/شهر" : " EGP/month"}</span>
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
                     {isRtl ? `اشتراك ${plan.name}` : `Get ${plan.nameEn || plan.name}`}
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
               {showCompare ? (isRtl ? "إخفاء جدول المقارنة" : "Hide Comparison Table") : (isRtl ? "مقارنة الخطط بالتفصيل" : "Compare Plans in Detail")}
             </button>
           </div>

           {/* Comparison Table */}
           {showCompare && (
             <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
               <div className="overflow-x-auto">
                 <table className="w-full">
                   <thead>
                     <tr className="border-b border-slate-100 bg-slate-50">
                       <th className={`p-4 text-slate-500 text-xs font-bold w-1/4 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "الميزة" : "Feature"}</th>
                       {PLANS.map((plan) => {
                         const Icon = plan.icon;
                         return (
                           <th key={plan.id} className="p-4 text-center">
                             <div className="flex flex-col items-center gap-1">
                               <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                                 <Icon className="w-3.5 h-3.5 text-white" />
                               </div>
                               <span className="text-xs font-extrabold text-slate-700">{isRtl ? `الخطة ${plan.name}` : `${plan.name} Plan`}</span>
                               <span className={`text-[10px] font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                                 {plan.price.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
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
                     <p className="text-[10px] text-slate-400 font-bold">{isRtl ? "دفع آمن عبر Paymob" : "Secure Payment via Paymob"}</p>
                     <h3 className="text-sm font-extrabold text-slate-800">
                       {isRtl ? `الخطة ${PLANS.find(p => p.id === payingPlan)?.name}` : `${PLANS.find(p => p.id === payingPlan)?.name} Plan`} — {PLANS.find(p => p.id === payingPlan)?.price.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
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
                     <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأول *" : "First Name *"}</label>
                     <input
                       required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                       placeholder={isRtl ? "محمد" : "John"}
                       className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                     />
                   </div>
                   <div className="space-y-1">
                     <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأخير *" : "Last Name *"}</label>
                     <input
                       required value={lastName} onChange={(e) => setLastName(e.target.value)}
                       placeholder={isRtl ? "أحمد" : "Doe"}
                       className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                     />
                   </div>
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-600">{isRtl ? "البريد الإلكتروني *" : "Email Address *"}</label>
                   <input
                     required type="email" value={payEmail} onChange={(e) => setPayEmail(e.target.value)}
                     placeholder="clinic@example.com" dir="ltr"
                     className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors text-left"
                   />
                 </div>
                 <div className="space-y-1">
                   <label className="text-xs font-bold text-slate-600">{isRtl ? "رقم الهاتف *" : "Phone Number *"}</label>
                   <input
                     required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                     placeholder="+201000000000" dir="ltr"
                     className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors text-left font-mono"
                   />
                 </div>
                 <p className={`text-[10px] text-slate-400 ${isRtl ? "" : "text-left"}`}>
                   {isRtl ? "🔒 دفعك محمي بتشفير TLS 1.3 عبر Paymob — لا نحتفظ ببيانات بطاقتك" : "🔒 Your payment is secured by TLS 1.3 via Paymob — We do not store your card data"}
                 </p>
                 <button
                   type="submit"
                   disabled={isLoading}
                   className={`w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${PLANS.find(p => p.id === payingPlan)?.gradient || "from-slate-400 to-slate-500"} hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all`}
                 >
                   {isLoading ? (
                     <><Loader2 className="w-4 h-4 animate-spin" /> {isRtl ? "جاري إعداد الدفع..." : "Preparing Payment..."}</>
                   ) : (
                     <><CreditCard className="w-4 h-4" /> {isRtl ? "إتمام الدفع عبر Paymob" : "Complete Payment via Paymob"}</>
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
                 <span className="text-sm font-bold text-slate-700">دفع آمن عبر Paymob</span>
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
                    {isRtl ? "نظام إدارة عيادات متكامل" : "All-in-One Clinic Management"}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 leading-tight mb-4">
                  {isRtl ? (
                    <>الطريق نحو عيادة<br />أكثر <span className="text-[#4F46BA]">كفاءة</span> و<span className="text-[#4F46BA]">تنظيماً</span></>
                  ) : (
                    <>The Path to a More<br /><span className="text-[#4F46BA]">Efficient</span> & <span className="text-[#4F46BA]">Organized</span> Clinic</>
                  )}
                </h1>

                <p className="text-sm sm:text-base text-slate-500 leading-relaxed mb-8">
                  {isRtl
                    ? "منصة متكاملة لإدارة عيادات العلاج الطبيعي — سجلات طبية، جدولة مواعيد، فواتير، تقارير، وأكثر. كل ما تحتاجه لإدارة عيادتك بكفاءة."
                    : "A complete platform for physical therapy clinics — medical records, scheduling, billing, reports, and more. Everything you need to run your clinic efficiently."
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
                    <h2 className="text-lg font-bold text-slate-800">{isRtl ? "تسجيل الدخول" : "Sign In"}</h2>
                    <p className="text-xs text-slate-400 mt-1">{isRtl ? "مرحباً بعودتك!" : "Welcome back!"}</p>
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
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
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
                      <label className="text-[11px] font-medium text-slate-500">{isRtl ? "كلمة المرور" : "Password"}</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
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
                          {isRtl ? "تذكرني" : "Remember me"}
                        </label>
                      </div>
                      <button type="button" onClick={() => { setShowForgotModal(true); setForgotStep("email"); setForgotOtp(["","","",""]); setForgotNewPassword(""); setForgotConfirmPassword(""); setForgotShowCode(""); setForgotError(""); }} className="group text-xs text-[#4F46BA] transition-all duration-300 hover:scale-105 relative after:absolute after:bottom-0 after:left-0 after:h-[1.5px] after:w-0 after:bg-[#4338ca] after:transition-all after:duration-300 hover:after:w-full">
                        {isRtl ? "نسيت كلمة المرور؟" : "Forgot password?"}
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
                          {isRtl ? "تسجيل الدخول" : "Sign In"}
                          <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                        </span>
                      )}
                    </button>
                  </form>

                  <div className="relative flex items-center py-2 my-2">
                    <div className="flex-grow border-t border-slate-100" />
                    <span className="mx-3 text-xs text-slate-300">{isRtl ? "أو" : "or"}</span>
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
                    {isRtl ? "الدخول عبر Google" : "Sign in with Google"}
                  </button>

                  <p className="text-center text-xs text-slate-400 mt-4">
                    {isRtl ? "ليس لديك حساب؟" : "Don't have an account?"}{' '}
                    <Link href="/signup" className="text-[#4F46BA] hover:text-[#4338ca] font-medium transition-colors">
                      {isRtl ? "إنشاء حساب" : "Create one"}
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
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "نسيت كلمة المرور" : "Forgot Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور" : "Enter your email to reset your password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
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
                      {isRtl ? "إرسال رمز التحقق" : "Send Code"}
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
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "تأكيد رمز التحقق" : "Verify Code"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? `أدخل الرمز المرسل إلى ${forgotEmail}` : `Enter the code sent to ${forgotEmail}`}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                {forgotShowCode && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-2 text-center">
                    {isRtl ? `رمز التحقق: ${forgotShowCode}` : `Dev code: ${forgotShowCode}`}
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
                      {isRtl ? "تأكيد" : "Verify"}
                      <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                    </span>
                  )}
                </button>

                <button onClick={() => setForgotStep("email")} className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  {isRtl ? "تغيير البريد الإلكتروني" : "Change email"}
                </button>
              </div>
            )}

            {forgotStep === "reset" && (
              <div className="space-y-4">
                <div className="text-center">
                  <Lock className="w-8 h-8 text-[#4F46BA] mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-800">{isRtl ? "كلمة مرور جديدة" : "New Password"}</h3>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? "أدخل كلمة المرور الجديدة" : "Enter your new password"}</p>
                </div>

                {forgotError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 text-center">{forgotError}</div>
                )}

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 text-slate-700 bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-500">{isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      placeholder="••••••••"
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
                      {isRtl ? "تحديث كلمة المرور" : "Update Password"}
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
                <h3 className="text-sm font-bold text-slate-800">{isRtl ? "تم تحديث كلمة المرور" : "Password Updated"}</h3>
                <p className="text-xs text-slate-400">{isRtl ? "تم تحديث كلمة المرور بنجاح. يمكنك الآن تسجيل الدخول." : "Your password has been updated. You can now sign in."}</p>
                <button
                  onClick={() => { setShowForgotModal(false); }}
                  className="w-full bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium h-10 rounded-lg transition-all duration-200 text-sm"
                >
                  {isRtl ? "تسجيل الدخول" : "Sign In"}
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
            <span className="text-[10px] font-bold text-slate-400">Prime Physio © 2026</span>
          </div>
            <div className="flex items-center gap-4 text-[10px] text-slate-400">
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "سياسة الخصوصية" : "Privacy"}</span>
            <span className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "الشروط" : "Terms"}</span>
            <Link href="/login" className="cursor-pointer hover:text-slate-600 transition-colors">{isRtl ? "اتصل بنا" : "Contact"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
