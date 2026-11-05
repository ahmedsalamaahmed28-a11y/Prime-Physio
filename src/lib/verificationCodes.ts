import { createHmac, randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationPurpose = "signup" | "password_reset";

function getHashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("A strong OTP_HASH_SECRET or NEXTAUTH_SECRET (at least 32 characters) is required");
  }
  return secret;
}

export function generateVerificationCode() {
  return randomInt(100000, 1000000).toString();
}

export function hashVerificationCode(email: string, purpose: VerificationPurpose, code: string) {
  return createHmac("sha256", getHashSecret())
    .update(`${purpose}:${email.toLowerCase().trim()}:${code}`)
    .digest("hex");
}

export async function issueVerificationCode(
  admin: SupabaseClient,
  email: string,
  purpose: VerificationPurpose
) {
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(email, purpose, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { error } = await admin.from("auth_verification_codes").upsert(
    {
      email: email.toLowerCase().trim(),
      purpose,
      code_hash: codeHash,
      expires_at: expiresAt,
      attempts: 0,
      consumed_at: null,
    },
    { onConflict: "email,purpose" }
  );

  if (error) throw error;
  return code;
}

export async function consumeVerificationCode(
  admin: SupabaseClient,
  email: string,
  purpose: VerificationPurpose,
  code: string
) {
  const codeHash = hashVerificationCode(email, purpose, code);
  const { data, error } = await admin.rpc("consume_auth_verification_code", {
    p_email: email.toLowerCase().trim(),
    p_purpose: purpose,
    p_code_hash: codeHash,
  });

  if (error) throw error;
  return data === true;
}
