"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TrendingUp, DollarSign, Trash2, CreditCard } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// ─── Helpers ────────────────────────────────────────────────────────────────

import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/LanguageContext";
import { usePermissions } from "@/lib/usePermissions";
import { useAuth } from "@/lib/auth";

// Canonical status values stored in DB: "انتظار" | "مدفوع" | "ملغي"
const normalizeInvoiceStatus = (value: string): "انتظار" | "مدفوع" | "ملغي" => {
  if (value === "Paid"     || value === "مدفوع")                          return "مدفوع";
  if (value === "Canceled" || value === "ملغي")                           return "ملغي";
  // Pending / انتظار / غير مدفوع → انتظار
  return "انتظار";
};

const statusSelectClass = (status: string) => {
  if (status === "مدفوع")  return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "ملغي")   return "bg-rose-50   text-rose-700   border-rose-200";
  return                          "bg-amber-50  text-amber-700  border-amber-200"; // انتظار
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const { hasPermission, isAdmin } = usePermissions();
  const { user } = useAuth();
  const clinicId = user?.clinicId;
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedInvoiceForDiscount, setSelectedInvoiceForDiscount] = useState<any>(null);
  const [discountValue, setDiscountValue] = useState("");
  
  const [patients, setPatients] = useState<any[]>([]);
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);

  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      const { data: invs, error: invErr } = await supabase
        .from("invoices")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("date", { ascending: false });

      if (!invErr && invs) {
        const mapped = invs.map(inv => ({
          id: inv.id,
          patientId: inv.patient_id,
          patientName: inv.patient_name,
          description: inv.description,
          amount: inv.amount,
          date: inv.date,
          status: normalizeInvoiceStatus(inv.status ?? ""),
          paymentMethod: inv.type || ""
        }));
        setInvoices(mapped);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.warn("Error loading data from DB", err);
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase.from("patients").select("id, nameAr").eq("clinic_id", clinicId);
      if (!error && data) {
        setPatients(data);
      } else {
        setPatients([]);
      }
    } catch (err) {
      setPatients([]);
    }
  };

  const handleDeleteInvoiceClick = (invoiceId: string) => {
    setDeleteInvoiceId(invoiceId);
  };

  const executeDeleteInvoice = async () => {
    if (!deleteInvoiceId) return;

    try {
      // Find the invoice to get patient_id before deleting
      const invoice = invoices.find((inv) => inv.id === deleteInvoiceId);
      const patientId = invoice?.patientId;

      // Delete the invoice
      const { error } = await supabase.from("invoices").delete().eq("clinic_id", clinicId).eq("id", deleteInvoiceId);
      if (error) throw error;

      // If invoice belongs to a patient, delete patient + all their related data
      if (patientId) {
        await supabase.from("invoices").delete().eq("clinic_id", clinicId).eq("patient_id", patientId);
        await supabase.from("appointments").delete().eq("clinic_id", clinicId).eq("patient_id", patientId);
        await supabase.from("sessions").delete().eq("clinic_id", clinicId).eq("patient_id", patientId);
        await supabase.from("patients").delete().eq("clinic_id", clinicId).eq("id", patientId);
      }

      // Update local state
      setInvoices((prev) =>
        patientId
          ? prev.filter((inv) => inv.patientId !== patientId)
          : prev.filter((inv) => inv.id !== deleteInvoiceId)
      );
      setPatients((prev) => prev.filter((p) => p.id !== patientId));
    } catch (err: any) {
      console.error("Failed to delete invoice:", err);
      alert(isRtl ? "فشل الحذف: " + (err.message || err) : "Delete failed: " + (err.message || err));
    } finally {
      setDeleteInvoiceId(null);
    }
  };

  useEffect(() => {
    loadInvoices();
    loadPatients();
  }, [isRtl]);

  const handleExportPDF = () => {
    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
    }

    const htmlContent = `
      <html dir="${isRtl ? 'rtl' : 'ltr'}" lang="${isRtl ? 'ar' : 'en'}">
        <head>
          <title>${isRtl ? 'كشف حساب مالي - Prime Physio' : 'Financial Statement - Prime Physio'}</title>
          <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
          <style>
            body { font-family: 'Cairo', sans-serif; padding: 40px; color: #1e293b; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4F46BA; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; gap: 15px; }
            .logo-img { max-height: 60px; max-width: 120px; object-fit: contain; }
            .title h2 { margin: 0; color: #4F46BA; font-size: 24px; }
            .title p { margin: 0; font-size: 14px; color: #64748b; }
            .doc-info h1 { margin: 0; font-size: 20px; }
            .doc-info p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; }
            .stats { display: flex; gap: 20px; margin-bottom: 30px; }
            .stat-box { flex: 1; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
            .stat-box p.label { margin: 0 0 5px 0; font-size: 12px; color: #64748b; }
            .stat-box p.val { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px; }
            th { background-color: #4F46BA; color: white; padding: 12px; text-align: right; border: 1px solid #4F46BA; }
            td { padding: 12px; border: 1px solid #e2e8f0; text-align: right; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .footer { text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-container">
              <img src="/logo.png" class="logo-img" alt="Prime Physio Logo" onerror="this.style.display='none'" />
              <div class="title">
                <h2>Prime Physio</h2>
                <p>للعلاج الطبيعي والتأهيل المتقدم</p>
              </div>
            </div>
            <div class="doc-info">
              <h1>${isRtl ? 'كشف حساب مالي' : 'Financial Statement'}</h1>
              <p>${isRtl ? 'تاريخ الإصدار' : 'Issue Date'}: ${new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          <div class="stats">
            <div class="stat-box">
              <p class="label">${isRtl ? 'إجمالي المبيعات المدفوعة' : 'Total Paid Sales'}</p>
              <p class="val" style="color: #059669;">${paidSales.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}</p>
            </div>
            <div class="stat-box">
              <p class="label">${isRtl ? 'المبالغ المستحقة (انتظار)' : 'Pending Amount'}</p>
              <p class="val" style="color: #d97706;">${pendingAmount.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}</p>
            </div>
            <div class="stat-box">
              <p class="label">${isRtl ? 'إجمالي الفواتير الصادرة' : 'Total Issued Invoices'}</p>
              <p class="val" style="color: #2563eb;">${invoices.length} ${isRtl ? 'فاتورة' : 'Invoices'}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>${isRtl ? 'رقم الفاتورة' : 'Invoice ID'}</th>
                <th>${isRtl ? 'المريض' : 'Patient'}</th>
                <th>${isRtl ? 'البيان' : 'Description'}</th>
                <th>${isRtl ? 'القيمة' : 'Amount'}</th>
                <th>${isRtl ? 'التاريخ' : 'Date'}</th>
                <th>${isRtl ? 'طريقة الدفع' : 'Payment'}</th>
                <th>${isRtl ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              ${invoices.map(inv => `
                <tr>
                  <td style="font-family: monospace;">${inv.id}</td>
                  <td style="font-weight: 600;">${inv.patientName}</td>
                  <td>${inv.description}</td>
                  <td style="font-family: monospace; font-weight: bold;">${inv.amount}</td>
                  <td>${inv.date}</td>
                  <td>${inv.paymentMethod}</td>
                  <td style="font-weight: bold; color: ${inv.status === 'مدفوع' ? '#059669' : inv.status === 'ملغي' ? '#e11d48' : '#d97706'};">${inv.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="footer">
            <p>${isRtl ? 'تم إصدار هذا الكشف آلياً من نظام "Prime Physio" لإدارة العيادات' : 'This statement was automatically generated by Prime Physio Management System'}</p>
          </div>
          
          <script>
            window.onload = () => {
              setTimeout(() => { window.print(); }, 400);
            };
          </script>
        </body>
      </html>
    `;

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(htmlContent);
      doc.close();
    }
  };

  const paidSales = invoices
    .filter((inv) => inv.status === "مدفوع")
    .reduce((sum, inv) => sum + parseInt(String(inv.amount).replace(/[^0-9]/g, "") || "0"), 0);

  const pendingAmount = invoices
    .filter((inv) => inv.status === "انتظار")
    .reduce((sum, inv) => sum + parseInt(String(inv.amount).replace(/[^0-9]/g, "") || "0"), 0);

  const dynamicStats = [
    {
      title: isRtl ? "مبيعات الباقات النشطة" : "Active Package Sales",
      value: `${paidSales.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}`,
      description: isRtl ? `دخل مبيعات ${invoices.filter((inv) => inv.status === "مدفوع").length} باقة حالية` : `Sales income of ${invoices.filter((inv) => inv.status === "مدفوع").length} active packages`,
      icon: TrendingUp,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: isRtl ? "مبالغ مستحقة (غير مدفوعة)" : "Pending Amounts",
      value: `${pendingAmount.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}`,
      description: isRtl ? `${invoices.filter((inv) => inv.status === "انتظار").length} فواتير قيد الانتظار` : `${invoices.filter((inv) => inv.status === "انتظار").length} pending invoices`,
      icon: DollarSign,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
    },
    {
      title: isRtl ? "إجمالي الفواتير الصادرة" : "Total Invoices Issued",
      value: `${invoices.length} ${isRtl ? 'فاتورة' : 'Invoices'}`,
      description: isRtl ? `نشط: ${invoices.filter((inv) => inv.status === "مدفوع").length} | انتظار: ${invoices.filter((inv) => inv.status === "انتظار").length}` : `Paid: ${invoices.filter((inv) => inv.status === "مدفوع").length} | Pending: ${invoices.filter((inv) => inv.status === "انتظار").length}`,
      icon: CreditCard,
      color: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300" dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {isRtl ? "المالية والفواتير" : "Billing & Invoices"}
          </h1>
          <p className="text-sm text-zinc-500 font-semibold mt-1">
            {isRtl ? "مراقبة التسويات المالية والفواتير الصادرة" : "Monitor financial settlements and issued invoices"}
          </p>
        </div>
        {hasPermission("export_data") && (
          <button onClick={handleExportPDF} className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {isRtl ? "تصدير PDF" : "Export PDF"}
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dynamicStats.map((stat) => (
          <div key={stat.title} className="p-5 rounded-xl shadow-sm" style={{ backgroundColor: stat.title.includes("مستحقة") ? "#51459E" : "#4F46BA" }}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-white/50">{stat.title}</p>
              <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-white" />
              </div>
            </div>
            <p className="text-lg font-semibold text-white mt-1">{stat.value}</p>
            <p className="text-xs text-white/60 mt-2">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-bold text-gray-700">
              {isRtl ? "أحدث الفواتير" : "Recent Invoices"}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isRtl ? "قائمة الفواتير الصادرة للعيادة" : "List of issued clinic invoices"}
            </p>
          </div>
          <span className="text-xs font-semibold text-zinc-400 bg-gray-50 px-3 py-1 rounded-full">
            {invoices.length} {isRtl ? "فاتورة" : "invoices"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-xs font-semibold text-zinc-500">
                <th className="py-3.5 px-6 text-right">{isRtl ? "رقم الفاتورة" : "Invoice ID"}</th>
                <th className="py-3.5 px-6 text-right">{isRtl ? "المريض" : "Patient"}</th>
                <th className="py-3.5 px-6 text-right">{isRtl ? "البيان" : "Description"}</th>
                <th className="py-3.5 px-6 text-right">{isRtl ? "القيمة" : "Amount"}</th>
                <th className="py-3.5 px-6 text-right">{isRtl ? "التاريخ" : "Date"}</th>
                <th className="py-3.5 px-6 text-right">{isRtl ? "طريقة الدفع" : "Payment"}</th>
                <th className="py-3.5 px-6 text-center">{isRtl ? "الحالة" : "Status"}</th>
                <th className="py-3.5 px-6 text-center">{isRtl ? "إجراءات" : "Actions"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.length > 0 ? invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono font-semibold text-zinc-800">{inv.id}</td>
                  <td className="py-4 px-6">
                    <Link href={`/patients/${inv.patientId}`} className="font-semibold text-[#4F46BA] hover:underline text-sm">
                      {patients.find(p => p.id === inv.patientId)?.nameAr || inv.patientName}
                    </Link>
                  </td>
                  <td className="py-4 px-6 text-zinc-600">{inv.description}</td>
                  <td className="py-4 px-6 font-semibold text-zinc-800 font-mono">{inv.amount}</td>
                  <td className="py-4 px-6 text-zinc-400 text-xs">{inv.date}</td>
                  <td className="py-4 px-6 text-zinc-400 text-xs">
                    {inv.status === "مدفوع" ? (
                      <span className="text-zinc-500 font-medium">نقدي</span>
                    ) : <span className="text-zinc-300">—</span>}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <select
                      value={inv.status}
                      disabled={!hasPermission("create_invoice") && !isAdmin}
                      onChange={async (e) => {
                        const newStatus = normalizeInvoiceStatus(e.target.value);
                        try {
                          await supabase.from("patients").update({ status: newStatus === "مدفوع" ? "نشط" : "غير نشط" }).eq("clinic_id", clinicId).eq("id", inv.patientId);
                          const { error: invoiceErr } = await supabase.from("invoices").update({ status: newStatus }).eq("clinic_id", clinicId).eq("id", inv.id);
                          if (invoiceErr) throw invoiceErr;
                        } catch (err: any) {
                          console.error("Failed to update status:", err?.message || JSON.stringify(err));
                          alert("حدث خطأ: " + (err?.message || JSON.stringify(err)));
                        }
                        setInvoices((prev) => prev.map((item) => item.id === inv.id ? { ...item, status: newStatus, paymentMethod: newStatus === "مدفوع" ? "نقدي" : "" } : item));
                      }}
                      className={`rounded-md px-2 py-1 text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#4F46BA] transition-colors ${statusSelectClass(inv.status)}`}
                    >
                      <option value="انتظار">{isRtl ? "انتظار" : "Pending"}</option>
                      <option value="مدفوع">{isRtl ? "مدفوع" : "Paid"}</option>
                      <option value="ملغي">{isRtl ? "ملغي" : "Canceled"}</option>
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      {hasPermission("apply_discount") && (
                        <button
                          className="text-xs font-semibold text-[#4F46BA] hover:text-[#4338ca] px-2 py-1 rounded-lg hover:bg-indigo-50 transition-colors"
                          onClick={() => { setSelectedInvoiceForDiscount(inv); setDiscountValue(""); setDiscountModalOpen(true); }}
                        >
                          {isRtl ? "خصم" : "Discount"}
                        </button>
                      )}
                      {(isAdmin || hasPermission("create_invoice")) && (
                        <button
                          className="text-red-500 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                          onClick={() => handleDeleteInvoiceClick(inv.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={8} className="py-12 text-center text-zinc-400 text-sm">{isRtl ? "لا توجد فواتير" : "No invoices found"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discount Modal */}
      <Dialog open={discountModalOpen} onOpenChange={(open: boolean) => !open && setDiscountModalOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center space-y-4 pt-4">
            <div className="w-14 h-14 rounded-xl bg-[#4F46BA] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-800">
              {isRtl ? "تطبيق خصم" : "Apply Discount"}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 text-center">
              {isRtl ? "اختر نسبة الخصم لتطبيقها على الفاتورة" : "Select discount percentage to apply"}
            </DialogDescription>
            <div className="w-full grid grid-cols-3 gap-2 mt-2">
              {[10, 20, 30, 50, 100].map(pct => (
                <button
                  key={pct}
                  onClick={() => setDiscountValue(`${pct}%`)}
                  className={`py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                    discountValue === `${pct}%`
                      ? "bg-[#4F46BA] text-white"
                      : "bg-gray-50 text-zinc-600 border border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  {pct === 100 ? (isRtl ? "مجاني" : "Free") : `${pct}%`}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setDiscountModalOpen(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-zinc-600 hover:bg-gray-50 transition-colors">
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button
              disabled={!discountValue}
              onClick={async () => {
                if (!discountValue || !selectedInvoiceForDiscount) return;
                const item = selectedInvoiceForDiscount;
                const originalNumeric = parseInt(item.amount.replace(/[^0-9]/g, "") || "0");
                const pct = parseInt(discountValue.replace(/[^0-9]/g, "") || "0");
                let newNumeric = originalNumeric - Math.round(originalNumeric * pct / 100);
                if (newNumeric < 0) newNumeric = 0;
                const currency = item.amount.replace(/[0-9,]/g, "").trim();
                const newAmount = `${newNumeric.toLocaleString()} ${currency}`;
                try {
                  await supabase.from("invoices").upsert({ id: item.id, clinic_id: clinicId, patient_id: item.patientId, patient_name: item.patientName, description: item.description, amount: newAmount, status: item.status });
                } catch (err) { console.error("Failed to save discount", err); }
                setInvoices(prev => prev.map(inv => inv.id === item.id ? { ...inv, amount: newAmount } : inv));
                setDiscountModalOpen(false);
              }}
              className="flex-1 py-2.5 rounded-xl bg-[#4F46BA] text-white text-sm font-semibold hover:bg-[#4338ca] transition-colors disabled:opacity-50"
            >
              {isRtl ? "تأكيد" : "Apply"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteInvoiceId} onOpenChange={(open: boolean) => !open && setDeleteInvoiceId(null)}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <div className="flex flex-col items-center space-y-4 pt-4">
            <div className="w-14 h-14 rounded-xl bg-red-50 flex items-center justify-center">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <DialogTitle className="text-lg font-bold text-gray-800">
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-500 text-center">
              {isRtl ? "سيتم حذف الفاتورة وملف المريض بالكامل. لا يمكن التراجع." : "Invoice and patient record will be permanently deleted."}
            </DialogDescription>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => setDeleteInvoiceId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-zinc-600 hover:bg-gray-50 transition-colors">
              {isRtl ? "إلغاء" : "Cancel"}
            </button>
            <button onClick={executeDeleteInvoice} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
              {isRtl ? "حذف" : "Delete"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
