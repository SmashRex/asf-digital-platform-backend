import { z } from "zod";
import { appConfig } from "../../config/app.config.js";

export const listEligibleTeachersQuerySchema = z.object({
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).default(appConfig.pagination.defaultPageSize),
});
export type ListEligibleTeachersQuery = z.infer<typeof listEligibleTeachersQuerySchema>;