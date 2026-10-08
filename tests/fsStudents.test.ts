import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { userExecutiveOffices, users } from "../src/db/schema/index.js";

vi.setConfig({ testTimeout: 300_000 });

const stamp = Date.now();
const studentName = `Students Applicant ${stamp}`;
const studentPhone = "08087654321";

async function registerMember(name: string, academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fsstu-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("FS students (VP)", () => {
  let vpId: string;
  let vpCookie: string;
  let outsiderCookie: string;
  let applicantId: string;
  let classId: string;
  let studentId: string;

  afterAll(async () => {
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  it("setup: VP, outsider, an applicant approved into a new class", async () => {
    const vp = await registerMember(`Students VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });

    outsiderCookie = (await registerMember(`Students Outsider ${stamp}`, "100 Level")).cookie;

    const applicant = await registerMember(studentName, "200 Level");
    applicantId = applicant.id;
    await db.update(users).set({ phoneNumber: studentPhone }).where(eq(users.id, applicantId));

    const cls = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `Stu Class ${stamp}`, academicSessionId: "2027/2028", semester: "First" });
    expect(cls.status).toBe(201);
    classId = cls.body.data.id;

    const apply = await request(app).post("/api/fs/admissions").set("Cookie", applicant.cookie).send({ testimony: "Hello" });
    expect(apply.status).toBe(201);
    const approve = await request(app).patch(`/api/fs/admissions/admin/${apply.body.data.id}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId, notes: "Welcome" });
    expect(approve.status).toBe(200);
  });

  it("list returns the full row shape and pagination meta", async () => {
    const res = await request(app).get(`/api/fs/students?classId=${classId}&page=1&limit=5`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 1, page: 1, limit: 5 });
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row).toMatchObject({
      userId: applicantId,
      studentName,
      studentPhone,
      academicLevel: "200 Level",
      department: "Computer Science",
      classId,
      className: `Stu Class ${stamp}`,
      status: "Active",
    });
    expect(row.studentEmail).toContain("@");
    studentId = row.id;
  });

  it("filters: search, status, invalid status, invalid classId", async () => {
    const found = await request(app).get(`/api/fs/students?search=${encodeURIComponent(studentName)}&status=Active`).set("Cookie", vpCookie);
    expect(found.status).toBe(200);
    expect(found.body.data.some((s: any) => s.id === studentId)).toBe(true);

    const none = await request(app).get(`/api/fs/students?classId=${classId}&status=Graduated`).set("Cookie", vpCookie);
    expect(none.status).toBe(200);
    expect(none.body.data).toHaveLength(0);
    expect(none.body.meta.total).toBe(0);

    const badStatus = await request(app).get("/api/fs/students?status=Nope").set("Cookie", vpCookie);
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.code).toBe("INVALID_STATUS_FILTER");

    const badClass = await request(app).get("/api/fs/students?classId=not-a-uuid").set("Cookie", vpCookie);
    expect(badClass.status).toBe(400);
    expect(badClass.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("detail returns the student with admission info; bad and unknown ids are clean errors", async () => {
    const res = await request(app).get(`/api/fs/students/${studentId}`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: studentId, studentName, studentPhone, className: `Stu Class ${stamp}`, status: "Active" });
    expect(res.body.data.admission).toMatchObject({ testimony: "Hello", reviewNotes: "Welcome" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const bad = await request(app).get("/api/fs/students/not-a-uuid").set("Cookie", vpCookie);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_ID_FORMAT");

    const missing = await request(app).get(`/api/fs/students/${randomUUID()}`).set("Cookie", vpCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("STUDENT_NOT_FOUND");
  });

  it("export returns escaped CSV with the right header, and rejects bad filters", async () => {
    await db.update(users).set({ name: `=Calc, "Test" ${stamp}` }).where(eq(users.id, applicantId));
    const res = await request(app).get(`/api/fs/students/export?classId=${classId}`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain("fs-students.csv");
    const lines = res.text.split("\n");
    expect(lines[0]).toBe("Name,Email,Phone,Level,Department,Class,Status");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(`"'=Calc, ""Test"" ${stamp}"`);
    expect(lines[1]).toContain(studentPhone);
    await db.update(users).set({ name: studentName }).where(eq(users.id, applicantId));

    const badStatus = await request(app).get("/api/fs/students/export?status=Nope").set("Cookie", vpCookie);
    expect(badStatus.status).toBe(400);
    expect(badStatus.body.error.code).toBe("INVALID_STATUS_FILTER");
  });

  it("people without the VP office are blocked from list, detail, export and withdraw", async () => {
    for (const path of ["/api/fs/students", `/api/fs/students/${studentId}`, "/api/fs/students/export"]) {
      const res = await request(app).get(path).set("Cookie", outsiderCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OFFICE_REQUIRED");
    }
    const withdraw = await request(app).patch(`/api/fs/students/${studentId}/withdraw`).set("Cookie", outsiderCookie);
    expect(withdraw.status).toBe(403);
  });

  it("record-completion and bulk-graduate no longer exist", async () => {
    const completion = await request(app).patch(`/api/fs/students/${studentId}/record-completion`).set("Cookie", vpCookie);
    expect(completion.status).toBe(404);
    const bulk = await request(app).post("/api/fs/students/bulk-graduate").set("Cookie", vpCookie);
    expect(bulk.status).toBe(404);
  });

  it("withdraw: bad id, unknown id, success, and a second attempt", async () => {
    const bad = await request(app).patch("/api/fs/students/not-a-uuid/withdraw").set("Cookie", vpCookie);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_ID_FORMAT");

    const missing = await request(app).patch(`/api/fs/students/${randomUUID()}/withdraw`).set("Cookie", vpCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("STUDENT_NOT_FOUND");

    const ok = await request(app).patch(`/api/fs/students/${studentId}/withdraw`).set("Cookie", vpCookie);
    expect(ok.status).toBe(200);
    expect(ok.body.data.status).toBe("Withdrawn");

    const again = await request(app).patch(`/api/fs/students/${studentId}/withdraw`).set("Cookie", vpCookie);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("STUDENT_NOT_ACTIVE");
  });
});