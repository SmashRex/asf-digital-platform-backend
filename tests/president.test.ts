import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("president dashboard", () => {
  it("requires authentication and dashboard access", async () => {
    expect((await request(app).get("/api/president/roster")).status).toBe(401);
    const member = await request(app).post("/api/auth/register").send({
      email: `president-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "President Test Member",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });
    const response = await request(app)
      .get("/api/president/roster")
      .set("Cookie", member.headers["set-cookie"]![0].split(";")[0]);
    expect(response.status).toBe(403);
  });

  it("returns filtered roster rows and real analytics for the seeded admin", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const roster = await request(app)
      .get("/api/president/roster?academicLevel=100%20Level&limit=2")
      .set("Cookie", cookie);
    expect(roster.status).toBe(200);
    expect(roster.body.data).toEqual(expect.any(Array));
    for (const member of roster.body.data) expect(member.academicLevel).toBe("100 Level");
    const analytics = await request(app).get("/api/president/analytics").set("Cookie", cookie);
    expect(analytics.status).toBe(200);
    expect(analytics.body.data.totalMembers).toEqual(expect.any(Number));
    expect(analytics.body.data.eventCount).toEqual(expect.any(Number));
  });

  it("roster pagination meta reflects real total/page/limit", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const roster = await request(app).get("/api/president/roster?limit=1&page=1").set("Cookie", cookie);
    expect(roster.status).toBe(200);
    expect(roster.body.data.length).toBeLessThanOrEqual(1);
    expect(roster.body.meta.page).toBe(1);
    expect(roster.body.meta.limit).toBe(1);
    expect(roster.body.meta.total).toEqual(expect.any(Number));
    expect(roster.body.meta.total).toBeGreaterThan(0);
  });

  it("roster office filter returns only members holding that office", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    // The seeded admin account holds the 'president' office (assigned earlier this session).
    const roster = await request(app).get("/api/president/roster?office=president").set("Cookie", cookie);
    expect(roster.status).toBe(200);
    expect(roster.body.data.length).toBeGreaterThan(0);
    for (const member of roster.body.data) {
      const officeIds = (member.executiveOffices ?? []).map((o: any) => o.id);
      expect(officeIds).toContain("president");
    }
  });

  it("roster rejects an unknown office filter value", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const roster = await request(app).get("/api/president/roster?office=not-a-real-office").set("Cookie", cookie);
    expect(roster.status).toBe(400);
    expect(roster.body.error.code).toBe("INVALID_OFFICE");
  });
});