import { AppError } from "../../errors/appError.js";
import { appConfig } from "../../config/app.config.js";
import { env } from "../../config/env.config.js";
import { generateRawToken, hashToken } from "../../utils/token.js";
import { mailer } from "../../adapters/mailer/index.js";
import * as authRepository from "./auth.repository.js";
import type { RegisterInput } from "./auth.validation.js";
import { db } from "../../db/index.js";


export async function registerUser(input: RegisterInput, ipAddress: string | null) {
  const existingUser = await authRepository.findUserByEmail(input.email);
  if (existingUser) {
    throw AppError.conflict("Email is already registered", "EMAIL_ALREADY_REGISTERED");
  }

  const activeSession = await authRepository.getActiveAcademicSession();
  if (!activeSession) {
    // A missing active session is a system configuration problem, not the user's fault
    throw AppError.internal("No active academic session is configured", "NO_ACTIVE_SESSION");
  }

  const rawToken = generateRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + appConfig.auth.magicLinkTtlMinutes * 60 * 1000);

  const user = await authRepository.createUserWithRegistration(
    input,
    activeSession.id,
    tokenHash,
    expiresAt,
    ipAddress
  );

  const magicLinkUrl = `${env.FRONTEND_URL}/auth/verify?token=${rawToken}`;

  await mailer.sendMagicLinkEmail({
    to: user.email,
    name: user.name,
    magicLinkUrl,
    purpose: "register",
  });

  return user;
}

export async function verifyMagicLink(
  rawToken: string,
  ipAddress: string | null,
  deviceInfo: string | null
) {
  const tokenHash = hashToken(rawToken);

  const result = await db.transaction(async (tx) => {
    const tokenRecord = await authRepository.findAndLockValidToken(tx, tokenHash);

    if (!tokenRecord) {
      throw AppError.badRequest("Invalid or expired magic link token", "INVALID_MAGIC_LINK");
    }

    await authRepository.markTokenConsumed(tx, tokenRecord.id);

    const user = await authRepository.findUserById(tx, tokenRecord.userId);
    if (!user) {
      throw AppError.internal("User associated with this token no longer exists", "USER_NOT_FOUND");
    }

    if (user.accountStatus === "Suspended") {
      throw AppError.forbidden("Account is suspended", "ACCOUNT_SUSPENDED");
    }

    const rawSessionToken = generateRawToken();
    const sessionTokenHash = hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + appConfig.auth.sessionTtlDays * 24 * 60 * 60 * 1000);

    await authRepository.createSession(tx, user.id, sessionTokenHash, sessionExpiresAt, deviceInfo, ipAddress);

    const roles = await authRepository.getUserRoleIds(tx, user.id);

    return { user, roles, rawSessionToken, sessionExpiresAt };
  });

  return result;
}