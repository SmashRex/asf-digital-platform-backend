import type { Response } from "express";

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Operation completed successfully",
  meta?: { total?: number; page?: number; limit?: number },
  statusCode = 200
) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
    ...(meta ? { meta } : {}),
  });
}