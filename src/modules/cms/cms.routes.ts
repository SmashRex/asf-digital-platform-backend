import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import { getPublic, getDraft, saveDraft, publish, discard, reset } from "./cms.controller.js";

export const cmsRouter = Router();

cmsRouter.get("/website", getPublic);
cmsRouter.get("/website/draft", requireAuth, requirePermission("website.edit_draft"), getDraft);
cmsRouter.post("/website/draft", requireAuth, requirePermission("website.edit_draft"), saveDraft);
cmsRouter.post("/website/publish", requireAuth, requirePermission("website.publish"), publish);
cmsRouter.post("/website/draft/discard", requireAuth, requirePermission("website.edit_draft"), discard);
cmsRouter.post("/website/reset", requireAuth, requirePermission("website.publish"), reset);