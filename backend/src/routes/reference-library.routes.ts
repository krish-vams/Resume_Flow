import { Router } from "express";
import {
  listReferenceEntryRecords,
  listReferenceFileRecords,
  parseReferenceFileRecord,
  searchReferenceEntryRecords,
  uploadReferenceFileRecord
} from "../controllers/reference-library.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadReferenceFile } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const referenceFilesRouter = Router();
export const referenceEntriesRouter = Router();

referenceFilesRouter.use(requireAuth);
referenceFilesRouter.post("/upload", uploadReferenceFile.single("referenceFile"), asyncHandler(uploadReferenceFileRecord));
referenceFilesRouter.get("/", asyncHandler(listReferenceFileRecords));
referenceFilesRouter.post("/:id/parse", asyncHandler(parseReferenceFileRecord));

referenceEntriesRouter.use(requireAuth);
referenceEntriesRouter.get("/", asyncHandler(listReferenceEntryRecords));
referenceEntriesRouter.get("/search", asyncHandler(searchReferenceEntryRecords));
