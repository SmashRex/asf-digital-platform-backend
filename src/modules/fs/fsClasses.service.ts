import { AppError } from "../../errors/appError.js";
import * as repo from "./fsClasses.repository.js";
import * as teachersRepo from "./fsTeachers.repository.js";
import { assertEligibleTeacher } from "./fsTeachers.service.js";
import { csvCell } from "../../utils/csvCell.js";
import type { CreateClassInput, UpdateClassInput, TeacherActionInput, ListClassesQuery } from "./fsClasses.validation.js";

export async function createClass(input: CreateClassInput, createdBy: string) {
  if (!(await repo.sessionExists(input.academicSessionId))) {
    throw AppError.badRequest("Academic session does not exist", "INVALID_ACADEMIC_SESSION");
  }
  return repo.createClass({ ...input, createdBy });
}

export async function getClasses(filters: ListClassesQuery) {
  return repo.listClasses(filters);
}

export async function getClassDetail(id: string) {
  const fsClass = await repo.findById(id);
  if (!fsClass) {
    throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
  }
  const roster = await repo.getRoster(id);
  return { ...fsClass, teachers: roster.teachers, students: roster.students };
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
    if (fsClass.status !== "Active") {
      throw AppError.conflict("This class is not active", "CLASS_NOT_ACTIVE");
    }
    await assertEligibleTeacher(input.teacherId);
    if (await teachersRepo.isAssigned(classId, input.teacherId)) {
      throw AppError.conflict("This teacher is already assigned to this class", "TEACHER_ALREADY_ASSIGNED");
    }
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

  const removed = await repo.removeTeacher(classId, input.teacherId);
  if (removed.length === 0) {
    throw AppError.notFound("This teacher is not assigned to this class", "TEACHER_NOT_ASSIGNED");
  }
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
    `Class: ${csvCell(fsClass.name)}`,
    `Teachers: ${csvCell(teacherNames)}`,
    "",
    "Student Name,Email,Level,Status",
    ...roster.students.map((s) => [s.studentName, s.studentEmail, s.academicLevel, s.status].map(csvCell).join(",")),
  ];
  return lines.join("\n");
}