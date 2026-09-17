import type { Request, Response, NextFunction } from "express";
import { createAnnouncementSchema } from "./announcements.validation.js";
import * as service from "./announcements.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { permissions } from "../../config/permissions.config.js";

function hasPermission(req: Request, key: keyof typeof permissions): boolean {
  return req.user!.roles.some((role) => (permissions[key] as readonly string[]).includes(role));
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const canSeeAll = hasPermission(req, "announcements.publish");
    const announcementsList = await service.getAnnouncements(canSeeAll);
    return sendSuccess(res, announcementsList);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid announcement data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const announcement = await service.createAnnouncement(parsed.data, req.user!.id);
    return sendSuccess(res, announcement, "Announcement created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.publishAnnouncement(req.params.id as string);
    return sendSuccess(res, announcement, "Announcement published");
  } catch (err) {
    next(err);
  }
}