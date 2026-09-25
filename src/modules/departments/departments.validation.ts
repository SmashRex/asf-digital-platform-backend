import { z } from "zod";

export const createDepartmentSchema = z.object({
  id: z.string().trim().min(2, "id is too short").max(100).regex(/^[a-z0-9-]+$/, "id must be lowercase letters, numbers, and hyphens only"),
  name: z.string().trim().min(2, "name is too short").max(255),
  school: z.string().trim().max(255).optional(),
});
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;