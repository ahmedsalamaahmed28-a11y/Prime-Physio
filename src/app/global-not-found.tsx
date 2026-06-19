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
                <h1 className="text-9xl font-bold text-purple-400">404</h1>
                <h1 className="text-6xl font-medium py-8">عذراً! الصفحة غير موجودة</h1>
                <p className="text-2xl pb-8 px-12 font-medium">
                  عذراً، الصفحة التي تبحث عنها غير موجودة. ربما تم نقلها أو حذفها.
                </p>
                <Link
                  href="/"
                  className="inline-block bg-gradient-to-l from-purple-400 to-blue-500 hover:from-pink-500 hover:to-orange-500 text-white font-semibold px-6 py-3 rounded-md ml-3 transition-all duration-300"
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
        <style>{`
          .text-9xl { font-size: 14rem; }
          @media (max-width: 645px) {
            .text-9xl { font-size: 5.75rem; }
            .text-6xl { font-size: 1.75rem; }
            .text-2xl { font-size: 1rem; line-height: 1.2rem; }
            .py-8 { padding-top: 1rem; padding-bottom: 1rem; }
            .px-6 { padding-left: 1.2rem; padding-right: 1.2rem; }
            .ml-3 { margin-left: 0.5rem; }
            .px-12 { padding-left: 1rem; padding-right: 1rem; }
          }
        `}</style>
      </body>
    </html>
  );
}
