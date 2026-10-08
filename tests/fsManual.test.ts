import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { app } from "../src/app.js";
import { db } from "../src/db/index.js";
import { fsManual, userExecutiveOffices, users } from "../src/db/schema/index.js";

vi.setConfig({ testTimeout: 300_000 });

const stamp = Date.now();
const pdfOne = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n");
const pdfTwo = Buffer.concat([pdfOne, Buffer.from("% second version\n")]);

// Returns raw bytes for PDFs and parsed JSON for error responses.
const smartParser = (res: any, cb: (err: Error | null, body: any) => void) => {
  const chunks: Buffer[] = [];
  res.on("data", (chunk: Buffer) => chunks.push(chunk));
  res.on("end", () => {
    const body = Buffer.concat(chunks);
    if (String(res.headers["content-type"]).includes("application/json")) {
      try { cb(null, JSON.parse(body.toString("utf8"))); } catch (error) { cb(error as Error, undefined); }
    } else {
      cb(null, body);
    }
  });
};

const download = (cookie?: string) => {
  const req = request(app).get("/api/fs/manual").buffer(true).parse(smartParser);
  return cookie ? req.set("Cookie", cookie) : req;
};
const info = (cookie: string) => request(app).get("/api/fs/manual/info").set("Cookie", cookie);
const upload = (cookie: string, file: Buffer, filename: string, contentType = "application/pdf") =>
  request(app).post("/api/fs/manual").set("Cookie", cookie).attach("file", file, { filename, contentType });

