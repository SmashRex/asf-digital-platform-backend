import { z } from "zod";
import { appConfig } from "../../config/app.config.js";

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

// status stays a plain string here so the service keeps returning INVALID_STATUS_FILTER for a bad value.
export const listAdmissionsQuerySchema = z.object({
  status: z.string().trim().optional(),
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).default(appConfig.pagination.defaultPageSize),
});
export type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;