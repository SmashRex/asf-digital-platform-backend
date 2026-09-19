import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("Academic Sessions", () => {
  let memberCookie: string;
  let adminCookie: string;

  it("setup: register member + login admin", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-as-member-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest AS Member",
      department: "Computer Science",
      academicLevel: "100 Level",
    });
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];

    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];
    expect(reg.status).toBe(201);
    expect(login.status).toBe(200);
  });

  it("GET /api/academic-sessions/active is open to any logged-in member", async () => {
    const res = await request(app).get("/api/academic-sessions/active").set("Cookie", memberCookie);
    logResponse("Member -> GET /api/academic-sessions/active", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("Member is BLOCKED from GET /api/academic-sessions (full list, admin-only)", async () => {
    const res = await request(app).get("/api/academic-sessions").set("Cookie", memberCookie);
    logResponse("Member -> GET /api/academic-sessions", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Member is BLOCKED from creating a new academic session", async () => {
    const res = await request(app).post("/api/academic-sessions").set("Cookie", memberCookie).send({
      id: "2099/2100", name: "Fake Session", startDate: "2099-09-01", endDate: "2100-07-31",
    });
    logResponse("Member -> POST /api/academic-sessions (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Member is BLOCKED from triggering the progression engine", async () => {
    const res = await request(app).post("/api/academic-sessions/2027%2F2028/activate-and-progress").set("Cookie", memberCookie);
    logResponse("Member -> POST .../activate-and-progress (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin GET full list succeeds, and IDs containing '/' are handled", async () => {
    const res = await request(app).get("/api/academic-sessions").set("Cookie", adminCookie);
    logResponse("Admin -> GET /api/academic-sessions", res.status, res.body);
    expect(res.status).toBe(200);
    const hasSlashId = res.body.data.some((s: any) => s.id.includes("/"));
    expect(hasSlashId).toBe(true);
  });

  it("SQL-injection-style id in URL is rejected safely, not a 500 crash", async () => {
    const res = await request(app)
      .post(`/api/academic-sessions/${encodeURIComponent("2027/2028'; DROP TABLE users;--")}/activate-and-progress`)
      .set("Cookie", adminCookie);
    logResponse("Admin -> injection-style session id", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Unauthenticated request is blocked", async () => {
    const res = await request(app).get("/api/academic-sessions");
    logResponse("No cookie -> GET /api/academic-sessions", res.status, res.body);
    expect(res.status).toBe(401);
  });
});