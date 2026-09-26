import { db } from "../../db/index.js";
import { AppError } from "../../errors/appError.js";
import * as repo from "./members.repository.js";
import type { AcademicLevelOverrideInput, ListMembersQuery, UpdateRoleInput, UpdateStatusInput } from "./members.validation.js";
import { users } from "../../db/schema/index.js";
import { hashPassword } from "../../utils/password.js";
import { recordAudit } from "../../utils/auditLog.js";

type UserRow = typeof users.$inferSelect;

// Never send the password hash to any client, even admins.
function withoutPasswordHash(user: UserRow | null | undefined) {
  if (!user) return user;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

function toMemberView(user: UserRow, canViewPrivate: boolean): PublicMemberView | PrivateMemberView {
  const base: PublicMemberView = {
    id: user.id,
    name: user.name,
    department: user.department,
    departmentId: user.departmentId,
    academicLevel: user.academicLevel,
    subgroup: user.subgroup,
    membershipStatus: user.membershipStatus,
    avatarUrl: user.avatarUrl,
  };
  if (!canViewPrivate) return base;
  return { ...base, email: user.email, phoneNumber: user.phoneNumber, accountStatus: user.accountStatus, gender: user.gender };
}

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
    const updated = await repo.findUserByIdTx(tx, targetUserId);
    return withoutPasswordHash(updated);
  });
}

export interface PublicMemberView {
  id: string;
  name: string;
  department: string | null;
  departmentId: string | null;
  academicLevel: string;
  subgroup: string | null;
  membershipStatus: string;
  avatarUrl: string | null;
}

export interface PrivateMemberView extends PublicMemberView {
  email: string;
  phoneNumber: string | null;
  accountStatus: string;
  gender: string | null;
}

export async function getMemberDirectory(query: ListMembersQuery, canViewPrivate: boolean) {
  const { rows, total } = await repo.listMembers(query);
  return { data: rows.map((u) => toMemberView(u, canViewPrivate)), total };
}

export async function getMemberById(id: string, canViewPrivate: boolean) {
  const user = await repo.findUserById(id);
  if (!user) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }
  return toMemberView(user, canViewPrivate);
}

const PROTECTED_ROLES = ["President / Executive", "Technical Administrator"];

export async function updateMemberRole(
  targetUserId: string,
  input: UpdateRoleInput,
  actingUserId: string,
  actingUserRoles: string[]
) {
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }

  const role = await repo.roleExists(input.roleId);
  if (!role) {
    throw AppError.badRequest("Role does not exist", "INVALID_ROLE");
  }

  if (PROTECTED_ROLES.includes(input.roleId) && !actingUserRoles.includes("President / Executive")) {
    throw AppError.forbidden(
      "Only President / Executive can assign or remove this role",
      "PROTECTED_ROLE_REQUIRES_PRESIDENT"
    );
  }

  if (targetUserId === actingUserId && PROTECTED_ROLES.includes(input.roleId)) {
    throw AppError.badRequest("You cannot change your own high-privilege role", "CANNOT_SELF_ESCALATE");
  }

  return db.transaction(async (tx) => {
    if (input.action === "assign") {
      await repo.assignRole(targetUserId, input.roleId, actingUserId, tx);
    } else {
      if (input.roleId === "Member") {
        throw AppError.badRequest("The base Member role cannot be removed", "CANNOT_REMOVE_BASE_ROLE");
      }
      await repo.removeRole(targetUserId, input.roleId, tx);
    }
    await recordAudit({
      actorId: actingUserId,
      action: `role.${input.action}`,
      targetType: "user",
      targetId: targetUserId,
      metadata: { roleId: input.roleId },
    }, tx);
    return withoutPasswordHash(await repo.findUserByIdTx(tx, targetUserId));
  });
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

  return withoutPasswordHash(updated);
}

export async function adminResetPassword(targetUserId: string, newPassword: string) {
  const targetUser = await repo.findUserById(targetUserId);
  if (!targetUser) {
    throw AppError.notFound("Member not found", "MEMBER_NOT_FOUND");
  }
  const passwordHash = await hashPassword(newPassword);
  await repo.setPasswordHash(targetUserId, passwordHash);
}

export async function changeSubgroup(userId: string, subgroup: string, actingUserId: string) {
  return db.transaction(async (tx) => {
    const updated = await repo.updateSubgroup(userId, subgroup, tx);
    await recordAudit({ actorId: actingUserId, action: "subgroup.updated", targetType: "user", targetId: userId, metadata: { subgroup } }, tx);
    return withoutPasswordHash(updated);
  });
}