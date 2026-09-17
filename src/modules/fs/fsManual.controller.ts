import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import * as service from "./fsManual.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { db } from "../../db/index.js";
import { fsStudents, fsClassTeachers } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are accepted"));
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.single("file");

export async function upload_(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw AppError.badRequest("No PDF file was uploaded", "NO_FILE");
    }
    const manual = await service.uploadManual(req.file, req.user!.id);
    return sendSuccess(res, { id: manual.id, fileName: manual.fileName }, "Manual uploaded", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.id;

    const [studentRow] = await db.select().from(fsStudents).where(and(eq(fsStudents.userId, userId), eq(fsStudents.status, "Active")));
    const [teacherRow] = await db.select().from(fsClassTeachers).where(eq(fsClassTeachers.teacherId, userId));

    const allowed = await service.isManualVisibleToUser(!!studentRow, !!teacherRow);
    if (!allowed) {
      throw AppError.forbidden("You do not have access to the FS manual", "MANUAL_ACCESS_DENIED");
    }

    const manual = await service.getManualForDownload();
    const buffer = Buffer.from(manual.fileData, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${manual.fileName}"`);
    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}


