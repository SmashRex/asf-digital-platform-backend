import type { Request, Response, NextFunction } from "express";
import { createSessionSchema } from "./academicSession.validation.js";
import { createNewSession, activateAndProgress } from "./academicSession.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import * as repo from "./academicSession.repository.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const sessions = await repo.listSessions();
    return sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid session data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const session = await createNewSession(parsed.data);
    return sendSuccess(res, session, "Academic session created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function activateAndProgressHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await activateAndProgress(req.params.id as string);
    return sendSuccess(res, result, "Session activated and students progressed successfully");
  } catch (err) {
    next(err);
  }
}

export async function getActive(req: Request, res: Response, next: NextFunction) {
  try {
    const session = await repo.findActiveSession();
    if (!session) {
      throw AppError.notFound("No active academic session is configured", "NO_ACTIVE_SESSION");
    }
    return sendSuccess(res, session);
  } catch (err) {
    next(err);
  }
}