import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(2, "Name is too short").max(255),
  department: z.string().trim().min(2, "Department is required").max(255),
  academicLevel: z.enum(["100 Level", "200 Level", "300 Level", "400 Level", "500 Level", "Postgraduate", "Alumni"]),
  programDurationYears: z.union([z.literal(4), z.literal(5)]).default(4),
  phoneNumber: z.string().trim().max(50).optional(),
  subgroup: z.string().trim().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;

export const magicLinkRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
});

export type MagicLinkRequestInput = z.infer<typeof magicLinkRequestSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;