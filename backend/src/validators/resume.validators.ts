import { z } from "zod";

export const uploadRawResumeSchema = z.object({
  jobId: z.string().trim().min(1, "Job is required"),
  candidateProfileId: z.string().trim().optional(),
  promptTemplateId: z.string().trim().optional(),
  focusTemplateId: z.string().trim().optional(),
  resumeName: z.string().trim().min(1, "Resume name is required"),
  rawResumeText: z.string().trim().optional()
});
