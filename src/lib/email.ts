import { env } from "@/server/config/env";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

/**
 * Send an email.
 * In development (or when RESEND_API_KEY is not set), we log to the console
 * instead of hitting a real provider — this lets us develop without email setup.
 * In production, swap in Resend (or SendGrid / Postmark) by implementing below.
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const isDev = env.NODE_ENV !== "production";
  const hasKey = Boolean(env.RESEND_API_KEY);

  if (isDev || !hasKey) {
    console.log("\n──────── 📧 EMAIL (dev mode) ────────");
    console.log(`To:      ${input.to}`);
    console.log(`From:    ${env.EMAIL_FROM ?? "noreply@localhost"}`);
    console.log(`Subject: ${input.subject}`);
    console.log("── Body ──");
    console.log(input.text ?? input.html);
    console.log("─────────────────────────────────────\n");
    return;
  }

  // Production path — Resend API (no SDK needed for a single send)
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${res.status} ${body}`);
  }
}

// ─── Templates ──────────────────────────────────────────────

export function verificationEmailTemplate(name: string, token: string): SendEmailInput["html"] {
  const url = `${env.APP_URL}/verify-email?token=${token}`;
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">Welcome to ${env.PLATFORM_NAME}, ${name}!</h1>
      <p style="color: #4b5563; line-height: 1.5;">
        Thanks for signing up. Please verify your email address to activate your account.
      </p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Verify my email
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Or paste this URL into your browser:<br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${url}</code>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        This link expires in 24 hours. If you didn't create an account, you can ignore this email.
      </p>
    </div>
  `;
}

export function passwordResetEmailTemplate(name: string, token: string): SendEmailInput["html"] {
  const url = `${env.APP_URL}/reset-password?token=${token}`;
  return `
    <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <h1 style="font-size: 24px; margin: 0 0 16px;">Reset your password</h1>
      <p style="color: #4b5563; line-height: 1.5;">
        Hi ${name}, we received a request to reset your password.
      </p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background: #4f46e5; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="color: #6b7280; font-size: 14px;">
        Or paste this URL into your browser:<br>
        <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${url}</code>
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;
}