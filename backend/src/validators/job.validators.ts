import { JobStatus } from "@prisma/client";
import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Job URL must be valid")
  .optional()
  .or(z.literal("").transform(() => undefined));

export const createJobSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required"),
  jobTitle: z.string().trim().min(1, "Job title is required"),
  jobUrl: optionalUrl,
  location: z.string().trim().optional(),
  jobType: z.string().trim().optional(),
  jobDescription: z.string().trim().min(1, "Job description is required"),
  notes: z.string().trim().optional(),
  seniorityLevel: z.string().trim().optional(),
  recommendedFocusTemplateId: z.string().trim().nullable().optional(),
  status: z.nativeEnum(JobStatus).optional()
});

export const updateJobSchema = createJobSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one job field is required"
);
