import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { hasOffice } from "../modules/authorization/authorization.repository.js";

export function requireOffice(officeId: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized("Not authenticated", "NO_SESSION");
      }
      if (!(await hasOffice(req.user.id, officeId))) {
        throw AppError.forbidden("You do not hold the office required for this action", "OFFICE_REQUIRED");
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}