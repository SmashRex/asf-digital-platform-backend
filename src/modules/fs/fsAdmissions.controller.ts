import type { Request, Response, NextFunction } from "express";
import * as service from "./fsAdmissions.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { applyForFsSchema, reviewAdmissionSchema } from "./fsAdmissions.validation.js";

export async function apply(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = applyForFsSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid application data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const admission = await service.applyForFs(req.user!.id, parsed.data.testimony);
    return sendSuccess(res, admission, "Application submitted", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as string | undefined;
    const admissions = await service.getAdmissions(status);
    return sendSuccess(res, admissions);
  } catch (err) {
    next(err);
  }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = reviewAdmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid review data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const admission = await service.reviewAdmission(req.params.id as string, req.user!.id, parsed.data);
    return sendSuccess(res, admission, "Admission reviewed");
  } catch (err) {
    next(err);
  }
}