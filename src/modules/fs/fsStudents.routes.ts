import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, recordCompletion, withdraw } from "./fsStudents.controller.js";
import { bulkGraduate, uploadMiddleware } from "./fsStudents.controller.js";

export const fsStudentsRouter = Router();

fsStudentsRouter.get("/", requireAuth, requirePermission("fs.admissions.review"), list);
fsStudentsRouter.patch("/:id/record-completion", requireAuth, requirePermission("fs.students.record_completion"), recordCompletion);
fsStudentsRouter.patch("/:id/withdraw", requireAuth, requirePermission("fs.admissions.review"), withdraw);

fsStudentsRouter.post("/bulk-graduate", requireAuth, requirePermission("fs.admissions.review"), uploadMiddleware, bulkGraduate);