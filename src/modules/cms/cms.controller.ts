import type { Request, Response, NextFunction } from "express";
import { saveDraftSchema } from "./cms.validation.js";
import * as service from "./cms.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

export async function getPublic(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await service.getPublished();
    res.set("Cache-Control", "public, max-age=300");
    return sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
}

export async function getDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await service.getDraft();
    return sendSuccess(res, config);
  } catch (err) {
    next(err);
  }
}

export async function saveDraft(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = saveDraftSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid website data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const config = await service.saveDraft(parsed.data, req.user!.id);
    return sendSuccess(res, config, "Draft saved successfully");
  } catch (err) {
    next(err);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await service.publish(req.user!.id);
    return sendSuccess(res, config, "Website published live");
  } catch (err) {
    next(err);
  }
}

export async function discard(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await service.discardDraft(req.user!.id);
    return sendSuccess(res, config, "Draft discarded");
  } catch (err) {
    next(err);
  }
}

export async function reset(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await service.factoryReset(req.user!.id);
    return sendSuccess(res, config, "Website reset to defaults");
  } catch (err) {
    next(err);
  }
}