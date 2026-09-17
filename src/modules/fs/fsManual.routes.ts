import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { upload_, download, uploadMiddleware } from "./fsManual.controller.js";
import multer from "multer";
import { AppError } from "../../errors/appError.js";

export const fsManualRouter = Router();

function handleUpload(req: any, res: any, next: any) {
  uploadMiddleware(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError || err instanceof Error) {
      return next(AppError.badRequest((err as Error).message, "INVALID_FILE"));
    }
    next();
  });
}

fsManualRouter.post("/", requireAuth, requirePermission("fs.admissions.review"), handleUpload, upload_);
fsManualRouter.get("/", requireAuth, download);
