import { db } from "../../db/index.js";
import { users, userAcademicHistory, academicSessions, userSessions } from "../../db/schema/index.js";
import { eq, and, ne, ilike, or, count } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";
import { userRoles, roles } from "../../db/schema/index.js";
import type { ListMembersQuery } from "./members.validation.js";

export async function findUserById(userId: string) {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function getActiveSession() {
  return db.query.academicSessions.findFirst({ where: eq(academicSessions.isActive, true) });
}


export async function applyOverride(
  tx: Transaction,
  userId: string,
  newLevel: string,
  newMembershipStatus: string,
  sessionId: string,
  reason: string,
  recordedBy: string
) {
  await tx
    .update(users)
    .set({ academicLevel: newLevel, membershipStatus: newMembershipStatus })
    .where(eq(users.id, userId));

  await tx
    .insert(userAcademicHistory)
    .values({
      userId,
      academicSessionId: sessionId,
      academicLevel: newLevel,
      progressionStatus: "Override",
      isOverride: true,
      overrideReason: reason,
      recordedBy,
    })
    .onConflictDoUpdate({
      target: [userAcademicHistory.userId, userAcademicHistory.academicSessionId],
      set: {
        academicLevel: newLevel,
        progressionStatus: "Override",
        isOverride: true,
        overrideReason: reason,
        recordedBy,
      },
    });
}

export async function findUserByIdTx(tx: Transaction, userId: string) {
  return tx.query.users.findFirst({ where: eq(users.id, userId) });
}



export async function listMembers(query: ListMembersQuery) {
  const offset = (query.page - 1) * query.limit;

  const conditions = [ne(users.accountStatus, "Deactivated")];
  if (query.search) {
    conditions.push(
      or(ilike(users.name, `%${query.search}%`), ilike(users.department, `%${query.search}%`))!
    );
  }
  if (query.academicLevel) {
    conditions.push(eq(users.academicLevel, query.academicLevel));
  }

  const [rows, totalResult] = await Promise.all([
    db
      .select()
      .from(users)
      .where(and(...conditions))
      .limit(query.limit)
      .offset(offset)
      .orderBy(users.name),
    db.select({ count: count() }).from(users).where(and(...conditions)),
  ]);

  return { rows, total: totalResult[0].count };
}


export async function roleExists(roleId: string) {
  return db.query.roles.findFirst({ where: eq(roles.id, roleId) });
}

export async function hasRole(userId: string, roleId: string) {
  return db.query.userRoles.findFirst({
    where: and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)),
  });
}

export async function assignRole(userId: string, roleId: string, assignedBy: string) {
  await db.insert(userRoles).values({ userId, roleId, assignedBy }).onConflictDoNothing();
}

export async function removeRole(userId: string, roleId: string) {
  await db.delete(userRoles).where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, roleId)));
}

export async function updateAccountStatus(userId: string, accountStatus: string) {
  const [updated] = await db
    .update(users)
    .set({ accountStatus, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function revokeAllUserSessions(userId: string) {
  await db.update(userSessions).set({ isRevoked: true }).where(eq(userSessions.userId, userId));
}