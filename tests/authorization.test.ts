import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { requireAuth } from "../src/middleware/requireAuth.js";
import { requireCapability } from "../src/middleware/requireCapability.js";
import { requireDashboardAccess } from "../src/middleware/requireDashboardAccess.js";
import { errorHandler } from "../src/middleware/errorHandler.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

function authorizationProbe() {
  const probe = express();
  probe.use(cookieParser());
  probe.use(express.json());
  probe.get("/dashboard", requireAuth, requireDashboardAccess("president"), (_req, res) => res.sendStatus(200));
  probe.get("/capability", requireAuth, requireCapability("technical_head"), (_req, res) => res.sendStatus(200));
  probe.use(errorHandler);
  return probe;
}

describe("authorization resolver", () => {
  it("blocks a plain member and allows the seeded admin", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `authorization-${Date.now()}@example.com`, password: "vitestpass123", name: "Authorization Member",
      departmentId: "computer-science", gender: "Male", academicLevel: "100 Level",
    });
    const memberCookie = member.headers["set-cookie"]![0].split(";")[0];
    const admin = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const adminCookie = admin.headers["set-cookie"]![0].split(";")[0];
    const probe = authorizationProbe();

    expect((await request(probe).get("/dashboard").set("Cookie", memberCookie)).status).toBe(403);
    expect((await request(probe).get("/capability").set("Cookie", memberCookie)).status).toBe(403);
    expect((await request(probe).get("/dashboard").set("Cookie", adminCookie)).status).toBe(200);
    expect((await request(probe).get("/capability").set("Cookie", adminCookie)).status).toBe(200);
  });
});