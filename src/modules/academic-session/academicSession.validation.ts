import { z } from "zod";

export const createSessionSchema = z.object({
  id: z.string().regex(/^\d{4}\/\d{4}$/, "Session ID must be in the format YYYY/YYYY"),
  name: z.string().trim().min(2).max(100),
  startDate: z.string().date(),
  endDate: z.string().date(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;