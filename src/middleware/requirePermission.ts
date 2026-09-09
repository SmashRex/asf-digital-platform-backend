import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { permissions, type PermissionKey } from "../config/permissions.config.js";

export function requirePermission(permissionKey: PermissionKey) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(AppError.unauthorized("Not authenticated", "NO_SESSION"));
    }

    const allowedRoles = permissions[permissionKey];
    const hasPermission = req.user.roles.some((role: string) => (allowedRoles as readonly string[]).includes(role));

    if (!hasPermission) {
      return next(AppError.forbidden("You lack permission to perform this action", "PERMISSION_DENIED"));
    }

    next();
  };
}