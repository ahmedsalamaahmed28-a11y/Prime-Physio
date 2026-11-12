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
  const [publicDescription, setPublicDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [coverUploading, setCoverUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<any[]>([]);
  
  // Backup settings
  const [googleDriveEmail, setGoogleDriveEmail] = useState("");
  const [googleDriveFolder, setGoogleDriveFolder] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);

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
      setPublicDescription(data?.public_description || "");
      setCoverUrl(data?.cover_url || "");
      setWhatsapp(data?.whatsapp || "");
      setWebsiteUrl(data?.website_url || "");
      setInstagramUrl(data?.instagram_url || "");
      setFacebookUrl(data?.facebook_url || "");
      setMapsUrl(data?.maps_url || "");

      const branches = Array.isArray(data?.branches) ? data.branches : [];
      const mainBranch = branches.find((b: any) => b.id === "main") || branches[0];
      setWeeklyHours(mainBranch?.hours || defaultWeeklyHours);
      
      setGoogleDriveEmail(data?.google_drive_email || "");
      setGoogleDriveFolder(data?.google_drive_folder_link || "");
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
      public_description: publicDescription,
      cover_url: coverUrl,
      whatsapp,
      website_url: websiteUrl,
      instagram_url: instagramUrl,
      facebook_url: facebookUrl,
      maps_url: mapsUrl,
      branches: [{ id: "main", name: clinicName, phone, address, hours: weeklyHours }],
      google_drive_email: googleDriveEmail,
      google_drive_folder_link: googleDriveFolder,
    }, { onConflict: "clinic_id" });

    if (error) {
      console.error("Failed to save clinic settings to Supabase", error);
      alert(isRtl ? "فشل حفظ الإعدادات" : "Failed to save settings");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleCoverUpload = async (file?: File) => {
    if (!file) return;
    setCoverUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "cover");
      const response = await fetch("/api/centers/upload-logo", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.url) throw new Error(payload.error || "Upload failed");
      setCoverUrl(payload.url);
    } catch (error) {
      console.error("Clinic cover upload failed:", error);
      alert(isRtl ? "تعذر رفع صورة الغلاف. حاول مرة أخرى." : "Could not upload the cover image. Please try again.");
    } finally {
      setCoverUploading(false);
    }
  };

  const handleBackupNow = async () => {
    setBackupLoading(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        // Extract filename from Content-Disposition if possible, or use default
        const contentDisposition = res.headers.get("Content-Disposition");
        let filename = "clinic_backup.json";
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="(.+)"/);
          if (filenameMatch && filenameMatch.length === 2) {
            filename = filenameMatch[1];
          }
        }
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert(isRtl ? "فشل في إنشاء النسخة الاحتياطية" : "Failed to generate backup");
      }
    } catch (err) {
      console.error(err);
      alert(isRtl ? "حدث خطأ أثناء النسخ الاحتياطي" : "An error occurred during backup");
    } finally {
      setBackupLoading(false);
    }
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

        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className={`text-base font-bold flex items-center gap-2 text-slate-800 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
              <Building className="w-5 h-5 text-[#4F46BA]" />
              {isRtl ? "صفحة المركز العامة" : "Public Center Page"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSave} className="space-y-4">
              <p className="text-xs leading-6 text-slate-500">
                {isRtl ? "هذه البيانات تظهر للزوار على رابط مركزك المستقل. ارفع غلافًا واكتب نبذة وأضف وسائل التواصل." : "These details appear to visitors on your center's public link. Add a cover, description and contact links."}
              </p>
              {coverUrl && <div className="overflow-hidden rounded-2xl border border-slate-200"><img src={coverUrl} alt="Center cover" className="h-40 w-full object-cover" /></div>}
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#4F46BA]/20 bg-violet-50 px-4 py-2.5 text-xs font-bold text-[#4F46BA]">
                  <UploadCloud className="h-4 w-4" />
                  {coverUploading ? (isRtl ? "جارٍ رفع الغلاف..." : "Uploading cover...") : (isRtl ? "رفع صورة الغلاف" : "Upload cover image")}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={coverUploading} onChange={(e) => { void handleCoverUpload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
                </label>
                {coverUrl && <Button type="button" variant="outline" className="h-9 text-xs" onClick={() => setCoverUrl("")}>{isRtl ? "إزالة الغلاف" : "Remove cover"}</Button>}
                <span className="text-[11px] text-slate-400">{isRtl ? "PNG أو JPG أو WebP — حتى 5 ميجابايت" : "PNG, JPG or WebP — up to 5 MB"}</span>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{isRtl ? "نبذة عن المركز" : "About the center"}</label>
                <textarea value={publicDescription} onChange={(e) => setPublicDescription(e.target.value)} rows={4} maxLength={1200} placeholder={isRtl ? "اكتب نبذة تعريفية تظهر للزوار..." : "Write a short introduction for visitors..."} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#4F46BA] focus:ring-4 focus:ring-[#4F46BA]/10" />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">WhatsApp</label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+201xxxxxxxxx" dir="ltr" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">{isRtl ? "رابط الموقع الإلكتروني" : "Website URL"}</label><Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://example.com" dir="ltr" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Instagram URL</label><Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." dir="ltr" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-slate-700">Facebook URL</label><Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." dir="ltr" /></div>
                <div className="space-y-1.5 md:col-span-2"><label className="text-xs font-bold text-slate-700">{isRtl ? "رابط الموقع على خرائط Google (اختياري)" : "Google Maps URL (optional)"}</label><Input value={mapsUrl} onChange={(e) => setMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." dir="ltr" /></div>
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button type="submit" className="rounded-xl bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] px-6 font-bold text-white">
                  <Save className="mr-2 h-4 w-4" /> {isRtl ? "حفظ صفحة المركز" : "Save public page"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Backup Settings Card */}
        <Card className="lg:col-span-2 shadow-xs">
          <CardHeader className="border-b pb-4">
            <CardTitle className={`text-base font-bold flex items-center gap-2 text-slate-800 ${isRtl ? "" : "flex-row-reverse justify-end"}`}>
              <UploadCloud className="w-5 h-5 text-emerald-600" />
              {isRtl ? "النسخ الاحتياطي (Google Drive)" : "Backup (Google Drive)"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className={`space-y-4 ${isRtl ? "" : "text-left"}`}>
              <p className="text-sm text-slate-500 mb-4">
                {isRtl 
                  ? "لربط النسخ الاحتياطي، يرجى إنشاء مجلد في جوجل درايف الخاص بك ووضع رابطه هنا. يمكنك تحميل نسخة احتياطية من جميع بياناتك في أي وقت." 
                  : "To connect backups, create a folder in your Google Drive and place the link here. You can download a full backup of your data at any time."}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "حساب جوجل (Email)" : "Google Account (Email)"}</label>
                  <Input 
                    value={googleDriveEmail} 
                    onChange={(e) => setGoogleDriveEmail(e.target.value)} 
                    placeholder="admin@gmail.com"
                    className={`focus-visible:ring-emerald-500 rounded-xl ${isRtl ? "" : "text-left"}`} 
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "رابط مجلد النسخ الاحتياطي" : "Backup Folder Link"}</label>
                  <Input 
                    value={googleDriveFolder} 
                    onChange={(e) => setGoogleDriveFolder(e.target.value)} 
                    placeholder="https://drive.google.com/drive/folders/..."
                    className={`focus-visible:ring-emerald-500 rounded-xl ${isRtl ? "" : "text-left"}`} 
                    dir="ltr"
                  />
                </div>
              </div>

              <div className={`pt-4 flex justify-end gap-3 ${isRtl ? "" : "flex-row-reverse"}`}>
                <Button 
                  onClick={handleSave} 
                  variant="outline"
                  className={`border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold px-6 ${isRtl ? "ml-auto" : "mr-auto"}`}
                >
                  {isRtl ? "حفظ إعدادات درايف" : "Save Drive Settings"}
                </Button>
                
                <Button 
                  onClick={handleBackupNow} 
                  disabled={backupLoading}
                  className={`bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2 font-bold px-6 shadow-md transition-all active:scale-95 flex items-center`}
                >
                  {backupLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {isRtl ? "جاري التجهيز..." : "Preparing..."}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="w-4 h-4" />
                      {isRtl ? "أخذ نسخة احتياطية الآن" : "Backup Now"}
                    </span>
                  )}
                </Button>
              </div>
            </div>
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
