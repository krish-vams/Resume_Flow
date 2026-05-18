import { z } from "zod";

export const uploadRawResumeSchema = z.object({
  jobId: z.string().trim().min(1, "Job is required"),
  candidateProfileId: z.string().trim().optional(),
  promptTemplateId: z.string().trim().optional(),
  focusTemplateId: z.string().trim().optional(),
  resumeName: z.string().trim().min(1, "Resume name is required"),
  rawResumeText: z.string().trim().optional()
});

export const generateResumeSchema = z.object({
  jobId: z.string().trim().min(1, "Job is required"),
  candidateProfileId: z.string().trim().min(1, "Candidate profile is required"),
  promptTemplateId: z.string().trim().min(1, "Prompt template is required"),
  focusTemplateId: z.string().trim().optional(),
  formatOnWarning: z.boolean().default(true)
});
