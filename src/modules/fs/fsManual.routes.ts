import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { upload_, download, info, uploadMiddleware } from "./fsManual.controller.js";
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

fsManualRouter.post("/", requireAuth, requireOffice("vice-president"), handleUpload, upload_);
fsManualRouter.get("/info", requireAuth, info);
fsManualRouter.get("/", requireAuth, download);