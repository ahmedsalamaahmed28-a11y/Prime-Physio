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
  const { user } = useAuth(); const clinicId = user?.clinicId;
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
      .select("id, action, details, created_at, user_email")
      .eq('clinic_id', clinicId)
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
          ? (isRtl ? "ØªØ³Ø¬ÙŠÙ„ Ø¯Ø®ÙˆÙ„ Ø­Ø¯ÙŠØ«" : "Recent login")
          : isPassword
          ? (isRtl ? "ØªØ­Ø¯ÙŠØ« Ø£Ù…Ø§Ù†" : "Security update")
          : (isRtl ? "Ù†Ø´Ø§Ø· Ø­Ø³Ø§Ø¨" : "Account activity"),
        ip: row.user_email || "Supabase",
        time: new Date(row.created_at || Date.now()).toLocaleString(isRtl ? "ar-EG" : "en-US"),
        status: current
          ? (isRtl ? "Ù†Ø´Ø· Ø§Ù„Ø¢Ù†" : "Active now")
          : (isRtl ? "Ø³Ø¬Ù„ Ø­Ø¯ÙŠØ«" : "Recent"),
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
      ? "ØºÙŠÙ‘Ø± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø®Ø§ØµØ© Ø¨Ø­Ø³Ø§Ø¨Ùƒ Ø§Ù„Ø­Ø§Ù„ÙŠ ÙÙŠ Supabase Ù…Ø¨Ø§Ø´Ø±Ø©."
      : "Change the password for your current Supabase account directly.";
  }, [isRtl]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (!user?.email) {
      setError(isRtl ? "Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…Ø³ØªØ®Ø¯Ù… Ù…Ø³Ø¬Ù„ Ø¯Ø®ÙˆÙ„ Ø­Ø§Ù„ÙŠØ§Ù‹." : "No authenticated user found.");
      return;
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(isRtl ? "Ø£ÙƒÙ…Ù„ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ø­Ù‚ÙˆÙ„ Ø£ÙˆÙ„Ø§Ù‹." : "Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(isRtl ? "ÙƒÙ„Ù…ØªØ§ Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯ØªØ§Ù† ØºÙŠØ± Ù…ØªØ·Ø§Ø¨Ù‚ØªÙŠÙ†." : "New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError(isRtl ? "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± ÙŠØ¬Ø¨ Ø£Ù„Ø§ ØªÙ‚Ù„ Ø¹Ù† 8 Ø£Ø­Ø±Ù." : "Password must be at least 8 characters.");
      return;
    }

    setSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setError(isRtl ? "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ© ØºÙŠØ± ØµØ­ÙŠØ­Ø©." : "Current password is incorrect.");
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
      setError(err?.message || (isRtl ? "ÙØ´Ù„ ØªØ­Ø¯ÙŠØ« ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±." : "Failed to update password."));
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
          {isRtl ? "Ø§Ù„Ø£Ù…Ø§Ù† ÙˆØ³Ø¬Ù„ Ø§Ù„Ø¯Ø®ÙˆÙ„" : "Security & Access"}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">{passwordHelp}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-xs border-slate-200/60 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <Key className="w-5 h-5 text-[#0d8a8a]" />
              {isRtl ? "ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±" : "Change Password"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordChange} className="space-y-5">
              {isGoogleAccount && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-blue-800">
                      {isRtl ? "Ø­Ø³Ø§Ø¨ Google" : "Google Account"}
                    </p>
                    <p className="text-[10px] text-blue-600 leading-5">
                      {isRtl
                        ? "Ù‡Ø°Ø§ Ø§Ù„Ø­Ø³Ø§Ø¨ ÙŠØ¹ØªÙ…Ø¯ Ø¹Ù„Ù‰ Google Ù„Ù„Ø¯Ø®ÙˆÙ„ØŒ Ù„Ø°Ù„Ùƒ ØªØºÙŠÙŠØ± ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ù…Ù† Ù‡Ù†Ø§ Ù„Ø§ ÙŠØºÙŠÙ‘Ø± ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Google Ù†ÙØ³Ù‡Ø§. Ø§Ù„ØªØºÙŠÙŠØ± Ø§Ù„Ù…Ø¨Ø§Ø´Ø± Ù…ØªØ§Ø­ Ù„Ù„Ø­Ø³Ø§Ø¨Ø§Øª Ø§Ù„ØªÙŠ ØªØ³ØªØ®Ø¯Ù… ÙƒÙ„Ù…Ø© Ù…Ø±ÙˆØ± Supabase."
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
                  {isRtl ? "ØªÙ… ØªØ­Ø¯ÙŠØ« ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø¨Ù†Ø¬Ø§Ø­." : "Password updated successfully."}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">{isRtl ? "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø­Ø§Ù„ÙŠØ©" : "Current Password"}</label>
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
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ± Ø§Ù„Ø¬Ø¯ÙŠØ¯Ø©" : "New Password"}</label>
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
                  <label className="text-xs font-bold text-slate-700">{isRtl ? "ØªØ£ÙƒÙŠØ¯ ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±" : "Confirm Password"}</label>
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
                  {isRtl ? "Ø³ÙŠØªÙ… Ø­ÙØ¸ Ø§Ù„ØªØºÙŠÙŠØ± Ø¯Ø§Ø®Ù„ Supabase Ù…Ø¨Ø§Ø´Ø±Ø©." : "The change is applied directly in Supabase."}
                </div>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-[#4F46BA] to-[#7c3aed] text-white hover:from-[#4338ca] hover:to-[#6d28d9] mr-auto rounded-xl gap-1.5 font-bold px-6 shadow-md transition-all active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  {saving ? (isRtl ? "Ø¬Ø§Ø±Ù Ø§Ù„Ø­ÙØ¸..." : "Saving...") : (isRtl ? "ØªØ­Ø¯ÙŠØ« ÙƒÙ„Ù…Ø© Ø§Ù„Ù…Ø±ÙˆØ±" : "Update Password")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-xs border-slate-200/60 rounded-2xl overflow-hidden">
          <CardHeader className="border-b bg-slate-50/50 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-800">
              <History className="w-5 h-5 text-[#0d8a8a]" />
              {isRtl ? "Ø³Ø¬Ù„ Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ù…Ù†ÙŠ" : "Security Activity"}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-0">
            <div className="divide-y divide-slate-100">
              {events.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  {isRtl ? "Ù„Ø§ ØªÙˆØ¬Ø¯ Ø£Ù†Ø´Ø·Ø© Ø­Ø¯ÙŠØ«Ø© Ø¨Ø¹Ø¯." : "No recent activity yet."}
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
                            {isRtl ? "Ø§Ù„Ø­Ø§Ù„ÙŠ" : "Current"}
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
