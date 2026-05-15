import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import path from "path";
import { env } from "./config/env";
import { applicationsRouter } from "./routes/applications.routes";
import { authRouter } from "./routes/auth.routes";
import { candidateProfilesRouter } from "./routes/candidate-profiles.routes";
import { focusTemplatesRouter } from "./routes/focus-templates.routes";
import { healthRouter } from "./routes/health.routes";
import { jobsRouter } from "./routes/jobs.routes";
import { promptsRouter } from "./routes/prompts.routes";
import { resumesRouter } from "./routes/resumes.routes";
import { errorMiddleware } from "./middleware/error.middleware";

export const app = express();

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/uploads/focus-templates", express.static(path.resolve(env.LOCAL_STORAGE_PATH, "focus-templates")));

app.use("/health", healthRouter);
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/candidate-profiles", candidateProfilesRouter);
app.use("/api/focus-templates", focusTemplatesRouter);
app.use("/api/jobs", jobsRouter);
app.use("/api/prompts", promptsRouter);
app.use("/api/resumes", resumesRouter);
app.use("/api/applications", applicationsRouter);

app.use(errorMiddleware);
