import { Router } from "express";
import {
  analyzeResumeMatchRecord,
  downloadFormattedResumeRecord,
  downloadPdfResumeRecord,
  downloadRawResumeRecord,
  exportResumePdfRecord,
  formatResumeRecord,
  generateResumeRecord,
  getResumeValidationRecord,
  getResumeRecord,
  listResumeRecords,
  removeResumeRecord,
  validateResumeRecord,
  uploadRawResumeRecord
} from "../controllers/resumes.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { expensiveActionRateLimit, uploadRateLimit } from "../middleware/rate-limit.middleware";
import { uploadRawResumeFile } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const resumesRouter = Router();

resumesRouter.use(requireAuth);
resumesRouter.post("/upload-raw", uploadRateLimit, uploadRawResumeFile.single("rawResumeFile"), asyncHandler(uploadRawResumeRecord));
resumesRouter.post("/generate", expensiveActionRateLimit, asyncHandler(generateResumeRecord));
resumesRouter.get("/", asyncHandler(listResumeRecords));
resumesRouter.get("/:id/download-raw", asyncHandler(downloadRawResumeRecord));
resumesRouter.get("/:id/download-formatted", asyncHandler(downloadFormattedResumeRecord));
resumesRouter.get("/:id/download-pdf", asyncHandler(downloadPdfResumeRecord));
resumesRouter.post("/:id/format", expensiveActionRateLimit, asyncHandler(formatResumeRecord));
resumesRouter.post("/:id/export-pdf", expensiveActionRateLimit, asyncHandler(exportResumePdfRecord));
resumesRouter.post("/:id/validate", asyncHandler(validateResumeRecord));
resumesRouter.post("/:id/analyze-match", asyncHandler(analyzeResumeMatchRecord));
resumesRouter.get("/:id/validation", asyncHandler(getResumeValidationRecord));
resumesRouter.get("/:id", asyncHandler(getResumeRecord));
resumesRouter.delete("/:id", asyncHandler(removeResumeRecord));
