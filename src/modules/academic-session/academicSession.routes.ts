import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, create, activateAndProgressHandler } from "./academicSession.controller.js";

export const academicSessionRouter = Router();

academicSessionRouter.get("/", requireAuth, requirePermission("academic.rollover"), list);
academicSessionRouter.post("/", requireAuth, requirePermission("academic.rollover"), create);
academicSessionRouter.post("/:id/activate-and-progress", requireAuth, requirePermission("academic.rollover"), activateAndProgressHandler);