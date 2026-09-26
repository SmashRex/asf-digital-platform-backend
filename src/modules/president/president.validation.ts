import { z } from "zod";
import { appConfig } from "../../config/app.config.js";
import { canonicalSubgroups } from "../../config/subgroups.config.js";

export const subgroupValues = canonicalSubgroups;

export const academicLevelValues = ["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Alumni"] as const;

const commonFilters = {
  academicLevel: z.enum(academicLevelValues).optional(),
  subgroup: z.enum(subgroupValues).optional(),
  office: z.string().trim().min(1).max(60).optional(),
};

export const rosterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).default(appConfig.pagination.defaultPageSize),
  search: z.string().trim().max(255).optional(),
  departmentId: z.string().trim().min(1).max(100).optional(),
  ...commonFilters,
});

export const analyticsQuerySchema = z.object({
  academicSession: z.string().trim().min(1).max(20).optional(),
  ...commonFilters,
});

export type RosterQuery = z.infer<typeof rosterQuerySchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;