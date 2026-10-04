import { z } from "zod";

/**
 * Server-side environment variable schema.
 * Fail fast at boot if required vars are missing or malformed.
 * NEVER import this file from a Client Component.
 */
const serverSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  PLATFORM_NAME: z.string().default("Evalia"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY: z.string().optional(),
  S3_SECRET_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  ENCRYPTION_KEY: z.string().optional(),

  REDIS_URL: z.string().optional(),

  DEFAULT_MIN_WITHDRAWAL: z
    .string()
    .default("10")
    .transform((v) => Number(v)),
  DEFAULT_PAYOUT_DAY: z
    .enum(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"])
    .default("FRIDAY"),
  DEFAULT_CURRENCY: z.string().default("USD"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

function loadEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const formatted = parsed.error.flatten().fieldErrors;
    console.error(
      "Invalid or missing environment variables:",
      JSON.stringify(formatted, null, 2),
    );
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();