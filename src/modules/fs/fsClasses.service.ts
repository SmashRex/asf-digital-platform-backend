import { AppError } from "../../errors/appError.js";
import * as repo from "./fsClasses.repository.js";
import type { CreateClassInput, UpdateClassInput, TeacherActionInput } from "./fsClasses.validation.js";

export async function createClass(input: CreateClassInput, createdBy: string) {
  return repo.createClass({ ...input, createdBy });
}

export async function getClasses() {
  return repo.listClasses();
}

export async function updateClass(id: string, input: UpdateClassInput) {
  const existing = await repo.findById(id);
  if (!existing) {
    throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
  }
  return repo.updateClass(id, input);
}

export async function manageTeacher(classId: string, input: TeacherActionInput) {
  const fsClass = await repo.findById(classId);
  if (!fsClass) {
    throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
  }

  if (input.action === "assign") {
    if (fsClass.teacherCap !== null) {
      const current = await repo.countTeachers(classId);
      if (current >= fsClass.teacherCap) {
        throw AppError.conflict("This class has reached its teacher limit", "TEACHER_CAP_REACHED");
      }
    }
    try {
      return await repo.addTeacher(classId, input.teacherId);
    } catch (err: any) {
      if (err?.cause?.code === "23505" || err?.code === "23505") {
        throw AppError.conflict("This teacher is already assigned to this class", "TEACHER_ALREADY_ASSIGNED");
      }
      throw err;
    }
  }

  await repo.removeTeacher(classId, input.teacherId);
  return { removed: true };
}

export async function getRosterExport(classId: string) {
  const fsClass = await repo.findById(classId);
  if (!fsClass) {
    throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
  }
  const roster = await repo.getRoster(classId);

  const teacherNames = roster.teachers.map((t) => t.teacherName).join(", ") || "No teachers assigned";
  const lines = [
    `Class: ${fsClass.name}`,
    `Teachers: ${teacherNames}`,
    "",
    "Student Name,Email,Level,Status",
    ...roster.students.map((s) => `${s.studentName},${s.studentEmail},${s.studentLevel},${s.status}`),
  ];
  return lines.join("\n");
}