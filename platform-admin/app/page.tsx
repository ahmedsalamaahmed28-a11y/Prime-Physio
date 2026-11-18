"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Dashboard = {
  adminEmail: string;
  metrics: { clinics: number; activeClinics: number; patients: number; activeSubscriptions: number; pendingPayments: number; approvedPayments: number; approvedValue: number };
  requests: any[];
  clinics: any[];
  plans: any[];
};

const money = (n: number) => new Intl.NumberFormat("en-EG", { style: "currency", currency: "EGP", maximumFractionDigits: 0 }).format(n || 0);

const loginCopy = {
  ar: {
    brand: "برايم فيزيو", portal: "بوابة الوصول الإدارية المركزية", active: "بوابة الإدارة", secure: "اتصال آمن", headerSecure: "HTTPS · SECURE ACCESS",
    control: "مركز التحكم · 01", product: "Prime Physio", enterprise: "Enterprise", productSub: "Platform Control Center",
    eyebrow: "مساحة الإدارة الخاصة", welcome: "مرحبًا بعودتك", welcomeSub: "سجّل الدخول لمتابعة إدارة المنصة والاشتراكات.",
    forgotTitle: "استعادة كلمة المرور", forgotSub: "أدخل بريد المدير وسنرسل إليه رمز استعادة آمنًا.",
    verifyTitle: "تحقق من بريدك الإلكتروني", verifySub: "أدخل رمز التحقق الذي أرسلناه إلى بريدك، ثم عيّن كلمة مرور جديدة.",
    email: "البريد الإلكتروني", adminId: "معرّف مدير المنصة", password: "كلمة المرور", forgot: "نسيت كلمة المرور؟",
    passwordPlaceholder: "أدخل كلمة المرور", security: "الدخول مخصص لمدير المنصة المعتمد", restricted: "مقيّد",
    login: "تسجيل الدخول", loggingIn: "جارٍ التحقق من بياناتك…", recoveryEmail: "البريد الإلكتروني للمدير",
    sendCode: "إرسال رمز التحقق", sending: "جارٍ إرسال الرمز…", back: "العودة إلى تسجيل الدخول",
    sentTo: "تم إرسال الرمز إلى", otp: "رمز التحقق (8 أرقام)", newPassword: "كلمة المرور الجديدة",
    confirmPassword: "تأكيد كلمة المرور الجديدة", confirm: "تأكيد وتغيير كلمة المرور", updating: "جارٍ تحديث كلمة المرور…",
    resend: "إعادة إرسال رمز جديد", access: "صلاحية الوصول", accessValue: "مدير المنصة", session: "حماية الجلسة",
    sessionValue: "تسجيل آمن", portalType: "نوع البوابة", portalValue: "إدارية",
    adminOnly: "هذا النظام مخصص لمدير المنصة المعتمد فقط.", footerBrand: "PRIME PHYSIO · SECURE ADMINISTRATION",
    floating: "بوابة آمنة لإدارة منصة برايم فيزيو", copyright: "منظومة برايم فيزيو © 2026. جميع الحقوق محفوظة.",
    footerSecure: "اتصال آمن عبر HTTPS · مركز العمليات الإداري", emailPlaceholder: "admin@primephysio.org",
    otpPlaceholder: "00000000", newPasswordPlaceholder: "8 أحرف على الأقل", confirmPlaceholder: "أعد كتابة كلمة المرور"
  },
  en: {
    brand: "Prime Physio", portal: "Central Administration Access Portal", active: "Administration portal", secure: "Secure connection", headerSecure: "HTTPS · SECURE ACCESS",
    control: "CONTROL CENTER · 01", product: "Prime Physio", enterprise: "Enterprise", productSub: "Platform Control Center",
    eyebrow: "PRIVATE ADMINISTRATION AREA", welcome: "Welcome back", welcomeSub: "Sign in to manage the platform and subscriptions.",
    forgotTitle: "Reset your password", forgotSub: "Enter the administrator email and we will send a secure recovery code.",
    verifyTitle: "Check your email", verifySub: "Enter the verification code sent to your email, then set a new password.",
    email: "Email address", adminId: "Platform administrator ID", password: "Password", forgot: "Forgot password?",
    passwordPlaceholder: "Enter your password", security: "Sign-in is restricted to the authorized platform administrator", restricted: "RESTRICTED",
    login: "Sign in", loggingIn: "Checking your credentials…", recoveryEmail: "Administrator email",
    sendCode: "Send verification code", sending: "Sending code…", back: "Back to sign in",
    sentTo: "Code sent to", otp: "Verification code (8 digits)", newPassword: "New password",
    confirmPassword: "Confirm new password", confirm: "Confirm and update password", updating: "Updating password…",
    resend: "Send a new code", access: "Access scope", accessValue: "Platform admin", session: "Session security",
    sessionValue: "Secure sign-in", portalType: "Portal type", portalValue: "Administration",
    adminOnly: "This portal is intended for the authorized platform administrator only.", footerBrand: "PRIME PHYSIO · SECURE ADMINISTRATION",
    floating: "Secure access to the Prime Physio platform", copyright: "Prime Physio © 2026. All rights reserved.",
    footerSecure: "Secure HTTPS connection · Administration operations", emailPlaceholder: "admin@primephysio.org",
    otpPlaceholder: "00000000", newPasswordPlaceholder: "At least 8 characters", confirmPlaceholder: "Re-enter your password"
  }
} as const;

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("ahmedsalamaahmed21@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "forgot" | "verify">("login");
  const [loginLanguage, setLoginLanguage] = useState<"ar" | "en">("ar");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const recoveringPassword = useRef(false);
  const [data, setData] = useState<Dashboard | null>(null);
  const [tab, setTab] = useState("overview");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const token = session?.access_token || "";
  const t = loginCopy[loginLanguage];

  async function load(currentToken = token) {
    if (!currentToken) return;
    const { data: json, error: invokeError } = await supabase.functions.invoke("platform-admin", {
      body: { action: "overview" },
      headers: { Authorization: "Bearer " + currentToken }
    });
    if (invokeError || json?.error) throw new Error(json?.error || invokeError?.message || "Unable to load dashboard");
    setData(json as Dashboard);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (token && !recoveringPassword.current) load(token).catch(e => setError(e.message));
    else if (!token) setData(null);
  }, [token]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy("login"); setError(""); setNotice("");
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) setError(error.message);
    else { setSession(data.session); setPassword(""); }
    setBusy("");
  }

  async function sendRecovery(e: React.FormEvent) {
    e.preventDefault();
    setBusy("recovery"); setError(""); setNotice(""); setOtpVerified(false); recoveringPassword.current = false;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) setError(error.message);
    else {
      setAuthMode("verify");
      setNotice(loginLanguage === "ar" ? "تم إرسال رمز استعادة كلمة المرور إلى بريدك الإلكتروني. افحص الوارد والرسائل غير المرغوب فيها." : "A password recovery code has been sent. Check your inbox and spam folder.");
    }
    setBusy("");
  }

  async function verifyAndUpdatePassword(e: React.FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    if (!otpVerified && otp.trim().length !== 8) { setError(loginLanguage === "ar" ? "أدخل رمز التحقق المكوّن من 8 أرقام." : "Enter the 8-digit verification code."); return; }
    if (newPassword.length < 8) { setError(loginLanguage === "ar" ? "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف." : "The new password must contain at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError(loginLanguage === "ar" ? "تأكيد كلمة المرور غير مطابق." : "The password confirmation does not match."); return; }
    setBusy("update-password");
    if (!otpVerified) {
      recoveringPassword.current = true;
      const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: otp.trim(), type: "recovery" });
      if (verifyError || !verified.session) {
        recoveringPassword.current = false;
        setError(verifyError?.message || (loginLanguage === "ar" ? "تعذر التحقق من الرمز. تأكد من صحته أو اطلب رمزًا جديدًا." : "Could not verify the code. Check it or request a new one."));
        setBusy(""); return;
      }
      setOtpVerified(true);
    }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) { setError(updateError.message); setBusy(""); return; }
    await supabase.auth.signOut();
    setSession(null); recoveringPassword.current = false; setOtpVerified(false);
    setPassword(""); setOtp(""); setNewPassword(""); setConfirmPassword(""); setAuthMode("login");
    setNotice(loginLanguage === "ar" ? "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن بكلمة المرور الجديدة." : "Password updated successfully. You can now sign in with your new password.");
    setBusy("");
  }

  async function signOut() { await supabase.auth.signOut(); setSession(null); setData(null); }

  async function review(id: string, action: "approve" | "reject") {
    if (action === "reject" && (reasons[id] || "").trim().length < 4) { setError("اكتب سبب الرفض بوضوح قبل المتابعة."); return; }
    if (action === "approve" && !window.confirm("تأكيد الموافقة؟ سيتم تفعيل أو ترقية اشتراك العيادة فورًا.")) return;
    setBusy(id); setError(""); setNotice("");
    const { data: json, error: invokeError } = await supabase.functions.invoke("platform-admin", {
      body: { action, id, reason: reasons[id] || "" },
      headers: { Authorization: "Bearer " + token }
    });
    if (invokeError || json?.error) setError(json?.error || invokeError?.message || "تعذر تنفيذ العملية");
    else { setNotice(action === "approve" ? "تم اعتماد الإيصال وتحديث الاشتراك." : "تم رفض طلب الدفع."); await load(); }
    setBusy("");
  }

  async function openReceipt(id: string) {
    setBusy(id); setError("");
    const { data: json, error: invokeError } = await supabase.functions.invoke("platform-admin", {
      body: { action: "receipt", id },
      headers: { Authorization: "Bearer " + token }
    });
    if (invokeError || json?.error) setError(json?.error || invokeError?.message || "تعذر فتح الإيصال");
    else window.open(json.url, "_blank", "noopener,noreferrer");
    setBusy("");
  }

  const pending = useMemo(() => data?.requests.filter(p => p.status === "pending") || [], [data]);

  if (!session) return (
    <main className="login-page" dir={loginLanguage === "ar" ? "rtl" : "ltr"} lang={loginLanguage}>
      <div className="login-background" aria-hidden="true">
        <span className="login-glow glow-one" />
        <span className="login-glow glow-two" />
        <span className="login-dot-grid" />
      </div>

      <header className="login-site-header">
        <div className="login-site-brand">
          <img src="https://primephysio.vercel.app/logo.png" alt="Prime Physio" />
          <div><b>{t.brand}</b><small>{t.portal}</small></div>
        </div>
        <div className="login-header-status">
          <span className="login-status-pill"><i />{t.active}</span>
          <span className="login-ssl-pill"><span aria-hidden="true">◈</span>{t.headerSecure}</span>
          <div className="login-language-switch" aria-label="Language">
            <button type="button" className={loginLanguage === "ar" ? "active" : ""} onClick={() => setLoginLanguage("ar")}>العربية</button>
            <button type="button" className={loginLanguage === "en" ? "active" : ""} onClick={() => setLoginLanguage("en")}>English</button>
          </div>
        </div>
      </header>

      <div className="login-main">
        <div className="login-card-wrap">
          <span className="login-card-glow card-glow-a" />
          <span className="login-card-glow card-glow-b" />
          <section className="login-card">
            <div className="login-card-accent" />
            <div className="login-card-content">
              <div className="login-card-meta">
                <span className="secure-label"><i />{t.secure}</span>
                <span className="login-version">{t.control}</span>
              </div>

              <div className="login-brand">
                <div><b>{t.product} <span className="login-enterprise">{t.enterprise}</span></b><small>{t.productSub}</small></div>
                <img className="prime-logo-login" src="https://primephysio.vercel.app/logo.png" alt="Prime Physio Logo" />
              </div>

              <div className="login-intro">
                <p className="eyebrow">{t.eyebrow}</p>
                <h1>{authMode === "login" ? t.welcome : authMode === "forgot" ? t.forgotTitle : t.verifyTitle}</h1>
                <p>{authMode === "login" ? t.welcomeSub : authMode === "forgot" ? t.forgotSub : t.verifySub}</p>
              </div>

              {authMode === "login" && (
                <form className="auth-form" onSubmit={signIn}>
                  <div className="login-field">
                    <div className="login-label-row"><label htmlFor="admin-email">{t.email}</label><small>{t.adminId}</small></div>
                    <div className="input-wrap">
                      <LoginIcon name="email" />
                      <input id="admin-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="username" placeholder={t.emailPlaceholder} dir="ltr" />
                    </div>
                  </div>
                  <div className="login-field">
                    <div className="password-row"><label htmlFor="admin-password">{t.password}</label><button type="button" className="text-action" onClick={() => { setAuthMode("forgot"); setError(""); setNotice(""); }}>{t.forgot}</button></div>
                    <div className="input-wrap">
                      <LoginIcon name="lock" />
                      <input id="admin-password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" placeholder={t.passwordPlaceholder} />
                      <button type="button" className="eye-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(v => !v)}><LoginIcon name={showPassword ? "eye-off" : "eye"} /></button>
                    </div>
                  </div>
                  <div className="login-security-note">
                    <span className="security-fingerprint" aria-hidden="true"><LoginIcon name="fingerprint" /></span>
                    <span>{t.security}</span>
                    <b>{t.restricted}</b>
                  </div>
                  <button className="primary full login-submit" disabled={busy === "login"}>
                    {busy === "login" ? t.loggingIn : t.login}<b aria-hidden="true">←</b>
                  </button>
                </form>
              )}

              {authMode === "forgot" && (
                <form className="auth-form" onSubmit={sendRecovery}>
                  <div className="login-field">
                    <label htmlFor="recovery-email">{t.recoveryEmail}</label>
                    <div className="input-wrap"><LoginIcon name="mail" /><input id="recovery-email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" placeholder="name@example.com" dir="ltr" /></div>
                  </div>
                  <button className="primary full login-submit" disabled={busy === "recovery"}>{busy === "recovery" ? t.sending : t.sendCode}<b aria-hidden="true">←</b></button>
                  <button type="button" className="back-action" onClick={() => { setAuthMode("login"); setError(""); setNotice(""); }}>{t.back}</button>
                </form>
              )}

              {authMode === "verify" && (
                <form className="auth-form" onSubmit={verifyAndUpdatePassword}>
                  <div className="recovery-destination"><LoginIcon name="mail" /><div><small>{t.sentTo}</small><b>{email}</b></div></div>
                  <div className="login-field"><label htmlFor="recovery-otp">{t.otp}</label><input className="otp-input" id="recovery-otp" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 8))} placeholder={t.otpPlaceholder} required /></div>
                  <div className="login-field"><label htmlFor="new-password">{t.newPassword}</label><div className="input-wrap"><input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" placeholder={t.newPasswordPlaceholder} required /><button type="button" className="eye-toggle" onClick={() => setShowPassword(v => !v)}><LoginIcon name={showPassword ? "eye-off" : "eye"} /></button></div></div>
                  <div className="login-field"><label htmlFor="confirm-password">{t.confirmPassword}</label><div className="input-wrap"><input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} minLength={8} autoComplete="new-password" placeholder={t.confirmPlaceholder} required /></div></div>
                  <button className="primary full login-submit" disabled={busy === "update-password"}>{busy === "update-password" ? t.updating : t.confirm}<b aria-hidden="true">←</b></button>
                  <button type="button" className="back-action" onClick={() => { setAuthMode("forgot"); setOtp(""); setOtpVerified(false); recoveringPassword.current = false; setError(""); setNotice(""); }}>{t.resend}</button>
                </form>
              )}

              {error && <div className="auth-message error" role="alert">{error}</div>}
              {notice && <div className="auth-message success" role="status">{notice}</div>}

              <div className="login-divider" />
              <div className="login-telemetry">
                <div><span>{t.access}</span><b>{t.accessValue}</b></div>
                <div><span>{t.session}</span><b>{t.sessionValue}</b></div>
                <div><span>{t.portalType}</span><b>{t.portalValue}</b></div>
              </div>
              <footer className="login-footer"><span>◈ {t.adminOnly}</span><small>{t.footerBrand}</small></footer>
            </div>
          </section>
          <div className="login-floating-note"><span aria-hidden="true">◈</span>{t.floating}</div>
        </div>
      </div>

      <footer className="login-page-footer">
        <span>✓ {t.copyright}</span>
        <span>{t.footerSecure}</span>
      </footer>
    </main>
  );

  if (!data) return <main className="loading">جارٍ تحميل لوحة إدارة المنصة… {error && <p className="error">{error}</p>}</main>;

  const m = data.metrics;
  return (
    <main className="shell" dir="rtl">
      <aside className="sidebar">
        <div className="brand"><img className="prime-logo-sidebar" src="https://primephysio.vercel.app/logo.png" alt="Prime Physio" /><div><b>Prime Physio</b><small>إدارة المنصة</small></div></div>
        <div className="sidebar-caption">القائمة الرئيسية</div>
        <nav>
          {[["overview", "نظرة عامة", "▦"], ["payments", "طلبات الدفع", "↔"], ["clinics", "العيادات", "⌂"], ["plans", "الباقات", "◇"]].map(([key, label, icon]) =>
            <button key={key} className={tab === key ? "nav active" : "nav"} onClick={() => setTab(key)}>
              <span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span>{key === "payments" && m.pendingPayments > 0 ? <i>{m.pendingPayments}</i> : null}
            </button>
          )}
        </nav>
        <div className="admin-user"><div className="admin-avatar">م</div><div className="admin-user-info"><b>مدير المنصة</b><small>{session.user.email}</small></div><button className="logout" onClick={signOut} title="تسجيل الخروج" aria-label="تسجيل الخروج">↪</button></div>
      </aside>
      <section className="content">
        <header className="admin-topbar">
          <div className="admin-topbar-title"><p className="eyebrow">PLATFORM ADMINISTRATION</p><h1>{({ overview: "نظرة عامة", payments: "مراجعة طلبات الدفع", clinics: "إدارة العيادات", plans: "الباقات والأسعار" } as any)[tab]}</h1><p className="muted">إدارة المنصة والعيادات والاشتراكات من مكان واحد</p></div>
          <div className="admin-topbar-actions"><span className="admin-secure"><i /> النظام متصل</span><button className="refresh" onClick={() => load().catch(e => setError(e.message))}>↻ <span>تحديث البيانات</span></button></div>
        </header>
        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {tab === "overview" && <>
          <div className="metrics">
            <Metric label="إجمالي العيادات" value={m.clinics} note={m.activeClinics + " نشطة"} />
            <Metric label="الاشتراكات النشطة" value={m.activeSubscriptions} />
            <Metric label="إجمالي المرضى" value={m.patients} />
            <Metric label="طلبات الدفع المعلقة" value={m.pendingPayments} />
            <Metric label="المدفوعات المعتمدة" value={m.approvedPayments} />
            <Metric label="قيمة المدفوعات المعتمدة" value={money(m.approvedValue)} />
          </div>
          <div className="panel"><div className="panel-head"><h2>أحدث طلبات الدفع</h2><button className="link" onClick={() => setTab("payments")}>عرض الكل</button></div><PaymentRows items={data.requests.slice(0, 5)} onReceipt={openReceipt} busy={busy} /></div>
        </>}
        {tab === "payments" && <div className="panel">
          <div className="panel-head"><h2>طلبات الدفع والتحقق من التحويل</h2><span className="pill">{pending.length} قيد المراجعة</span></div>
          <PaymentRows items={data.requests} onReceipt={openReceipt} busy={busy} />
          {data.requests.filter(p => p.status === "pending").map(p =>
            <div className="review-box" key={p.id}>
              <div><b>{p.clinic?.name || "عيادة غير معروفة"}</b><span>{p.plan_code?.toUpperCase()} · {p.billing_period === "yearly" ? "سنوي" : "شهري"} · {money(p.amount)}</span><small>مرجع التحويل: {p.transfer_reference} · {p.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}</small></div>
              <div className="review-actions"><button className="outline" onClick={() => openReceipt(p.id)} disabled={busy === p.id}>عرض الإيصال</button><button className="primary" onClick={() => review(p.id, "approve")} disabled={!!busy}>اعتماد وترقية</button><input placeholder="سبب الرفض (إلزامي)" value={reasons[p.id] || ""} onChange={e => setReasons(v => ({ ...v, [p.id]: e.target.value }))} /><button className="danger" onClick={() => review(p.id, "reject")} disabled={!!busy}>رفض الطلب</button></div>
            </div>
          )}
        </div>}
        {tab === "clinics" && <div className="panel"><h2>العيادات المسجلة</h2><div className="table-wrap"><table><thead><tr><th>اسم العيادة</th><th>البريد</th><th>المدينة</th><th>الحالة</th><th>تاريخ التسجيل</th></tr></thead><tbody>{data.clinics.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.admin_email}</td><td>{c.city || "—"}</td><td><span className="pill">{c.is_active ? "نشطة" : "غير نشطة"}</span></td><td>{new Date(c.created_at).toLocaleDateString("ar-EG")}</td></tr>)}</tbody></table></div></div>}
        {tab === "plans" && <div className="plan-grid">{data.plans.map(p => <article className="plan-card" key={p.name}><span className="eyebrow">SUBSCRIPTION PLAN</span><h2>{p.name.toUpperCase()}</h2><b>{money(p.price_monthly)} <small>/ شهري</small></b><p>{money(p.price_yearly)} / سنوي</p><span className="pill">{p.is_active ? "متاحة" : "متوقفة"}</span></article>)}</div>}
      </section>
    </main>
  );
}

