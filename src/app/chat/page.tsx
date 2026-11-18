"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MessageSquare, Search, Users, User, Plus, ShieldCheck,
  Loader2, RefreshCw, X, Check, Stethoscope,
} from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";
import { supabase } from "@/lib/supabase";

type Participant = { email: string; display_name: string; role: string; last_read_at?: string };
type Message = { id: string; conversation_id: string; sender_email: string; sender_name: string; body: string; created_at: string };
type Conversation = {
  id: string; kind: "team" | "patient"; title: string; patient_id: string | null;
  created_at: string; last_message_at: string; participants: Participant[];
  lastMessage: Message | null; unreadCount: number;
};
type DirectoryMember = { email: string; name: string; role: string };
type Patient = { id: string; nameAr: string; phone?: string };

type InboxResponse = {
  conversations: Conversation[]; directory: DirectoryMember[]; patients: Patient[]; currentEmail: string;
};

type ThreadResponse = { messages: Message[]; participants: Participant[]; currentEmail: string };

const dateLabel = (value: string, language: string) => {
  try {
    return new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" }).format(new Date(value));
  } catch { return ""; }
};

export default function ChatPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [inbox, setInbox] = useState<InboxResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "patients" | "team">("all");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [composer, setComposer] = useState("");
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newKind, setNewKind] = useState<"team" | "patient">("team");
  const [newTitle, setNewTitle] = useState("");
  const [newPatientId, setNewPatientId] = useState("");
  const [newMembers, setNewMembers] = useState<string[]>([]);
  const [firstMessage, setFirstMessage] = useState("");
  const [creating, setCreating] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  const refreshInbox = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/messages", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر تحميل الرسائل" : "Unable to load messages"));
      setInbox(data);
      setError("");
      setSelectedId((current) => current && data.conversations.some((item: Conversation) => item.id === current)
        ? current : (data.conversations[0]?.id || null));
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "حدث خطأ غير متوقع" : "Something went wrong"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [isRtl]);

  const refreshThread = useCallback(async (conversationId: string, silent = false) => {
    if (!silent) setThreadLoading(true);
    try {
      const response = await fetch(`/api/messages/${conversationId}`, { cache: "no-store" });
      const data: ThreadResponse & { error?: string } = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر تحميل المحادثة" : "Unable to load conversation"));
      setMessages(data.messages || []);
      setParticipants(data.participants || []);
      setInbox((current) => current ? ({
        ...current,
        conversations: current.conversations.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item),
      }) : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "تعذر تحميل المحادثة" : "Unable to load conversation"));
    } finally {
      if (!silent) setThreadLoading(false);
    }
  }, [isRtl]);

  useEffect(() => { void refreshInbox(); }, [refreshInbox]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      setParticipants([]);
      return;
    }
    void refreshThread(selectedId);
    const channel = supabase
      .channel(`clinic-chat-${selectedId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${selectedId}`,
      }, () => {
        void refreshThread(selectedId, true);
        void refreshInbox(true);
      })
      .subscribe();
    const poll = window.setInterval(() => {
      void refreshThread(selectedId, true);
      void refreshInbox(true);
    }, 20000);
    return () => {
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [selectedId, refreshThread, refreshInbox]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, selectedId]);

  const conversations = inbox?.conversations || [];
  const filteredConversations = useMemo(() => conversations.filter((item) => {
    const matchesTab = tab === "all" || item.kind === (tab === "patients" ? "patient" : "team");
    const searchText = search.trim().toLowerCase();
    const matchesSearch = !searchText
      || item.title.toLowerCase().includes(searchText)
      || (item.lastMessage?.body || "").toLowerCase().includes(searchText)
      || item.participants.some((member) => member.display_name.toLowerCase().includes(searchText));
    return matchesTab && matchesSearch;
  }), [conversations, tab, search]);

  const selectedConversation = conversations.find((item) => item.id === selectedId) || null;
  const unreadTotal = conversations.reduce((sum, item) => sum + item.unreadCount, 0);

  const sendMessage = async () => {
    if (!selectedId || !composer.trim() || sending) return;
    const body = composer.trim();
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/messages/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر إرسال الرسالة" : "Message could not be sent"));
      setComposer("");
      await refreshThread(selectedId, true);
      await refreshInbox(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "تعذر إرسال الرسالة" : "Message could not be sent"));
    } finally {
      setSending(false);
    }
  };

  const createConversation = async () => {
    if (creating) return;
    if (newKind === "patient" && !newPatientId) {
      setError(isRtl ? "اختر المريض أولاً" : "Choose a patient first");
      return;
    }
    if (!newMembers.length) {
      setError(isRtl ? "اختر عضوًا واحدًا على الأقل" : "Select at least one team member");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: newKind,
          title: newTitle,
          patientId: newKind === "patient" ? newPatientId : undefined,
          participantEmails: newMembers,
          firstMessage,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || (isRtl ? "تعذر إنشاء المحادثة" : "Could not create conversation"));
      setShowNew(false);
      setNewTitle("");
      setNewPatientId("");
      setNewMembers([]);
      setFirstMessage("");
      await refreshInbox(true);
      if (data.conversation?.id) setSelectedId(data.conversation.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : (isRtl ? "تعذر إنشاء المحادثة" : "Could not create conversation"));
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (email: string) => {
    setNewMembers((current) => current.includes(email) ? current.filter((item) => item !== email) : [...current, email]);
  };

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5" dir={isRtl ? "rtl" : "ltr"}>
      <section className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#554BC0] to-[#7770D2] text-white shadow-lg shadow-indigo-200"><MessageSquare className="h-7 w-7" /></div>
          <div>
            <p className="text-xs font-bold tracking-wide text-[#655BC7]">{isRtl ? "التواصل وإدارة المحادثات" : "COMMUNICATION & MESSAGES"}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900 sm:text-3xl">{isRtl ? "مركز الرسائل" : "Messages center"}</h1>
            <p className="mt-1 text-sm text-slate-500">{isRtl ? "محادثات داخلية مباشرة بين أعضاء المركز، مع ربط المحادثات بملفات المرضى." : "Private team conversations, with optional links to patient records."}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/patients" className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-[#554BC0]"><Users size={16} />{isRtl ? "سجلات المرضى" : "Patient records"}</Link>
          <button onClick={() => { setError(""); setShowNew(true); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#554BC0] px-4 text-sm font-bold text-white shadow-sm transition hover:bg-[#453BAA]"><Plus size={17} />{isRtl ? "محادثة جديدة" : "New conversation"}</button>
        </div>
      </section>

      {error && <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><span>{error}</span><button className="ms-auto" onClick={() => setError("")} aria-label="Close"><X size={16} /></button></div>}

      <section className="grid min-h-[680px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[minmax(300px,370px)_minmax(0,1fr)]">
        <aside className="flex min-h-[300px] flex-col border-b border-slate-200 lg:border-b-0 lg:border-e">
          <div className="border-b border-slate-100 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div><h2 className="font-extrabold text-slate-900">{isRtl ? "المحادثات" : "Conversations"}</h2><p className="mt-1 text-xs text-slate-400">{isRtl ? "صندوق الوارد" : "Your inbox"}{unreadTotal > 0 ? ` • ${unreadTotal} ${isRtl ? "جديد" : "unread"}` : ""}</p></div>
              <button onClick={() => void refreshInbox()} title={isRtl ? "تحديث" : "Refresh"} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-[#554BC0]"><RefreshCw size={16} /></button>
            </div>
            <div className="relative">
              <Search className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={isRtl ? "ابحث عن محادثة..." : "Search conversations..."} className={`h-11 w-full rounded-xl border border-slate-200 bg-slate-50 text-sm outline-none transition focus:border-[#7770D2] focus:bg-white focus:ring-4 focus:ring-indigo-50 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"}`} />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
              {([["all", isRtl ? "الكل" : "All", MessageSquare], ["patients", isRtl ? "المرضى" : "Patients", User], ["team", isRtl ? "الفريق" : "Team", Users]] as const).map(([key, label, Icon]) => (
                <button key={key} onClick={() => setTab(key)} className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition ${tab === key ? "bg-white text-[#554BC0] shadow-sm" : "text-slate-500 hover:text-slate-700"}`}><Icon size={14} />{label}</button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? <div className="flex h-52 items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={22} /></div> :
              filteredConversations.length ? filteredConversations.map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-4 text-start transition hover:bg-indigo-50/50 ${selectedId === item.id ? "bg-indigo-50" : "bg-white"}`}>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.kind === "patient" ? "bg-blue-50 text-blue-600" : "bg-violet-50 text-violet-600"}`}>{item.kind === "patient" ? <User size={19} /> : <Users size={19} />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-extrabold text-slate-800">{item.title}</span><span className="shrink-0 text-[10px] text-slate-400">{dateLabel(item.last_message_at, language)}</span></span>
                    <span className="mt-1 block truncate text-xs text-slate-500">{item.lastMessage?.body || (isRtl ? "لا توجد رسائل بعد" : "No messages yet")}</span>
                    <span className="mt-2 flex items-center justify-between gap-2"><span className="truncate text-[10px] text-slate-400">{item.participants.map((member) => member.display_name).join("، ")}</span>{item.unreadCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#554BC0] px-1.5 text-[10px] font-bold text-white">{item.unreadCount}</span>}</span>
                  </span>
                </button>
              )) : <div className="flex h-64 flex-col items-center justify-center px-6 text-center"><MessageSquare size={30} className="mb-3 text-slate-300" /><h3 className="font-bold text-slate-700">{isRtl ? "لا توجد محادثات" : "No conversations yet"}</h3><p className="mt-2 text-xs leading-6 text-slate-400">{isRtl ? "ابدأ محادثة جديدة مع أحد أعضاء فريق المركز." : "Start a new conversation with someone on your clinic team."}</p><button onClick={() => setShowNew(true)} className="mt-3 text-xs font-bold text-[#554BC0]">{isRtl ? "إنشاء محادثة" : "Create conversation"}</button></div>}
          </div>
          <div className="border-t border-slate-100 p-4">
            <div className="flex items-start gap-2 rounded-xl bg-indigo-50 p-3 text-indigo-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p className="text-[11px] leading-5">{isRtl ? "المحادثات خاصة بأعضاء المركز المشاركين، ولا يمكن لمركز آخر الاطلاع عليها." : "Conversations are restricted to their clinic participants; other clinics cannot access them."}</p></div>
          </div>
        </aside>

        <main className="flex min-h-[600px] min-w-0 flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/40 via-white to-white">
          {selectedConversation ? <>
            <header className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white/90 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-[#554BC0]">{selectedConversation.kind === "patient" ? <User size={19} /> : <Users size={19} />}</span>
                <div className="min-w-0"><h2 className="truncate font-extrabold text-slate-900">{selectedConversation.title}</h2><p className="mt-1 truncate text-xs text-slate-400">{participants.map((member) => member.display_name).join("، ")}</p></div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold text-emerald-700">{isRtl ? "محادثة داخلية" : "Internal chat"}</span>
            </header>
            {selectedConversation.kind === "patient" && <div className="border-b border-blue-100 bg-blue-50/70 px-5 py-2 text-xs leading-5 text-blue-800">{isRtl ? "هذه محادثة داخلية بين فريق المركز ومرتبطة بملف المريض، وليست رسالة خارجية مرسلة للمريض." : "This is an internal team conversation linked to a patient record, not an external message sent to the patient."}</div>}
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-7">
              {threadLoading && !messages.length ? <div className="flex h-48 items-center justify-center text-slate-400"><Loader2 className="animate-spin" size={22} /></div> :
                messages.length ? messages.map((message) => {
                  const mine = message.sender_email === inbox?.currentEmail;
                  return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${mine ? "rounded-br-md bg-[#554BC0] text-white" : "rounded-bl-md border border-slate-100 bg-white text-slate-800"}`}>
                      {!mine && <p className="mb-1 text-[11px] font-extrabold text-[#6258C6]">{message.sender_name}</p>}
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
                      <p className={`mt-2 text-end text-[10px] ${mine ? "text-indigo-100" : "text-slate-400"}`}>{dateLabel(message.created_at, language)}</p>
                    </div>
                  </div>;
                }) : <div className="flex h-full min-h-56 flex-col items-center justify-center text-center"><MessageSquare size={34} className="mb-3 text-slate-300" /><p className="font-bold text-slate-600">{isRtl ? "ابدأ المحادثة" : "Start the conversation"}</p><p className="mt-1 text-xs text-slate-400">{isRtl ? "أرسل أول رسالة لأعضاء المحادثة." : "Send the first message to the participants."}</p></div>}
              <div ref={listEndRef} />
            </div>
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="border-t border-slate-100 bg-white p-4 sm:p-5">
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-[#7770D2] focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-50">
                <textarea value={composer} onChange={(event) => setComposer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} rows={1} maxLength={5000} placeholder={isRtl ? "اكتب رسالتك هنا..." : "Write your message..."} className="max-h-36 min-h-11 flex-1 resize-y bg-transparent px-3 py-3 text-sm outline-none" />
                <button type="submit" disabled={!composer.trim() || sending} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#554BC0] text-white transition hover:bg-[#453BAA] disabled:cursor-not-allowed disabled:opacity-40" aria-label={isRtl ? "إرسال" : "Send"}>{sending ? <Loader2 className="animate-spin" size={18} /> : <MessageSquare size={18} />}</button>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{isRtl ? "Enter للإرسال • Shift + Enter لسطر جديد" : "Enter to send • Shift + Enter for a new line"}</p>
            </form>
          </> : <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-[#554BC0] to-[#8178E2] text-white shadow-xl shadow-indigo-200"><MessageSquare className="h-11 w-11" /></div>
            <h2 className="text-2xl font-extrabold text-slate-900">{isRtl ? "تواصل فريق المركز بسهولة" : "Keep your clinic team connected"}</h2>
            <p className="mt-3 max-w-md text-sm leading-7 text-slate-500">{isRtl ? "أنشئ محادثات فردية أو جماعية، واربط محادثة داخلية بملف مريض عند الحاجة." : "Create direct or group conversations, and link an internal discussion to a patient when needed."}</p>
            <button onClick={() => setShowNew(true)} className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#554BC0] px-5 text-sm font-extrabold text-white shadow-md hover:bg-[#453BAA]"><Plus size={17} />{isRtl ? "إنشاء محادثة جديدة" : "Create a conversation"}</button>
          </div>}
        </main>
      </section>

      {showNew && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowNew(false); }}>
        <section className="flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl" dir={isRtl ? "rtl" : "ltr"}>
          <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-extrabold text-slate-900">{isRtl ? "إنشاء محادثة جديدة" : "New conversation"}</h2><p className="mt-1 text-xs text-slate-400">{isRtl ? "اختر أعضاء فريق المركز" : "Choose clinic team members"}</p></div><button onClick={() => setShowNew(false)} className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={18} /></button></header>
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
              <button onClick={() => setNewKind("team")} className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold ${newKind === "team" ? "bg-white text-[#554BC0] shadow-sm" : "text-slate-500"}`}><Users size={16} />{isRtl ? "الفريق" : "Team"}</button>
              <button onClick={() => setNewKind("patient")} className={`flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-bold ${newKind === "patient" ? "bg-white text-[#554BC0] shadow-sm" : "text-slate-500"}`}><User size={16} />{isRtl ? "مرتبطة بمريض" : "Patient-linked"}</button>
            </div>
            {newKind === "patient" && <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{isRtl ? "المريض" : "Patient"}</span><select value={newPatientId} onChange={(event) => setNewPatientId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#7770D2]"><option value="">{isRtl ? "اختر المريض..." : "Select a patient..."}</option>{(inbox?.patients || []).map((patient) => <option key={patient.id} value={patient.id}>{patient.nameAr} — {patient.id}</option>)}</select><span className="mt-1 block text-[11px] leading-5 text-amber-700">{isRtl ? "المحادثة ستكون داخلية بين أعضاء الفريق ومرتبطة بملف المريض فقط." : "This remains an internal team discussion linked to the patient's record."}</span></label>}
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{isRtl ? "عنوان المحادثة (اختياري)" : "Conversation title (optional)"}</span><input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} maxLength={120} placeholder={isRtl ? "مثال: متابعة الحالة..." : "e.g. Case follow-up..."} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#7770D2]" /></label>
            <div><div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold text-slate-700">{isRtl ? "أعضاء المحادثة" : "Participants"}</span><span className="text-[11px] text-slate-400">{newMembers.length} {isRtl ? "محدد" : "selected"}</span></div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2">
                {(inbox?.directory || []).length ? inbox!.directory.map((member) => <label key={member.email} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-slate-50"><input type="checkbox" checked={newMembers.includes(member.email)} onChange={() => toggleMember(member.email)} className="h-4 w-4 rounded accent-[#554BC0]" /><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Stethoscope size={16} /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-slate-800">{member.name}</span><span className="block truncate text-[11px] text-slate-400">{member.role} • {member.email}</span></span>{newMembers.includes(member.email) && <Check size={17} className="text-[#554BC0]" />}</label>) : <p className="px-3 py-8 text-center text-xs text-slate-400">{isRtl ? "لا يوجد أعضاء آخرون نشطون في المركز." : "No other active clinic members found."}</p>}
              </div>
            </div>
            <label className="block"><span className="mb-2 block text-xs font-bold text-slate-700">{isRtl ? "الرسالة الأولى (اختياري)" : "First message (optional)"}</span><textarea value={firstMessage} onChange={(event) => setFirstMessage(event.target.value)} rows={3} maxLength={5000} placeholder={isRtl ? "اكتب بداية المحادثة..." : "Start the conversation..."} className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#7770D2]" /></label>
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-slate-100 p-4"><button onClick={() => setShowNew(false)} className="h-10 rounded-xl px-4 text-sm font-bold text-slate-500 hover:bg-slate-100">{isRtl ? "إلغاء" : "Cancel"}</button><button onClick={() => void createConversation()} disabled={creating || !newMembers.length || (newKind === "patient" && !newPatientId)} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#554BC0] px-5 text-sm font-bold text-white hover:bg-[#453BAA] disabled:cursor-not-allowed disabled:opacity-40">{creating && <Loader2 size={16} className="animate-spin" />}{isRtl ? "إنشاء المحادثة" : "Create conversation"}</button></footer>
        </section>
      </div>}
    </div>
  );
}
