import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { register, verify, me, logout } from "./auth.controller.js";


export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/verify", verify);
authRouter.get("/me", requireAuth, me);
authRouter.post("/logout", requireAuth, logout);