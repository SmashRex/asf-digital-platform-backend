import { AppError } from "../../errors/appError.js";
import * as repo from "./fsAdmissions.repository.js";
import * as usersRepo from "../users/users.repository.js";
import { db } from "../../db/index.js";
import * as studentsRepo from "./fsStudents.repository.js";


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

  const pending = await repo.findPendingByUser(userId);
  if (pending) {
    throw AppError.conflict(
      "You already have a pending Foundational School application",
      "ADMISSION_ALREADY_PENDING"
    );
  }

  return repo.createAdmission({ userId, testimony });
}

export async function getAdmissions(status?: string) {
  if (status && !["Pending", "Approved", "Rejected"].includes(status)) {
    throw AppError.badRequest("Invalid status filter", "INVALID_STATUS_FILTER");
  }
  return repo.listAdmissions(status);
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
    return db.transaction(async (tx) => {
      const updated = await repo.approveAdmission(
        admissionId,
        { reviewedBy: reviewerId, classId: input.classId!, notes: input.notes },
        tx
      );
      await studentsRepo.createStudent(
        { userId: admission.userId, classId: input.classId!, admissionId },
        tx
      );
      return updated;
    });
  }

  return repo.rejectAdmission(admissionId, { reviewedBy: reviewerId, notes: input.notes });
}