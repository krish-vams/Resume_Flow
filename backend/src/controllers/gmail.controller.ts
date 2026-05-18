import type { Request, Response } from "express";
import { env } from "../config/env";
import {
  confirmGmailDetection,
  connectGmailFromCallback,
  getGmailConnectUrl,
  getGmailStatus,
  ignoreGmailDetection,
  listGmailDetections,
  listJobEmails,
  scanGmail
} from "../services/gmail.service";
import {
  gmailCallbackSchema,
  scanGmailSchema
} from "../validators/gmail.validators";
import { HttpError } from "../utils/http-error";

function getId(request: Request, key: string) {
  const id = request.params[key];

  if (typeof id !== "string") {
    throw new HttpError(400, `${key} is required`);
  }

  return id;
}

export async function startGmailConnect(request: Request, response: Response) {
  response.redirect(getGmailConnectUrl(request.user!.id));
}

export async function gmailCallback(request: Request, response: Response) {
  const input = gmailCallbackSchema.parse(request.query);
  await connectGmailFromCallback(input.code, input.state);
  response.redirect(`${env.FRONTEND_URL}/gmail?connected=1`);
}

export async function getGmailStatusRecord(request: Request, response: Response) {
  const status = await getGmailStatus(request.user!.id);

  response.json({ status });
}

export async function scanGmailRecord(request: Request, response: Response) {
  const input = scanGmailSchema.parse(request.body ?? {});
  const jobEmails = await scanGmail(request.user!.id, input.maxResults);

  response.json({ jobEmails });
}

export async function listGmailDetectionsRecord(request: Request, response: Response) {
  const jobEmails = await listGmailDetections(request.user!.id);

  response.json({ jobEmails });
}

export async function listJobEmailsRecord(request: Request, response: Response) {
  const jobEmails = await listJobEmails(request.user!.id, getId(request, "id"));

  response.json({ jobEmails });
}

export async function confirmGmailDetectionRecord(request: Request, response: Response) {
  const jobEmails = await confirmGmailDetection(request.user!.id, getId(request, "id"));

  response.json({ jobEmails });
}

export async function ignoreGmailDetectionRecord(request: Request, response: Response) {
  const jobEmails = await ignoreGmailDetection(request.user!.id, getId(request, "id"));

  response.json({ jobEmails });
}
