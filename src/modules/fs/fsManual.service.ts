import { fileTypeFromBuffer } from "file-type";
import { AppError } from "../../errors/appError.js";
import { hasOffice } from "../authorization/authorization.repository.js";
import * as repo from "./fsManual.repository.js";
import * as studentsRepo from "./fsStudents.repository.js";

export async function uploadManual(file: { originalname: string; buffer: Buffer }, uploadedBy: string) {
  const realType = await fileTypeFromBuffer(file.buffer);
  if (!realType || realType.mime !== "application/pdf") {
    throw AppError.badRequest("This file's real content is not a valid PDF", "INVALID_FILE_CONTENT");
  }
  const fileData = file.buffer.toString("base64");
  return repo.saveManual({ fileName: file.originalname, fileData, uploadedBy });
}

// The VP, active FS students and assigned teachers may open the manual. The class manualVisible flag is ignored.
export async function assertCanAccessManual(userId: string) {
  if (await hasOffice(userId, "vice-president")) return;
  const [student, teacher] = await Promise.all([
    studentsRepo.findActiveByUser(userId),
    repo.isAssignedTeacher(userId),
  ]);
  if (!student && !teacher) {
    throw AppError.forbidden("You do not have access to the FS manual", "MANUAL_ACCESS_DENIED");
  }
}

export async function getManualForDownload() {
  const manual = await repo.getManual();
  if (!manual) {
    throw AppError.notFound("No FS manual has been uploaded yet", "MANUAL_NOT_FOUND");
  }
  return manual;
}

export async function getManualInfo() {
  const info = await repo.getManualInfo();
  if (!info) {
    throw AppError.notFound("No FS manual has been uploaded yet", "MANUAL_NOT_FOUND");
  }
  return info;
}