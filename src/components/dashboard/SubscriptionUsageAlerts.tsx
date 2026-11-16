"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpLeft, HardDrive, Users } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

type Quota = {
  current?: number;
  limit?: number;
  remaining?: number;
  plan?: string;
};

type UsageResponse = {
  patients?: Quota;
  storage?: Quota;
};

function formatBytes(bytes: number, isRtl: boolean) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(2) + (isRtl ? " جيجابايت" : " GB");
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + (isRtl ? " ميجابايت" : " MB");
  return Math.round(bytes / 1024) + (isRtl ? " كيلوبايت" : " KB");
}

export default function SubscriptionUsageAlerts({ clinicId }: { clinicId?: string }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [usage, setUsage] = useState<UsageResponse | null>(null);

  const loadUsage = useCallback(async () => {
    if (!clinicId) {
      setUsage(null);
      return;
    }
    try {
      const response = await fetch("/api/subscription/usage", { cache: "no-store" });
      if (!response.ok) throw new Error("Could not load subscription usage");
      const result = (await response.json()) as UsageResponse;
      setUsage(result);
    } catch (error) {
      console.warn("[Subscription Usage] Dashboard warning data is unavailable:", error);
    }
  }, [clinicId]);

  useEffect(() => {
    void loadUsage();
    const refresh = () => void loadUsage();
    const interval = window.setInterval(refresh, 5 * 60 * 1000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
    };
  }, [loadUsage]);

  const alerts = useMemo(() => {
    if (!usage) return [];
    return ([
      {
        id: "patients",
        label: isRtl ? "عدد المرضى" : "Patients",
        icon: Users,
        current: Number(usage.patients?.current || 0),
        limit: Number(usage.patients?.limit ?? -1),
        remaining: Number(usage.patients?.remaining ?? 0),
        display: (value: number) => Math.round(value).toLocaleString(isRtl ? "ar-EG" : "en-US"),
      },
      {
        id: "storage",
        label: isRtl ? "مساحة التخزين" : "Storage",
        icon: HardDrive,
        current: Number(usage.storage?.current || 0),
        limit: Number(usage.storage?.limit ?? -1),
        remaining: Number(usage.storage?.remaining ?? 0),
        display: (value: number) => formatBytes(value, isRtl),
      },
    ]).filter((item) => item.limit > 0 && item.current / item.limit >= 0.8);
  }, [usage, isRtl]);

  if (!alerts.length) return null;

  const isCritical = alerts.some((item) => item.current >= item.limit * 0.95);

  return (
    <section
      dir={isRtl ? "rtl" : "ltr"}
      className={"mb-6 overflow-hidden rounded-2xl border bg-white shadow-sm " + (isCritical ? "border-rose-200" : "border-amber-200")}
      role="status"
      aria-live="polite"
    >
      <div className={"flex items-start gap-3 border-b px-5 py-4 " + (isCritical ? "border-rose-100 bg-rose-50/80" : "border-amber-100 bg-amber-50/80")}>
        <span className={"mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl " + (isCritical ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
          <AlertTriangle size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className={"text-sm font-extrabold " + (isCritical ? "text-rose-900" : "text-amber-900")}>
            {isCritical
              ? (isRtl ? "تنبيه مهم: اقتربت من الحد الأقصى لاشتراكك" : "Important: your subscription limit is nearly reached")
              : (isRtl ? "تنبيه مبكر: استهلاك المركز يقترب من حدود الباقة" : "Early warning: clinic usage is approaching plan limits")}
          </h2>
          <p className={"mt-1 text-xs leading-6 " + (isCritical ? "text-rose-800" : "text-amber-800")}>
            {isRtl
              ? "نخبرك الآن حتى تتمكن من التخطيط أو ترقية الباقة قبل تعذر إضافة مرضى أو رفع مرفقات جديدة."
              : "Plan ahead or upgrade before adding patients or uploading new attachments becomes unavailable."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2">
        {alerts.map((item) => {
          const Icon = item.icon;
          const percentage = Math.min(100, Math.round((item.current / item.limit) * 100));
          const critical = percentage >= 95;
          return (
            <div key={item.id} className="min-w-0 rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-slate-800">
                  <Icon size={17} className="shrink-0 text-[#5B50C7]" />
                  <span>{item.label}</span>
                </div>
                <strong className={"text-sm tabular-nums " + (critical ? "text-rose-700" : "text-amber-700")}>{percentage}%</strong>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={"h-full rounded-full transition-all " + (critical ? "bg-rose-500" : "bg-amber-500")} style={{ width: percentage + "%" }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>{item.display(item.current)} / {item.display(item.limit)}</span>
                <span>{isRtl ? "المتبقي: " : "Remaining: "}{item.display(Math.max(0, item.remaining))}</span>
              </div>
              {item.current >= item.limit && (
                <p className="mt-2 text-xs font-bold text-rose-700">
                  {isRtl ? "تم بلوغ الحد الأقصى لهذه الباقة." : "The maximum limit for this plan has been reached."}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
        <p className="text-[11px] leading-5 text-slate-500">
          {isRtl ? "يتم تحديث الاستهلاك تلقائيًا كل 5 دقائق وعند العودة إلى الصفحة." : "Usage refreshes every 5 minutes and when you return to this page."}
        </p>
        <Link href="/subscription" className="inline-flex items-center gap-1 rounded-lg bg-[#5B50C7] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#493FB0]">
          {isRtl ? "مراجعة الباقة والترقية" : "Review plan & upgrade"}
          <ArrowUpLeft size={14} />
        </Link>
      </div>
    </section>
  );
}
