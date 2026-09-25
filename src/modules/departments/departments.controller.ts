import type { Request, Response, NextFunction } from "express";
import { createDepartmentSchema } from "./departments.validation.js";
import * as service from "./departments.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const departments = await service.getDepartments();
    res.set("Cache-Control", "public, max-age=3600");
    return sendSuccess(res, departments);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid department data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const department = await service.createDepartment(parsed.data);
    return sendSuccess(res, department, "Department created", undefined, 201);
  } catch (err) {
    next(err);
  }
}