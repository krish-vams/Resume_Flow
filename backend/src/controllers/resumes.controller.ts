import fs from "fs/promises";
import type { Request, Response } from "express";
import {
  deleteResume,
  exportResumePdf,
  formatResumeVersion,
  getFormattedResumeDownload,
  getPdfResumeDownload,
  getRawResumeDownload,
  getResume,
  listResumes,
  uploadRawResume
} from "../services/resume.service";
import {
  getResumeValidation,
  validateResumeVersion
} from "../services/resume-validation.service";
import { analyzeResumeMatch } from "../services/resume-match.service";
import { uploadRawResumeSchema } from "../validators/resume.validators";
import { HttpError } from "../utils/http-error";

function getResumeId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Resume id is required");
  }

  return id;
}

export async function uploadRawResumeRecord(request: Request, response: Response) {
  if (!request.file) {
    throw new HttpError(400, "Raw resume DOCX file is required");
  }

  try {
    const input = uploadRawResumeSchema.parse(request.body);
    const resume = await uploadRawResume(request.user!.id, {
      ...input,
      candidateProfileId: input.candidateProfileId || undefined,
      promptTemplateId: input.promptTemplateId || undefined,
      focusTemplateId: input.focusTemplateId || undefined,
      rawResumeFilePath: request.file.path
    });

    response.status(201).json({ resume });
  } catch (error) {
    await fs.unlink(request.file.path).catch((unlinkError: NodeJS.ErrnoException) => {
      if (unlinkError.code !== "ENOENT") {
        throw unlinkError;
      }
    });
    throw error;
  }
}

export async function listResumeRecords(request: Request, response: Response) {
  const jobId = typeof request.query.jobId === "string" ? request.query.jobId : undefined;
  const resumes = await listResumes(request.user!.id, jobId);

  response.json({ resumes });
}

export async function getResumeRecord(request: Request, response: Response) {
  const resume = await getResume(request.user!.id, getResumeId(request));

  response.json({ resume });
}

export async function downloadRawResumeRecord(request: Request, response: Response) {
  const download = await getRawResumeDownload(request.user!.id, getResumeId(request));

  response.download(download.absolutePath, download.filename);
}

export async function formatResumeRecord(request: Request, response: Response) {
  const resumeId = getResumeId(request);
  const resume = await formatResumeVersion(request.user!.id, resumeId);

  response.json({
    resume,
    downloadUrl: `/api/resumes/${resumeId}/download-formatted`
  });
}

export async function downloadFormattedResumeRecord(request: Request, response: Response) {
  const download = await getFormattedResumeDownload(request.user!.id, getResumeId(request));

  response.download(download.absolutePath, download.filename);
}

export async function exportResumePdfRecord(request: Request, response: Response) {
  const resumeId = getResumeId(request);
  const resume = await exportResumePdf(request.user!.id, resumeId);

  response.json({
    resume,
    downloadUrl: `/api/resumes/${resumeId}/download-pdf`
  });
}

export async function downloadPdfResumeRecord(request: Request, response: Response) {
  const download = await getPdfResumeDownload(request.user!.id, getResumeId(request));

  response.download(download.absolutePath, download.filename);
}

export async function validateResumeRecord(request: Request, response: Response) {
  const resumeId = getResumeId(request);
  const validation = await validateResumeVersion(request.user!.id, resumeId);
  const resume = await getResume(request.user!.id, resumeId);

  response.json({ validation, resume });
}

export async function getResumeValidationRecord(request: Request, response: Response) {
  const validation = await getResumeValidation(request.user!.id, getResumeId(request));

  response.json({ validation });
}

export async function analyzeResumeMatchRecord(request: Request, response: Response) {
  const resumeId = getResumeId(request);
  const matchAnalysis = await analyzeResumeMatch(request.user!.id, resumeId);
  const resume = await getResume(request.user!.id, resumeId);

  response.json({ matchAnalysis, resume });
}

export async function removeResumeRecord(request: Request, response: Response) {
  await deleteResume(request.user!.id, getResumeId(request));

  response.status(204).send();
}
