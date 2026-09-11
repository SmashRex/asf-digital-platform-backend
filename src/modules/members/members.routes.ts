import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { overrideLevel, list,updateRole, updateStatus } from "./members.controller.js";

export const membersRouter = Router();

membersRouter.patch("/:id/academic-level", requireAuth, requirePermission("academic.rollover"), overrideLevel);
membersRouter.get("/", requireAuth, requirePermission("members.view_directory"), list);
membersRouter.patch("/:id/role", requireAuth, requirePermission("members.edit_role"), updateRole);
membersRouter.patch("/:id/status", requireAuth, requirePermission("members.edit_status"), updateStatus);