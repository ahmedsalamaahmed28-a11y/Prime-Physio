import { NextResponse } from "next/server";

const deepseekApiKey = process.env.DEEPSEEK_API_KEY || "";
const geminiApiKey = process.env.GEMINI_API_KEY || "";

const SYSTEM_INSTRUCTION = `You are a professional medical report writer and clinical documentation specialist at Prime Physio.
Your goal is to generate formal, highly structured physical therapy progress reports and clinical referral letters in English.
Your tone is professional, scientific, clinical, and objective. 
You must output ONLY the final clinical report or letter in a clean, professional format. Do not add conversational intro/outro text.`;

async function callDeepSeek(prompt: string) {
  const url = "https://api.deepseek.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepseekApiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 2048,
    }),
  });

  const data = await response.json();
  if (response.ok && data.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }
  throw new Error(data?.error?.message || `DeepSeek status ${response.status}`);
}

async function callGemini(modelName: string, prompt: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
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
    const { type, patientInfo, clinicalData } = await req.json();

    let prompt = "";

    if (type === "referral") {
      prompt = `Generate a formal Medical Referral Letter in English from Prime Physio Clinic to a referring physician.
      
Patient Information:
- Full Name: ${patientInfo.nameEn}
- File Number: ${patientInfo.id}
- Date of Birth: ${patientInfo.dob}
- Gender: ${patientInfo.gender}

Clinical Records & Findings:
- Diagnosis/Condition: ${clinicalData.diagnosis}
- Subjective Complaints & Visual Analogue Scale (VAS): ${clinicalData.vasScore}/10 pain score
- Objective Findings / Range of Motion (ROM): ${clinicalData.rom}
- Treatment Plan / Clinical Notes: ${clinicalData.notes}

Include standard clinical letter sections:
1. Header (Prime Physio Clinic, Date)
2. Recipient: "To Whom It May Concern / Referring Physician"
3. Patient Demographics Summary
4. Clinical Assessment & Progress Report (synthesize the diagnosis, ROM, and pain score)
5. Treatment Summary (interventions performed, patient tolerance)
6. Discharge/Follow-up Recommendation
7. Professional closing signature placeholder (e.g., "Dr. Mona Hussein, PT, DPT").`;
    } else {
      prompt = `Generate a formal Physical Therapy Progress Report (suitable for insurance providers) in English.
      
Patient Information:
- Full Name: ${patientInfo.nameEn}
- File Number: ${patientInfo.id}
- Date of Birth: ${patientInfo.dob}
- Gender: ${patientInfo.gender}

Clinical Records & Findings:
- Diagnosis/Condition: ${clinicalData.diagnosis}
- Subjective Complaints & Visual Analogue Scale (VAS): ${clinicalData.vasScore}/10 pain score
- Objective Findings / Range of Motion (ROM): ${clinicalData.rom}
- Treatment Plan / Clinical Notes: ${clinicalData.notes}

Include standard insurance clinical report sections:
1. Progress Report Header
2. Patient Demographics & Identification
3. Initial Assessment vs. Current Status (synthesize progress using the VAS score and ROM provided)
4. Active Physical Therapy Interventions & Modalities Applied
5. Functional Goals Status
6. Continuation of Care Recommendation & Treatment Plan justification
7. Sign-off credential block.`;
    }

    // Try DeepSeek first
    if (deepseekApiKey) {
      try {
        console.log("Generating report with DeepSeek...");
        const text = await callDeepSeek(prompt);
        return NextResponse.json({ report: text });
      } catch (err: any) {
        console.warn("DeepSeek report failed, falling back to Gemini...", err.message);
      }
    }

    // Try Gemini models if DeepSeek failed or is not configured
    if (geminiApiKey) {
      const models = [
        "gemini-2.0-flash",
        "gemini-1.5-flash-latest",
        "gemini-1.5-flash",
      ];

      for (const model of models) {
        try {
          console.log(`Generating report with Gemini (${model})...`);
          const text = await callGemini(model, prompt);
          if (text) {
            return NextResponse.json({ report: text });
          }
        } catch (e: any) {
          console.warn(`Gemini (${model}) failed:`, e.message);
        }
      }
    }

    return NextResponse.json(
      { error: "فشل توليد التقرير باستخدام DeepSeek وGemini. يرجى مراجعة مفاتيح الـ API وصلاحيتها." },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("Report Generator API Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
