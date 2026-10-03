import { parse } from "csv-parse/sync";
import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import { recordAudit } from "../../utils/auditLog.js";
import * as repository from "./handover.repository.js";
import { handoverRowSchema, type HandoverRow, type HandoverStoredRow, type HandoverValidationRow, type ResolvedHandoverRow } from "./handover.validation.js";

const REQUIRED_HEADERS = ["name", "academicLevel", "subgroup", "office"] as const;
const MAX_ROWS = 30;

function parseCsv(csvContent: string): HandoverRow[] {
  let records: unknown;
  try {
    records = parse(csvContent, { columns: true, skip_empty_lines: true, trim: true, bom: true });
  } catch (error) {
    throw AppError.badRequest(`Malformed CSV: ${error instanceof Error ? error.message : "invalid CSV"}`, "INVALID_CSV");
  }
  if (!Array.isArray(records) || records.length === 0) throw AppError.badRequest("CSV must contain at least one data row", "INVALID_CSV");
  if (records.length > MAX_ROWS) throw AppError.badRequest(`CSV cannot contain more than ${MAX_ROWS} rows`, "INVALID_CSV");
  const headers = Object.keys(records[0] as Record<string, unknown>);
  if (headers.length !== REQUIRED_HEADERS.length || REQUIRED_HEADERS.some((header, index) => headers[index] !== header)) {
    throw AppError.badRequest("CSV headers must be exactly name,academicLevel,subgroup,office", "INVALID_CSV_HEADERS");
  }
  return records.map((record, index) => {
    const parsed = handoverRowSchema.safeParse(record);
    if (!parsed.success) throw AppError.badRequest(`Invalid CSV row ${index + 2}`, "INVALID_CSV_ROW", parsed.error.flatten().fieldErrors);
    return parsed.data;
  });
}

async function validateRows(rows: HandoverRow[]) {
  const errors: string[] = [];
  const resolvedRows: HandoverStoredRow[] = [];
  const validationRows: HandoverValidationRow[] = [];

  for (const [index, row] of rows.entries()) {
    const rowNo = index + 2; // matches CSV line numbers (header is line 1)
    const [officeId, members] = await Promise.all([
      repository.findOfficeByName(row.office),
      repository.findMembersByIdentity(row.name, row.academicLevel, row.subgroup),
    ]);
    if (!officeId) errors.push(`Row ${rowNo}: unknown office "${row.office}"`);

    const candidates = members.map((member) => ({
      name: row.name,
      academicLevel: row.academicLevel,
      subgroup: row.subgroup,
      department: member.department,
    }));

    let result: HandoverValidationRow["result"];
    if (members.length === 0) {
      result = "NOT_FOUND";
      errors.push(`Row ${rowNo}: no member found for "${row.name}"`);
    } else if (members.length > 1) {
      result = "AMBIGUOUS";
      errors.push(`Row ${rowNo}: more than one member matches "${row.name}"`);
    } else if (members[0].accountStatus !== "Active" || members[0].membershipStatus !== "Active Student") {
      result = "INACTIVE";
      errors.push(`Row ${rowNo}: "${row.name}" is not an active member`);
    } else {
      result = "VALID";
    }

    validationRows.push({ ...row, result, ...(result === "AMBIGUOUS" ? { candidates } : {}) });
    resolvedRows.push({ ...row, memberId: result === "VALID" ? members[0].id : null, officeId });
  }

  const seenAssignments = new Map<string, number>();
  const seenMembers = new Map<string, number>();
  const seenOffices = new Map<string, number>();
  resolvedRows.forEach((row, index) => {
    if (!row.memberId || !row.officeId) return;
    const rowNo = index + 2;
    const assignmentKey = `${row.memberId}:${row.officeId}`;
    const sameAssignment = seenAssignments.get(assignmentKey);
    const sameMember = seenMembers.get(row.memberId);
    const sameOffice = seenOffices.get(row.officeId);
    if (sameAssignment !== undefined) errors.push(`Row ${rowNo}: Duplicate assignment, repeats row ${sameAssignment}`);
    else if (sameMember !== undefined) errors.push(`Row ${rowNo}: Conflicting multiple-office assignment, same member as row ${sameMember}`);
    else if (sameOffice !== undefined) errors.push(`Row ${rowNo}: Invalid office cardinality, office "${row.office}" already assigned in row ${sameOffice}`);
    if (!seenAssignments.has(assignmentKey)) seenAssignments.set(assignmentKey, rowNo);
    if (!seenMembers.has(row.memberId)) seenMembers.set(row.memberId, rowNo);
    if (!seenOffices.has(row.officeId)) seenOffices.set(row.officeId, rowNo);
  });
  if (!seenOffices.has("president")) errors.push("Exactly one incoming president assignment is required");

  return { validationErrors: [...new Set(errors)], parsedRows: resolvedRows, rows: validationRows };
}

function toPublicHandover<T extends { parsedRows: unknown }>(row: T) {
  const { parsedRows: _parsedRows, ...publicRow } = row;
  return publicRow;
}

export async function submit(csvContent: string, submittedBy: string) {
  const rows = parseCsv(csvContent);
  const result = await validateRows(rows);
  const draft = await repository.createDraft({ submittedBy, csvContent, parsedRows: result.parsedRows, validationErrors: result.validationErrors });
  const { parsedRows: _parsedRows, ...publicDraft } = draft;
  return { ...publicDraft, rows: result.rows };
}

export async function getById(id: string) {
  const row = await repository.findById(id);
  return row ? toPublicHandover(row) : null;
}

export async function list() {
  return (await repository.list()).map(toPublicHandover);
}

export async function approve(id: string, approverId: string) {
  return db.transaction(async (tx) => {
    const request = await repository.findById(id);
    if (!request) throw AppError.notFound("Handover not found", "HANDOVER_NOT_FOUND");
    if (request.status !== "Validated") throw AppError.conflict("Only a validated handover can be approved", "HANDOVER_NOT_VALIDATED");
    const updated = await repository.markApproved(tx, id, approverId);
    if (!updated) throw AppError.conflict("Handover is no longer validated", "HANDOVER_NOT_VALIDATED");
    await recordAudit({ actorId: approverId, action: "handover.approved", targetType: "handover", targetId: id, metadata: { rows: request.parsedRows } }, tx);
    return toPublicHandover(updated);
  });
}

export async function publish(id: string, publisherId: string) {
  return db.transaction(async (tx) => {
    const request = await repository.findById(id);
    if (!request) throw AppError.notFound("Handover not found", "HANDOVER_NOT_FOUND");
    if (request.status !== "Approved") throw AppError.conflict("Only an approved handover can be published", "HANDOVER_NOT_APPROVED");
    const resolvedRows = request.parsedRows.filter((row): row is ResolvedHandoverRow => Boolean(row.memberId && row.officeId));
    const memberIds = [...new Set(resolvedRows.map((row) => row.memberId))];
    const activeMemberIds = await repository.findActiveMemberIds(tx, memberIds);
    if (activeMemberIds.length !== memberIds.length) {
      throw AppError.conflict("Handover contains an inactive member", "HANDOVER_MEMBER_INACTIVE");
    }
    const updated = await repository.publish(tx, id, resolvedRows);
    if (!updated) throw AppError.conflict("Handover is no longer approved", "HANDOVER_NOT_APPROVED");
    await recordAudit({ actorId: publisherId, action: "handover.published", targetType: "handover", targetId: id, metadata: { rows: request.parsedRows } }, tx);
    return toPublicHandover(updated);
  });
}