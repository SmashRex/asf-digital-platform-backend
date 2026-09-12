import { z } from "zod";
import { appConfig } from "../../config/app.config.js";

export const academicLevelOverrideSchema = z.object({
  newLevel: z.enum(["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Alumni"]),
  overrideReason: z.string().trim().min(5, "A reason of at least 5 characters is required"),
});

export type AcademicLevelOverrideInput = z.infer<typeof academicLevelOverrideSchema>;

export const listMembersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(appConfig.pagination.maxPageSize).default(appConfig.pagination.defaultPageSize),
  search: z.string().trim().max(255).optional(),
  academicLevel: z.string().trim().optional(),
});

export type ListMembersQuery = z.infer<typeof listMembersQuerySchema>;

export const updateRoleSchema = z.object({
  action: z.enum(["assign", "remove"]),
  roleId: z.string().trim().min(1, "roleId is required"),
});

export const updateStatusSchema = z.object({
  accountStatus: z.enum(["Active", "Suspended", "Deactivated"]),
  reason: z.string().trim().max(500).optional(),
});

export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});