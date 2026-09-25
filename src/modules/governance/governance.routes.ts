import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { requireDashboardAccess } from "../../middleware/requireDashboardAccess.js";
import { create, list, approve, reject } from "./governance.controller.js";

export const governanceRouter = Router();
governanceRouter.post("/governance/requests", requireAuth, create);
governanceRouter.get("/president/governance/requests", requireAuth, requireDashboardAccess("president"), list);
governanceRouter.post("/president/governance/requests/:id/approve", requireAuth, requireDashboardAccess("president"), approve);
governanceRouter.post("/president/governance/requests/:id/reject", requireAuth, requireDashboardAccess("president"), reject);