import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, create, update, cancel } from "./events.controller.js";

export const eventsRouter = Router();

eventsRouter.get("/", requireAuth, list);
eventsRouter.post("/", requireAuth, requirePermission("events.create_edit"), create);
eventsRouter.put("/:id", requireAuth, requirePermission("events.create_edit"), update);
eventsRouter.patch("/:id/cancel", requireAuth, requirePermission("events.create_edit"), cancel);