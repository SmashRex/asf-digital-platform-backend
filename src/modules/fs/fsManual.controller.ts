import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import * as service from "./fsManual.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";

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

function safeFileName(name: string) {
  return name.replace(/[^A-Za-z0-9._ -]/g, "_");
}

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

export async function info(req: Request, res: Response, next: NextFunction) {
  try {
    await service.assertCanAccessManual(req.user!.id);
    return sendSuccess(res, await service.getManualInfo());
  } catch (err) {
    next(err);
  }
}

export async function download(req: Request, res: Response, next: NextFunction) {
  try {
    await service.assertCanAccessManual(req.user!.id);
    const manual = await service.getManualForDownload();
    const buffer = Buffer.from(manual.fileData, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${safeFileName(manual.fileName)}"`);
    res.setHeader("Cache-Control", "private, no-store");
    return res.status(200).send(buffer);
  } catch (err) {
    next(err);
  }
}