import type { Request, Response } from "express";
import {
  assemblePrompt,
  createPrompt,
  deletePrompt,
  duplicatePrompt,
  getPrompt,
  listPrompts,
  updatePrompt
} from "../services/prompt.service";
import {
  assemblePromptSchema,
  createPromptSchema,
  updatePromptSchema
} from "../validators/prompt.validators";
import { HttpError } from "../utils/http-error";

function getPromptId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Prompt id is required");
  }

  return id;
}

export async function createPromptRecord(request: Request, response: Response) {
  const input = createPromptSchema.parse(request.body);
  const prompt = await createPrompt(request.user!.id, input);

  response.status(201).json({ prompt });
}

export async function listPromptRecords(request: Request, response: Response) {
  const prompts = await listPrompts(request.user!.id);

  response.json({ prompts });
}

export async function getPromptRecord(request: Request, response: Response) {
  const prompt = await getPrompt(request.user!.id, getPromptId(request));

  response.json({ prompt });
}

export async function updatePromptRecord(request: Request, response: Response) {
  const input = updatePromptSchema.parse(request.body);
  const prompt = await updatePrompt(request.user!.id, getPromptId(request), input);

  response.json({ prompt });
}

export async function duplicatePromptRecord(request: Request, response: Response) {
  const prompt = await duplicatePrompt(request.user!.id, getPromptId(request));

  response.status(201).json({ prompt });
}

export async function assemblePromptRecord(request: Request, response: Response) {
  const input = assemblePromptSchema.parse(request.body);
  const assembledPrompt = await assemblePrompt(
    request.user!.id,
    getPromptId(request),
    input.jobId,
    input.referenceEntryIds ?? []
  );

  response.json({ assembledPrompt });
}

export async function removePromptRecord(request: Request, response: Response) {
  await deletePrompt(request.user!.id, getPromptId(request));

  response.status(204).send();
}
