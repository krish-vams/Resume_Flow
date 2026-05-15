import { JobStatus } from "@prisma/client";
import { z } from "zod";

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((value) => (value === "" ? null : value));

const optionalDateString = optionalString.refine((value) => !value || !Number.isNaN(Date.parse(value)), {
  message: "Date must be valid"
});

export const createApplicationSchema = z.object({
  jobId: z.string().trim().min(1, "Job is required"),
  resumeVersionId: optionalString,
  status: z.enum(JobStatus).default(JobStatus.SAVED),
  appliedDate: optionalDateString,
  followUpDate: optionalDateString,
  recruiterName: optionalString,
  recruiterEmail: optionalString.refine((value) => !value || z.email().safeParse(value).success, {
    message: "Recruiter email must be valid"
  }),
  interviewDate: optionalDateString,
  notes: optionalString
});

export const updateApplicationSchema = createApplicationSchema.partial();
