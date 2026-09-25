import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

async function registerStudent(
  name: string,
  departmentId: string,
  gender: "Male" | "Female",
  academicLevel: string,
  programDurationYears: 4 | 5
) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-prog-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123",
    name,
    departmentId,
    gender,
    academicLevel,
    programDurationYears,
  });
  expect(res.status).toBe(201);
  return res.body.data.id as string;
}

describe("Academic Progression", () => {
  let adminCookie: string;
  let fourYearAt400Id: string;
  let fiveYearAt400Id: string;
  let normalAt100Id: string;

  it("setup: login as admin", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Academic Progression", "setup login (admin)", res.status, res.body);
    expect(res.status).toBe(200);
    adminCookie = res.headers["set-cookie"]![0].split(";")[0];
  });

  it("setup: register three students at different levels and program durations", async () => {
    fourYearAt400Id = await registerStudent("Chidinma Okafor", "mechanical-engineering", "Female", "400 Level", 4);
    fiveYearAt400Id = await registerStudent("Bayo Adewale", "architecture", "Male", "400 Level", 5);
    normalAt100Id = await registerStudent("Ifeoma Nwosu", "other", "Female", "100 Level", 4);

    expect(fourYearAt400Id).toBeDefined();
    expect(fiveYearAt400Id).toBeDefined();
    expect(normalAt100Id).toBeDefined();
  });

  it("Trigger progression on the currently INACTIVE session (2027/2028)", async () => {
    const res = await request(app)
      .post(`/api/academic-sessions/${encodeURIComponent("2027/2028")}/activate-and-progress`)
      .set("Cookie", adminCookie);
    logResponse("Academic Progression", "Admin -> activate-and-progress (2027/2028)", res.status, res.body);
    expect(res.status).toBe(200);
  }, 180000);

  it("4-year student at 400 Level becomes Alumni after progression", async () => {
    const res = await request(app).get(`/api/members/${fourYearAt400Id}`).set("Cookie", adminCookie);
    logResponse("Academic Progression", "Check 4-year student (expect Alumni)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.academicLevel).toBe("Alumni");
  });

  it("5-year student at 400 Level becomes 500 Level, NOT Alumni", async () => {
    const res = await request(app).get(`/api/members/${fiveYearAt400Id}`).set("Cookie", adminCookie);
    logResponse("Academic Progression", "Check 5-year student (expect 500 Level)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.academicLevel).toBe("500 Level");
  });

  it("Normal student at 100 Level becomes 200 Level", async () => {
    const res = await request(app).get(`/api/members/${normalAt100Id}`).set("Cookie", adminCookie);
    logResponse("Academic Progression", "Check normal student (expect 200 Level)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.academicLevel).toBe("200 Level");
  });
});