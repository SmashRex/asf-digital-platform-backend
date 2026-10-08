import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { listEligible, listAssigned } from "./fsTeachers.controller.js";

export const fsTeachersRouter = Router();

const vpAccess = [requireAuth, requireOffice("vice-president")];

fsTeachersRouter.get("/eligible", ...vpAccess, listEligible);
fsTeachersRouter.get("/", ...vpAccess, listAssigned);