import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { finalizeClassSchema } from "./fsFinalize.validation.js";
import * as service from "./fsFinalize.service.js";

const uuidParamSchema = z.string().uuid();

export async function finalize(req: Request, res: Response, next: NextFunction) {
  try {
    const idParsed = uuidParamSchema.safeParse(req.params.id);
    if (!idParsed.success) {
      throw AppError.badRequest("Invalid class id format", "INVALID_ID_FORMAT");
    }

    const parsed = finalizeClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid finalize data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const graduates = parsed.data.graduates.map((g) => ({ ...g, studentId: g.studentId.toLowerCase() }));
    const ids = graduates.map((g) => g.studentId);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length > 0) {
      throw AppError.badRequest("The same student appears more than once", "DUPLICATE_STUDENT", duplicates);
    }

    const result = await service.finalizeClass(
      idParsed.data,
      { graduates, confirmNoGraduates: parsed.data.confirmNoGraduates },
      req.user!.id
    );
    return sendSuccess(res, result, "Class finalized");
  } catch (err) {
    next(err);
  }
}