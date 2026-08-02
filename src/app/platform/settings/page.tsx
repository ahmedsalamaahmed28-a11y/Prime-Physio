"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Settings, Globe, Shield, Bell, Database } from "lucide-react";

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.roleKey !== "platform_admin") {
      router.replace("/");
    }
  }, [user]);

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-3 mb-8">
        <Settings className="w-7 h-7 text-indigo-600" />
        <h1 className="text-2xl font-bold text-slate-800">إعدادات النظام</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        
        {/* Section 1 */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">الإعدادات العامة</h3>
            <p className="text-sm text-slate-500 mb-3">تعديل اسم المنصة، الشعارات، وروابط التواصل الاجتماعي.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">قريباً</span>
            </div>
          </div>
        </div>

        {/* Section 2 */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">إعدادات الأمان والصلاحيات</h3>
            <p className="text-sm text-slate-500 mb-3">إدارة جلسات الدخول المتعددة، متطلبات كلمات المرور، وصلاحيات مديري المنصة.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">قريباً</span>
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">الإشعارات المركزية</h3>
            <p className="text-sm text-slate-500 mb-3">إرسال إشعارات وتنبيهات لجميع العيادات أو عيادات محددة (System Broadcasts).</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">قريباً</span>
            </div>
          </div>
        </div>

        {/* Section 4 */}
        <div className="p-6 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">النسخ الاحتياطي (Backups)</h3>
            <p className="text-sm text-slate-500 mb-3">إعدادات النسخ الاحتياطي لقواعد البيانات واسترجاع البيانات المحذوفة.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">قريباً</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
