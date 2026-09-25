import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { hasDashboardAccess } from "../modules/authorization/authorization.repository.js";

export function requireDashboardAccess(dashboardId: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw AppError.unauthorized("Not authenticated", "NO_SESSION");
      }

      if (!(await hasDashboardAccess(req.user.id, dashboardId))) {
        throw AppError.forbidden("Dashboard access is required", "DASHBOARD_ACCESS_DENIED");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}