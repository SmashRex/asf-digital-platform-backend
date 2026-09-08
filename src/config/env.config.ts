import { z } from "zod";
import "dotenv/config";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  APP_BASE_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),

  MAIL_FROM_ADDRESS: z.string().email(),
  MAILER_API_KEY: z.string().optional(),

  MEDIA_STORAGE_KEY: z.string().optional(),
  MEDIA_STORAGE_SECRET: z.string().optional(),

  COOKIE_SECRET: z.string().min(16, "COOKIE_SECRET must be at least 16 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Environment validation failed. Check .env against .env.example.");
}

export const env = parsed.data;