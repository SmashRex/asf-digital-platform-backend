import { z } from "zod";
import { appConfig } from "../../config/app.config.js";

export const STUDENT_STATUSES = ["Active", "Withdrawn", "Graduated", "Not Completed"] as const;

// status stays a plain string so the service returns INVALID_STATUS_FILTER for a bad value.
export const listStudentsQuerySchema = z.object({
  classId: z.string().uuid().optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).default(appConfig.pagination.defaultPageSize),
});
export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;

export const exportStudentsQuerySchema = listStudentsQuerySchema.pick({ classId: true, status: true, search: true });
export type ExportStudentsQuery = z.infer<typeof exportStudentsQuerySchema>;