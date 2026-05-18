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

type FormatterResponse = {
  status: "success" | "error";
  fileName?: string;
  formattedDocxPath?: string;
  errors?: string[];
};

type PdfExportResponse = {
  status: "success" | "error";
  fileName?: string;
  formattedPdfPath?: string;
  errors?: string[];
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
      jobTitle: true,
      jobDescription: true,
      status: true,
      jobUrl: true,
      location: true
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
      description: true,
      promptText: true,
      targetRole: true,
      version: true
    }
  },
  focusTemplate: {
    select: {
      id: true,
      name: true,
      focusType: true,
      description: true,
      primaryLanguage: true
    }
  },
  validation: {
    select: {
      id: true,
      resumeVersionId: true,
      summaryWordCount: true,
      accentureBulletCount: true,
      dreamsBulletCount: true,
      capitalBulletCount: true,
      invalidBulletsJson: true,
      missingRequiredSkillsJson: true,
      missingPreferredSkillsJson: true,
      languageRuleViolationsJson: true,
      aiToolViolationsJson: true,
      boldMarkerViolationsJson: true,
      overallStatus: true,
      overallScore: true,
      checksJson: true,
      createdAt: true
    }
  },
  matchAnalysis: {
    select: {
      id: true,
      resumeVersionId: true,
      matchScore: true,
      matchedSkillsJson: true,
      matchedRequiredSkillsJson: true,
      missingRequiredSkillsJson: true,
      matchedPreferredSkillsJson: true,
      missingPreferredSkillsJson: true,
      primaryLanguageAlignmentJson: true,
      cloudDevopsCoverageJson: true,
      databaseCoverageJson: true,
      frameworkCoverageJson: true,
      referenceKeywordCoverageJson: true,
      suggestionsJson: true,
      createdAt: true,
      updatedAt: true
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

export function resolveStorageKey(storageKey: string) {
  const storageRoot = path.resolve(env.LOCAL_STORAGE_PATH);
  const absolutePath = path.resolve(storageRoot, storageKey);

  if (!absolutePath.startsWith(`${storageRoot}${path.sep}`)) {
    throw new HttpError(400, "Stored resume path is invalid");
  }

  return absolutePath;
}

async function getCandidateProfileForFormatting(userId: string, candidateProfileId?: string | null) {
  const profile = candidateProfileId
    ? await prisma.candidateProfile.findFirst({
        where: {
          id: candidateProfileId,
          userId
        }
      })
    : await prisma.candidateProfile.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" }
      });

  if (!profile) {
    throw new HttpError(400, "Candidate profile is required before formatting");
  }

  return profile;
}

async function updateFormattingFailure(resumeId: string, message: string) {
  await prisma.resumeVersion.update({
    where: { id: resumeId },
    data: {
      status: `Formatting Failed: ${message}`.slice(0, 180)
    }
  });
}

