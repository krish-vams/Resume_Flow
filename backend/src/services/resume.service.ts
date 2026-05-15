import fs from "fs/promises";
import path from "path";
import { JobStatus } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { HttpError } from "../utils/http-error";

type UploadRawResumeInput = {
  jobId: string;
  candidateProfileId?: string;
  promptTemplateId?: string;
  focusTemplateId?: string;
  resumeName: string;
  rawResumeText?: string;
  rawResumeFilePath: string;
};

const resumeSelect = {
  id: true,
  userId: true,
  jobId: true,
  candidateProfileId: true,
  promptTemplateId: true,
  focusTemplateId: true,
  resumeName: true,
  rawResumeText: true,
  rawResumeFileUrl: true,
  formattedDocxUrl: true,
  formattedPdfUrl: true,
  version: true,
  matchScore: true,
  validationStatus: true,
  status: true,
  job: {
    select: {
      id: true,
      companyName: true,
      jobTitle: true
    }
  },
  candidateProfile: {
    select: {
      id: true,
      fullName: true,
      email: true
    }
  },
  promptTemplate: {
    select: {
      id: true,
      name: true,
      version: true
    }
  },
  focusTemplate: {
    select: {
      id: true,
      name: true,
      focusType: true
    }
  },
  createdAt: true,
  updatedAt: true
};

function toStorageKey(filePath: string) {
  const storageRoot = path.resolve(env.LOCAL_STORAGE_PATH);
  const absoluteFilePath = path.resolve(filePath);
  const relativePath = path.relative(storageRoot, absoluteFilePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new HttpError(400, "Uploaded file is outside the configured storage path");
  }

  return relativePath.split(path.sep).join("/");
}

function resolveStorageKey(storageKey: string) {
  const storageRoot = path.resolve(env.LOCAL_STORAGE_PATH);
  const absolutePath = path.resolve(storageRoot, storageKey);

  if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new HttpError(400, "Stored resume path is invalid");
  }

  return absolutePath;
}

async function assertUserOwnedReferences(userId: string, input: UploadRawResumeInput) {
  const job = await prisma.job.findFirst({
    where: {
      id: input.jobId,
      userId
    },
    select: { id: true }
  });

  if (!job) {
    throw new HttpError(404, "Job not found");
  }

  if (input.candidateProfileId) {
    const profile = await prisma.candidateProfile.findFirst({
      where: {
        id: input.candidateProfileId,
        userId
      },
      select: { id: true }
    });

    if (!profile) {
      throw new HttpError(404, "Candidate profile not found");
    }
  }

  if (input.promptTemplateId) {
    const prompt = await prisma.promptTemplate.findFirst({
      where: {
        id: input.promptTemplateId,
        userId
      },
      select: { id: true }
    });

    if (!prompt) {
      throw new HttpError(404, "Prompt template not found");
    }
  }

  if (input.focusTemplateId) {
    const focusTemplate = await prisma.resumeFocusTemplate.findFirst({
      where: {
        id: input.focusTemplateId,
        userId
      },
      select: { id: true }
    });

    if (!focusTemplate) {
      throw new HttpError(404, "Focus template not found");
    }
  }
}

export async function uploadRawResume(userId: string, input: UploadRawResumeInput) {
  await assertUserOwnedReferences(userId, input);

  const latestResume = await prisma.resumeVersion.findFirst({
    where: {
      jobId: input.jobId
    },
    orderBy: {
      version: "desc"
    },
    select: {
      version: true
    }
  });
  const version = (latestResume?.version ?? 0) + 1;

  const resume = await prisma.resumeVersion.create({
    data: {
      userId,
      jobId: input.jobId,
      candidateProfileId: input.candidateProfileId,
      promptTemplateId: input.promptTemplateId,
      focusTemplateId: input.focusTemplateId,
      resumeName: input.resumeName,
      rawResumeText: input.rawResumeText,
      rawResumeFileUrl: toStorageKey(input.rawResumeFilePath),
      version,
      status: "Raw Uploaded"
    },
    select: resumeSelect
  });

  await prisma.job.update({
    where: { id: input.jobId },
    data: { status: JobStatus.RESUME_GENERATED }
  });

  return resume;
}

export async function listResumes(userId: string, jobId?: string) {
  return prisma.resumeVersion.findMany({
    where: {
      userId,
      ...(jobId ? { jobId } : {})
    },
    select: resumeSelect,
    orderBy: {
      createdAt: "desc"
    }
  });
}

export async function getResume(userId: string, resumeId: string) {
  const resume = await prisma.resumeVersion.findFirst({
    where: {
      id: resumeId,
      userId
    },
    select: resumeSelect
  });

  if (!resume) {
    throw new HttpError(404, "Resume version not found");
  }

  return resume;
}

export async function getRawResumeDownload(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  if (!resume.rawResumeFileUrl) {
    throw new HttpError(404, "Raw resume file not found");
  }

  return {
    absolutePath: resolveStorageKey(resume.rawResumeFileUrl),
    filename: `${resume.resumeName.replace(/[^a-zA-Z0-9._-]/g, "-")}-v${resume.version}.docx`
  };
}

export async function deleteResume(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  await prisma.resumeVersion.delete({
    where: { id: resumeId }
  });

  if (resume.rawResumeFileUrl) {
    await fs.unlink(resolveStorageKey(resume.rawResumeFileUrl)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }
}
