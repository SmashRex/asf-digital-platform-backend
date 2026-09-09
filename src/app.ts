import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { academicSessionRouter } from "./modules/academic-session/academicSession.routes.js";
import { membersRouter } from "./modules/members/members.routes.js";



export const app = express();

app.use(helmet());

app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());


app.use("/api/auth", authRouter);
app.use("/api/academic-sessions", academicSessionRouter);
app.use("/api/members", membersRouter);


//should be the last app.use
app.use(errorHandler);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", environment: env.NODE_ENV });
});