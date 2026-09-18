import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { pool } from "../../db/index.js";

const serverStartTime = Date.now();

export async function getHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const services: any[] = [];

    // 1. API — if this code is running, the API is up
    services.push({
      name: "API Server",
      status: "Operational",
      latencyMs: 0,
    });

    // 2. Database — real check, actually pings Postgres right now
    const dbStart = Date.now();
    let dbStatus = "Operational";
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      dbStatus = "Down";
    }
    const dbLatency = Date.now() - dbStart;
    services.push({
      name: "Database",
      status: dbStatus,
      latencyMs: dbLatency,
    });

    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);

    return sendSuccess(res, {
      overallStatus: services.every((s) => s.status === "Operational") ? "Healthy" : "Degraded",
      uptimeSeconds,
      environment: process.env.NODE_ENV,
      checkedAt: new Date().toISOString(),
      services,
    });
  } catch (err) {
    next(err);
  }
}