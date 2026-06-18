import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function GET() {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS ? "SET (length: " + process.env.SMTP_PASS.length + ")" : "NOT SET";

  // Try creating a transport and verify
  let verifyResult = "not attempted";
  let sendResult = "not attempted";
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass: process.env.SMTP_PASS || "" },
    });
    const verified = await transporter.verify();
    verifyResult = verified ? "OK" : "Failed (no reason)";
  } catch (err: any) {
    verifyResult = "FAILED: " + (err?.message || String(err));
  }

  // Try sending a test email
  if (user && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: { user, pass: process.env.SMTP_PASS || "" },
      });
      await transporter.sendMail({
        from: `"Test" <${user}>`,
        to: user,
        subject: "SMTP Test from Prime Physio",
        text: "If you received this, SMTP is working!",
      });
      sendResult = "sent successfully to " + user;
    } catch (err: any) {
      sendResult = "FAILED: " + (err?.message || String(err));
    }
  }

  return NextResponse.json({
    smtp: { host, port, user: user ? user.slice(0, 5) + "..." : "NOT SET", pass },
    verify: verifyResult,
    send: sendResult,
    node: process.version,
    env: Object.keys(process.env).filter(k => !k.toLowerCase().includes("key") && !k.toLowerCase().includes("secret") && !k.toLowerCase().includes("pass") && !k.toLowerCase().includes("token")),
  });
}
