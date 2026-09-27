import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireDashboardAccess } from "../../middleware/requireDashboardAccess.js";
import { approve, get, publish, submit } from "./handover.controller.js";

export const handoverRouter = Router();
const presidentHandoverAccess = [requireAuth, requireDashboardAccess("president")];
handoverRouter.post("/president/handovers", ...presidentHandoverAccess, submit);
handoverRouter.get("/president/handovers/:id", ...presidentHandoverAccess, get);
handoverRouter.post("/president/handovers/:id/approve", ...presidentHandoverAccess, approve);
handoverRouter.post("/president/handovers/:id/publish", ...presidentHandoverAccess, publish);