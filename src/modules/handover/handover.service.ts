import { parse } from "csv-parse/sync";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { Transaction } from "../../db/index.js";
import { handovers, executiveOffices, users, userExecutiveOffices } from "../../db/schema/index.js";
import { AppError } from "../../errors/appError.js";
import { recordAudit } from "../../utils/auditLog.js";
import * as repository from "./handover.repository.js";
import { handoverRowSchema, type HandoverRow } from "./handover.validation.js";

const REQUIRED_HEADERS = ["memberId", "officeId"] as const;

function parseCsv(csvContent: string): HandoverRow[] {
  let records: unknown;
  try {
    records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (error) {
    throw AppError.badRequest(`Malformed CSV: ${error instanceof Error ? error.message : "invalid CSV"}`, "INVALID_CSV");
  }
  if (!Array.isArray(records) || records.length === 0) throw AppError.badRequest("CSV must contain at least one data row", "INVALID_CSV");
  const headers = Object.keys(records[0] as Record<string, unknown>);
  if (headers.length !== REQUIRED_HEADERS.length || REQUIRED_HEADERS.some((header) => !headers.includes(header))) {
    throw AppError.badRequest("CSV headers must be exactly memberId,officeId", "INVALID_CSV_HEADERS");
  }
  return records.map((record, index) => {
    const parsed = handoverRowSchema.safeParse(record);
    if (!parsed.success) throw AppError.badRequest(`Invalid CSV row ${index + 2}`, "INVALID_CSV_ROW", parsed.error.flatten().fieldErrors);
    return parsed.data;
  });
}

async function validateRows(rows: HandoverRow[]) {
  const errors: string[] = [];
  const memberIds = [...new Set(rows.map((row) => row.memberId))];
  const officeIds = [...new Set(rows.map((row) => row.officeId))];
  const [members, offices] = await Promise.all([
    db.select({ id: users.id }).from(users).where(inArray(users.id, memberIds)),
    db.select({ id: executiveOffices.id }).from(executiveOffices).where(inArray(executiveOffices.id, officeIds)),
  ]);
  const memberSet = new Set(members.map((member) => member.id));
  const officeSet = new Set(offices.map((office) => office.id));
  const seenAssignments = new Set<string>();
  const seenMembers = new Set<string>();
  const seenOffices = new Set<string>();
  for (const row of rows) {
    if (!memberSet.has(row.memberId)) errors.push(`Unknown member: ${row.memberId}`);
    if (!officeSet.has(row.officeId)) errors.push(`Unknown office: ${row.officeId}`);
    const assignmentKey = `${row.memberId}:${row.officeId}`;
    if (seenAssignments.has(assignmentKey)) errors.push(`Duplicate assignment: ${assignmentKey}`);
    if (seenMembers.has(row.memberId)) errors.push(`Conflicting multiple-office assignment for member: ${row.memberId}`);
    if (seenOffices.has(row.officeId)) errors.push(`Invalid office cardinality; office assigned more than once: ${row.officeId}`);
    seenAssignments.add(assignmentKey);
    seenMembers.add(row.memberId);
    seenOffices.add(row.officeId);
  }
  if (!seenOffices.has("president")) errors.push("Exactly one incoming president assignment is required");
  return [...new Set(errors)];
}

export async function submit(csvContent: string, submittedBy: string) {
  const rows = parseCsv(csvContent);
  const validationErrors = await validateRows(rows);
  return repository.createDraft({ submittedBy, csvContent, parsedRows: rows, validationErrors });
}

export const getById = repository.findById;
export const list = repository.list;

export async function approve(id: string, approverId: string) {
  return db.transaction(async (tx) => {
    const request = await repository.findById(id);
    if (!request) throw AppError.notFound("Handover not found", "HANDOVER_NOT_FOUND");
    if (request.status !== "Validated") throw AppError.conflict("Only a validated handover can be approved", "HANDOVER_NOT_VALIDATED");
    const updated = await repository.markApproved(tx, id, approverId);
    if (!updated) throw AppError.conflict("Handover is no longer validated", "HANDOVER_NOT_VALIDATED");
    await recordAudit({ actorId: approverId, action: "handover.approved", targetType: "handover", targetId: id, metadata: { rows: request.parsedRows } }, tx);
    return updated;
  });
}

export async function publish(id: string, publisherId: string) {
  return db.transaction(async (tx) => {
    const request = await repository.findById(id);
    if (!request) throw AppError.notFound("Handover not found", "HANDOVER_NOT_FOUND");
    if (request.status !== "Approved") throw AppError.conflict("Only an approved handover can be published", "HANDOVER_NOT_APPROVED");
    const updated = await repository.publish(tx, id, request.parsedRows);
    if (!updated) throw AppError.conflict("Handover is no longer approved", "HANDOVER_NOT_APPROVED");
    await recordAudit({ actorId: publisherId, action: "handover.published", targetType: "handover", targetId: id, metadata: { rows: request.parsedRows } }, tx);
    return updated;
  });
}