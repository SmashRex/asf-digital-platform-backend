import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { userExecutiveOffices, users } from "../src/db/schema/index.js";

vi.setConfig({ testTimeout: 300_000 });

const stamp = Date.now();

async function registerMember(name: string, academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fstch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("FS teachers (VP)", () => {
  let vpId: string;
  let vpCookie: string;
  let outsiderCookie: string;
  let t1: string;
  let t2: string;
  let tNoSubgroup: string;
  let tSuspended: string;
  let classId: string;

  afterAll(async () => {
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  const assign = (id: string, teacherId: string, cookie?: string) =>
    request(app).post(`/api/fs/classes/${id}/teachers`).set("Cookie", cookie ?? vpCookie).send({ action: "assign", teacherId });
  const remove = (id: string, teacherId: string) =>
    request(app).post(`/api/fs/classes/${id}/teachers`).set("Cookie", vpCookie).send({ action: "remove", teacherId });

  it("setup: VP, outsider, four teacher candidates and a class with a cap of 1", async () => {
    const vp = await registerMember(`Teachers VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });
    outsiderCookie = (await registerMember(`Teachers Outsider ${stamp}`, "100 Level")).cookie;

    t1 = (await registerMember(`TeacherA ${stamp}`, "500 Level")).id;
    t2 = (await registerMember(`TeacherB ${stamp}`, "400 Level")).id;
    tNoSubgroup = (await registerMember(`TeacherC ${stamp}`, "300 Level")).id;
    tSuspended = (await registerMember(`TeacherD ${stamp}`, "300 Level")).id;
    await db.update(users).set({ subgroup: "Prayer" }).where(eq(users.id, t1));
    await db.update(users).set({ subgroup: "Drama" }).where(eq(users.id, t2));
    await db.update(users).set({ subgroup: "Choir", accountStatus: "Suspended" }).where(eq(users.id, tSuspended));

    const cls = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `Teachers Class ${stamp}`, academicSessionId: "2027/2028", semester: "First", teacherCap: 1 });
    expect(cls.status).toBe(201);
    classId = cls.body.data.id;
  });

  it("people without the VP office are blocked", async () => {
    for (const path of ["/api/fs/teachers", "/api/fs/teachers/eligible"]) {
      const res = await request(app).get(path).set("Cookie", outsiderCookie);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("OFFICE_REQUIRED");
    }
    const res = await assign(classId, t1, outsiderCookie);
    expect(res.status).toBe(403);
  });

  it("eligible list: only active members with a subgroup, with search and pagination", async () => {
    const res = await request(app).get(`/api/fs/teachers/eligible?search=${stamp}&limit=10`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    expect(res.body.meta).toEqual({ total: 2, page: 1, limit: 10 });
    const ids = res.body.data.map((row: any) => row.id).sort();
    expect(ids).toEqual([t1, t2].sort());
    const a = res.body.data.find((row: any) => row.id === t1);
    expect(a).toMatchObject({
      name: `TeacherA ${stamp}`, academicLevel: "500 Level", subgroup: "Prayer", department: "Computer Science",
    });
    expect(a.email).toContain("@");
    expect(a).toHaveProperty("phone");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const paged = await request(app).get(`/api/fs/teachers/eligible?search=${stamp}&limit=1&page=2`).set("Cookie", vpCookie);
    expect(paged.status).toBe(200);
    expect(paged.body.data).toHaveLength(1);
    expect(paged.body.meta).toEqual({ total: 2, page: 2, limit: 1 });

    const bad = await request(app).get("/api/fs/teachers/eligible?page=0").set("Cookie", vpCookie);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("assign rejects ineligible or invalid teachers and bad classes", async () => {
    const unknown = await assign(classId, randomUUID());
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe("TEACHER_NOT_ELIGIBLE");
    expect(unknown.body.error.details).toEqual({ reason: "NOT_FOUND" });

    const noSub = await assign(classId, tNoSubgroup);
    expect(noSub.status).toBe(400);
    expect(noSub.body.error.code).toBe("TEACHER_NOT_ELIGIBLE");
    expect(noSub.body.error.details).toEqual({ reason: "NO_SUBGROUP" });

    const suspended = await assign(classId, tSuspended);
    expect(suspended.status).toBe(400);
    expect(suspended.body.error.code).toBe("TEACHER_NOT_ELIGIBLE");
    expect(suspended.body.error.details).toEqual({ reason: "NOT_ACTIVE" });

    const badTeacher = await request(app).post(`/api/fs/classes/${classId}/teachers`).set("Cookie", vpCookie)
      .send({ action: "assign", teacherId: "nope" });
    expect(badTeacher.status).toBe(400);
    expect(badTeacher.body.error.code).toBe("VALIDATION_ERROR");

    const badClass = await assign("not-a-uuid", t1);
    expect(badClass.status).toBe(400);
    expect(badClass.body.error.code).toBe("INVALID_ID_FORMAT");

    const missingClass = await assign(randomUUID(), t1);
    expect(missingClass.status).toBe(404);
    expect(missingClass.body.error.code).toBe("CLASS_NOT_FOUND");
  });

  it("assign succeeds, a repeat says already assigned, and the cap is enforced", async () => {
    const ok = await assign(classId, t1);
    expect(ok.status).toBe(201);
    expect(ok.body.data).toMatchObject({ classId, teacherId: t1 });

    const again = await assign(classId, t1);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("TEACHER_ALREADY_ASSIGNED");

    const capped = await assign(classId, t2);
    expect(capped.status).toBe(409);
    expect(capped.body.error.code).toBe("TEACHER_CAP_REACHED");
  });

  it("assigned list shows each teacher with their classes", async () => {
    const res = await request(app).get("/api/fs/teachers").set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    const row = res.body.data.find((teacher: any) => teacher.id === t1);
    expect(row).toMatchObject({ name: `TeacherA ${stamp}`, subgroup: "Prayer", academicLevel: "500 Level" });
    expect(row.classes).toEqual([{ classId, className: `Teachers Class ${stamp}`, status: "Active" }]);
    expect(res.body.data.some((teacher: any) => teacher.id === t2)).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("remove: not assigned gives 404, success removes the teacher from the list", async () => {
    const notAssigned = await remove(classId, t2);
    expect(notAssigned.status).toBe(404);
    expect(notAssigned.body.error.code).toBe("TEACHER_NOT_ASSIGNED");

    const ok = await remove(classId, t1);
    expect(ok.status).toBe(201);
    expect(ok.body.data).toEqual({ removed: true });

    const list = await request(app).get("/api/fs/teachers").set("Cookie", vpCookie);
    expect(list.body.data.some((teacher: any) => teacher.id === t1)).toBe(false);
  });

  it("an archived class cannot receive teachers", async () => {
    const archive = await request(app).put(`/api/fs/classes/${classId}`).set("Cookie", vpCookie).send({ status: "Archived" });
    expect(archive.status).toBe(200);
    const res = await assign(classId, t1);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CLASS_NOT_ACTIVE");
  });
});