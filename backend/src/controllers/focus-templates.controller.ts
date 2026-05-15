import type { Request, Response } from "express";
import path from "path";
import {
  createFocusTemplate,
  deleteFocusTemplate,
  getFocusTemplate,
  listFocusTemplates,
  updateFocusTemplate
} from "../services/focus-template.service";
import {
  createFocusTemplateSchema,
  updateFocusTemplateSchema
} from "../validators/focus-template.validators";
import { HttpError } from "../utils/http-error";

function getFocusTemplateId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Focus template id is required");
  }

  return id;
}

function parseListField(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed);

    if (Array.isArray(parsed)) {
      return parsed.map(String).map((item) => item.trim()).filter(Boolean);
    }
  } catch {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  return undefined;
}

function fileUrlFromRequest(request: Request) {
  if (!request.file) {
    return undefined;
  }

  return `/uploads/focus-templates/${path.basename(request.file.path)}`;
}

function normalizeFocusTemplateBody(request: Request) {
  return {
    name: request.body.name,
    focusType: request.body.focusType,
    description: request.body.description,
    primaryLanguage: request.body.primaryLanguage,
    targetRolesJson: parseListField(request.body.targetRolesJson),
    baseResumeText: request.body.baseResumeText,
    baseResumeFileUrl: fileUrlFromRequest(request) ?? request.body.baseResumeFileUrl,
    defaultSkillsJson: parseListField(request.body.defaultSkillsJson)
  };
}

export async function createFocusTemplateRecord(request: Request, response: Response) {
  const input = createFocusTemplateSchema.parse(normalizeFocusTemplateBody(request));
  const focusTemplate = await createFocusTemplate(request.user!.id, input);

  response.status(201).json({ focusTemplate });
}

export async function listFocusTemplateRecords(request: Request, response: Response) {
  const focusTemplates = await listFocusTemplates(request.user!.id);

  response.json({ focusTemplates });
}

export async function getFocusTemplateRecord(request: Request, response: Response) {
  const focusTemplate = await getFocusTemplate(request.user!.id, getFocusTemplateId(request));

  response.json({ focusTemplate });
}

export async function updateFocusTemplateRecord(request: Request, response: Response) {
  const input = updateFocusTemplateSchema.parse(normalizeFocusTemplateBody(request));
  const focusTemplate = await updateFocusTemplate(request.user!.id, getFocusTemplateId(request), input);

  response.json({ focusTemplate });
}

export async function removeFocusTemplateRecord(request: Request, response: Response) {
  await deleteFocusTemplate(request.user!.id, getFocusTemplateId(request));

  response.status(204).send();
}
