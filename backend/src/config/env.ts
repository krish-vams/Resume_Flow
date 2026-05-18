import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const defaultLocalJwtSecret = "change-me-in-local-env";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_PORT: z.coerce.number().int().positive().default(4000),
    FRONTEND_URL: z.string().url().default("http://localhost:3000"),
    DATABASE_URL: z.string().min(1).default("postgresql://resumeflow:resumeflow@localhost:5433/resumeflow"),
    JWT_SECRET: z.string().min(1).default(defaultLocalJwtSecret),
    JWT_EXPIRES_IN: z.string().min(1).default("7d"),
    FORMATTER_SERVICE_URL: z.string().url().default("http://localhost:8000"),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
    GEMINI_API_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com"),
    GMAIL_CLIENT_ID: z.string().optional(),
    GMAIL_CLIENT_SECRET: z.string().optional(),
    GMAIL_REDIRECT_URI: z.string().url().default("http://localhost:4000/api/gmail/callback"),
    REDIS_URL: z.string().min(1).default("redis://localhost:6380"),
    STORAGE_PROVIDER: z.enum(["local", "s3", "supabase"]).default("local"),
    LOCAL_STORAGE_PATH: z.string().min(1).default("./uploads")
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== "production") {
      return;
    }

    if (value.JWT_SECRET === defaultLocalJwtSecret || value.JWT_SECRET.length < 32) {
      context.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be set to a strong production value"
      });
    }
  });

export const env = envSchema.parse(process.env);
