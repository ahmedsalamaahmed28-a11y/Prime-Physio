"use client";

import { useState, useEffect } from "react";
import { Building, Clock, MapPin, Phone, Save, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const translateDay = (day: string, isRtl: boolean) => {
  if (isRtl) return day;
  const map: Record<string, string> = {
    "الأحد": "Sunday",
    "الإثنين": "Monday",
    "الثلاثاء": "Tuesday",
    "الأربعاء": "Wednesday",
    "الخميس": "Thursday",
    "الجمعة": "Friday",
    "السبت": "Saturday",
  };
  return map[day] || day;
};

export default function ClinicSettingsPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { user } = useAuth();
  const clinicId = user?.clinicId;

  const [clinicName, setClinicName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [workingHours, setWorkingHours] = useState("");
  const [saved, setSaved] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<any[]>([]);

  // Load settings from Supabase
  useEffect(() => {
    const defaultWeeklyHours = [
      { day: "الأحد", from: "09:00 AM", to: "05:00 PM", isOpen: true },
      { day: "الإثنين", from: "09:00 AM", to: "05:00 PM", isOpen: true },
      { day: "الثلاثاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
      { day: "الأربعاء", from: "09:00 AM", to: "05:00 PM", isOpen: true },
      { day: "الخميس", from: "09:00 AM", to: "05:00 PM", isOpen: true },
      { day: "الجمعة", from: "09:00 AM", to: "05:00 PM", isOpen: false },
      { day: "السبت", from: "09:00 AM", to: "05:00 PM", isOpen: false },
    ];

    async function loadSupabaseSettings() {
      const { data, error } = await supabase
        .from("clinic_settings")
        .select("*")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      if (error) {
        console.error("Failed to load clinic settings from Supabase", error);
      }

      setClinicName(data?.clinic_name || "Prime Physio Clinic");
      setPhone(data?.phone || "0114002020");
      setAddress(data?.address || "Main branch");
      setWorkingHours(data?.working_hours || "09:00 AM - 09:00 PM");

      const branches = Array.isArray(data?.branches) ? data.branches : [];
      const mainBranch = branches.find((b: any) => b.id === "main") || branches[0];
      setWeeklyHours(mainBranch?.hours || defaultWeeklyHours);
    }

    loadSupabaseSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("clinic_settings").upsert({
      clinic_id: clinicId,
      clinic_name: clinicName,
      phone,
      address,
      working_hours: workingHours,
      branches: [{ id: "main", name: clinicName, phone, address, hours: weeklyHours }],
    }, { onConflict: "clinic_id" });

    if (error) {
      console.error("Failed to save clinic settings to Supabase", error);
      alert(isRtl ? "فشل حفظ الإعدادات" : "Failed to save settings");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className={`flex flex-col gap-2 ${isRtl ? "" : "text-left"}`}>
        <h1 className={`text-2xl font-bold text-slate-800 flex items-center gap-2 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
          <div className="bg-indigo-50 p-2 rounded-xl">
            <Building className="w-6 h-6 text-[#4F46BA]" />
          </div>
          {isRtl ? "إعدادات العيادة" : "Clinic Settings"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{isRtl ? "إدارة تفاصيل المركز الطبي وساعات العمل والفروع" : "Manage medical center details, working hours, and branches"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Basic Info form */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className={`text-base font-bold flex items-center gap-2 text-slate-800 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
              <Building className="w-5 h-5 text-[#4F46BA]" />
              {isRtl ? "بيانات تعريف المركز" : "Center Identification Data"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className={`space-y-4 ${isRtl ? "" : "text-left"}`}>
              <div className={`flex gap-6 items-start border border-slate-100 p-4 rounded-xl bg-slate-50/50 ${isRtl ? "" : "flex-row-reverse"}`}>
                <div className="w-24 h-24 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#4F46BA] transition-colors relative overflow-hidden group">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <UploadCloud className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "شعار العيادة (Logo)" : "Clinic Logo"}</label>
                  <p className="text-[10px] text-slate-500 mb-2">{isRtl ? "يفضل خلفية شفافة (PNG) بنسبة مربعة." : "Preferably a transparent background (PNG) in square aspect ratio."}</p>
                  <Button type="button" variant="outline" className="h-8 text-xs font-bold border-slate-200 hover:bg-slate-100 hover:text-slate-800">{isRtl ? "تغيير الشعار" : "Change Logo"}</Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{isRtl ? "اسم العيادة / المركز" : "Clinic / Center Name"}</label>
                <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} required className={`focus-visible:ring-[#4F46BA] rounded-xl ${isRtl ? "" : "text-left"}`} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "رقم الجوال الرئيسي" : "Main Phone Number"}</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} required className={`focus-visible:ring-[#4F46BA] rounded-xl ${isRtl ? "" : "text-left"}`} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "العنوان الفعلي" : "Physical Address"}</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} required className={`focus-visible:ring-[#4F46BA] rounded-xl ${isRtl ? "" : "text-left"}`} />
                </div>
              </div>

              <div className={`pt-2 flex justify-between items-center ${isRtl ? "" : "flex-row-reverse"}`}>
                {saved && (
                  <span className={`text-xs text-emerald-600 font-medium flex items-center gap-1 ${isRtl ? "" : "flex-row-reverse"}`}>
                    <Check className="w-4 h-4" />
                    {isRtl ? "تم حفظ الإعدادات بنجاح!" : "Settings saved successfully!"}
                  </span>
                )}
                <Button type="submit" className={`bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] hover:from-[#4338ca] hover:to-[#6d28d9] text-white ${isRtl ? "mr-auto" : "ml-auto"} rounded-xl gap-1.5 font-bold px-6 shadow-md transition-all active:scale-95 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <Save className="w-4 h-4" />
                  {isRtl ? "حفظ التغييرات" : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Working Hours sidebar */}
        <Card className="lg:col-span-1 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className={`text-base font-bold flex items-center gap-2 text-slate-800 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
              <Clock className="w-5 h-5 text-[#4F46BA]" />
              {isRtl ? "ساعات وأيام العمل" : "Working Hours & Days"}
            </CardTitle>
          </CardHeader>
          <CardContent className={`pt-6 space-y-4 text-sm ${isRtl ? "" : "text-left"}`}>
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-700 block">{isRtl ? "ساعات العمل اليومية" : "Daily Working Hours"}</span>
              <Input value={workingHours} onChange={(e) => setWorkingHours(e.target.value)} className={`focus-visible:ring-[#4F46BA] rounded-xl ${isRtl ? "" : "text-left"}`} />
            </div>

            <div className="space-y-2 border-t pt-4">
              <span className="text-xs font-bold text-slate-700 block mb-2">{isRtl ? "أيام العمل الأسبوعية" : "Weekly Working Days"}</span>
              {weeklyHours.map((item) => (
                <div key={item.day} className={`flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0 ${isRtl ? "" : "flex-row-reverse"}`}>
                  <span className="font-semibold text-slate-700">{translateDay(item.day, isRtl)}</span>
                  <span className={`text-xs ${item.isOpen ? "text-slate-500" : "text-rose-600 font-bold"}`}>
                    {item.isOpen ? `${item.from} - ${item.to}` : (isRtl ? "مغلق" : "Closed")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
