import type { Request, Response, NextFunction } from "express";
import { createAnnouncementSchema, editAnnouncementSchema, revisionRequestSchema } from "./announcements.validation.js";
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
    const data = await service.getAnnouncements(canSeeAll);
    return sendSuccess(res, data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = createAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest("Invalid announcement data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const announcement = await service.createAnnouncement(parsed.data, req.user!.id);
    return sendSuccess(res, announcement, "Announcement created", undefined, 201);
  } catch (err) {
    next(err);
  }
}

export async function submitForReview(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.submitForReview(req.params.id as string);
    return sendSuccess(res, announcement, "Submitted for review");
  } catch (err) {
    next(err);
  }
}

export async function approve(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.approve(req.params.id as string, req.user!.id);
    return sendSuccess(res, announcement, "Announcement approved");
  } catch (err) {
    next(err);
  }
}

export async function requestRevision(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = revisionRequestSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest("Invalid revision data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const announcement = await service.requestRevision(req.params.id as string, parsed.data.notes);
    return sendSuccess(res, announcement, "Revision requested");
  } catch (err) {
    next(err);
  }
}

export async function editAfterRevision(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = editAnnouncementSchema.safeParse(req.body);
    if (!parsed.success) throw AppError.badRequest("Invalid announcement data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    const announcement = await service.editAfterRevision(req.params.id as string, parsed.data);
    return sendSuccess(res, announcement, "Announcement updated");
  } catch (err) {
    next(err);
  }
}

export async function publish(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.publish(req.params.id as string, req.user!.id);
    return sendSuccess(res, announcement, "Announcement published");
  } catch (err) {
    next(err);
  }
}

export async function archive(req: Request, res: Response, next: NextFunction) {
  try {
    const announcement = await service.archive(req.params.id as string);
    return sendSuccess(res, announcement, "Announcement archived");
  } catch (err) {
    next(err);
  }
}