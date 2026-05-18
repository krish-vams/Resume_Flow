import { z } from "zod";

export const listNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  upcomingOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().positive().max(100).default(20)
});
