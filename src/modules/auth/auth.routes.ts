import { Router } from "express";
import { register, verify } from "./auth.controller.js";


export const authRouter = Router();

authRouter.post("/register", register);
authRouter.post("/verify", verify);