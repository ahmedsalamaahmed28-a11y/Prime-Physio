import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendVerificationCode(email: string, code: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Prime Physio" <${process.env.SMTP_USER || "noreply@primephysio.com"}>`,
      to: email,
      subject: "رمز التحقق - Prime Physio",
      text: `رمز التحقق الخاص بك هو: ${code}\n\nيستخدم هذا الرمز لمرة واحدة فقط وينتهي بعد 10 دقائق.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; padding: 24px;">
          <h2 style="color: #0d8a8a;">Prime Physio - رمز التحقق</h2>
          <p>رمز التحقق الخاص بك هو:</p>
          <div style="font-size: 32px; font-weight: bold; color: #085454; letter-spacing: 8px; text-align: center; padding: 16px; background: #f0fdfa; border-radius: 12px; margin: 16px 0;">
            ${code}
          </div>
          <p style="color: #666;">يستخدم هذا الرمز لمرة واحدة فقط وينتهي بعد 10 دقائق.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
          <p style="color: #999; font-size: 12px;">إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.</p>
        </div>
      `,
    });
    return true;
  } catch (err) {
    console.error("[Email] Failed to send verification code:", err);
    return false;
  }
}
