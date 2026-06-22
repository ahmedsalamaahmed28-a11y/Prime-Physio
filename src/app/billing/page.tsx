"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CreditCard, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet, 
  Plus, 
  ArrowDownLeft, 
  ArrowUpRight,
  Download,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// â”€â”€â”€ Mock Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PURPLE_COLOR = "text-purple-600 bg-purple-50 dark:bg-purple-950/20";

const BILLING_STATS = [
  {
    title: "مبيعات الباقات النشطة",
    value: "24,800 ج.م",
    description: "دخل مبيعات 18 باقة حالية",
    icon: TrendingUp,
    color: PURPLE_COLOR,
  },
  {
    title: "مبالغ مستحقة (غير مدفوعة)",
    value: "1,600 ج.م",
    description: "4 فواتير قيد الانتظار",
    icon: DollarSign,
    color: PURPLE_COLOR,
  },
  {
    title: "جلسات باقات مستهلكة",
    value: "108 جلسة",
    description: "من أصل 180 جلسة إجمالية",
    icon: CreditCard,
    color: PURPLE_COLOR,
  },
];

const getRecentInvoices = (isRtl: boolean) => [];

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
          paymentMethod: normalizeInvoiceStatus(inv.status ?? "") === "مدفوع" ? (isRtl ? "نقدي" : "Cash") : "â€”"
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
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0d8a8a; padding-bottom: 20px; margin-bottom: 30px; }
            .logo-container { display: flex; align-items: center; gap: 15px; }
            .logo-img { max-height: 60px; max-width: 120px; object-fit: contain; }
            .title h2 { margin: 0; color: #0d8a8a; font-size: 24px; }
            .title p { margin: 0; font-size: 14px; color: #64748b; }
            .doc-info h1 { margin: 0; font-size: 20px; }
            .doc-info p { margin: 5px 0 0 0; font-size: 14px; color: #64748b; }
            .stats { display: flex; gap: 20px; margin-bottom: 30px; }
            .stat-box { flex: 1; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
            .stat-box p.label { margin: 0 0 5px 0; font-size: 12px; color: #64748b; }
            .stat-box p.val { margin: 0; font-size: 18px; font-weight: bold; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 14px; }
            th { background-color: #0d8a8a; color: white; padding: 12px; text-align: right; border: 1px solid #0d8a8a; }
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
      color: PURPLE_COLOR,
    },
    {
      title: isRtl ? "مبالغ مستحقة (غير مدفوعة)" : "Pending Amounts",
      value: `${pendingAmount.toLocaleString()} ${isRtl ? 'ج.م' : 'EGP'}`,
      description: isRtl ? `${invoices.filter((inv) => inv.status === "انتظار").length} فواتير قيد الانتظار` : `${invoices.filter((inv) => inv.status === "انتظار").length} pending invoices`,
      icon: DollarSign,
      color: PURPLE_COLOR,
    },
    {
      title: isRtl ? "إجمالي الفواتير الصادرة" : "Total Invoices Issued",
      value: `${invoices.length} ${isRtl ? 'فاتورة' : 'Invoices'}`,
      description: isRtl ? `نشط: ${invoices.filter((inv) => inv.status === "مدفوع").length} | انتظار: ${invoices.filter((inv) => inv.status === "انتظار").length}` : `Paid: ${invoices.filter((inv) => inv.status === "مدفوع").length} | Pending: ${invoices.filter((inv) => inv.status === "انتظار").length}`,
      icon: CreditCard,
      color: PURPLE_COLOR,
    },
  ];

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-blue-600" />
            {isRtl ? "المالية والفواتير" : "Billing & Invoices"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{isRtl ? "مراقبة التسويات المالية، شراء باقات المرضى، والفواتير الصادرة" : "Monitor financial settlements, patient packages, and issued invoices"}</p>
        </div>
        <div className={`flex gap-2 ${isRtl ? "" : "flex-row-reverse"}`}>
          {hasPermission("export_data") && (
            <Button variant="outline" className={`gap-2 ${isRtl ? "" : "flex-row-reverse"}`} onClick={handleExportPDF}>
              <Download className="w-4 h-4 text-slate-500" />
              {isRtl ? "تصدير PDF (طباعة)" : "Export PDF (Print)"}
            </Button>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dynamicStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="shadow-xs hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4 px-6">
          <div className="space-y-1">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" />
              {isRtl ? "أحدث الفواتير والمعاملات المالية" : "Recent Invoices & Transactions"}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{isRtl ? "قائمة التسويات وحجوزات الباقات الصادرة حديثاً للعيادة" : "List of recent settlements and package bookings"}</p>
          </div>
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            {isRtl ? "نشط" : "Active"}
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className={`bg-muted/40 border-b text-xs font-semibold text-slate-500 uppercase tracking-wider ${isRtl ? "text-right" : "text-left"}`}>
                  <th className="py-3.5 px-6">{isRtl ? "رقم الفاتورة" : "Invoice ID"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "المريض" : "Patient"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "البيان" : "Description"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "القيمة" : "Amount"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "تاريخ الفاتورة" : "Date"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "طريقة الدفع" : "Payment"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "الحالة" : "Status"}</th>
                  <th className="py-3.5 px-6">{isRtl ? "إجراءات" : "Actions"}</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-border/60 text-sm text-slate-700 ${isRtl ? "text-right" : "text-left"}`}>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-6 font-mono font-semibold text-slate-900">{inv.id}</td>
                    <td className="py-4 px-6 font-medium text-slate-800">
                      <Link href={`/patients/${inv.patientId}`} className="text-[#0d8a8a] hover:underline dark:text-[#1ab0b2]">
                        {patients.find(p => p.id === inv.patientId)?.nameAr || inv.patientName}
                      </Link>
                    </td>
                    <td className="py-4 px-6 text-slate-600">{inv.description}</td>
                    <td className="py-4 px-6 font-semibold text-slate-900 font-mono">{inv.amount}</td>
                    <td className="py-4 px-6 text-slate-500 font-mono text-xs">{inv.date}</td>
                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {inv.status === "مدفوع" ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {isRtl ? "نقدي" : "Cash"}
                        </span>
                      ) : (
                        <span>â€”</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <select
                        value={inv.status}
                        disabled={!hasPermission("create_invoice") && !isAdmin}
                        onChange={async (e) => {
                          const newStatus = normalizeInvoiceStatus(e.target.value);
                          
                          try {
                            await supabase
                              .from("patients")
                              .update({ status: newStatus === "مدفوع" ? "نشط" : "غير نشط" })
                              .eq("clinic_id", clinicId)
                              .eq("id", inv.patientId);

                            const { error: invoiceErr } = await supabase
                              .from("invoices")
                              .update({ status: newStatus })
                              .eq("clinic_id", clinicId)
                              .eq("id", inv.id);
                            if (invoiceErr) throw invoiceErr;
                          } catch (err: any) {
                            console.error("Failed to update status in Supabase:", err);
                            alert("حدث خطأ في قاعدة البيانات: " + (err?.message || JSON.stringify(err)));
                          }
                          
                          setInvoices((prev) =>
                            prev.map((item) =>
                              item.id === inv.id
                                ? {
                                    ...item,
                                    status: newStatus,
                                    paymentMethod: newStatus === "مدفوع" ? (isRtl ? "نقدي" : "Cash") : "â€”",
                                  }
                                : item
                            )
                          );
                        }}
                        className={`rounded-md px-2 py-1 text-xs font-semibold border cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600 transition-colors ${statusSelectClass(inv.status)}`}
                      >
                        <option value="انتظار">{isRtl ? "⏳ انتظار" : "â³ Pending"}</option>
                        <option value="مدفوع">{isRtl ? "✅ مدفوع" : "âœ… Paid"}</option>
                        <option value="ملغي">{isRtl ? "🚫 ملغي" : "ðŸš« Canceled"}</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {hasPermission("apply_discount") && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[#4F46BA] hover:text-[#4338ca] text-xs"
                            onClick={() => {
                              setSelectedInvoiceForDiscount(inv);
                              setDiscountValue("");
                              setDiscountModalOpen(true);
                            }}
                          >
                            {isRtl ? "تطبيق خصم" : "Discount"}
                          </Button>
                        )}
                        {(isAdmin || hasPermission("create_invoice")) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 rounded-lg transition-colors"
                            onClick={() => handleDeleteInvoiceClick(inv.id)}
                            title={isRtl ? "حذف الفاتورة" : "Delete Invoice"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Discount Modal */}
      <Dialog open={discountModalOpen} onOpenChange={(open: boolean) => !open && setDiscountModalOpen(false)}>
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-2">
              <DollarSign className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "تطبيق خصم مالي" : "Apply Discount"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl 
                ? "أدخل قيمة الخصم كنسبة مئوية (مثل 10%) أو قيمة نقدية لتطبيقها على الفاتورة الحالية." 
                : "Enter discount value as a percentage (e.g. 10%) or flat amount to apply it to the current invoice."}
            </DialogDescription>
            <div className={`w-full mt-4 flex flex-wrap gap-2 justify-center`}>
              {[10, 20, 30, 50, 100].map(pct => (
                <Button 
                  key={pct}
                  type="button"
                  variant={discountValue === `${pct}%` ? "default" : "outline"}
                  onClick={() => setDiscountValue(`${pct}%`)}
                  className={`flex-1 min-w-[30%] ${discountValue === `${pct}%` ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white" : ""}`}
                >
                  {pct === 100 ? (isRtl ? "مجاني 100%" : "Free 100%") : `${pct}%`}
                </Button>
              ))}
            </div>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDiscountModalOpen(false)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button 
              type="button" 
              disabled={!discountValue}
              onClick={async () => {
                if (discountValue) {
                  const item = selectedInvoiceForDiscount;
                  if (!item) return;
                  
                  const originalNumeric = parseInt(item.amount.replace(/[^0-9]/g, "") || "0");
                  const pct = parseInt(discountValue.replace(/[^0-9]/g, "") || "0");
                  let newNumeric = originalNumeric - Math.round(originalNumeric * pct / 100);
                  if (newNumeric < 0) newNumeric = 0;
                  const currency = item.amount.replace(/[0-9,]/g, "").trim(); 
                  const newAmount = `${newNumeric.toLocaleString()} ${currency}`;

                  try {
                    await supabase.from("invoices").upsert({
                      id: item.id,
                      clinic_id: clinicId,
                      patient_id: item.patientId,
                      patient_name: item.patientName,
                      description: item.description,
                      amount: newAmount,
                      status: item.status
                    });
                  } catch (err) {
                    console.error("Failed to save discount to Supabase", err);
                  }

                  setInvoices(prev => {
                    const newInvoices = prev.map(inv => {
                      if (inv.id === item.id) {
                        return { ...inv, amount: newAmount };
                      }
                      return inv;
                    });
                    return newInvoices;
                  });
                  setDiscountModalOpen(false);
                }
              }} 
              className="flex-1 bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] rounded-xl font-bold"
            >
              {isRtl ? "تأكيد الخصم" : "Apply Discount"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Invoice Confirmation Modal */}
      <Dialog open={!!deleteInvoiceId} onOpenChange={(open: boolean) => !open && setDeleteInvoiceId(null)}>
        <DialogContent className="sm:max-w-sm text-center" showCloseButton={false}>
          <div className="flex flex-col items-center justify-center space-y-4 pt-4">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-2">
              <Trash2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-bold text-slate-800">
              {isRtl ? "تأكيد الحذف" : "Confirm Deletion"}
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              {isRtl 
                ? `هل أنت متأكد؟ سيتم حذف الفاتورة وملف المريض كاملاً (${deleteInvoiceId}) بشكل نهائي من جميع الصفحات. لا يمكن التراجع عن هذا الإجراء.` 
                : `Are you sure? This will permanently delete the invoice and the entire patient record (${deleteInvoiceId}) from all pages. This action cannot be undone.`}
            </DialogDescription>
          </div>
          <div className={`mt-6 flex gap-3 w-full ${isRtl ? "flex-row-reverse" : "flex-row"}`}>
            <Button type="button" variant="outline" onClick={() => setDeleteInvoiceId(null)} className="flex-1 rounded-xl font-bold">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button type="button" onClick={executeDeleteInvoice} className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold">
              {isRtl ? "نعم، احذف الفاتورة" : "Yes, Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
