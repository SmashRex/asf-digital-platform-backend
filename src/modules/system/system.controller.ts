import type { Request, Response, NextFunction } from "express";
import { sendSuccess } from "../../utils/apiResponse.js";
import { pool } from "../../db/index.js";
import { db } from "../../db/index.js";
import { systemEvents } from "../../db/schema/index.js";
import { desc } from "drizzle-orm";
import { lastSchedulerRunAt } from "../../jobs/announcementScheduler.js";

const serverStartTime = Date.now();

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export async function getHealth(req: Request, res: Response, next: NextFunction) {
  try {
    const uptimeSeconds = Math.floor((Date.now() - serverStartTime) / 1000);
    const services: any[] = [];

    services.push({
      id: "api",
      name: "API Gateway",
      category: "Core API",
      status: "Operational",
      uptimeMetric: formatUptime(uptimeSeconds),
      latencyMs: 0,
      diagnosticDetails: "Express API server active and responding.",
      lastChecked: new Date().toISOString(),
      endpointOrResource: "/health",
    });

    const dbStart = Date.now();
    let dbStatus: "Operational" | "Error" = "Operational";
    let dbDetails = "PostgreSQL connection verified.";
    try {
      await pool.query("SELECT 1");
    } catch (err) {
      dbStatus = "Error";
      dbDetails = "Could not reach the database.";
    }
    const dbLatency = Date.now() - dbStart;
    services.push({
      id: "database",
      name: "PostgreSQL Database",
      category: "Database",
      status: dbStatus,
      uptimeMetric: dbStatus === "Operational" ? "Connected" : "Unreachable",
      latencyMs: dbLatency,
      diagnosticDetails: dbDetails,
      lastChecked: new Date().toISOString(),
      endpointOrResource: "postgresql (Neon)",
    });

    let storageStatus: "Operational" | "Error" = "Operational";
    let storageDetails = "Cloudinary reachable.";
    const storageStart = Date.now();
    try {
      const res = await fetch(`https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/`);
      if (res.status >= 500) throw new Error("Cloudinary server error");
    } catch (err) {
      storageStatus = "Error";
      storageDetails = "Could not reach Cloudinary.";
    }
    const storageLatency = Date.now() - storageStart;
    services.push({
      id: "storage",
      name: "Cloudinary Media Storage",
      category: "Storage",
      status: storageStatus,
      uptimeMetric: storageStatus === "Operational" ? "Reachable" : "Unreachable",
      latencyMs: storageLatency,
      diagnosticDetails: storageDetails,
      lastChecked: new Date().toISOString(),
      endpointOrResource: "Cloudinary CDN",
    });

    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    services.push({
      id: "memory",
      name: "Server Memory",
      category: "Core API",
      status: "Operational",
      uptimeMetric: `${usedMB}MB / ${totalMB}MB`,
      latencyMs: 0,
      diagnosticDetails: `Heap memory usage: ${usedMB}MB used of ${totalMB}MB allocated.`,
      lastChecked: new Date().toISOString(),
      endpointOrResource: "process.memoryUsage()",
    });

    const schedulerOk = lastSchedulerRunAt && Date.now() - lastSchedulerRunAt.getTime() < 5 * 60 * 1000;
    services.push({
      id: "scheduler",
      name: "Announcement Scheduler",
      category: "Core API",
      status: lastSchedulerRunAt ? (schedulerOk ? "Operational" : "Error") : "Unknown",
      uptimeMetric: lastSchedulerRunAt ? lastSchedulerRunAt.toISOString() : "Never run",
      latencyMs: 0,
      diagnosticDetails: lastSchedulerRunAt
        ? `Scheduler last ran at ${lastSchedulerRunAt.toISOString()}.`
        : "Scheduler has not run yet since server start.",
      lastChecked: new Date().toISOString(),
      endpointOrResource: "in-memory cron job",
    });

    const overallStatus = services.every((s) => s.status === "Operational" || s.id === "scheduler") ? "Healthy" : "Degraded";

    return sendSuccess(res, {
      overallStatus,
      uptimeSeconds,
      environment: process.env.NODE_ENV,
      checkedAt: new Date().toISOString(),
      services,
    });
  } catch (err) {
    next(err);
  }
}

export async function getPulse(req: Request, res: Response, next: NextFunction) {
  try {
    const events = await db.select().from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(20);
    return sendSuccess(res, events);
  } catch (err) {
    next(err);
  }
}