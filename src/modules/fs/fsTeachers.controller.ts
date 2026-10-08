import type { Request, Response, NextFunction } from "express";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { listEligibleTeachersQuerySchema } from "./fsTeachers.validation.js";
import * as service from "./fsTeachers.service.js";

export async function listEligible(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listEligibleTeachersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const { rows, total } = await service.getEligibleTeachers(parsed.data);
    return sendSuccess(res, rows, "Eligible teachers retrieved successfully", {
      total,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAssigned(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await service.getAssignedTeachers());
  } catch (err) {
    next(err);
  }
}