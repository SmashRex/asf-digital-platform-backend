import type { Request, Response, NextFunction } from "express";
import { academicLevelOverrideSchema } from "./members.validation.js";
import { overrideAcademicLevel } from "./members.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { updateRoleSchema, updateStatusSchema } from "./members.validation.js";
import { updateMemberRole, updateMemberStatus, getMemberById } from "./members.service.js";
import { resetPasswordSchema } from "./members.validation.js";
import { adminResetPassword } from "./members.service.js";

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid password", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    await adminResetPassword(req.params.id as string, parsed.data.newPassword);
    return sendSuccess(res, null, "Password reset successfully");
  } catch (err) {
    next(err);
  }
}

export async function overrideLevel(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = academicLevelOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid override data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const updatedUser = await overrideAcademicLevel(req.params.id as string, parsed.data, req.user!.id);

    return sendSuccess(res, updatedUser, "Academic level overridden successfully");
  } catch (err) {
    next(err);
  }
}

import { listMembersQuerySchema } from "./members.validation.js";
import { getMemberDirectory } from "./members.service.js";
import { permissions } from "../../config/permissions.config.js";

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = listMembersQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid query parameters", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const canViewPrivate = req.user!.roles.some((role) =>
      (permissions["members.view_private"] as readonly string[]).includes(role)
    );

    const { data, total } = await getMemberDirectory(parsed.data, canViewPrivate);

    return sendSuccess(res, data, "Members retrieved successfully", {
      total,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });
  } catch (err) {
    next(err);
  }
}


export async function updateRole(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid role update data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const updated = await updateMemberRole(req.params.id as string, parsed.data, req.user!.id);
    return sendSuccess(res, updated, "Role updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid status update data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }   
    
    const updated = await updateMemberStatus(req.params.id as string, parsed.data, req.user!.id);
    return sendSuccess(res, updated, "Account status updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const canViewPrivate = req.user!.roles.some((role) =>
      (permissions["members.view_private"] as readonly string[]).includes(role)
    );
    const member = await getMemberById(req.params.id as string, canViewPrivate);
    return sendSuccess(res, member);
  } catch (err) {
    next(err);
  }
}