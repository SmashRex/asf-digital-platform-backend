import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import * as repo from "./members.repository.js";
import type { AcademicLevelOverrideInput, ListMembersQuery, UpdateRoleInput, UpdateStatusInput } from "./members.validation.js";


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



export interface PublicMemberView {
  id: string;
  name: string;
  department: string;
  academicLevel: string;
  subgroup: string | null;
  membershipStatus: string;
  avatarUrl: string | null;
}

export interface PrivateMemberView extends PublicMemberView {
  email: string;
  phoneNumber: string | null;
  accountStatus: string;
}

export async function getMemberDirectory(query: ListMembersQuery, canViewPrivate: boolean) {
  const { rows, total } = await repo.listMembers(query);

  const data = rows.map((user) => {
    const base: PublicMemberView = {
      id: user.id,
      name: user.name,
      department: user.department,
      academicLevel: user.academicLevel,
      subgroup: user.subgroup,
      membershipStatus: user.membershipStatus,
      avatarUrl: user.avatarUrl,
    };

    if (!canViewPrivate) return base;

    const withPrivate: PrivateMemberView = {
      ...base,
      email: user.email,
      phoneNumber: user.phoneNumber,
      accountStatus: user.accountStatus,
    };
    return withPrivate;
  });

  return { data, total };
}

export async function updateMemberRole(targetUserId: string, input: UpdateRoleInput, actingUserId: string) {
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }

  const role = await repo.roleExists(input.roleId);
  if (!role) {
    throw AppError.badRequest("Role does not exist", "INVALID_ROLE");
  }

  if (input.action === "assign") {
    await repo.assignRole(targetUserId, input.roleId, actingUserId);
  } else {
    if (input.roleId === "Member") {
      throw AppError.badRequest("The base Member role cannot be removed", "CANNOT_REMOVE_BASE_ROLE");
    }
    await repo.removeRole(targetUserId, input.roleId);
  }

  return repo.findUserById(targetUserId);
}

export async function updateMemberStatus(targetUserId: string, input: UpdateStatusInput, actingUserId: string) {
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }

  if (targetUserId === actingUserId) {
    throw AppError.badRequest("You cannot change your own account status", "CANNOT_SELF_MODIFY");
  }

  const updated = await repo.updateAccountStatus(targetUserId, input.accountStatus);

  if (input.accountStatus !== "Active") {
    await repo.revokeAllUserSessions(targetUserId);
  }

  return updated;
}