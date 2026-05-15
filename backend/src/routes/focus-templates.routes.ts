import { Router } from "express";
import {
  createFocusTemplateRecord,
  getFocusTemplateRecord,
  listFocusTemplateRecords,
  removeFocusTemplateRecord,
  updateFocusTemplateRecord
} from "../controllers/focus-templates.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadFocusTemplateFile } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const focusTemplatesRouter = Router();

focusTemplatesRouter.use(requireAuth);
focusTemplatesRouter.post("/", uploadFocusTemplateFile.single("baseResumeFile"), asyncHandler(createFocusTemplateRecord));
focusTemplatesRouter.get("/", asyncHandler(listFocusTemplateRecords));
focusTemplatesRouter.get("/:id", asyncHandler(getFocusTemplateRecord));
focusTemplatesRouter.put("/:id", uploadFocusTemplateFile.single("baseResumeFile"), asyncHandler(updateFocusTemplateRecord));
focusTemplatesRouter.delete("/:id", asyncHandler(removeFocusTemplateRecord));
