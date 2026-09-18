import { z } from "zod";

export const createAnnouncementSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(255),
  message: z.string().trim().min(2, "Message is too short").max(2000),
  priority: z.enum(["Normal", "Urgent"]).default("Normal"),
  isUrgent: z.boolean().default(false),
  expiresAt: z.string().datetime("Invalid expiry date").optional(),
});
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;

export const editAnnouncementSchema = z.object({
  title: z.string().trim().min(2).max(255).optional(),
  message: z.string().trim().min(2).max(2000).optional(),
});
export type EditAnnouncementInput = z.infer<typeof editAnnouncementSchema>;

export const revisionRequestSchema = z.object({
  notes: z.string().trim().min(2, "Revision notes are required").max(1000),
});
export type RevisionRequestInput = z.infer<typeof revisionRequestSchema>;