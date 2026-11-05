import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "../utils/auth";

const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `You are an expert AI physical therapy assistant at Prime Physio Clinic.
Your goal is to assist clinicians and therapists with clinical questions, exercise prescription, physiological metrics, and physical therapy analysis.
You are professional, concise, and scientifically accurate. Speak in Arabic or English according to the language of the user's message.`;

async function callDeepSeek(messages: any[]) {
  const url = "https://api.deepseek.com/v1/chat/completions";
  const formattedMessages = [
    { role: "system", content: SYSTEM_INSTRUCTION },
    ...messages.map((m: { role: string; content: string }) => ({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    })),
  ];

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  const data = await response.json();
  if (response.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error(data?.error?.message || `DeepSeek API status ${response.status}`);
}

async function callGemini(messages: any[]) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
  const contents = messages.map((m: { role: string; content: string }) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }
  throw new Error(data?.error?.message || `Gemini status ${response.status}`);
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(req, ["admin", "doctor"]);
    const body = await req.json().catch(() => null);
    if (!Array.isArray(body?.messages) || body.messages.length < 1 || body.messages.length > 30) {
      return NextResponse.json({ error: "Invalid chat history" }, { status: 400 });
    }
    const messages = body.messages.map((message: any) => {
      if (!message || !["user", "assistant"].includes(message.role) || typeof message.content !== "string") {
        throw new Error("Invalid chat message");
      }
      const content = message.content.trim();
      if (!content || content.length > 8000) throw new Error("Chat message exceeds the allowed size");
      return { role: message.role, content };
    });
    if (messages.reduce((sum: number, message: { content: string }) => sum + message.content.length, 0) > 30000) {
      return NextResponse.json({ error: "Chat request is too large" }, { status: 413 });
    }

    // Use DeepSeek first if API key is present
    if (deepseekApiKey) {
      try {
        console.log("Calling DeepSeek API...");
        const text = await callDeepSeek(messages);
        return NextResponse.json({ content: text, provider: "DeepSeek" }, { headers: { "Cache-Control": "no-store, private" } });
      } catch (err: any) {
        console.warn("DeepSeek call failed, attempting fallback to Gemini...", err.message);
        // Fallback to Gemini if DeepSeek fails and Gemini key is configured
        if (geminiApiKey) {
          const text = await callGemini(messages);
          return NextResponse.json({ content: text, provider: "Gemini (Fallback)" }, { headers: { "Cache-Control": "no-store, private" } });
        }
        return NextResponse.json(
          { error: `DeepSeek Error: ${err.message}` },
          { status: 500 }
        );
      }
    }

    // Default to Gemini if no DeepSeek key
    if (geminiApiKey) {
      console.log("Calling Gemini API...");
      const text = await callGemini(messages);
      return NextResponse.json({ content: text, provider: "Gemini" }, { headers: { "Cache-Control": "no-store, private" } });
    }

    return NextResponse.json(
      { error: "No AI service API keys configured on the server." },
      { status: 500 }
    );
  } catch (error: any) {
    const status = /unauthorized/i.test(error.message) ? 401 : /forbidden|غير مصرح|صلاحية غير كافية/i.test(error.message) ? 403 : /Invalid chat|exceeds the allowed size/i.test(error.message) ? 400 : 500;
    console.error("Chat API Route Error:", error);
    return NextResponse.json(
      { error: status === 400 ? "Invalid chat request" : status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Failed to process chat request" },
      { status, headers: { "Cache-Control": "no-store, private" } }
    );
  }
}
