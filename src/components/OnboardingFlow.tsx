"use client"

import React, { useState, useRef } from "react"
import { Crown, Shield, Zap, Loader2, CheckCircle, ArrowRight, CreditCard, X, AlertCircle, Check, Upload, Star } from "lucide-react"
import { useAuth } from "@/lib/auth"

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
}

export default function OnboardingFlow({ step, setStep, clinicId, isRtl }: Props) {
  const { user } = useAuth()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState("")

  // Clinic form
  const [shortName, setShortName] = useState("")
  const [fullName, setFullName] = useState("")
  const [slug, setSlug] = useState("")
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    if (planId === "basic") {
      setIsActivating(true)
      try {
        const res = await fetch("/api/subscription/select-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clinicId, planId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "فشل تفعيل الخطة")
        setStep("clinic")
      } catch (e: any) {
        setError(e?.message || "حدث خطأ")
      } finally {
        setIsActivating(false)
      }
    } else {
      setShowBilling(true)
    }
  }

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlan || !clinicId) return
    setPayLoading(true)
    setPayError("")
    try {
      const res = await fetch("/api/paymob/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan,
          billingData: {
            first_name: billingFirstName || "Clinic",
            last_name: billingLastName || "Admin",
            email: billingEmail || user?.email || "",
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError(isRtl ? "الرجاء اختيار صورة" : "Please select an image")
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(isRtl ? "حجم الصورة يجب أن لا يتجاوز 2 ميجابايت" : "Image must be under 2MB")
      return
    }
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setError("")
  }

  const handleCreateClinic = async () => {
    setError("")
    if (!clinicId) {
      setError(isRtl ? "لم يتم تحميل بيانات العيادة" : "Clinic data not loaded")
      return
    }
    if (!shortName.trim()) {
      setError(isRtl ? "الرجاء إدخال اسم المركز المختصر" : "Please enter clinic short name")
      return
    }
    if (!slug.trim()) {
      setError(isRtl ? "الرجاء إدخال الرمز التعريفي" : "Please enter clinic slug")
      return
    }
    if (!/^[a-zA-Z]+$/.test(slug)) {
      setError(isRtl ? "الرمز التعريفي يجب أن يكون حروف إنجليزية فقط" : "Slug must be English letters only")
      return
    }

    setIsUploading(true)
    let logoUrl = ""

    if (logoFile) {
      const formData = new FormData()
      formData.append("file", logoFile)
      formData.append("clinicId", clinicId)
      try {
        const uploadRes = await fetch("/api/upload/logo", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) throw new Error(uploadData.error || "فشل رفع الشعار")
        logoUrl = uploadData.url
      } catch (e: any) {
        setError(e?.message || "فشل رفع الشعار")
        setIsUploading(false)
        return
      }
    }

    try {
      const res = await fetch("/api/clinics/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          slug: slug.trim(),
          fullName: fullName.trim(),
          shortName: shortName.trim(),
          logoUrl,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "فشل إنشاء المركز")
      setStep("done")
    } catch (e: any) {
      setError(e?.message || "حدث خطأ")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSlugChange = (val: string) => {
    const filtered = val.replace(/[^a-zA-Z]/g, "")
    setSlug(filtered)
  }

  const selectedPlanData = PLANS(isRtl).find(p => p.id === selectedPlan)

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
          { label: isRtl ? "اختر الباقة" : "Choose Plan", key: "plan" },
          { label: isRtl ? "بيانات المركز" : "Clinic Info", key: "clinic" },
          { label: isRtl ? "تم" : "Done", key: "done" },
        ].map((s, i) => {
          const stepOrder = ["plan", "clinic", "done"]
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
                      <Loader2 className="w-4 h-4 animate-spin" />
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
              {isRtl ? "أدخل بيانات مركزك العلاجي" : "Enter your clinic information"}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 sm:p-8 space-y-5">
            {/* Platform Logo */}
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-2 mb-1">
                <img src="/logo.png" alt="Prime Physio" className="w-8 h-8 object-contain" />
                <span className="text-sm font-bold text-[#4F46BA]">Prime Physio</span>
              </div>
            </div>

            {/* Short Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز المختصر" : "Short Clinic Name"} *</label>
              <input value={shortName} onChange={(e) => setShortName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام للتأهيل" : "e.g. Al-Salam Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
              <p className="text-[10px] text-slate-400">{isRtl ? "سيظهر تحت شعار المنصة" : "Appears under the platform logo"}</p>
            </div>

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "اسم المركز بالكامل" : "Full Clinic Name"}</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                placeholder={isRtl ? "مثلاً: مركز السلام الدولي للعلاج الطبيعي والتأهيل" : "e.g. Al-Salam International PT & Rehab Center"}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#4F46BA] transition-colors"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "الرمز التعريفي (Slug)" : "Clinic Slug"} *</label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">primephysio.vercel.app/</span>
                <input value={slug} onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder={isRtl ? "مركز-السلام" : "al-salam"}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-[#4F46BA] transition-colors ltr"
                  dir="ltr"
                />
              </div>
              <p className="text-[10px] text-slate-400">{isRtl ? "حروف إنجليزية فقط — بدون أرقام أو رموز أو حروف عربية" : "English letters only — no numbers, symbols, or Arabic"}</p>
            </div>

            {/* Logo Upload */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">{isRtl ? "شعار المركز" : "Clinic Logo"}</label>
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#4F46BA]/40 transition-colors"
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={logoPreview} alt="Preview" className="w-20 h-20 object-contain rounded-lg" />
                    <span className="text-[11px] text-slate-400">{logoFile?.name}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-slate-300" />
                    <span className="text-xs text-slate-400">{isRtl ? "اضغط لرفع شعار المركز" : "Click to upload clinic logo"}</span>
                    <span className="text-[10px] text-slate-300">{isRtl ? "PNG, JPG — حد أقصى 2 ميجابايت" : "PNG, JPG — Max 2MB"}</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
            </div>

            {/* Create Button */}
            <button onClick={handleCreateClinic} disabled={isUploading || !shortName.trim() || !slug.trim()}
              className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md active:scale-[0.98] mt-2"
            >
              {isUploading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {isRtl ? "جاري إنشاء المركز..." : "Creating clinic..."}</>
              ) : (
                <>{isRtl ? "إنشاء المركز" : "Create Clinic"} <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} /></>
              )}
            </button>
          </div>
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
          <p className="text-slate-500 text-sm mb-8">
            {isRtl
              ? "تم تفعيل اشتراكك وإنشاء مركزك. يمكنك الآن البدء في إضافة المرضى والجلسات"
              : "Your subscription is active and clinic is set up. Start adding patients and sessions"}
          </p>
          <button onClick={() => window.location.href = "/home"}
            className="w-full bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white font-bold py-3 rounded-2xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {isRtl ? "دخول للمنصة" : "Enter Dashboard"}
            <ArrowRight className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>
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
                    defaultValue={user?.email || ""}
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
                    <><Loader2 className="w-4 h-4 animate-spin" /> {isRtl ? "جاري إعداد الدفع..." : "Preparing Payment..."}</>
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
