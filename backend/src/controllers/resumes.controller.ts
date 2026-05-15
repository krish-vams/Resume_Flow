import fs from "fs/promises";
import type { Request, Response } from "express";
import {
  deleteResume,
  getRawResumeDownload,
  getResume,
  listResumes,
  uploadRawResume
} from "../services/resume.service";
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

export async function removeResumeRecord(request: Request, response: Response) {
  await deleteResume(request.user!.id, getResumeId(request));

  response.status(204).send();
}
