import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { overrideLevel, list,updateRole, updateStatus,getById } from "./members.controller.js";

export const membersRouter = Router();

membersRouter.patch("/:id/academic-level", requireAuth, requirePermission("academic.rollover"), overrideLevel);
membersRouter.get("/", requireAuth, requirePermission("members.view_directory"), list);
membersRouter.patch("/:id/role", requireAuth, requirePermission("members.edit_role"), updateRole);
membersRouter.patch("/:id/status", requireAuth, requirePermission("members.edit_status"), updateStatus);
membersRouter.get("/:id", requireAuth, requirePermission("members.view_directory"), getById);
membersRouter.patch("/:id/reset-password", requireAuth, requirePermission("members.edit_status"), resetPassword);