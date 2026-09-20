import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { AppError } from "../../errors/appError.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import * as service from "./media.service.js";
import { assignMediaSchema, listMediaQuerySchema, placementKeySchema } from "./media.validation.js";
import { fileTypeFromBuffer } from "file-type";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image files are accepted"));
      return;
    }
    callback(null, true);
  },
});

export const uploadMiddleware = upload.single("file");

function parsePlacementKey(value: string) {
  const parsed = placementKeySchema.safeParse(value);
  if (!parsed.success) throw AppError.badRequest("Invalid media placement key", "VALIDATION_ERROR");
  return parsed.data;
}

export async function uploadAsset(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw AppError.badRequest("No image file was uploaded", "NO_FILE");

    const realType = await fileTypeFromBuffer(req.file.buffer);
    if (!realType || !realType.mime.startsWith("image/")) {
      throw AppError.badRequest("This file's real content is not a valid image", "INVALID_FILE_CONTENT");
    }

    const altText = typeof req.body.altText === "string" ? req.body.altText : undefined;
    const asset = await service.uploadAsset(req.file, req.user!.id, altText);
    return sendSuccess(res, asset, "Media uploaded", undefined, 201);
  } catch (error) {
    next(error);
  }
}

export async function listAssets(_req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, await service.listAssets());
  } catch (error) {
    next(error);
  }
}

export async function removeAsset(req: Request, res: Response, next: NextFunction) {
  try {
    await service.deleteAsset(req.params.id as string);
    return sendSuccess(res, null, "Media deleted");
  } catch (error) {
    next(error);
  }
}

export async function getPlacement(req: Request, res: Response, next: NextFunction) {
  try {
    const key = parsePlacementKey(req.params.key as string);
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return sendSuccess(res, await service.getPlacement(key));
  } catch (error) {
    next(error);
  }
}

export async function listPlacements(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listMediaQuerySchema.safeParse(req.query);
    if (!parsed.success) throw AppError.badRequest("Invalid media query", "VALIDATION_ERROR");
    const keys = parsed.data.keys?.split(",").map((key) => parsePlacementKey(key));
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    return sendSuccess(res, await service.listPlacements(keys));
  } catch (error) {
    next(error);
  }
}

export async function assignAsset(req: Request, res: Response, next: NextFunction) {
  try {
    const key = parsePlacementKey(req.params.key as string);
    const parsed = assignMediaSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid media assignment", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const result = await service.assignAsset(key, parsed.data.assetId, req.user!.id, parsed.data.altText);
    return sendSuccess(res, result, "Media assigned");
  } catch (error) {
    next(error);
  }
}

export function handleUpload(req: Request, res: Response, next: NextFunction) {
  uploadMiddleware(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError || error instanceof Error) {
      next(AppError.badRequest(error.message, "INVALID_FILE"));
      return;
    }
    next();
  });
}