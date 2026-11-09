"use client"

import React, { useState, useEffect } from "react"
import { Crown, Shield, Zap, CheckCircle, ArrowRight, CreditCard, X, AlertCircle, Check, Upload, Star, Plus } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Loader } from "@/components/Loader"

const PLANS = (isRtl: boolean) => [
  {
    id: "basic", name: isRtl ? "الأساسية" : "Basic", price: 0,
    subtitle: isRtl ? "مجانية — ابدأ فوراً" : "Free — start instantly",
    icon: Zap, gradient: "from-slate-400 to-slate-500",
    features: [
      isRtl ? "حتى 50 مريض" : "Up to 50 patients",
      isRtl ? "100 جلسة / شهر" : "100 sessions / month",
      isRtl ? "إدارة المواعيد" : "Appointment management",
      isRtl ? "دعم عبر البريد" : "Email support",
    ],
    cta: isRtl ? "اختيار مجاني" : "Choose Free",
  },
  {
    id: "silver", name: isRtl ? "الفضية" : "Silver", price: 1000,
    subtitle: isRtl ? "للعيادات المتوسطة" : "For growing clinics",
    icon: Shield, gradient: "from-cyan-500 to-blue-600",
    features: [
      isRtl ? "حتى 200 مريض" : "Up to 200 patients",
      isRtl ? "500 جلسة / شهر" : "500 sessions / month",
      isRtl ? "التقارير والتحليلات" : "Reports & analytics",
      isRtl ? "التغذية العلاجية" : "Clinical nutrition",
      isRtl ? "دعم هاتفي" : "Phone support",
    ],
    cta: isRtl ? "اختيار الفضية" : "Choose Silver",
  },
  {
    id: "gold", name: isRtl ? "الذهبية" : "Gold", price: 1500,
    subtitle: isRtl ? "للمراكز الطبية الكبرى" : "For large clinics",
    icon: Crown, gradient: "from-amber-500 via-orange-400 to-yellow-400",
    features: [
      isRtl ? "مرضى غير محدودين" : "Unlimited patients",
      isRtl ? "جلسات غير محدودة" : "Unlimited sessions",
      isRtl ? "جميع الميزات مفتوحة" : "All features unlocked",
      isRtl ? "المكتبة العلاجية" : "Rehab library",
      isRtl ? "رسائل التذكير" : "Reminders (SMS/WA)",
      isRtl ? "دعم VIP 24/7" : "VIP 24/7 support",
    ],
    cta: isRtl ? "اختيار الذهبية" : "Choose Gold",
  },
]

interface Props {
  step: "plan" | "clinic" | "done"
  setStep: (s: "plan" | "clinic" | "done") => void
  clinicId?: string | null
  isRtl: boolean
  sessionEmail?: string
  sessionName?: string
  hidePlanStep?: boolean
}

