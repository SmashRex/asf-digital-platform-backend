import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("canonical subgroups", () => {
  it("rejects non-canonical subgroup values during registration", async () => {
    const response = await request(app).post("/api/auth/register").send({
      email: `subgroup-invalid-${Date.now()}@example.com`, password: "vitestpass123", name: "Invalid Subgroup", departmentId: "computer-science", gender: "Male", academicLevel: "100 Level", subgroup: "Legacy Group",
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects non-canonical subgroup values during mutation", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const member = await request(app).post("/api/auth/register").send({ email: `subgroup-target-${Date.now()}@example.com`, password: "vitestpass123", name: "Subgroup Target", departmentId: "computer-science", gender: "Male", academicLevel: "100 Level" });
    const response = await request(app).patch(`/api/members/${member.body.data.id}/subgroup`).set("Cookie", cookie).send({ subgroup: "Legacy Group" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});