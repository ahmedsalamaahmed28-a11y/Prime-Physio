"use client";

import Link from "next/link";
import { Activity, Globe, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-300">
      <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 sm:pt-24 lg:px-8">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          <div className="space-y-8">
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
            <div className="flex space-x-6 space-x-reverse">
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <Globe className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <Mail className="h-5 w-5" />
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition-colors">
                <Phone className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">المنتج</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><Link href="#features" className="text-sm leading-6 hover:text-white transition-colors">المميزات</Link></li>
                  <li><Link href="#why-us" className="text-sm leading-6 hover:text-white transition-colors">لماذا نحن</Link></li>
                  <li><Link href="#pricing" className="text-sm leading-6 hover:text-white transition-colors">الأسعار</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">التحديثات</Link></li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">الشركة</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">من نحن</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">المدونة</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">الوظائف</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">اتصل بنا</Link></li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">الدعم</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">مركز المساعدة</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">شروحات فيديو</Link></li>
                  <li><Link href="#faq" className="text-sm leading-6 hover:text-white transition-colors">الأسئلة الشائعة</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">حالة النظام</Link></li>
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <h3 className="text-sm font-bold leading-6 text-white uppercase tracking-wider">قانوني</h3>
                <ul role="list" className="mt-6 space-y-4">
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">الشروط والأحكام</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">سياسة الخصوصية</Link></li>
                  <li><Link href="#" className="text-sm leading-6 hover:text-white transition-colors">سياسة ملفات الارتباط</Link></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-16 border-t border-slate-800 pt-8 sm:mt-20 flex flex-col md:flex-row justify-between items-center gap-4">
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
