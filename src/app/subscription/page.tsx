"use client";

import React, { useState } from "react";
import {
  Briefcase, Database, Server, Crown,
  CreditCard, AlertCircle, X, Check, TrendingUp, Clock,
  Users, UserCheck, Calendar, BookOpen,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { Loader } from "@/components/Loader";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { useRef } from "react";

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
      <path d="M8 6h.01" />
      <path d="M16 6h.01" />
      <path d="M12 6h.01" />
      <path d="M12 10h.01" />
      <path d="M12 14h.01" />
      <path d="M16 10h.01" />
      <path d="M16 14h.01" />
      <path d="M8 10h.01" />
      <path d="M8 14h.01" />
    </svg>
  );
}

const getPlans = (isRtl: boolean) => {
  const allFeatures = ALL_FEATURES(isRtl);
  return [
    {
      id: "basic", name: isRtl ? "الأساسية" : "Starter", price: 0,
      description: isRtl ? "مثالية للعيادات الصغيرة والناشئة" : "Great for small businesses and startups",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: false,
      features: allFeatures.filter((f) => f.included.basic).map((f) => ({ text: `${f.label} (${f.limits.basic})`, icon: f.icon })),
      includes: [
        isRtl ? "تشمل:": "Free includes:",
        isRtl ? "إدارة المواعيد" : "Appointment Management",
        isRtl ? "دعم عبر البريد الإلكتروني" : "Email Support",
        isRtl ? "مركز واحد" : "1 Center",
      ],
    },
    {
      id: "silver", name: isRtl ? "الفضية" : "Silver", price: 1000,
      description: isRtl ? "قيمة ممتازة للعيادات المتوسطة والنشطة" : "Best value for growing clinics",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: true,
      features: allFeatures.filter((f) => f.included.silver).map((f) => ({ text: `${f.label}${f.limits.silver ? ` (${f.limits.silver})` : ""}`, icon: f.icon })),
      includes: [
        isRtl ? "كل ما في الأساسية +:" : "Everything in Starter, plus:",
        isRtl ? "التقارير والتحليلات" : "Reports & Analytics",
        isRtl ? "التغذية العلاجية" : "Clinical Nutrition",
        isRtl ? "دعم هاتفي" : "Phone Support",
      ],
    },
    {
      id: "gold", name: isRtl ? "الذهبية" : "Gold", price: 1500,
      description: isRtl ? "خطة متقدمة مع أمان معزز وصول غير محدود" : "Advanced plan with enhanced security",
      buttonText: isRtl ? "ابدأ الآن" : "Get started",
      popular: false,
      features: allFeatures.filter((f) => f.included.gold).map((f) => ({ text: `${f.label}${f.limits.gold ? ` (${f.limits.gold})` : ""}`, icon: f.icon })),
      includes: [
        isRtl ? "كل ما في الأعمال +:" : "Everything in Business, plus:",
        isRtl ? "المكتبة العلاجية" : "Rehab Library",
        isRtl ? "رسائل التذكير (SMS/WA)" : "Reminders (SMS/WA)",
        isRtl ? "دعم VIP 24/7" : "VIP 24/7 Support",
      ],
    },
  ];
};

