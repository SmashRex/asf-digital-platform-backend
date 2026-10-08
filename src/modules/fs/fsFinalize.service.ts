import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import { recordAudit } from "../../utils/auditLog.js";
import * as repo from "./fsFinalize.repository.js";
import type { FinalizeClassInput } from "./fsFinalize.validation.js";

type InvalidReason = "NOT_FOUND" | "NOT_IN_CLASS" | "NOT_ACTIVE" | "ALREADY_HAS_SUBGROUP";

export async function finalizeClass(classId: string, input: FinalizeClassInput, actingUserId: string) {
  return db.transaction(async (tx) => {
    const fsClass = await repo.lockClass(tx, classId);
    if (!fsClass) throw AppError.notFound("Class not found", "CLASS_NOT_FOUND");
    if (fsClass.status !== "Active") throw AppError.conflict("This class is not active", "CLASS_NOT_ACTIVE");

    const classStudents = await repo.lockClassStudents(tx, classId);
    if (!classStudents.some((student) => student.status === "Active")) {
      throw AppError.conflict("This class has no active students", "NO_ACTIVE_STUDENTS");
    }

    const graduates = input.graduates;
    if (graduates.length === 0 && !input.confirmNoGraduates) {
      throw AppError.badRequest(
        "No graduates were selected. Send confirmNoGraduates: true if nobody graduates.",
        "EMPTY_GRADUATES"
      );
    }
    if (graduates.length > 0 && input.confirmNoGraduates) {
      throw AppError.badRequest(
        "confirmNoGraduates can only be used with an empty graduates list",
        "VALIDATION_ERROR"
      );
    }

    const requested = await repo.findStudentsByIds(tx, graduates.map((g) => g.studentId));
    const requestedById = new Map(requested.map((student) => [student.id, student]));
    const eligibleUserIds = requested
      .filter((student) => student.classId === classId && student.status === "Active")
      .map((student) => student.userId);
    const subgroupByUser = new Map(
      (await repo.findUserSubgroups(tx, eligibleUserIds)).map((user) => [user.id, user.subgroup])
    );

    const invalid: { studentId: string; reason: InvalidReason }[] = [];
    for (const graduate of graduates) {
      const student = requestedById.get(graduate.studentId);
      if (!student) invalid.push({ studentId: graduate.studentId, reason: "NOT_FOUND" });
      else if (student.classId !== classId) invalid.push({ studentId: graduate.studentId, reason: "NOT_IN_CLASS" });
      else if (student.status !== "Active") invalid.push({ studentId: graduate.studentId, reason: "NOT_ACTIVE" });
      else if (subgroupByUser.get(student.userId) != null) {
        invalid.push({ studentId: graduate.studentId, reason: "ALREADY_HAS_SUBGROUP" });
      }
    }
    if (invalid.length > 0) {
      throw new AppError("Some students cannot be graduated", 409, "FINALIZE_INVALID_STUDENTS", invalid);
    }

    for (const graduate of graduates) {
      const student = requestedById.get(graduate.studentId)!;
      const graduated = await repo.graduateStudent(tx, student.id, actingUserId);
      const placed = await repo.setSubgroupIfEmpty(tx, student.userId, graduate.subgroup);
      if (!graduated || !placed) {
        throw AppError.conflict("A student changed while finalizing. Nothing was saved.", "FINALIZE_CONFLICT");
      }
      await recordAudit({
        actorId: actingUserId,
        action: "subgroup.updated",
        targetType: "user",
        targetId: student.userId,
        metadata: { subgroup: graduate.subgroup, source: "fs_finalize", classId },
      }, tx);
    }

    const notCompleted = await repo.markRemainingNotCompleted(tx, classId, graduates.map((g) => g.studentId));
    return { graduated: graduates.length, notCompleted: notCompleted.length };
  });
}