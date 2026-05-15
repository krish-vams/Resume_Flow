import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("URL must be valid")
  .optional()
  .or(z.literal("").transform(() => undefined));

const jsonArray = z.array(z.record(z.string(), z.unknown())).optional();

export const createCandidateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required"),
  email: z.string().trim().email("Profile email must be valid").toLowerCase(),
  phone: z.string().trim().optional(),
  location: z.string().trim().optional(),
  linkedinUrl: optionalUrl,
  githubUrl: optionalUrl,
  educationJson: jsonArray,
  certificationsJson: jsonArray,
  defaultResumeName: z.string().trim().optional()
});

export const updateCandidateProfileSchema = createCandidateProfileSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one profile field is required"
);
