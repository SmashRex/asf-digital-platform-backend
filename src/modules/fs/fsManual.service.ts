import { AppError } from "../../errors/appError.js";
import * as repo from "./fsManual.repository.js";

export async function uploadManual(file: { originalname: string; buffer: Buffer }, uploadedBy: string) {
  const fileData = file.buffer.toString("base64");
  return repo.saveManual({ fileName: file.originalname, fileData, uploadedBy });
}

export async function getManualForDownload() {
  const manual = await repo.getManual();
  if (!manual) {
    throw AppError.notFound("No FS manual has been uploaded yet", "MANUAL_NOT_FOUND");
  }
  return manual;
}

export async function isManualVisibleToUser(isFsStudent: boolean, isFsTeacher: boolean) {
  return isFsStudent || isFsTeacher;
}