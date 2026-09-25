import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireDashboardAccess } from "../../middleware/requireDashboardAccess.js";
import { analytics, roster } from "./president.controller.js";

export const presidentRouter = Router();
const presidentAccess = [requireAuth, requireDashboardAccess("president")];

presidentRouter.get("/roster", ...presidentAccess, roster);
presidentRouter.get("/analytics", ...presidentAccess, analytics);