import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { hasCapability } from "../modules/authorization/authorization.repository.js";

export function requireCapability(capabilityId: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized("Not authenticated", "NO_SESSION");
      }

      if (!(await hasCapability(req.user.id, capabilityId))) {
        throw AppError.forbidden("This capability is required", "CAPABILITY_REQUIRED");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}