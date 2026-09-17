import { z } from "zod";

export const applyForFsSchema = z.object({
  testimony: z.string().trim().min(1, "Testimony cannot be empty if provided").max(2000, "Testimony is too long").optional(),
});

export type ApplyForFsInput = z.infer<typeof applyForFsSchema>;

export const reviewAdmissionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  classId: z.string().uuid().optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type ReviewAdmissionInput = z.infer<typeof reviewAdmissionSchema>;