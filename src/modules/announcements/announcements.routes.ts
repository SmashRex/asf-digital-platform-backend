import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { list, create, submitForReview, approve, requestRevision, editAfterRevision, publish, archive } from "./announcements.controller.js";

export const announcementsRouter = Router();

announcementsRouter.get("/", requireAuth, list);
announcementsRouter.post("/", requireAuth, requirePermission("announcements.publish"), create);
announcementsRouter.patch("/:id/submit-review", requireAuth, requirePermission("announcements.publish"), submitForReview);
announcementsRouter.patch("/:id/approve", requireAuth, requirePermission("announcements.publish"), approve);
announcementsRouter.patch("/:id/request-revision", requireAuth, requirePermission("announcements.publish"), requestRevision);
announcementsRouter.put("/:id", requireAuth, requirePermission("announcements.publish"), editAfterRevision);
announcementsRouter.patch("/:id/publish", requireAuth, requirePermission("announcements.publish"), publish);
announcementsRouter.patch("/:id/archive", requireAuth, requirePermission("announcements.publish"), archive);