import type { Transaction } from "../../db/index.js";
import { fsClasses, fsStudents, users } from "../../db/schema/index.js";
import { and, eq, inArray, isNull, notInArray } from "drizzle-orm";

export async function lockClass(tx: Transaction, classId: string) {
  const rows = await tx.select().from(fsClasses).where(eq(fsClasses.id, classId)).for("update");
  return rows[0] ?? null;
}

export async function lockClassStudents(tx: Transaction, classId: string) {
  return tx
    .select({ id: fsStudents.id, userId: fsStudents.userId, status: fsStudents.status })
    .from(fsStudents)
    .where(eq(fsStudents.classId, classId))
    .for("update");
}

export async function findStudentsByIds(tx: Transaction, ids: string[]) {
  if (ids.length === 0) return [];
  return tx
    .select({ id: fsStudents.id, userId: fsStudents.userId, classId: fsStudents.classId, status: fsStudents.status })
    .from(fsStudents)
    .where(inArray(fsStudents.id, ids));
}

export async function findUserSubgroups(tx: Transaction, userIds: string[]) {
  if (userIds.length === 0) return [];
  return tx.select({ id: users.id, subgroup: users.subgroup }).from(users).where(inArray(users.id, userIds));
}

// Only an Active student can graduate. Returns null if the row changed in the meantime.
export async function graduateStudent(tx: Transaction, studentId: string, recordedBy: string) {
  const [row] = await tx
    .update(fsStudents)
    .set({ status: "Graduated", completionRecordedBy: recordedBy, completionRecordedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(fsStudents.id, studentId), eq(fsStudents.status, "Active")))
    .returning({ id: fsStudents.id });
  return row ?? null;
}

// Never overwrites an existing subgroup. Returns null if one was set in the meantime.
export async function setSubgroupIfEmpty(tx: Transaction, userId: string, subgroup: string) {
  const [row] = await tx
    .update(users)
    .set({ subgroup, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.subgroup)))
    .returning({ id: users.id });
  return row ?? null;
}

export async function markRemainingNotCompleted(tx: Transaction, classId: string, keepIds: string[]) {
  const conditions = [eq(fsStudents.classId, classId), eq(fsStudents.status, "Active")];
  if (keepIds.length > 0) conditions.push(notInArray(fsStudents.id, keepIds));
  return tx
    .update(fsStudents)
    .set({ status: "Not Completed", completionRecordedBy: null, completionRecordedAt: null, updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: fsStudents.id });
}