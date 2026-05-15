import type { Request, Response } from "express";
import {
  createApplication,
  deleteApplication,
  getApplication,
  listApplications,
  updateApplication
} from "../services/application.service";
import {
  createApplicationSchema,
  updateApplicationSchema
} from "../validators/application.validators";
import { HttpError } from "../utils/http-error";

function getApplicationId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Application id is required");
  }

  return id;
}

export async function createApplicationRecord(request: Request, response: Response) {
  const input = createApplicationSchema.parse(request.body);
  const application = await createApplication(request.user!.id, input);

  response.status(201).json({ application });
}

export async function listApplicationRecords(request: Request, response: Response) {
  const applications = await listApplications(request.user!.id);

  response.json({ applications });
}

export async function getApplicationRecord(request: Request, response: Response) {
  const application = await getApplication(request.user!.id, getApplicationId(request));

  response.json({ application });
}

export async function updateApplicationRecord(request: Request, response: Response) {
  const input = updateApplicationSchema.parse(request.body);
  const application = await updateApplication(request.user!.id, getApplicationId(request), input);

  response.json({ application });
}

export async function removeApplicationRecord(request: Request, response: Response) {
  await deleteApplication(request.user!.id, getApplicationId(request));

  response.status(204).send();
}