function LoginIcon({ name }: { name: "email" | "lock" | "eye" | "eye-off" | "fingerprint" | "mail" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<typeof name, React.ReactNode> = {
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><path d="M12 14v3" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    "eye-off": <><path d="m3 3 18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a16 16 0 0 1-3.1 3.9M6.2 6.2C3.5 8.1 2 12 2 12s3.6 7 10 7a10 10 0 0 0 3-.5" /></>,
    fingerprint: <><path d="M12 11a2 2 0 0 0-2 2c0 1.8-.2 3.7-.8 5.5" /><path d="M14 13c0 2.4-.2 4.7-.7 6.5" /><path d="M8.5 15.2c-.1 1.3-.4 2.6-.9 3.8" /><path d="M16 15.5c0 1.2-.1 2.4-.4 3.5" /><path d="M8 13a4 4 0 0 1 8 0c0 1.8-.1 3.7-.5 5.5" /><path d="M6 13a6 6 0 0 1 12 0c0 1.8-.1 3.5-.4 5.2" /><path d="M4 13a8 8 0 0 1 16 0" /><path d="M2 13a10 10 0 0 1 20 0" /><path d="M12 3a10 10 0 0 0-10 10" /><path d="M12 3a10 10 0 0 1 10 10" /></>
  };
  return <svg className="login-icon" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function Metric({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</article>;
}

function PaymentRows({ items, onReceipt, busy }: { items: any[]; onReceipt: (id: string) => void; busy: string }) {
  return <div className="table-wrap"><table><thead><tr><th>العيادة</th><th>الباقة</th><th>المبلغ</th><th>وسيلة الدفع</th><th>الحالة</th><th>الإيصال</th></tr></thead><tbody>
    {items.map(p => <tr key={p.id}><td>{p.clinic?.name || p.user_email}</td><td>{p.plan_code} · {p.billing_period === "yearly" ? "سنوي" : "شهري"}</td><td>{money(p.amount)}</td><td>{p.payment_method === "instapay" ? "InstaPay" : "Vodafone Cash"}</td><td><span className={"status " + p.status}>{p.status === "pending" ? "معلق" : p.status === "approved" ? "معتمد" : "مرفوض"}</span></td><td><button className="link" onClick={() => onReceipt(p.id)} disabled={busy === p.id}>فتح الإيصال</button></td></tr>)}
  </tbody></table>{!items.length && <p className="empty">لا توجد طلبات دفع حتى الآن.</p>}</div>;
}
