import "server-only";
import { createHash } from "crypto";

export type PasswordPolicyFailure =
  | "PASSWORD_TOO_WEAK"
  | "PASSWORD_COMPROMISED"
  | "PASSWORD_CHECK_UNAVAILABLE";

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "123456",
  "password",
  "password1",
  "password123",
  "qwerty123",
  "qwertyui",
  "abcdefgh",
  "abc12345",
  "admin123",
  "welcome1",
  "iloveyou",
  "11111111",
  "00000000",
  "87654321",
  "111111111",
]);

export async function validateNewPassword(password: string): Promise<void> {
  if (
    password.length < 8 ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    COMMON_PASSWORDS.has(password.trim().toLowerCase())
  ) {
    throw new Error("PASSWORD_TOO_WEAK");
  }

  // Check the password against the public breach corpus using k-anonymity.
  // Only the first five SHA-1 hash characters are sent; the password itself
  // and the complete hash never leave this server.
  const hash = createHash("sha1").update(password, "utf8").digest("hex").toUpperCase();
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  let response: Response;
  try {
    response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: "GET",
      cache: "no-store",
      headers: {
        "Add-Padding": "true",
        "User-Agent": "Prime-Physio-Password-Security",
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    throw new Error("PASSWORD_CHECK_UNAVAILABLE");
  }

  if (!response.ok) {
    throw new Error("PASSWORD_CHECK_UNAVAILABLE");
  }

  const compromised = (await response.text()).split(/\\r?\\n/).some((line) => {
    const [candidate, countText] = line.trim().split(":");
    return candidate?.toUpperCase() === suffix && Number(countText) > 0;
  });

  if (compromised) {
    throw new Error("PASSWORD_COMPROMISED");
  }
}
