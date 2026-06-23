"use client";
import React from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Crown, Shield, Zap, CheckCircle, ArrowRight } from "lucide-react";

const PLANS = (isRtl: boolean) => [
  {
    id: "basic", name: isRtl ? "الأساسية" : "Basic", price: 0,
    subtitle: isRtl ? "مجانية — ابدأ فوراً" : "Free — start instantly",
    icon: Zap, gradient: "from-slate-400 to-slate-500",
    features: [
      isRtl ? "حتى 50 مريض" : "Up to 50 patients",
      isRtl ? "100 جلسة / شهر" : "100 sessions / month",
      isRtl ? "إدارة المواعيد" : "Appointment management",
      isRtl ? "دعم عبر البريد" : "Email support",
    ],
    cta: isRtl ? "اختيار مجاني" : "Choose Free",
  },
  {
    id: "silver", name: isRtl ? "الفضية" : "Silver", price: 1000,
    subtitle: isRtl ? "للعيادات المتوسطة" : "For growing clinics",
    icon: Shield, gradient: "from-cyan-500 to-blue-600",
    features: [
      isRtl ? "حتى 200 مريض" : "Up to 200 patients",
      isRtl ? "500 جلسة / شهر" : "500 sessions / month",
      isRtl ? "التقارير والتحليلات" : "Reports & analytics",
      isRtl ? "التغذية العلاجية" : "Clinical nutrition",
      isRtl ? "دعم هاتفي" : "Phone support",
    ],
    cta: isRtl ? "اختيار الفضية" : "Choose Silver",
  },
  {
    id: "gold", name: isRtl ? "الذهبية" : "Gold", price: 1500,
    subtitle: isRtl ? "للمراكز الطبية الكبرى" : "For large clinics",
    icon: Crown, gradient: "from-amber-500 via-orange-400 to-yellow-400",
    features: [
      isRtl ? "مرضى غير محدودين" : "Unlimited patients",
      isRtl ? "جلسات غير محدودة" : "Unlimited sessions",
      isRtl ? "جميع الميزات مفتوحة" : "All features unlocked",
      isRtl ? "المكتبة العلاجية" : "Rehab library",
      isRtl ? "رسائل التذكير" : "Reminders (SMS/WA)",
      isRtl ? "دعم VIP 24/7" : "VIP 24/7 support",
    ],
    cta: isRtl ? "اختيار الذهبية" : "Choose Gold",
  },
];

export default function PlansPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white" dir={isRtl ? "rtl" : "ltr"}>
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-2">
          <img src="/logo.png" alt="Prime Physio" className="w-7 h-7 object-contain" />
          <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
        </div>
      </nav>
      <main className="px-4 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              {isRtl ? "اختر باقة اشتراكك" : "Choose Your Plan"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRtl ? "اختر الباقة المناسبة لاحتياجات عيادتك" : "Pick the right plan for your clinic"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS(isRtl).map((plan) => {
              const Icon = plan.icon;
              return (
                <div key={plan.id}
                  className={`relative rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer ${plan.id === "silver" ? "border-[#4F46BA] bg-white shadow-xl shadow-indigo-100 scale-[1.02]" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
                      <p className="text-[11px] text-slate-400">{plan.subtitle}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-extrabold text-slate-800">{isRtl ? "مجاني" : "Free"}</span>
                    ) : (
                      <span>
                        <span className="text-2xl font-extrabold text-slate-800">{plan.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 mr-1">{isRtl ? "ج.م / شهر" : "EGP / month"}</span>
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => { window.location.href = "/setup?step=plan&plan_id=" + plan.id; }}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${plan.id === "silver" ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {plan.cta} <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
