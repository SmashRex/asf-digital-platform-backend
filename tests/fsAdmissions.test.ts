import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { userExecutiveOffices, users } from "../src/db/schema/index.js";

vi.setConfig({ testTimeout: 300_000 });

const stamp = Date.now();
const applicantName = `Admissions Applicant ${stamp}`;
const applicantPhone = "08012345678";

async function registerMember(name: string, academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fsadm-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("FS admissions (VP)", () => {
  let vpId: string;
  let vpCookie: string;
  let applicantCookie: string;
  let admissionId: string;
  let activeClassId: string;
  let archivedClassId: string;

  afterAll(async () => {
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  it("setup: temporary VP, applicant with a phone number, one active and one archived class", async () => {
    const vp = await registerMember(`Admissions VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });

    const applicant = await registerMember(applicantName, "200 Level");
    applicantCookie = applicant.cookie;
    await db.update(users).set({ phoneNumber: applicantPhone }).where(eq(users.id, applicant.id));

    const active = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `Adm Active ${stamp}`, academicSessionId: "2027/2028", semester: "First" });
    expect(active.status).toBe(201);
    activeClassId = active.body.data.id;

    const archived = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `Adm Archived ${stamp}`, academicSessionId: "2027/2028", semester: "First" });
    expect(archived.status).toBe(201);
    archivedClassId = archived.body.data.id;
    const archive = await request(app).put(`/api/fs/classes/${archivedClassId}`).set("Cookie", vpCookie).send({ status: "Archived" });
    expect(archive.status).toBe(200);
  });

  it("applicant applies", async () => {
    const res = await request(app).post("/api/fs/admissions").set("Cookie", applicantCookie).send({ testimony: "Ready to learn." });
    expect(res.status).toBe(201);
    admissionId = res.body.data.id;
  });

  it("list returns phone, department, and pagination meta; search narrows it", async () => {
    const res = await request(app)
      .get(`/api/fs/admissions/admin?status=Pending&search=${encodeURIComponent(applicantName)}&page=1&limit=5`)
      .set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 5 });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({
      id: admissionId,
      applicantName,
      applicantPhone,
      applicantLevel: "200 Level",
      department: "Computer Science",
      status: "Pending",
    });
    expect(res.body.data[0].applicantEmail).toContain("@");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("limit is respected and an invalid status or page is rejected", async () => {
    const limited = await request(app).get("/api/fs/admissions/admin?limit=1").set("Cookie", vpCookie);
    expect(limited.status).toBe(200);
    expect(limited.body.data.length).toBeLessThanOrEqual(1);
    expect(limited.body.meta.limit).toBe(1);

    const badStatus = await request(app).get("/api/fs/admissions/admin?status=Nope").set("Cookie", vpCookie);
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.code).toBe("INVALID_STATUS_FILTER");

    const badPage = await request(app).get("/api/fs/admissions/admin?page=0").set("Cookie", vpCookie);
    expect(badPage.status).toBe(400);
    expect(badPage.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("review rejects a malformed admission id", async () => {
    const res = await request(app).patch("/api/fs/admissions/admin/not-a-uuid/review").set("Cookie", vpCookie).send({ action: "reject" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_ID_FORMAT");
  });

  it("approving into a missing or archived class fails and leaves the admission Pending", async () => {
    const missing = await request(app).patch(`/api/fs/admissions/admin/${admissionId}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId: randomUUID() });
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLASS_NOT_FOUND");

    const archived = await request(app).patch(`/api/fs/admissions/admin/${admissionId}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId: archivedClassId });
    expect(archived.status).toBe(409);
    expect(archived.body.error.code).toBe("CLASS_NOT_ACTIVE");

    const stillPending = await request(app)
      .get(`/api/fs/admissions/admin?status=Pending&search=${encodeURIComponent(applicantName)}`).set("Cookie", vpCookie);
    expect(stillPending.body.data).toHaveLength(1);
  });

  it("approving into an active class creates the student, and the new student cannot apply again", async () => {
    const approve = await request(app).patch(`/api/fs/admissions/admin/${admissionId}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId: activeClassId, notes: "Welcome" });
    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe("Approved");

    const students = await request(app).get(`/api/fs/students?classId=${activeClassId}`).set("Cookie", vpCookie);
    expect(students.body.data.some((s: any) => s.studentName === applicantName && s.status === "Active")).toBe(true);

    const again = await request(app).post("/api/fs/admissions").set("Cookie", applicantCookie).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("ALREADY_FS_STUDENT");

    const rereview = await request(app).patch(`/api/fs/admissions/admin/${admissionId}/review`).set("Cookie", vpCookie).send({ action: "reject" });
    expect(rereview.status).toBe(409);
    expect(rereview.body.error.code).toBe("ALREADY_REVIEWED");
  });
});