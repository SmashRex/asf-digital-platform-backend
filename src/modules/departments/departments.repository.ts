import { db } from "../../db/index.js";
import { departments } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

export async function listDepartments() {
  return db.select().from(departments).orderBy(departments.school, departments.name);
}

export async function createDepartment(input: { id: string; name: string; school?: string | null }) {
  const [row] = await db.insert(departments).values(input).returning();
  return row;
}

export async function findById(id: string) {
  const rows = await db.select().from(departments).where(eq(departments.id, id));
  return rows[0] ?? null;
}