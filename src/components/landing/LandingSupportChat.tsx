"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Bot, LoaderCircle } from "lucide-react";

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
            <span className="pp-support-avatar"><Bot size={22} aria-hidden="true" /></span>
            <span className="pp-support-heading">
              <strong>مساعد Prime Physio</strong>
              <small><i /> خدمة العملاء الذكية</small>
            </span>
            <button className="pp-support-close" type="button" onClick={() => setOpen(false)} aria-label="إغلاق المحادثة">
              <X size={21} />
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
                <p className="pp-support-bubble pp-support-typing"><LoaderCircle size={15} /> جاري كتابة الرد...</p>
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
              <Send size={18} />
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
        {open ? <X size={25} /> : <MessageCircle size={26} />}
        {!open && <span className="pp-support-launcher-label">تحتاج مساعدة؟</span>}
      </button>
    </div>
  );
}
