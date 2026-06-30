"use client";
import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Sparkles, Send, Bot, User, Zap, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  role: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "ai",
      text: isRtl 
        ? "مرحباً! أنا المساعد الذكي الخاص بعيادتك. كيف يمكنني مساعدتك اليوم؟ يمكنك أن تطلب مني تحليل الإيرادات، إضافة مرضى جدد، أو تنظيم المواعيد."
        : "Hello! I am your clinic's smart assistant. How can I help you today? You can ask me to analyze revenue, add new patients, or organize appointments.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response for now (to be connected to n8n later)
    setTimeout(() => {
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        text: isRtl 
          ? "أنا أقوم الآن بربط أنظمة n8n ليتم تفعيل هذا الأمر قريباً. يرجى الانتظار لحين اكتمال الدمج."
          : "I am currently integrating n8n systems to enable this soon. Please wait for the integration to complete.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-[#4F46BA]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isRtl ? "مساعد الذكاء الاصطناعي" : "AI Assistant"}
          </h1>
          <p className="text-sm text-slate-500">
            {isRtl ? "متصل بأنظمة n8n (قريباً)" : "Connected to n8n systems (soon)"}
          </p>
        </div>
        <div className="ml-auto flex gap-2" dir="ltr">
          <Button variant="outline" size="icon" onClick={() => setMessages([messages[0]])}>
            <RefreshCcw className="w-4 h-4 text-slate-500" />
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex gap-4 max-w-[85%] ${msg.role === "user" ? (isRtl ? "mr-auto flex-row-reverse" : "ml-auto flex-row-reverse") : ""}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === "ai" ? "bg-indigo-100 text-[#4F46BA]" : "bg-emerald-100 text-emerald-600"}`}>
                {msg.role === "ai" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-2xl ${msg.role === "user" ? "bg-emerald-500 text-white" : "bg-slate-50 text-slate-800"} shadow-sm`}>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                <span className={`text-[10px] mt-2 block ${msg.role === "user" ? "text-emerald-100" : "text-slate-400"}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className={`flex gap-4 max-w-[85%]`}>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-[#4F46BA] flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 text-slate-800 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isRtl ? "اسألني أي شيء عن عيادتك..." : "Ask me anything about your clinic..."}
              className="w-full bg-white border border-slate-200 rounded-full py-4 px-6 pr-14 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
              dir={isRtl ? "rtl" : "ltr"}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className={`absolute ${isRtl ? "left-2" : "right-2"} w-12 h-12 flex items-center justify-center rounded-full transition-all ${
                input.trim() && !isTyping 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg" 
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <Send className={`w-5 h-5 ${isRtl ? "-scale-x-100" : ""}`} />
            </button>
          </div>
          <div className="text-center mt-3 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Zap className="w-3 h-3 text-amber-500" />
            <span>{isRtl ? "مدعوم بتقنيات الذكاء الاصطناعي (n8n AI)" : "Powered by AI technologies (n8n AI)"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
