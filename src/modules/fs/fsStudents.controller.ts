import type { Request, Response, NextFunction } from "express";
import * as service from "./fsStudents.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { AppError } from "../../errors/appError.js";
import { z } from "zod";
import { canonicalSubgroups } from "../../config/subgroups.config.js";

const upload = multer({ storage: multer.memoryStorage() });
export const uploadMiddleware = upload.single("file");


export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const classId = req.query.classId as string | undefined;
    const students = await service.getStudents(classId);
    return sendSuccess(res, students);
  } catch (err) {
    next(err);
  }
}

export async function recordCompletion(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await service.recordCompletion(req.params.id as string, req.user!.id);
    return sendSuccess(res, student, "Completion recorded");
  } catch (err) {
    next(err);
  }
}

export async function withdraw(req: Request, res: Response, next: NextFunction) {
  try {
    const student = await service.withdrawStudent(req.params.id as string);
    return sendSuccess(res, student, "Student withdrawn");
  } catch (err) {
    next(err);
  }
}


export async function bulkGraduate(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw AppError.badRequest("No CSV file was uploaded", "NO_FILE");
    }
    const records = parse(req.file.buffer.toString("utf-8"), { columns: true, skip_empty_lines: true }) as unknown[];
    const rowSchema = z.object({ name: z.string().trim().min(1), academicLevel: z.string().trim().min(1), subgroup: z.enum(canonicalSubgroups) }).strict();
    const parsedRows = records.map((record, index) => {
      const parsed = rowSchema.safeParse(record);
      if (!parsed.success) throw AppError.badRequest(`Invalid graduation row ${index + 2}`, "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
      return parsed.data;
    });
    const results = await service.bulkGraduate(parsedRows, req.user!.id);
    return sendSuccess(res, results, "Bulk graduation processed");
  } catch (err) {
    next(err);
  }
}