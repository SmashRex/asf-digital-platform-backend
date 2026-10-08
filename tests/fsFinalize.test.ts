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
    email: `vitest-fsfin-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

type Admitted = { userId: string; cookie: string; studentId: string };

describe("FS finalize class (VP)", () => {
  let vpId: string;
  let vpCookie: string;
  let outsiderCookie: string;
  let mainId: string;
  let otherId: string;
  let emptyId: string;
  let s1: Admitted;
  let s2: Admitted;
  let s3: Admitted;
  let sWithdrawn: Admitted;
  let sOther: Admitted;
  let sSub: Admitted;

  afterAll(async () => {
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  const finalize = (classId: string, body: unknown, cookie?: string) =>
    request(app).post(`/api/fs/classes/${classId}/finalize`).set("Cookie", cookie ?? vpCookie).send(body as object);

  async function createClass(name: string) {
    const res = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `${name} ${stamp}`, academicSessionId: "2027/2028", semester: "First" });
    expect(res.status).toBe(201);
    return res.body.data.id as string;
  }

  async function admit(label: string, classId: string): Promise<Admitted> {
    const name = `Finalize ${label} ${stamp}`;
    const member = await registerMember(name, "200 Level");
    const apply = await request(app).post("/api/fs/admissions").set("Cookie", member.cookie).send({});
    expect(apply.status).toBe(201);
    const approve = await request(app).patch(`/api/fs/admissions/admin/${apply.body.data.id}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId });
    expect(approve.status).toBe(200);
    const list = await request(app).get(`/api/fs/students?classId=${classId}&search=${encodeURIComponent(name)}`).set("Cookie", vpCookie);
    expect(list.body.data).toHaveLength(1);
    return { userId: member.id, cookie: member.cookie, studentId: list.body.data[0].id };
  }

  async function statusOf(studentId: string) {
    const res = await request(app).get(`/api/fs/students/${studentId}`).set("Cookie", vpCookie);
    expect(res.status).toBe(200);
    return res.body.data.status as string;
  }

  async function subgroupOf(userId: string) {
    const [row] = await db.select({ subgroup: users.subgroup }).from(users).where(eq(users.id, userId));
    return row.subgroup;
  }

  it("setup A: VP, outsider and three classes", async () => {
    const vp = await registerMember(`Finalize VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });
    outsiderCookie = (await registerMember(`Finalize Outsider ${stamp}`, "100 Level")).cookie;
    mainId = await createClass("Fin Main");
    otherId = await createClass("Fin Other");
    emptyId = await createClass("Fin Empty");
  });

  it("setup B: students (graduates, one withdrawn, one in another class, one who already has a subgroup)", async () => {
    s1 = await admit("one", mainId);
    s2 = await admit("two", mainId);
    s3 = await admit("three", mainId);
    sWithdrawn = await admit("withdrawn", mainId);
    const withdraw = await request(app).patch(`/api/fs/students/${sWithdrawn.studentId}/withdraw`).set("Cookie", vpCookie);
    expect(withdraw.status).toBe(200);
    sSub = await admit("hassub", mainId);
    await db.update(users).set({ subgroup: "Prayer" }).where(eq(users.id, sSub.userId));
    sOther = await admit("other", otherId);
  });

  it("blocks people without the VP office", async () => {
    const res = await finalize(mainId, { graduates: [], confirmNoGraduates: true }, outsiderCookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("OFFICE_REQUIRED");
  });

  it("rejects a bad class id and invalid bodies", async () => {
    const badId = await finalize("not-a-uuid", { graduates: [], confirmNoGraduates: true });
    expect(badId.status).toBe(400);
    expect(badId.body.error.code).toBe("INVALID_ID_FORMAT");

    const bodies = [
      {},
      { graduates: [{ studentId: s1.studentId, subgroup: "bible study" }] },
      { graduates: [{ studentId: "nope", subgroup: "Prayer" }] },
      { graduates: [{ studentId: s1.studentId }] },
      { graduates: [], confirmNoGraduates: true, extra: 1 },
    ];
    for (const body of bodies) {
      const res = await finalize(mainId, body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });

  it("rejects the same student appearing twice, even with different subgroups", async () => {
    const res = await finalize(mainId, {
      graduates: [
        { studentId: s1.studentId, subgroup: "Prayer" },
        { studentId: s1.studentId, subgroup: "Drama" },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("DUPLICATE_STUDENT");
    expect(await statusOf(s1.studentId)).toBe("Active");
  });

  it("rejects an unknown class, an archived class and a class with no active students", async () => {
    const unknown = await finalize(randomUUID(), { graduates: [], confirmNoGraduates: true });
    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe("CLASS_NOT_FOUND");

    const archivedId = await createClass("Fin Archived");
    const archive = await request(app).put(`/api/fs/classes/${archivedId}`).set("Cookie", vpCookie).send({ status: "Archived" });
    expect(archive.status).toBe(200);
    const archived = await finalize(archivedId, { graduates: [], confirmNoGraduates: true });
    expect(archived.status).toBe(409);
    expect(archived.body.error.code).toBe("CLASS_NOT_ACTIVE");

    const empty = await finalize(emptyId, { graduates: [] });
    expect(empty.status).toBe(409);
    expect(empty.body.error.code).toBe("NO_ACTIVE_STUDENTS");
  });

  it("empty graduates needs the explicit flag, and the flag cannot be combined with graduates", async () => {
    const noFlag = await finalize(mainId, { graduates: [] });
    expect(noFlag.status).toBe(400);
    expect(noFlag.body.error.code).toBe("EMPTY_GRADUATES");

    const both = await finalize(mainId, {
      graduates: [{ studentId: s1.studentId, subgroup: "Prayer" }],
      confirmNoGraduates: true,
    });
    expect(both.status).toBe(400);
    expect(both.body.error.code).toBe("VALIDATION_ERROR");

    expect(await statusOf(s1.studentId)).toBe("Active");
  });

  it("reports every invalid student together and changes nothing", async () => {
    const unknownId = randomUUID();
    const res = await finalize(mainId, {
      graduates: [
        { studentId: s1.studentId, subgroup: "Bible Study" },
        { studentId: unknownId, subgroup: "Prayer" },
        { studentId: sOther.studentId, subgroup: "Prayer" },
        { studentId: sWithdrawn.studentId, subgroup: "Prayer" },
        { studentId: sSub.studentId, subgroup: "Drama" },
      ],
    });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("FINALIZE_INVALID_STUDENTS");
    expect(res.body.error.details).toHaveLength(4);
    expect(res.body.error.details).toEqual(expect.arrayContaining([
      { studentId: unknownId, reason: "NOT_FOUND" },
      { studentId: sOther.studentId, reason: "NOT_IN_CLASS" },
      { studentId: sWithdrawn.studentId, reason: "NOT_ACTIVE" },
      { studentId: sSub.studentId, reason: "ALREADY_HAS_SUBGROUP" },
    ]));

    expect(await statusOf(s1.studentId)).toBe("Active");
    expect(await subgroupOf(s1.userId)).toBeNull();
    expect(await subgroupOf(sSub.userId)).toBe("Prayer");
  });

  it("finalizes: graduates get a subgroup, everyone else active becomes Not Completed", async () => {
    const res = await finalize(mainId, {
      graduates: [
        { studentId: s1.studentId, subgroup: "Bible Study" },
        { studentId: s2.studentId, subgroup: "Prayer" },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ graduated: 2, notCompleted: 2 });

    expect(await statusOf(s1.studentId)).toBe("Graduated");
    expect(await statusOf(s2.studentId)).toBe("Graduated");
    expect(await statusOf(s3.studentId)).toBe("Not Completed");
    expect(await statusOf(sSub.studentId)).toBe("Not Completed");
    expect(await statusOf(sWithdrawn.studentId)).toBe("Withdrawn");
    expect(await statusOf(sOther.studentId)).toBe("Active");

    expect(await subgroupOf(s1.userId)).toBe("Bible Study");
    expect(await subgroupOf(s2.userId)).toBe("Prayer");
    expect(await subgroupOf(s3.userId)).toBeNull();
    expect(await subgroupOf(sSub.userId)).toBe("Prayer");

    const cls = await request(app).get(`/api/fs/classes/${mainId}`).set("Cookie", vpCookie);
    expect(cls.body.data.status).toBe("Active");
  });

  it("a second finalize is rejected, and only the Not Completed student can apply again", async () => {
    const again = await finalize(mainId, { graduates: [], confirmNoGraduates: true });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("NO_ACTIVE_STUDENTS");

    const reapply = await request(app).post("/api/fs/admissions").set("Cookie", s3.cookie).send({});
    expect(reapply.status).toBe(201);

    const graduateApply = await request(app).post("/api/fs/admissions").set("Cookie", s1.cookie).send({});
    expect(graduateApply.status).toBe(403);
    expect(graduateApply.body.error.code).toBe("ALREADY_IN_SUBGROUP");
  });

  it("nobody graduating is possible on purpose: everyone becomes Not Completed", async () => {
    const res = await finalize(otherId, { graduates: [], confirmNoGraduates: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ graduated: 0, notCompleted: 1 });
    expect(await statusOf(sOther.studentId)).toBe("Not Completed");
  });
});