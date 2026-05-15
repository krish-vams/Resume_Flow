import { z } from "zod";

export const createPromptSchema = z.object({
  name: z.string().trim().min(1, "Prompt name is required"),
  description: z.string().trim().optional(),
  promptText: z.string().trim().min(1, "Prompt text is required"),
  targetRole: z.string().trim().optional(),
  candidateName: z.string().trim().optional(),
  version: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional()
});

export const updatePromptSchema = createPromptSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one prompt field is required"
);

export const assemblePromptSchema = z.object({
  jobId: z.string().trim().min(1, "Job is required"),
  referenceEntryIds: z.array(z.string().trim().min(1)).max(50).optional()
});
