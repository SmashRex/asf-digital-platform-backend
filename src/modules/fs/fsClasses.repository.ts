import { db } from "../../db/index.js";
import { fsClasses, fsClassTeachers } from "../../db/schema/index.js";
import { eq, and, desc } from "drizzle-orm";
import { users, fsStudents } from "../../db/schema/index.js";


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

export async function findById(id: string) {
  const rows = await db.select().from(fsClasses).where(eq(fsClasses.id, id));
  return rows[0] ?? null;
}

export async function listClasses() {
  return db.select().from(fsClasses).orderBy(desc(fsClasses.createdAt));
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
  await db.delete(fsClassTeachers).where(and(eq(fsClassTeachers.classId, classId), eq(fsClassTeachers.teacherId, teacherId)));
}


export async function getRoster(classId: string) {
  const students = await db
    .select({
      studentName: users.name,
      studentEmail: users.email,
      studentLevel: users.academicLevel,
      status: fsStudents.status,
    })
    .from(fsStudents)
    .innerJoin(users, eq(fsStudents.userId, users.id))
    .where(eq(fsStudents.classId, classId));

  const teacherRows = await db
    .select({ teacherName: users.name, teacherEmail: users.email })
    .from(fsClassTeachers)
    .innerJoin(users, eq(fsClassTeachers.teacherId, users.id))
    .where(eq(fsClassTeachers.classId, classId));

  return { students, teachers: teacherRows };
}