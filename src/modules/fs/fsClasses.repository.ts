import { db } from "../../db/index.js";
import { academicSessions, fsClasses, fsClassTeachers, fsStudents, users } from "../../db/schema/index.js";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import type { ListClassesQuery } from "./fsClasses.validation.js";

export async function createClass(input: {
  name: string;
  description?: string | null;
  academicSessionId: string;
  semester: string;
  teacherCap?: number | null;
  createdBy: string;
}) {
  const [row] = await db.insert(fsClasses).values(input).returning();
  return row;
}

export async function sessionExists(id: string) {
  const row = await db.query.academicSessions.findFirst({ where: eq(academicSessions.id, id) });
  return Boolean(row);
}

export async function findById(id: string) {
  const rows = await db.select().from(fsClasses).where(eq(fsClasses.id, id));
  return rows[0] ?? null;
}

export async function listClasses(filters: ListClassesQuery) {
  const conditions = [];
  if (filters.status) conditions.push(eq(fsClasses.status, filters.status));
  if (filters.academicSessionId) conditions.push(eq(fsClasses.academicSessionId, filters.academicSessionId));

  return db
    .select({
      id: fsClasses.id,
      name: fsClasses.name,
      description: fsClasses.description,
      academicSessionId: fsClasses.academicSessionId,
      semester: fsClasses.semester,
      teacherCap: fsClasses.teacherCap,
      manualVisible: fsClasses.manualVisible,
      status: fsClasses.status,
      createdBy: fsClasses.createdBy,
      createdAt: fsClasses.createdAt,
      updatedAt: fsClasses.updatedAt,
      teacherCount: sql<number>`(select count(*)::int from "fs_class_teachers" t where t."class_id" = "fs_classes"."id")`,
      activeStudentCount: sql<number>`(select count(*)::int from "fs_students" s where s."class_id" = "fs_classes"."id" and s."status" = 'Active')`,
    })
    .from(fsClasses)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(fsClasses.createdAt));
}

export async function updateClass(
  id: string,
  input: Partial<{
    name: string;
    description: string | null;
    manualVisible: boolean;
    teacherCap: number | null;
    status: string;
  }>
) {
  const [row] = await db
    .update(fsClasses)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(fsClasses.id, id))
    .returning();
  return row;
}

export async function countTeachers(classId: string) {
  const rows = await db.select().from(fsClassTeachers).where(eq(fsClassTeachers.classId, classId));
  return rows.length;
}

export async function addTeacher(classId: string, teacherId: string) {
  const [row] = await db.insert(fsClassTeachers).values({ classId, teacherId }).returning();
  return row;
}

export async function removeTeacher(classId: string, teacherId: string) {
  return db
    .delete(fsClassTeachers)
    .where(and(eq(fsClassTeachers.classId, classId), eq(fsClassTeachers.teacherId, teacherId)))
    .returning({ id: fsClassTeachers.id });
}

export async function getRoster(classId: string) {
  const students = await db
    .select({
      id: fsStudents.id,
      userId: fsStudents.userId,
      studentName: users.name,
      studentEmail: users.email,
      studentPhone: users.phoneNumber,
      academicLevel: users.academicLevel,
      status: fsStudents.status,
    })
    .from(fsStudents)
    .innerJoin(users, eq(fsStudents.userId, users.id))
    .where(eq(fsStudents.classId, classId))
    .orderBy(asc(users.name));

  const teachers = await db
    .select({
      teacherId: users.id,
      teacherName: users.name,
      teacherEmail: users.email,
      teacherPhone: users.phoneNumber,
      subgroup: users.subgroup,
    })
    .from(fsClassTeachers)
    .innerJoin(users, eq(fsClassTeachers.teacherId, users.id))
    .where(eq(fsClassTeachers.classId, classId))
    .orderBy(asc(users.name));

  return { students, teachers };
}