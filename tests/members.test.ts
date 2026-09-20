import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("Members", () => {
  let memberCookie: string;
  let memberId: string;
  let adminCookie: string;
  let adminId: string;

  it("setup: register member + login admin", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-mem-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Members Test",
      department: "Computer Science",
      academicLevel: "100 Level",
    });
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
    memberId = reg.body.data.id;

    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];
    adminId = login.body.data.id;
    expect(reg.status).toBe(201);
  });

  it("Plain Member CAN view the directory, but private fields are hidden", async () => {
    const res = await request(app).get("/api/members").set("Cookie", memberCookie);
    logResponse("Members", "Member -> GET /api/members", res.status, res.body);
    expect(res.status).toBe(200);
    const anyHasEmail = res.body.data.some((m: any) => "email" in m);
    expect(anyHasEmail).toBe(false);
  });

  it("Admin sees private fields (email, phone, accountStatus) in the directory", async () => {
    const res = await request(app).get("/api/members").set("Cookie", adminCookie);
    logResponse("Members", "Admin -> GET /api/members", res.status, res.body);
    expect(res.status).toBe(200);
    const anyHasEmail = res.body.data.some((m: any) => "email" in m);
    expect(anyHasEmail).toBe(true);
  });

  it("Member is BLOCKED from assigning themselves an admin role (privilege escalation attempt)", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/role`)
      .set("Cookie", memberCookie)
      .send({ action: "assign", roleId: "Technical Administrator" });
    logResponse("Members", "Member -> self-assign Technical Administrator (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Member is BLOCKED from changing their own accountStatus", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/status`)
      .set("Cookie", memberCookie)
      .send({ accountStatus: "Suspended" });
    logResponse("Members", "Member -> self-suspend (should be blocked, no permission)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin is BLOCKED from suspending THEMSELVES (self-modify guard)", async () => {
    const res = await request(app)
      .patch(`/api/members/${adminId}/status`)
      .set("Cookie", adminCookie)
      .send({ accountStatus: "Suspended" });
    logResponse("Members", "Admin -> self-suspend (should hit CANNOT_SELF_MODIFY)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("CANNOT_SELF_MODIFY");
  });

  it("Admin CAN assign a role to another member", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/role`)
      .set("Cookie", adminCookie)
      .send({ action: "assign", roleId: "Bible Study Coordinator" });
    logResponse("Members", "Admin -> assign role to member", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("Base 'Member' role CANNOT be removed", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/role`)
      .set("Cookie", adminCookie)
      .send({ action: "remove", roleId: "Member" });
    logResponse("Members", "Admin -> attempt to remove base Member role (should fail)", res.status, res.body);
    expect(res.status).not.toBe(200);
  });

  it("SQL-injection-style search query does not crash the server", async () => {
    const res = await request(app)
      .get(`/api/members?search=${encodeURIComponent("'; DROP TABLE users;--")}`)
      .set("Cookie", adminCookie);
    logResponse("Members", "Admin -> injection-style search query", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Requesting a non-existent member id returns 404, not a crash", async () => {
    const res = await request(app).get("/api/members/00000000-0000-0000-0000-000000000000").set("Cookie", adminCookie);
    logResponse("Members", "Admin -> GET nonexistent member id", res.status, res.body);
    expect(res.status).toBe(404);
  });

  it("Malformed (non-UUID) member id is handled safely, not a 500", async () => {
    const res = await request(app).get("/api/members/not-a-real-uuid").set("Cookie", adminCookie);
    logResponse("Members", "Admin -> GET malformed member id", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID_FORMAT");
  });

  it("Unauthenticated request to members directory is blocked", async () => {
    const res = await request(app).get("/api/members");
    logResponse("Members", "No cookie -> GET /api/members", res.status, res.body);
    expect(res.status).toBe(401);
  });
});