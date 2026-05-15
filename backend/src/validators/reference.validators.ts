import { ReferenceCategory } from "@prisma/client";
import { z } from "zod";

export const uploadReferenceFileSchema = z.object({
  category: z.enum(ReferenceCategory)
});

export const listReferenceEntriesSchema = z.object({
  category: z.enum(ReferenceCategory).optional(),
  referenceFileId: z.string().trim().optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});

export const searchReferenceEntriesSchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  category: z.enum(ReferenceCategory).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50)
});
