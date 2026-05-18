import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1).default("postgresql://resumeflow:resumeflow@localhost:5433/resumeflow"),
  JWT_SECRET: z.string().min(1).default("change-me-in-local-env"),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  FORMATTER_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().min(1).default("gemini-2.5-flash"),
  GEMINI_API_BASE_URL: z.string().url().default("https://generativelanguage.googleapis.com"),
  REDIS_URL: z.string().min(1).default("redis://localhost:6380"),
  STORAGE_PROVIDER: z.enum(["local", "s3", "supabase"]).default("local"),
  LOCAL_STORAGE_PATH: z.string().min(1).default("./uploads")
});

export const env = envSchema.parse(process.env);
