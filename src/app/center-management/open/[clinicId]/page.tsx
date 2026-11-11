"use client";

import { useEffect, useState } from "react";

export default function OpenCenterPage({ params }: { params: Promise<{ clinicId: string }> }) {
  const [message, setMessage] = useState("جارٍ التحقق من صلاحية الدخول إلى المركز...");
  useEffect(() => {
    let active = true;
    params.then(async ({ clinicId }) => {
      try {
        const response = await fetch("/api/center-management/centers", { cache: "no-store" });
        const data = await response.json();
        const center = (data.centers || []).find((item: { id: string }) => item.id === clinicId);
        if (!response.ok || !center) throw new Error("هذا المركز غير مرتبط بحسابك أو لا تملك صلاحية الدخول إليه.");
        sessionStorage.setItem("preferred_clinic_id", clinicId);
        window.location.replace("/dashboard");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "تعذر فتح المركز.");
      }
    });
    return () => { active = false; };
  }, [params]);
  return <main dir="rtl" className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-[#5B50C7] border-t-transparent" /><p className="text-sm font-semibold leading-7 text-slate-700">{message}</p></div></main>;
}
