import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import * as service from "./president.service.js";
import { analyticsQuerySchema, rosterQuerySchema } from "./president.validation.js";

export async function roster(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = rosterQuerySchema.safeParse(req.query);
    if (!parsed.success) throw AppError.badRequest("Invalid roster filters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const result = await service.getRoster(parsed.data);
    return sendSuccess(res, result.data, "President roster retrieved", { total: result.total, page: parsed.data.page, limit: parsed.data.limit });
  } catch (error) { next(error); }
}

export async function analytics(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) throw AppError.badRequest("Invalid analytics filters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    return sendSuccess(res, await service.getAnalytics(parsed.data), "President analytics retrieved");
  } catch (error) { next(error); }
}