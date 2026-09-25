import { AppError } from "../../errors/appError.js";
import * as repository from "./president.repository.js";
import type { AnalyticsQuery, RosterQuery } from "./president.validation.js";

async function validateKnownFilters(query: { office?: string; departmentId?: string }) {
  if (query.office && !(await repository.officeExists(query.office))) throw AppError.badRequest("Unknown executive office", "INVALID_OFFICE");
  if (query.departmentId && !(await repository.departmentExists(query.departmentId))) throw AppError.badRequest("Unknown department", "INVALID_DEPARTMENT");
}

export async function getRoster(query: RosterQuery) {
  await validateKnownFilters(query);
  const result = await repository.listRoster(query);
  return { data: result.rows, total: result.total };
}

export async function getAnalytics(query: AnalyticsQuery) {
  await validateKnownFilters(query);
  return repository.getAnalytics(query);
}