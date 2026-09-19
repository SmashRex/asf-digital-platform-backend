import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { getHealth, getPulse } from "./system.controller.js";

export const systemRouter = Router();

systemRouter.get("/health", requireAuth, requirePermission("system.logs.view"), getHealth);
systemRouter.get("/pulse", requireAuth, requirePermission("system.logs.view"), getPulse);