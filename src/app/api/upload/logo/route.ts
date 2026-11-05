import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getAdminClient } from "@/lib/supabase";
import { requireRole } from "../../utils/auth";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function hasValidImageSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "image/png") return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/webp") return buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole(req, ["admin"]);
    if (!user.clinicId) return NextResponse.json({ error: "Clinic administrator access required" }, { status: 403 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_LOGO_BYTES) return NextResponse.json({ error: "File size must be between 1 byte and 5MB" }, { status: 400 });

    const mime = file.type.toLowerCase();
    const extension = MIME_EXTENSIONS[mime];
    if (!extension) return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 415 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, mime)) return NextResponse.json({ error: "Invalid image file" }, { status: 415 });

    const path = `${user.clinicId}/${randomUUID()}.${extension}`;
    const admin = getAdminClient();
    const { error: uploadError } = await admin.storage.from("branch-logos").upload(path, buffer, {
      contentType: mime,
      upsert: false,
    });
    if (uploadError) {
      console.error("[LogoUpload] Storage upload failed:", uploadError.message);
      return NextResponse.json({ error: "Unable to upload logo" }, { status: 500 });
    }

    const { data } = admin.storage.from("branch-logos").getPublicUrl(path);
    return NextResponse.json({ url: data?.publicUrl || null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const status = message === "Unauthorized" ? 401 : /forbidden|insufficient|membership/i.test(message) ? 403 : 500;
    return NextResponse.json({ error: status === 401 ? "Unauthorized" : status === 403 ? "Forbidden" : "Internal server error" }, { status });
  }
}
