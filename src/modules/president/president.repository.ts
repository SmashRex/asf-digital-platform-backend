import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { academicSessions, departments, events, executiveOffices, userAcademicHistory, userExecutiveOffices, users } from "../../db/schema/index.js";
import type { AnalyticsQuery, RosterQuery } from "./president.validation.js";

function rosterConditions(query: RosterQuery) {
  const conditions = [eq(users.accountStatus, "Active")];
  if (query.search) {
    const pattern = `%${query.search}%`;
    conditions.push(or(ilike(users.name, pattern), ilike(users.email, pattern))!);
  }
  if (query.academicLevel) conditions.push(eq(users.academicLevel, query.academicLevel));
  if (query.subgroup) conditions.push(eq(users.subgroup, query.subgroup));
  if (query.departmentId) conditions.push(eq(users.departmentId, query.departmentId));
  if (query.office) {
    conditions.push(inArray(users.id, db.select({ userId: userExecutiveOffices.userId }).from(userExecutiveOffices).where(eq(userExecutiveOffices.officeId, query.office))));
  }
  return and(...conditions);
}

export async function officeExists(id: string) {
  const row = await db.select({ id: executiveOffices.id }).from(executiveOffices).where(eq(executiveOffices.id, id)).limit(1);
  return row.length > 0;
}

export async function departmentExists(id: string) {
  const row = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, id)).limit(1);
  return row.length > 0;
}

export async function listRoster(query: RosterQuery) {
  const conditions = rosterConditions(query);
  const offset = (query.page - 1) * query.limit;
  const [rows, totalRows] = await Promise.all([
    db.select({
      id: users.id, name: users.name, department: departments.name, departmentId: users.departmentId,
      academicLevel: users.academicLevel, membershipStatus: users.membershipStatus, subgroup: users.subgroup, avatarUrl: users.avatarUrl,
    }).from(users).leftJoin(departments, eq(users.departmentId, departments.id)).where(conditions).orderBy(asc(users.name)).limit(query.limit).offset(offset),
    db.select({ total: count() }).from(users).where(conditions),
  ]);
  const ids = rows.map((row) => row.id);
  const offices = ids.length === 0 ? [] : await db.select({ userId: userExecutiveOffices.userId, id: executiveOffices.id, name: executiveOffices.name })
    .from(userExecutiveOffices).innerJoin(executiveOffices, eq(userExecutiveOffices.officeId, executiveOffices.id)).where(inArray(userExecutiveOffices.userId, ids));
  const officesByUser = new Map<string, { id: string; name: string }[]>();
  for (const office of offices) officesByUser.set(office.userId, [...(officesByUser.get(office.userId) ?? []), { id: office.id, name: office.name }]);
  return { rows: rows.map((row) => ({ ...row, executiveOffices: officesByUser.get(row.id) ?? [] })), total: Number(totalRows[0]?.total ?? 0) };
}

function analyticsConditions(query: AnalyticsQuery) {
  const conditions = [eq(users.accountStatus, "Active")];
  if (query.subgroup) conditions.push(eq(users.subgroup, query.subgroup));
  if (query.office) conditions.push(inArray(users.id, db.select({ userId: userExecutiveOffices.userId }).from(userExecutiveOffices).where(eq(userExecutiveOffices.officeId, query.office))));
  if (query.academicSession) conditions.push(inArray(users.id, db.select({ userId: userAcademicHistory.userId }).from(userAcademicHistory).where(eq(userAcademicHistory.academicSessionId, query.academicSession))));
  return and(...conditions);
}

export async function getAnalytics(query: AnalyticsQuery) {
  const conditions = analyticsConditions(query);
  const [total, subgroupDistribution, academicLevelDistribution, officeDistribution, eventCount] = await Promise.all([
    db.select({ count: count() }).from(users).where(conditions),
    db.select({ value: users.subgroup, count: count() }).from(users).where(conditions).groupBy(users.subgroup),
    db.select({ value: users.academicLevel, count: count() }).from(users).where(conditions).groupBy(users.academicLevel),
    db.select({ value: executiveOffices.id, name: executiveOffices.name, count: count() }).from(userExecutiveOffices).innerJoin(executiveOffices, eq(userExecutiveOffices.officeId, executiveOffices.id)).where(inArray(userExecutiveOffices.userId, db.select({ id: users.id }).from(users).where(conditions))).groupBy(executiveOffices.id, executiveOffices.name),
    db.select({ count: count() }).from(events),
  ]);
  return {
    totalMembers: Number(total[0]?.count ?? 0),
    subgroupDistribution: subgroupDistribution.map((row) => ({ value: row.value, count: Number(row.count) })),
    academicLevelDistribution: academicLevelDistribution.map((row) => ({ value: row.value, count: Number(row.count) })),
    officeDistribution: officeDistribution.map((row) => ({ id: row.value, name: row.name, count: Number(row.count) })),
    eventCount: Number(eventCount[0]?.count ?? 0),
  };
}