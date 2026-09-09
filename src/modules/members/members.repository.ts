import { db } from "../../db/index.js";
import { users, userAcademicHistory, academicSessions } from "../../db/schema/index.js";
import { and, eq } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";

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