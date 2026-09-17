import { db } from "../../db/index.js";
import { fsAdmissions, users } from "../../db/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";

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

export async function listAdmissions(status?: string) {
  const query = db
    .select({
      id: fsAdmissions.id,
      userId: fsAdmissions.userId,
      applicantName: users.name,
      applicantEmail: users.email,
      applicantLevel: users.academicLevel,
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
    .orderBy(desc(fsAdmissions.createdAt));

  if (status) {
    return query.where(eq(fsAdmissions.status, status));
  }
  return query;
}

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
    .where(eq(fsAdmissions.id, admissionId))
    .returning();
  return admission;
}

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
    .where(eq(fsAdmissions.id, admissionId))
    .returning();
  return admission;
}