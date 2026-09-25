import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, create } from "./departments.controller.js";

export const departmentsRouter = Router();

departmentsRouter.get("/", list);
departmentsRouter.post("/", requireAuth, requirePermission("members.edit_role"), create);