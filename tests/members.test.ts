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
      departmentId: "library-management-tech",
      gender: "Female",
      academicLevel: "100 Level",
    });
    logResponse("Members", "setup: register member", reg.status, reg.body);
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
    memberId = reg.body.data.id;

    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];
    adminId = login.body.data.id;
  });

  it("Plain Member CAN view the directory, but private fields are hidden", async () => {
    const res = await request(app).get("/api/members").set("Cookie", memberCookie);
    logResponse("Members", "Member -> GET /api/members", res.status, res.body);
    expect(res.status).toBe(200);
    const anyHasEmail = res.body.data.some((m: any) => "email" in m);
    expect(anyHasEmail).toBe(false);
  });

  it("Plain Member sees departmentId but NOT gender in the directory", async () => {
    const res = await request(app).get("/api/members").set("Cookie", memberCookie);
    logResponse("Members", "Member -> directory departmentId/gender visibility", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((m: any) => "departmentId" in m)).toBe(true);
    expect(res.body.data.some((m: any) => "gender" in m)).toBe(false);
  });

  it("Admin sees private fields (email, phone, accountStatus) in the directory", async () => {
    const res = await request(app).get("/api/members").set("Cookie", adminCookie);
    logResponse("Members", "Admin -> GET /api/members", res.status, res.body);
    expect(res.status).toBe(200);
    const anyHasEmail = res.body.data.some((m: any) => "email" in m);
    expect(anyHasEmail).toBe(true);
  });

  it("Admin sees gender in the directory", async () => {
    const res = await request(app).get("/api/members").set("Cookie", adminCookie);
    logResponse("Members", "Admin -> directory gender visibility", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.some((m: any) => "gender" in m)).toBe(true);
  });

  it("Search by department NAME finds a new sign-up (department text is null)", async () => {
    const res = await request(app)
      .get(`/api/members?search=${encodeURIComponent("Library Management Technology")}`)
      .set("Cookie", memberCookie);
    logResponse("Members", "Member -> search by department name", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.find((m: any) => m.id === memberId);
    expect(found).toBeDefined();
    expect(found.department).toBeNull();
    expect(found.departmentId).toBe("library-management-tech");
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
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });

  it("Technical Administrator is BLOCKED from assigning President / Executive to another member (protected role)", async () => {
    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-protrole-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Protected Role Target",
      departmentId: "other",
      gender: "Male",
      academicLevel: "100 Level",
    });
    expect(reg.status).toBe(201);
    const targetId = reg.body.data.id;

    const res = await request(app)
      .patch(`/api/members/${targetId}/role`)
      .set("Cookie", adminCookie)
      .send({ action: "assign", roleId: "President / Executive" });
    logResponse("Members", "Admin (Technical Administrator) -> assign President role (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PROTECTED_ROLE_REQUIRES_PRESIDENT");
  });

  it("Technical Administrator is BLOCKED from assigning Technical Administrator to themselves (self-escalation)", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    const selfAdminId = login.body.data.id;
    const selfAdminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const res = await request(app)
      .patch(`/api/members/${selfAdminId}/role`)
      .set("Cookie", selfAdminCookie)
      .send({ action: "assign", roleId: "Technical Administrator" });
    logResponse("Members", "Admin -> self-assign Technical Administrator again (should be blocked as protected role)", res.status, res.body);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("PROTECTED_ROLE_REQUIRES_PRESIDENT");
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

  it("Status change response never includes the password hash", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/status`)
      .set("Cookie", adminCookie)
      .send({ accountStatus: "Suspended" });
    logResponse("Members", "Admin -> suspend member (check no passwordHash)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });

  it("Subgroup change response never includes the password hash", async () => {
    const res = await request(app)
      .patch(`/api/members/${memberId}/subgroup`)
      .set("Cookie", adminCookie)
      .send({ subgroup: "Vitest Subgroup" });
    logResponse("Members", "Admin -> change subgroup (check no passwordHash)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });
});

 