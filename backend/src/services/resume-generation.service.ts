import fs from "fs/promises";
import path from "path";
import type { ValidationStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { writeTextDocx } from "../utils/docx";
import { HttpError } from "../utils/http-error";
import { generateGeminiText } from "./gemini.service";
import { formatResumeVersion, getResume, uploadRawResume } from "./resume.service";
import { validateResumeVersion } from "./resume-validation.service";

type GenerateResumeInput = {
  jobId: string;
  candidateProfileId: string;
  promptTemplateId: string;
  focusTemplateId?: string;
  formatOnWarning: boolean;
};

function getJsonList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return entry;
      }

      if (entry && typeof entry === "object") {
        return Object.values(entry).find((item): item is string => typeof item === "string") ?? "";
      }

      return "";
    })
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function formatJsonList(value: unknown) {
  const entries = getJsonList(value);
  return entries.length > 0 ? entries.join(", ") : "None provided";
}

function hasBlockedEligibility(value: unknown) {
  return Boolean(value && typeof value === "object" && "severity" in value && value.severity === "blocked");
}

function cleanGeminiResumeText(value: string) {
  return value
    .replace(/^```(?:text|markdown|md)?\s*/i, "")
    .replace(/```$/i, "")
    .trim();
}

function safeFilePart(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 80) || "generated-resume";
}

async function getGenerationContext(userId: string, input: GenerateResumeInput) {
  const [job, candidateProfile, promptTemplate, focusTemplate] = await Promise.all([
    prisma.job.findFirst({
      where: { id: input.jobId, userId }
    }),
    prisma.candidateProfile.findFirst({
      where: { id: input.candidateProfileId, userId }
    }),
    prisma.promptTemplate.findFirst({
      where: { id: input.promptTemplateId, userId }
    }),
    input.focusTemplateId
      ? prisma.resumeFocusTemplate.findFirst({
          where: { id: input.focusTemplateId, userId }
        })
      : Promise.resolve(null)
  ]);

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (!candidateProfile) {
    throw new HttpError(404, "Candidate profile not found");
  }

  if (!promptTemplate) {
    throw new HttpError(404, "Prompt template not found");
  }

  if (input.focusTemplateId && !focusTemplate) {
    throw new HttpError(404, "Focus template not found");
  }

  if (hasBlockedEligibility(job.eligibilityFlagsJson)) {
    throw new HttpError(400, "Resume generation is blocked by eligibility analysis");
  }

  return { job, candidateProfile, promptTemplate, focusTemplate };
}

function buildGenerationPrompt(context: Awaited<ReturnType<typeof getGenerationContext>>) {
  const { job, candidateProfile, promptTemplate, focusTemplate } = context;

  return [
    promptTemplate.promptText.trim(),
    "",
    "Generate the raw resume content now. Return only the resume content, not commentary, JSON, or markdown fences.",
    "The raw resume must include these exact section headings on their own lines:",
    "Professional Summary",
    "Experience",
    "Skills",
    "",
    "Candidate Profile:",
    `Full Name: ${candidateProfile.fullName}`,
    `Email: ${candidateProfile.email}`,
    candidateProfile.phone ? `Phone: ${candidateProfile.phone}` : undefined,
    candidateProfile.location ? `Location: ${candidateProfile.location}` : undefined,
    candidateProfile.linkedinUrl ? `LinkedIn: ${candidateProfile.linkedinUrl}` : undefined,
    candidateProfile.githubUrl ? `GitHub: ${candidateProfile.githubUrl}` : undefined,
    `Education: ${formatJsonList(candidateProfile.educationJson)}`,
    `Certifications: ${formatJsonList(candidateProfile.certificationsJson)}`,
    "",
    focusTemplate
      ? [
          "Resume Focus Template:",
          `Name: ${focusTemplate.name}`,
          `Focus Type: ${focusTemplate.focusType}`,
          focusTemplate.primaryLanguage ? `Primary Language: ${focusTemplate.primaryLanguage}` : undefined,
          focusTemplate.description ? `Description: ${focusTemplate.description}` : undefined,
          focusTemplate.baseResumeText ? `Base Resume Text:\n${focusTemplate.baseResumeText}` : undefined,
          `Default Skills: ${formatJsonList(focusTemplate.defaultSkillsJson)}`
        ]
          .filter((line): line is string => line !== undefined)
          .join("\n")
      : "Resume Focus Template: None selected",
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
}

export async function generateResume(userId: string, input: GenerateResumeInput) {
  const context = await getGenerationContext(userId, input);
  const prompt = buildGenerationPrompt(context);
  const generatedText = cleanGeminiResumeText(await generateGeminiText(prompt));
  const rawResumePath = path.resolve(env.LOCAL_STORAGE_PATH, "raw-resumes", userId);
  await fs.mkdir(rawResumePath, { recursive: true });
  const generatedFilePath = path.join(
    rawResumePath,
    `${Date.now()}-${safeFilePart(context.job.companyName)}-${safeFilePart(context.job.jobTitle)}.docx`
  );
  let resumeCreated = false;

  try {
    await writeTextDocx(generatedFilePath, generatedText);
    const createdResume = await uploadRawResume(userId, {
      jobId: input.jobId,
      candidateProfileId: input.candidateProfileId,
      promptTemplateId: input.promptTemplateId,
      focusTemplateId: input.focusTemplateId,
      resumeName: `${context.job.companyName} ${context.job.jobTitle}`,
      rawResumeText: generatedText,
      rawResumeFilePath: generatedFilePath
    });
    resumeCreated = true;
    await prisma.resumeVersion.update({
      where: { id: createdResume.id },
      data: { status: "Generated" }
    });

    const validation = await validateResumeVersion(userId, createdResume.id);
    let resume = await getResume(userId, createdResume.id);
    let generationStatus = "generated";
    let formatError: string | undefined;
    const canFormat =
      validation.overallStatus === ("PASSED" satisfies ValidationStatus) ||
      (validation.overallStatus === ("WARNING" satisfies ValidationStatus) && input.formatOnWarning);

    if (canFormat) {
      try {
        resume = await formatResumeVersion(userId, createdResume.id);
        generationStatus = "formatted";
      } catch (error) {
        generationStatus = "formatting_failed";
        formatError = error instanceof Error ? error.message : "Formatter failed";
        resume = await getResume(userId, createdResume.id);
      }
    } else if (validation.overallStatus === "WARNING") {
      await prisma.resumeVersion.update({
        where: { id: createdResume.id },
        data: { status: "Generated - Validation Warning" }
      });
      resume = await getResume(userId, createdResume.id);
      generationStatus = "validation_warning";
    } else {
      generationStatus = "validation_failed";
      resume = await getResume(userId, createdResume.id);
    }

    return {
      resume,
      validation,
      status: generationStatus,
      validationStatus: validation.overallStatus.toLowerCase(),
      formattedDocxUrl: resume.formattedDocxUrl,
      formatError
    };
  } catch (error) {
    if (!resumeCreated) {
      await fs.unlink(generatedFilePath).catch((unlinkError: NodeJS.ErrnoException) => {
        if (unlinkError.code !== "ENOENT") {
          console.error("Unable to remove failed generated resume file", unlinkError);
        }
      });
    }

    throw error;
  }
}
