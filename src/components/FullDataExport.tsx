"use client";

import { useMemo, useState } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, ShieldCheck, XCircle } from "lucide-react";

type ExportBackup = {
  clinic: Record<string, any>;
  clinicId: string;
  exportedAt: string;
  tableCounts: Record<string, number>;
  totalRows: number;
  tables: Record<string, Record<string, any>[]>;
};

const GROUPS = [
  { id: "center", ar: "بيانات المركز والإعدادات", en: "Center & settings", tables: ["clinic_settings", "branches", "clinic_services", "clinical_protocols", "exercises"] },
  { id: "cases", ar: "الحالات والتقييمات والبرامج العلاجية", en: "Cases, evaluations & programs", tables: ["patients", "patient_evaluations", "assessments", "patient_programs", "patient_nutrition", "patient_risks", "soap_notes", "treatment_plans", "rom_assessments", "mmt_assessments", "gait_tests", "balance_tests", "special_tests", "progress_tracking", "discharges", "referrals", "patient_attachments"] },
  { id: "sessions", ar: "الجلسات والمواعيد", en: "Sessions & appointments", tables: ["sessions", "appointments", "waitlist", "recovery_logs"] },
  { id: "money", ar: "الأموال والفواتير والمطالبات", en: "Money, invoices & claims", tables: ["invoices", "insurance_claims", "daily_reports", "executive_reports"] },
  { id: "staff", ar: "الموظفون والرواتب والحضور", en: "Staff, payroll & attendance", tables: ["staff", "hr_attendance", "payroll_drafts"] },
  { id: "other", ar: "السجلات التشغيلية الأخرى", en: "Other operational records", tables: ["audit_logs", "notifications", "leads", "marketing_campaigns", "peer_reviews", "protocol_licenses", "subscriptions"] },
] as const;

const PERIOD_TABLES = new Set([
  "sessions", "appointments", "waitlist", "recovery_logs", "invoices", "insurance_claims",
  "daily_reports", "executive_reports", "hr_attendance", "payroll_drafts", "assessments",
  "patient_evaluations", "rom_assessments", "mmt_assessments", "gait_tests", "balance_tests",
  "special_tests", "soap_notes", "progress_tracking", "discharges", "referrals",
]);

const DATE_FIELDS = ["session_date", "appointment_date", "date", "paid_at", "payment_date", "issued_at", "created_at", "updated_at", "attendance_date", "start_time", "scheduled_at", "evaluation_date"];

