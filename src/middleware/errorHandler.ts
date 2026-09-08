import type { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/appError.js";
import { env } from "../config/env.config.js";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? null,
      },
    });
  }

  console.error("💥 Unexpected error:", err);

  return res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message:
        env.NODE_ENV === "production"
          ? "Something went wrong"
          : err instanceof Error
          ? err.message
          : "Unknown error",
      details: null,
    },
  });
}