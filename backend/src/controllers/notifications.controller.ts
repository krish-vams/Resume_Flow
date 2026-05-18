import type { Request, Response } from "express";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from "../services/notification.service";
import { listNotificationsSchema } from "../validators/notification.validators";
import { HttpError } from "../utils/http-error";

function getNotificationId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Notification id is required");
  }

  return id;
}

export async function listNotificationRecords(request: Request, response: Response) {
  const input = listNotificationsSchema.parse(request.query);
  const notifications = await listNotifications(request.user!.id, input);

  response.json({ notifications });
}

export async function markNotificationReadRecord(request: Request, response: Response) {
  const notification = await markNotificationRead(request.user!.id, getNotificationId(request));

  response.json({ notification });
}

export async function markAllNotificationsReadRecord(request: Request, response: Response) {
  const notifications = await markAllNotificationsRead(request.user!.id);

  response.json({ notifications });
}
