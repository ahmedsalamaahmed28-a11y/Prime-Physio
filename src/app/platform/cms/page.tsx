"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { defaultTranslations } from "@/lib/LanguageContext";
import { FileText, Save, Loader2, CreditCard, Plus, Trash2, Settings, MessageSquare, Search } from "lucide-react";

export default function PlatformCMSPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [content, setContent] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // States for CMS sections
  const [heroContent, setHeroContent] = useState<any>(null);
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [brandingContent, setBrandingContent] = useState<any>({
    brandName: "PRIME PHYSIO",
    sidebarTitle: "Clinic Management"
  });
  const [translationsContent, setTranslationsContent] = useState<Record<"ar" | "en", Record<string, string>>>({ ar: {}, en: {} });
  const [searchQuery, setSearchQuery] = useState("");

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
        if (data.content.pricing && Array.isArray(data.content.pricing)) {
          setPricingPlans(data.content.pricing);
        }
        if (data.content.branding) {
          setBrandingContent(data.content.branding);
        }
        if (data.content.translations) {
          setTranslationsContent(data.content.translations);
        }
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
      const updates = {
        hero: heroContent,
        pricing: pricingPlans,
        branding: brandingContent,
        translations: translationsContent
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

  // Helpers for Pricing Form Builder
  const updatePlan = (index: number, field: string, value: any) => {
    const newPlans = [...pricingPlans];
    newPlans[index][field] = value;
    setPricingPlans(newPlans);
  };

  const addFeature = (planIndex: number) => {
    const newPlans = [...pricingPlans];
    if (!newPlans[planIndex].features) newPlans[planIndex].features = [];
    newPlans[planIndex].features.push("");
    setPricingPlans(newPlans);
  };

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    const newPlans = [...pricingPlans];
    newPlans[planIndex].features[featureIndex] = value;
    setPricingPlans(newPlans);
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    const newPlans = [...pricingPlans];
    newPlans[planIndex].features.splice(featureIndex, 1);
    setPricingPlans(newPlans);
  };

  const addPlan = () => {
    setPricingPlans([...pricingPlans, {
      name: "باقة جديدة",
      description: "وصف الباقة",
      price: "0",
      isPopular: false,
      features: []
    }]);
  };

  const removePlan = (index: number) => {
    const newPlans = [...pricingPlans];
    newPlans.splice(index, 1);
    setPricingPlans(newPlans);
  };

  const updateTranslation = (lang: "ar" | "en", key: string, value: string) => {
    setTranslationsContent(prev => ({
      ...prev,
      [lang]: {
        ...(prev[lang] || {}),
        [key]: value
      }
    }));
  };

  // Filter translations for the editor
  const filteredTranslationKeys = Object.keys(defaultTranslations.ar).filter(key => 
    key.toLowerCase().includes(searchQuery.toLowerCase()) || 
    defaultTranslations.ar[key].toLowerCase().includes(searchQuery.toLowerCase()) ||
    (translationsContent.ar && translationsContent.ar[key]?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
          
          {/* Platform Branding Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-slate-800">هوية المنصة الداخلية (Platform Branding)</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <p className="text-sm text-slate-500 mb-2">تستخدم هذه الإعدادات لتخصيص لوحة التحكم الداخلية للمشتركين (مثل القائمة الجانبية).</p>
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">اسم المنصة (Brand Name)</label>
                <input
                  type="text"
                  value={brandingContent?.brandName || ""}
                  onChange={(e) => setBrandingContent({...brandingContent, brandName: e.target.value})}
                  placeholder="PRIME PHYSIO"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-slate-700">عنوان القائمة الجانبية (Sidebar Title)</label>
                <input
                  type="text"
                  value={brandingContent?.sidebarTitle || ""}
                  onChange={(e) => setBrandingContent({...brandingContent, sidebarTitle: e.target.value})}
                  placeholder="Clinic Management"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-500" />
              <h2 className="font-bold text-slate-800">قسم البداية للصفحة الرئيسية (Hero Section)</h2>
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

          {/* Pricing Section - Dynamic Builder */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-slate-800">الباقات والأسعار (Pricing Plans)</h2>
              </div>
              <button 
                onClick={addPlan}
                className="text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> إضافة باقة
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              {pricingPlans.map((plan, planIdx) => (
                <div key={planIdx} className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative">
                  <button 
                    onClick={() => removePlan(planIdx)}
                    className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف الباقة"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  <h3 className="font-bold text-lg mb-4 text-slate-800">باقة #{planIdx + 1}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">اسم الباقة</label>
                      <input
                        type="text"
                        value={plan.name || ""}
                        onChange={(e) => updatePlan(planIdx, "name", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-slate-700">السعر (شهرياً - ج.م)</label>
                      <input
                        type="text"
                        value={plan.price || ""}
                        onChange={(e) => updatePlan(planIdx, "price", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <label className="block text-sm font-medium text-slate-700">وصف قصير</label>
                      <input
                        type="text"
                        value={plan.description || ""}
                        onChange={(e) => updatePlan(planIdx, "description", e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="mb-4 flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id={`popular-${planIdx}`}
                      checked={plan.isPopular || false}
                      onChange={(e) => updatePlan(planIdx, "isPopular", e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor={`popular-${planIdx}`} className="text-sm font-medium text-slate-700 cursor-pointer">
                      تمييز هذه الباقة (الأكثر طلباً)
                    </label>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-bold text-slate-800">المميزات (Features)</label>
                      <button 
                        onClick={() => addFeature(planIdx)}
                        className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> إضافة ميزة
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {plan.features?.map((feature: string, featureIdx: number) => (
                        <div key={featureIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => updateFeature(planIdx, featureIdx, e.target.value)}
                            placeholder="اكتب الميزة هنا..."
                            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => removeFeature(planIdx, featureIdx)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="حذف الميزة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(!plan.features || plan.features.length === 0) && (
                        <p className="text-sm text-slate-500 italic">لا توجد مميزات مضافة بعد.</p>
                      )}
                    </div>
                  </div>

                </div>
              ))}
              
              {pricingPlans.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  لا توجد باقات لعرضها. اضغط على &quot;إضافة باقة&quot; للبدء.
                </div>
              )}
            </div>
          </div>

          {/* UI Translations Section */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5 text-slate-500" />
                <h2 className="font-bold text-slate-800">تخصيص نصوص وأزرار النظام (UI Translations)</h2>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث عن نص للتعجيل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-4 pr-9 py-1.5 border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-6">
                يمكنك هنا تغيير أي نص يظهر داخل لوحة تحكم المنصة (مثل عناوين الأزرار، نصوص القائمة الجانبية، رسائل النجاح أو الخطأ). اترك الحقل فارغاً للعودة للنص الافتراضي.
              </p>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {filteredTranslationKeys.map(key => (
                  <div key={key} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="col-span-1 md:col-span-2">
                      <span className="text-xs font-mono bg-slate-200 text-slate-600 px-2 py-0.5 rounded">{key}</span>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">النص العربي</label>
                      <input
                        type="text"
                        placeholder={defaultTranslations.ar[key]}
                        value={translationsContent.ar?.[key] ?? ""}
                        onChange={(e) => updateTranslation("ar", key, e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700">النص الإنجليزي (English)</label>
                      <input
                        dir="ltr"
                        type="text"
                        placeholder={defaultTranslations.en[key] || ""}
                        value={translationsContent.en?.[key] ?? ""}
                        onChange={(e) => updateTranslation("en", key, e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-left"
                      />
                    </div>
                  </div>
                ))}

                {filteredTranslationKeys.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد نتائج مطابقة للبحث.
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
