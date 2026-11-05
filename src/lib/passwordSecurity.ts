import "server-only";
import { createHash } from "crypto";

export type PasswordPolicyFailure =
  | "PASSWORD_TOO_WEAK"
  | "PASSWORD_COMPROMISED"
  | "PASSWORD_CHECK_UNAVAILABLE";

export async function validateNewPassword(password: string): Promise<void> {
  if (
    password.length < 12 ||
    password.length > 128 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error("PASSWORD_TOO_WEAK");
  }

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

  const compromised = (await response.text()).split(/\r?\n/).some((line) => {
    const [candidate, countText] = line.trim().split(":");
    return candidate?.toUpperCase() === suffix && Number(countText) > 0;
  });

  if (compromised) {
    throw new Error("PASSWORD_COMPROMISED");
  }
}
