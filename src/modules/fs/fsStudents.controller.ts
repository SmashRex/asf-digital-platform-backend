import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import * as service from "./fsStudents.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { listStudentsQuerySchema, exportStudentsQuerySchema } from "./fsStudents.validation.js";

const uuidParamSchema = z.string().uuid();

function parseIdParam(id: unknown) {
  const parsed = uuidParamSchema.safeParse(id);
  if (!parsed.success) {
    throw AppError.badRequest("Invalid student id format", "INVALID_ID_FORMAT");
  }
  return parsed.data;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listStudentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const { rows, total } = await service.getStudents(parsed.data);
    return sendSuccess(res, rows, "Students retrieved successfully", {
      total,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
  } catch (err) {
    next(err);
  }
}

export async function detail(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await service.getStudentDetail(parseIdParam(req.params.id));
    return sendSuccess(res, student);
  } catch (err) {
    next(err);
  }
}

export async function exportCsv(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = exportStudentsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const csv = await service.exportStudentsCsv(parsed.data);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="fs-students.csv"');
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await service.withdrawStudent(parseIdParam(req.params.id));
    return sendSuccess(res, student, "Student withdrawn");
  } catch (err) {
    next(err);
  }
}