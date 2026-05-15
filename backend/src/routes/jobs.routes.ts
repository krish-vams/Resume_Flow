import { Router } from "express";
import {
  createJobRecord,
  analyzeJobEligibilityRecord,
  getJobRecord,
  listJobRecords,
  removeJobRecord,
  updateJobRecord
} from "../controllers/jobs.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const jobsRouter = Router();

jobsRouter.use(requireAuth);
jobsRouter.post("/", asyncHandler(createJobRecord));
jobsRouter.get("/", asyncHandler(listJobRecords));
jobsRouter.post("/:id/analyze-eligibility", asyncHandler(analyzeJobEligibilityRecord));
jobsRouter.get("/:id", asyncHandler(getJobRecord));
jobsRouter.put("/:id", asyncHandler(updateJobRecord));
jobsRouter.delete("/:id", asyncHandler(removeJobRecord));
