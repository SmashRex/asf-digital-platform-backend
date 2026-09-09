import { z } from "zod";

export const academicLevelOverrideSchema = z.object({
  newLevel: z.enum(["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Alumni"]),
  overrideReason: z.string().trim().min(5, "A reason of at least 5 characters is required"),
});

export type AcademicLevelOverrideInput = z.infer<typeof academicLevelOverrideSchema>;