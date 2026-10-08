import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { userExecutiveOffices, userDashboardAccess } from "../src/db/schema/index.js";
import { and, eq, inArray } from "drizzle-orm";

vi.setConfig({ testTimeout: 300_000 });

const createdUserIds: string[] = [];

async function registerWithSession(label: string) {
  const response = await request(app).post("/api/auth/register").send({
    email: `officeaccess-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "vitestpass123", name: `OfficeAccess ${label}`, departmentId: "computer-science", gender: "Male", academicLevel: "100 Level",
  });
  expect(response.status).toBe(201);
  const id = response.body.data.id as string;
  createdUserIds.push(id);
  return { id, cookie: response.headers["set-cookie"]![0].split(";")[0] };
}

afterAll(async () => {
  if (createdUserIds.length === 0) return;
  await db.delete(userExecutiveOffices).where(inArray(userExecutiveOffices.userId, createdUserIds));
  await db.delete(userDashboardAccess).where(inArray(userDashboardAccess.userId, createdUserIds));
}, 120_000);

describe("office-based FS access", () => {
  it("VP office opens FS and the vice-president dashboard; removing the office closes both", async () => {
    const { id, cookie } = await registerWithSession("vp");

    const before = await request(app).get("/api/fs/admissions/admin").set("Cookie", cookie);
    expect(before.status).toBe(403);
    expect(before.body.error.code).toBe("OFFICE_REQUIRED");

    await db.insert(userExecutiveOffices).values({ userId: id, officeId: "vice-president" });
    const me = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(me.status).toBe(200);
    expect(me.body.data.dashboards).toContain("vice-president");
    expect(me.body.data.executiveOffices.map((o: { id: string }) => o.id)).toContain("vice-president");
    expect((await request(app).get("/api/fs/admissions/admin").set("Cookie", cookie)).status).toBe(200);
    expect((await request(app).get("/api/fs/classes").set("Cookie", cookie)).status).toBe(200);
    expect((await request(app).get("/api/fs/students").set("Cookie", cookie)).status).toBe(200);

    await db.delete(userExecutiveOffices).where(and(eq(userExecutiveOffices.userId, id), eq(userExecutiveOffices.officeId, "vice-president")));
    const after = await request(app).get("/api/fs/classes").set("Cookie", cookie);
    expect(after.status).toBe(403);
    const meAfter = await request(app).get("/api/auth/me").set("Cookie", cookie);
    expect(meAfter.body.data.dashboards).not.toContain("vice-president");
  });

  it("President office and an explicit VP dashboard grant without the office do not open FS", async () => {
    const president = await registerWithSession("president-office");
    await db.insert(userExecutiveOffices).values({ userId: president.id, officeId: "president" });
    expect((await request(app).get("/api/fs/classes").set("Cookie", president.cookie)).status).toBe(403);

    const helper = await registerWithSession("explicit-grant");
    await db.insert(userDashboardAccess).values({ userId: helper.id, dashboardId: "vice-president" });
    expect((await request(app).get("/api/fs/classes").set("Cookie", helper.cookie)).status).toBe(403);
  });

  it("the Technical Administrator account has no FS access", async () => {
    const login = await request(app).post("/api/auth/login").send({
      email: process.env.SMOKE_ADMIN_EMAIL || "test2@example.com",
      password: process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x",
    });
    expect(login.status).toBe(200);
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    expect((await request(app).get("/api/fs/classes").set("Cookie", cookie)).status).toBe(403);
    expect((await request(app).get("/api/fs/admissions/admin").set("Cookie", cookie)).status).toBe(403);
  });
});