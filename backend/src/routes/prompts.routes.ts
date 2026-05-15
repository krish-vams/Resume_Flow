import { Router } from "express";
import {
  assemblePromptRecord,
  createPromptRecord,
  duplicatePromptRecord,
  getPromptRecord,
  listPromptRecords,
  removePromptRecord,
  updatePromptRecord
} from "../controllers/prompts.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

export const promptsRouter = Router();

promptsRouter.use(requireAuth);
promptsRouter.post("/", asyncHandler(createPromptRecord));
promptsRouter.get("/", asyncHandler(listPromptRecords));
promptsRouter.post("/:id/assemble", asyncHandler(assemblePromptRecord));
promptsRouter.post("/:id/duplicate", asyncHandler(duplicatePromptRecord));
promptsRouter.get("/:id", asyncHandler(getPromptRecord));
promptsRouter.put("/:id", asyncHandler(updatePromptRecord));
promptsRouter.delete("/:id", asyncHandler(removePromptRecord));
