"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, History, Key, Lock, Monitor, Shield, Smartphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/LanguageContext";

type SecurityEvent = {
  id: string;
  device: string;
  ip: string;
  time: string;
  status: string;
  icon: typeof Monitor;
  current: boolean;
};

export default function SecurityPage() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const isGoogleAccount = Boolean(user?.roleEn?.includes("Google"));

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [events, setEvents] = useState<SecurityEvent[]>([]);

  const loadSecurityEvents = async () => {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("id, action, module, details, created_at, user_email")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.warn("Failed to load security events", error);
      setEvents([]);
      return;
    }

    const mapped = (data || []).map((row: any, index: number): SecurityEvent => {
      const action = String(row.action || "").toUpperCase();
      const isLogin = action.includes("LOGIN");
      const isPassword = action.includes("PASSWORD");
      const current = index === 0;

      return {
        id: row.id,
        device: isLogin
          ? (isRtl ? "تسجيل دخول حديث" : "Recent login")
          : isPassword
          ? (isRtl ? "تحديث أمان" : "Security update")
          : (isRtl ? "نشاط حساب" : "Account activity"),
        ip: row.user_email || "Supabase",
        time: new Date(row.created_at || Date.now()).toLocaleString(isRtl ? "ar-EG" : "en-US"),
        status: current
          ? (isRtl ? "نشط الآن" : "Active now")
          : (isRtl ? "سجل حديث" : "Recent"),
        icon: current ? Monitor : Smartphone,
        current,
      };
    });

    setEvents(mapped);
  };

  useEffect(() => {
    loadSecurityEvents();
  }, [isRtl]);

  const passwordHelp = useMemo(() => {
    return isRtl
      ? "غيّر كلمة المرور الخاصة بحسابك الحالي في Supabase مباشرة."
      : "Change the password for your current Supabase account directly.";
  }, [isRtl]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (!user?.email) {
      setError(isRtl ? "لا يوجد مستخدم مسجل دخول حالياً." : "No authenticated user found.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(isRtl ? "أكمل جميع الحقول أولاً." : "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isRtl ? "كلمتا المرور الجديدتان غير متطابقتين." : "New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError(isRtl ? "كلمة المرور يجب ألا تقل عن 8 أحرف." : "Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError(isRtl ? "كلمة المرور الحالية غير صحيحة." : "Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) {
        setError(updateError.message);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      await loadSecurityEvents();
      window.setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err?.message || (isRtl ? "فشل تحديث كلمة المرور." : "Failed to update password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir={isRtl ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <div className="bg-teal-50 p-2 rounded-xl">
            <Shield className="w-6 h-6 text-[#0d8a8a]" />
          </div>
          {isRtl ? "الأمان وسجل الدخول" : "Security & Access"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{passwordHelp}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xs border-slate-200/60 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Key className="w-5 h-5 text-[#0d8a8a]" />
              {isRtl ? "تغيير كلمة المرور" : "Change Password"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {isGoogleAccount && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-blue-800">
                      {isRtl ? "حساب Google" : "Google Account"}
                    </p>
                    <p className="text-[10px] text-blue-600 leading-5">
                      {isRtl
                        ? "هذا الحساب يعتمد على Google للدخول، لذلك تغيير كلمة المرور من هنا لا يغيّر كلمة مرور Google نفسها. التغيير المباشر متاح للحسابات التي تستخدم كلمة مرور Supabase."
                        : "This account uses Google sign-in, so changing the password here will not change your Google password. Direct password changes apply to Supabase password accounts."}
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  {error}
                </div>
              )}

              {saved && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {isRtl ? "تم تحديث كلمة المرور بنجاح." : "Password updated successfully."}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{isRtl ? "كلمة المرور الحالية" : "Current Password"}</label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="focus-visible:ring-[#0d8a8a] rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "كلمة المرور الجديدة" : "New Password"}</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="focus-visible:ring-[#0d8a8a] rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "تأكيد كلمة المرور" : "Confirm Password"}</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="focus-visible:ring-[#0d8a8a] rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <div className="text-[11px] text-slate-500 leading-5">
                  {isRtl ? "سيتم حفظ التغيير داخل Supabase مباشرة." : "The change is applied directly in Supabase."}
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-[#0d8a8a] hover:bg-[#085454] text-white mr-auto rounded-xl gap-1.5 font-bold px-6 shadow-md transition-all active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  {saving ? (isRtl ? "جارِ الحفظ..." : "Saving...") : (isRtl ? "تحديث كلمة المرور" : "Update Password")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-xs border-slate-200/60 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <History className="w-5 h-5 text-[#0d8a8a]" />
              {isRtl ? "سجل النشاط الأمني" : "Security Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {isRtl ? "لا توجد أنشطة حديثة بعد." : "No recent activity yet."}
                </div>
              ) : (
                events.map((item) => (
                  <div key={item.id} className={`p-4 flex items-start gap-3 transition-colors hover:bg-slate-50 ${item.current ? "bg-teal-50/30" : ""}`}>
                    <div className={`p-2 rounded-xl shrink-0 ${item.current ? "bg-[#0d8a8a] text-white shadow-md" : "bg-slate-100 text-slate-500"}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5 gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{item.device}</p>
                        {item.current && (
                          <span className="text-[9px] font-bold bg-[#0d8a8a]/10 text-[#0d8a8a] px-2 py-0.5 rounded-full whitespace-nowrap">
                            {isRtl ? "الحالي" : "Current"}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono truncate">{item.ip}</p>
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="text-[10px] text-slate-400 truncate">{item.time}</span>
                        <span className={`text-[10px] font-bold whitespace-nowrap ${item.current ? "text-emerald-600" : "text-slate-400"}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
