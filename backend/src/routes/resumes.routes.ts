import { Router } from "express";
import {
  analyzeResumeMatchRecord,
  downloadFormattedResumeRecord,
  downloadRawResumeRecord,
  formatResumeRecord,
  getResumeValidationRecord,
  getResumeRecord,
  listResumeRecords,
  removeResumeRecord,
  validateResumeRecord,
  uploadRawResumeRecord
} from "../controllers/resumes.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadRawResumeFile } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const resumesRouter = Router();

resumesRouter.use(requireAuth);
resumesRouter.post("/upload-raw", uploadRawResumeFile.single("rawResumeFile"), asyncHandler(uploadRawResumeRecord));
resumesRouter.get("/", asyncHandler(listResumeRecords));
resumesRouter.get("/:id/download-raw", asyncHandler(downloadRawResumeRecord));
resumesRouter.get("/:id/download-formatted", asyncHandler(downloadFormattedResumeRecord));
resumesRouter.post("/:id/format", asyncHandler(formatResumeRecord));
resumesRouter.post("/:id/validate", asyncHandler(validateResumeRecord));
resumesRouter.post("/:id/analyze-match", asyncHandler(analyzeResumeMatchRecord));
resumesRouter.get("/:id/validation", asyncHandler(getResumeValidationRecord));
resumesRouter.get("/:id", asyncHandler(getResumeRecord));
resumesRouter.delete("/:id", asyncHandler(removeResumeRecord));
