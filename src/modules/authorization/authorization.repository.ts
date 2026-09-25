import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { userExecutiveOffices, executiveOffices, userDashboardAccess, dashboards, userCapabilities, capabilities } from "../../db/schema/index.js";

export async function getUserExecutiveOffices(userId: string) {
  const rows = await db
    .select({ id: executiveOffices.id, name: executiveOffices.name })
    .from(userExecutiveOffices)
    .innerJoin(executiveOffices, eq(userExecutiveOffices.officeId, executiveOffices.id))
    .where(eq(userExecutiveOffices.userId, userId));
  return rows;
}

export async function hasDashboardAccess(userId: string, dashboardId: string) {
  const row = await db
    .select({ id: dashboards.id })
    .from(userDashboardAccess)
    .innerJoin(dashboards, eq(userDashboardAccess.dashboardId, dashboards.id))
    .where(and(eq(userDashboardAccess.userId, userId), eq(dashboards.id, dashboardId)))
    .limit(1);
  return row.length > 0;
}

export async function hasCapability(userId: string, capabilityId: string) {
  const row = await db
    .select({ id: capabilities.id })
    .from(userCapabilities)
    .innerJoin(capabilities, eq(userCapabilities.capabilityId, capabilities.id))
    .where(and(eq(userCapabilities.userId, userId), eq(capabilities.id, capabilityId)))
    .limit(1);
  return row.length > 0;
}