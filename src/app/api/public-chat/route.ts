import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const requestLog = new Map<string, number[]>();

function getClientKey(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown";
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host) {
    try {
      if (new URL(origin).host !== host) {
        return NextResponse.json({ error: "طلب غير مسموح." }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "طلب غير صالح." }, { status: 403 });
    }
  }

  const key = getClientKey(request);
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter((time) => now - time < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    return NextResponse.json({ error: "أرسلت رسائل كثيرة خلال وقت قصير. حاول بعد دقيقة." }, { status: 429 });
  }
  recent.push(now);
  requestLog.set(key, recent);

  let payload: { message?: unknown; conversationId?: unknown; source?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "تعذر قراءة الرسالة." }, { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  const conversationId = typeof payload.conversationId === "string" ? payload.conversationId.slice(0, 100) : "";
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "اكتب رسالة لا تتجاوز 2000 حرف." }, { status: 400 });
  }

  const webhookUrl = process.env.N8N_CHAT_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json(
      { error: "خدمة المحادثة لم تُربط بـ n8n بعد. يرجى المحاولة لاحقاً." },
      { status: 503 }
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(webhookUrl);
    if (parsedUrl.protocol !== "https:") throw new Error("HTTPS is required");
  } catch {
    return NextResponse.json({ error: "إعداد اتصال خدمة المحادثة غير صحيح." }, { status: 503 });
  }

  try {
    const upstream = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        source: "website",
        conversationId,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json({ error: "خدمة المحادثة غير متاحة حالياً." }, { status: 502 });
    }
    return NextResponse.json({
      reply: typeof result.reply === "string" ? result.reply.slice(0, 6000) : "",
    });
  } catch {
    return NextResponse.json({ error: "تعذر الوصول إلى خدمة المحادثة حالياً." }, { status: 502 });
  }
}
