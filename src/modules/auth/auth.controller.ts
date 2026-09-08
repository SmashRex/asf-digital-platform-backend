import type { Request, Response, NextFunction } from "express";
import { registerSchema, verifyTokenSchema } from "./auth.validation.js";
import { registerUser, verifyMagicLink } from "./auth.service.js";
import { sendSuccess } from "../../utils/apiResponse.js";
import { AppError } from "../../errors/appError.js";
import { appConfig } from "../../config/app.config.js";
import { env } from "../../config/env.config.js";
import { revokeSession } from "./auth.service.js";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid registration data", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const user = await registerUser(parsed.data, req.ip ?? null);

    return sendSuccess(
      res,
      { id: user.id, email: user.email, name: user.name },
      "Registration successful. Check your email for a sign-in link.",
      undefined,
      201
    );
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = verifyTokenSchema.safeParse(req.body);
    if (!parsed.success) {
      throw AppError.badRequest("Invalid request", "VALIDATION_ERROR", parsed.error.flatten().fieldErrors);
    }

    const { user, roles, rawSessionToken, sessionExpiresAt } = await verifyMagicLink(
      parsed.data.token,
      req.ip ?? null,
      req.headers["user-agent"] ?? null
    );

    res.cookie("asf_session", rawSessionToken, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: appConfig.auth.sessionTtlDays * 24 * 60 * 60 * 1000,
      path: "/",
    });

    return sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: user.name,
      department: user.department,
      academicLevel: user.academicLevel,
      subgroup: user.subgroup,
      roles,
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    return sendSuccess(res, req.user);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.sessionId) {
      await revokeSession(req.sessionId);
    }
    res.clearCookie("asf_session", { path: "/" });
    return sendSuccess(res, null, "Logged out successfully");
  } catch (err) {
    next(err);
  }
}