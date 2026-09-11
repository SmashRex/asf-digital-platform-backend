import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { getMyProfile, updateMyProfile } from "./users.controller.js";

export const usersRouter = Router();

usersRouter.get("/profile", requireAuth, getMyProfile);
usersRouter.put("/profile", requireAuth, updateMyProfile);
