"use client";
import React, { useState } from 'react';
import { useLanguage } from "@/lib/LanguageContext";
import PublicLayout from "@/components/PublicLayout";
import { CreditCard, X, AlertCircle } from 'lucide-react';
import { Loader } from "@/components/Loader";

const PLANS_DATA = [
  {
    id: "basic",
    nameAr: "الأساسية",
    nameEn: "Starter",
    priceAr: "مجاني",
    priceEn: "Free",
    priceNum: 0,
    featuresAr: ["50 مريض", "100 جلسة/شهر", "مركز واحد"],
    featuresEn: ["50 Patients", "100 Sessions/mo", "1 Center"],
    popular: false,
  },
  {
    id: "silver",
    nameAr: "الفضية",
    nameEn: "Silver",
    priceAr: "1,000",
    priceEn: "1,000",
    priceNum: 1000,
    featuresAr: ["200 مريض", "500 جلسة/شهر", "مركز واحد"],
    featuresEn: ["200 Patients", "500 Sessions/mo", "1 Center"],
    popular: true,
  },
  {
    id: "gold",
    nameAr: "الذهبية",
    nameEn: "Gold",
    priceAr: "1,500",
    priceEn: "1,500",
    priceNum: 1500,
    featuresAr: ["مرضى غير محدودين", "جلسات غير محدودة", "مركزين"],
    featuresEn: ["Unlimited Patients", "Unlimited Sessions", "2 Centers"],
    popular: false,
  },
];

export default function PlansPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [payingPlan, setPayingPlan] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [showIframeModal, setShowIframeModal] = useState(false);
  const [iframeUrl, setIframeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [payError, setPayError] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const handleStartPlan = (planId: string) => {
    if (planId === "basic") {
      // Free plan just goes to signup
      if (typeof window !== "undefined") {
        localStorage.setItem("pending_subscription_plan", planId);
        window.location.href = "/signup";
      }
      return;
    }
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
      const res = await fetch("/api/paymob/public-create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: payingPlan,
          billingPeriod: "monthly",
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

  const selectedPlan = PLANS_DATA.find(p => p.id === payingPlan);

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto text-center space-y-6">
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
        <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-6 pt-4">
          {PLANS_DATA.map((plan) => (
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
              <p className={`font-semibold ${plan.popular ? "pt-2" : ""}`}>{isRtl ? plan.nameAr : plan.nameEn}</p>
              <h1 className="text-3xl font-semibold mt-1">
                {isRtl ? plan.priceAr : plan.priceEn}
                {plan.priceNum > 0 && (
                  <span className={`text-sm font-normal ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                    /{isRtl ? "شهر" : "mo"}
                  </span>
                )}
              </h1>
              <ul className="list-none text-sm mt-6 space-y-1">
                {(isRtl ? plan.featuresAr : plan.featuresEn).map((feat, fi) => (
                  <li key={fi} className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <path d="M7.162 13.5 2.887 9.225l1.07-1.069 3.205 3.207 6.882-6.882 1.069 1.07z" fill={plan.popular ? "currentColor" : "#6366F1"}/>
                    </svg>
                    <p className={`text-sm ${plan.popular ? "text-white" : "text-gray-500"}`}>{feat}</p>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleStartPlan(plan.id)}
                className={`block text-center text-sm w-full py-2 rounded font-medium mt-7 transition-all ${
                  plan.popular
                    ? "bg-white text-[#4F46BA] hover:bg-gray-200"
                    : "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9]"
                }`}
              >
                {isRtl ? "ابدأ الآن" : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>

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
                      {isRtl ? `الخطة ${selectedPlan.nameAr}` : `${selectedPlan.nameEn} Plan`} — {selectedPlan.priceNum.toLocaleString()} {isRtl ? "ج.م" : "EGP"} /{isRtl ? "شهر" : "month"}
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
                    <><Loader size={16} color="#ffffff" /> {isRtl ? "جاري الإعداد..." : "Preparing..."}</>
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
    </PublicLayout>
  );
}
