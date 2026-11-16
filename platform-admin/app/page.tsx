"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient, Session } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
type Dashboard = {
  adminEmail: string;
  metrics: { clinics:number; activeClinics:number; patients:number; activeSubscriptions:number; pendingPayments:number; approvedPayments:number; approvedValue:number };
  requests: any[]; clinics: any[]; plans: any[]; audit: any[];
};
const money = (n:number) => new Intl.NumberFormat("en-EG",{style:"currency",currency:"EGP",maximumFractionDigits:0}).format(n||0);
export default function Home() {
  const [session,setSession] = useState<Session|null>(null);
  const [email,setEmail] = useState("ahmedsalamaahmed21@gmail.com");
  const [password,setPassword] = useState("");
  const [data,setData] = useState<Dashboard|null>(null);
  const [tab,setTab] = useState("overview");
  const [busy,setBusy] = useState("");
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [reasons,setReasons] = useState<Record<string,string>>({});
  const token = session?.access_token || "";
  async function load(currentToken=token) {
    if (!currentToken) return;
    const res=await fetch("/api/admin/overview",{headers:{Authorization:"Bearer "+currentToken},cache:"no-store"});
    const json=await res.json();
    if(!res.ok) throw new Error(json.error||"Unable to load dashboard");
    setData(json);
  }
  useEffect(()=>{
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:listener}=supabase.auth.onAuthStateChange((_event,next)=>setSession(next));
    return ()=>listener.subscription.unsubscribe();
  },[]);
  useEffect(()=>{ if(token) load(token).catch(e=>setError(e.message)); else setData(null); },[token]);
  async function signIn(e:React.FormEvent) {
    e.preventDefault(); setBusy("login"); setError("");
    const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error) setError(error.message); else {setSession(data.session);setPassword("");}
    setBusy("");
  }
  async function signOut(){await supabase.auth.signOut();setSession(null);setData(null);}
  async function review(id:string,action:"approve"|"reject") {
    if(action==="reject" && (reasons[id]||"").trim().length<4){setError("اكتب سبب الرفض بوضوح قبل المتابعة.");return;}
    if(action==="approve" && !window.confirm("تأكيد الموافقة؟ سيتم تفعيل أو ترقية اشتراك العيادة فورًا.")) return;
    setBusy(id);setError("");setNotice("");
    const res=await fetch("/api/admin/payments/"+id+"/review",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({action,reason:reasons[id]||""})});
    const json=await res.json();
    if(!res.ok)setError(json.error||"تعذر تنفيذ العملية");
    else {setNotice(action==="approve"?"تم اعتماد الإيصال وتحديث الاشتراك.":"تم رفض طلب الدفع.");await load();}
    setBusy("");
  }
  async function openReceipt(id:string){
    setBusy(id);setError("");
    const res=await fetch("/api/admin/payments/"+id+"/receipt",{headers:{Authorization:"Bearer "+token}});
    const json=await res.json();
    if(!res.ok)setError(json.error||"تعذر فتح الإيصال");else window.open(json.url,"_blank","noopener,noreferrer");
    setBusy("");
  }
  const pending=useMemo(()=>data?.requests.filter(p=>p.status==="pending")||[],[data]);
  if(!session) return <main className="login-shell"><section className="login-card"><div className="brand-mark">P</div><p className="eyebrow">PRIVATE CONTROL CENTER</p><h1>Prime Physio</h1><p className="muted">إدارة المنصة والاشتراكات والمدفوعات</p><form onSubmit={signIn}><label>البريد الإلكتروني</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="username"/><label>كلمة المرور</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/><button className="primary full" disabled={busy==="login"}>{busy==="login"?"جارٍ تسجيل الدخول…":"تسجيل الدخول الآمن"}</button></form>{error&&<p className="error">{error}</p>}<p className="tiny">هذا النظام مخصص لمدير المنصة فقط. حسابات العيادات لا تملك صلاحية الدخول.</p></section></main>;
  if(!data) return <main className="loading">جارٍ تحميل لوحة إدارة المنصة… {error&&<p className="error">{error}</p>}</main>;
  const m=data.metrics;
  return <main className="shell" dir="rtl">
    <aside className="sidebar"><div className="brand"><span className="brand-mark small">P</span><div><b>Prime Physio</b><small>مركز التحكم</small></div></div><nav>{[["overview","نظرة عامة"],["payments","طلبات الدفع"],["clinics","العيادات"],["plans","الباقات"],["audit","سجل المراجعة"]].map(([key,label])=><button key={key} className={tab===key?"nav active":"nav"} onClick={()=>setTab(key)}>{label}{key==="payments"&&m.pendingPayments>0?<i>{m.pendingPayments}</i>:null}</button>)}</nav><div className="side-bottom"><small>{session.user.email}</small><button className="logout" onClick={signOut}>تسجيل الخروج</button></div></aside>
    <section className="content"><header><div><p className="eyebrow">PLATFORM ADMINISTRATION</p><h1>{({overview:"نظرة عامة",payments:"مراجعة طلبات الدفع",clinics:"إدارة العيادات",plans:"الباقات والأسعار",audit:"سجل المراجعة"} as any)[tab]}</h1><p className="muted">لوحة مستقلة عن حسابات مراكز العلاج الطبيعي</p></div><button className="refresh" onClick={()=>load().catch(e=>setError(e.message))}>تحديث البيانات ↻</button></header>
      {error&&<div className="alert error">{error}</div>}{notice&&<div className="alert success">{notice}</div>}
      {tab==="overview"&&<><div className="metrics">
        <Metric label="إجمالي العيادات" value={m.clinics} note={m.activeClinics+" نشطة"}/>
        <Metric label="الاشتراكات النشطة" value={m.activeSubscriptions}/>
        <Metric label="إجمالي المرضى" value={m.patients}/>
        <Metric label="طلبات الدفع المعلقة" value={m.pendingPayments}/>
        <Metric label="المدفوعات المعتمدة" value={m.approvedPayments}/>
        <Metric label="قيمة المدفوعات المعتمدة" value={money(m.approvedValue)}/>
      </div><div className="panel"><div className="panel-head"><h2>أحدث طلبات الدفع</h2><button className="link" onClick={()=>setTab("payments")}>عرض الكل</button></div><PaymentRows items={data.requests.slice(0,5)} onReceipt={openReceipt} busy={busy}/></div></>}
      {tab==="payments"&&<div className="panel"><div className="panel-head"><h2>طلبات الدفع والتحقق من التحويل</h2><span className="pill">{pending.length} قيد المراجعة</span></div><PaymentRows items={data.requests} onReceipt={openReceipt} busy={busy}/>{data.requests.filter(p=>p.status==="pending").map(p=><div className="review-box" key={p.id}><div><b>{p.clinic?.name||"عيادة غير معروفة"}</b><span>{p.plan_code?.toUpperCase()} · {p.billing_period==="yearly"?"سنوي":"شهري"} · {money(p.amount)}</span><small>مرجع التحويل: {p.transfer_reference} · {p.payment_method==="instapay"?"InstaPay":"Vodafone Cash"}</small></div><div className="review-actions"><button className="outline" onClick={()=>openReceipt(p.id)} disabled={busy===p.id}>عرض الإيصال</button><button className="primary" onClick={()=>review(p.id,"approve")} disabled={!!busy}>اعتماد وترقية</button><input placeholder="سبب الرفض (إلزامي)" value={reasons[p.id]||""} onChange={e=>setReasons(v=>({...v,[p.id]:e.target.value}))}/><button className="danger" onClick={()=>review(p.id,"reject")} disabled={!!busy}>رفض الطلب</button></div></div>)}</div>}
      {tab==="clinics"&&<div className="panel"><h2>العيادات المسجلة</h2><div className="table-wrap"><table><thead><tr><th>اسم العيادة</th><th>البريد</th><th>المدينة</th><th>الحالة</th><th>تاريخ التسجيل</th></tr></thead><tbody>{data.clinics.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.admin_email}</td><td>{c.city||"—"}</td><td><span className="pill">{c.is_active?"نشطة":"غير نشطة"}</span></td><td>{new Date(c.created_at).toLocaleDateString("ar-EG")}</td></tr>)}</tbody></table></div></div>}
      {tab==="plans"&&<div className="plan-grid">{data.plans.map(p=><article className="plan-card" key={p.name}><span className="eyebrow">SUBSCRIPTION PLAN</span><h2>{p.name.toUpperCase()}</h2><b>{money(p.price_monthly)} <small>/ شهري</small></b><p>{money(p.price_yearly)} / سنوي</p><span className="pill">{p.is_active?"متاحة":"متوقفة"}</span></article>)}</div>}
      {tab==="audit"&&<div className="panel"><h2>سجل عمليات مدير المنصة</h2><div className="table-wrap"><table><thead><tr><th>العملية</th><th>الباقة</th><th>القيمة</th><th>المدير</th><th>التاريخ</th></tr></thead><tbody>{data.audit.map(a=><tr key={a.id}><td>{a.action==="payment_approved"?"اعتماد دفعة":"رفض دفعة"}</td><td>{a.plan_code||"—"}</td><td>{money(a.amount||0)}</td><td>{a.admin_email}</td><td>{new Date(a.created_at).toLocaleString("ar-EG")}</td></tr>)}</tbody></table></div></div>}
    </section>
  </main>;
}
function Metric({label,value,note}:{label:string;value:number|string;note?:string}){return <article className="metric"><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>}
function PaymentRows({items,onReceipt,busy}:{items:any[];onReceipt:(id:string)=>void;busy:string}){return <div className="table-wrap"><table><thead><tr><th>العيادة</th><th>الباقة</th><th>المبلغ</th><th>وسيلة الدفع</th><th>الحالة</th><th>الإيصال</th></tr></thead><tbody>{items.map(p=><tr key={p.id}><td>{p.clinic?.name||p.user_email}</td><td>{p.plan_code} · {p.billing_period==="yearly"?"سنوي":"شهري"}</td><td>{money(p.amount)}</td><td>{p.payment_method==="instapay"?"InstaPay":"Vodafone Cash"}</td><td><span className={"status "+p.status}>{p.status==="pending"?"معلق":p.status==="approved"?"معتمد":"مرفوض"}</span></td><td><button className="link" onClick={()=>onReceipt(p.id)} disabled={busy===p.id}>فتح الإيصال</button></td></tr>)}</tbody></table>{!items.length&&<p className="empty">لا توجد طلبات دفع حتى الآن.</p>}</div>}