import { AppError } from "../../errors/appError.js";
import * as repo from "./fsTeachers.repository.js";
import type { ListEligibleTeachersQuery } from "./fsTeachers.validation.js";

export async function getEligibleTeachers(query: ListEligibleTeachersQuery) {
  return repo.listEligible(query);
}

export async function getAssignedTeachers() {
  const rows = await repo.listAssignedRows();
  const byTeacher = new Map<string, {
    id: string; name: string; email: string; phone: string | null; academicLevel: string; subgroup: string | null;
    classes: { classId: string; className: string; status: string }[];
  }>();
  for (const row of rows) {
    let teacher = byTeacher.get(row.id);
    if (!teacher) {
      teacher = {
        id: row.id, name: row.name, email: row.email, phone: row.phone,
        academicLevel: row.academicLevel, subgroup: row.subgroup, classes: [],
      };
      byTeacher.set(row.id, teacher);
    }
    teacher.classes.push({ classId: row.classId, className: row.className, status: row.classStatus });
  }
  return [...byTeacher.values()];
}

// A teacher must be an existing, active account that belongs to a subgroup.
export async function assertEligibleTeacher(teacherId: string) {
  const candidate = await repo.findTeacherCandidate(teacherId);
  if (!candidate) {
    throw AppError.badRequest("This user cannot be a teacher", "TEACHER_NOT_ELIGIBLE", { reason: "NOT_FOUND" });
  }
  if (candidate.accountStatus !== "Active") {
    throw AppError.badRequest("This user cannot be a teacher", "TEACHER_NOT_ELIGIBLE", { reason: "NOT_ACTIVE" });
  }
  if (candidate.subgroup === null) {
    throw AppError.badRequest("This user cannot be a teacher", "TEACHER_NOT_ELIGIBLE", { reason: "NO_SUBGROUP" });
  }
}