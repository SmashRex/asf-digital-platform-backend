import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { Transaction } from "../../db/index.js";
import { handovers, userExecutiveOffices } from "../../db/schema/index.js";
import type { HandoverRow } from "./handover.validation.js";

export async function createDraft(input: { submittedBy: string; csvContent: string; parsedRows: HandoverRow[]; validationErrors: string[] }) {
  const [row] = await db.insert(handovers).values({
    submittedBy: input.submittedBy,
    status: input.validationErrors.length === 0 ? "Validated" : "Draft",
    csvContent: input.csvContent,
    parsedRows: input.parsedRows,
    validationErrors: input.validationErrors,
  }).returning();
  return row;
}

export async function findById(id: string) {
  const [row] = await db.select().from(handovers).where(eq(handovers.id, id)).limit(1);
  return row ?? null;
}

export async function list() {
  return db.select().from(handovers).orderBy(desc(handovers.createdAt));
}

export async function markApproved(tx: Transaction, id: string, approvedBy: string) {
  const [row] = await tx.update(handovers).set({ status: "Approved", approvedBy, approvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(handovers.id, id), eq(handovers.status, "Validated"))).returning();
  return row ?? null;
}

export async function publish(tx: Transaction, id: string, rows: HandoverRow[]) {
  const officeIds = [...new Set(rows.map((row) => row.officeId))];
  await tx.delete(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, officeIds));
  await tx.insert(userExecutiveOffices).values(rows.map((row) => ({ userId: row.memberId, officeId: row.officeId })));
  const [row] = await tx.update(handovers).set({ status: "Published", publishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(handovers.id, id), eq(handovers.status, "Approved"))).returning();
  return row ?? null;
}