import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { appConfig } from "../config/app.config.js";
import { hashToken } from "../utils/token.js";
import * as authRepository from "../modules/auth/auth.repository.js";
import { db } from "../db/index.js";

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawSessionToken = req.cookies?.asf_session;

    if (!rawSessionToken) {
      throw AppError.unauthorized("Not authenticated", "NO_SESSION");
    }

    const sessionTokenHash = hashToken(rawSessionToken);
    const session = await authRepository.findActiveSessionByHash(sessionTokenHash);

    if (!session) {
      throw AppError.unauthorized("Session is invalid or has expired", "INVALID_SESSION");
    }

   const user = await authRepository.findUserById(db, session.userId);
    if (!user) {
      throw AppError.unauthorized("User no longer exists", "INVALID_SESSION");
    }

    if (user.accountStatus !== "Active") {
      throw AppError.forbidden("Account is not active", "ACCOUNT_NOT_ACTIVE");
    }

    // Sliding renewal: only push expiresAt forward if within the renewal window,
    // otherwise just record activity without rewriting expiresAt every request
    const msUntilExpiry = session.expiresAt.getTime() - Date.now();
    const renewalThresholdMs = appConfig.auth.sessionSlidingRenewalDays * 24 * 60 * 60 * 1000;

    const shouldRenew = msUntilExpiry < renewalThresholdMs;
    const newExpiresAt = shouldRenew
      ? new Date(Date.now() + appConfig.auth.sessionTtlDays * 24 * 60 * 60 * 1000)
      : null;

    await authRepository.touchSession(session.id, newExpiresAt);

    const roles = await authRepository.getUserRolesByUserId(user.id);

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      academicLevel: user.academicLevel,
      accountStatus: user.accountStatus,
      roles,
    };
    req.sessionId = session.id;

    next();
  } catch (err) {
    next(err);
  }
}