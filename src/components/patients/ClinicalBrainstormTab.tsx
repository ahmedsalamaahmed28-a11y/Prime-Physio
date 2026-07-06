"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CheckCircle, Star, Stethoscope, Activity, ClipboardList, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Patient {
  id: string;
  nameAr: string;
  nameEn: string;
  age: number;
  diagnosis?: string;
  medicalHistory?: string;
}

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ClinicalBrainstormTab({ patient }: { patient: Patient }) {
  const { language } = useLanguage();
  const isRtl = language === "ar";
  
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "system",
      content: `You are an expert physiotherapy clinical assistant. The doctor is consulting you about a patient:
Name: ${patient.nameEn || patient.nameAr}
Age: ${patient.age}
Diagnosis: ${patient.diagnosis || "Not specified"}
Medical History: ${patient.medicalHistory || "Not specified"}
Your goal is to act as a sounding board, suggest differential diagnoses, recommend special tests, and propose evidence-based interventions. Answer concisely and professionally in ${isRtl ? "Arabic" : "English"}.`
    },
    {
      role: "assistant",
      content: isRtl 
        ? `مرحباً دكتور. أنا المساعد السريري الخاص بك. المريض **${patient.nameAr}** (العمر: ${patient.age}) مشخص بـ **${patient.diagnosis || "غير محدد"}**. كيف يمكنني مساعدتك في التفكير السريري لهذه الحالة اليوم؟`
        : `Hello Doctor. I am your clinical assistant. The patient **${patient.nameEn}** (Age: ${patient.age}) is diagnosed with **${patient.diagnosis || "Not specified"}**. How can I help you brainstorm this case today?`
    }
  ]);
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCheckCircle = async (content: string = input) => {
    if (!content.trim()) return;
    
    const userMessage: Message = { role: "user", content };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      if (!response.ok) throw new Error("Failed to get response");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices[0]?.delta?.content || "";
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + text
                  };
                  return newMessages;
                });
              } catch (e) {
                // parse error on chunk
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    {
      icon: <MessageSquare className="w-4 h-4 mr-2 ml-2" />,
      label: isRtl ? "تشخيصات تفريقية" : "Differential Diagnoses",
      prompt: isRtl 
        ? "بناءً على المعطيات الحالية، ما هي أهم 3 تشخيصات تفريقية (Differential Diagnoses) يجب أن أضعها في الاعتبار؟ وكيف أفرق بينها سريرياً؟" 
        : "Based on the current data, what are the top 3 differential diagnoses I should consider? How do I differentiate them clinically?"
    },
    {
      icon: <Stethoscope className="w-4 h-4 mr-2 ml-2" />,
      label: isRtl ? "اختبارات سريرية" : "Special Tests",
      prompt: isRtl 
        ? "ما هي الاختبارات السريرية (Special Tests) أو المقاييس الوظيفية (Outcome Measures) التي تنصح بها لتأكيد التشخيص لهذا المريض؟" 
        : "What special tests or outcome measures do you recommend to confirm the diagnosis for this patient?"
    },
    {
      icon: <Activity className="w-4 h-4 mr-2 ml-2" />,
      label: isRtl ? "بدائل علاجية" : "Treatment Alternatives",
      prompt: isRtl 
        ? "المريض لم يظهر استجابة للبروتوكول التقليدي، هل يمكنك اقتراح تدخلات علاجية بديلة أو حديثة (Evidence-Based) لهذه الحالة؟" 
        : "The patient is not responding to the traditional protocol. Can you suggest alternative or modern evidence-based interventions for this case?"
    }
  ];

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-6" dir={isRtl ? "rtl" : "ltr"}>
      {/* Quick Actions (Left Sidebar) */}
      <div className="lg:col-span-4 space-y-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader className="pb-4 border-b border-indigo-100/50">
            <CardTitle className="text-lg text-indigo-950 flex items-center gap-2">
              <Star className="w-5 h-5 text-indigo-600" />
              {isRtl ? "المقترحات السريرية" : "Clinical Prompts"}
            </CardTitle>
            <CardDescription className="text-indigo-700/70">
              {isRtl ? "نقاش سريع مبني على الأدلة" : "Evidence-based quick prompts"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {quickActions.map((action, idx) => (
              <Button
                key={idx}
                variant="outline"
                className="w-full justify-start h-auto py-3 text-indigo-800 border-indigo-200 bg-white hover:bg-indigo-100 hover:text-indigo-900 text-right whitespace-normal"
                onClick={() => handleCheckCircle(action.prompt)}
                disabled={isLoading}
              >
                {action.icon}
                <span className="text-sm font-medium leading-relaxed">{action.label}</span>
              </Button>
            ))}
            
            <div className="mt-6 pt-4 border-t border-indigo-200/50">
              <div className="bg-white/60 rounded-lg p-3 text-sm text-indigo-800/80 leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  {isRtl ? "نصيحة طبية:" : "Pro Tip:"}
                </span>
                {isRtl 
                  ? "قم بوصف ما وجدته أثناء الفحص البدني (Palpation, ROM) بالتفصيل ليتمكن المساعد من تضييق نطاق التشخيصات."
                  : "Describe your physical examination findings (Palpation, ROM) in detail so the assistant can narrow down the diagnoses."}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Area (Right) */}
      <div className="lg:col-span-8">
        <Card className="border-0 shadow-lg flex flex-col h-[600px]">
          <CardHeader className="bg-white border-b py-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-slate-800 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-indigo-600" />
                {isRtl ? "التفكير السريري المشترك" : "Clinical Brainstorming"}
              </CardTitle>
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                AI Powered
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-slate-50/50">
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300"
            >
              {messages.filter(m => m.role !== "system").map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tl-none" 
                      : "bg-white border border-slate-200 text-slate-800 rounded-tr-none"
                  }`}>
                    <div className={`prose prose-sm max-w-none ${msg.role === "user" ? "prose-invert" : "prose-slate"} ${isRtl ? "rtl:prose-p:text-right rtl:prose-ul:text-right" : ""}`}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tr-none p-4 shadow-sm flex items-center gap-2">
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
              <div className="relative flex items-end gap-2">
                <Textarea 
                  placeholder={isRtl ? "اكتب ملاحظاتك، استفساراتك، أو نتائج الفحص السريري هنا..." : "Type your clinical notes, queries, or exam findings here..."}
                  className="min-h-[60px] resize-none border-slate-200 focus-visible:ring-indigo-500 pr-12"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleCheckCircle();
                    }
                  }}
                />
                <Button 
                  size="icon"
                  className="absolute bottom-2 right-2 h-8 w-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shrink-0"
                  onClick={() => handleCheckCircle()}
                  disabled={isLoading || !input.trim()}
                >
                  <CheckCircle className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
