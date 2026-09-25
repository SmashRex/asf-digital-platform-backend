import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

describe("Auth", () => {
  const testEmail = `vitest-${Date.now()}@example.com`;
  const testPassword = "vitestpass123";
  let sessionCookie: string;
  let departmentId: string;

  beforeAll(async () => {
    const res = await request(app).get("/api/departments");
    logResponse("Auth", "GET /api/departments (setup)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    departmentId = res.body.data[0].id;
  });

  it("POST /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: testPassword,
      name: "Vitest User",
      departmentId,
      gender: "Male",
      academicLevel: "100 Level",
    });
    logResponse("Auth", "POST /api/auth/register", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.roles).toContain("Member");
    expect(res.body.data.departmentId).toBe(departmentId);
    expect(res.body.data.gender).toBe("Male");
    const rawCookie = res.headers["set-cookie"]?.[0];
    expect(rawCookie).toBeDefined();
    sessionCookie = rawCookie!.split(";")[0];
  });

  it("POST /api/auth/register (missing gender rejected)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `vitest-nogender-${Date.now()}@example.com`,
      password: testPassword,
      name: "Vitest No Gender",
      departmentId,
      academicLevel: "100 Level",
    });
    logResponse("Auth", "POST /api/auth/register (missing gender)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/register (missing departmentId rejected)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `vitest-nodept-${Date.now()}@example.com`,
      password: testPassword,
      name: "Vitest No Department",
      gender: "Female",
      academicLevel: "100 Level",
    });
    logResponse("Auth", "POST /api/auth/register (missing departmentId)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("POST /api/auth/register (non-existent departmentId rejected cleanly)", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `vitest-fakedept-${Date.now()}@example.com`,
      password: testPassword,
      name: "Vitest Fake Department",
      departmentId: "fake-dept-that-does-not-exist",
      gender: "Male",
      academicLevel: "100 Level",
    });
    logResponse("Auth", "POST /api/auth/register (fake departmentId)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_DEPARTMENT");
  });

  it("GET /api/auth/me (session from register)", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", sessionCookie);
    logResponse("Auth", "GET /api/auth/me", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.departmentId).toBe(departmentId);
    expect(res.body.data.gender).toBe("Male");
  });

  it("POST /api/auth/login (correct password)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: testPassword });
    logResponse("Auth", "POST /api/auth/login", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.departmentId).toBe(departmentId);
    expect(res.body.data.gender).toBe("Male");
  });

  it("POST /api/auth/login (wrong password rejected)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: "wrongpassword" });
    logResponse("Auth", "POST /api/auth/login (wrong password)", res.status, res.body);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /api/auth/magic-link", async () => {
    const res = await request(app).post("/api/auth/magic-link").send({ email: testEmail });
    logResponse("Auth", "POST /api/auth/magic-link", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/logout", async () => {
    const res = await request(app).post("/api/auth/logout").set("Cookie", sessionCookie);
    logResponse("Auth", "POST /api/auth/logout", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("GET /api/auth/me (revoked after logout)", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", sessionCookie);
    logResponse("Auth", "GET /api/auth/me (after logout)", res.status, res.body);
    expect(res.status).toBe(401);
  });
});