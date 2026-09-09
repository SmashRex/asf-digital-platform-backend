import { Router } from "express";
import { requireAuth } from "../../middleware/requireAuth.js";
import { register, verify, me, logout, requestLogin } from "./auth.controller.js";


export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/verify", verify);
authRouter.get("/me", requireAuth, me);
authRouter.post("/magic-link", requestLogin);
authRouter.post("/logout", requireAuth, logout);