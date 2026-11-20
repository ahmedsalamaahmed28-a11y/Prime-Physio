import "server-only";

export type PasswordPolicyFailure = "PASSWORD_TOO_WEAK";

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

// Local password policy only. Breached-password lookups are intentionally
// disabled for now and can be re-enabled later without changing signup flow.
export async function validateNewPassword(password: string): Promise<void> {
  if (
    password.length < 8 ||
    password.length > 128 ||
    Buffer.byteLength(password, "utf8") > 72 ||
    COMMON_PASSWORDS.has(password.trim().toLowerCase())
  ) {
    throw new Error("PASSWORD_TOO_WEAK");
  }
}