async function registerMember(name: string, academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fsman-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123", name, departmentId: "computer-science", gender: "Male", academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("FS manual", () => {
  let manualBackup: (typeof fsManual.$inferSelect)[] = [];
  let vpId: string;
  let vpCookie: string;
  let outsiderCookie: string;
  let studentCookie: string;
  let teacherCookie: string;
  let teacherId: string;
  let classId: string;

  // The manual is one shared row. Save whatever is there, run on a clean slate, then restore it.
  beforeAll(async () => {
    manualBackup = await db.select().from(fsManual);
    await db.delete(fsManual);
  }, 120_000);

  afterAll(async () => {
    await db.delete(fsManual);
    if (manualBackup.length > 0) await db.insert(fsManual).values(manualBackup);
    if (vpId) await db.delete(userExecutiveOffices).where(eq(userExecutiveOffices.userId, vpId));
  }, 120_000);

  it("setup: VP, outsider, an enrolled student and an assigned teacher", async () => {
    const vp = await registerMember(`Manual VP ${stamp}`, "500 Level");
    vpId = vp.id;
    vpCookie = vp.cookie;
    await db.insert(userExecutiveOffices).values({ userId: vpId, officeId: "vice-president" });
    outsiderCookie = (await registerMember(`Manual Outsider ${stamp}`, "100 Level")).cookie;

    const cls = await request(app).post("/api/fs/classes").set("Cookie", vpCookie)
      .send({ name: `Manual Class ${stamp}`, academicSessionId: "2027/2028", semester: "First" });
    expect(cls.status).toBe(201);
    classId = cls.body.data.id;

    const student = await registerMember(`Manual Student ${stamp}`, "200 Level");
    studentCookie = student.cookie;
    const apply = await request(app).post("/api/fs/admissions").set("Cookie", studentCookie).send({});
    expect(apply.status).toBe(201);
    const approve = await request(app).patch(`/api/fs/admissions/admin/${apply.body.data.id}/review`).set("Cookie", vpCookie)
      .send({ action: "approve", classId });
    expect(approve.status).toBe(200);

    const teacher = await registerMember(`Manual Teacher ${stamp}`, "500 Level");
    teacherCookie = teacher.cookie;
    teacherId = teacher.id;
    await db.update(users).set({ subgroup: "Prayer" }).where(eq(users.id, teacherId));
    const assign = await request(app).post(`/api/fs/classes/${classId}/teachers`).set("Cookie", vpCookie)
      .send({ action: "assign", teacherId });
    expect(assign.status).toBe(201);
  });

  it("before any upload: allowed users get 404, outsiders get 403 (they cannot learn whether a manual exists)", async () => {
    const vpDownload = await download(vpCookie);
    expect(vpDownload.status).toBe(404);
    expect(vpDownload.body.error.code).toBe("MANUAL_NOT_FOUND");
    const vpInfo = await info(vpCookie);
    expect(vpInfo.status).toBe(404);
    expect(vpInfo.body.error.code).toBe("MANUAL_NOT_FOUND");

    const outsiderDownload = await download(outsiderCookie);
    expect(outsiderDownload.status).toBe(403);
    expect(outsiderDownload.body.error.code).toBe("MANUAL_ACCESS_DENIED");
    expect((await info(outsiderCookie)).status).toBe(403);
  });

  it("upload: only the VP, and only a real PDF", async () => {
    const blocked = await upload(outsiderCookie, pdfOne, "manual.pdf");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("OFFICE_REQUIRED");

    const noFile = await request(app).post("/api/fs/manual").set("Cookie", vpCookie).send({});
    expect(noFile.status).toBe(400);
    expect(noFile.body.error.code).toBe("NO_FILE");

    const wrongType = await upload(vpCookie, Buffer.from("plain text"), "notes.txt", "text/plain");
    expect(wrongType.status).toBe(400);
    expect(wrongType.body.error.code).toBe("INVALID_FILE");

    const fakePdf = await upload(vpCookie, Buffer.from("this is not really a pdf"), "fake.pdf");
    expect(fakePdf.status).toBe(400);
    expect(fakePdf.body.error.code).toBe("INVALID_FILE_CONTENT");

    expect(await db.select().from(fsManual)).toHaveLength(0);
  });

  it("the VP uploads a real PDF and info reports it", async () => {
    const res = await upload(vpCookie, pdfOne, "FS Manual.pdf");
    expect(res.status).toBe(201);
    expect(res.body.data.fileName).toBe("FS Manual.pdf");

    const details = await info(vpCookie);
    expect(details.status).toBe(200);
    expect(details.body.data).toMatchObject({ fileName: "FS Manual.pdf", sizeBytes: pdfOne.length });
    expect(details.body.data.updatedAt).toBeTruthy();
    expect(JSON.stringify(details.body)).not.toContain("fileData");
  });

  it("the VP, an active student and an assigned teacher get the exact file; others are blocked", async () => {
    for (const cookie of [vpCookie, studentCookie, teacherCookie]) {
      const res = await download(cookie);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("application/pdf");
      expect(Buffer.compare(res.body, pdfOne)).toBe(0);
    }
    expect((await info(studentCookie)).status).toBe(200);

    const outsider = await download(outsiderCookie);
    expect(outsider.status).toBe(403);
    expect(outsider.body.error.code).toBe("MANUAL_ACCESS_DENIED");

    const anonymous = await download();
    expect(anonymous.status).toBe(401);
  });

  it("replacing the manual keeps a single row, serves the new file, and sanitizes the download filename", async () => {
    const res = await upload(vpCookie, pdfTwo, "Manual (v2) final.pdf");
    expect(res.status).toBe(201);
    expect(await db.select().from(fsManual)).toHaveLength(1);

    const details = await info(vpCookie);
    expect(details.body.data).toMatchObject({ fileName: "Manual (v2) final.pdf", sizeBytes: pdfTwo.length });

    const file = await download(studentCookie);
    expect(file.status).toBe(200);
    expect(Buffer.compare(file.body, pdfTwo)).toBe(0);
    expect(file.headers["content-disposition"]).toBe('inline; filename="Manual _v2_ final.pdf"');
  });

  it("access ends when a student is withdrawn or a teacher is removed", async () => {
    const students = await request(app).get(`/api/fs/students?classId=${classId}`).set("Cookie", vpCookie);
    expect(students.status).toBe(200);
    const withdraw = await request(app).patch(`/api/fs/students/${students.body.data[0].id}/withdraw`).set("Cookie", vpCookie);
    expect(withdraw.status).toBe(200);
    const withdrawn = await download(studentCookie);
    expect(withdrawn.status).toBe(403);
    expect(withdrawn.body.error.code).toBe("MANUAL_ACCESS_DENIED");

    const remove = await request(app).post(`/api/fs/classes/${classId}/teachers`).set("Cookie", vpCookie)
      .send({ action: "remove", teacherId });
    expect(remove.status).toBe(201);
    const removed = await download(teacherCookie);
    expect(removed.status).toBe(403);
    expect(removed.body.error.code).toBe("MANUAL_ACCESS_DENIED");
  });
});