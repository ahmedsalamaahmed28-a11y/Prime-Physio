"use client"
import { useEffect } from "react"
import { useLanguage } from "@/lib/LanguageContext"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { language } = useLanguage()
  const isRtl = language === "ar"

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col items-center justify-center p-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">
          {isRtl ? "حدث خطأ غير متوقع" : "Unexpected Error"}
        </h1>
        <p className="text-sm text-slate-500 mb-6">
          {isRtl ? "نأسف للإزعاج، يرجى المحاولة مرة أخرى" : "Sorry for the inconvenience, please try again"}
        </p>
        <button
          onClick={() => reset()}
          className="bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 text-sm"
        >
          {isRtl ? "إعادة المحاولة" : "Try again"}
        </button>
      </div>
    </div>
  )
}
