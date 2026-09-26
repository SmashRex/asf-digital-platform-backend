export type GovernanceRequestType = "office_assignment" | "dashboard_grant" | "capability_grant";

const REQUESTER_ROLES: Record<GovernanceRequestType, readonly string[]> = {
  office_assignment: ["President / Executive", "Technical Administrator"],
  dashboard_grant: ["President / Executive", "Technical Administrator"],
  capability_grant: ["President / Executive", "Technical Administrator"],
};

export function canRequestAppointment(type: GovernanceRequestType, roles: string[]) {
  return REQUESTER_ROLES[type].some((role) => roles.includes(role));
}

export function canApproveAppointment(authorization: { dashboardIds: string[] }, type: GovernanceRequestType) {
  // Technical Head capability is intentionally not an approval authority.
  return authorization.dashboardIds.includes("president") && ["office_assignment", "dashboard_grant", "capability_grant"].includes(type);
}

export function canAssignOffice(roles: string[]) {
  return roles.includes("President / Executive") || roles.includes("Technical Administrator");
}

export function canRemoveOffice(roles: string[]) {
  return roles.includes("President / Executive");
}

export function canGrantDashboard(roles: string[]) {
  return roles.includes("President / Executive") || roles.includes("Technical Administrator");
}

export function canGrantCapability(roles: string[]) {
  return roles.includes("President / Executive") || roles.includes("Technical Administrator");
}