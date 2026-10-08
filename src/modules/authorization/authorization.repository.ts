import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { userExecutiveOffices, executiveOffices, userDashboardAccess, dashboards, userCapabilities, capabilities } from "../../db/schema/index.js";
import { officeDashboards } from "../../config/officeDashboards.config.js";

export async function getUserExecutiveOffices(userId: string) {
  const rows = await db
    .select({ id: executiveOffices.id, name: executiveOffices.name })
    .from(userExecutiveOffices)
    .innerJoin(executiveOffices, eq(userExecutiveOffices.officeId, executiveOffices.id))
    .where(eq(userExecutiveOffices.userId, userId));
  return rows;
}

export async function hasOffice(userId: string, officeId: string) {
  const row = await db
    .select({ id: userExecutiveOffices.officeId })
    .from(userExecutiveOffices)
    .where(and(eq(userExecutiveOffices.userId, userId), eq(userExecutiveOffices.officeId, officeId)))
    .limit(1);
  return row.length > 0;
}

// Dashboards come from explicit grants plus the dashboards unlocked by held offices.
export async function getUserDashboardIds(userId: string) {
  const [explicitRows, officeRows] = await Promise.all([
    db
      .select({ id: dashboards.id })
      .from(userDashboardAccess)
      .innerJoin(dashboards, eq(userDashboardAccess.dashboardId, dashboards.id))
      .where(eq(userDashboardAccess.userId, userId)),
    db
      .select({ officeId: userExecutiveOffices.officeId })
      .from(userExecutiveOffices)
      .where(eq(userExecutiveOffices.userId, userId)),
  ]);
  const ids = new Set(explicitRows.map((row) => row.id));
  for (const { officeId } of officeRows) {
    const dashboardId = officeDashboards[officeId];
    if (dashboardId) ids.add(dashboardId);
  }
  return [...ids];
}

export async function hasDashboardAccess(userId: string, dashboardId: string) {
  return (await getUserDashboardIds(userId)).includes(dashboardId);
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

export async function getUserCapabilityIds(userId: string) {
  const rows = await db
    .select({ id: capabilities.id })
    .from(userCapabilities)
    .innerJoin(capabilities, eq(userCapabilities.capabilityId, capabilities.id))
    .where(eq(userCapabilities.userId, userId));
  return rows.map((row) => row.id);
}