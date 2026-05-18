import { z } from "zod";

export const gmailCallbackSchema = z.object({
  code: z.string().trim().min(1),
  state: z.string().trim().min(1)
});

export const scanGmailSchema = z.object({
  maxResults: z.coerce.number().int().positive().max(50).default(20)
});
