import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requirePermission } from "../../middleware/requirePermission.js";
import {
  assignAsset,
  getPlacement,
  handleUpload,
  listAssets,
  listPlacements,
  removeAsset,
  uploadAsset,
} from "./media.controller.js";

export const mediaRouter = Router();

mediaRouter.get("/placements", listPlacements);
mediaRouter.get("/placements/:key", getPlacement);

mediaRouter.use(requireAuth, requirePermission("media.upload"));
mediaRouter.get("/assets", listAssets);
mediaRouter.post("/assets", handleUpload, uploadAsset);
mediaRouter.delete("/assets/:id", removeAsset);
mediaRouter.put("/placements/:key", assignAsset);
