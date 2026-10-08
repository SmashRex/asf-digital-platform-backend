import { AppError } from "../../errors/appError.js";
import * as repo from "./fsStudents.repository.js";
import { csvCell } from "../../utils/csvCell.js";
import { STUDENT_STATUSES, type ExportStudentsQuery, type ListStudentsQuery } from "./fsStudents.validation.js";

function assertValidStatus(status?: string) {
  if (status && !(STUDENT_STATUSES as readonly string[]).includes(status)) {
    throw AppError.badRequest("Invalid status filter", "INVALID_STATUS_FILTER");
  }
}

export async function getStudents(query: ListStudentsQuery) {
  assertValidStatus(query.status);
  return repo.listStudents(query);
}

export async function getStudentDetail(id: string) {
  const student = await repo.findDetailById(id);
  if (!student) {
    throw AppError.notFound("Student not found", "STUDENT_NOT_FOUND");
  }
  return student;
}

export async function exportStudentsCsv(filters: ExportStudentsQuery) {
  assertValidStatus(filters.status);
  const rows = await repo.listStudentsForExport(filters);
  const header = ["Name", "Email", "Phone", "Level", "Department", "Class", "Status"].join(",");
  const lines = rows.map((row) =>
    [row.studentName, row.studentEmail, row.studentPhone, row.academicLevel, row.department, row.className, row.status]
      .map(csvCell)
      .join(",")
  );
  return [header, ...lines].join("\n");
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