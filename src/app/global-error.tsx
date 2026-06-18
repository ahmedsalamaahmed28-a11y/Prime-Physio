"use client"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html dir="rtl">
      <body>
        <div className="min-h-screen bg-gradient-to-b from-[#f8f9ff] to-white flex flex-col items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800 mb-2">
              خطأ في النظام
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              حدث خطأ جذري، يرجى تحديث الصفحة
            </p>
            <button
              onClick={() => reset()}
              className="bg-[#4F46BA] hover:bg-[#4338ca] text-white font-medium px-6 py-2.5 rounded-lg transition-all duration-200 text-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
