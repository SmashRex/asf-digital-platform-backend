import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import { getProgressionRule } from "../../config/progressionRules.config.js";
import * as repo from "./academicSession.repository.js";
import type { CreateSessionInput } from "./academicSession.validation.js";

export async function createNewSession(input: CreateSessionInput) {
  const existing = await repo.findSessionById(input.id);
  if (existing) {
    throw AppError.conflict("An academic session with this ID already exists", "SESSION_ALREADY_EXISTS");
  }
  return repo.createSession(input);
}

export async function activateAndProgress(sessionId: string) {
  const targetSession = await repo.findSessionById(sessionId);
  if (!targetSession) {
    throw AppError.notFound("Academic session not found", "SESSION_NOT_FOUND");
  }
  if (targetSession.isActive) {
    throw AppError.conflict("This session is already active", "SESSION_ALREADY_ACTIVE");
  }

  return db.transaction(async (tx) => {
    const students = await repo.getActiveStudents(tx);

    let promotedCount = 0;
    let graduatedCount = 0;

    for (const student of students) {
      const rule = getProgressionRule(student.academicLevel, student.programDurationYears);

      await repo.progressUser(tx, student.id, rule.targetLevel, rule.targetMembershipStatus);

      const historyStatus = rule.targetMembershipStatus === "Alumni" ? "Graduated" : "Promoted";
      await repo.recordHistory(tx, student.id, sessionId, rule.targetLevel, historyStatus);

      if (historyStatus === "Graduated") graduatedCount++;
      else promotedCount++;
    }

    await repo.deactivateCurrentSession(tx);
    await repo.activateSession(tx, sessionId);

    return { sessionId, totalStudents: students.length, promotedCount, graduatedCount };
  });
}