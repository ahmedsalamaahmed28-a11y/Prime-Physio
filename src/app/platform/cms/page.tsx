"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FileText, Save, Loader2, CreditCard } from "lucide-react";

export default function PlatformCMSPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // For Hero Section Edit
  const [heroContent, setHeroContent] = useState<any>(null);

  // For Pricing Edit (using raw JSON for now due to complexity, or we could build a full form)
  const [pricingJson, setPricingJson] = useState("");

  useEffect(() => {
    if (user && user.roleKey !== "platform_admin") {
      router.replace("/");
    } else if (user) {
      fetchContent();
    }
  }, [user]);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/admin/content");
      if (res.ok) {
        const data = await res.json();
        setContent(data.content);
        if (data.content.hero) setHeroContent(data.content.hero);
        if (data.content.pricing) setPricingJson(JSON.stringify(data.content.pricing, null, 2));
      } else {
        setMessage({ text: "فشل في تحميل المحتوى", type: "error" });
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
      let parsedPricing = content.pricing;
      try {
        parsedPricing = JSON.parse(pricingJson);
      } catch (e) {
        setMessage({ text: "خطأ في صيغة JSON للباقات", type: "error" });
        setSaving(false);
        return;
      }

      const updates = {
        hero: heroContent,
        pricing: parsedPricing
      };

      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        setMessage({ text: "تم حفظ التعديلات بنجاح", type: "success" });
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <FileText className="w-7 h-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-slate-800">إدارة محتوى المنصة (CMS)</h1>
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

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-slate-800">قسم البداية (Hero Section)</h2>
            </div>
            
            {heroContent && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">النص الترويجي (Badge)</label>
                  <input
                    type="text"
                    value={heroContent.badgeText || ""}
                    onChange={(e) => setHeroContent({...heroContent, badgeText: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">العنوان الرئيسي (الجزء الأول)</label>
                  <input
                    type="text"
                    value={heroContent.titlePart1 || ""}
                    onChange={(e) => setHeroContent({...heroContent, titlePart1: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-slate-700">العنوان الرئيسي (اللون المميز)</label>
                  <input
                    type="text"
                    value={heroContent.titlePart2 || ""}
                    onChange={(e) => setHeroContent({...heroContent, titlePart2: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">الوصف (Description)</label>
                  <textarea
                    rows={3}
                    value={heroContent.description || ""}
                    onChange={(e) => setHeroContent({...heroContent, description: e.target.value})}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pricing Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-slate-800">الباقات والأسعار (Pricing Plans)</h2>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4">يمكنك تعديل أسعار ومميزات الباقات هنا باستخدام صيغة JSON المتقدمة حالياً.</p>
              <textarea
                dir="ltr"
                rows={15}
                value={pricingJson}
                onChange={(e) => setPricingJson(e.target.value)}
                className="w-full font-mono text-sm border border-slate-200 rounded-lg p-4 bg-slate-900 text-green-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
