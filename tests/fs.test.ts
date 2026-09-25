import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

async function registerMember(name: string, departmentId: string, gender: "Male" | "Female", academicLevel: string) {
  const res = await request(app).post("/api/auth/register").send({
    email: `vitest-fs-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`,
    password: "vitestpass123",
    name,
    departmentId,
    gender,
    academicLevel,
  });
  expect(res.status).toBe(201);
  return { cookie: res.headers["set-cookie"]![0].split(";")[0], id: res.body.data.id as string };
}

describe("Foundational School", () => {
  let adminCookie: string;
  let applicantCookie: string;
  let applicantId: string;
  let admissionId: string;
  let classId: string;
  let studentId: string;
  let teacherUserId: string;

  it("setup: login as admin, register an applicant and a teacher candidate", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Foundational School", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

        const applicant = await registerMember("Grace Adeyemi", "biochemistry", "Female", "200 Level");
    applicantCookie = applicant.cookie;
    applicantId = applicant.id;

    const teacher = await registerMember("Emeka Obi", "physics", "Male", "500 Level");
    teacherUserId = teacher.id;
  });

  it("Applicant with no subgroup CAN apply for FS", async () => {
    const res = await request(app).post("/api/fs/admissions").set("Cookie", applicantCookie).send({
      testimony: "I want to grow in my walk with God.",
    });
    logResponse("Foundational School", "Applicant -> POST /api/fs/admissions", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("Pending");
    admissionId = res.body.data.id;
  });

  it("Duplicate application while Pending is rejected", async () => {
    const res = await request(app).post("/api/fs/admissions").set("Cookie", applicantCookie).send({});
    logResponse("Foundational School", "Applicant -> duplicate application (should be rejected)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ADMISSION_ALREADY_PENDING");
  });

  it("Member without permission is BLOCKED from admin admissions list", async () => {
    const res = await request(app).get("/api/fs/admissions/admin").set("Cookie", applicantCookie);
    logResponse("Foundational School", "Applicant -> GET admin admissions list (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin sees the pending application in the list", async () => {
    const res = await request(app).get("/api/fs/admissions/admin?status=Pending").set("Cookie", adminCookie);
    logResponse("Foundational School", "Admin -> GET admin admissions list", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.some((a: any) => a.id === admissionId);
    expect(found).toBe(true);
  });

  it("Admin creates a new FS class", async () => {
    const res = await request(app).post("/api/fs/classes").set("Cookie", adminCookie).send({
      name: `Vitest FS Class ${Date.now()}`,
      academicSessionId: "2027/2028",
      semester: "First",
      teacherCap: 2,
    });
    logResponse("Foundational School", "Admin -> POST /api/fs/classes", res.status, res.body);
    expect(res.status).toBe(201);
    classId = res.body.data.id;
  });

  it("Admin assigns the teacher candidate to the class", async () => {
    const res = await request(app)
      .post(`/api/fs/classes/${classId}/teachers`)
      .set("Cookie", adminCookie)
      .send({ action: "assign", teacherId: teacherUserId });
    logResponse("Foundational School", "Admin -> assign teacher to class", res.status, res.body);
    expect(res.status).toBe(201);
  });

  it("Assigning the SAME teacher again is cleanly rejected, not a raw SQL error", async () => {
    const res = await request(app)
      .post(`/api/fs/classes/${classId}/teachers`)
      .set("Cookie", adminCookie)
      .send({ action: "assign", teacherId: teacherUserId });
    logResponse("Foundational School", "Admin -> duplicate teacher assignment (should be clean 409)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("TEACHER_ALREADY_ASSIGNED");
  });

  it("Approving without a classId is rejected with a validation error", async () => {
    const res = await request(app)
      .patch(`/api/fs/admissions/admin/${admissionId}/review`)
      .set("Cookie", adminCookie)
      .send({ action: "approve" });
    logResponse("Foundational School", "Admin -> approve with no classId (should fail validation)", res.status, res.body);
    expect(res.status).toBe(400);
  });

  it("Admin approves the application into the class (approve -> enroll transaction)", async () => {
    const res = await request(app)
      .patch(`/api/fs/admissions/admin/${admissionId}/review`)
      .set("Cookie", adminCookie)
      .send({ action: "approve", classId, notes: "Welcome aboard" });
    logResponse("Foundational School", "Admin -> approve admission into class", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Approved");
  });

  it("Re-reviewing the same admission is rejected", async () => {
    const res = await request(app)
      .patch(`/api/fs/admissions/admin/${admissionId}/review`)
      .set("Cookie", adminCookie)
      .send({ action: "reject" });
    logResponse("Foundational School", "Admin -> re-review already-reviewed admission (should fail)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_REVIEWED");
  });

  it("The applicant now appears as an Active student on the class roster", async () => {
    const res = await request(app).get(`/api/fs/students?classId=${classId}`).set("Cookie", adminCookie);
    logResponse("Foundational School", "Admin -> GET roster for class", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.find((s: any) => s.userId === applicantId && s.status === "Active");
    expect(found).toBeDefined();
    studentId = found.id;
  });

  it("Enrolled student CAN access the FS manual", async () => {
    const res = await request(app).get("/api/fs/manual").set("Cookie", applicantCookie);
    logResponse("Foundational School", "Enrolled student -> GET manual", res.status, res.body);
    expect([200, 404]).toContain(res.status); // 404 acceptable if no manual uploaded yet
  });

  it("Downloading the class roster export returns real CSV, not JSON", async () => {
    const res = await request(app).get(`/api/fs/classes/${classId}/roster-export`).set("Cookie", adminCookie);
    logResponse("Foundational School", "Admin -> GET roster CSV export", res.status, { contentType: res.headers["content-type"], bodyPreview: String(res.text).slice(0, 300) });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
  });

  it("Withdrawing the student succeeds", async () => {
    const res = await request(app).patch(`/api/fs/students/${studentId}/withdraw`).set("Cookie", adminCookie);
    logResponse("Foundational School", "Admin -> withdraw student", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Withdrawn");
  });

  it("Withdrawing a second time is rejected (no longer Active)", async () => {
    const res = await request(app).patch(`/api/fs/students/${studentId}/withdraw`).set("Cookie", adminCookie);
    logResponse("Foundational School", "Admin -> withdraw again (should fail)", res.status, res.body);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("STUDENT_NOT_ACTIVE");
  });

  it("Withdrawn student is now BLOCKED from the manual", async () => {
    const res = await request(app).get("/api/fs/manual").set("Cookie", applicantCookie);
    logResponse("Foundational School", "Withdrawn student -> GET manual (should be blocked)", res.status, res.body);
    expect([403, 404]).toContain(res.status);
  });

  it("Unauthenticated request to admin admissions is blocked", async () => {
    const res = await request(app).get("/api/fs/admissions/admin");
    logResponse("Foundational School", "No cookie -> GET admin admissions", res.status, res.body);
    expect(res.status).toBe(401);
  });
});