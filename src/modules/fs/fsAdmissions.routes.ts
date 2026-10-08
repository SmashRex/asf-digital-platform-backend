import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireOffice } from "../../middleware/requireOffice.js";
import { apply, list, review } from "./fsAdmissions.controller.js";

export const fsAdmissionsRouter = Router();

const vpAccess = [requireAuth, requireOffice("vice-president")];

fsAdmissionsRouter.post("/", requireAuth, apply);
fsAdmissionsRouter.get("/admin", ...vpAccess, list);
fsAdmissionsRouter.patch("/admin/:id/review", ...vpAccess, review);