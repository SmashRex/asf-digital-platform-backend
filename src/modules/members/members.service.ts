import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import * as repo from "./members.repository.js";
import type { AcademicLevelOverrideInput } from "./members.validation.js";

export async function overrideAcademicLevel(
  targetUserId: string,
  input: AcademicLevelOverrideInput,
  actingUserId: string
) {
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }

  const activeSession = await repo.getActiveSession();
  if (!activeSession) {
    throw AppError.internal("No active academic session is configured", "NO_ACTIVE_SESSION");
  }

  const newMembershipStatus = input.newLevel === "Alumni" ? "Alumni" : "Active Student";

  return db.transaction(async (tx) => {
  await repo.applyOverride(
    tx,
    targetUserId,
    input.newLevel,
    newMembershipStatus,
    activeSession.id,
    input.overrideReason,
    actingUserId
  );
  return repo.findUserByIdTx(tx, targetUserId);
});
}

