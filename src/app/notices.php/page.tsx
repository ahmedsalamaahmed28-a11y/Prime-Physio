"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Smartphone, Monitor, Download, CheckCircle2 } from "lucide-react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function HelpLink({ label }: { label: string }) {
  return (
    <a
      href="https://ptset.com/img/icons/help.png"
      target="_blank"
      rel="noreferrer"
      aria-label={`مساعدة: ${label}`}
      title={label}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full align-middle transition hover:bg-slate-100"
    >
      <img src="https://ptset.com/img/icons/help.png" alt="" className="h-4 w-4 object-contain" />
    </a>
  );
}

export default function NoticesPhpPage() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if ("Notification" in window) setPermission(Notification.permission);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const captureInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const installed = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", captureInstallPrompt);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstallPrompt);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const activateNotifications = async () => {
    if (!("Notification" in window)) {
      setMessage("هذا المتصفح لا يدعم إشعارات النظام.");
      return;
    }
    setIsActivating(true);
    setMessage("");
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setMessage("تم السماح لـ Prime Physio بإرسال الإشعارات على هذا الجهاز.");
      } else if (result === "denied") {
        setMessage("تم حظر الإشعارات. يمكنك السماح بها من إعدادات الموقع في المتصفح.");
      } else {
        setMessage("لم يتم تغيير إعدادات الإشعارات.");
      }
    } catch {
      setMessage("تعذر طلب إذن الإشعارات من المتصفح.");
    } finally {
      setIsActivating(false);
    }
  };

  const installApp = async () => {
    if (!installPrompt) {
      setMessage("لتثبيت التطبيق، افتح قائمة المتصفح ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».");
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setMessage("تم قبول تثبيت Prime Physio.");
    }
    setInstallPrompt(null);
  };

  return (
    <div dir="rtl" className="mx-auto w-full max-w-5xl space-y-8 text-slate-800">
      <header className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4F46BA]">
          <Bell className="h-6 w-6" />
        </div>
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-[#153B60]">
            الإشعارات <HelpLink label="الإشعارات" />
          </h1>
          <p className="mt-1 text-sm text-slate-500">ما يبلغك به Prime Physio عن حسابك ومراكزك.</p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">
          الإشعارات على هذا الجهاز <HelpLink label="الإشعارات على هذا الجهاز" />
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
          استقبل إشعارات Prime Physio على هذا الهاتف أو الكمبيوتر حتى عندما يكون Prime Physio مغلقاً.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={activateNotifications}
            disabled={isActivating || permission === "granted"}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#4F46BA] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#4338A8] disabled:cursor-not-allowed disabled:bg-emerald-600"
          >
            {permission === "granted" ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {isActivating ? "جارٍ التفعيل..." : permission === "granted" ? "تم السماح بالإشعارات" : "تفعيل"}
          </button>
          <button
            type="button"
            onClick={installApp}
            disabled={isInstalled}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:border-[#4F46BA] hover:text-[#4F46BA] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInstalled ? <CheckCircle2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {isInstalled ? "التطبيق مثبّت بالفعل" : "ثبّت التطبيق"}
          </button>
          <HelpLink label="تفعيل الإشعارات وتثبيت التطبيق" />
        </div>

        {message && (
          <p role="status" className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            <Bell className="mt-1 h-4 w-4 shrink-0 text-[#4F46BA]" />
            {message}
          </p>
        )}
        {permission === "denied" && (
          <p className="mt-3 text-xs leading-6 text-amber-700">
            الإشعارات محظورة حالياً من إعدادات المتصفح لهذا الموقع. غيّر الإذن إلى «السماح» ثم أعد تحميل الصفحة.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">
            سجل الإشعارات <HelpLink label="سجل الإشعارات" />
          </h2>
        </div>
        <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            <Bell className="h-7 w-7" />
          </div>
          <p className="text-sm font-semibold text-slate-500">لا توجد إشعارات بعد.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-[#153B60]">
          أجهزتي <HelpLink label="أجهزتي" />
        </h2>
        <div className="flex min-h-28 items-center justify-center gap-3 text-center text-sm text-slate-500">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-300">
            {typeof window !== "undefined" && /Mobi|Android|iPhone/i.test(typeof navigator !== "undefined" ? navigator.userAgent : "") ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
          </div>
          لا يوجد جهاز يستقبل إشعاراتك بعد.
        </div>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
        <p>© Prime Physio 2026</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/support" className="transition hover:text-[#4F46BA]">مركز المساعدة</Link>
          <Link href="/terms" className="transition hover:text-[#4F46BA]">الشروط</Link>
          <Link href="/privacy" className="transition hover:text-[#4F46BA]">الخصوصية</Link>
        </nav>
      </footer>
    </div>
  );
}
