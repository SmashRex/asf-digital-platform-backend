import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().trim().min(2, "Title is too short").max(255),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(255).optional(),
  startTime: z.string().datetime("Invalid start time"),
  endTime: z.string().datetime("Invalid end time").optional(),
});
export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateEventSchema = z.object({
  title: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(255).optional(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventSchema>;