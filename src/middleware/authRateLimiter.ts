import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { appConfig } from "../config/app.config.js";

export const authRateLimiter = rateLimit({
  windowMs: appConfig.rateLimit.authWindowMinutes * 60 * 1000,
  limit: appConfig.rateLimit.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? "")}:${(req.body?.email as string | undefined) ?? ""}`,
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests. Please try again later.",
        details: null,
      },
    });
  },
});