import { permissions } from "../../config/permissions.config.js";
import * as repository from "./authorization.repository.js";

export async function resolveAuthorization(input: { userId: string; accountStatus: string; roles: string[] }) {
  const [executiveOffices, dashboardIds, capabilityIds] = await Promise.all([
    repository.getUserExecutiveOffices(input.userId),
    repository.getUserDashboardIds(input.userId),
    repository.getUserCapabilityIds(input.userId),
  ]);
  const permissionKeys = Object.entries(permissions)
    .filter(([, allowedRoles]) => input.roles.some((role) => (allowedRoles as readonly string[]).includes(role)))
    .map(([key]) => key);
  return {
    accountStatus: input.accountStatus,
    executiveOffices,
    dashboardIds,
    capabilityIds,
    permissionKeys,
  };
}