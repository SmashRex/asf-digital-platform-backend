import { z } from "zod";
import { canonicalSubgroups } from "../../config/subgroups.config.js";

const academicLevels = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Alumni"] as const;

export const handoverRowSchema = z.object({
  name: z.string().trim().min(1).max(255),
  academicLevel: z.enum(academicLevels),
  subgroup: z.string().trim()
    .transform((value) => canonicalSubgroups.find((subgroup) => subgroup.toLowerCase() === value.toLowerCase()) ?? value)
    .pipe(z.enum(canonicalSubgroups)),
  office: z.string().trim().min(1).max(255),
}).strict();

export type HandoverRow = z.infer<typeof handoverRowSchema>;

export type HandoverCandidate = Pick<HandoverRow, "name" | "academicLevel" | "subgroup"> & {
  department: string | null;
};

export type HandoverValidationRow = HandoverRow & {
  result: "VALID" | "AMBIGUOUS" | "NOT_FOUND" | "INACTIVE";
  candidates?: HandoverCandidate[];
};

export type HandoverStoredRow = HandoverRow & {
  memberId: string | null;
  officeId: string | null;
};

export type ResolvedHandoverRow = HandoverStoredRow & {
  memberId: string;
  officeId: string;
};