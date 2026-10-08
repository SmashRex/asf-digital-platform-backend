import { db } from "../../db/index.js";
import { departments, fsAdmissions, users } from "../../db/schema/index.js";
import { eq, and, desc, ilike, count } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";
import type { ListAdmissionsQuery } from "./fsAdmissions.validation.js";

export async function createAdmission(
  input: { userId: string; testimony?: string | null },
  tx: Transaction | typeof db = db
) {
  const [admission] = await tx
    .insert(fsAdmissions)
    .values({
      userId: input.userId,
      testimony: input.testimony ?? null,
    })
    .returning();
  return admission;
}

export async function findPendingByUser(userId: string) {
  return db.query.fsAdmissions.findFirst({
    where: and(eq(fsAdmissions.userId, userId), eq(fsAdmissions.status, "Pending")),
  });
}

export async function findById(id: string) {
  return db.query.fsAdmissions.findFirst({ where: eq(fsAdmissions.id, id) });
}

export async function listAdmissions(query: ListAdmissionsQuery) {
  const conditions = [];
  if (query.status) conditions.push(eq(fsAdmissions.status, query.status));
  if (query.search) conditions.push(ilike(users.name, `%${query.search}%`));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (query.page - 1) * query.limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: fsAdmissions.id,
        userId: fsAdmissions.userId,
        applicantName: users.name,
        applicantEmail: users.email,
        applicantPhone: users.phoneNumber,
        applicantLevel: users.academicLevel,
        departmentName: departments.name,
        legacyDepartment: users.department,
        testimony: fsAdmissions.testimony,
        status: fsAdmissions.status,
        assignedClassId: fsAdmissions.assignedClassId,
        reviewedBy: fsAdmissions.reviewedBy,
        reviewedAt: fsAdmissions.reviewedAt,
        reviewNotes: fsAdmissions.reviewNotes,
        createdAt: fsAdmissions.createdAt,
      })
      .from(fsAdmissions)
      .innerJoin(users, eq(fsAdmissions.userId, users.id))
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(where)
      .orderBy(desc(fsAdmissions.createdAt))
      .limit(query.limit)
      .offset(offset),
    db
      .select({ count: count() })
      .from(fsAdmissions)
      .innerJoin(users, eq(fsAdmissions.userId, users.id))
      .where(where),
  ]);

  return {
    rows: rows.map(({ departmentName, legacyDepartment, ...row }) => ({
      ...row,
      department: departmentName ?? legacyDepartment,
    })),
    total: totalResult[0].count,
  };
}

// Only a Pending admission can be approved. Returns null if it was already reviewed.
export async function approveAdmission(
  admissionId: string,
  data: { reviewedBy: string; classId: string; notes?: string | null },
  tx: Transaction | typeof db = db
) {
  const [admission] = await tx
    .update(fsAdmissions)
    .set({
      status: "Approved",
      assignedClassId: data.classId,
      reviewedBy: data.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(fsAdmissions.id, admissionId), eq(fsAdmissions.status, "Pending")))
    .returning();
  return admission ?? null;
}

// Only a Pending admission can be rejected. Returns null if it was already reviewed.
export async function rejectAdmission(
  admissionId: string,
  data: { reviewedBy: string; notes?: string | null },
  tx: Transaction | typeof db = db
) {
  const [admission] = await tx
    .update(fsAdmissions)
    .set({
      status: "Rejected",
      reviewedBy: data.reviewedBy,
      reviewedAt: new Date(),
      reviewNotes: data.notes ?? null,
      updatedAt: new Date(),
    })
    .where(and(eq(fsAdmissions.id, admissionId), eq(fsAdmissions.status, "Pending")))
    .returning();
  return admission ?? null;
}

