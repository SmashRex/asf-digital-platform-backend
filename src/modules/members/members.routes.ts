import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { overrideLevel } from "./members.controller.js";

export const membersRouter = Router();

membersRouter.patch("/:id/academic-level", requireAuth, requirePermission("academic.rollover"), overrideLevel);