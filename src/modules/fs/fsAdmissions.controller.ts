import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as service from "./fsAdmissions.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { applyForFsSchema, reviewAdmissionSchema, listAdmissionsQuerySchema } from "./fsAdmissions.validation.js";

const uuidParamSchema = z.string().uuid();

function parseIdParam(id: unknown) {
  const parsed = uuidParamSchema.safeParse(id);
  if (!parsed.success) {
    throw AppError.badRequest("Invalid admission id format", "INVALID_ID_FORMAT");
  }
  return parsed.data;
}

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
    const parsed = listAdmissionsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const { rows, total } = await service.getAdmissions(parsed.data);
    return sendSuccess(res, rows, "Admissions retrieved successfully", {
      total,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
  } catch (err) {
    next(err);
  }
}

export async function review(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = reviewAdmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid review data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const admission = await service.reviewAdmission(id, req.user!.id, parsed.data);
    return sendSuccess(res, admission, "Admission reviewed");
  } catch (err) {
    next(err);
  }
}