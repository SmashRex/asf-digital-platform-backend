import { db } from "../../db/index.js";
import { fsManual } from "../../db/schema/index.js";

export async function getManual() {
  const rows = await db.select().from(fsManual);
  return rows[0] ?? null;
}

export async function saveManual(input: { fileName: string; fileData: string; uploadedBy: string }) {
  const existing = await getManual();
  if (existing) {
    const [updated] = await db
      .update(fsManual)
      .set({ ...input, updatedAt: new Date() })
      .returning();
    return updated;
  }
  const [created] = await db.insert(fsManual).values(input).returning();
  return created;
}