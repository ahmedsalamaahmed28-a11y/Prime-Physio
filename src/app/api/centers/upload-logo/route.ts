import { NextRequest, NextResponse } from "next/server";
import { createHash, randomUUID } from "crypto";
import { getAdminClient } from "@/lib/supabase-admin";
import { requireAuthOnly } from "../../utils/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function validSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuthOnly(req);
    const form = await req.formData();
    const kind = form.get("kind") === "cover" ? "cover" : "logo";
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "اختر صورة للمركز أولاً." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return NextResponse.json({ error: "يجب ألا يتجاوز حجم الصورة 5 ميجابايت." }, { status: 413 });

    const mime = file.type.toLowerCase();
    const extension = MIME_EXTENSIONS[mime];
    if (!extension) return NextResponse.json({ error: "الصيغ المدعومة هي PNG وJPG وWebP فقط." }, { status: 415 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validSignature(buffer, mime)) return NextResponse.json({ error: "ملف الصورة غير صالح." }, { status: 415 });

    const ownerFolder = createHash("sha256").update(session.email.toLowerCase().trim()).digest("hex");
    const path = `onboarding/${ownerFolder}/${kind === "cover" ? "covers/" : ""}${randomUUID()}.${extension}`;
    const admin = getAdminClient();
    const { error } = await admin.storage.from("branch-logos").upload(path, buffer, {
      contentType: mime,
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) {
      console.error("[CenterLogo] Upload failed:", error);
      return NextResponse.json({ error: "تعذر رفع صورة المركز حاليًا." }, { status: 500 });
    }

    const { data } = admin.storage.from("branch-logos").getPublicUrl(path);
    return NextResponse.json({ success: true, url: data.publicUrl, path }, {
      headers: { "Cache-Control": "no-store, private" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/unauthorized/i.test(message)) return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
    console.error("[CenterLogo] Upload failed:", error);
    return NextResponse.json({ error: "تعذر رفع صورة المركز حاليًا." }, { status: 500 });
  }
}
