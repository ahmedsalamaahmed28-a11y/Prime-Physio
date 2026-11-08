"use client";
import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";

type Attachment = { id: string; file_name: string; mime_type: string; file_size: number; category: string; notes: string | null; created_at: string; url: string | null };

export function PatientAttachmentsTab({ patientId }: { patientId: string }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission } = usePermissions();
  const [files, setFiles] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("imaging");
  const [notes, setNotes] = useState("");

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/patients/" + encodeURIComponent(patientId) + "/attachments", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not load attachments");
      setFiles(result.attachments || []);
    } catch (err: any) {
      setError(err.message || (isRtl ? "تعذر تحميل المرفقات" : "Could not load attachments"));
    } finally {
      setLoading(false);
    }
  }, [patientId, isRtl]);

  useEffect(() => { void loadFiles(); }, [loadFiles]);

  const handleUpload = async (event: any) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setError(isRtl ? "الحد الأقصى لحجم الملف 20 ميجابايت" : "Maximum file size is 20 MB");
      event.target.value = "";
      return;
    }
    const form = new FormData();
    form.append("file", file);
    form.append("category", category);
    form.append("notes", notes);
    setUploading(true);
    setError("");
    try {
      const response = await fetch("/api/patients/" + encodeURIComponent(patientId) + "/attachments", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Upload failed");
      setNotes("");
      await loadFiles();
    } catch (err: any) {
      setError(err.message || (isRtl ? "تعذر رفع الملف" : "Upload failed"));
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!window.confirm(isRtl ? "هل تريد حذف هذا المرفق نهائيًا؟" : "Delete this attachment permanently?")) return;
    try {
      const response = await fetch("/api/patients/" + encodeURIComponent(patientId) + "/attachments", {
        method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ attachmentId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Delete failed");
      setFiles((current) => current.filter((file) => file.id !== attachmentId));
    } catch (err: any) {
      setError(err.message || (isRtl ? "تعذر حذف الملف" : "Could not delete file"));
    }
  };

  const label = (value: string) => ({
    imaging: isRtl ? "أشعة" : "Imaging",
    lab: isRtl ? "تحاليل" : "Lab",
    report: isRtl ? "تقرير" : "Report",
    other: isRtl ? "أخرى" : "Other",
  }[value] || value);

  return (
    <div className="pt-4 space-y-5">
      {hasPermission("edit_emr") && <Card className="border-dashed border-2 border-teal-200 bg-teal-50/30">
        <CardContent className="py-6 px-4 flex flex-col gap-4">
          <div>
            <p className="text-sm font-bold text-slate-800">{isRtl ? "إضافة أشعة أو تحاليل أو تقرير" : "Upload imaging, lab results or reports"}</p>
            <p className="text-xs text-slate-500">{isRtl ? "PDF أو JPG أو PNG أو WebP — حتى 20 ميجابايت" : "PDF, JPG, PNG or WebP — up to 20 MB"}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{isRtl ? "نوع الملف" : "Category"}</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="imaging">{label("imaging")}</option><option value="lab">{label("lab")}</option><option value="report">{label("report")}</option><option value="other">{label("other")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label>{isRtl ? "ملاحظة (اختياري)" : "Note (optional)"}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
            </div>
          </div>
          <label className="inline-flex w-fit">
            <span className="inline-flex items-center justify-center rounded-xl text-sm font-bold bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white h-10 px-6 cursor-pointer">
              {uploading ? (isRtl ? "جارٍ الرفع..." : "Uploading...") : (isRtl ? "اختيار ملف ورفعه" : "Choose and upload file")}
            </span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={handleUpload} />
          </label>
        </CardContent>
      </Card>}
      {error && <p role="alert" className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-3">{error}</p>}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-700">{isRtl ? "المرفقات الطبية (" + files.length + ")" : "Medical attachments (" + files.length + ")"}</h3>
        <Button variant="outline" size="sm" onClick={loadFiles} disabled={loading}>{isRtl ? "تحديث" : "Refresh"}</Button>
      </div>
      {loading ? <Card><CardContent className="py-8 text-center text-sm text-slate-500">{isRtl ? "جارٍ تحميل المرفقات..." : "Loading attachments..."}</CardContent></Card>
      : files.length === 0 ? <Card><CardContent className="py-10 text-center text-sm text-slate-500">{isRtl ? "لا توجد مرفقات محفوظة لهذا المريض حتى الآن." : "No attachments saved for this patient yet."}</CardContent></Card>
      : <div className="space-y-2">{files.map((file) => <Card key={file.id} className="border-slate-100">
        <CardContent className="py-3 px-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center text-xl">{file.mime_type === "application/pdf" ? "📄" : "🖼️"}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">{file.file_name}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="outline">{label(file.category)}</Badge>
              <span className="text-[11px] text-slate-500">{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
              <span className="text-[11px] text-slate-500">{new Date(file.created_at).toLocaleDateString(isRtl ? "ar-EG" : "en-US")}</span>
            </div>
            {file.notes && <p className="text-xs text-slate-500 mt-1">{file.notes}</p>}
          </div>
          {file.url && <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-indigo-700 underline">{isRtl ? "فتح" : "Open"}</a>}
          {hasPermission("delete_emr") && <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => handleDelete(file.id)}><Trash2 className="w-4 h-4" /></Button>}
        </CardContent>
      </Card>)}</div>}
    </div>
  );
}
