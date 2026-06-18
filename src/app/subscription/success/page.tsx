"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Crown, ArrowLeft, Download } from "lucide-react";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const orderId = params ? params.get("order") : null;
  const txId    = params ? params.get("tx") : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md text-center space-y-6">

        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#4F46BA] to-[#7c3aed] flex items-center justify-center shadow-xl shadow-emerald-200">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
              <Crown className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800">تم الدفع بنجاح! 🎉</h1>
          <p className="text-slate-500 text-sm">
            اشتراكك في Prime Physio تم تفعيله بنجاح. يمكنك الآن الاستمتاع بجميع مميزات خطتك.
          </p>
        </div>

        {/* Receipt Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-right space-y-3">
          <h3 className="text-sm font-extrabold text-slate-700 border-b pb-2">تفاصيل الدفع</h3>
          <div className="space-y-2 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">رقم الطلب</span>
              <span className="font-mono font-bold text-slate-700">#{orderId || "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">رقم العملية</span>
              <span className="font-mono font-bold text-slate-700">#{txId || "---"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">الحالة</span>
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                مدفوع ✓
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">طريقة الدفع</span>
              <span className="font-bold">Paymob — بطاقة بنكية</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/subscription"
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
          >
            <Crown className="w-4 h-4" />
            عرض خطة الاشتراك
          </Link>
          <Link
            href="/"
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>
        </div>

        <p className="text-[10px] text-slate-400">
          تم إرسال إيصال الدفع على بريدك الإلكتروني المسجل
        </p>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-[#4F46BA] border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
