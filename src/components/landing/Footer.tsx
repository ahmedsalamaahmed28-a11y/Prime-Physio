"use client";

import Link from "next/link";
import { Activity } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 pb-6 pt-10 sm:pt-12 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-6 xl:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] p-2 rounded-xl text-white">
                <Activity className="h-6 w-6" />
              </div>
              <span className="font-bold text-2xl text-white tracking-tight">
                Prime<span className="text-[#4F46E5]">Physio</span>
              </span>
            </Link>
            <p className="text-sm leading-6 text-slate-400 max-w-sm">
              نظام الإدارة السحابي المتكامل الأول المصمم خصيصاً لتلبية احتياجات أطباء ومراكز العلاج الطبيعي في العالم العربي.
            </p>
          </div>
          
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8 xl:col-span-2 xl:mt-0 xl:justify-end">
            <div className="sm:ml-auto">
              <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">الروابط السريعة</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li><Link href="#why-us" className="text-sm leading-6 hover:text-white transition-colors">لماذا نحن</Link></li>
                <li><Link href="#features" className="text-sm leading-6 hover:text-white transition-colors">المميزات</Link></li>
                <li><Link href="#pricing" className="text-sm leading-6 hover:text-white transition-colors">الأسعار</Link></li>
                <li><Link href="#faq" className="text-sm leading-6 hover:text-white transition-colors">الأسئلة الشائعة</Link></li>
              </ul>
            </div>
            
            <div className="sm:ml-auto">
              <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">التواصل والدعم</h3>
              <ul role="list" className="mt-4 space-y-3">
                <li>
                  <a href="mailto:support@primephysio.app" className="text-sm leading-6 hover:text-white transition-colors">
                    support@primephysio.app
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs leading-5 text-slate-500">
            &copy; {new Date().getFullYear()} Prime Physio. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            صُنع بحب ❤️ لمراكز العلاج الطبيعي
          </div>
        </div>
      </div>
    </footer>
  );
}
