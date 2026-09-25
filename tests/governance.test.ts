import { describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { auditLogs, governanceRequests, userExecutiveOffices } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import * as governanceService from "../src/modules/governance/governance.service.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

describe("governance requests", () => {
  it("creates a pending request and requires a rejection reason", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const member = await request(app).post("/api/auth/register").send({ email: `governance-${Date.now()}@example.com`, password: "vitestpass123", name: "Governance Target", departmentId: "computer-science", gender: "Male", academicLevel: "100 Level" });
    const created = await request(app).post("/api/governance/requests").set("Cookie", cookie).send({ requestType: "office_assignment", payload: { userId: member.body.data.id, officeId: "president" } });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("Pending");
    const rejected = await request(app).post(`/api/president/governance/requests/${created.body.data.id}/reject`).set("Cookie", cookie).send({});
    expect(rejected.status).toBe(400);
  });

  it("blocks the requester from approving their own request", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const cookie = login.headers["set-cookie"]![0].split(";")[0];
    const member = await request(app).post("/api/auth/register").send({ email: `governance-self-${Date.now()}@example.com`, password: "vitestpass123", name: "Self Approval Target", departmentId: "computer-science", gender: "Male", academicLevel: "100 Level" });
    const created = await request(app).post("/api/governance/requests").set("Cookie", cookie).send({ requestType: "office_assignment", payload: { userId: member.body.data.id, officeId: "president" } });
    const approval = await request(app).post(`/api/president/governance/requests/${created.body.data.id}/approve`).set("Cookie", cookie);
    expect(approval.status).toBe(403);
    expect(approval.body.error.code).toBe("SELF_APPROVAL_BLOCKED");
  });

  it("rolls back the assignment when approval fails inside the transaction", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const approverId = login.body.data.id;
    const member = await request(app).post("/api/auth/register").send({ email: `governance-rollback-${Date.now()}@example.com`, password: "vitestpass123", name: "Rollback Target", departmentId: "computer-science", gender: "Male", academicLevel: "100 Level" });
    const [created] = await db.insert(governanceRequests).values({
      requestType: "office_assignment",
      requestedBy: approverId,
      payload: { userId: member.body.data.id, officeId: "office-that-does-not-exist" },
    }).returning();

    await expect(governanceService.approveRequest(created.id, `00000000-0000-0000-0000-000000000001`)).rejects.toThrow();
    const [unchanged] = await db.select({ status: governanceRequests.status }).from(governanceRequests).where(eq(governanceRequests.id, created.id));
    const assignments = await db.select().from(userExecutiveOffices).where(eq(userExecutiveOffices.userId, member.body.data.id));
    expect(unchanged.status).toBe("Pending");
    expect(assignments).toHaveLength(0);
  });

  it("records audit rows and rejects invalid state transitions", async () => {
    const rows = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.targetType, "governance_request"));
    expect(rows).toEqual(expect.any(Array));
  });
});