import { db } from "../../db/index.js";
import { departments, fsClasses, fsClassTeachers, users } from "../../db/schema/index.js";
import { and, asc, count, eq, ilike, isNotNull } from "drizzle-orm";
import type { ListEligibleTeachersQuery } from "./fsTeachers.validation.js";

export async function findTeacherCandidate(id: string) {
  const [row] = await db
    .select({ id: users.id, accountStatus: users.accountStatus, subgroup: users.subgroup })
    .from(users)
    .where(eq(users.id, id));
  return row ?? null;
}

export async function isAssigned(classId: string, teacherId: string) {
  const rows = await db
    .select({ id: fsClassTeachers.id })
    .from(fsClassTeachers)
    .where(and(eq(fsClassTeachers.classId, classId), eq(fsClassTeachers.teacherId, teacherId)));
  return rows.length > 0;
}

// Eligible = active account that belongs to a subgroup.
export async function listEligible(query: ListEligibleTeachersQuery) {
  const conditions = [eq(users.accountStatus, "Active"), isNotNull(users.subgroup)];
  if (query.search) conditions.push(ilike(users.name, `%${query.search}%`));
  const where = and(...conditions);
  const offset = (query.page - 1) * query.limit;

  const [rows, totalResult] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        academicLevel: users.academicLevel,
        subgroup: users.subgroup,
        departmentName: departments.name,
        legacyDepartment: users.department,
        email: users.email,
        phone: users.phoneNumber,
      })
      .from(users)
      .leftJoin(departments, eq(users.departmentId, departments.id))
      .where(where)
      .orderBy(asc(users.name))
      .limit(query.limit)
      .offset(offset),
    db.select({ count: count() }).from(users).where(where),
  ]);

  return {
    rows: rows.map(({ departmentName, legacyDepartment, ...row }) => ({
      ...row,
      department: departmentName ?? legacyDepartment,
    })),
    total: totalResult[0].count,
  };
}

export async function listAssignedRows() {
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      phone: users.phoneNumber,
      academicLevel: users.academicLevel,
      subgroup: users.subgroup,
      classId: fsClasses.id,
      className: fsClasses.name,
      classStatus: fsClasses.status,
    })
    .from(fsClassTeachers)
    .innerJoin(users, eq(fsClassTeachers.teacherId, users.id))
    .innerJoin(fsClasses, eq(fsClassTeachers.classId, fsClasses.id))
    .orderBy(asc(users.name), asc(fsClasses.name));
}