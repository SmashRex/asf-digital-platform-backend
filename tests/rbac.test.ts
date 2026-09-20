import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

async function registerAndLogin(emailPrefix: string, name: string) {
  const email = `vitest-${emailPrefix}-${Date.now()}@example.com`;
  const password = "vitestpass123";
  const res = await request(app).post("/api/auth/register").send({
    email, password, name, department: "Computer Science", academicLevel: "100 Level",
  });
  const cookie = res.headers["set-cookie"]![0].split(";")[0];
  const userId = res.body.data.id;
  return { email, cookie, userId };
}

async function assignRole(adminCookie: string, userId: string, roleId: string) {
  return request(app)
    .patch(`/api/members/${userId}/role`)
    .set("Cookie", adminCookie)
    .send({ action: "assign", roleId });
}

describe("RBAC", () => {
  let memberCookie: string;
  let adminCookie: string;
  let presidentCookie: string;
  let publicityCookie: string;

  it("setup: register plain member", async () => {
    const { cookie } = await registerAndLogin("member", "Vitest Member");
    memberCookie = cookie;
    expect(memberCookie).toBeDefined();
  });

  it("setup: login as Technical Administrator", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("RBAC", "setup login (admin)", res.status, res.body);
    expect(res.status).toBe(200);
    adminCookie = res.headers["set-cookie"]![0].split(";")[0];
  });

  it("setup: register + promote a President", async () => {
    const { cookie, userId } = await registerAndLogin("president", "Vitest President");
    const res = await assignRole(adminCookie, userId, "President / Executive");
    logResponse("RBAC", "assign role -> President / Executive", res.status, res.body);
    expect(res.status).toBe(200);
    presidentCookie = cookie;
  });

  it("setup: register + promote a Publicity Coordinator", async () => {
    const { cookie, userId } = await registerAndLogin("publicity", "Vitest Publicity");
    const res = await assignRole(adminCookie, userId, "Publicity Coordinator");
    logResponse("RBAC", "assign role -> Publicity Coordinator", res.status, res.body);
    expect(res.status).toBe(200);
    publicityCookie = cookie;
  });

  it("Member is blocked from GET /api/fs/admissions/admin", async () => {
    const res = await request(app).get("/api/fs/admissions/admin").set("Cookie", memberCookie);
    logResponse("RBAC", "Member -> GET /api/fs/admissions/admin", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin is allowed GET /api/fs/admissions/admin", async () => {
    const res = await request(app).get("/api/fs/admissions/admin").set("Cookie", adminCookie);
    logResponse("RBAC", "Admin -> GET /api/fs/admissions/admin", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("President can VIEW events but is BLOCKED from creating one", async () => {
    const listRes = await request(app).get("/api/events").set("Cookie", presidentCookie);
    logResponse("RBAC", "President -> GET /api/events", listRes.status, listRes.body);
    expect(listRes.status).toBe(200);

    const createRes = await request(app).post("/api/events").set("Cookie", presidentCookie).send({
      title: "Should Fail", location: "Nowhere", startTime: "2026-12-25T08:00:00.000Z",
    });
    logResponse("RBAC", "President -> POST /api/events (should be blocked)", createRes.status, createRes.body);
    expect(createRes.status).toBe(403);
  });

  it("Publicity Coordinator CAN create and publish an announcement", async () => {
    const createRes = await request(app).post("/api/announcements").set("Cookie", publicityCookie).send({
      title: "Vitest Publicity Test", message: "Testing publicity role", priority: "Normal",
    });
    logResponse("RBAC", "Publicity -> POST /api/announcements", createRes.status, createRes.body);
    expect(createRes.status).toBe(201);
  });

  it("Publicity Coordinator CAN access website draft", async () => {
    const res = await request(app).get("/api/content/website/draft").set("Cookie", publicityCookie);
    logResponse("RBAC", "Publicity -> GET /api/content/website/draft", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("Member is blocked from website draft", async () => {
    const res = await request(app).get("/api/content/website/draft").set("Cookie", memberCookie);
    logResponse("RBAC", "Member -> GET /api/content/website/draft", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Unauthenticated request is blocked entirely", async () => {
    const res = await request(app).get("/api/fs/admissions/admin");
    logResponse("RBAC", "No cookie -> GET /api/fs/admissions/admin", res.status, res.body);
    expect(res.status).toBe(401);
  });
});