import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, create, publish } from "./announcements.controller.js";

export const announcementsRouter = Router();

announcementsRouter.get("/", requireAuth, list);
announcementsRouter.post("/", requireAuth, requirePermission("announcements.publish"), create);
announcementsRouter.patch("/:id/publish", requireAuth, requirePermission("announcements.publish"), publish);