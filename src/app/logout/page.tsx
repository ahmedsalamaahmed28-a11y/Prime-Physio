"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

export default function LogoutPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 animate-bounce">
        <LogOut className="w-8 h-8" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">{isRtl ? "جاري تسجيل الخروج..." : "Signing out..."}</h1>
        <p className="text-sm text-muted-foreground">{isRtl ? "شكراً لاستخدامك Prime Physio. سنقوم بإعادة توجيهك الآن." : "Thank you for using Prime Physio. You will be redirected shortly."}</p>
      </div>
    </div>
  );
}
