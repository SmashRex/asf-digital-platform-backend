import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { list, recordCompletion, withdraw, bulkGraduate, uploadMiddleware } from "./fsStudents.controller.js";

export const fsStudentsRouter = Router();

const vpAccess = [requireAuth, requireOffice("vice-president")];

fsStudentsRouter.get("/", ...vpAccess, list);
fsStudentsRouter.patch("/:id/record-completion", ...vpAccess, recordCompletion);
fsStudentsRouter.patch("/:id/withdraw", ...vpAccess, withdraw);
fsStudentsRouter.post("/bulk-graduate", ...vpAccess, uploadMiddleware, bulkGraduate);