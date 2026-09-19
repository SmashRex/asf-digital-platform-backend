import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

describe("Auth", () => {
  const testEmail = `vitest-${Date.now()}@example.com`;
  const testPassword = "vitestpass123";
  let sessionCookie: string;

  it("POST /api/auth/register", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: testEmail,
      password: testPassword,
      name: "Vitest User",
      department: "Computer Science",
      academicLevel: "100 Level",
    });
    logResponse("POST /api/auth/register", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.roles).toContain("Member");
    const rawCookie = res.headers["set-cookie"]?.[0];
    expect(rawCookie).toBeDefined();
    sessionCookie = rawCookie!.split(";")[0];
  });

  it("GET /api/auth/me (session from register)", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", sessionCookie);
    logResponse("GET /api/auth/me", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
  });

  it("POST /api/auth/login (correct password)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: testPassword });
    logResponse("POST /api/auth/login", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/login (wrong password rejected)", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: testEmail, password: "wrongpassword" });
    logResponse("POST /api/auth/login (wrong password)", res.status, res.body);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("POST /api/auth/magic-link", async () => {
    const res = await request(app).post("/api/auth/magic-link").send({ email: testEmail });
    logResponse("POST /api/auth/magic-link", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/logout", async () => {
    const res = await request(app).post("/api/auth/logout").set("Cookie", sessionCookie);
    logResponse("POST /api/auth/logout", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("GET /api/auth/me (revoked after logout)", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", sessionCookie);
    logResponse("GET /api/auth/me (after logout)", res.status, res.body);
    expect(res.status).toBe(401);
  });
});