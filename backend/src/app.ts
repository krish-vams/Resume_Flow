import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { candidateProfilesRouter } from "./routes/candidate-profiles.routes";
import { healthRouter } from "./routes/health.routes";
import { jobsRouter } from "./routes/jobs.routes";
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

app.use("/health", healthRouter);
app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/candidate-profiles", candidateProfilesRouter);
app.use("/api/jobs", jobsRouter);

app.use(errorMiddleware);
