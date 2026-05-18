import { Router } from "express";
import {
  createFocusTemplateRecord,
  getFocusTemplateRecord,
  listFocusTemplateRecords,
  removeFocusTemplateRecord,
  updateFocusTemplateRecord
} from "../controllers/focus-templates.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadRateLimit } from "../middleware/rate-limit.middleware";
import { uploadFocusTemplateFile } from "../middleware/upload.middleware";
import { asyncHandler } from "../utils/async-handler";

export const focusTemplatesRouter = Router();

focusTemplatesRouter.use(requireAuth);
focusTemplatesRouter.post("/", uploadRateLimit, uploadFocusTemplateFile.single("baseResumeFile"), asyncHandler(createFocusTemplateRecord));
focusTemplatesRouter.get("/", asyncHandler(listFocusTemplateRecords));
focusTemplatesRouter.get("/:id", asyncHandler(getFocusTemplateRecord));
focusTemplatesRouter.put("/:id", uploadRateLimit, uploadFocusTemplateFile.single("baseResumeFile"), asyncHandler(updateFocusTemplateRecord));
focusTemplatesRouter.delete("/:id", asyncHandler(removeFocusTemplateRecord));
