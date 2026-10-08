import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { departments, handovers, userDashboardAccess, userExecutiveOffices, users } from "../src/db/schema/index.js";
import { eq, and, inArray } from "drizzle-orm";
import * as handoverService from "../src/modules/handover/handover.service.js";

vi.setConfig({ testTimeout: 300_000 });
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";
const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const TOUCHED_OFFICES = ["president", "publicity-coordinator"];
let officeBaseline: { userId: string; officeId: string; assignedBy: string | null }[] = [];
const TOUCHED_DASHBOARDS = ["president", "publicity"];
let dashboardBaseline: { userId: string; dashboardId: string; grantedBy: string | null; grantedAt: Date }[] = [];

beforeAll(async () => {
  officeBaseline = (await db.select().from(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, TOUCHED_OFFICES)))
    .map(({ userId, officeId, assignedBy }) => ({ userId, officeId, assignedBy }));
}, 120_000);

dashboardBaseline = (await db.select().from(userDashboardAccess).where(inArray(userDashboardAccess.dashboardId, TOUCHED_DASHBOARDS)))
  .map(({ userId, dashboardId, grantedBy, grantedAt }) => ({ userId, dashboardId, grantedBy, grantedAt }));

afterAll(async () => {
  await db.delete(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, TOUCHED_OFFICES));
  if (officeBaseline.length > 0) await db.insert(userExecutiveOffices).values(officeBaseline);
}, 120_000);

if (dashboardBaseline.length > 0) await db.insert(userDashboardAccess).values(dashboardBaseline).onConflictDoNothing();

let adminSession: { cookie: string; id: string } | undefined;

async function loginAdmin() {
  if (adminSession) return adminSession;
  const response = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  expect(response.status).toBe(200);
  adminSession = { cookie: response.headers["set-cookie"]![0].split(";")[0], id: response.body.data.id as string };
  return adminSession;
}

