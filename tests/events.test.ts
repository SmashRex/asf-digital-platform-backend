import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

async function registerAndPromote(adminCookie: string, name: string, roleId: string) {
  const reg = await request(app).post("/api/auth/register").send({
    email: `vitest-events-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123",
    name,
    departmentId: "other",
    gender: "Male",
    academicLevel: "300 Level",
  });
  expect(reg.status).toBe(201);
  const cookie = reg.headers["set-cookie"]![0].split(";")[0];
  const userId = reg.body.data.id;
  await request(app).patch(`/api/members/${userId}/role`).set("Cookie", adminCookie).send({ action: "assign", roleId });
  return cookie;
}

describe("Events", () => {
  let adminCookie: string;
  let memberCookie: string;
  let presidentCookie: string;
  let eventId: string;

  it("setup: login as admin, register a plain member and a President", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Events", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-events-mem-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Funmilayo Ajayi",
      departmentId: "other",
      gender: "Female",
      academicLevel: "100 Level",
    });
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];

    presidentCookie = await registerAndPromote(adminCookie, "Tunde Bello", "President / Executive");
  });

  it("Member is BLOCKED from creating an event", async () => {
    const res = await request(app).post("/api/events").set("Cookie", memberCookie).send({
      title: "Should Fail", location: "Nowhere", startTime: "2027-01-10T08:00:00.000Z",
    });
    logResponse("Events", "Member -> POST /api/events (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("President CAN view events but is BLOCKED from creating one (view-only)", async () => {
    const viewRes = await request(app).get("/api/events").set("Cookie", presidentCookie);
    logResponse("Events", "President -> GET /api/events", viewRes.status, viewRes.body);
    expect(viewRes.status).toBe(200);

    const createRes = await request(app).post("/api/events").set("Cookie", presidentCookie).send({
      title: "President Attempt", location: "Nowhere", startTime: "2027-01-10T08:00:00.000Z",
    });
    logResponse("Events", "President -> POST /api/events (should be blocked)", createRes.status, createRes.body);
    expect(createRes.status).toBe(403);
  });

  it("Admin creates an event with minimal required fields only", async () => {
    const res = await request(app).post("/api/events").set("Cookie", adminCookie).send({
      title: "Vitest Youth Retreat",
      location: "ASF Fellowship Hall",
      startTime: "2027-03-15T08:00:00.000Z",
    });
    logResponse("Events", "Admin -> POST /api/events (minimal fields)", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Active");
    eventId = res.body.data.id;
  });

  it("Admin creates a full event with category, speaker, mode, theme", async () => {
    const res = await request(app).post("/api/events").set("Cookie", adminCookie).send({
      title: "Vitest Bible Conference",
      location: "Main Auditorium",
      startTime: "2027-04-20T08:00:00.000Z",
      category: "Bible Study",
      speaker: "Rev. Chika Nwosu",
      speakerRole: "Guest Minister",
      mode: "Hybrid",
      theme: "Rooted in the Word",
    });
    logResponse("Events", "Admin -> POST /api/events (full fields)", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.category).toBe("Bible Study");
    expect(res.body.data.mode).toBe("Hybrid");
  });

  it("Invalid category is rejected with a validation error", async () => {
    const res = await request(app).post("/api/events").set("Cookie", adminCookie).send({
      title: "Bad Category Event",
      location: "Nowhere",
      startTime: "2027-05-01T08:00:00.000Z",
      category: "Not A Real Category",
    });
    logResponse("Events", "Admin -> POST /api/events (invalid category)", res.status, res.body);
    expect(res.status).toBe(400);
  });

  it("GET /api/events?filter=upcoming includes the new event", async () => {
    const res = await request(app).get("/api/events?filter=upcoming").set("Cookie", adminCookie);
    logResponse("Events", "GET /api/events?filter=upcoming", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.some((e: any) => e.id === eventId);
    expect(found).toBe(true);
  });

  it("GET /api/events/featured returns a real Active upcoming event, never Cancelled", async () => {
    const res = await request(app).get("/api/events/featured").set("Cookie", adminCookie);
    logResponse("Events", "GET /api/events/featured", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Active");
  });

  it("Admin edits the event", async () => {
    const res = await request(app).put(`/api/events/${eventId}`).set("Cookie", adminCookie).send({
      description: "Updated by Vitest",
    });
    logResponse("Events", "Admin -> PUT /api/events/:id", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.description).toBe("Updated by Vitest");
  });

  it("Admin cancels the event (soft cancel, stays visible)", async () => {
    const res = await request(app).patch(`/api/events/${eventId}/cancel`).set("Cookie", adminCookie);
    logResponse("Events", "Admin -> PATCH /api/events/:id/cancel", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Cancelled");
  });

  it("Cancelling a second time is rejected", async () => {
    const res = await request(app).patch(`/api/events/${eventId}/cancel`).set("Cookie", adminCookie);
    logResponse("Events", "Admin -> cancel again (should fail)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_CANCELLED");
  });

  it("Cancelled event still appears in the general list (soft delete, not removed)", async () => {
    const res = await request(app).get("/api/events").set("Cookie", adminCookie);
    logResponse("Events", "GET /api/events (should still include cancelled)", res.status, res.body);
    const found = res.body.data.some((e: any) => e.id === eventId);
    expect(found).toBe(true);
  });

  it("Unauthenticated request to events list is blocked", async () => {
    const res = await request(app).get("/api/events");
    logResponse("Events", "No cookie -> GET /api/events", res.status, res.body);
    expect(res.status).toBe(401);
  });
});