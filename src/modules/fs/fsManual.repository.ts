import { db } from "../../db/index.js";
import { fsClassTeachers, fsManual } from "../../db/schema/index.js";
import { eq, sql } from "drizzle-orm";

export async function getManual() {
  const rows = await db.select().from(fsManual).limit(1);
  return rows[0] ?? null;
}

export async function getManualInfo() {
  const rows = await db
    .select({
      fileName: fsManual.fileName,
      updatedAt: fsManual.updatedAt,
      sizeBytes: sql<number>`octet_length(decode(${fsManual.fileData}, 'base64'))::int`,
    })
    .from(fsManual)
    .limit(1);
  return rows[0] ?? null;
}

export async function saveManual(input: { fileName: string; fileData: string; uploadedBy: string }) {
  const [existing] = await db.select({ id: fsManual.id }).from(fsManual).limit(1);
  if (existing) {
    const [updated] = await db
      .update(fsManual)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(fsManual.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db.insert(fsManual).values(input).returning();
  return created;
}

export async function isAssignedTeacher(userId: string) {
  const rows = await db
    .select({ id: fsClassTeachers.id })
    .from(fsClassTeachers)
    .where(eq(fsClassTeachers.teacherId, userId))
    .limit(1);
  return rows.length > 0;
}