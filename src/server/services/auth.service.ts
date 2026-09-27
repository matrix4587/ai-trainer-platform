import { randomBytes, createHash } from "crypto";
import { hash } from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { env } from "@/server/config/env";
import {
  sendEmail,
  verificationEmailTemplate,
  passwordResetEmailTemplate,
} from "@/lib/email";
import type { RegisterInput } from "@/lib/validators/auth";

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

// ─── Token helpers ──────────────────────────────────────────
// We store SHA-256(token) in the DB, never the token itself.
// If the DB is leaked, tokens cannot be replayed.

function generateToken(): { token: string; hashed: string } {
  const token = randomBytes(32).toString("base64url");
  const hashed = createHash("sha256").update(token).digest("hex");
  return { token, hashed };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// ─── Register a new user ────────────────────────────────────

export async function registerUser(input: RegisterInput) {
  const { email, password, name } = input;

  // Reject duplicates (case-insensitive because we lowercase in the schema)
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("EMAIL_TAKEN", "An account with this email already exists");
  }

  const passwordHash = await hash(password, 12);

  // Create user + wallet + profile atomically, then create the verification token
  const { user, verificationToken } = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: "WORKER",
        status: "PENDING_VERIFICATION",
      },
    });

    await tx.wallet.create({
      data: { userId: user.id, currency: env.DEFAULT_CURRENCY },
    });

    await tx.profile.create({
      data: { userId: user.id, fullName: name },
    });

    const { token, hashed } = generateToken();
    await tx.verificationToken.create({
      data: {
        identifier: `email-verify:${user.id}`,
        token: hashed,
        expires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    return { user, verificationToken: token };
  });

  // Send the verification email (fire-and-forget; failure is logged but doesn't block)
  sendEmail({
    to: user.email,
    subject: `Verify your ${env.PLATFORM_NAME} email`,
    html: verificationEmailTemplate(name, verificationToken),
  }).catch((err) => {
    console.error("[auth] Failed to send verification email:", err);
  });

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
  };
}

// ─── Verify email ───────────────────────────────────────────

export async function verifyEmail(token: string) {
  const hashed = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });

  if (!record) {
    throw new AuthError("INVALID_TOKEN", "Invalid or expired verification link");
  }
  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { token: hashed } });
    throw new AuthError("EXPIRED_TOKEN", "This verification link has expired");
  }
  if (!record.identifier.startsWith("email-verify:")) {
    throw new AuthError("INVALID_TOKEN", "Invalid verification token type");
  }

  const userId = record.identifier.slice("email-verify:".length);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status: "ACTIVE", emailVerified: new Date() },
    }),
    prisma.verificationToken.delete({ where: { token: hashed } }),
  ]);

  return { userId };
}

// ─── Request password reset ─────────────────────────────────

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Always return success — don't leak whether an email is registered
  if (!user) return;

  const { token, hashed } = generateToken();

  await prisma.verificationToken.create({
    data: {
      identifier: `password-reset:${user.id}`,
      token: hashed,
      expires: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
    },
  });

  await sendEmail({
    to: user.email,
    subject: `Reset your ${env.PLATFORM_NAME} password`,
    html: passwordResetEmailTemplate(user.name ?? "there", token),
  }).catch((err) => {
    console.error("[auth] Failed to send password reset email:", err);
  });
}

// ─── Confirm password reset ─────────────────────────────────

export async function resetPassword(token: string, newPassword: string) {
  const hashed = hashToken(token);

  const record = await prisma.verificationToken.findUnique({
    where: { token: hashed },
  });

  if (!record || record.expires < new Date()) {
    throw new AuthError("INVALID_TOKEN", "Invalid or expired reset link");
  }
  if (!record.identifier.startsWith("password-reset:")) {
    throw new AuthError("INVALID_TOKEN", "Invalid reset token type");
  }

  const userId = record.identifier.slice("password-reset:".length);
  const passwordHash = await hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    }),
    prisma.verificationToken.delete({ where: { token: hashed } }),
  ]);

  return { userId };
}

// ─── Error class ────────────────────────────────────────────

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}