async function registerMember(label: string) {
  const response = await request(app).post("/api/auth/register").send({
    email: `handover-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: "vitestpass123", name: `Handover ${label}`, departmentId: "computer-science", gender: "Male", academicLevel: "100 Level",
  });
  expect(response.status).toBe(201);
  const id = response.body.data.id as string;
  await db.update(users).set({ subgroup: "Bible Study" }).where(eq(users.id, id));
  return id;
}

describe("executive handover", () => {
  it("rejects malformed, unknown, and duplicate CSV assignments", async () => {
    const { cookie } = await loginAdmin();

    const malformed = await request(app)
      .post("/api/president/handovers")
      .set("Cookie", cookie)
      .send({ csv: "wrong,headers\n1,2\n" });
    expect(malformed.status).toBe(400);

    const unknown = await request(app)
      .post("/api/president/handovers")
      .set("Cookie", cookie)
      .send({ csv: "name,academicLevel,subgroup,office\nNobody,100 Level,Bible Study,President\n" });
    expect(unknown.status).toBe(422);

    const memberId = await registerMember("duplicate");
    const duplicateName = `Handover duplicate ${Date.now()}`;
    const duplicateCsv = `name,academicLevel,subgroup,office\n${duplicateName},100 Level,Bible Study,President\n${duplicateName},100 Level,Bible Study,President\n`;
    await db.update(users).set({ name: duplicateName }).where(eq(users.id, memberId));
    const duplicate = await request(app)
      .post("/api/president/handovers")
      .set("Cookie", cookie)
      .send({ csv: duplicateCsv });
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.data.validationErrors.join(" ")).toContain("Duplicate assignment");
  });

  it("creates a reviewable handover, approves and publishes office transitions", async () => {
    const { cookie, id: adminId } = await loginAdmin();
    const touchedOffices = ["president", "publicity-coordinator"];
    // Snapshot EVERY assignment for the offices this test will overwrite, so we can restore them exactly.
    const snapshot = await db.select().from(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, touchedOffices));
    try {
      const incomingPresident = await registerMember("incoming-president");
      const incomingPublicity = await registerMember("incoming-publicity");
      const outgoing = await registerMember("outgoing");
      const stamp = Date.now();
      const presidentName = `Handover incoming-president ${stamp}`;
      const publicityName = `Handover incoming-publicity ${stamp}`;
      await db.update(users).set({ name: presidentName }).where(eq(users.id, incomingPresident));
      await db.update(users).set({ name: publicityName }).where(eq(users.id, incomingPublicity));
      await db.insert(userExecutiveOffices).values({ userId: outgoing, officeId: "president", assignedBy: adminId });
      await db.insert(userDashboardAccess).values({ userId: outgoing, dashboardId: "president" });

      const csv = `name,academicLevel,subgroup,office\n${presidentName},100 Level,Bible Study,President\n${publicityName},100 Level,Bible Study,Public Relation Officer (PRO)/Publicity Coordinator\n`;
      const submitted = await request(app)
        .post("/api/president/handovers")
        .set("Cookie", cookie)
        .send({ csv });
      expect(submitted.status).toBe(201);
      expect(submitted.body.data.status).toBe("Validated");
      expect(submitted.body.data.rows.map((row: { result: string }) => row.result)).toEqual(["VALID", "VALID"]);
      expect(submitted.body.data.rows.every((row: Record<string, unknown>) => !("memberId" in row) && !("officeId" in row))).toBe(true);

      const id = submitted.body.data.id as string;
      const approved = await request(app).post(`/api/president/handovers/${id}/approve`).set("Cookie", cookie);
      expect(approved.status).toBe(200);
      expect(approved.body.data.parsedRows).toBeUndefined();
      await db.update(users).set({ name: `${presidentName} renamed after validation` }).where(eq(users.id, incomingPresident));
      const published = await request(app).post(`/api/president/handovers/${id}/publish`).set("Cookie", cookie);
      expect(published.status).toBe(200);
      expect(published.body.data.parsedRows).toBeUndefined();

      const presidentAssignment = await db.select().from(userExecutiveOffices).where(and(eq(userExecutiveOffices.userId, incomingPresident), eq(userExecutiveOffices.officeId, "president")));
      const outgoingAssignment = await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, outgoing));
      const outgoingUser = await db.select({ id: users.id }).from(users).where(eq(users.id, outgoing));
      expect(presidentAssignment).toHaveLength(1);
      expect(outgoingAssignment).toHaveLength(0);
      expect(outgoingUser).toHaveLength(1);
      const outgoingDashboard = await db.select().from(userDashboardAccess)
  .where(and(eq(userDashboardAccess.userId, outgoing), eq(userDashboardAccess.dashboardId, "president")));
expect(outgoingDashboard).toHaveLength(0);
    } finally {
      // Wipe whatever the test left in these offices, then put back exactly what was there before.
      await db.delete(userExecutiveOffices).where(inArray(userExecutiveOffices.officeId, touchedOffices));
      if (snapshot.length > 0) {
        await db.insert(userExecutiveOffices).values(snapshot.map(({ userId, officeId, assignedBy }) => ({ userId, officeId, assignedBy })));
      }
    }
  });

  it("reports not-found and ambiguous identity matches without assigning either candidate", async () => {
    const { cookie } = await loginAdmin();
    const [deptOne, deptTwo] = await db.select().from(departments).limit(2);
    expect(deptTwo).toBeDefined();
    const first = await registerMember("ambiguous-one");
    const second = await registerMember("ambiguous-two");
    const ambiguousName = `Sam Luke ${Date.now()}`;
    await db.update(users).set({ name: ambiguousName, departmentId: deptOne.id }).where(eq(users.id, first));
    await db.update(users).set({ name: ambiguousName, departmentId: deptTwo.id }).where(eq(users.id, second));

    const response = await request(app)
      .post("/api/president/handovers")
      .set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${ambiguousName},100 Level,Bible Study,President\nNobody ${Date.now()},100 Level,Bible Study,President\n` });

    expect(response.status).toBe(422);
    expect(response.body.data.status).toBe("Draft");
    expect(response.body.data.rows).toEqual([
      expect.objectContaining({ result: "AMBIGUOUS", candidates: expect.arrayContaining([
        expect.objectContaining({ name: ambiguousName, department: deptOne.name }),
        expect.objectContaining({ name: ambiguousName, department: deptTwo.name }),
      ]) }),
      expect.objectContaining({ result: "NOT_FOUND" }),
    ]);
    expect(response.body.data.rows.every((row: Record<string, unknown>) => !("memberId" in row) && !("officeId" in row))).toBe(true);
    const approve = await request(app).post(`/api/president/handovers/${response.body.data.id}/approve`).set("Cookie", cookie);
    const publish = await request(app).post(`/api/president/handovers/${response.body.data.id}/publish`).set("Cookie", cookie);
    expect(approve.status).toBe(409);
    expect(publish.status).toBe(409);
    const stored = await db.select({ parsedRows: handovers.parsedRows }).from(handovers).where(eq(handovers.id, response.body.data.id));
    expect(stored[0].parsedRows.every((row) => row.memberId === null)).toBe(true);
  });

  it("resolves human-readable office names to their internal IDs", async () => {
    const { cookie } = await loginAdmin();
    const memberId = await registerMember("office-name");
    const memberName = `Handover office-name ${Date.now()}`;
    await db.update(users).set({ name: memberName }).where(eq(users.id, memberId));
    const response = await request(app)
      .post("/api/president/handovers")
      .set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${memberName},100 Level,Bible Study,Bible Study Coordinator\n` });

    expect(response.status).toBe(422);
    const stored = await db.select({ parsedRows: handovers.parsedRows }).from(handovers).where(eq(handovers.id, response.body.data.id));
    expect(stored[0].parsedRows[0]).toMatchObject({ memberId, officeId: "bible-study-coordinator" });
  });

  it("uses conservative identity matching and reports inactive members", async () => {
    const { cookie } = await loginAdmin();
    const stamp = Date.now();
    const exactName = `Sam Luke ${stamp}`;
    const similarName = `Sam Lukes ${stamp}`;
    const nullSubgroupName = `Null Subgroup Sam ${stamp}`;
    const exact = await registerMember("exact-identity");
    const nullSubgroup = await registerMember("null-subgroup");
    const similar = await registerMember("similar-name");
    await db.update(users).set({ name: exactName }).where(eq(users.id, exact));
    await db.update(users).set({ name: nullSubgroupName, subgroup: null }).where(eq(users.id, nullSubgroup));
    await db.update(users).set({ name: similarName }).where(eq(users.id, similar));

    const valid = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n  ${exactName.toLowerCase()}  ,100 Level, bible study ,President\n` });
    expect(valid.status).toBe(201);
    expect(valid.body.data.rows[0].result).toBe("VALID");

    const partial = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\nSam ${stamp},100 Level,Bible Study,President\n` });
    expect(partial.status).toBe(422);
    expect(partial.body.data.status).toBe("Draft");
    expect(partial.body.data.rows[0].result).toBe("NOT_FOUND");

    const nullMatch = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${nullSubgroupName},100 Level,Bible Study,President\n` });
    expect(nullMatch.status).toBe(422);
    expect(nullMatch.body.data.rows[0].result).toBe("NOT_FOUND");
    expect(nullMatch.body.data.status).toBe("Draft");

    await db.update(users).set({ accountStatus: "Suspended" }).where(eq(users.id, exact));
    const inactive = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${exactName},100 Level,Bible Study,President\n` });
    expect(inactive.status).toBe(422);
    expect(inactive.body.data.status).toBe("Draft");
    expect(inactive.body.data.rows[0].result).toBe("INACTIVE");
  });

  it("rejects unknown offices and case-variant duplicate member rows", async () => {
    const { cookie } = await loginAdmin();
    const memberId = await registerMember("edge-duplicate");
    const memberName = `Case Duplicate ${Date.now()}`;
    await db.update(users).set({ name: memberName }).where(eq(users.id, memberId));

    const unknownOffice = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${memberName},100 Level,Bible Study,Chief Snacks Officer\n` });
    expect(unknownOffice.status).toBe(422);
    expect(unknownOffice.body.data.status).toBe("Draft");
    expect(unknownOffice.body.data.validationErrors.join(" ")).toContain("unknown office");

    const duplicate = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n ${memberName.toUpperCase()} ,100 Level,Bible Study,President\n${memberName.toLowerCase()},100 Level,Bible Study,Bible Study Coordinator\n` });
    expect(duplicate.status).toBe(422);
    expect(duplicate.body.data.validationErrors.join(" ")).toContain("Conflicting multiple-office assignment");
    // No internal IDs may appear in what the President sees (the handover's own id is excluded on purpose).
    expect(JSON.stringify(duplicate.body.data.validationErrors)).not.toMatch(UUID_PATTERN);
    expect(JSON.stringify(duplicate.body.data.rows)).not.toMatch(UUID_PATTERN);
  });

  it("blocks publication when a validated member becomes inactive", async () => {
    const { cookie } = await loginAdmin();
    const memberId = await registerMember("inactive-after-validation");
    const memberName = `Inactive After Validation ${Date.now()}`;
    await db.update(users).set({ name: memberName }).where(eq(users.id, memberId));
    const submitted = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${memberName},100 Level,Bible Study,President\n` });
    expect(submitted.status).toBe(201);
    const id = submitted.body.data.id as string;
    expect((await request(app).post(`/api/president/handovers/${id}/approve`).set("Cookie", cookie)).status).toBe(200);
    await db.update(users).set({ accountStatus: "Suspended" }).where(eq(users.id, memberId));
    const published = await request(app).post(`/api/president/handovers/${id}/publish`).set("Cookie", cookie);
    expect(published.status).toBe(409);
    const [unchanged] = await db.select({ status: handovers.status }).from(handovers).where(eq(handovers.id, id));
    expect(unchanged.status).toBe("Approved");
    expect(await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, memberId))).toHaveLength(0);
  });

  it("blocks publication when a validated member is deleted", async () => {
    const { cookie } = await loginAdmin();
    const memberId = await registerMember("deleted-after-validation");
    const memberName = `Deleted After Validation ${Date.now()}`;
    await db.update(users).set({ name: memberName }).where(eq(users.id, memberId));
    const submitted = await request(app).post("/api/president/handovers").set("Cookie", cookie)
      .send({ csv: `name,academicLevel,subgroup,office\n${memberName},100 Level,Bible Study,President\n` });
    expect(submitted.status).toBe(201);
    const id = submitted.body.data.id as string;
    expect((await request(app).post(`/api/president/handovers/${id}/approve`).set("Cookie", cookie)).status).toBe(200);
    await db.delete(users).where(eq(users.id, memberId));
    const published = await request(app).post(`/api/president/handovers/${id}/publish`).set("Cookie", cookie);
    expect(published.status).toBe(409);
    const [unchanged] = await db.select({ status: handovers.status }).from(handovers).where(eq(handovers.id, id));
    expect(unchanged.status).toBe("Approved");
  });

  it("rolls publication back when a real assignment insert fails", async () => {
    const { id: adminId } = await loginAdmin();
    const memberId = await registerMember("rollback");
    const [handover] = await db.insert(handovers).values({
      submittedBy: adminId, status: "Approved", parsedRows: [{ name: "Handover rollback", academicLevel: "100 Level", subgroup: "Bible Study", office: "Unknown", memberId, officeId: "office-that-does-not-exist" }], validationErrors: [],
    }).returning();
    await expect(handoverService.publish(handover.id, adminId)).rejects.toThrow();
    const [unchanged] = await db.select({ status: handovers.status }).from(handovers).where(eq(handovers.id, handover.id));
    expect(unchanged.status).toBe("Approved");
    const assignments = await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, memberId));
    expect(assignments).toHaveLength(0);
  });
});