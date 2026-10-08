import { AppError } from "../../errors/appError.js";
import * as repo from "./fsAdmissions.repository.js";
import * as usersRepo from "../users/users.repository.js";
import { db } from "../../db/index.js";
import * as studentsRepo from "./fsStudents.repository.js";
import * as classesRepo from "./fsClasses.repository.js";
import type { ListAdmissionsQuery } from "./fsAdmissions.validation.js";

const ADMISSION_STATUSES = ["Pending", "Approved", "Rejected"];

function isUniqueViolation(err: any) {
  return err?.cause?.code === "23505" || err?.code === "23505";
}

export async function applyForFs(userId: string, testimony?: string | null) {
  const user = await usersRepo.getProfile(userId);
  if (!user) {
    throw AppError.notFound("User not found", "USER_NOT_FOUND");
  }
  if (user.subgroup !== null) {
    throw AppError.forbidden(
      "You already belong to a subgroup and are not eligible for Foundational School",
      "ALREADY_IN_SUBGROUP"
    );
  }

  const activeStudent = await studentsRepo.findActiveByUser(userId);
  if (activeStudent) {
    throw AppError.conflict(
      "You are already an active Foundational School student",
      "ALREADY_FS_STUDENT"
    );
  }

  const pending = await repo.findPendingByUser(userId);
  if (pending) {
    throw AppError.conflict(
      "You already have a pending Foundational Schoolapplication",
      "ADMISSION_ALREADY_PENDING"
    );
  }

  return repo.createAdmission({ userId, testimony });
}

export async function getAdmissions(query: ListAdmissionsQuery) {
  if (query.status && !ADMISSION_STATUSES.includes(query.status)) {
    throw AppError.badRequest("Invalid status filter", "INVALID_STATUS_FILTER");
  }
  return repo.listAdmissions(query);
}

export async function reviewAdmission(
  admissionId: string,
  reviewerId: string,
  input: { action: "approve" | "reject"; classId?: string; notes?: string | null }
) {
  const admission = await repo.findById(admissionId);
  if (!admission) {
    throw AppError.notFound("Admission not found", "ADMISSION_NOT_FOUND");
  }
  if (admission.status !== "Pending") {
    throw AppError.conflict("This admission has already been reviewed", "ALREADY_REVIEWED");
  }

  if (input.action === "approve") {
    if (!input.classId) {
      throw AppError.badRequest("classId is required to approve an admission", "CLASS_REQUIRED");
    }
    const fsClass = await classesRepo.findById(input.classId);
    if (!fsClass) {
      throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
    }
    if (fsClass.status !== "Active") {
      throw AppError.conflict("This class is not active", "CLASS_NOT_ACTIVE");
    }

    try {
      return await db.transaction(async (tx) => {
        const updated = await repo.approveAdmission(
          admissionId,
          { reviewedBy: reviewerId, classId: input.classId!, notes: input.notes },
          tx
        );
        if (!updated) {
          throw AppError.conflict("This admission has already been reviewed", "ALREADY_REVIEWED");
        }
        await studentsRepo.createStudent(
          { userId: admission.userId, classId: input.classId!, admissionId },
          tx
        );
        return updated;
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw AppError.conflict(
          "This applicant is already an active Foundational School student",
          "ALREADY_FS_STUDENT"
        );
      }
      throw err;
    }
  }

  const rejected = await repo.rejectAdmission(admissionId, { reviewedBy: reviewerId, notes: input.notes });
  if (!rejected) {
    throw AppError.conflict("This admission has already been reviewed", "ALREADY_REVIEWED");
  }
  return rejected;
}