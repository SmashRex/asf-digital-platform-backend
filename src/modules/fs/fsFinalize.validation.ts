import { z } from "zod";
import { canonicalSubgroups } from "../../config/subgroups.config.js";

export const finalizeClassSchema = z.object({
  graduates: z.array(
    z.object({
      studentId: z.string().uuid(),
      subgroup: z.enum(canonicalSubgroups),
    }).strict()
  ).max(500),
  confirmNoGraduates: z.boolean().optional().default(false),
}).strict();

export type FinalizeClassInput = z.infer<typeof finalizeClassSchema>;