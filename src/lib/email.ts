import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  requireTLS: Number(process.env.SMTP_PORT || 587) === 587,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendVerificationCode(
  email: string,
  code: string,
  purpose: "signup" | "center_creation" = "signup"
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const info = await transporter.sendMail({
      from: `"Prime Physio" <${process.env.SMTP_USER || "noreply@primephysio.com"}>`,
      to: normalizedEmail,
      subject:
        purpose === "center_creation"
          ? "تأكيد إنشاء المركز - Prime Physio"
          : "رمز التحقق - Prime Physio",
      text: `${purpose === "center_creation" ? "رمز تأكيد إنشاء المركز" : "رمز التحقق الخاص بك"}: ${code}\n\nيستخدم هذا الرمز لمرة واحدة فقط وينتهي بعد 10 دقائق.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px;">
          <h2 style="color: #0d8a8a;">Prime Physio - ${purpose === "center_creation" ? "تأكيد إنشاء المركز" : "رمز التحقق"}</h2>
          <p>${purpose === "center_creation" ? "رمز تأكيد إنشاء المركز الخاص بك هو:" : "رمز التحقق الخاص بك هو:"}</p>
          <div style="font-size: 32px; font-weight: bold; color: #085454; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0fdfa; border-radius: 12px; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #666;">يستخدم هذا الرمز لمرة واحدة فقط وينتهي بعد 10 دقائق.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #999; font-size: 12px;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
        </div>
      `,
    });

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejectedCount = Array.isArray(info.rejected) ? info.rejected.length : 0;
    const recipientAccepted = accepted.some(
      (recipient) => String(recipient).trim().toLowerCase() === normalizedEmail
    );

    // Never log the OTP, SMTP credentials, or the recipient address.
    console.info("[Email] Verification email SMTP result:", {
      purpose,
      messageId: info.messageId,
      acceptedCount: accepted.length,
      rejectedCount,
      recipientAccepted,
      responseCode: info.response?.match(/\\b[245]\\d{2}\\b/)?.[0] ?? null,
    });

    if (!recipientAccepted) {
      console.error("[Email] SMTP did not accept the verification recipient.");
      return false;
    }

    return true;
  } catch (err) {
    const error = err as NodeJS.ErrnoException & { responseCode?: number; command?: string };
    console.error("[Email] Failed to send verification code:", {
      name: error.name,
      code: error.code,
      responseCode: error.responseCode,
      command: error.command,
    });
    return false;
  }
}
