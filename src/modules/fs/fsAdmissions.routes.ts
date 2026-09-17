import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { apply, list, review } from "./fsAdmissions.controller.js";

export const fsAdmissionsRouter = Router();

fsAdmissionsRouter.post("/", requireAuth, apply);
fsAdmissionsRouter.get("/admin", requireAuth, requirePermission("fs.admissions.review"), list);
fsAdmissionsRouter.patch("/admin/:id/review", requireAuth, requirePermission("fs.admissions.review"), review);