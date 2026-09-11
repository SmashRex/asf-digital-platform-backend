import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  phoneNumber: z.string().trim().max(50).optional(),
  subgroup: z.string().trim().max(100).optional(),
  avatarUrl: z.string().url().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;