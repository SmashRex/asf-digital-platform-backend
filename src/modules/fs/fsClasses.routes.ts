import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { create, list, update, manageTeacher, rosterExport } from "./fsClasses.controller.js";

export const fsClassesRouter = Router();

fsClassesRouter.post("/", requireAuth, requirePermission("fs.admissions.review"), create);
fsClassesRouter.get("/", requireAuth, requirePermission("fs.admissions.review"), list);
fsClassesRouter.put("/:id", requireAuth, requirePermission("fs.admissions.review"), update);
fsClassesRouter.post("/:id/teachers", requireAuth, requirePermission("fs.admissions.review"), manageTeacher);
fsClassesRouter.get("/:id/roster-export", requireAuth, requirePermission("fs.admissions.review"), rosterExport);