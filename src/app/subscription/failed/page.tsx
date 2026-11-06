"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { XCircle, RefreshCw, ArrowLeft, Phone } from "lucide-react";
import { Suspense } from "react";
import { Loader } from "@/components/Loader";
import { useLanguage } from "@/lib/LanguageContext";

function FailedContent() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const params = useSearchParams();
  const orderId = params ? params.get("order") : null;
  const reason  = params ? params.get("reason") : null;

  const reasonText =
    reason === "declined"
      ? (isRtl ? "تم رفض البطاقة من قِبل البنك. تأكد من صحة البيانات أو جرب بطاقة أخرى." : "The bank declined the card. Check the details or try another card.")
      : reason === "invalid"
      ? (isRtl ? "حدث خطأ في التحقق من الدفع. يرجى المحاولة مجدداً." : "Payment verification failed. Please try again.")
      : (isRtl ? "لم تكتمل عملية الدفع. يرجى المحاولة مرة أخرى." : "The payment was not completed. Please try again.");

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-rose-50 flex items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-full max-w-md text-center space-y-6">

        {/* Failed Icon */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-rose-500 flex items-center justify-center shadow-xl shadow-red-100">
            <XCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-slate-800">{isRtl ? "فشلت عملية الدفع" : "Payment Failed"}</h1>
          <p className="text-slate-500 text-sm">{reasonText}</p>
        </div>

        {/* Error Info */}
        <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm text-right space-y-3">
          <h3 className="text-sm font-extrabold text-slate-700 border-b pb-2">{isRtl ? "تفاصيل المشكلة" : "Problem Details"}</h3>
          <div className="space-y-2 text-xs text-slate-600">
            {orderId && (
              <div className="flex justify-between">
                <span className="text-slate-400">{isRtl ? "رقم الطلب" : "Order Number"}</span>
                <span className="font-mono font-bold text-slate-700">#{orderId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400">{isRtl ? "الحالة" : "Status"}</span>
              <span className="font-bold text-red-500">{isRtl ? "مرفوض ✗" : "Declined ✗"}</span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-right mt-2">
            <p className="text-[11px] font-bold text-amber-700 mb-1.5">{isRtl ? "نصائح للحل:" : "Troubleshooting Tips:"}</p>
            <ul className="space-y-1 text-[10px] text-amber-600 list-disc list-inside">
              <li>{isRtl ? "تأكد من رقم البطاقة وتاريخ الانتهاء والـ CVV" : "Check the card number, expiry date, and CVV"}</li>
              <li>{isRtl ? "تأكد من توفر رصيد كافٍ في البطاقة" : "Make sure the card has sufficient funds"}</li>
              <li>{isRtl ? "قد تحتاج لتفعيل خاصية الشراء أونلاين من البنك" : "Online purchases may need to be enabled by your bank"}</li>
              <li>{isRtl ? "جرب بطاقة أخرى أو تواصل مع البنك" : "Try another card or contact your bank"}</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Link
            href="/subscription"
            className="w-full bg-gradient-to-r from-[#0d8a8a] to-cyan-500 text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Link>
          <Link
            href="/"
            className="w-full bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-2xl text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            العودة للوحة التحكم
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Phone className="w-3 h-3" />
          للمساعدة: تواصل مع دعم Prime Physio
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader size={32} color="#f87171" /></div>}>
      <FailedContent />
    </Suspense>
  );
}
