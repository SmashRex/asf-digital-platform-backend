import { describe, expect, it, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { auditLogs, governanceRequests, userExecutiveOffices } from "../src/db/schema/index.js";
import { eq } from "drizzle-orm";
import * as governanceService from "../src/modules/governance/governance.service.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";
import { recordAudit } from "../src/utils/auditLog.js";

describe("governance requests", () => {
  let adminId: string;
  let adminCookie: string;

  beforeAll(async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    adminId = login.body.data.id;
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];
  });

  it("creates a pending request", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Governance Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });
    const created = await request(app)
      .post("/api/governance/requests")
      .set("Cookie", adminCookie)
      .send({ requestType: "office_assignment", payload: { userId: member.body.data.id, officeId: "president" } });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("Pending");
  });

  it("rejects a rejection with no reason, and accepts a rejection with a real reason", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-reject-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Reject Reason Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });

    const [noReasonRequest] = await db
      .insert(governanceRequests)
      .values({
        requestType: "office_assignment",
        requestedBy: member.body.data.id,
        payload: { userId: member.body.data.id, officeId: "librarian" },
      })
      .returning();

    const missingReason = await request(app)
      .post(`/api/president/governance/requests/${noReasonRequest.id}/reject`)
      .set("Cookie", adminCookie)
      .send({});
    expect(missingReason.status).toBe(400);
    expect(missingReason.body.error.code).toBe("VALIDATION_ERROR");

    const [realReasonRequest] = await db
      .insert(governanceRequests)
      .values({
        requestType: "office_assignment",
        requestedBy: member.body.data.id,
        payload: { userId: member.body.data.id, officeId: "librarian" },
      })
      .returning();

    const withReason = await request(app)
      .post(`/api/president/governance/requests/${realReasonRequest.id}/reject`)
      .set("Cookie", adminCookie)
      .send({ reason: "Not required for this member at this time" });
    expect(withReason.status).toBe(200);
    expect(withReason.body.data.status).toBe("Rejected");

    const [row] = await db
      .select({ status: governanceRequests.status, reviewNotes: governanceRequests.reviewNotes, reviewedBy: governanceRequests.reviewedBy })
      .from(governanceRequests)
      .where(eq(governanceRequests.id, realReasonRequest.id));
    expect(row.status).toBe("Rejected");
    expect(row.reviewNotes).toBe("Not required for this member at this time");
    expect(row.reviewedBy).toBe(adminId);
  });

  it("blocks the requester from approving their own request", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-self-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Self Approval Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });
    const created = await request(app)
      .post("/api/governance/requests")
      .set("Cookie", adminCookie)
      .send({ requestType: "office_assignment", payload: { userId: member.body.data.id, officeId: "president" } });
    const approval = await request(app)
      .post(`/api/president/governance/requests/${created.body.data.id}/approve`)
      .set("Cookie", adminCookie);
    expect(approval.status).toBe(403);
    expect(approval.body.error.code).toBe("SELF_APPROVAL_BLOCKED");
  });

  it("rolls back the assignment when approval fails inside the transaction", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-rollback-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Rollback Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });
    const [created] = await db
      .insert(governanceRequests)
      .values({
        requestType: "office_assignment",
        requestedBy: adminId,
        payload: { userId: member.body.data.id, officeId: "office-that-does-not-exist" },
      })
      .returning();

    await expect(
      governanceService.approveRequest(created.id, `00000000-0000-0000-0000-000000000001`)
    ).rejects.toThrow();

    const [unchanged] = await db
      .select({ status: governanceRequests.status })
      .from(governanceRequests)
      .where(eq(governanceRequests.id, created.id));
    const assignments = await db
      .select()
      .from(userExecutiveOffices)
      .where(eq(userExecutiveOffices.userId, member.body.data.id));
    expect(unchanged.status).toBe("Pending");
    expect(assignments).toHaveLength(0);
  });

  it("a successful approval creates the real assignment and a matching audit row", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-approve-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Approve Success Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });

    const [created] = await db
      .insert(governanceRequests)
      .values({
        requestType: "office_assignment",
        requestedBy: member.body.data.id,
        payload: { userId: member.body.data.id, officeId: "librarian" },
      })
      .returning();

    const approval = await request(app)
      .post(`/api/president/governance/requests/${created.id}/approve`)
      .set("Cookie", adminCookie);
    expect(approval.status).toBe(200);
    expect(approval.body.data.status).toBe("Approved");

    const assignments = await db
      .select()
      .from(userExecutiveOffices)
      .where(eq(userExecutiveOffices.userId, member.body.data.id));
    expect(assignments.length).toBeGreaterThan(0);
    expect(assignments.some((a) => a.officeId === "librarian")).toBe(true);

    const auditRows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.targetId, created.id));
    expect(auditRows.length).toBeGreaterThan(0);
    expect(auditRows[0].actorId).toBe(adminId);
  });

  it("rejects approving a request that is no longer Pending (invalid state transition)", async () => {
    const member = await request(app).post("/api/auth/register").send({
      email: `governance-doubleapprove-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Double Approve Target",
      departmentId: "computer-science",
      gender: "Male",
      academicLevel: "100 Level",
    });

    const [created] = await db
      .insert(governanceRequests)
      .values({
        requestType: "office_assignment",
        requestedBy: member.body.data.id,
        payload: { userId: member.body.data.id, officeId: "librarian" },
      })
      .returning();

    const firstApproval = await request(app)
      .post(`/api/president/governance/requests/${created.id}/approve`)
      .set("Cookie", adminCookie);
    expect(firstApproval.status).toBe(200);

    const secondApproval = await request(app)
      .post(`/api/president/governance/requests/${created.id}/approve`)
      .set("Cookie", adminCookie);
    expect(secondApproval.status).toBe(409);
    expect(secondApproval.body.error.code).toBe("REQUEST_NOT_PENDING");

    const [row] = await db
      .select({ status: governanceRequests.status })
      .from(governanceRequests)
      .where(eq(governanceRequests.id, created.id));
    expect(row.status).toBe("Approved");
  });

  it("writes audit metadata through the reusable helper", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const actorId = login.body.data.id as string;
    const targetId = `audit-test-${Date.now()}`;
    const row = await recordAudit({ actorId, action: "test.audit", targetType: "test", targetId, metadata: { before: "a", after: "b" } });
    expect(row.action).toBe("test.audit");
    expect(row.targetId).toBe(targetId);
    expect(row.metadata).toEqual({ before: "a", after: "b" });
  });
});