import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(255),
  message: z.string().trim().min(2, "Message is too short").max(2000),
  priority: z.enum(["Normal", "Urgent"]).default("Normal"),
  expiresAt: z.string().datetime("Invalid expiry date").optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;