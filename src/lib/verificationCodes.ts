import { createHmac, randomInt } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VerificationPurpose = "signup" | "password_reset" | "center_creation";

function getHashSecret() {
  const secret = process.env.OTP_HASH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("A strong OTP_HASH_SECRET or NEXTAUTH_SECRET (at least 32 characters) is required");
  }
  return secret;
}

export function normalizeAuthEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
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
  const cleanEmail = email.toLowerCase().trim();
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(cleanEmail, purpose, code);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data, error } = await admin.rpc("store_auth_verification_code", {
    p_email: cleanEmail,
    p_purpose: purpose,
    p_code_hash: codeHash,
    p_expires_at: expiresAt,
  });

  if (error) throw error;
  if (data !== true) throw new Error("OTP_RATE_LIMIT");
  return code;
}

export async function clearVerificationCode(
  admin: SupabaseClient,
  email: string,
  purpose: VerificationPurpose
) {
  const { error } = await admin
    .from("auth_verification_codes")
    .delete()
    .eq("email", email.toLowerCase().trim())
    .eq("purpose", purpose);
  if (error) throw error;
}

export async function consumeVerificationCode(
  admin: SupabaseClient,
  email: string,
  purpose: VerificationPurpose,
  code: string
) {
  if (!/^\d{6}$/.test(code)) return false;
  const codeHash = hashVerificationCode(email, purpose, code);
  const { data, error } = await admin.rpc("consume_auth_verification_code", {
    p_email: email.toLowerCase().trim(),
    p_purpose: purpose,
    p_code_hash: codeHash,
  });

  if (error) throw error;
  return data === true;
}

export async function checkVerificationCode(
  admin: SupabaseClient,
  email: string,
  purpose: VerificationPurpose,
  code: string
) {
  if (!/^\d{6}$/.test(code)) return false;
  const codeHash = hashVerificationCode(email, purpose, code);
  const { data, error } = await admin.rpc("check_auth_verification_code", {
    p_email: email.toLowerCase().trim(),
    p_purpose: purpose,
    p_code_hash: codeHash,
  });
  if (error) throw error;
  return data === true;
}
export async function allowOtpSendFromIp(
  admin: SupabaseClient,
  clientIp: string,
  purpose: "signup" | "password_reset" | "center_creation"
): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) return false;
  const normalizedIp = (clientIp || "unknown").trim().slice(0, 128);
  const ipHash = createHmac("sha256", secret).update(`otp-send:${purpose}:${normalizedIp}`).digest("hex");
  const bucketEmail = purpose === "signup"
    ? "signup-otp-send@prime-physio.internal"
    : purpose === "password_reset"
      ? "password-reset-otp-send@prime-physio.internal"
      : "center-creation-otp-send@prime-physio.internal";
  const { data, error } = await admin.rpc("check_auth_login_attempt", {
    p_email: bucketEmail,
    p_ip_hash: ipHash,
  });
  return !error && data === true;
}

export async function allowPaymentOrderFromIp(
  admin: SupabaseClient,
  clientIp: string
): Promise<boolean> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) return false;
  const normalizedIp = (clientIp || "unknown").trim().slice(0, 128);
  const ipHash = createHmac("sha256", secret)
    .update(`paymob-order:${normalizedIp}`)
    .digest("hex");
  const { data, error } = await admin.rpc("check_auth_login_attempt", {
    p_email: "paymob-order-create@prime-physio.internal",
    p_ip_hash: ipHash,
  });
  return !error && data === true;
}
