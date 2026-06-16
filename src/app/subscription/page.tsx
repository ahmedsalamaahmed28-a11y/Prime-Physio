"use client";

import React, { useState } from "react";
import {
  Zap, Shield, Crown, Users, UserCheck, Building,
  Calendar, Mail, Phone, Sparkles, CheckCircle2,
  X, Star, Check, TrendingUp, Clock, CreditCard,
  Loader2, AlertCircle,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";

const getPlans = (isRtl: boolean) => [
  {
    id: "basic", name: isRtl ? "الأساسية" : "Basic", nameEn: "BASIC", price: 500,
    icon: Zap, gradient: "from-slate-500 to-slate-700",
    ringColor: "ring-slate-400", glow: "shadow-slate-200",
    isCurrent: false, badge: null,
    features: [
      { label: isRtl ? "100 مريض (سجلات طبية)" : "100 Patients (EHR)", icon: Users },
      { label: isRtl ? "2,000 جلسة / شهر" : "2,000 Sessions / Month", icon: Calendar },
      { label: isRtl ? "20 حساب للأخصائيين" : "20 Therapist Accounts", icon: UserCheck },
      { label: isRtl ? "1 فرع للعيادة" : "1 Clinic Branch", icon: Building },
      { label: isRtl ? "إدارة المواعيد الأساسية" : "Basic Appointment Mgmt", icon: Clock },
      { label: isRtl ? "دعم فني عبر البريد والتذاكر" : "Email & Ticket Support", icon: Mail },
    ],
    missing: isRtl ? ["المكتبة والتغذية العلاجية", "التقارير المتقدمة", "رسائل التذكير", "فروع متعددة"] : ["Rehab Library & Nutrition", "Advanced Reports", "Reminders", "Multiple Branches"],
  },
  {
    id: "silver", name: isRtl ? "الفضية" : "Silver", nameEn: "SILVER", price: 1000,
    icon: Shield, gradient: "from-cyan-500 to-blue-600",
    ringColor: "ring-cyan-400", glow: "shadow-cyan-100",
    isCurrent: false, badge: isRtl ? "الأكثر شيوعاً" : "Most Popular",
    features: [
      { label: isRtl ? "300 مريض (سجلات طبية)" : "300 Patients (EHR)", icon: Users },
      { label: isRtl ? "10,000 جلسة / شهر" : "10,000 Sessions / Month", icon: Calendar },
      { label: isRtl ? "50 حساب للأخصائيين" : "50 Therapist Accounts", icon: UserCheck },
      { label: isRtl ? "إدارة التغذية العلاجية" : "Clinical Nutrition Mgmt", icon: Zap },
      { label: isRtl ? "تقارير وتحليلات العيادة" : "Clinic Reports & Analytics", icon: TrendingUp },
      { label: isRtl ? "دعم هاتفي سريع" : "Fast Phone Support", icon: Phone },
    ],
    missing: isRtl ? ["المكتبة العلاجية الشاملة", "رسائل التذكير (SMS/WA)", "فروع متعددة"] : ["Comprehensive Rehab Library", "Reminders (SMS/WA)", "Multiple Branches"],
  },
  {
    id: "gold", name: isRtl ? "الذهبية" : "Gold", nameEn: "GOLD", price: 1500,
    icon: Crown, gradient: "from-amber-400 to-orange-500",
    ringColor: "ring-amber-400", glow: "shadow-amber-100",
    isCurrent: false, badge: isRtl ? "الأفضل قيمة" : "Best Value",
    features: [
      { label: isRtl ? "500 مريض (سجلات طبية)" : "500 Patients (EHR)", icon: Users },
      { label: isRtl ? "جلسات غير محدودة ∞" : "Unlimited Sessions ∞", icon: Sparkles },
      { label: isRtl ? "100 حساب للأخصائيين" : "100 Therapist Accounts", icon: UserCheck },
      { label: isRtl ? "فرعين (ربط بيانات متكامل)" : "2 Branches (Linked Data)", icon: Building },
      { label: isRtl ? "المكتبة والتغذية العلاجية" : "Rehab Library & Nutrition", icon: Star },
      { label: isRtl ? "رسائل التذكير التلقائية" : "Automated Reminders", icon: Phone },
      { label: isRtl ? "أولوية الدعم الفني VIP" : "VIP Priority Support", icon: Crown },
    ],
    missing: [],
  },
];

const getCompareRows = (isRtl: boolean) => [
  { label: isRtl ? "المرضى (سجلات إلكترونية)" : "Patients (EHR)", values: [isRtl ? "100 مريض" : "100 Patients", isRtl ? "300 مريض" : "300 Patients", isRtl ? "500 مريض" : "500 Patients"] },
  { label: isRtl ? "الجلسات الشهرية" : "Monthly Sessions",        values: [isRtl ? "2,000" : "2,000", isRtl ? "10,000" : "10,000", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "حسابات الأخصائيين" : "Therapist Accounts",      values: [isRtl ? "20 حساب" : "20 Accounts", isRtl ? "50 حساب" : "50 Accounts", isRtl ? "100 حساب" : "100 Accounts"] },
  { label: isRtl ? "الفروع والمراكز" : "Branches & Centers",        values: [isRtl ? "1 فرع" : "1 Branch", isRtl ? "1 فرع" : "1 Branch", isRtl ? "2 فرع (مربوطة)" : "2 Branches (Linked)"] },
  { label: isRtl ? "إدارة المواعيد" : "Appointments Mgmt",         values: [true,         true,          true]            },
  { label: isRtl ? "التغذية العلاجية" : "Clinical Nutrition",       values: [false,        true,          true]            },
  { label: isRtl ? "المكتبة العلاجية" : "Rehab Library",       values: [false,        false,         true]            },
  { label: isRtl ? "التقارير والتحليلات" : "Reports & Analytics",    values: [false,        true,          true]            },
  { label: isRtl ? "رسائل التذكير SMS" : "SMS Reminders",      values: [false,        false,         true]            },
  { label: isRtl ? "مستوى الدعم الفني" : "Support Level",      values: [isRtl ? "Email/تذاكر" : "Email/Tickets", isRtl ? "هاتف/سريع" : "Phone/Fast", isRtl ? "VIP 24/7" : "VIP 24/7"] },
];

export default function SubscriptionPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  const [activePlanId, setActivePlanId] = useState("basic");
  const [patientCount, setPatientCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [planLimits, setPlanLimits] = useState({ patients: 100, sessions: 2000 });

  React.useEffect(() => {
    async function loadData() {
      try {
        const { data: subData, error: subErr } = await supabase
          .from('subscriptions')
          .select('plan_name, plan_price')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (subErr) {
          if (subErr.code === "42P01") console.warn("Table 'subscriptions' does not exist yet");
          else console.error("Subscription load error:", subErr);
        } else if (subData && subData.length > 0) {
          setActivePlanId(subData[0].plan_name);
          const limits: Record<string, { patients: number; sessions: number }> = {
            basic: { patients: 100, sessions: 2000 },
            silver: { patients: 300, sessions: 10000 },
            gold: { patients: 500, sessions: 999999 },
          };
          setPlanLimits(limits[subData[0].plan_name] || limits.basic);
        }
      } catch (e) {
        console.error("Failed to load active plan", e);
      }

      try {
        const { count: pCount } = await supabase
          .from("patients").select("*", { count: "exact", head: true });
        if (pCount !== null) setPatientCount(pCount);
      } catch { /* ignore */ }

      try {
        const { count: sCount } = await supabase
          .from("sessions").select("*", { count: "exact", head: true });
        if (sCount !== null) setSessionCount(sCount);
      } catch { /* ignore */ }
    }
    loadData();
  }, []);

  const PLANS = getPlans(isRtl).map(p => ({
    ...p,
    isCurrent: p.id === activePlanId
  }));
  
  const COMPARE_ROWS = getCompareRows(isRtl);

  const [showCompare, setShowCompare] = useState(false);

  // ── Payment State ────────────────────────────────────────────────────────
  const [payingPlan, setPayingPlan]             = useState<string | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [payError, setPayError]                 = useState("");
  const [iframeUrl, setIframeUrl]               = useState("");
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showIframeModal, setShowIframeModal]   = useState(false);

  // Billing form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [email, setEmail]         = useState("");
  const [phone, setPhone]         = useState("");

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
            email, phone_number: phone,
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

  const selectedPlan = PLANS.find((p) => p.id === payingPlan);

  return (
    <div className="space-y-8 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
        <div>
          <h1 className={`text-2xl font-extrabold text-slate-800 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
            <Crown className="w-6 h-6 text-amber-500" />
            {isRtl ? "خطط الاشتراك" : "Subscription Plans"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{isRtl ? "اختر الخطة المناسبة لحجم عيادتك واحتياجاتك" : "Choose the right plan for your clinic's size and needs"}</p>
        </div>
        <div className={`flex items-center gap-2 bg-[#0d8a8a]/8 border border-[#0d8a8a]/20 rounded-2xl px-4 py-2.5 ${isRtl ? "" : "flex-row-reverse"}`}>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <div className={isRtl ? "text-right" : "text-left"}>
            <p className="text-[10px] text-slate-500 font-medium">{isRtl ? "خطتك الحالية" : "Current Plan"}</p>
            <p className="text-sm font-extrabold text-slate-800">
              {PLANS.find(p => p.isCurrent)?.name || "Basic"} — {PLANS.find(p => p.isCurrent)?.price} {isRtl ? "ج.م / شهر" : "EGP / month"}
            </p>
          </div>
          <span className={`text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full ${isRtl ? "mr-2" : "ml-2"}`}>{isRtl ? "✓ نشطة" : "✓ Active"}</span>
        </div>
      </div>

      {/* ── Usage Bar ───────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className={`text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-4 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
          <TrendingUp className="w-4 h-4 text-[#0d8a8a]" />
          {isRtl ? "استهلاك الخطة الحالية" : "Current Plan Usage"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <div className={`flex justify-between text-xs ${isRtl ? "" : "flex-row-reverse"}`}>
              <span className="text-slate-600 font-medium">{isRtl ? "المرضى المسجلين" : "Registered Patients"}</span>
              <span className="font-mono font-bold text-slate-800">{patientCount} / {planLimits.patients.toLocaleString()}</span>
            </div>
            <div className={`bg-slate-100 rounded-full h-2.5 overflow-hidden ${isRtl ? "" : "transform rotate-180"}`}>
              <div className="bg-gradient-to-r from-slate-500 to-slate-700 h-full rounded-full" style={{ width: `${Math.min(100, (patientCount / planLimits.patients) * 100)}%` }} />
            </div>
            <p className={`text-[10px] text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
              {planLimits.patients - patientCount > 0
                ? (isRtl
                  ? `${(planLimits.patients - patientCount).toLocaleString()} مريض متبقي قبل الوصول للحد الأقصى`
                  : `${(planLimits.patients - patientCount).toLocaleString()} patients left before reaching the limit`)
                : (isRtl ? "تم الوصول للحد الأقصى من المرضى" : "Maximum patient limit reached")}
            </p>
          </div>
          <div className="space-y-1.5">
            <div className={`flex justify-between text-xs ${isRtl ? "" : "flex-row-reverse"}`}>
              <span className="text-slate-600 font-medium">{isRtl ? "الجلسات هذا الشهر" : "Sessions this Month"}</span>
              <span className="font-mono font-bold text-slate-800">{sessionCount.toLocaleString()} / {planLimits.sessions === 999999 ? "∞" : planLimits.sessions.toLocaleString()}</span>
            </div>
            <div className={`bg-slate-100 rounded-full h-2.5 overflow-hidden ${isRtl ? "" : "transform rotate-180"}`}>
              <div className="bg-gradient-to-r from-slate-500 to-slate-700 h-full rounded-full" style={{ width: `${Math.min(100, (sessionCount / planLimits.sessions) * 100)}%` }} />
            </div>
            <p className={`text-[10px] text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
              {planLimits.sessions === 999999
                ? (isRtl ? "جلسات غير محدودة" : "Unlimited sessions")
                : (planLimits.sessions - sessionCount > 0
                  ? (isRtl
                    ? `${(planLimits.sessions - sessionCount).toLocaleString()} جلسة متبقية هذا الشهر`
                    : `${(planLimits.sessions - sessionCount).toLocaleString()} sessions left this month`)
                  : (isRtl ? "تم الوصول للحد الأقصى من الجلسات" : "Maximum session limit reached"))}
            </p>
          </div>
        </div>
      </div>

      {/* ── Plans Grid ──────────────────────────────────────────────────── */}
      <div>
        <h2 className={`text-sm font-extrabold text-slate-700 mb-4 ${isRtl ? "text-right" : "text-left"}`}>{isRtl ? "اختر خطة اشتراك" : "Choose a Subscription Plan"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-center mt-8">
          {PLANS.map((plan) => {
            const PlanIcon = plan.icon;
            const isDark = plan.id === "gold";
            const isSilver = plan.id === "silver";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl border overflow-hidden transition-all duration-500 hover:-translate-y-2
                  ${isDark
                    ? "bg-slate-900 border-slate-800 shadow-[0_0_40px_-15px_rgba(245,158,11,0.3)]"
                    : isSilver
                    ? "bg-white border-cyan-200 shadow-2xl shadow-cyan-900/5 ring-4 ring-cyan-50 md:-my-4 z-10"
                    : "bg-white border-slate-200 shadow-sm"
                  }
                  ${plan.isCurrent && !isDark ? `ring-2 ${plan.ringColor} border-transparent` : ""}
                `}
              >
                {/* Top glow/gradient strip */}
                <div className={`h-2 w-full bg-gradient-to-r ${plan.gradient}`} />

                {plan.badge && (
                  <div className="absolute top-5 left-4 z-10">
                    <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full text-white bg-gradient-to-r ${plan.gradient} flex items-center gap-1 shadow-lg`}>
                      <Star className="w-3 h-3 fill-current" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="p-6 md:p-8 space-y-6">
                  {/* Header */}
                  <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-lg transform -rotate-3`}>
                      <PlanIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className={isRtl ? "text-right" : "text-left"}>
                      <p className={`text-[10px] font-bold tracking-widest uppercase ${isDark ? "text-slate-400" : "text-slate-400"}`}>
                        {plan.nameEn}
                      </p>
                      <h3 className={`text-lg font-black ${isDark ? "text-white" : "text-slate-800"}`}>
                        {isRtl ? `الخطة ${plan.name}` : `${plan.name} Plan`}
                      </h3>
                    </div>
                  </div>

                  {/* Price */}
                  <div className={`border-t border-b py-5 ${isDark ? "border-slate-800/60" : "border-slate-100"}`}>
                    <div className={`flex items-end gap-1.5 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                      <span className={`text-5xl font-black bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent drop-shadow-sm`}>
                        {plan.price.toLocaleString()}
                      </span>
                      <div className={`mb-1.5 ${isRtl ? "text-right" : "text-left"}`}>
                        <span className={`text-sm font-bold block ${isDark ? "text-slate-300" : "text-slate-500"}`}>{isRtl ? "ج.م" : "EGP"}</span>
                        <span className={`text-[10px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>{isRtl ? "/ شهرياً" : "/ month"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3.5">
                    {plan.features.map((f) => (
                      <li key={f.label} className={`flex items-center gap-3 text-sm font-medium ${isDark ? "text-slate-200" : "text-slate-700"} ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                        <CheckCircle2 className={`w-4 h-4 shrink-0 text-white bg-gradient-to-br ${plan.gradient} rounded-full shadow-sm`} />
                        {f.label}
                      </li>
                    ))}
                    {plan.missing.map((m) => (
                      <li key={m} className={`flex items-center gap-3 text-sm ${isDark ? "text-slate-600" : "text-slate-400"} ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
                        <X className="w-4 h-4 shrink-0 opacity-50" />
                        <span className="line-through">{m}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <div className="pt-2">
                    {plan.isCurrent ? (
                      <div className={`w-full text-center py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2
                        ${isDark 
                          ? "text-amber-400 bg-amber-400/10 border border-amber-400/20" 
                          : "text-[#0d8a8a] bg-[#0d8a8a]/10 border border-[#0d8a8a]/20"}`}
                      >
                        <Check className="w-4 h-4" />
                        {isRtl ? "خطتك الحالية" : "Current Plan"}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className={`w-full py-3.5 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${plan.gradient} hover:opacity-90 active:scale-95 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2`}
                      >
                        <CreditCard className="w-4 h-4" />
                        {isRtl ? `الترقية إلى ${plan.name}` : `Upgrade to ${plan.name}`}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ── Compare Toggle ───────────────────────────────────────────────── */}
      <div className="text-center">
        <button
          onClick={() => setShowCompare((v) => !v)}
          className={`inline-flex items-center gap-2 text-slate-500 hover:text-[#0d8a8a] border border-slate-200 hover:border-[#0d8a8a]/30 rounded-full px-6 py-2 text-xs font-bold transition-all ${isRtl ? "" : "flex-row-reverse"}`}
        >
          {showCompare ? (isRtl ? "إخفاء جدول المقارنة" : "Hide Comparison Table") : (isRtl ? "مقارنة الخطط بالتفصيل" : "Compare Plans in Detail")}
        </button>
      </div>

      {/* ── Comparison Table ─────────────────────────────────────────────── */}
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

      {/* ── Renewal Info ─────────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 ${isRtl ? "" : "flex-row-reverse justify-end text-left"}`}>
        <Clock className="w-5 h-5 text-slate-400 shrink-0" />
        <div>
          <p className="text-xs font-bold text-slate-700">{isRtl ? "التجديد التلقائي" : "Auto-Renewal"}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {isRtl ? "تتجدد خطتك الحالية تلقائياً في" : "Your current plan will auto-renew on"}{" "}
            <span className="font-bold text-slate-700">{isRtl ? "1 يوليو 2026" : "July 1, 2026"}</span>.{" "}
            {isRtl ? "يمكنك إلغاء أو تغيير الخطة في أي وقت قبل موعد التجديد." : "You can cancel or change your plan at any time before the renewal date."}
          </p>
        </div>
      </div>

      {/* ══ Billing Form Modal ═══════════════════════════════════════════════ */}
      {showBillingModal && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className={`h-1.5 w-full bg-gradient-to-r ${selectedPlan.gradient}`} />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedPlan.gradient} flex items-center justify-center`}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? "دفع آمن عبر Paymob" : "Secure Payment via Paymob"}</p>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {isRtl ? `الخطة ${selectedPlan.name}` : `${selectedPlan.name} Plan`} — {selectedPlan.price.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
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
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0d8a8a] transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأخير *" : "Last Name *"}</label>
                    <input
                      required value={lastName} onChange={(e) => setLastName(e.target.value)}
                      placeholder={isRtl ? "أحمد" : "Doe"}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0d8a8a] transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "البريد الإلكتروني *" : "Email Address *"}</label>
                  <input
                    required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinic@example.com" dir="ltr"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0d8a8a] transition-colors text-left"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "رقم الهاتف *" : "Phone Number *"}</label>
                  <input
                    required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="+201000000000" dir="ltr"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#0d8a8a] transition-colors text-left font-mono"
                  />
                </div>
                <p className={`text-[10px] text-slate-400 ${isRtl ? "" : "text-left"}`}>
                  {isRtl ? "🔒 دفعك محمي بتشفير TLS 1.3 عبر Paymob — لا نحتفظ ببيانات بطاقتك" : "🔒 Your payment is secured by TLS 1.3 via Paymob — We do not store your card data"}
                </p>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${selectedPlan.gradient} hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all`}
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

      {/* ══ Paymob iFrame Modal ══════════════════════════════════════════════ */}
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
            <iframe
              src={iframeUrl}
              className="w-full h-[520px] border-0"
              title="Paymob Payment"
              allow="payment"
            />
          </div>
        </div>
      )}

    </div>
  );
}
