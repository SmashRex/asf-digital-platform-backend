import { and, desc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { Transaction } from "../../db/index.js";
import { capabilities, dashboards, governanceRequests, userCapabilities, userDashboardAccess, userExecutiveOffices, executiveOffices } from "../../db/schema/index.js";
import type { CreateRequestInput } from "./governance.validation.js";

export async function createRequest(input: CreateRequestInput, requestedBy: string) {
  const [row] = await db.insert(governanceRequests).values({ requestType: input.requestType, payload: input.payload, requestedBy }).returning();
  return row;
}

export async function findById(id: string) {
  const [row] = await db.select().from(governanceRequests).where(eq(governanceRequests.id, id)).limit(1);
  return row ?? null;
}

export async function list(status?: "Pending" | "Approved" | "Rejected") {
  return db.select().from(governanceRequests).where(status ? eq(governanceRequests.status, status) : undefined).orderBy(desc(governanceRequests.createdAt));
}

export async function updateStatus(tx: Transaction, id: string, status: "Approved" | "Rejected", reviewedBy: string, reviewNotes?: string) {
  const [row] = await tx.update(governanceRequests).set({ status, reviewedBy, reviewedAt: new Date(), reviewNotes: reviewNotes ?? null, updatedAt: new Date() }).where(and(eq(governanceRequests.id, id), eq(governanceRequests.status, "Pending"))).returning();
  return row ?? null;
}

export async function assignOffice(tx: Transaction, payload: { userId: string; officeId: string }, assignedBy: string) {
  await tx.insert(userExecutiveOffices).values({ userId: payload.userId, officeId: payload.officeId, assignedBy }).onConflictDoNothing();
}

export async function grantDashboard(tx: Transaction, payload: { userId: string; dashboardId: string }, grantedBy: string) {
  await tx.insert(userDashboardAccess).values({ userId: payload.userId, dashboardId: payload.dashboardId, grantedBy }).onConflictDoNothing();
}

export async function grantCapability(tx: Transaction, payload: { userId: string; capabilityId: string }, grantedBy: string) {
  await tx.insert(userCapabilities).values({ userId: payload.userId, capabilityId: payload.capabilityId, grantedBy }).onConflictDoNothing();
}

export async function targetExists(input: CreateRequestInput) {
  if (input.requestType === "office_assignment") return (await db.select({ id: executiveOffices.id }).from(executiveOffices).where(eq(executiveOffices.id, input.payload.officeId)).limit(1)).length > 0;
  if (input.requestType === "dashboard_grant") return (await db.select({ id: dashboards.id }).from(dashboards).where(eq(dashboards.id, input.payload.dashboardId)).limit(1)).length > 0;
  return (await db.select({ id: capabilities.id }).from(capabilities).where(eq(capabilities.id, input.payload.capabilityId)).limit(1)).length > 0;
}