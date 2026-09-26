import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import { recordAudit } from "../../utils/auditLog.js";
import * as repository from "./governance.repository.js";
import type { CreateRequestInput } from "./governance.validation.js";
import { canApproveAppointment, canRequestAppointment } from "../../config/appointmentPolicy.config.js";
import { getUserDashboardIds } from "../authorization/authorization.repository.js";

export async function createRequest(input: CreateRequestInput, requestedBy: { id: string; roles: string[] }) {
  if (!canRequestAppointment(input.requestType, requestedBy.roles)) throw AppError.forbidden("You cannot create this governance request", "GOVERNANCE_REQUEST_DENIED");
  if (!(await repository.targetExists(input))) throw AppError.badRequest("Governance target does not exist", "INVALID_GOVERNANCE_TARGET");
  return repository.createRequest(input, requestedBy.id);
}

export const findRequest = repository.findById;
export const listRequests = repository.list;

export async function approveRequest(id: string, approverId: string) {
  const request = await repository.findById(id);
  if (!request) throw AppError.notFound("Governance request not found", "REQUEST_NOT_FOUND");
  if (request.status !== "Pending") throw AppError.conflict("Governance request is no longer pending", "REQUEST_NOT_PENDING");
  if (!canApproveAppointment({ dashboardIds: await getUserDashboardIds(approverId) }, request.requestType as CreateRequestInput["requestType"])) throw AppError.forbidden("President dashboard approval is required", "GOVERNANCE_APPROVAL_DENIED");
  if (request.requestedBy === approverId) throw AppError.forbidden("You cannot approve your own governance request", "SELF_APPROVAL_BLOCKED");
  return db.transaction(async (tx) => {
    const payload = request.payload;
    if (request.requestType === "office_assignment") await repository.assignOffice(tx, payload as { userId: string; officeId: string }, approverId);
    if (request.requestType === "dashboard_grant") await repository.grantDashboard(tx, payload as { userId: string; dashboardId: string }, approverId);
    if (request.requestType === "capability_grant") await repository.grantCapability(tx, payload as { userId: string; capabilityId: string }, approverId);
    const updated = await repository.updateStatus(tx, id, "Approved", approverId);
    if (!updated) throw AppError.conflict("Governance request is no longer pending", "REQUEST_NOT_PENDING");
    await recordAudit({ actorId: approverId, action: `${request.requestType}.approved`, targetType: "governance_request", targetId: id, metadata: { payload } }, tx);
    return updated;
  });
}

export async function rejectRequest(id: string, reviewerId: string, reason: string) {
  const request = await repository.findById(id);
  if (!request) throw AppError.notFound("Governance request not found", "REQUEST_NOT_FOUND");
  if (request.status !== "Pending") throw AppError.conflict("Governance request is no longer pending", "REQUEST_NOT_PENDING");
  return db.transaction(async (tx) => {
    const updated = await repository.updateStatus(tx, id, "Rejected", reviewerId, reason);
    if (!updated) throw AppError.conflict("Governance request is no longer pending", "REQUEST_NOT_PENDING");
    await recordAudit({ actorId: reviewerId, action: `${request.requestType}.rejected`, targetType: "governance_request", targetId: id, metadata: { reason, payload: request.payload } }, tx);
    return updated;
  });
}