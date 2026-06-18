"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push("/");
    }, 2000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4" dir="rtl">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 animate-bounce">
        <LogOut className="w-8 h-8" style={{ stroke: "url(#purpleGrad)" }} />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800">جاري تسجيل الخروج...</h1>
        <p className="text-sm text-muted-foreground">شكراً لاستخدامك Prime Physio. سنقوم بإعادة توجيهك الآن.</p>
      </div>
    </div>
  );
}
