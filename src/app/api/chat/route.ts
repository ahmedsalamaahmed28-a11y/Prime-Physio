import { NextResponse } from "next/server";

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Use DeepSeek first if API key is present
    if (deepseekApiKey) {
      try {
        console.log("Calling DeepSeek API...");
        const text = await callDeepSeek(messages);
        return NextResponse.json({ content: text, provider: "DeepSeek" });
      } catch (err: any) {
        console.warn("DeepSeek call failed, attempting fallback to Gemini...", err.message);
        // Fallback to Gemini if DeepSeek fails and Gemini key is configured
        if (geminiApiKey) {
          const text = await callGemini(messages);
          return NextResponse.json({ content: text, provider: "Gemini (Fallback)" });
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
      return NextResponse.json({ content: text, provider: "Gemini" });
    }

    return NextResponse.json(
      { error: "No AI service API keys configured on the server." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Chat API Route Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process chat request" },
      { status: 500 }
    );
  }
}
