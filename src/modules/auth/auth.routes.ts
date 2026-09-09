import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { register, verify, me, logout, requestLogin } from "./auth.controller.js";
import { authRateLimiter } from "../../middleware/authRateLimiter.js";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/verify", verify);
authRouter.get("/me", requireAuth, me);
authRouter.post("/magic-link", authRateLimiter, requestLogin);
authRouter.post("/logout", requireAuth, logout);