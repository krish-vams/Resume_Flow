import { Router } from "express";
import {
  createApplicationRecord,
  getApplicationRecord,
  listApplicationRecords,
  removeApplicationRecord,
  updateApplicationRecord
} from "../controllers/applications.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const applicationsRouter = Router();

applicationsRouter.use(requireAuth);
applicationsRouter.post("/", asyncHandler(createApplicationRecord));
applicationsRouter.get("/", asyncHandler(listApplicationRecords));
applicationsRouter.get("/:id", asyncHandler(getApplicationRecord));
applicationsRouter.put("/:id", asyncHandler(updateApplicationRecord));
applicationsRouter.delete("/:id", asyncHandler(removeApplicationRecord));
