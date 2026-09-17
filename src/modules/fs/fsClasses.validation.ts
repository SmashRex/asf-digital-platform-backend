import { z } from "zod";

export const createClassSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(255),
  description: z.string().trim().max(1000).optional(),
  academicSessionId: z.string().min(1, "academicSessionId is required"),
  semester: z.enum(["First", "Second"]),
  teacherCap: z.number().int().positive().optional(),
});
export type CreateClassInput = z.infer<typeof createClassSchema>;

export const updateClassSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  description: z.string().trim().max(1000).optional(),
  manualVisible: z.boolean().optional(),
  teacherCap: z.number().int().positive().optional(),
  status: z.enum(["Active", "Archived"]).optional(),
});
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

export const teacherActionSchema = z.object({
  action: z.enum(["assign", "remove"]),
  teacherId: z.string().uuid("Invalid teacher id"),
});
export type TeacherActionInput = z.infer<typeof teacherActionSchema>;