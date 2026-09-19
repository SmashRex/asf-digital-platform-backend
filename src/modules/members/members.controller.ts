import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { academicLevelOverrideSchema } from "./members.validation.js";
import { overrideAcademicLevel } from "./members.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { updateRoleSchema, updateStatusSchema } from "./members.validation.js";
import { updateMemberRole, updateMemberStatus, getMemberById } from "./members.service.js";
import { resetPasswordSchema } from "./members.validation.js";
import { adminResetPassword } from "./members.service.js";
import { listMembersQuerySchema } from "./members.validation.js";
import { getMemberDirectory } from "./members.service.js";
import { permissions } from "../../config/permissions.config.js";
import { changeSubgroup } from "./members.service.js";

const uuidParamSchema = z.string().uuid();

function parseIdParam(id: unknown) {
  const parsed = uuidParamSchema.safeParse(id);
  if (!parsed.success) {
    throw AppError.badRequest("Invalid member id format", "INVALID_ID_FORMAT");
  }
  return parsed.data;
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid password", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    await adminResetPassword(id, parsed.data.newPassword);
    return sendSuccess(res, null, "Password reset successfully");
  } catch (err) {
    next(err);
  }
}

export async function overrideLevel(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = academicLevelOverrideSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid override data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const updatedUser = await overrideAcademicLevel(id, parsed.data, req.user!.id);

    return sendSuccess(res, updatedUser, "Academic level overridden successfully");
  } catch (err) {
    next(err);
  }
}

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
    const id = parseIdParam(req.params.id);
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid role update data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }
    const updated = await updateMemberRole(id, parsed.data, req.user!.id);
    return sendSuccess(res, updated, "Role updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const parsed = updateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid status update data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const updated = await updateMemberStatus(id, parsed.data, req.user!.id);
    return sendSuccess(res, updated, "Account status updated successfully");
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const canViewPrivate = req.user!.roles.some((role) =>
      (permissions["members.view_private"] as readonly string[]).includes(role)
    );
    const member = await getMemberById(id, canViewPrivate);
    return sendSuccess(res, member);
  } catch (err) {
    next(err);
  }
}

export async function updateSubgroup(req: Request, res: Response, next: NextFunction) {
  try {
    const id = parseIdParam(req.params.id);
    const { subgroup } = req.body;
    if (!subgroup || typeof subgroup !== "string") {
      throw AppError.badRequest("subgroup is required", "VALIDATION_ERROR");
    }
    const member = await changeSubgroup(id, subgroup);
    return sendSuccess(res, member, "Subgroup updated");
  } catch (err) {
    next(err);
  }
}