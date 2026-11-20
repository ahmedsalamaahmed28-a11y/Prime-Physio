import { NextRequest, NextResponse } from "next/server";
import { getClinicContext } from "@/lib/server/clinic-context";
import { canViewPatientHistory, hasStaffPermission } from "@/lib/server/staff-permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `You are a professional physiotherapy clinical report writer.
Write only a structured, objective report in English. Use only the supplied clinical facts.
Do not infer, invent, or claim improvements, diagnoses, examination findings, interventions,
tolerance, goals achieved, or discharge status that were not explicitly supplied.
If information is missing, mark it as "Not provided". The patient is represented by a
non-identifying reference; never request or infer their identity.`;

function cleanClinicalText(value: unknown, max = 3000, sensitiveValues: unknown[] = []): string {
  if (typeof value !== "string") return "";
  let cleaned = value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED CONTACT]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[REDACTED NUMBER]");

  for (const sensitiveValue of sensitiveValues) {
    if (typeof sensitiveValue !== "string" || sensitiveValue.trim().length < 3) continue;
    const escaped = sensitiveValue.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\function cleanClinicalText(value: unknown, max = 3000): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED CONTACT]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[REDACTED NUMBER]")
    .slice(0, max)
    .trim();
}");
    cleaned = cleaned.replace(new RegExp(escaped, "gi"), "[REDACTED PATIENT DATA]");
  }

  return cleaned.slice(0, max).trim();
}

async function callDeepSeek(prompt: string) {
  const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));
  if (response.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content as string;
  }
  throw new Error(`DeepSeek request failed with HTTP ${response.status}`);
}

async function callGemini(modelName: string, prompt: string) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": geminiApiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
      }),
      cache: "no-store",
    },
  );

  const data = await response.json().catch(() => ({}));
  if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text as string;
  }
  throw new Error(`Gemini request failed with HTTP ${response.status}`);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getClinicContext(req);
    if ("response" in auth) return auth.response;
    if (!hasStaffPermission(auth.staff, "view_patients") || !canViewPatientHistory(auth.staff)) {
      return NextResponse.json(
        { error: "ليس لديك صلاحية مشاهدة بيانات المريض والسجل السريري" },
        { status: 403, headers: { "Cache-Control": "no-store, private" } },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Invalid report request" }, { status: 400 });
    }

    // Explicit, per-request consent is mandatory before any clinical data is sent to an external AI provider.
    if (body.consentToExternalProcessing !== true) {
      return NextResponse.json(
        { error: "يلزم تأكيد موافقة المريض أو ممثله المخول قبل إرسال البيانات السريرية إلى مزود ذكاء اصطناعي خارجي." },
        { status: 400, headers: { "Cache-Control": "no-store, private" } },
      );
    }

    const type = body.type;
    const clinicalData = body.clinicalData;
    const patientId = typeof body.patientId === "string" ? body.patientId.trim() : "";
    if (!["referral", "progress", "discharge"].includes(type) || !patientId ||
        !clinicalData || typeof clinicalData !== "object" || Array.isArray(clinicalData)) {
      return NextResponse.json({ error: "Invalid report request" }, { status: 400 });
    }

    // Resolve the patient on the server and enforce the active clinic boundary.
    const { data: patientRecord, error: patientLookupError } = await auth.admin
      .from("patients")
      .select("id, diagnosis, nameAr, nameEn, phone")
      .eq("id", patientId)
      .eq("clinic_id", auth.clinicId)
      .maybeSingle();
    if (patientLookupError) {
      return NextResponse.json({ error: "تعذر التحقق من سجل المريض." }, { status: 500 });
    }
    if (!patientRecord) {
      return NextResponse.json({ error: "المريض غير موجود في المركز الحالي." }, { status: 404 });
    }

    const sensitiveValues = [patientId, patientRecord.nameAr, patientRecord.nameEn, patientRecord.phone];
    const diagnosis = cleanClinicalText(patientRecord.diagnosis, 1500, sensitiveValues);
    const rom = cleanClinicalText(clinicalData.rom, 2500, sensitiveValues);
    const notes = cleanClinicalText(clinicalData.notes, 3000, sensitiveValues);
    const vasScore = Number(clinicalData.vasScore);
    if (!Number.isInteger(vasScore) || vasScore < 0 || vasScore > 10 ||
        !diagnosis || !rom || !notes) {
      return NextResponse.json(
        { error: "يرجى إدخال التشخيص ونتائج الحركة والملاحظات ودرجة الألم من 0 إلى 10." },
        { status: 400, headers: { "Cache-Control": "no-store, private" } },
      );
    }

    // Deliberately do not read or forward patientInfo, patient names, file IDs, phone numbers, DOB, or gender.
    const reportKind = type === "referral"
      ? "Medical Referral Letter"
      : type === "progress"
        ? "Physical Therapy Progress Report"
        : "Physical Therapy Discharge Summary";

    const prompt = `Generate a formal ${reportKind} in English.
The report must remain de-identified. Refer to the subject only as "the patient".
Do not include or request names, file numbers, phone numbers, dates of birth, addresses, or other identifiers.

Verified clinical information supplied by the treating clinician:
- Diagnosis/condition: ${diagnosis}
- Pain score (VAS): ${vasScore}/10
- Range of motion / objective findings: ${rom}
- Treatment notes and recommendations: ${notes}

Use clear clinical sections appropriate to the report type. Distinguish documented findings
from recommendations. Do not state that goals were achieved or treatment was completed unless
that is explicitly documented above. Mark missing information as "Not provided".`;

    if (JSON.stringify({ diagnosis, rom, notes }).length > 8000) {
      return NextResponse.json({ error: "Report request is too large" }, { status: 413 });
    }

    if (deepseekApiKey) {
      try {
        const report = await callDeepSeek(prompt);
        return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store, private" } });
      } catch {
        // Provider failures are intentionally not logged with request data or provider response bodies.
      }
    }

    if (geminiApiKey) {
      for (const model of ["gemini-2.0-flash", "gemini-1.5-flash-latest", "gemini-1.5-flash"]) {
        try {
          const report = await callGemini(model, prompt);
          if (report) {
            return NextResponse.json({ report }, { headers: { "Cache-Control": "no-store, private" } });
          }
        } catch {
          // Try the next configured Gemini model without logging clinical request content.
        }
      }
    }

    return NextResponse.json(
      { error: "تعذر توليد التقرير. يرجى مراجعة إعدادات مزود الذكاء الاصطناعي." },
      { status: 502, headers: { "Cache-Control": "no-store, private" } },
    );
  } catch {
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء التقرير." },
      { status: 500, headers: { "Cache-Control": "no-store, private" } },
    );
  }
}
