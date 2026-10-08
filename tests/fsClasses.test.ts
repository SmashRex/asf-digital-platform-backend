import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { userExecutiveOffices } from "../src/db/schema/index.js";

vi.setConfig({ testTimeout: 300_000 });

const stamp = Date.now();
const className = `Class, "A" ${stamp}`;
const teacherName = `Classes Teacher ${stamp}`;
const studentName = `Classes Student ${stamp}`;

async function registerMember(name: string, academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fscls-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("FS classes (VP)", () => {
  let vpId: string;
  let vpCookie: string;
  let outsiderCookie: string;
  let teacherId: string;
  let classId: string;

  afterAll(async () => {
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  it("setup: VP, outsider, teacher and student candidates", async () => {
    const vp = await registerMember(`Classes VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });
    outsiderCookie = (await registerMember(`Classes Outsider ${stamp}`, "100 Level")).cookie;
    teacherId = (await registerMember(teacherName, "500 Level")).id;
  });

  it("create validates the body and the academic session", async () => {
    const badSession = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: "Class X", academicSessionId: "1900/1901", semester: "First" });
    expect(badSession.status).toBe(400);
    expect(badSession.body.error.code).toBe("INVALID_ACADEMIC_SESSION");

    const badBody = await request(app).post("/api/fs/classes").set("Cookie", vpCookie).send({ name: "x", semester: "Third" });
    expect(badBody.status).toBe(400);
    expect(badBody.body.error.code).toBe("VALIDATION_ERROR");

    const ok = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: className, academicSessionId: "2027/2028", semester: "First", teacherCap: 3 });
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ name: className, status: "Active", teacherCap: 3 });
    classId = ok.body.data.id;
  });

  it("assigns a teacher and enrolls a student; list shows counts and filters work", async () => {
    const assign = await request(app).post(`/api/fs/classes/${classId}/teachers`).set("Cookie", vpCookie)
      .send({ action: "assign", teacherId });
    expect(assign.status).toBe(201);

    const student = await registerMember(studentName, "200 Level");
    const apply = await request(app).post("/api/fs/admissions").set("Cookie", student.cookie).send({});
    expect(apply.status).toBe(201);
    const approve = await request(app).patch(`/api/fs/admissions/admin/${apply.body.data.id}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId });
    expect(approve.status).toBe(200);

    const list = await request(app).get("/api/fs/classes?status=Active&academicSessionId=2027/2028").set("Cookie", vpCookie);
    expect(list.status).toBe(200);
    const row = list.body.data.find((c: any) => c.id === classId);
    expect(row).toMatchObject({ teacherCount: 1, activeStudentCount: 1, name: className });

    const archivedOnly = await request(app).get("/api/fs/classes?status=Archived").set("Cookie", vpCookie);
    expect(archivedOnly.body.data.some((c: any) => c.id === classId)).toBe(false);

    const badFilter = await request(app).get("/api/fs/classes?status=Nope").set("Cookie", vpCookie);
    expect(badFilter.status).toBe(400);
    expect(badFilter.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("detail returns the class with teachers and students; bad and unknown ids are clean", async () => {
    const res = await request(app).get(`/api/fs/classes/${classId}`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: classId, name: className });
    expect(res.body.data.teachers).toHaveLength(1);
    expect(res.body.data.teachers[0]).toMatchObject({ teacherId, teacherName });
    expect(res.body.data.students).toHaveLength(1);
    expect(res.body.data.students[0]).toMatchObject({ studentName, academicLevel: "200 Level", status: "Active" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const bad = await request(app).get("/api/fs/classes/not-a-uuid").set("Cookie", vpCookie);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_ID_FORMAT");

    const missing = await request(app).get(`/api/fs/classes/${randomUUID()}`).set("Cookie", vpCookie);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("CLASS_NOT_FOUND");
  });

  it("update: validation, rename, reset teacherCap to null, archive", async () => {
    const bad = await request(app).put("/api/fs/classes/not-a-uuid").set("Cookie", vpCookie).send({ name: "Whatever" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_ID_FORMAT");

    const missing = await request(app).put(`/api/fs/classes/${randomUUID()}`).set("Cookie", vpCookie).send({ name: "Whatever" });
    expect(missing.status).toBe(404);

    const invalid = await request(app).put(`/api/fs/classes/${classId}`).set("Cookie", vpCookie).send({ status: "Deleted" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe("VALIDATION_ERROR");

    const reset = await request(app).put(`/api/fs/classes/${classId}`).set("Cookie", vpCookie).send({ teacherCap: null });
    expect(reset.status).toBe(200);
    expect(reset.body.data.teacherCap).toBeNull();

    const archive = await request(app).put(`/api/fs/classes/${classId}`).set("Cookie", vpCookie).send({ status: "Archived" });
    expect(archive.status).toBe(200);
    expect(archive.body.data.status).toBe("Archived");
  });

  it("roster export is proper CSV with escaped values, and ids are validated", async () => {
    const res = await request(app).get(`/api/fs/classes/${classId}/roster-export`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.text).toContain(`Class: "Class, ""A"" ${stamp}"`);
    expect(res.text).toContain(`Teachers: ${teacherName}`);
    expect(res.text).toContain("Student Name,Email,Level,Status");
    expect(res.text).toContain(studentName);

    const bad = await request(app).get("/api/fs/classes/not-a-uuid/roster-export").set("Cookie", vpCookie);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("INVALID_ID_FORMAT");
  });

  it("people without the VP office are blocked from every class route", async () => {
    const requests = [
      request(app).get("/api/fs/classes").set("Cookie", outsiderCookie),
      request(app).get(`/api/fs/classes/${classId}`).set("Cookie", outsiderCookie),
      request(app).post("/api/fs/classes").set("Cookie", outsiderCookie).send({}),
      request(app).put(`/api/fs/classes/${classId}`).set("Cookie", outsiderCookie).send({}),
      request(app).get(`/api/fs/classes/${classId}/roster-export`).set("Cookie", outsiderCookie),
    ];
    for (const res of await Promise.all(requests)) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OFFICE_REQUIRED");
    }
  });
});