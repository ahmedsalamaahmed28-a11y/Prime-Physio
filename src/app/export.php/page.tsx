"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { Download } from "lucide-react";

// This route is intentionally a lightweight placeholder until the dedicated
// full-data export workflow is designed.
export default function ExportPhpPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  return (
    <section className="mx-auto flex min-h-[420px] w-full max-w-4xl items-center justify-center px-4 py-12">
      <div className="w-full rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm sm:px-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F1EFFF] text-[#5B50C7]">
          <Download className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-800">
          {isRtl ? "التصدير الكامل للبيانات" : "Full data export"}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-slate-500">
          {isRtl ? "صفحة التصدير المستقل قيد التجهيز. يمكنك حاليًا تصدير بيانات كل مركز من صفحة مراكزي." : "The dedicated export page is being prepared. For now, you can export each center's data from My Centers."}
        </p>
      </div>
    </section>
  );
}