async function updatePdfExportFailure(resumeId: string, message: string) {
  await prisma.resumeVersion.update({
    where: { id: resumeId },
    data: {
      status: `PDF Export Failed: ${message}`.slice(0, 180)
    }
  });
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

  return prisma.$transaction(async (transaction) => {
    const latestResume = await transaction.resumeVersion.findFirst({
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

    const resume = await transaction.resumeVersion.create({
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

    await transaction.job.update({
      where: { id: input.jobId },
      data: { status: JobStatus.RESUME_GENERATED }
    });

    return resume;
  });
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

export async function formatResumeVersion(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  if (!resume.rawResumeFileUrl) {
    throw new HttpError(400, "Raw resume file is required before formatting");
  }

  const rawResumePath = resolveStorageKey(resume.rawResumeFileUrl);
  const candidateProfile = await getCandidateProfileForFormatting(userId, resume.candidateProfileId);
  let rawResumeBuffer: Buffer;

  try {
    rawResumeBuffer = await fs.readFile(rawResumePath);
  } catch {
    const message = "Raw resume file not found";
    await updateFormattingFailure(resume.id, message);
    throw new HttpError(404, message);
  }

  const rawResumeBytes = new Uint8Array(rawResumeBuffer.length);
  rawResumeBytes.set(rawResumeBuffer);
  const formData = new FormData();
  formData.set(
    "raw_resume_file",
    new Blob([rawResumeBytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }),
    `${resume.resumeName}-v${resume.version}.docx`
  );
  formData.set("candidate_profile_json", JSON.stringify(candidateProfile));
  formData.set("output_name", `${resume.resumeName}-formatted-v${resume.version}`);

  let formatterPayload: FormatterResponse;

  try {
    const formatterResponse = await fetch(`${env.FORMATTER_SERVICE_URL}/format-resume`, {
      method: "POST",
      body: formData
    });

    if (!formatterResponse.ok) {
      throw new Error(formatterResponse.statusText || "Formatter service failed");
    }

    formatterPayload = (await formatterResponse.json()) as FormatterResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Formatter service unavailable";
    await updateFormattingFailure(resume.id, message);
    throw new HttpError(502, message);
  }

  if (formatterPayload.status !== "success" || !formatterPayload.fileName) {
    const message = formatterPayload.errors?.join(", ") || "Formatter service returned an error";
    await updateFormattingFailure(resume.id, message);
    throw new HttpError(422, message, formatterPayload.errors);
  }

  try {
    const formattedResponse = await fetch(
      `${env.FORMATTER_SERVICE_URL}/outputs/${encodeURIComponent(formatterPayload.fileName)}`
    );

    if (!formattedResponse.ok) {
      throw new Error("Unable to download formatted DOCX from formatter service");
    }

    const formattedBuffer = Buffer.from(await formattedResponse.arrayBuffer());
    const formattedUploadPath = path.resolve(env.LOCAL_STORAGE_PATH, "formatted-resumes", userId);
    await fs.mkdir(formattedUploadPath, { recursive: true });
    const formattedFileName = `${Date.now()}-${formatterPayload.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const formattedPath = path.join(formattedUploadPath, formattedFileName);
    await fs.writeFile(formattedPath, formattedBuffer);

    return prisma.resumeVersion.update({
      where: { id: resume.id },
      data: {
        formattedDocxUrl: toStorageKey(formattedPath),
        status: "Formatted"
      },
      select: resumeSelect
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store formatted DOCX";
    await updateFormattingFailure(resume.id, message);
    throw new HttpError(502, message);
  }
}

export async function getFormattedResumeDownload(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  if (!resume.formattedDocxUrl) {
    throw new HttpError(404, "Formatted resume file not found");
  }

  return {
    absolutePath: resolveStorageKey(resume.formattedDocxUrl),
    filename: `${resume.resumeName.replace(/[^a-zA-Z0-9._-]/g, "-")}-formatted-v${resume.version}.docx`
  };
}

export async function exportResumePdf(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  if (!resume.formattedDocxUrl) {
    throw new HttpError(400, "Formatted DOCX is required before PDF export");
  }

  let formattedDocxBuffer: Buffer;

  try {
    formattedDocxBuffer = await fs.readFile(resolveStorageKey(resume.formattedDocxUrl));
  } catch {
    const message = "Formatted DOCX file not found";
    await updatePdfExportFailure(resume.id, message);
    throw new HttpError(404, message);
  }

  const formattedDocxBytes = new Uint8Array(formattedDocxBuffer.length);
  formattedDocxBytes.set(formattedDocxBuffer);
  const formData = new FormData();
  const outputName = `${resume.resumeName}-formatted-v${resume.version}`;
  formData.set(
    "formatted_docx_file",
    new Blob([formattedDocxBytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }),
    `${outputName}.docx`
  );
  formData.set("output_name", outputName);

  let exportPayload: PdfExportResponse;

  try {
    const exportResponse = await fetch(`${env.FORMATTER_SERVICE_URL}/export-pdf`, {
      method: "POST",
      body: formData
    });

    if (!exportResponse.ok) {
      throw new Error(exportResponse.statusText || "Formatter service failed");
    }

    exportPayload = (await exportResponse.json()) as PdfExportResponse;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Formatter service unavailable";
    await updatePdfExportFailure(resume.id, message);
    throw new HttpError(502, message);
  }

  if (exportPayload.status !== "success" || !exportPayload.fileName) {
    const message = exportPayload.errors?.join(", ") || "Formatter service returned a PDF export error";
    await updatePdfExportFailure(resume.id, message);
    throw new HttpError(422, message, exportPayload.errors);
  }

  try {
    const pdfResponse = await fetch(`${env.FORMATTER_SERVICE_URL}/outputs/${encodeURIComponent(exportPayload.fileName)}`);

    if (!pdfResponse.ok) {
      throw new Error("Unable to download PDF from formatter service");
    }

    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const pdfUploadPath = path.resolve(env.LOCAL_STORAGE_PATH, "formatted-pdfs", userId);
    await fs.mkdir(pdfUploadPath, { recursive: true });
    const pdfFileName = `${Date.now()}-${exportPayload.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const pdfPath = path.join(pdfUploadPath, pdfFileName);
    await fs.writeFile(pdfPath, pdfBuffer);

    return prisma.resumeVersion.update({
      where: { id: resume.id },
      data: {
        formattedPdfUrl: toStorageKey(pdfPath),
        status: "PDF Exported"
      },
      select: resumeSelect
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store PDF";
    await updatePdfExportFailure(resume.id, message);
    throw new HttpError(502, message);
  }
}

export async function getPdfResumeDownload(userId: string, resumeId: string) {
  const resume = await getResume(userId, resumeId);

  if (!resume.formattedPdfUrl) {
    throw new HttpError(404, "Formatted PDF file not found");
  }

  return {
    absolutePath: resolveStorageKey(resume.formattedPdfUrl),
    filename: `${resume.resumeName.replace(/[^a-zA-Z0-9._-]/g, "-")}-formatted-v${resume.version}.pdf`
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

  if (resume.formattedDocxUrl) {
    await fs.unlink(resolveStorageKey(resume.formattedDocxUrl)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }

  if (resume.formattedPdfUrl) {
    await fs.unlink(resolveStorageKey(resume.formattedPdfUrl)).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") {
        throw error;
      }
    });
  }
}
