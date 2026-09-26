import { z } from "zod";

export const handoverRowSchema = z.object({
  memberId: z.string().uuid(),
  officeId: z.string().trim().min(1).max(60),
}).strict();

export type HandoverRow = z.infer<typeof handoverRowSchema>;