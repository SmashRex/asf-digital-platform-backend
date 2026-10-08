import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { createClassSchema, updateClassSchema, teacherActionSchema, listClassesQuerySchema } from "./fsClasses.validation.js";
import * as service from "./fsClasses.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

const uuidParamSchema = z.string().uuid();

function parseIdParam(id: unknown) {
  const parsed = uuidParamSchema.safeParse(id);
  if (!parsed.success) {
    throw AppError.badRequest("Invalid class id format", "INVALID_ID_FORMAT");
  }
  return parsed.data;
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid class data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const fsClass = await service.createClass(parsed.data, req.user!.id);
    return sendSuccess(res, fsClass, "Class created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listClassesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    return sendSuccess(res, await service.getClasses(parsed.data));
  } catch (err) {
    next(err);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await service.getClassDetail(parseIdParam(req.params.id)));
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = updateClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid class data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const fsClass = await service.updateClass(id, parsed.data);
    return sendSuccess(res, fsClass, "Class updated");
  } catch (err) {
    next(err);
  }
}

export async function manageTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = teacherActionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid teacher action data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const result = await service.manageTeacher(id, parsed.data);
    return sendSuccess(res, result, "Teacher mapping updated", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function rosterExport(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const csv = await service.getRosterExport(id);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment;filename="fs-roster-${id}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}