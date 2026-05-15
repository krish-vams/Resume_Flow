import type { FocusType, Prisma } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type FocusTemplateInput = {
  name?: string;
  focusType?: FocusType;
  description?: string;
  primaryLanguage?: string;
  targetRolesJson?: string[];
  baseResumeText?: string;
  baseResumeFileUrl?: string;
  defaultSkillsJson?: string[];
};

const focusTemplateSelect = {
  id: true,
  userId: true,
  name: true,
  focusType: true,
  description: true,
  primaryLanguage: true,
  targetRolesJson: true,
  baseResumeText: true,
  baseResumeFileUrl: true,
  defaultSkillsJson: true,
  createdAt: true,
  updatedAt: true
};

function toJsonArray(value: string[] | undefined): Prisma.InputJsonValue | undefined {
  return value === undefined ? undefined : value;
}

export async function createFocusTemplate(
  userId: string,
  input: Required<Pick<FocusTemplateInput, "name" | "focusType">> & FocusTemplateInput
) {
  return prisma.resumeFocusTemplate.create({
    data: {
      userId,
      name: input.name,
      focusType: input.focusType,
      description: input.description,
      primaryLanguage: input.primaryLanguage,
      targetRolesJson: toJsonArray(input.targetRolesJson),
      baseResumeText: input.baseResumeText,
      baseResumeFileUrl: input.baseResumeFileUrl,
      defaultSkillsJson: toJsonArray(input.defaultSkillsJson)
    },
    select: focusTemplateSelect
  });
}

export async function listFocusTemplates(userId: string) {
  return prisma.resumeFocusTemplate.findMany({
    where: { userId },
    select: focusTemplateSelect,
    orderBy: [{ focusType: "asc" }, { updatedAt: "desc" }]
  });
}

export async function getFocusTemplate(userId: string, focusTemplateId: string) {
  const focusTemplate = await prisma.resumeFocusTemplate.findFirst({
    where: {
      id: focusTemplateId,
      userId
    },
    select: focusTemplateSelect
  });

  if (!focusTemplate) {
    throw new HttpError(404, "Focus template not found");
  }

  return focusTemplate;
}

export async function updateFocusTemplate(userId: string, focusTemplateId: string, input: FocusTemplateInput) {
  await getFocusTemplate(userId, focusTemplateId);

  return prisma.resumeFocusTemplate.update({
    where: { id: focusTemplateId },
    data: {
      ...input,
      targetRolesJson: toJsonArray(input.targetRolesJson),
      defaultSkillsJson: toJsonArray(input.defaultSkillsJson)
    },
    select: focusTemplateSelect
  });
}

export async function deleteFocusTemplate(userId: string, focusTemplateId: string) {
  await getFocusTemplate(userId, focusTemplateId);

  await prisma.resumeFocusTemplate.delete({
    where: { id: focusTemplateId }
  });
}
