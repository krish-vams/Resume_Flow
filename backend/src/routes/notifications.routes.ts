import { Router } from "express";
import {
  listNotificationRecords,
  markAllNotificationsReadRecord,
  markNotificationReadRecord
} from "../controllers/notifications.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get("/", asyncHandler(listNotificationRecords));
notificationsRouter.post("/mark-all-read", asyncHandler(markAllNotificationsReadRecord));
notificationsRouter.post("/:id/read", asyncHandler(markNotificationReadRecord));
