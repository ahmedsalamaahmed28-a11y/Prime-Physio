"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";

type PaymentStatus = "loading" | "pending" | "paid" | "failed" | "not_found";

export default function SubscriptionResultPage() {
  const [reference, setReference] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [planCode, setPlanCode] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setReference(new URLSearchParams(window.location.search).get("reference") || "");
  }, []);

  useEffect(() => {
    if (!reference) return;
    let active = true;
    let count = 0;
    const check = async () => {
      try {
        const response = await fetch("/api/subscription/status?reference=" + encodeURIComponent(reference), { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!active) return;
        if (!response.ok) {
          setStatus(response.status === 404 ? "not_found" : "pending");
        } else {
          setPlanCode(String(data.planCode || ""));
          setAmount(Number.isFinite(Number(data.amount)) ? Number(data.amount) : null);
          setStatus(data.status === "paid" ? "paid" : data.status === "failed" || data.status === "expired" ? "failed" : "pending");
        }
      } catch {
        if (active) setStatus("pending");
      }
      count += 1;
      setAttempt(count);
    };
    void check();
    const timer = window.setInterval(() => {
      if (count >= 60 || !active) {
        window.clearInterval(timer);
        return;
      }
      void check();
    }, 2500);
    return () => { active = false; window.clearInterval(timer); };
  }, [reference]);

  const isRtl = true;
  const title = status === "paid" ? "تم تفعيل اشتراكك بنجاح" : status === "failed" ? "لم تكتمل عملية الدفع" : status === "not_found" ? "تعذر العثور على طلب الدفع" : "جارٍ تأكيد عملية الدفع";
  const description = status === "paid"
    ? "تم استلام تأكيد الدفع من Paymob وتفعيل الباقة على المركز."
    : status === "failed"
      ? "لم يتم اعتماد الدفع، ولم يتم تفعيل الباقة المدفوعة. يمكنك المحاولة مرة أخرى من صفحة الاشتراك."
      : status === "not_found"
        ? "تأكد من تسجيل الدخول بالحساب الذي بدأ عملية الدفع، ثم افتح صفحة الاشتراك."
        : "ننتظر إشعار التأكيد الآمن من بوابة الدفع. لا تعتمد حالة الدفع على صفحة الرجوع وحدها.";

  return (
    <main dir={isRtl ? "rtl" : "ltr"} className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-9">
        <div className={"mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full " + (status === "paid" ? "bg-emerald-50 text-emerald-600" : status === "failed" || status === "not_found" ? "bg-red-50 text-red-600" : "bg-[#F1EFFF] text-[#5B50C7]")}>
          {status === "paid" ? <CheckCircle2 className="h-9 w-9" /> : status === "failed" || status === "not_found" ? <AlertCircle className="h-9 w-9" /> : status === "loading" ? <Loader2 className="h-9 w-9 animate-spin" /> : <Clock className="h-9 w-9" />}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
        {status === "paid" && <div className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{planCode.toUpperCase()} · {amount?.toLocaleString("en-EG")} جنيه مصري</div>}
        {status === "pending" && <p className="mt-4 text-xs text-slate-400">محاولة التحقق: {attempt}/60</p>}
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href="/dashboard" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#5B50C7] px-5 text-sm font-extrabold text-white hover:bg-[#493FB0]">الانتقال إلى لوحة التحكم</Link>
          <Link href="/subscription" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 hover:border-[#5B50C7] hover:text-[#5B50C7]">العودة إلى الاشتراك</Link>
        </div>
      </section>
    </main>
  );
}
