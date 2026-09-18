import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(255),
  location: z.string().trim().min(1, "Location is required").max(255),
  startTime: z.string().datetime("Invalid start time"),
  category: z.enum(["Bible Study", "Prayer", "Worship", "Outreach", "Fellowship", "Special Program", "Administrative"]).optional(),
  description: z.string().trim().max(2000).optional(),
  endTime: z.string().datetime("Invalid end time").optional(),
  speaker: z.string().trim().max(255).optional(),
  speakerRole: z.string().trim().max(255).optional(),
  mode: z.enum(["In-Person", "Online / Zoom", "Hybrid"]).optional(),
  theme: z.string().trim().max(255).optional(),
  imageUrl: z.string().trim().max(2000).optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = createEventSchema.partial();
export type UpdateEventInput = z.infer<typeof updateEventSchema>;