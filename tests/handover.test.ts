import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { handovers, userExecutiveOffices, users } from "../src/db/schema/index.js";
import { eq, and } from "drizzle-orm";
import * as handoverService from "../src/modules/handover/handover.service.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

async function loginAdmin() {
  const response = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(response.status).toBe(200);
  return { cookie: response.headers["set-cookie"]![0].split(";")[0], id: response.body.data.id as string };
}

async function registerMember(label: string) {
  const response = await request(app).post("/api/auth/register").send({
    email: `handover-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "vitestpass123", name: `Handover ${label}`, departmentId: "computer-science", gender: "Male", academicLevel: "100 Level",
  });
  expect(response.status).toBe(201);
  return response.body.data.id as string;
}

describe("executive handover", () => {
  it("rejects malformed, unknown, and duplicate CSV assignments", async () => {
    const { cookie } = await loginAdmin();
    const malformed = await request(app).post("/api/president/handovers").set("Cookie", cookie).attach("file", Buffer.from("wrong,headers\n1,2\n"), { filename: "handover.csv", contentType: "text/csv" });
    expect(malformed.status).toBe(400);
    const unknown = await request(app).post("/api/president/handovers").set("Cookie", cookie).attach("file", Buffer.from("memberId,officeId\n11111111-1111-4111-8111-111111111111,president\n"), { filename: "handover.csv", contentType: "text/csv" });
    expect(unknown.status).toBe(422);
    const memberId = await registerMember("duplicate");
    const duplicateCsv = `memberId,officeId\n${memberId},president\n${memberId},president\n`;
    const duplicate = await request(app).post("/api/president/handovers").set("Cookie", cookie).attach("file", Buffer.from(duplicateCsv), { filename: "handover.csv", contentType: "text/csv" });
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.data.validationErrors.join(" ")).toContain("Duplicate assignment");
  });

  it("creates a reviewable handover, approves and publishes office transitions", async () => {
    const { cookie, id: adminId } = await loginAdmin();
    const incomingPresident = await registerMember("incoming-president");
    const incomingPublicity = await registerMember("incoming-publicity");
    const outgoing = await registerMember("outgoing");
    await db.insert(userExecutiveOffices).values({ userId: outgoing, officeId: "president", assignedBy: adminId });
    const csv = `memberId,officeId\n${incomingPresident},president\n${incomingPublicity},publicity-coordinator\n`;
    const submitted = await request(app).post("/api/president/handovers").set("Cookie", cookie).attach("file", Buffer.from(csv), { filename: "handover.csv", contentType: "text/csv" });
    expect(submitted.status).toBe(201);
    expect(submitted.body.data.status).toBe("Validated");
    const id = submitted.body.data.id as string;
    const approved = await request(app).post(`/api/president/handovers/${id}/approve`).set("Cookie", cookie);
    expect(approved.status).toBe(200);
    const published = await request(app).post(`/api/president/handovers/${id}/publish`).set("Cookie", cookie);
    expect(published.status).toBe(200);
    const presidentAssignment = await db.select().from(userExecutiveOffices).where(and(eq(userExecutiveOffices.userId, incomingPresident), eq(userExecutiveOffices.officeId, "president")));
    const outgoingAssignment = await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, outgoing));
    const outgoingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, outgoing));
    expect(presidentAssignment).toHaveLength(1);
    expect(outgoingAssignment).toHaveLength(0);
    expect(outgoingUser).toHaveLength(1);
  });

  it("rolls publication back when a real assignment insert fails", async () => {
    const { id: adminId } = await loginAdmin();
    const memberId = await registerMember("rollback");
    const [handover] = await db.insert(handovers).values({
      submittedBy: adminId, status: "Approved", parsedRows: [{ memberId, officeId: "office-that-does-not-exist" }], validationErrors: [],
    }).returning();
    await expect(handoverService.publish(handover.id, adminId)).rejects.toThrow();
    const [unchanged] = await db.select({ status: handovers.status }).from(handovers).where(eq(handovers.id, handover.id));
    expect(unchanged.status).toBe("Approved");
    const assignments = await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, memberId));
    expect(assignments).toHaveLength(0);
  });
});