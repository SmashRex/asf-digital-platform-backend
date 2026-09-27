import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import * as service from "./handover.service.js";

export async function submit(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body?.csv || typeof req.body.csv !== "string") {
      throw AppError.badRequest("A CSV string is required in the request body", "CSV_CONTENT_REQUIRED");
    }
    const result = await service.submit(req.body.csv, req.user!.id);
    if (result.validationErrors.length > 0) return sendSuccess(res, result, "Handover draft requires correction", undefined, 422);
    return sendSuccess(res, result, "Handover submitted for review", undefined, 201);
  } catch (error) { next(error); }
}

export async function get(req: Request, res: Response, next: NextFunction) { try { const row = await service.getById(req.params.id as string); if (!row) throw AppError.notFound("Handover not found", "HANDOVER_NOT_FOUND"); return sendSuccess(res, row); } catch (error) { next(error); } }
export async function approve(req: Request, res: Response, next: NextFunction) { try { return sendSuccess(res, await service.approve(req.params.id as string, req.user!.id), "Handover approved"); } catch (error) { next(error); } }
export async function publish(req: Request, res: Response, next: NextFunction) { try { return sendSuccess(res, await service.publish(req.params.id as string, req.user!.id), "Handover published"); } catch (error) { next(error); } }