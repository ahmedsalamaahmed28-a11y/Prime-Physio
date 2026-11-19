"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

type SupportIconName = "message" | "send" | "close" | "bot" | "loader";

function SupportIcon({ name, size = 20 }: { name: SupportIconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  if (name === "message") return <svg {...common}><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-.99L3 21l1.99-5.5A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3h.0A8.5 8.5 0 0 1 21 11.5Z" /></svg>;
  if (name === "send") return <svg {...common}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
  if (name === "close") return <svg {...common}><path d="m18 6-12 12M6 6l12 12" /></svg>;
  if (name === "bot") return <svg {...common}><rect x="3" y="8" width="18" height="13" rx="3" /><path d="M12 3v5M8 14h.01M16 14h.01M8 18h8" /><path d="M8 3h8" /></svg>;
  return <svg {...common} className="pp-support-spinner"><path d="M21 12a9 9 0 1 1-2.64-6.36" /></svg>;
}


type ChatMessage = { id: string; role: "assistant" | "user"; text: string };

const makeId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `pp-${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function LandingSupportChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId] = useState(makeId);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "أهلاً بك في Prime Physio 👋\nأنا مساعد خدمة العملاء. كيف يمكنني مساعدتك؟",
    },
  ]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = message.trim();
    if (!text || sending) return;

    setMessages((current) => [...current, { id: makeId(), role: "user", text }]);
    setMessage("");
    setSending(true);

    try {
      const response = await fetch("/api/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId, source: "website" }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || "تعذر الاتصال بخدمة العملاء حالياً.");
      }
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: typeof data.reply === "string" && data.reply.trim()
            ? data.reply
            : "لم يصلني رد واضح. حاول مرة أخرى من فضلك.",
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          text: error instanceof Error
            ? error.message
            : "تعذر الاتصال بخدمة العملاء حالياً. حاول مرة أخرى لاحقاً.",
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="pp-support-chat" dir="rtl">
      {open && (
        <section className="pp-support-panel" aria-label="محادثة خدمة عملاء Prime Physio">
          <header className="pp-support-head">
            <span className="pp-support-avatar"><SupportIcon name="bot" size={22} /></span>
            <span className="pp-support-heading">
              <strong>مساعد Prime Physio</strong>
              <small><i /> خدمة العملاء الذكية</small>
            </span>
            <button className="pp-support-close" type="button" onClick={() => setOpen(false)} aria-label="إغلاق المحادثة">
              <SupportIcon name="close" size={21} />
            </button>
          </header>

          <div className="pp-support-messages" ref={listRef} aria-live="polite" aria-relevant="additions">
            {messages.map((item) => (
              <div key={item.id} className={`pp-support-row ${item.role === "user" ? "is-user" : "is-assistant"}`}>
                <p className="pp-support-bubble">{item.text}</p>
              </div>
            ))}
            {sending && (
              <div className="pp-support-row is-assistant">
                <p className="pp-support-bubble pp-support-typing"><SupportIcon name="loader" size={15} /> جاري كتابة الرد...</p>
              </div>
            )}
          </div>

          <form className="pp-support-form" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="اكتب رسالتك هنا..."
              aria-label="اكتب رسالتك"
              maxLength={2000}
              disabled={sending}
              autoComplete="off"
            />
            <button type="submit" disabled={!message.trim() || sending} aria-label="إرسال الرسالة">
              <SupportIcon name="send" size={18} />
            </button>
          </form>
          <p className="pp-support-disclaimer">لا ترسل بيانات صحية أو معلومات شخصية حساسة عبر المحادثة.</p>
        </section>
      )}

      <button
        type="button"
        className={`pp-support-launcher ${open ? "is-open" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "إغلاق خدمة العملاء" : "افتح محادثة خدمة العملاء"}
        aria-expanded={open}
      >
        {open ? <SupportIcon name="close" size={25} /> : <SupportIcon name="message" size={26} />}
        {!open && <span className="pp-support-launcher-label">تحتاج مساعدة؟</span>}
      </button>
    </div>
  );
}