export default function OnboardingFlow({ step, setStep, clinicId: propClinicId, isRtl, sessionEmail = "", sessionName = "", hidePlanStep = false }: Props) {
  const { user } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState("")
  const [resolvedClinicId, setResolvedClinicId] = useState<string | null | undefined>(propClinicId)
  const clinicId = resolvedClinicId || propClinicId

  // Clinic form
  const [isUploading, setIsUploading] = useState(false)
  const [centers, setCenters] = useState<Array<{
    id: string;
    shortName: string;
    fullName: string;
    slug: string;
    logoFile: File | null;
    logoPreview: string;
  }>>([{ id: "1", shortName: "", fullName: sessionName || "", slug: "", logoFile: null, logoPreview: "" }]);
  const [createdCenterSlug, setCreatedCenterSlug] = useState("");
  const [centerOtpSent, setCenterOtpSent] = useState(false);
  const [centerOtpCode, setCenterOtpCode] = useState("");
  const [isSendingCenterOtp, setIsSendingCenterOtp] = useState(false);

  const addCenter = () => {
    if (centers.length >= 5) return;
    setCenters([...centers, { id: String(Date.now()), shortName: "", fullName: "", slug: "", logoFile: null, logoPreview: "" }]);
  };

  const removeCenter = (id: string) => {
    if (centers.length <= 1) return;
    setCenters(centers.filter(c => c.id !== id));
  };

  const updateCenter = (id: string, key: string, value: any) => {
    setCenters(centers.map(c => c.id === id ? { ...c, [key]: value } : c));
  };

  // Paymob
  const [iframeUrl, setIframeUrl] = useState("")
  const [showBilling, setShowBilling] = useState(false)
  const [billingFirstName, setBillingFirstName] = useState("")
  const [billingLastName, setBillingLastName] = useState("")
  const [billingEmail, setBillingEmail] = useState("")
  const [billingPhone, setBillingPhone] = useState("")
  const [payError, setPayError] = useState("")
  const [payLoading, setPayLoading] = useState(false)



  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId)
    setError("")
    setStep("clinic")
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan) return
    
    const currentClinicId = resolvedClinicId || clinicId;
    if (!currentClinicId) {
      setPayError(isRtl ? "يرجى إنشاء العيادة أولاً" : "Please create clinic first");
      return;
    }

    setPayLoading(true)
    setPayError("")
    try {
      const res = await fetch("/api/paymob/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          billingPeriod: "monthly",
          billingData: {
            first_name: billingFirstName || "Clinic",
            last_name: billingLastName || "Admin",
            email: billingEmail || user?.email || sessionEmail || "",
            phone_number: billingPhone || "01000000000",
            apartment: "N/A", floor: "N/A", street: "N/A",
            building: "N/A", shipping_method: "PKG",
            postal_code: "00000", city: "Cairo",
            country: "EG", state: "Cairo",
          },
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.iframeUrl) throw new Error(data.error || "فشل إعداد الدفع")
      setIframeUrl(data.iframeUrl)
      setShowBilling(false)
    } catch (e: any) {
      setPayError(e?.message || "تعذر الاتصال بخادم الدفع")
    } finally {
      setPayLoading(false)
    }
  }


  const handleSendCenterOtp = async () => {
    setError("");
    setIsSendingCenterOtp(true);
    try {
      const res = await fetch("/api/setup/send-center-otp", { method: "POST", headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || (isRtl ? "تعذر إرسال رمز التحقق" : "Could not send verification code"));
      setCenterOtpSent(true);
      setCenterOtpCode("");
    } catch (e: any) {
      setError(e?.message || (isRtl ? "تعذر إرسال رمز التحقق" : "Could not send verification code"));
    } finally {
      setIsSendingCenterOtp(false);
    }
  };

  const handleCreateClinic = async () => {
    setError("")

    const validCenters = centers.filter(c => c.shortName.trim() && c.slug.trim())
    if (validCenters.length === 0) {
      setError(isRtl ? "الرجاء إدخال بيانات مركز واحد على الأقل" : "Please fill in at least one center")
      return
    }

    if (!centerOtpSent) {
      await handleSendCenterOtp();
      return;
    }
    if (!/^\d{6}$/.test(centerOtpCode.trim())) {
      setError(isRtl ? "أدخل رمز التحقق المكوّن من 6 أرقام" : "Enter the 6-digit verification code");
      return;
    }

    setIsUploading(true)

    let currentClinicId = clinicId || resolvedClinicId;
    let createdBranches: any[] = [];

    // 1. Submit transaction (Clinic, Staff, Settings, Branches without Logos)
    const centersPayload = validCenters.map(c => ({
      fullName: c.fullName,
      shortName: c.shortName,
      slug: c.slug
    }));

    try {
      const res = await fetch("/api/setup/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email || sessionEmail || "",
          name: user?.name || sessionName || "Clinic Admin",
          centers: centersPayload,
          code: centerOtpCode.trim()
        }),
      });
      const data = await res.json();
      if (res.ok && data.clinicId) {
        currentClinicId = data.clinicId;
        createdBranches = data.createdBranches || [];
        setResolvedClinicId(currentClinicId);
        data.createdSlugs?.length > 0 && setCreatedCenterSlug(data.createdSlugs[0]);
      } else {
        setError(data.error || (isRtl ? "فشل إعداد العيادة." : "Failed to setup clinic."));
        setIsUploading(false)
        return
      }
    } catch (e: any) {
      setError(e?.message || (isRtl ? "حدث خطأ أثناء الإعداد" : "Error during setup"))
      setIsUploading(false)
      return
    }

    // 2. Upload logos and update branches
    for (const center of validCenters) {
      if (center.logoFile) {
        // Find the created branch ID
        const branchId = createdBranches.find(b => b.slug === center.slug)?.id;
        if (!branchId) continue;

        try {
          const formData = new FormData()
          formData.append("file", center.logoFile)
          formData.append("clinicId", currentClinicId || "")
          
          const uploadRes = await fetch("/api/upload/logo", { method: "POST", body: formData })
          const uploadData = await uploadRes.json()
          if (!uploadRes.ok) throw new Error(uploadData.error || "فشل رفع الشعار")
          
          // Update the branch with the logoUrl
          await fetch(`/api/branches/${branchId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logo_url: uploadData.url }),
          })
        } catch (e: any) {
          // Non-critical: we don't return here so the user can still proceed even if logo fails
          console.error("Logo upload or branch update failed:", e);
        }
      }
    }

    setIsUploading(false)

    // 3. Handle Subscription / Billing
    if (hidePlanStep) {
      setStep("done");
      return;
    }

    if (selectedPlan === "basic") {
      try {
        const body = {
          clinicId: currentClinicId,
          planId: "basic",
          email: user?.email || sessionEmail || "",
          name: user?.name || sessionName || "Clinic Admin",
        };
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "فشل تفعيل الخطة")
        setStep("done")
        window.setTimeout(() => window.location.replace("/home"), 1800)
      } catch (e: any) {
        setError(e?.message || "حدث خطأ أثناء التفعيل")
      }
    } else {
      setShowBilling(true)
    }
  }

  const selectedPlanData = PLANS(isRtl).find(p => p.id === selectedPlan)

  // Auto-trigger plan selection from URL param (e.g., /setup?step=plan&plan_id=basic)
  useEffect(() => {
    const planId = new URLSearchParams(window.location.search).get("plan_id");
    console.log("[OnboardingFlow] useEffect fired", { planId, selectedPlan, step, email: sessionEmail, clinicId });
    if (planId && !selectedPlan && step === "plan") {
      console.log("[OnboardingFlow] Calling handleSelectPlan with", planId);
      handleSelectPlan(planId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paymob iframe
  if (iframeUrl) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-bold text-slate-700">دفع آمن عبر Paymob</span>
            </div>
            <button onClick={() => setIframeUrl("")} className="text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          <iframe src={iframeUrl} className="w-full h-[520px] border-0" title="Paymob Payment" allow="payment" />
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Steps indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[
          ...(!hidePlanStep ? [{ label: isRtl ? "اختر الباقة" : "Choose Plan", key: "plan" }] : []),
          { label: isRtl ? "بيانات المركز" : "Clinic Info", key: "clinic" },
          { label: isRtl ? "تم" : "Done", key: "done" },
        ].map((s, i) => {
          const stepOrder = hidePlanStep ? ["clinic", "done"] : ["plan", "clinic", "done"]
          const currentIdx = stepOrder.indexOf(step)
          const idx = stepOrder.indexOf(s.key)
          const isActive = idx === currentIdx
          const isDone = idx < currentIdx
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${isDone ? "bg-emerald-500 text-white" : isActive ? "bg-[#4F46BA] text-white ring-2 ring-[#4F46BA]/30" : "bg-slate-200 text-slate-400"}`}>
                {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${isActive ? "text-[#4F46BA] font-bold" : "text-slate-400"}`}>{s.label}</span>
              {i < 2 && <div className={`w-8 h-0.5 ${isDone ? "bg-emerald-500" : "bg-slate-200"}`} />}
            </div>
          )
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="max-w-md mx-auto mb-6 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-600">{error}</p>
        </div>
      )}

      {/* Step: Plan Selection */}
      {step === "plan" && (
        <div>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              {isRtl ? "اختر باقة اشتراكك" : "Choose Your Plan"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRtl ? "اختر الباقة المناسبة لاحتياجات عيادتك" : "Pick the right plan for your clinic"}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS(isRtl).map((plan) => {
              const Icon = plan.icon
              const isSelected = selectedPlan === plan.id
              return (
                <div key={plan.id}
                  className={`relative rounded-2xl border-2 p-5 transition-all duration-200 cursor-pointer ${plan.id === "silver" ? "border-[#4F46BA] bg-white shadow-xl shadow-indigo-100 scale-[1.02]" : "border-slate-200 bg-white hover:border-slate-300 shadow-sm"} ${isSelected ? "ring-2 ring-[#4F46BA]" : ""}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.id === "silver" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46BA] text-white text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-white" />
                      {isRtl ? "الأكثر طلباً" : "Most Popular"}
                    </div>
                  )}
                  <div className={`flex items-center gap-3 mb-3 ${plan.id === "silver" ? "mt-2" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-800">{plan.name}</h3>
                      <p className="text-[11px] text-slate-400">{plan.subtitle}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    {plan.price === 0 ? (
                      <span className="text-2xl font-extrabold text-slate-800">{isRtl ? "مجاني" : "Free"}</span>
                    ) : (
                      <span>
                        <span className="text-2xl font-extrabold text-slate-800">{plan.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 mr-1">{isRtl ? "ج.م / شهر" : "EGP / month"}</span>
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5 mb-5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-600">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={(e) => { e.stopPropagation(); handleSelectPlan(plan.id) }}
                    disabled={isActivating}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${plan.id === "silver" ? "bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] shadow-md" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {isActivating && selectedPlan === plan.id ? (
                      <Loader size={16} />
                    ) : (
                      <>{plan.cta} <ArrowRight className={`w-3.5 h-3.5 ${isRtl ? "rotate-180" : ""}`} /></>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Step: Clinic Details */}
      {step === "clinic" && (
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
              {isRtl ? "بيانات المركز" : "Clinic Details"}
            </h2>
            <p className="text-slate-500 text-sm">
              {isRtl ? (selectedPlan === "gold" ? "يمكنك إضافة حتى مركزين" : "أدخل بيانات مركزك العلاجي") : (selectedPlan === "gold" ? "You can add up to 2 centers" : "Enter your clinic information")}
            </p>
          </div>

          {centers.map((center, index) => (
            <div key={center.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 mb-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-slate-500">{isRtl ? `المركز ${index + 1}` : `Center ${index + 1}`}</span>
                {centers.length > 1 && (
                  <button onClick={() => removeCenter(center.id)} className="text-xs text-red-500 hover:text-red-700 transition-colors">
                    {isRtl ? "إزالة" : "Remove"}
                  </button>
                )}
              </div>

              <div className="space-y-1 mb-4">
                <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز المختصر" : "Short Clinic Name"} *</label>
                <input value={center.shortName} onChange={(e) => updateCenter(center.id, "shortName", e.target.value)}
                  placeholder={isRtl ? "مثلاً: مركز السلام للتأهيل" : "e.g. Al-Salam Rehab Center"}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                />
              </div>

              <div className="space-y-1 mb-4">
                <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز بالكامل" : "Full Clinic Name"}</label>
                <input value={center.fullName} onChange={(e) => updateCenter(center.id, "fullName", e.target.value)}
                  placeholder={isRtl ? "مثلاً: مركز السلام الدولي للعلاج الطبيعي والتأهيل" : "e.g. Al-Salam International PT & Rehab Center"}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
                />
              </div>

              <div className="space-y-1 mb-4">
                <label className="text-xs font-bold text-slate-600">{isRtl ? "الرمز التعريفي (Slug)" : "Clinic Slug"} *</label>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">primephysio.vercel.app/</span>
                  <input value={center.slug} onChange={(e) => updateCenter(center.id, "slug", e.target.value.replace(/[^a-zA-Z]/g, ""))}
                    placeholder={isRtl ? "السلام" : "al-salam"}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#4F46BA] transition-colors ltr"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">{isRtl ? "شعار المركز" : "Clinic Logo"}</label>
                <div onClick={() => document.getElementById(`logo-${center.id}`)?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4F46BA]/40 transition-colors"
                >
                  {center.logoPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={center.logoPreview} alt="Preview" className="w-20 h-20 object-contain rounded-lg" />
                      <span className="text-[11px] text-slate-400">{center.logoFile?.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="w-8 h-8 text-slate-300" />
                      <span className="text-xs text-slate-400">{isRtl ? "اضغط لرفع شعار المركز" : "Click to upload clinic logo"}</span>
                      <span className="text-[10px] text-slate-300">{isRtl ? "PNG, JPG — حد أقصى 2 ميجابايت" : "PNG, JPG — Max 2MB"}</span>
                    </div>
                  )}
                  <input id={`logo-${center.id}`} type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!file.type.startsWith("image/")) { setError(isRtl ? "الرجاء اختيار صورة" : "Please select an image"); return; }
                      if (file.size > 2 * 1024 * 1024) { setError(isRtl ? "حجم الصورة يجب أن لا يتجاوز 2 ميجابايت" : "Image must be under 2MB"); return; }
                      updateCenter(center.id, "logoFile", file);
                      updateCenter(center.id, "logoPreview", URL.createObjectURL(file));
                      setError("");
                    }}
                  />
                </div>
              </div>
            </div>
          ))}

          {centerOtpSent && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-4 space-y-3" dir={isRtl ? "rtl" : "ltr"}>
              <div>
                <p className="text-sm font-bold text-slate-800">{isRtl ? "تأكيد البريد الإلكتروني" : "Verify your email"}</p>
                <p className="text-xs text-slate-500 mt-1">{isRtl ? `أرسلنا رمزًا مكوّنًا من 6 أرقام إلى ${user?.email || sessionEmail || "بريد حسابك"}. الرمز صالح لمدة 10 دقائق.` : `We sent a 6-digit code to ${user?.email || sessionEmail || "your account email"}. It expires in 10 minutes.`}</p>
              </div>
              <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={centerOtpCode}
                onChange={(e) => setCenterOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••" dir="ltr" className="w-full border border-indigo-200 bg-white rounded-xl px-4 py-3 text-center text-xl tracking-[0.5em] font-bold outline-none focus:border-[#4F46BA]" />
              <button type="button" onClick={handleSendCenterOtp} disabled={isSendingCenterOtp} className="text-xs font-bold text-[#4F46BA] disabled:opacity-50">
                {isSendingCenterOtp ? (isRtl ? "جاري الإرسال..." : "Sending...") : (isRtl ? "إعادة إرسال الرمز" : "Resend code")}
              </button>
            </div>
          )}

          {selectedPlan === "gold" && centers.length < 5 && (
            <button onClick={addCenter}
              className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#4F46BA]/40 hover:text-[#4F46BA] text-sm font-bold transition-all mb-4 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {isRtl ? "إضافة مركز آخر" : "Add Another Center"}
            </button>
          )}

          <button onClick={handleCreateClinic}
            disabled={isUploading || isSendingCenterOtp || !centers.some(c => c.shortName.trim() && c.slug.trim())}
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
          >
            {isUploading || isSendingCenterOtp ? (
              <><Loader size={16} /> {isRtl ? (isSendingCenterOtp ? "جاري إرسال الرمز..." : "جاري إنشاء المراكز...") : (isSendingCenterOtp ? "Sending code..." : "Creating centers...")}</>
            ) : (
              <>{centerOtpSent ? (isRtl ? "تأكيد الرمز وإنشاء المراكز" : "Verify Code & Create Centers") : (isRtl ? "إرسال رمز التحقق" : "Send Verification Code")} <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} /></>
            )}
          </button>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <div className="max-w-md mx-auto text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-xl shadow-emerald-200">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 mb-2">
            {isRtl ? "تم إنشاء المركز بنجاح! 🎉" : "Clinic Created Successfully! 🎉"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            {isRtl
              ? "تم تفعيل اشتراكك وإنشاء مركزك. جاري تحويلك لصفحة الدخول..."
              : "Your clinic is set up. Redirecting to your login page..."}
          </p>
          
          <div className="flex justify-center mb-6">
            <Loader size={24} color="#4F46BA" />
          </div>

          <button onClick={() => {
                if (createdCenterSlug) {
                  window.location.href = `/${createdCenterSlug}`;
                } else {
                  window.location.href = "/home";
                }
              }}
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {isRtl ? "انقر هنا للتحويل الآن" : "Click here to redirect now"}
            <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>

          {/* Auto-redirect effect */}
          <img 
            src="/empty.gif" 
            alt="" 
            className="hidden" 
            onError={() => {
              setTimeout(() => {
                if (createdCenterSlug) {
                  window.location.href = `/${createdCenterSlug}`;
                } else {
                  window.location.href = "/home";
                }
              }, 2000);
            }}
          />
        </div>
      )}

      {/* Billing Modal */}
      {showBilling && selectedPlanData && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
            <div className={`h-1.5 w-full bg-gradient-to-r ${selectedPlanData.gradient}`} />
            <div className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${selectedPlanData.gradient} flex items-center justify-center`}>
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold">{isRtl ? "دفع آمن عبر Paymob" : "Secure Payment via Paymob"}</p>
                    <h3 className="text-sm font-extrabold text-slate-800">
                      {selectedPlanData.name} — {selectedPlanData.price.toLocaleString()} {isRtl ? "ج.م" : "EGP"}
                    </h3>
                  </div>
                </div>
                <button onClick={() => setShowBilling(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {payError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-600">{payError}</p>
                </div>
              )}
              <form onSubmit={handlePayment} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأول" : "First Name"}</label>
                    <input required value={billingFirstName} onChange={(e) => setBillingFirstName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{isRtl ? "الاسم الأخير" : "Last Name"}</label>
                    <input required value={billingLastName} onChange={(e) => setBillingLastName(e.target.value)}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "البريد الإلكتروني" : "Email"}</label>
                  <input required type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)}
                    defaultValue={user?.email || sessionEmail || ""}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">{isRtl ? "رقم الهاتف" : "Phone"}</label>
                  <input required type="tel" value={billingPhone} onChange={(e) => setBillingPhone(e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#4F46BA] transition-colors" />
                </div>
                <button type="submit" disabled={payLoading}
                  className={`w-full py-3 rounded-2xl text-sm font-bold text-white bg-gradient-to-r ${selectedPlanData.gradient} hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all`}>
                  {payLoading ? (
                    <><Loader size={16} /> {isRtl ? "جاري إعداد الدفع..." : "Preparing Payment..."}</>
                  ) : (
                    <><CreditCard className="w-4 h-4" /> {isRtl ? "إتمام الدفع" : "Complete Payment"}</>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
