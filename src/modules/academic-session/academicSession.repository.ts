import { db } from "../../db/index.js";
import { academicSessions, users, userAcademicHistory } from "../../db/schema/index.js";
import { eq, and, ne } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";
import type { CreateSessionInput } from "./academicSession.validation.js";

export async function listSessions() {
  return db.query.academicSessions.findMany({
    orderBy: (table, { desc }) => [desc(table.startDate)],
  });
}

export async function findSessionById(id: string) {
  return db.query.academicSessions.findFirst({ where: eq(academicSessions.id, id) });
}

export async function createSession(input: CreateSessionInput) {
  const [session] = await db
    .insert(academicSessions)
    .values({ id: input.id, name: input.name, startDate: input.startDate, endDate: input.endDate, isActive: false })
    .returning();
  return session;
}

export async function getActiveStudents(tx: Transaction) {
  // Only students still progressing — Alumni/Visiting are excluded, matching
  // spec intent that progression only applies to active academic tracks
  return tx
    .select()
    .from(users)
    .where(and(eq(users.accountStatus, "Active"), ne(users.membershipStatus, "Alumni")));
}

export async function deactivateCurrentSession(tx: Transaction) {
  await tx.update(academicSessions).set({ isActive: false }).where(eq(academicSessions.isActive, true));
}

export async function activateSession(tx: Transaction, sessionId: string) {
  await tx.update(academicSessions).set({ isActive: true }).where(eq(academicSessions.id, sessionId));
}

export async function progressUser(
  tx: Transaction,
  userId: string,
  newLevel: string,
  newMembershipStatus: string
) {
  await tx.update(users).set({ academicLevel: newLevel, membershipStatus: newMembershipStatus }).where(eq(users.id, userId));
}

export async function recordHistory(
  tx: Transaction,
  userId: string,
  sessionId: string,
  level: string,
  status: "Promoted" | "Graduated"
) {
  await tx.insert(userAcademicHistory).values({
    userId,
    academicSessionId: sessionId,
    academicLevel: level,
    progressionStatus: status,
  });
}