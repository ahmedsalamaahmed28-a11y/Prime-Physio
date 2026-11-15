"use client";

import DashboardLayout from "@/components/DashboardLayout";
import { useLanguage } from "@/lib/LanguageContext";
import Link from "next/link";
import { useState } from "react";
import {
  MessageSquare, Search, Users, UserRound, Headphones, Send,
  Plus, Inbox, ShieldCheck, ArrowUpLeft, ArrowUpRight, Info,
} from "lucide-react";

type InboxTab = "all" | "patients" | "team";

export default function ChatPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [tab, setTab] = useState<InboxTab>("all");
  const [search, setSearch] = useState("");

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-[1500px] space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#554BC0] to-[#7770D2] text-white shadow-lg shadow-indigo-200"><MessageSquare className="h-7 w-7" /></div>
            <div>
              <p className="text-xs font-bold tracking-wide text-[#655BC7]">{isRtl ? "التواصل وإدارة المحادثات" : "COMMUNICATION & MESSAGES"}</p>
              <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{isRtl ? "مركز الرسائل" : "Messages center"}</h1>
              <p className="mt-1 text-sm text-slate-500">{isRtl ? "مساحة موحدة لمحادثات المرضى وفريق العمل." : "One workspace for patient and team conversations."}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/patients" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-[#554BC0]"><Users size={16} />{isRtl ? "سجلات المرضى" : "Patient records"}</Link>
            <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-50 px-3 text-xs font-bold text-amber-700"><Info size={15} />{isRtl ? "الربط قيد التجهيز" : "Integration pending"}</span>
          </div>
        </section>

        <section className="grid min-h-[620px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(300px,370px)_minmax(0,1fr)]">
          <aside className="flex min-h-[300px] flex-col border-b border-slate-200 lg:border-b-0 lg:border-e">
            <div className="border-b border-slate-100 p-5">
              <div className="mb-4 flex items-center justify-between">
                <div><h2 className="font-extrabold text-slate-900">{isRtl ? "المحادثات" : "Conversations"}</h2><p className="mt-1 text-xs text-slate-400">{isRtl ? "صندوق الوارد" : "Your inbox"}</p></div>
                <button type="button" disabled title={isRtl ? "ستتاح عند تفعيل المحادثات" : "Available when messaging is connected"} className="flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Plus size={18} /></button>
              </div>
              <div className="relative">
                <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isRtl ? "ابحث عن محادثة..." : "Search conversations..."} className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition focus:border-[#7770D2] focus:bg-white focus:ring-4 focus:ring-indigo-50 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"}`} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {([
                  ["all", isRtl ? "الكل" : "All", Inbox],
                  ["patients", isRtl ? "المرضى" : "Patients", UserRound],
                  ["team", isRtl ? "الفريق" : "Team", Users],
                ] as const).map(([key, label, Icon]) => <button key={key} onClick={() => setTab(key)} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${tab === key ? "bg-white text-[#554BC0] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><Icon size={14} />{label}</button>)}
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Inbox className="h-8 w-8" /></div>
              <h3 className="font-extrabold text-slate-800">{search ? (isRtl ? "لا توجد محادثات مطابقة" : "No matching conversations") : (isRtl ? "صندوق الوارد فارغ" : "Your inbox is empty")}</h3>
              <p className="mt-2 max-w-[250px] text-xs leading-6 text-slate-400">{isRtl ? "ستظهر المحادثات هنا بعد ربط خدمة الرسائل وتفعيلها للمركز." : "Conversations will appear here once messaging is connected and enabled for your clinic."}</p>
              {search && <button onClick={() => setSearch("")} className="mt-3 text-xs font-bold text-[#554BC0] hover:underline">{isRtl ? "مسح البحث" : "Clear search"}</button>}
            </div>
            <div className="border-t border-slate-100 p-4">
              <div className="flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-indigo-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-[11px] leading-5">{isRtl ? "ستكون المحادثات مرتبطة بصلاحيات المستخدم وبيانات المركز للحفاظ على الخصوصية." : "Messaging will respect user permissions and clinic data isolation."}</p></div>
            </div>
          </aside>

          <div className="relative flex min-h-[520px] flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-white to-white px-5 py-12 sm:px-10">
            <div className="pointer-events-none absolute inset-0 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(#554BC0 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
            <div className="relative flex max-w-lg flex-col items-center text-center">
              <div className="relative mb-7">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#554BC0] to-[#8178E2] text-white shadow-xl shadow-indigo-200"><MessageSquare className="h-11 w-11" /></div>
                <span className="absolute -bottom-2 -end-2 flex h-10 w-10 items-center justify-center rounded-xl border-4 border-white bg-emerald-500 text-white"><Headphones size={18} /></span>
              </div>
              <span className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-[11px] font-extrabold text-[#6258C6]">{isRtl ? "مساحة التواصل" : "COMMUNICATION WORKSPACE"}</span>
              <h2 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">{isRtl ? "كل محادثاتك في مكان واحد" : "All your conversations in one place"}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-500">{isRtl ? "الواجهة جاهزة، لكن خدمة المحادثات وإرسال الرسائل لم يتم ربطها بقاعدة البيانات بعد. لن نعرض محادثات تجريبية أو نُظهر أن الرسائل تُرسل قبل تفعيل الخدمة فعليًا." : "The workspace UI is ready, but message delivery and conversation storage are not connected to the database yet. No demo conversations are shown, and messages will not be presented as sent before the service is active."}</p>
              <div className="mt-7 grid w-full gap-3 text-start sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><UserRound size={18} /></div><h3 className="text-sm font-extrabold text-slate-800">{isRtl ? "محادثات المرضى" : "Patient conversations"}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{isRtl ? "متابعة الاستفسارات والتواصل المرتبط بملف المريض." : "Follow up on questions and patient-related communication."}</p></div>
                <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm"><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Users size={18} /></div><h3 className="text-sm font-extrabold text-slate-800">{isRtl ? "محادثات فريق العمل" : "Team conversations"}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{isRtl ? "تنسيق العمل والتواصل الداخلي بين أعضاء المركز." : "Coordinate work and communicate across your clinic team."}</p></div>
              </div>
              <Link href="/patients" className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#554BC0] px-5 text-sm font-extrabold text-white shadow-md shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-[#453BAA]">{isRtl ? "الانتقال إلى سجلات المرضى" : "Go to patient records"}{isRtl ? <ArrowUpLeft size={16} /> : <ArrowUpRight size={16} />}</Link>
            </div>
            <div className="absolute bottom-4 flex items-center gap-2 text-[10px] font-medium text-slate-300"><Send size={12} />{isRtl ? "لن يتم إرسال أي رسالة دون تفعيل الخدمة" : "No messages are sent until messaging is enabled"}</div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
