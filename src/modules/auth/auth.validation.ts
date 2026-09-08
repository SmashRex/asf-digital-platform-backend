import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  name: z.string().trim().min(2, "Name is too short").max(255),
  department: z.string().trim().min(2, "Department is required").max(255),
  academicLevel: z.enum([
    "100 Level",
    "200 Level",
    "300 Level",
    "400 Level",
    "500 Level",
    "Postgraduate",
    "Alumni",
  ]),
  phoneNumber: z.string().trim().max(50).optional(),
  subgroup: z.string().trim().max(100).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyTokenSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type VerifyTokenInput = z.infer<typeof verifyTokenSchema>;