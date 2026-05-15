import fs from "fs/promises";
import type { Request, Response } from "express";
import {
  listReferenceEntries,
  listReferenceFiles,
  parseReferenceFile,
  searchReferenceEntries,
  uploadReferenceFile
} from "../services/reference-library.service";
import {
  listReferenceEntriesSchema,
  searchReferenceEntriesSchema,
  uploadReferenceFileSchema
} from "../validators/reference.validators";
import { HttpError } from "../utils/http-error";

function getReferenceFileId(request: Request) {
  const id = request.params.id;

  if (typeof id !== "string") {
    throw new HttpError(400, "Reference file id is required");
  }

  return id;
}

export async function uploadReferenceFileRecord(request: Request, response: Response) {
  if (!request.file) {
    throw new HttpError(400, "Reference XLSX file is required");
  }

  try {
    const input = uploadReferenceFileSchema.parse(request.body);
    const referenceFile = await uploadReferenceFile(request.user!.id, {
      category: input.category,
      filePath: request.file.path,
      fileName: request.file.originalname,
      fileType: request.file.mimetype
    });

    response.status(201).json({ referenceFile });
  } catch (error) {
    await fs.unlink(request.file.path).catch((unlinkError: NodeJS.ErrnoException) => {
      if (unlinkError.code !== "ENOENT") {
        throw unlinkError;
      }
    });
    throw error;
  }
}

export async function listReferenceFileRecords(request: Request, response: Response) {
  const referenceFiles = await listReferenceFiles(request.user!.id);

  response.json({ referenceFiles });
}

export async function parseReferenceFileRecord(request: Request, response: Response) {
  const result = await parseReferenceFile(request.user!.id, getReferenceFileId(request));

  response.json(result);
}

export async function listReferenceEntryRecords(request: Request, response: Response) {
  const input = listReferenceEntriesSchema.parse(request.query);
  const referenceEntries = await listReferenceEntries(request.user!.id, input);

  response.json({ referenceEntries });
}

export async function searchReferenceEntryRecords(request: Request, response: Response) {
  const input = searchReferenceEntriesSchema.parse(request.query);
  const referenceEntries = await searchReferenceEntries(request.user!.id, input);

  response.json({ referenceEntries });
}
