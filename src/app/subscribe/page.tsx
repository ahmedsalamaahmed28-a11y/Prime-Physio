"use client";

import React, { useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import Link from "next/link";

const plans = (isRtl: boolean) => [
  {
    id: "basic",
    name: isRtl ? "الأساسية" : "Starter",
    price: isRtl ? "مجاني" : "Free",
    priceNum: 0,
    features: isRtl
      ? ["50 مريض", "100 جلسة/شهر", "مركز واحد"]
      : ["50 Patients", "100 Sessions/mo", "1 Center"],
    popular: false,
  },
  {
    id: "silver",
    name: isRtl ? "الفضية" : "Silver",
    price: "1,000",
    priceNum: 1000,
    features: isRtl
      ? ["200 مريض", "500 جلسة/شهر", "مركز واحد"]
      : ["200 Patients", "500 Sessions/mo", "1 Center"],
    popular: true,
  },
  {
    id: "gold",
    name: isRtl ? "الذهبية" : "Gold",
    price: "1,500",
    priceNum: 1500,
    features: isRtl
      ? ["مرضى غير محدودين", "جلسات غير محدودة", "مركزين"]
      : ["Unlimited Patients", "Unlimited Sessions", "2 Centers"],
    popular: false,
  },
];

export default function SubscribePage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const email = user?.email;
  const name = user?.name;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async (planId: string) => {
    if (!email) return;
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || email.split("@")[0], planId }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Subscription failed");
      }

      window.location.href = "/centers";
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
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
          {isRtl ? "اختر باقة للبدء. يمكنك الترقية لاحقاً." : "Choose a plan to get started. You can upgrade later."}
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg p-3 max-w-md mx-auto">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 items-start justify-items-center gap-6 pt-4">
          {plans(isRtl).map((plan) => (
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
              <h1 className="text-3xl font-semibold mt-1">
                {plan.price}
                {plan.priceNum > 0 && (
                  <span className={`text-sm font-normal ${plan.popular ? "text-white/70" : "text-gray-500"}`}>
                    /{isRtl ? "شهر" : "mo"}
                  </span>
                )}
              </h1>
              <ul className="list-none text-sm mt-6 space-y-1">
                {plan.features.map((feat, fi) => (
                  <li key={fi} className={`flex items-center gap-2 ${isRtl ? "flex-row-reverse" : ""}`}>
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
                      <path d="M7.162 13.5 2.887 9.225l1.07-1.069 3.205 3.207 6.882-6.882 1.069 1.07z" fill={plan.popular ? "currentColor" : "#6366F1"}/>
                    </svg>
                    <p className={`text-sm ${plan.popular ? "text-white" : "text-gray-500"}`}>{feat}</p>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => handleSubscribe(plan.id)}
                disabled={isLoading}
                className={`text-sm w-full py-2 rounded font-medium mt-7 transition-all disabled:opacity-50 ${
                  plan.popular
                    ? "bg-white text-indigo-500 hover:bg-gray-200"
                    : "bg-indigo-500 text-white hover:bg-indigo-600"
                }`}
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  isRtl ? "ابدأ الآن" : "Get Started"
                )}
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-slate-400">
          <Link href="/centers" className="text-[#4F46BA] hover:underline">
            {isRtl ? "سأفعل ذلك لاحقاً" : "I'll do this later"}
          </Link>
        </p>
      </div>
    </div>
  );
}