function xmlEscape(value: unknown) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
  return '"' + text.replace(/"/g, '""') + '"';
}
function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "\uFEFFلا توجد بيانات\r\n";
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return "\uFEFF" + [keys.map(csvCell).join(","), ...rows.map((row) => keys.map((key) => csvCell(row[key])).join(","))].join("\r\n");
}
function toExcelXml(rows: Record<string, any>[], title: string) {
  const keys = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const rowXml = (values: unknown[]) => "<Row>" + values.map((value) => {
    const raw = value == null ? "" : typeof value === "object" ? JSON.stringify(value) : String(value);
    const isDate = typeof value === "string" && /^\\d{4}-\\d{2}-\\d{2}(?:T.*)?$/.test(value) && !Number.isNaN(Date.parse(value));
    const type = typeof value === "number" ? "Number" : isDate ? "DateTime" : "String";
    const output = isDate ? new Date(value as string).toISOString() : raw;
    return `<Cell><Data ss:Type="${type}">${xmlEscape(output)}</Data></Cell>`;
  }).join("") + "</Row>";
  const body = [rowXml(keys), ...rows.map((row) => rowXml(keys.map((key) => row[key])))].join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${xmlEscape(title.slice(0,31))}" ss:RightToLeft="1"><Table>${body}</Table></Worksheet></Workbook>`;
}
function utf8(value: string) { return new TextEncoder().encode(value); }
function concat(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(length); let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}
function crc32(bytes: Uint8Array) {
  let crc = -1;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
  }
  return (crc ^ -1) >>> 0;
}
function u16(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255]); }
function u32(value: number) { return new Uint8Array([value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]); }
function makeZip(files: { name: string; content: string | Uint8Array }[]) {
  const local: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate = ((Math.max(1980, now.getFullYear()) - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  for (const file of files) {
    const name = utf8(file.name), data = typeof file.content === "string" ? utf8(file.content) : file.content, crc = crc32(data);
    const header = concat([u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), name]);
    local.push(header, data);
    const directory = concat([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(dosTime), u16(dosDate), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    central.push(directory);
    offset += header.length + data.length;
  }
  const centralBytes = concat(central), localBytes = concat(local);
  const end = concat([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralBytes.length), u32(localBytes.length), u16(0)]);
  return new Blob([localBytes, centralBytes, end], { type: "application/zip" });
}
function dateForRow(row: Record<string, any>) {
  for (const key of DATE_FIELDS) {
    const value = row[key];
    if (value) {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }
  return null;
}
function makePdfFromJpegs(images: Uint8Array[]) {
  const enc = (value: string) => utf8(value);
  const objects: Uint8Array[] = [];
  objects.push(enc('<< /Type /Catalog /Pages 2 0 R >>'));
  const kids = images.map((_, index) => (3 + index * 3) + ' 0 R').join(' ');
  objects.push(enc('<< /Type /Pages /Kids [' + kids + '] /Count ' + images.length + ' >>'));
  images.forEach((jpeg, index) => {
    const pageId = 3 + index * 3, contentId = pageId + 1, imageId = pageId + 2;
    objects.push(enc('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' + imageId + ' 0 R >> >> /Contents ' + contentId + ' 0 R >>'));
    const stream = enc('q 595 0 0 842 0 0 cm /Im0 Do Q');
    objects.push(concat([enc('<< /Length ' + stream.length + ' >>\nstream\n'), stream, enc('\nendstream')]));
    objects.push(concat([enc('<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpeg.length + ' >>\nstream\n'), jpeg, enc('\nendstream')]));
  });
  const chunks: Uint8Array[] = [enc('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
  const offsets = [0]; let length = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(length);
    const part = concat([enc((index + 1) + ' 0 obj\n'), object, enc('\nendobj\n')]);
    chunks.push(part); length += part.length;
  });
  const xrefOffset = length;
  let xref = 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
  const trailer = 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF';
  chunks.push(enc(xref + trailer));
  return concat(chunks);
}
async function createPatientPdf(patient: Record<string, any>, related: Record<string, any>, clinicName: string, ar: boolean) {\n  if (document.fonts?.ready) await document.fonts.ready;
  const name = String(patient.name || patient.full_name || patient.patient_name || patient.id || 'Patient');
  const lines: string[] = [];
  lines.push(ar ? 'ملف الحالة الطبي' : 'PATIENT CASE FILE');
  lines.push((ar ? 'المركز: ' : 'Clinic: ') + clinicName);
  lines.push((ar ? 'اسم الحالة: ' : 'Patient: ') + name);
  lines.push((ar ? 'رقم الملف: ' : 'File ID: ') + String(patient.id || patient.file_number || '—'));
  lines.push('');
  lines.push(ar ? 'البيانات الأساسية' : 'PATIENT DETAILS');
  lines.push(JSON.stringify(patient, null, 2));
  for (const [table, rows] of Object.entries(related)) {
    lines.push(''); lines.push('— ' + table + ' —'); lines.push(JSON.stringify(rows, null, 2));
  }
  const pageLines: string[][] = [];
  let current: string[] = [];
  for (const raw of lines.join('\n').split('\n')) {
    const text = raw || ' ';
    const max = 66;
    if (text.length <= max) current.push(text);
    else { for (let i = 0; i < text.length; i += max) current.push(text.slice(i, i + max)); }
    if (current.length >= 42) { pageLines.push(current); current = []; }
  }
  if (current.length || !pageLines.length) pageLines.push(current);
  const images: Uint8Array[] = [];
  for (let page = 0; page < pageLines.length; page++) {
    const canvas = document.createElement('canvas'); canvas.width = 1240; canvas.height = 1754;
    const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('PDF canvas is unavailable.');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#17324d'; ctx.direction = ar ? 'rtl' : 'ltr'; ctx.textAlign = ar ? 'right' : 'left';
    const x = ar ? 1160 : 80;
    ctx.font = 'bold 42px Cairo, Arial, sans-serif'; ctx.fillText('Prime Physio', x, 88);
    ctx.font = 'bold 32px Cairo, Arial, sans-serif'; ctx.fillText(pageLines[page][0] || '', x, 160);
    ctx.strokeStyle = '#dbe3ed'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(80, 195); ctx.lineTo(1160, 195); ctx.stroke();
    ctx.fillStyle = '#25364a'; ctx.font = '24px Cairo, Arial, sans-serif';
    let y = 245;
    for (const line of pageLines[page].slice(1)) {
      const segments = line.match(/.{1,70}/gu) || [line];
      for (const segment of segments) { ctx.fillText(segment, x, y, 1080); y += 31; if (y > 1640) break; }
      if (y > 1640) break;
    }
    ctx.fillStyle = '#8b98a8'; ctx.font = '18px Cairo, Arial, sans-serif'; ctx.fillText((ar ? 'صفحة ' : 'Page ') + (page + 1) + ' / ' + pageLines.length, x, 1695);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.84);
    const binary = atob(dataUrl.split(',')[1]); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    images.push(bytes);
  }
  return makePdfFromJpegs(images);
}
function safeFileName(value: string) {
  return value.normalize("NFKD").replace(/[^\w.-]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 70) || "record";
}

export default function FullDataExport() {
  const { language } = useLanguage();
  const ar = language === "ar";
  const [exportLanguage, setExportLanguage] = useState<"ar" | "en">(language);
  const exportAr = exportLanguage === "ar";
  const [selected, setSelected] = useState<string[]>(GROUPS.map((group) => group.id));
  const [period, setPeriod] = useState<"all" | "custom">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [latinNames, setLatinNames] = useState(false);
  const [includeCaseReports, setIncludeCaseReports] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const selectedTables = useMemo(() => GROUPS.filter((group) => selected.includes(group.id)).flatMap((group) => group.tables), [selected]);

  const toggleGroup = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const startExport = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/backup", { method: "POST", credentials: "include", cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || (ar ? "تعذر تجهيز بيانات التصدير." : "Could not prepare export data."));
      const backup = payload as ExportBackup;
      const files: { name: string; content: string | Uint8Array }[] = [];
      const clinicName = String(backup.clinic?.name || backup.clinic?.name_en || "Prime Physio");
          const selectedData: Record<string, Record<string, any>[]> = {};
      const counts: Record<string, number> = {};
      for (const tableName of selectedTables) {
        let rows = backup.tables?.[tableName] || [];
        if (period === "custom" && PERIOD_TABLES.has(tableName)) {
          rows = rows.filter((row) => {
            const date = dateForRow(row);
            if (!date) return true;
            const day = date.toISOString().slice(0, 10);
            return (!fromDate || day >= fromDate) && (!toDate || day <= toDate);
          });
        }
        selectedData[tableName] = rows;
        counts[tableName] = rows.length;
        if (rows.length) {
          const group = GROUPS.find((item) => (item.tables as readonly string[]).includes(tableName))?.id || "Other";
          const fileName = latinNames ? safeFileName(tableName) : tableName;
          files.push({ name: `01-Data/${group}/${fileName}.csv`, content: toCsv(rows) });
          files.push({ name: `01-Data/${group}/${fileName}.xls`, content: toExcelXml(rows, tableName) });
        }
      }
      let attachmentCount = 0;
      if (selected.includes("cases")) {
        const attachmentResponse = await fetch("/api/backup/attachments", { method: "POST", credentials: "include", cache: "no-store" });
        const attachmentPayload = await attachmentResponse.json();
        if (!attachmentResponse.ok) throw new Error(attachmentPayload?.error || (ar ? "تعذر تجهيز مرفقات الحالات." : "Could not prepare patient attachments."));
        for (const attachment of (attachmentPayload.attachments || [])) {
          const fileResponse = await fetch(attachment.url, { cache: "no-store" });
          if (!fileResponse.ok) throw new Error(ar ? "تعذر تنزيل مرفق مريض." : "Could not download a patient attachment.");
          const bytes = new Uint8Array(await fileResponse.arrayBuffer());
          const patientId = safeFileName(String(attachment.patientId || "case"));
          const originalName = String(attachment.fileName || attachment.id || "attachment");
          const fileName = latinNames ? safeFileName(originalName) : originalName.replace(/[\\/:*?"<>|]/g, "_");
          files.push({ name: "02-Cases/Case-Files/" + patientId + "/Attachments/" + fileName, content: bytes });
          attachmentCount += 1;
        }
      }
      const summary = {
        format: "Prime Physio Full Export",
        version: 1,
        exportedAt: new Date().toISOString(),
        clinic: backup.clinic,
        clinicId: backup.clinicId,
        period: period === "all" ? "All available dates" : { from: fromDate || null, to: toDate || null },
        exportLanguage,
        selectedGroups: selected,
        tableCounts: counts,
        totalRows: Object.values(counts).reduce((sum, count) => sum + count, 0),
        attachmentCount,
        note: "This archive includes selected clinic-scoped database rows, uploaded patient attachments and generated patient PDF reports. Password-encrypted ZIP is not included in this release.",
      };
      files.unshift({ name: "00-Export-Summary.json", content: JSON.stringify(summary, null, 2) });
      files.push({ name: "00-READ-ME.txt", content: [
        "PRIME PHYSIO — FULL DATA EXPORT",
        "================================",
        `Center: ${clinicName}`,
        `Exported: ${new Date().toLocaleString(exportAr ? "ar-EG" : "en-US")}`,
        `Rows: ${summary.totalRows}`,
        "",
        "01-Data contains CSV and Excel XML Spreadsheet (.xls) copies of each selected database table.",
        "The .xls files are Excel-compatible XML workbooks. CSV files use UTF-8 with BOM for Arabic text.",
        "Patient and staff records are exported in full. The selected date range is applied to time-based activity tables.",
        "",
        "IMPORTANT: Uploaded patient attachments are included under each case folder. Password-encrypted ZIP is not included in this release.",
        "Keep this file secure: it may contain confidential patient information."
      ].join("\n") });
      files.push({ name: "00-Contents.html", content: `<!doctype html><html lang="${exportAr ? "ar" : "en"}" dir="${exportAr ? "rtl" : "ltr"}"><meta charset="utf-8"><title>Prime Physio Export Contents</title><body style="font-family:Arial,sans-serif;padding:32px;line-height:1.8"><h1>Prime Physio — Export Contents</h1><p>${xmlEscape(clinicName)}</p><p>${summary.totalRows} records</p><ul>${Object.entries(counts).map(([key,count])=>`<li>${xmlEscape(key)}: ${count}</li>`).join("")}</ul><p>CSV and Excel-compatible workbooks are stored under 01-Data.</p><p>Uploaded patient attachments are stored in each case folder. Patient PDF reports are included when selected. Password-encrypted ZIP is not included in this release.</p></body></html>` });
      if (includeCaseReports && selected.includes("cases")) {
        const patients = selectedData.patients || [];
        for (const patient of patients) {
          const id = String(patient.id || patient.file_number || Math.random().toString(36).slice(2));
          const name = String(patient.name || patient.full_name || patient.patient_name || id);
          const related = Object.fromEntries(Object.entries(selectedData).filter(([table]) => !["patients"].includes(table)).map(([table, rows]) => [table, rows.filter((row) => String(row.patient_id || row.patientId || "") === id)]).filter(([, rows]) => (rows as any[]).length));
          const report = `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><meta charset="utf-8"><title>${xmlEscape(name)}</title><body style="font-family:Arial,sans-serif;padding:28px;line-height:1.7"><h1>Prime Physio — ${ar ? "ملف الحالة" : "Case file"}</h1><h2>${xmlEscape(name)}</h2><p>${ar ? "رقم الملف" : "File ID"}: ${xmlEscape(id)}</p><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${xmlEscape(JSON.stringify(patient,null,2))}</pre>${Object.entries(related).map(([table,rows])=>`<h3>${xmlEscape(table)}</h3><pre style="white-space:pre-wrap;font-family:Arial,sans-serif">${xmlEscape(JSON.stringify(rows,null,2))}</pre>`).join("")}</body></html>`;
          files.push({ name: `02-Cases/Case-Files/${safeFileName(id)}_${safeFileName(name)}.html`, content: report });
          const pdf = await createPatientPdf(patient, related, clinicName, exportAr);
          files.push({ name: `02-Cases/Case-Files/${safeFileName(id)}_${safeFileName(name)}.pdf`, content: pdf });
        }
      }
      const archive = makeZip(files);
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Prime-Physio_Full-Export_${new Date().toISOString().slice(0,10)}.zip`;
      document.body.appendChild(link); link.click(); link.remove();
      URL.revokeObjectURL(url);
      setSuccess(ar ? `تم تجهيز ملف ZIP بنجاح — ${summary.totalRows.toLocaleString("ar-EG")} سجل و${attachmentCount.toLocaleString("ar-EG")} مرفق.` : `ZIP archive created — ${summary.totalRows.toLocaleString()} records and ${attachmentCount.toLocaleString()} attachments.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : (ar ? "حدث خطأ أثناء التصدير." : "Export failed."));
    } finally { setLoading(false); }
  };

  return (
    <main dir={ar ? "rtl" : "ltr"} className="min-h-screen bg-[#F7F9FC] px-4 py-6 text-slate-800 sm:px-7 lg:px-9">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-[#EEF1FF] px-3 py-1 text-xs font-bold text-[#5146B8]"><ShieldCheck className="h-4 w-4" />{ar ? "نسخة آمنة لبيانات المركز" : "Secure clinic data export"}</div>
            <h1 className="text-2xl font-black tracking-tight text-[#20344B] sm:text-3xl">{ar ? "التصدير الكامل للبيانات" : "Full data export"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{ar ? "أنشئ نسخة منظمة من بيانات المركز المحدد، مع ملفات Excel متوافقة مع العربية وملفات CSV قابلة للفتح في Excel." : "Create an organized archive of the active clinic data, with Arabic-compatible Excel workbooks and CSV files."}</p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" />{ar ? "للمدير فقط" : "Clinic admin only"}</div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F0EEFF] text-[#594FC4]"><Download className="h-5 w-5" /></div><div><h2 className="font-extrabold text-slate-800">{ar ? "ما الذي ستحصل عليه؟" : "What’s included"}</h2><p className="mt-1 text-xs text-slate-500">{ar ? "اختر الأقسام التي تريد إضافتها إلى ملف ZIP." : "Choose the sections to include in your ZIP archive."}</p></div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GROUPS.map((group) => {
              const checked = selected.includes(group.id);
              return <label key={group.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${checked ? "border-[#6559CC] bg-[#F8F7FF]" : "border-slate-200 hover:border-slate-300"}`}>
                <input type="checkbox" checked={checked} onChange={() => toggleGroup(group.id)} className="mt-1 h-4 w-4 accent-[#5B50C7]" />
                <span className="min-w-0"><span className="block text-sm font-bold text-slate-700">{ar ? group.ar : group.en}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{group.tables.length} {ar ? "مصدر بيانات" : "data sources"}</span></span>
              </label>;
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><CalendarDays className="h-5 w-5" /></div><div><h2 className="font-extrabold text-slate-800">{ar ? "الفترة الزمنية" : "Date range"}</h2><p className="mt-1 text-xs text-slate-500">{ar ? "بيانات الحالات والموظفين والإعدادات تظل كاملة دائمًا." : "Patient, staff and settings records remain complete regardless of date range."}</p></div></div>
          <div className="flex flex-wrap gap-3">
            <label className={`flex min-w-[190px] flex-1 cursor-pointer items-center gap-3 rounded-xl border p-4 ${period === "all" ? "border-[#6559CC] bg-[#F8F7FF]" : "border-slate-200"}`}><input type="radio" checked={period === "all"} onChange={() => setPeriod("all")} className="accent-[#5B50C7]" /><span><b className="block text-sm">{ar ? "من أول يوم حتى اليوم" : "All time"}</b><small className="text-xs text-slate-500">{ar ? "كل السجلات الزمنية المتاحة" : "All available activity"}</small></span></label>
            <label className={`flex min-w-[190px] flex-1 cursor-pointer items-center gap-3 rounded-xl border p-4 ${period === "custom" ? "border-[#6559CC] bg-[#F8F7FF]" : "border-slate-200"}`}><input type="radio" checked={period === "custom"} onChange={() => setPeriod("custom")} className="accent-[#5B50C7]" /><span><b className="block text-sm">{ar ? "تحديد فترة" : "Custom period"}</b><small className="text-xs text-slate-500">{ar ? "حدد البداية والنهاية" : "Choose start and end dates"}</small></span></label>
          </div>
          {period === "custom" && <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold text-slate-600">{ar ? "من تاريخ" : "From"}<input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#6559CC]" /></label><label className="text-sm font-semibold text-slate-600">{ar ? "إلى تاريخ" : "To"}<input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-[#6559CC]" /></label></div>}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><FileSpreadsheet className="h-5 w-5" /></div><div><h2 className="font-extrabold text-slate-800">{ar ? "اللغة وأسماء الملفات" : "Language & filenames"}</h2><p className="mt-1 text-xs text-slate-500">{ar ? "بيانات Excel وCSV تحفظ النصوص العربية بترميز UTF-8." : "Excel and CSV exports preserve Unicode text."}</p></div></div>
          <div className="flex flex-wrap gap-3">
            <div className="inline-flex rounded-xl border border-slate-200 p-1"><button type="button" onClick={() => setExportLanguage("ar")} className={`rounded-lg px-4 py-2 text-sm font-bold ${exportLanguage === "ar" ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-slate-400"}`}>العربية</button><button type="button" onClick={() => setExportLanguage("en")} className={`rounded-lg px-4 py-2 text-sm font-bold ${exportLanguage === "en" ? "bg-[#F1EFFF] text-[#5B50C7]" : "text-slate-400"}`}>English</button></div>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm"><input type="checkbox" checked={latinNames} onChange={(e) => setLatinNames(e.target.checked)} className="accent-[#5B50C7]" />{ar ? "حروف لاتينية فقط في أسماء الملفات" : "Latin characters in filenames only"}</label>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4"><input type="checkbox" checked={includeCaseReports} onChange={(e) => setIncludeCaseReports(e.target.checked)} className="mt-1 accent-[#5B50C7]" /><span><b className="block text-sm text-slate-700">{ar ? "إضافة ملف PDF وملخص HTML لكل حالة" : "Include a PDF and HTML summary for each patient"}</b><small className="text-xs text-slate-500">{ar ? "يمكن فتحه وطباعته أو حفظه PDF من المتصفح." : "Can be opened, printed or saved as PDF from your browser."}</small></span></label>
        </section>

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 shrink-0" />{ar ? "ملاحظة مهمة حول هذا الإصدار" : "Important for this release"}</div><p className="mt-1">{ar ? "الملف يضم سجلات قاعدة البيانات المختارة بصيغ JSON وCSV وExcel XML، وملفات PDF وHTML للحالات، ومرفقات المرضى المرفوعة. تشفير ZIP بكلمة مرور لم يُنفذ بعد." : "This release packages selected database records as JSON, CSV and Excel XML, plus patient PDF/HTML reports and uploaded attachments. Password-encrypted ZIP is not included yet."}</p></div>

        {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><XCircle className="h-5 w-5 shrink-0" />{error}</div>}
        {success && <div role="status" className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"><CheckCircle2 className="h-5 w-5 shrink-0" />{success}</div>}
        <div className="flex flex-col items-stretch justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div><p className="text-sm font-bold text-slate-800">{ar ? "جاهز لإنشاء نسخة بيانات المركز" : "Ready to create a clinic archive"}</p><p className="mt-1 text-xs text-slate-500">{ar ? `${selected.length} أقسام محددة · البيانات ستُجلب من المركز النشط فقط` : `${selected.length} sections selected · only the active clinic will be exported`}</p></div>
          <button type="button" disabled={loading || selected.length === 0} onClick={startExport} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#5B50C7] px-7 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#4B40B7] disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />{ar ? "جارٍ تجهيز التصدير..." : "Preparing export..."}</> : <><Download className="h-5 w-5" />{ar ? "ابدأ التصدير" : "Start export"}</>}</button>
        </div>
        <p className="pb-4 text-center text-xs text-slate-400">{ar ? "Prime Physio · يتم إنشاء الملف على جهازك ولا يتم الاحتفاظ بنسخة إضافية منه على خوادم المنصة." : "Prime Physio · The archive is generated in your browser and is not retained as an extra copy on the platform."}</p>
      </div>
    </main>
  );
}
