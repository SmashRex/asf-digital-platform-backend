import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireDashboardAccess } from "../../middleware/requireDashboardAccess.js";
import { AppError } from "../../errors/appError.js";
import { approve, get, publish, submit } from "./handover.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === "text/csv" || file.mimetype === "application/vnd.ms-excel" || file.originalname.toLowerCase().endsWith(".csv")) return callback(null, true);
    callback(AppError.badRequest("Only CSV files are accepted", "INVALID_CSV_FILE"));
  },
});

export const handoverRouter = Router();
const presidentHandoverAccess = [requireAuth, requireDashboardAccess("president")];
handoverRouter.post("/president/handovers", ...presidentHandoverAccess, upload.single("file"), submit);
handoverRouter.get("/president/handovers/:id", ...presidentHandoverAccess, get);
handoverRouter.post("/president/handovers/:id/approve", ...presidentHandoverAccess, approve);
handoverRouter.post("/president/handovers/:id/publish", ...presidentHandoverAccess, publish);