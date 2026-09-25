import type { Request, Response, NextFunction } from "express";
import { createClassSchema, updateClassSchema, teacherActionSchema } from "./fsClasses.validation.js";
import * as service from "./fsClasses.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

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
    const classes = await service.getClasses();
    return sendSuccess(res, classes);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateClassSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid class data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const fsClass = await service.updateClass(req.params.id as string, parsed.data);
    return sendSuccess(res, fsClass, "Class updated");
  } catch (err) {
    next(err);
  }
}

export async function manageTeacher(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = teacherActionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid teacher action data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const result = await service.manageTeacher(req.params.id as string, parsed.data);
    return sendSuccess(res, result, "Teacher mapping updated", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function rosterExport(req: Request, res: Response, next: NextFunction) {
  try {
    const csv = await service.getRosterExport(req.params.id as string);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="fs-roster-${req.params.id}.csv"`);
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}