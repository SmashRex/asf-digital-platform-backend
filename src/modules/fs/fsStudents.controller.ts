import type { Request, Response, NextFunction } from "express";
import * as service from "./fsStudents.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import multer from "multer";
import { parse } from "csv-parse/sync";
import { AppError } from "../../errors/appError.js";

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
    const records = parse(req.file.buffer.toString("utf-8"), { columns: true, skip_empty_lines: true }) as {
  name: string;
  academicLevel: string;
  subgroup: string;
}[];
    const results = await service.bulkGraduate(records);
    return sendSuccess(res, results, "Bulk graduation processed");
  } catch (err) {
    next(err);
  }
}