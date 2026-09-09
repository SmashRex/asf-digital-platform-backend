import { db } from "../../db/index.js";
import { users, userRoles, userAcademicHistory, academicSessions, magicLinkTokens,userSessions } from "../../db/schema/index.js";
import type { RegisterInput } from "./auth.validation.js";
import { and, eq, gt, sql as rawSql, sql } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";
import { and, eq, gt, ne, sql } from "drizzle-orm";

export async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: sql`lower(${users.email}) = ${email}`,
  });
}

export async function getActiveAcademicSession() {
  return db.query.academicSessions.findFirst({
    where: eq(academicSessions.isActive, true),
  });
}

export async function createUserWithRegistration(
  input: RegisterInput,
  activeSessionId: string,
  tokenHash: string,
  tokenExpiresAt: Date,
  ipAddress: string | null
) {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
  email: input.email,
  name: input.name,
  department: input.department,
  academicLevel: input.academicLevel,
  programDurationYears: input.programDurationYears,
  phoneNumber: input.phoneNumber,
  subgroup: input.subgroup,
  accountStatus: "Active",
  membershipStatus: input.academicLevel === "Alumni" ? "Alumni" : "Active Student",
})
      .returning();

    await tx.insert(userRoles).values({
      userId: user.id,
      roleId: "Member",
    });

    await tx.insert(userAcademicHistory).values({
      userId: user.id,
      academicSessionId: activeSessionId,
      academicLevel: input.academicLevel,
      progressionStatus: "Registered",
    });

    await tx.insert(magicLinkTokens).values({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt: tokenExpiresAt,
      ipAddress: ipAddress ?? undefined,
    });

    return user;
  });
}

export async function findAndLockValidToken(tx: any, tokenHash: string) {
  const rows = await tx
    .select()
    .from(magicLinkTokens)
    .where(
      and(
        eq(magicLinkTokens.tokenHash, tokenHash),
        eq(magicLinkTokens.isConsumed, false),
        gt(magicLinkTokens.expiresAt, new Date())
      )
    )
    .for("update");

  return rows[0] ?? null;
}

export async function markTokenConsumed(tx: any, tokenId: string) {
  await tx
    .update(magicLinkTokens)
    .set({ isConsumed: true, consumedAt: new Date() })
    .where(eq(magicLinkTokens.id, tokenId));
}

export async function findUserById(dbOrTx: typeof db | Transaction, userId: string) {
  return dbOrTx.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function getUserRoleIds(tx: any, userId: string) {
  const rows = await tx
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r: { roleId: string }) => r.roleId);
}

export async function createSession(
  tx: any,
  userId: string,
  sessionTokenHash: string,
  expiresAt: Date,
  deviceInfo: string | null,
  ipAddress: string | null
) {
  const [session] = await tx
    .insert(userSessions)
    .values({
      userId,
      sessionTokenHash,
      expiresAt,
      deviceInfo: deviceInfo ?? undefined,
      ipAddress: ipAddress ?? undefined,
    })
    .returning();
  return session;
}

export async function findActiveSessionByHash(sessionTokenHash: string) {
  return db.query.userSessions.findFirst({
    where: and(
      eq(userSessions.sessionTokenHash, sessionTokenHash),
      eq(userSessions.isRevoked, false),
      gt(userSessions.expiresAt, new Date())
    ),
  });
}

export async function touchSession(sessionId: string, newExpiresAt: Date | null) {
  await db
    .update(userSessions)
    .set({
      lastActiveAt: new Date(),
      ...(newExpiresAt ? { expiresAt: newExpiresAt } : {}),
    })
    .where(eq(userSessions.id, sessionId));
}

export async function getUserRolesByUserId(userId: string) {
  const rows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((r) => r.roleId);
}

export async function revokeSessionById(sessionId: string) {
  await db.update(userSessions).set({ isRevoked: true }).where(eq(userSessions.id, sessionId));
}

export async function findActiveUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: and(sql`lower(${users.email}) = ${email}`, ne(users.accountStatus, "Suspended")),
  });
}

export async function invalidateUnconsumedTokens(userId: string) {
  await db
    .update(magicLinkTokens)
    .set({ isConsumed: true })
    .where(and(eq(magicLinkTokens.userId, userId), eq(magicLinkTokens.isConsumed, false)));
}

export async function createLoginToken(
  userId: string,
  email: string,
  tokenHash: string,
  expiresAt: Date,
  ipAddress: string | null
) {
  await db.insert(magicLinkTokens).values({ userId, email, tokenHash, expiresAt, ipAddress: ipAddress ?? undefined });
}