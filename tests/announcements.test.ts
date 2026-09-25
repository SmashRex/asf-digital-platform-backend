import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("Announcements", () => {
  let adminCookie: string;
  let memberCookie: string;
  let normalAnnouncementId: string;
  let revisionAnnouncementId: string;

  it("setup: login as admin + register a plain member", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Announcements", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-ann-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Announcements Member",
      departmentId: "other",
      gender: "Female",
      academicLevel: "200 Level",
    });
    logResponse("Announcements", "setup: register member", reg.status, reg.body);
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
  });

  it("Member is BLOCKED from creating an announcement (no permission)", async () => {
    const res = await request(app).post("/api/announcements").set("Cookie", memberCookie).send({
      title: "Should Fail", message: "Should not be created", priority: "Normal",
    });
    logResponse("Announcements", "Member -> POST /api/announcements (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Member CAN view the announcements list", async () => {
    const res = await request(app).get("/api/announcements").set("Cookie", memberCookie);
    logResponse("Announcements", "Member -> GET /api/announcements", res.status, res.body);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it("Admin creates a normal announcement (starts as Draft)", async () => {
    const res = await request(app).post("/api/announcements").set("Cookie", adminCookie).send({
      title: "Vitest Prayer Meeting", message: "Join us Thursday", priority: "Normal",
    });
    logResponse("Announcements", "Admin -> POST /api/announcements (normal)", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Draft");
    normalAnnouncementId = res.body.data.id;
  });

  it("Admin submits it for review", async () => {
    const res = await request(app).patch(`/api/announcements/${normalAnnouncementId}/submit-review`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> submit-review", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Pending Review");
  });

  it("Admin approves it", async () => {
    const res = await request(app).patch(`/api/announcements/${normalAnnouncementId}/approve`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> approve", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Approved");
  });

  it("Admin publishes it", async () => {
    const res = await request(app).patch(`/api/announcements/${normalAnnouncementId}/publish`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> publish", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Published");
  });

  it("Admin archives it", async () => {
    const res = await request(app).patch(`/api/announcements/${normalAnnouncementId}/archive`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> archive", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Archived");
  });

  it("Archiving a second time is rejected", async () => {
    const res = await request(app).patch(`/api/announcements/${normalAnnouncementId}/archive`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> double archive (should fail)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("INVALID_STATUS");
  });

  it("Revision branch: create, submit, request revision", async () => {
    const create = await request(app).post("/api/announcements").set("Cookie", adminCookie).send({
      title: "Vitest Prayer Meeting 2", message: "Join us Thursday", priority: "Normal",
    });
    logResponse("Announcements", "Admin -> create (revision branch)", create.status, create.body);
    expect(create.status).toBe(201);
    revisionAnnouncementId = create.body.data.id;

    const submit = await request(app).patch(`/api/announcements/${revisionAnnouncementId}/submit-review`).set("Cookie", adminCookie);
    logResponse("Announcements", "Admin -> submit-review (revision branch)", submit.status, submit.body);
    expect(submit.status).toBe(200);

    const revise = await request(app).patch(`/api/announcements/${revisionAnnouncementId}/request-revision`).set("Cookie", adminCookie).send({
      notes: "Please add the venue",
    });
    logResponse("Announcements", "Admin -> request-revision", revise.status, revise.body);
    expect(revise.status).toBe(200);
    expect(revise.body.data.status).toBe("Revision Requested");
  });

  it("Requesting revision with no notes is rejected", async () => {
    const create = await request(app).post("/api/announcements").set("Cookie", adminCookie).send({
      title: "Vitest No Notes Test", message: "Should get revision-blocked", priority: "Normal",
    });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    await request(app).patch(`/api/announcements/${id}/submit-review`).set("Cookie", adminCookie);

    const res = await request(app).patch(`/api/announcements/${id}/request-revision`).set("Cookie", adminCookie).send({});
    logResponse("Announcements", "Admin -> request-revision with no notes (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Editing after revision request moves it back to Draft", async () => {
    const res = await request(app).put(`/api/announcements/${revisionAnnouncementId}`).set("Cookie", adminCookie).send({
      message: "Join us Thursday at the main hall",
    });
    logResponse("Announcements", "Admin -> edit after revision", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Draft");
    expect(res.body.data.message).toBe("Join us Thursday at the main hall");
  });

  it("isUrgent fast-track skips straight to Published", async () => {
    const res = await request(app).post("/api/announcements").set("Cookie", adminCookie).send({
      title: "Vitest Service starting now", message: "Come quickly!", priority: "Urgent", isUrgent: true,
    });
    logResponse("Announcements", "Admin -> create with isUrgent (fast-track)", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Published");
  });

  it("Creating with a title that's too short is rejected", async () => {
    const res = await request(app).post("/api/announcements").set("Cookie", adminCookie).send({
      title: "A", message: "Valid enough message", priority: "Normal",
    });
    logResponse("Announcements", "Admin -> create with short title (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Unauthenticated request to list is blocked", async () => {
    const res = await request(app).get("/api/announcements");
    logResponse("Announcements", "No cookie -> GET /api/announcements", res.status, res.body);
    expect(res.status).toBe(401);
  });
});