import type { Request, Response, NextFunction } from "express";
import { academicLevelOverrideSchema } from "./members.validation.js";
import { overrideAcademicLevel } from "./members.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function overrideLevel(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = academicLevelOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid override data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const updatedUser = await overrideAcademicLevel(req.params.id, parsed.data, req.user!.id);

    return sendSuccess(res, updatedUser, "Academic level overridden successfully");
  } catch (err) {
    next(err);
  }
}