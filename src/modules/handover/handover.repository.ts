import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { Transaction } from "../../db/index.js";
import { departments, executiveOffices, handovers, userDashboardAccess, userExecutiveOffices, users } from "../../db/schema/index.js";
import type { HandoverStoredRow, ResolvedHandoverRow } from "./handover.validation.js";
import { officeDashboards } from "../../config/officeDashboards.config.js";

// Finds members by identity regardless of account/membership status.
// The service decides what to do with inactive members (result: INACTIVE).
export async function findMembersByIdentity(name: string, academicLevel: string, subgroup: string) {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      academicLevel: users.academicLevel,
      subgroup: users.subgroup,
      department: users.department,
      departmentName: departments.name,
      accountStatus: users.accountStatus,
      membershipStatus: users.membershipStatus,
    })
    .from(users)
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(and(
      sql`lower(trim(${users.name})) = lower(trim(${name}))`,
      eq(users.academicLevel, academicLevel),
      sql`${users.subgroup} IS NOT NULL`,
      sql`lower(trim(${users.subgroup})) = lower(trim(${subgroup}))`,
    ));
  return rows.map((row) => ({ ...row, department: row.departmentName ?? row.department }));
}

export async function findOfficeByName(name: string) {
  const [row] = await db.select({ id: executiveOffices.id }).from(executiveOffices)
    .where(sql`lower(trim(${executiveOffices.name})) = lower(trim(${name}))`).limit(1);
  return row?.id ?? null;
}

export async function createDraft(input: { submittedBy: string; csvContent: string; parsedRows: HandoverStoredRow[]; validationErrors: string[] }) {
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

export async function publish(tx: Transaction, id: string, rows: ResolvedHandoverRow[]) {
  const officeIds = [...new Set(rows.map((row) => row.officeId))];

  // Outgoing holders lose the explicit dashboard grant tied to the offices being replaced.
  const outgoing = await tx
    .select({ userId: userExecutiveOffices.userId, officeId: userExecutiveOffices.officeId })
    .from(userExecutiveOffices)
    .where(inArray(userExecutiveOffices.officeId, officeIds));
  for (const officeId of officeIds) {
    const dashboardId = officeDashboards[officeId];
    if (!dashboardId) continue;
    const outgoingIds = outgoing.filter((row) => row.officeId === officeId).map((row) => row.userId);
    if (outgoingIds.length > 0) {
      await tx.delete(userDashboardAccess).where(and(
        eq(userDashboardAccess.dashboardId, dashboardId),
        inArray(userDashboardAccess.userId, outgoingIds),
      ));
    }
  }

  await tx.delete(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, officeIds));
  await tx.insert(userExecutiveOffices).values(rows.map((row) => ({ userId: row.memberId, officeId: row.officeId })));
  const [row] = await tx.update(handovers).set({ status: "Published", publishedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(handovers.id, id), eq(handovers.status, "Approved"))).returning();
  return row ?? null;
}

export async function findActiveMemberIds(executor: typeof db | Transaction, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await executor.select({ id: users.id }).from(users).where(and(
    inArray(users.id, ids),
    eq(users.accountStatus, "Active"),
    eq(users.membershipStatus, "Active Student"),
  ));
  return rows.map((row) => row.id);
}