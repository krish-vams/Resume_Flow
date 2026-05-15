import { FocusType } from "@prisma/client";
import { z } from "zod";

export const createFocusTemplateSchema = z.object({
  name: z.string().trim().min(1, "Template name is required"),
  focusType: z.nativeEnum(FocusType),
  description: z.string().trim().optional(),
  primaryLanguage: z.string().trim().optional(),
  targetRolesJson: z.array(z.string().trim().min(1)).optional(),
  baseResumeText: z.string().trim().optional(),
  baseResumeFileUrl: z.string().trim().optional(),
  defaultSkillsJson: z.array(z.string().trim().min(1)).optional()
});

export const updateFocusTemplateSchema = createFocusTemplateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one focus template field is required"
);
