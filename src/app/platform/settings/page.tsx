"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
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
  const { language } = useLanguage();
  const isRtl = language === "ar";
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
        setMessage({ text: (isRtl ? "فشل في تحميل الإعدادات" : "Failed to load settings"), type: "error" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: (isRtl ? "حدث خطأ غير متوقع" : "An unexpected error occurred"), type: "error" });
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
        setMessage({ text: (isRtl ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully"), type: "success" });
      } else {
        const errorData = await res.json();
        setMessage({ text: errorData.error || (isRtl ? "فشل في الحفظ" : "Failed to save"), type: "error" });
      }
    } catch (err) {
      console.error(err);
      setMessage({ text: (isRtl ? "حدث خطأ أثناء الحفظ" : "An error occurred while saving"), type: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  if (!user || user.roleKey !== "platform_admin") return null;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Settings className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">{isRtl ? "إعدادات النظام" : "System Settings"}</h1>
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
              <h3 className="font-bold text-slate-800 text-lg mb-1">{isRtl ? "الإعدادات العامة" : "General Settings"}</h3>
              <p className="text-sm text-slate-500">{isRtl ? "تعديل اسم المنصة وبريد الدعم الفني." : "Edit the platform name and support email."}</p>
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400 py-4">
                <Loader2 className="w-5 h-5 animate-spin" /> جاري التحميل...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{isRtl ? "اسم المنصة" : "Platform Name"}</label>
                  <input
                    type="text"
                    value={settings.platform_name}
                    onChange={(e) => setSettings({...settings, platform_name: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{isRtl ? "بريد الدعم الفني" : "Support Email"}</label>
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
              <h3 className="font-bold text-slate-800 text-lg mb-1">{isRtl ? "إعدادات التسجيل والاشتراكات" : "Registration & Subscription Settings"}</h3>
              <p className="text-sm text-slate-500">{isRtl ? "التحكم في تسجيل العيادات الجديدة والفترات التجريبية." : "Control new clinic registrations and trial periods."}</p>
            </div>
            
            {!loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">{isRtl ? "أيام الفترة التجريبية الافتراضية" : "Default Trial Period (Days)"}</label>
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
                    <span className="text-sm font-medium text-slate-700">{isRtl ? "السماح بتسجيل عيادات جديدة" : "Allow New Clinic Signups"}</span>
                    <span className="text-xs text-slate-500">{isRtl ? "إتاحة إنشاء حسابات عبر صفحة" : "Allow account creation via"} Signup</span>
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

        {/* Broadcasts Section */}
        <div className="p-6 border-b border-slate-100 flex flex-col items-start gap-6">
          <div className="flex items-center gap-3 w-full">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg mb-1">{isRtl ? "الإشعارات المركزية (System Broadcasts)" : "Global Notifications (System Broadcasts)"}</h3>
              <p className="text-sm text-slate-500">{isRtl ? "إرسال إشعار عام يظهر لجميع المستخدمين في النظام." : "Send a system-wide announcement to all users."}</p>
            </div>
          </div>
          
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const title = (form.elements.namedItem("title") as HTMLInputElement).value;
              const message = (form.elements.namedItem("message") as HTMLTextAreaElement).value;
              
              if (!title || !message) return;
              
              try {
                const res = await fetch("/api/admin/broadcasts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ title, message }),
                });
                
                if (res.ok) {
                  setMessage({ text: (isRtl ? "تم إرسال الإشعار بنجاح" : "Notification sent successfully"), type: "success" });
                  form.reset();
                } else {
                  setMessage({ text: (isRtl ? "فشل في إرسال الإشعار" : "Failed to send notification"), type: "error" });
                }
              } catch (err) {
                setMessage({ text: (isRtl ? "حدث خطأ غير متوقع" : "An unexpected error occurred"), type: "error" });
              }
              setTimeout(() => setMessage(null), 3000);
            }} 
            className="w-full bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4"
          >
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">{isRtl ? "عنوان الإشعار" : "Notification Title"}</label>
              <input
                type="text"
                name="title"
                required
                placeholder={isRtl ? "مثال: تحديث جديد للنظام..." : "Example: New system update..."}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700">{isRtl ? "محتوى الإشعار" : "Notification Message"}</label>
              <textarea
                name="message"
                required
                rows={3}
                placeholder={isRtl ? "اكتب تفاصيل الإشعار هنا..." : "Enter notification details here..."}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              ></textarea>
            </div>
            <button 
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              إرسال الإشعار الآن
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
