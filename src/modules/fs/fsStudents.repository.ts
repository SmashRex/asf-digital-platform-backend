import { db } from "../../db/index.js";
import { departments, fsAdmissions, fsClasses, fsStudents, users } from "../../db/schema/index.js";
import { eq, and, asc, desc, ilike, count } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";
import type { ExportStudentsQuery, ListStudentsQuery } from "./fsStudents.validation.js";

export async function createStudent(
  data: { userId: string; classId: string; admissionId: string },
  tx: Transaction | typeof db = db
) {
  const [student] = await tx.insert(fsStudents).values(data).returning();
  return student;
}

export async function findById(id: string) {
  const rows = await db.select().from(fsStudents).where(eq(fsStudents.id, id));
  return rows[0] ?? null;
}

export async function findActiveByUser(userId: string) {
  const rows = await db
    .select({ id: fsStudents.id })
    .from(fsStudents)
    .where(and(eq(fsStudents.userId, userId), eq(fsStudents.status, "Active")));
  return rows[0] ?? null;
}

function buildConditions(filters: ExportStudentsQuery) {
  const conditions = [];
  if (filters.classId) conditions.push(eq(fsStudents.classId, filters.classId));
  if (filters.status) conditions.push(eq(fsStudents.status, filters.status));
  if (filters.search) conditions.push(ilike(users.name, `%${filters.search}%`));
  return conditions.length > 0 ? and(...conditions) : undefined;
}

const studentColumns = {
  id: fsStudents.id,
  userId: fsStudents.userId,
  studentName: users.name,
  studentEmail: users.email,
  studentPhone: users.phoneNumber,
  academicLevel: users.academicLevel,
  departmentName: departments.name,
  legacyDepartment: users.department,
  classId: fsStudents.classId,
  className: fsClasses.name,
  status: fsStudents.status,
  createdAt: fsStudents.createdAt,
};

function toStudentRow<T extends { departmentName: string | null; legacyDepartment: string | null }>(row: T) {
  const { departmentName, legacyDepartment, ...rest } = row;
  return { ...rest, department: departmentName ?? legacyDepartment };
}

export async function listStudents(query: ListStudentsQuery) {
  const where = buildConditions(query);
  const offset = (query.page - 1) * query.limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select(studentColumns)
      .from(fsStudents)
      .innerJoin(users, eq(fsStudents.userId, users.id))
      .innerJoin(fsClasses, eq(fsStudents.classId, fsClasses.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(where)
      .orderBy(desc(fsStudents.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(fsStudents)
      .innerJoin(users, eq(fsStudents.userId, users.id))
      .where(where),
  ]);

  return { rows: rows.map(toStudentRow), total: totalResult[0].count };
}

export async function listStudentsForExport(filters: ExportStudentsQuery) {
  const rows = await db
    .select(studentColumns)
    .from(fsStudents)
    .innerJoin(users, eq(fsStudents.userId, users.id))
    .innerJoin(fsClasses, eq(fsStudents.classId, fsClasses.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(buildConditions(filters))
    .orderBy(asc(fsClasses.name), asc(users.name));
  return rows.map(toStudentRow);
}

export async function findDetailById(id: string) {
  const rows = await db
    .select({
      ...studentColumns,
      subgroup: users.subgroup,
      admissionId: fsStudents.admissionId,
      admissionTestimony: fsAdmissions.testimony,
      admissionAppliedAt: fsAdmissions.createdAt,
      admissionReviewedAt: fsAdmissions.reviewedAt,
      admissionReviewNotes: fsAdmissions.reviewNotes,
    })
    .from(fsStudents)
    .innerJoin(users, eq(fsStudents.userId, users.id))
    .innerJoin(fsClasses, eq(fsStudents.classId, fsClasses.id))
    .innerJoin(fsAdmissions, eq(fsStudents.admissionId, fsAdmissions.id))
    .leftJoin(departments, eq(users.departmentId, departments.id))
    .where(eq(fsStudents.id, id));
  const row = rows[0];
  if (!row) return null;
  const { admissionId, admissionTestimony, admissionAppliedAt, admissionReviewedAt, admissionReviewNotes, ...student } = row;
  return {
    ...toStudentRow(student),
    admission: {
      id: admissionId,
      testimony: admissionTestimony,
      appliedAt: admissionAppliedAt,
      reviewedAt: admissionReviewedAt,
      reviewNotes: admissionReviewNotes,
    },
  };
}

export async function updateStatus(
  id: string,
  data: { status: string; completionRecordedBy?: string | null }
) {
  const [row] = await db
    .update(fsStudents)
    .set({
      status: data.status,
      completionRecordedBy: data.completionRecordedBy ?? null,
      completionRecordedAt: data.completionRecordedBy ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(fsStudents.id, id))
    .returning();
  return row;
}