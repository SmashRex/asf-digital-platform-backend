import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { list, detail, exportCsv, withdraw } from "./fsStudents.controller.js";

export const fsStudentsRouter = Router();

const vpAccess = [requireAuth, requireOffice("vice-president")];

fsStudentsRouter.get("/", ...vpAccess, list);
// "/export" must stay above "/:id" so it is not read as a student id.
fsStudentsRouter.get("/export", ...vpAccess, exportCsv);
fsStudentsRouter.get("/:id", ...vpAccess, detail);
fsStudentsRouter.patch("/:id/withdraw", ...vpAccess, withdraw);