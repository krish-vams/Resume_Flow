import { Router } from "express";
import {
  confirmGmailDetectionRecord,
  getGmailStatusRecord,
  gmailCallback,
  ignoreGmailDetectionRecord,
  listGmailDetectionsRecord,
  listJobEmailsRecord,
  scanGmailRecord,
  startGmailConnect
} from "../controllers/gmail.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const gmailRouter = Router();

gmailRouter.get("/callback", asyncHandler(gmailCallback));
gmailRouter.get("/connect", requireAuth, asyncHandler(startGmailConnect));
gmailRouter.get("/status", requireAuth, asyncHandler(getGmailStatusRecord));
gmailRouter.post("/scan", requireAuth, asyncHandler(scanGmailRecord));
gmailRouter.get("/detections", requireAuth, asyncHandler(listGmailDetectionsRecord));
gmailRouter.post("/detections/:id/confirm", requireAuth, asyncHandler(confirmGmailDetectionRecord));
gmailRouter.post("/detections/:id/ignore", requireAuth, asyncHandler(ignoreGmailDetectionRecord));
gmailRouter.get("/jobs/:id/emails", requireAuth, asyncHandler(listJobEmailsRecord));
