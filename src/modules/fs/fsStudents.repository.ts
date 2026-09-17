import { db } from "../../db/index.js";
import { fsStudents } from "../../db/schema/index.js";
import type { Transaction } from "../../db/index.js";

export async function createStudent(
  data: { userId: string; classId: string; admissionId: string },
  tx: Transaction | typeof db = db
) {
  const [student] = await tx.insert(fsStudents).values(data).returning();
  return student;
}