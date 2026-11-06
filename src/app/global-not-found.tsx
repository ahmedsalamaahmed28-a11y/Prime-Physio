import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "404 - الصفحة غير موجودة",
  description: "الصفحة التي تبحث عنها غير موجودة.",
};

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="bg-gradient-to-l from-purple-300 to-blue-200 min-h-screen flex items-center justify-center">
          <div className="w-full max-w-2xl mx-auto px-4">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg pb-8">
              <div className="border-t border-gray-200 text-center pt-8">
                <h1 className="text-[5.75rem] sm:text-[14rem] font-bold text-purple-400">404</h1>
                <h1 className="text-[1.75rem] sm:text-6xl font-medium py-4 sm:py-8">عذراً! الصفحة غير موجودة</h1>
                <p className="text-base sm:text-2xl leading-5 sm:leading-normal pb-4 sm:pb-8 px-4 sm:px-12 font-medium">
                  عذراً، الصفحة التي تبحث عنها غير موجودة. ربما تم نقلها أو حذفها.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-l from-purple-400 to-blue-500 hover:from-pink-500 hover:to-orange-500 text-white font-semibold px-5 sm:px-6 py-3 rounded-md ml-2 sm:ml-3 transition-all duration-300"
                >
                  الصفحة الرئيسية
                </Link>
                <Link
                  href="/contact"
                  className="inline-block bg-gradient-to-l from-red-400 to-red-500 hover:from-red-500 hover:to-red-500 text-white font-semibold px-6 py-3 rounded-md transition-all duration-300"
                >
                  تواصل معنا
                </Link>
              </div>
            </div>
          </div>
        </div>

      </body>
    </html>
  );
}
