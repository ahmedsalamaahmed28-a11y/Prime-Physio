"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Settings, Globe, Shield, Bell, Database, Save, Loader2 } from "lucide-react";

interface PlatformSettings {
  platform_name: string;
  support_email: string;
  allow_signups: boolean;
  default_trial_days: number;
}

export default function PlatformSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [settings, setSettings] = useState<PlatformSettings>({
    platform_name: "",
    support_email: "",
    allow_signups: true,
    default_trial_days: 14,
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (user && user.roleKey !== "platform_admin") {
      router.replace("/");
    } else if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      } else {
        setMessage({ text: "فشل في تحميل الإعدادات", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "حدث خطأ غير متوقع", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setMessage({ text: "تم حفظ الإعدادات بنجاح", type: "success" });
      } else {
        const errorData = await res.json();
        setMessage({ text: errorData.error || "فشل في الحفظ", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: "حدث خطأ أثناء الحفظ", type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">إعدادات النظام</h1>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving || loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          حفظ التغييرات
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* General Settings */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start gap-6">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
            <Globe className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">الإعدادات العامة</h3>
              <p className="text-sm text-slate-500">تعديل اسم المنصة وبريد الدعم الفني.</p>
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">اسم المنصة</label>
                  <input
                    type="text"
                    value={settings.platform_name}
                    onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">بريد الدعم الفني</label>
                  <input
                    type="email"
                    value={settings.support_email}
                    onChange={(e) => setSettings({...settings, support_email: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Security & Access Settings */}
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row items-start gap-6">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Shield className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">إعدادات التسجيل والاشتراكات</h3>
              <p className="text-sm text-slate-500">التحكم في تسجيل العيادات الجديدة والفترات التجريبية.</p>
            </div>
            
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">أيام الفترة التجريبية الافتراضية</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.default_trial_days}
                    onChange={(e) => setSettings({...settings, default_trial_days: parseInt(e.target.value) || 0})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5 flex items-center justify-between h-full pt-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">السماح بتسجيل عيادات جديدة</span>
                    <span className="text-xs text-slate-500">إتاحة إنشاء حسابات عبر صفحة Signup</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={settings.allow_signups}
                      onChange={(e) => setSettings({...settings, allow_signups: e.target.checked})}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coming Soon Sections */}
        <div className="p-6 border-b border-slate-100 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer opacity-75">
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6 text-amber-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">الإشعارات المركزية</h3>
            <p className="text-sm text-slate-500 mb-3">إرسال إشعارات وتنبيهات لجميع العيادات أو عيادات محددة (System Broadcasts).</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">قريباً في المرحلة القادمة</span>
            </div>
          </div>
        </div>

        <div className="p-6 flex items-start gap-5 hover:bg-slate-50 transition-colors cursor-pointer opacity-75">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 text-lg mb-1">النسخ الاحتياطي (Backups)</h3>
            <p className="text-sm text-slate-500 mb-3">إعدادات النسخ الاحتياطي لقواعد البيانات واسترجاع البيانات المحذوفة.</p>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-md">يدار حالياً عبر Supabase Dashboard</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
