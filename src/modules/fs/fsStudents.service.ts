import { AppError } from "../../errors/appError.js";
import * as repo from "./fsStudents.repository.js";
import { updateSubgroup } from "../members/members.repository.js";


export async function getStudents(classId?: string) {
  return repo.listStudents(classId);
}

export async function recordCompletion(studentId: string, recordedBy: string) {
  const student = await repo.findById(studentId);
  if (!student) {
    throw AppError.notFound("Student not found", "STUDENT_NOT_FOUND");
  }
  if (student.status !== "Active") {
    throw AppError.conflict("Only active students can be marked as graduated", "STUDENT_NOT_ACTIVE");
  }
  return repo.updateStatus(studentId, { status: "Graduated", completionRecordedBy: recordedBy });
}

export async function withdrawStudent(studentId: string) {
  const student = await repo.findById(studentId);
  if (!student) {
    throw AppError.notFound("Student not found", "STUDENT_NOT_FOUND");
  }
  if (student.status !== "Active") {
    throw AppError.conflict("Only active students can be withdrawn", "STUDENT_NOT_ACTIVE");
  }
  return repo.updateStatus(studentId, { status: "Withdrawn" });
}


export async function bulkGraduate(rows: { name: string; academicLevel: string; subgroup: string }[]) {
  const results: { name: string; status: string }[] = [];

  for (const row of rows) {
    const user = await repo.findUserByNameAndLevel(row.name, row.academicLevel);
    if (!user) {
      results.push({ name: row.name, status: "NOT_FOUND" });
      continue;
    }
    await updateSubgroup(user.id, row.subgroup);
    results.push({ name: row.name, status: "UPDATED" });
  }

  return results;
}