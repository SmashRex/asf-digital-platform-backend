import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { create, list, detail, update, manageTeacher, rosterExport } from "./fsClasses.controller.js";

export const fsClassesRouter = Router();

const vpAccess = [requireAuth, requireOffice("vice-president")];

fsClassesRouter.post("/", ...vpAccess, create);
fsClassesRouter.get("/", ...vpAccess, list);
fsClassesRouter.get("/:id/roster-export", ...vpAccess, rosterExport);
fsClassesRouter.get("/:id", ...vpAccess, detail);
fsClassesRouter.put("/:id", ...vpAccess, update);
fsClassesRouter.post("/:id/teachers", ...vpAccess, manageTeacher);