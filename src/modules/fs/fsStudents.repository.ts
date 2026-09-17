import { db } from "../../db/index.js";
import { fsStudents, users } from "../../db/schema/index.js";
import { eq, and } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";

export async function createStudent(
  data: { userId: string; classId: string; admissionId: string },
  tx: Transaction | typeof db = db
) {
  const [student] = await tx.insert(fsStudents).values(data).returning();
  return student;
}

export async function findById(id: string) {
  const rows = await db.select().from(fsStudents).where(eq(fsStudents.id, id));
  return rows[0] ?? null;
}

export async function listStudents(classId?: string) {
  const query = db
    .select({
      id: fsStudents.id,
      userId: fsStudents.userId,
      studentName: users.name,
      studentEmail: users.email,
      classId: fsStudents.classId,
      status: fsStudents.status,
      createdAt: fsStudents.createdAt,
    })
    .from(fsStudents)
    .innerJoin(users, eq(fsStudents.userId, users.id));

  if (classId) {
    return query.where(eq(fsStudents.classId, classId));
  }
  return query;
}

export async function updateStatus(
  id: string,
  data: { status: string; completionRecordedBy?: string | null }
) {
  const [row] = await db
    .update(fsStudents)
    .set({
      status: data.status,
      completionRecordedBy: data.completionRecordedBy ?? null,
      completionRecordedAt: data.completionRecordedBy ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(fsStudents.id, id))
    .returning();
  return row;
}

export async function findUserByNameAndLevel(name: string, academicLevel: string) {
  const rows = await db.select().from(users).where(and(eq(users.name, name), eq(users.academicLevel, academicLevel)));
  return rows[0] ?? null;
}