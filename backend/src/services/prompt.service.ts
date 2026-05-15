import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";
import { getJob } from "./job.service";
import { getReferenceEntriesByIds } from "./reference-library.service";

type PromptInput = {
  name?: string;
  description?: string;
  promptText?: string;
  targetRole?: string;
  candidateName?: string;
  version?: number;
  isActive?: boolean;
};

const promptSelect = {
  id: true,
  userId: true,
  name: true,
  description: true,
  promptText: true,
  targetRole: true,
  candidateName: true,
  version: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
};

export async function createPrompt(userId: string, input: Required<Pick<PromptInput, "name" | "promptText">> & PromptInput) {
  return prisma.promptTemplate.create({
    data: {
      userId,
      name: input.name,
      description: input.description,
      promptText: input.promptText,
      targetRole: input.targetRole,
      candidateName: input.candidateName,
      version: input.version ?? 1,
      isActive: input.isActive ?? true
    },
    select: promptSelect
  });
}

export async function listPrompts(userId: string) {
  return prisma.promptTemplate.findMany({
    where: { userId },
    select: promptSelect,
    orderBy: [
      { isActive: "desc" },
      { updatedAt: "desc" }
    ]
  });
}

export async function getPrompt(userId: string, promptId: string) {
  const prompt = await prisma.promptTemplate.findFirst({
    where: {
      id: promptId,
      userId
    },
    select: promptSelect
  });

  if (!prompt) {
    throw new HttpError(404, "Prompt template not found");
  }

  return prompt;
}

export async function updatePrompt(userId: string, promptId: string, input: PromptInput) {
  const existingPrompt = await getPrompt(userId, promptId);
  const shouldIncrementVersion =
    input.promptText !== undefined && input.promptText !== existingPrompt.promptText;

  return prisma.promptTemplate.update({
    where: { id: promptId },
    data: {
      ...input,
      version: input.version ?? (shouldIncrementVersion ? existingPrompt.version + 1 : undefined)
    },
    select: promptSelect
  });
}

export async function duplicatePrompt(userId: string, promptId: string) {
  const prompt = await getPrompt(userId, promptId);

  return createPrompt(userId, {
    name: `${prompt.name} Copy`,
    description: prompt.description ?? undefined,
    promptText: prompt.promptText,
    targetRole: prompt.targetRole ?? undefined,
    candidateName: prompt.candidateName ?? undefined,
    version: 1,
    isActive: false
  });
}

export async function deletePrompt(userId: string, promptId: string) {
  await getPrompt(userId, promptId);

  await prisma.promptTemplate.delete({
    where: { id: promptId }
  });
}

export async function assemblePrompt(userId: string, promptId: string, jobId: string, referenceEntryIds: string[] = []) {
  const [prompt, job, referenceEntries] = await Promise.all([
    getPrompt(userId, promptId),
    getJob(userId, jobId),
    getReferenceEntriesByIds(userId, referenceEntryIds)
  ]);
  const referenceContext = referenceEntries.map((entry) =>
    [entry.title ? `${entry.title}: ${entry.content}` : entry.content, `Category: ${entry.category}`]
      .filter(Boolean)
      .join("\n")
  );

  const finalPrompt = [
    prompt.promptText.trim(),
    referenceContext.length ? "\nReference Library Context:" : undefined,
    ...referenceContext,
    "",
    "Target Job Description:",
    `Company: ${job.companyName}`,
    `Job Title: ${job.jobTitle}`,
    job.location ? `Location: ${job.location}` : undefined,
    job.jobType ? `Job Type: ${job.jobType}` : undefined,
    "",
    job.jobDescription.trim()
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");

  return {
    promptTemplateId: prompt.id,
    promptTemplateVersion: prompt.version,
    jobId: job.id,
    referenceEntryIds: referenceEntries.map((entry) => entry.id),
    finalPrompt
  };
}