const getCompareRows = (isRtl: boolean) => [
  { label: isRtl ? "المرضى (سجلات إلكترونية)" : "Patients (EHR)", values: [isRtl ? "50 مريض" : "50 Patients", isRtl ? "200 مريض" : "200 Patients", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "الجلسات الشهرية" : "Monthly Sessions",        values: [isRtl ? "100" : "100", isRtl ? "500" : "500", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "حسابات الأخصائيين" : "Therapist Accounts",      values: [isRtl ? "20 حساب" : "20 Accounts", isRtl ? "50 حساب" : "50 Accounts", isRtl ? "∞ غير محدودة" : "∞ Unlimited"] },
  { label: isRtl ? "المراكز" : "Centers",        values: [isRtl ? "مركز واحد" : "1 Center", isRtl ? "مركز واحد" : "1 Center", isRtl ? "مركزان" : "2 Centers"] },
  { label: isRtl ? "إدارة المواعيد" : "Appointments Mgmt",         values: [true,         true,          true]            },
  { label: isRtl ? "التغذية العلاجية" : "Clinical Nutrition",       values: [false,        true,          true]            },
  { label: isRtl ? "المكتبة العلاجية" : "Rehab Library",       values: [false,        false,         true]            },
  { label: isRtl ? "التقارير والتحليلات" : "Reports & Analytics",    values: [false,        true,          true]            },
  { label: isRtl ? "رسائل التذكير SMS" : "SMS Reminders",      values: [false,        false,         true]            },
  { label: isRtl ? "مستوى الدعم الفني" : "Support Level",      values: [isRtl ? "Email/تذاكر" : "Email/Tickets", isRtl ? "هاتف/سريع" : "Phone/Fast", isRtl ? "VIP 24/7" : "VIP 24/7"] },
];

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

export default function SubscriptionPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;
  const pricingRef = useRef<HTMLDivElement>(null);

  const [activePlanId, setActivePlanId] = useState("basic");
  const [isTrial, setIsTrial] = useState(false);
  const [trialEndDate, setTrialEndDate] = useState<string | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [planLimits, setPlanLimits] = useState({ patients: 50, sessions: 100 });

  React.useEffect(() => {
    async function loadData() {
      try {
        const { data: subData, error: subErr } = await supabase
          .from('subscriptions')
          .select('plan_name, plan_price, is_trial, end_date')
          .eq('clinic_id', clinicId)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (subErr) {
          if (subErr.code === "42P01" || String(subErr.message || "").includes("does not exist")) {
            console.warn("Table 'subscriptions' does not exist yet — run migration");
          } else {
            console.error("Subscription load error:", subErr.message || subErr);
          }
        } else if (subData && subData.length > 0) {
          setActivePlanId(subData[0].plan_name);
          setIsTrial(!!subData[0].is_trial);
          setTrialEndDate(subData[0].end_date || null);
          const limits: Record<string, { patients: number; sessions: number }> = {
            basic: { patients: 50, sessions: 100 },
            silver: { patients: 200, sessions: 500 },
            gold: { patients: -1, sessions: -1 },
          };
          setPlanLimits(limits[subData[0].plan_name] || limits.basic);
        }
      } catch (e) {
        console.error("Failed to load active plan", e);
      }

      try {
        const { count: pCount } = await supabase
          .from("patients")
          .select("*", { count: "exact", head: true })
          .eq('clinic_id', clinicId);
        if (pCount !== null) setPatientCount(pCount);
      } catch { /* ignore */ }

      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        const { count: sCount } = await supabase
          .from("sessions")
          .select("*", { count: "exact", head: true })
          .eq('clinic_id', clinicId)
          .gte("created_at", startOfMonth.toISOString());
        if (sCount !== null) setSessionCount(sCount);
      } catch { /* ignore */ }
    }
    loadData();
  }, []);

  const PLANS = getPlans(isRtl).map(p => ({
    ...p,
    isCurrent: p.id === activePlanId,
    yearlyPrice: Math.round(p.price * 12 * 0.8),
  }));

  const COMPARE_ROWS = getCompareRows(isRtl);

  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [showCompare, setShowCompare] = useState(false);

  const [payingPlan, setPayingPlan]             = useState<string | null>(null);
  const [isLoading, setIsLoading]               = useState(false);
  const [payError, setPayError]                 = useState("");
  const [iframeUrl, setIframeUrl]               = useState("");
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showIframeModal, setShowIframeModal]   = useState(false);

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
          billingPeriod,
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

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.4,
        duration: 0.5,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  const togglePricingPeriod = (value: string) => {
    setBillingPeriod(value === "0" ? "monthly" : "yearly");
  };

  return (
    <div className="px-4 pt-20 min-h-screen mx-auto relative bg-neutral-100" ref={pricingRef} dir={isRtl ? "rtl" : "ltr"}>
      <div
        className="absolute top-0 left-[10%] right-[10%] w-[80%] h-full z-0 pointer-events-none"
        style={{
          backgroundImage: `
        radial-gradient(circle at center, #206ce8 0%, transparent 70%)
      `,
          opacity: 0.6,
          mixBlendMode: "multiply",
        }}
      />

      <div className="text-center mb-6 max-w-3xl mx-auto relative z-10">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={revealVariants}
          custom={0}
          className="md:text-6xl sm:text-4xl text-3xl font-medium text-gray-900 mb-4"
        >
          {isRtl ? "خطط تناسب احتياجات " : "Plans that works best for your "}
          <motion.span
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={revealVariants}
            custom={1}
            className="border border-dashed border-blue-500 px-2 py-1 rounded-xl bg-blue-100 capitalize inline-block"
          >
            {isRtl ? "عيادتك" : "business"}
          </motion.span>
        </motion.h2>

        <motion.p
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={revealVariants}
          custom={2}
          className="sm:text-base text-sm text-gray-600 sm:w-[70%] w-[80%] mx-auto"
        >
          {isRtl
            ? "موثوق من قبل آلاف العيادات حول العالم، نساعدك على اختيار الخطة المناسبة لاحتياجاتك"
            : "Trusted by millions, We help teams all around the world, Explore which option is right for you."}
        </motion.p>
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={revealVariants}
        custom={3}
        className="relative z-10"
      >
        <PricingSwitch onSwitch={togglePricingPeriod} isRtl={isRtl} />
      </motion.div>

      {isTrial && trialEndDate && (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={revealVariants}
          custom={4}
          className="max-w-lg mx-auto relative z-10 mb-2"
        >
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-xl px-5 py-3 text-center shadow-lg">
            <p className="text-sm font-bold">
              {isRtl
                ? `🎉 تجربة مجانية للخطة الذهبية — متبقي ${Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} أيام`
                : `🎉 Free Gold Trial — ${Math.max(0, Math.ceil((new Date(trialEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days left`}
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-6 py-6 mx-auto relative z-10">
        {PLANS.map((plan, index) => (
          <motion.div
            key={plan.id}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={revealVariants}
            custom={5 + index}
          >
            <div
              className={`w-72 relative text-center border p-6 rounded-lg ${
                plan.popular
                  ? "bg-indigo-500 text-white border-gray-500/30"
                  : "bg-white text-gray-800/80 border-gray-200"
              } ${plan.isCurrent ? "ring-2 ring-emerald-500" : ""}`}
            >
              {plan.popular && (
                <p className="absolute px-3 text-sm -top-3.5 left-3.5 py-1 bg-[#8789FB] rounded-full text-white">
                  {isRtl ? "الأكثر طلباً" : "Most Popular"}
                </p>
              )}
              {plan.isCurrent && !plan.popular && (
                <p className="absolute px-3 text-sm -top-3.5 left-3.5 py-1 bg-emerald-500 rounded-full text-white">
                  {isRtl ? "حالياً" : "Current"}
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

              {plan.isCurrent ? (
                <div className={`w-full mt-7 py-2 rounded text-sm font-medium flex items-center justify-center gap-2 ${
                  plan.popular ? "bg-white text-indigo-500" : "bg-emerald-50 text-emerald-700 border border-emerald-300"
                }`}>
                  <Check className="w-4 h-4" />
                  {isRtl ? "خطتك الحالية" : "Current Plan"}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  className={`text-sm w-full py-2 rounded font-medium mt-7 transition-all ${
                    plan.popular
                      ? "bg-white text-[#4F46BA] hover:bg-gray-200"
                      : "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]"
                  }`}
                >
                  {isRtl ? "اشتراك " : "Get Started"}{plan.name}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={revealVariants}
        custom={8}
        className="max-w-7xl mx-auto relative z-10 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs mb-6"
      >
        <h3 className={`text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-6 flex items-center gap-2 ${isRtl ? "" : ""}`}>
          <TrendingUp className="w-4 h-4 text-blue-600" />
          {isRtl ? "استهلاك الخطة الحالية" : "Current Plan Usage"}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className={`flex justify-between text-xs ${isRtl ? "" : ""}`}>
              <span className="text-slate-600 font-medium">{isRtl ? "المرضى المسجلين" : "Registered Patients"}</span>
              {planLimits.patients === -1 ? (
                <span className="font-mono font-bold text-slate-800">{patientCount.toLocaleString()} / ∞</span>
              ) : (
                <span className="font-mono font-bold text-slate-800">{patientCount} / {planLimits.patients.toLocaleString()}</span>
              )}
            </div>
            <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              {planLimits.patients === -1 ? (
                <div className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] h-full rounded-full" style={{ width: "100%" }} />
              ) : (
                <div className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] h-full rounded-full" style={{ width: `${Math.min(100, (patientCount / planLimits.patients) * 100)}%` }} />
              )}
            </div>
            <p className={`text-[10px] text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
              {planLimits.patients === -1
                ? (isRtl ? "مرضى غير محدودين" : "Unlimited patients")
                : (planLimits.patients - patientCount > 0
                  ? (isRtl
                    ? `${(planLimits.patients - patientCount).toLocaleString()} مريض متبقي`
                    : `${(planLimits.patients - patientCount).toLocaleString()} patients left`)
                  : (isRtl ? "تم الوصول للحد الأقصى" : "Limit reached"))}
            </p>
          </div>

          <div className="space-y-2">
            <div className={`flex justify-between text-xs ${isRtl ? "" : ""}`}>
              <span className="text-slate-600 font-medium">{isRtl ? "الجلسات هذا الشهر" : "Sessions this Month"}</span>
              {planLimits.sessions === -1 ? (
                <span className="font-mono font-bold text-slate-800">{sessionCount.toLocaleString()} / ∞</span>
              ) : (
                <span className="font-mono font-bold text-slate-800">{sessionCount.toLocaleString()} / {planLimits.sessions.toLocaleString()}</span>
              )}
            </div>
            <div className="bg-slate-100 rounded-full h-2.5 overflow-hidden">
              {planLimits.sessions === -1 ? (
                <div className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] h-full rounded-full" style={{ width: "100%" }} />
              ) : (
                <div className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] h-full rounded-full" style={{ width: `${Math.min(100, (sessionCount / planLimits.sessions) * 100)}%` }} />
              )}
            </div>
            <p className={`text-[10px] text-slate-400 ${isRtl ? "text-right" : "text-left"}`}>
              {planLimits.sessions === -1
                ? (isRtl ? "جلسات غير محدودة" : "Unlimited sessions")
                : (planLimits.sessions - sessionCount > 0
                  ? (isRtl
                    ? `${(planLimits.sessions - sessionCount).toLocaleString()} جلسة متبقية`
                    : `${(planLimits.sessions - sessionCount).toLocaleString()} sessions left`)
                  : (isRtl ? "تم الوصول للحد الأقصى" : "Limit reached"))}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={revealVariants}
        custom={9}
        className="text-center max-w-7xl mx-auto relative z-10 mb-6"
      >
        <button
          onClick={() => setShowCompare((v) => !v)}
          className={`inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 border border-slate-200 hover:border-blue-300 rounded-full px-6 py-2 text-xs font-bold transition-all ${isRtl ? "" : ""}`}
        >
          {showCompare ? (isRtl ? "إخفاء الجدول" : "Hide Comparison") : (isRtl ? "مقارنة تفصيلية" : "Compare All Plans")}
        </button>
      </motion.div>

      {showCompare && (
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={revealVariants}
          custom={10}
          className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-lg max-w-7xl mx-auto relative z-10 mb-6"
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className={`p-4 text-slate-500 text-xs font-bold w-1/4 ${isRtl ? "text-right" : "text-left"}`}>
                    {isRtl ? "الميزة" : "Feature"}
                  </th>
                  {PLANS.map((plan) => (
                    <th key={plan.id} className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-extrabold text-slate-700">{plan.name}</span>
                        <span className="text-[10px] font-bold text-blue-600">
                          {(billingPeriod === "yearly" ? plan.yearlyPrice : plan.price).toLocaleString()} {isRtl ? "ج.م" : "EGP"}
                        </span>
                        {billingPeriod === "yearly" && (
                          <span className="text-[8px] text-green-600">{isRtl ? "سنوي" : "yearly"}</span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row, i) => (
                  <tr key={row.label} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                    <td className={`p-4 text-slate-600 text-xs font-medium ${isRtl ? "text-right" : "text-left"}`}>
                      {row.label}
                    </td>
                    {row.values.map((val, vi) => (
                      <td key={vi} className="p-4 text-center">
                        {typeof val === "boolean" ? (
                          <div className="flex justify-center">
                            {val ? (
                              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                <X className="w-3 h-3 text-slate-300" />
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-[#4F46BA]">
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
        </motion.div>
      )}

      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={revealVariants}
        custom={11}
        className={`flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl p-4 max-w-7xl mx-auto relative z-10 mb-6 ${isRtl ? "" : ""}`}
      >
        <Clock className="w-5 h-5 text-[#4F46BA] shrink-0" />
        <div>
          <p className="text-xs font-bold text-[#3730a3]">{isRtl ? "التجديد التلقائي" : "Auto-Renewal"}</p>
          <p className="text-[11px] text-[#4F46BA] mt-0.5">
            {isRtl ? "تتجدد خطتك تلقائياً في" : "Your current plan will auto-renew on"}{" "}
            <span className="font-bold">{isRtl ? "1 يوليو 2026" : "July 1, 2026"}</span>.{" "}
            {isRtl ? "يمكنك إلغاء أو تغيير الخطة في أي وقت." : "You can cancel or change anytime."}
          </p>
        </div>
      </motion.div>

      {showBillingModal && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed]" />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 ${isRtl ? "" : ""}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div className={isRtl ? "text-right" : "text-left"}>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? "دفع آمن عبر Paymob" : "Secure Payment via Paymob"}</p>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {isRtl ? `الخطة ${selectedPlan.name}` : `${selectedPlan.name} Plan`} — {(billingPeriod === "yearly" ? selectedPlan.yearlyPrice : selectedPlan.price).toLocaleString()} {isRtl ? "ج.م" : "EGP"} /{billingPeriod === "yearly" ? (isRtl ? "سنة" : "year") : (isRtl ? "شهر" : "month")}
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
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأخير *" : "Last Name *"}</label>
                    <input
                      required value={lastName} onChange={(e) => setLastName(e.target.value)}
                      placeholder={isRtl ? "أحمد" : "Doe"}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-600 transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "البريد الإلكتروني *" : "Email Address *"}</label>
                  <input
                    required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="clinic@example.com" dir="ltr"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-600 transition-colors text-left"
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
                  🔒 {isRtl ? "دفعك محمي بتشفير TLS 1.3 عبر Paymob" : "Your payment is secured by TLS 1.3 via Paymob"}
                </p>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
                >
                  {isLoading ? (
                    <><Loader size={16} /> {isRtl ? "جاري الإعداد..." : "Preparing..."}</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> {isRtl ? "إتمام الدفع" : "Complete Payment"}</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {showIframeModal && iframeUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-bold text-slate-700">{isRtl ? "دفع آمن عبر Paymob" : "Secure Payment"}</span>
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
