import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

describe("Users (self-service profile)", () => {
  let memberCookie: string;

  it("setup: register member", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `vitest-users-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Users Test",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });
    logResponse("Users", "setup: register member", res.status, res.body);
    expect(res.status).toBe(201);
    memberCookie = res.headers["set-cookie"]![0].split(";")[0];
  });

  it("GET own profile", async () => {
    const res = await request(app).get("/api/users/profile").set("Cookie", memberCookie);
    logResponse("Users", "Member -> GET /api/users/profile", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("GET own profile includes departmentId and gender", async () => {
    const res = await request(app).get("/api/users/profile").set("Cookie", memberCookie);
    logResponse("Users", "Member -> GET profile (departmentId/gender)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.departmentId).toBe("computer-science");
    expect(res.body.data.gender).toBe("Male");
  });

  it("GET own profile never includes the password hash", async () => {
    const res = await request(app).get("/api/users/profile").set("Cookie", memberCookie);
    logResponse("Users", "Member -> GET profile (check no passwordHash)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });

  it("Member CANNOT self-edit their own subgroup (field should be silently ignored, not applied)", async () => {
    const res = await request(app).put("/api/users/profile").set("Cookie", memberCookie).send({
      subgroup: "Choir",
      name: "Vitest Users Test Updated",
    });
    logResponse("Users", "Member -> PUT profile, attempting to set own subgroup", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.subgroup).not.toBe("Choir");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });

  it("Legitimate self-edit (name) succeeds", async () => {
    const res = await request(app).put("/api/users/profile").set("Cookie", memberCookie).send({
      name: "Vitest Renamed Successfully",
    });
    logResponse("Users", "Member -> PUT profile, legitimate name change", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe("Vitest Renamed Successfully");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
    expect(JSON.stringify(res.body)).not.toContain("$2b$");
  });

  it("Tampered/garbage session cookie is rejected, not silently accepted", async () => {
    const res = await request(app).get("/api/users/profile").set("Cookie", "asf_session=totally-fake-tampered-value");
    logResponse("Users", "GET /api/users/profile with tampered cookie", res.status, res.body);
    expect(res.status).toBe(401);
  });

  it("Unauthenticated request to own profile is blocked", async () => {
    const res = await request(app).get("/api/users/profile");
    logResponse("Users", "No cookie -> GET /api/users/profile", res.status, res.body);
    expect(res.status).toBe(401);
  });
});