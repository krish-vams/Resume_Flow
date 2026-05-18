import { Router } from "express";
import { getDashboardSummaryRecord } from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get("/summary", asyncHandler(getDashboardSummaryRecord));
