"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import Link from "next/link";
import SetupSteps from "@/components/SetupSteps";
import { Loader } from "@/components/Loader";

export default function CentersPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user, isLoading: authLoading, isEnriching } = useAuth();
  const email = user?.email;
  const name = user?.name;
  const clinicId = user?.clinicId;

  useEffect(() => {
    if (!authLoading && !isEnriching && !clinicId) {
      window.location.href = "/login";
    }
  }, [authLoading, isEnriching, clinicId]);

  const [centers, setCenters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const deleteCenter = async (centerId: string) => {
    try {
      const res = await fetch(`/api/branches/${centerId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCenters(centers.filter(c => c.id !== centerId));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete center");
      }
    } catch (err) {
      setError("An error occurred");
    }
  };

  useEffect(() => {
    if (!clinicId) return;

    const fetchCenters = async () => {
      try {
        const res = await fetch(`/api/branches?clinicId=${clinicId}`);
        const data = await res.json();
        if (res.ok) {
          setCenters(data.branches || []);
        } else {
          setError(data.error || "Failed to fetch centers");
        }
      } catch (err) {
        setError("An error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    fetchCenters();
  }, [clinicId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center">
        <Loader size={32} color="#4F46BA" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-8" dir={isRtl ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto min-h-[500px] contain-layout">
        <SetupSteps />

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {isRtl ? "مراكزك" : "Your Centers"}
          </h1>
          <p className="text-slate-500">
            {isRtl
              ? "إدارة فروع مركزك وتعديل إعداداتها"
              : "Manage your center branches and their settings"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg p-3 mb-6">
            {error}
          </div>
        )}

        {centers.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 5v14M5 12h14" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              {isRtl ? "أنشئ مركزك الأول" : "Create Your First Center"}
            </h2>
            <p className="text-slate-500 mb-6">
              {isRtl
                ? "ابدأ بإنشاء مركزك الأول وحدد موقعه، شعاره، وتفاصيله الأساسية"
                : "Start by creating your first center and define its location, logo, and basic details"}
            </p>
            <button
                onClick={() => window.location.href = "/clinic_setup"}
              className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {isRtl ? "إنشاء مركز" : "Create Center"}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centers.map((center) => (
              <div
                key={center.id}
                className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      {center.logo_url ? (
                        <img
                          src={center.logo_url}
                          alt={center.short_name}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#94A3B8"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-800 mb-1">
                        {center.short_name}
                      </h3>
                      <p className="text-sm text-slate-500 mb-2">
                        {center.full_name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M6 3.5c-1.38 0-2.5-1.12-2.5-2.5S4.62 0 6 0s2.5 1.12 2.5 2.5S7.38 3.5 6 3.5zM6 9c-2.21 0-4 1.79-4 4v1c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-1c0-2.21-1.79-4-4-4z" fill="currentColor"/>
                        </svg>
                        <span>/{center.slug}</span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => window.location.href = `/centers/${center.id}`}
                        className="text-indigo-500 hover:text-indigo-600 text-sm font-medium"
                      >
                        {isRtl ? "تعديل" : "Edit"}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(isRtl ? "هل أنت متأكد؟" : "Are you sure?")) {
                            deleteCenter(center.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-600 text-sm font-medium text-right"
                      >
                        {isRtl ? "حذف" : "Delete"}
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <a
                      href={`/${center.slug}`}
                      className="w-full flex items-center justify-center gap-2 bg-[#4F46BA]/10 hover:bg-[#4F46BA]/20 text-[#4F46BA] py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      {isRtl ? "تسجيل دخول المركز" : "Center Login"}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isRtl ? "rotate-180" : ""}>
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            ))}

            {centers.length < 2 && (
              <div className="bg-white rounded-lg border-2 border-dashed border-slate-300 p-8 text-center hover:border-indigo-300 transition-colors cursor-pointer">
                <button
              onClick={() => window.location.href = "/clinic_setup"}
                  className="flex flex-col items-center gap-4"
                >
                  <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="#6366F1" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-indigo-600 mb-1">
                      {isRtl ? "إضافة مركز" : "Add Center"}
                    </h3>
                    <p className="text-sm text-slate-500">
                      {isRtl
                        ? `يمكنك إضافة مركز واحد آخر (الحد الأقصى: ${centers.length === 1 ? 1 : 2})`
                        : `You can add one more center (Max: ${centers.length === 1 ? 1 : 2})`
                      }
                    </p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
