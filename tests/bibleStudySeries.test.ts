import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";
import { isTuesday, generateWeeklySchedule } from "../src/utils/bibleStudySchedule.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

function mostRecentTuesday(): string {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = todayUTC.getUTCDay();
  const diff = (day - 2 + 7) % 7;
  todayUTC.setUTCDate(todayUTC.getUTCDate() - diff);
  return todayUTC.toISOString().slice(0, 10);
}

function nextTuesday(): string {
  const recent = mostRecentTuesday();
  const d = new Date(recent + "T00:00:00.000Z");
  d.setUTCDate(d.getUTCDate() + 7);
  return d.toISOString().slice(0, 10);
}

function buildLesson(lessonNumber: number, overrides: Record<string, any> = {}) {
  return {
    lessonNumber,
    title: `Vitest Series Lesson ${lessonNumber}`,
    topic: `Vitest Series Topic ${lessonNumber}`,
    theme: "Vitest Test Theme",
    textRef: "John 3:16",
    memoryVerseRef: "John 3:16",
    memoryVerseText: "For God so loved the world...",
    aim: "To test the series creation flow end to end.",
    introduction: "This is a test lesson introduction.",
    studyGuide: ["Test question 1"],
    discussionQuestions: [],
    conclusion: "This is a test lesson conclusion.",
    prayerPoints: [],
    ...overrides,
  };
}

describe("Bible Study Series", () => {
  let adminCookie: string;
  let memberCookie: string;

  it("setup: login as admin + register a plain member", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Bible Study Series", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-series-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Series Member",
      departmentId: "other",
      gender: "Female",
      academicLevel: "200 Level",
    });
    logResponse("Bible Study Series", "setup: register member", reg.status, reg.body);
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
  });

  it("Creating a series with a non-Tuesday startDate is rejected", async () => {
    const res = await request(app).post("/api/bible-study/series").set("Cookie", adminCookie).send({
      title: "Vitest Bad Start Date Series",
      startDate: "2026-09-16", // a Wednesday
      lessons: [buildLesson(1)],
    });
    logResponse("Bible Study Series", "Admin -> create series with non-Tuesday start (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("START_DATE_NOT_TUESDAY");
  });

  it("Creating a series with zero lessons is rejected at the schema level", async () => {
    const res = await request(app).post("/api/bible-study/series").set("Cookie", adminCookie).send({
      title: "Vitest Empty Series",
      startDate: mostRecentTuesday(),
      lessons: [],
    });
    logResponse("Bible Study Series", "Admin -> create series with no lessons (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Creating a series with a broken lesson-number sequence is rejected", async () => {
    const res = await request(app).post("/api/bible-study/series").set("Cookie", adminCookie).send({
      title: "Vitest Broken Sequence Series",
      startDate: mostRecentTuesday(),
      lessons: [buildLesson(1), buildLesson(3)], // skips 2
    });
    logResponse("Bible Study Series", "Admin -> create series with broken sequence (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_LESSON_SEQUENCE");
  });

  it("Member is BLOCKED from creating a series (no permission)", async () => {
    const res = await request(app).post("/api/bible-study/series").set("Cookie", memberCookie).send({
      title: "Should Fail",
      startDate: mostRecentTuesday(),
      lessons: [buildLesson(1)],
    });
    logResponse("Bible Study Series", "Member -> create series (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  let seriesId: string;
  let firstLessonId: string;
  let secondLessonId: string;
  let thirdLessonId: string;

  it("Admin creates a real 3-lesson series: dates match the generator, title falls back to topic when omitted", async () => {
    // const startDate = mostRecentTuesday();
        const startDate = nextTuesday();
        const expectedDates = generateWeeklySchedule(startDate, 3);

    const res = await request(app).post("/api/bible-study/series").set("Cookie", adminCookie).send({
      title: "Vitest Real Series",
      theme: "Vitest Series Theme",
      startDate,
      lessons: [
        buildLesson(1, { title: "Explicit Title For Lesson 1" }),
        buildLesson(2, { title: undefined }), // omit title on purpose
        buildLesson(3, { title: "Explicit Title For Lesson 3" }),
      ],
    });
    logResponse("Bible Study Series", "Admin -> create real series", res.status, res.body);
    expect(res.status).toBe(201);
    expect(res.body.data.series.title).toBe("Vitest Real Series");
    expect(res.body.data.lessons.length).toBe(3);

    const lessons = res.body.data.lessons.sort((a: any, b: any) => a.lessonNumber - b.lessonNumber);
    expect(lessons[0].scheduledDate).toBe(expectedDates[0]);
    expect(lessons[1].scheduledDate).toBe(expectedDates[1]);
    expect(lessons[2].scheduledDate).toBe(expectedDates[2]);

    expect(lessons[0].title).toBe("Explicit Title For Lesson 1");
    expect(lessons[1].title).toBe(lessons[1].topic); // fallback applied
    expect(lessons[2].title).toBe("Explicit Title For Lesson 3");

    expect(lessons.every((l: any) => l.publicationStatus === "draft")).toBe(true);

    seriesId = res.body.data.series.id;
    firstLessonId = lessons[0].id;
    secondLessonId = lessons[1].id;
    thirdLessonId = lessons[2].id;
  });

  it("Member sees NO lessons in the series yet (all still draft)", async () => {
    const res = await request(app).get(`/api/bible-study/series/${seriesId}`).set("Cookie", memberCookie);
    logResponse("Bible Study Series", "Member -> GET series (all draft, should be empty)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.lessons.length).toBe(0);
  });

  it("Admin sees all 3 draft lessons in the series", async () => {
    const res = await request(app).get(`/api/bible-study/series/${seriesId}`).set("Cookie", adminCookie);
    logResponse("Bible Study Series", "Admin -> GET series (should see all drafts)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.lessons.length).toBe(3);
  });

  it("After publishing one lesson, the member sees exactly that one lesson", async () => {
    const publishRes = await request(app).patch(`/api/bible-study/${firstLessonId}/publish`).set("Cookie", adminCookie);
    logResponse("Bible Study Series", "Admin -> publish lesson 1", publishRes.status, publishRes.body);
    expect(publishRes.status).toBe(200);

    const res = await request(app).get(`/api/bible-study/series/${seriesId}`).set("Cookie", memberCookie);
    logResponse("Bible Study Series", "Member -> GET series (1 published)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.lessons.length).toBe(1);
    expect(res.body.data.lessons[0].id).toBe(firstLessonId);
  });

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayIsTuesday = isTuesday(todayStr);

  it.runIf(todayIsTuesday)("On a real Tuesday: a lesson scheduled for today is returned by /current once published", async () => {
    const res = await request(app).post("/api/bible-study/series").set("Cookie", adminCookie).send({
      title: "Vitest Today Series",
      startDate: todayStr,
      lessons: [buildLesson(1, { title: "Vitest Today Lesson" })],
    });
    expect(res.status).toBe(201);
    const todayLessonId = res.body.data.lessons[0].id;
    expect(res.body.data.lessons[0].scheduledDate).toBe(todayStr);

    const publishRes = await request(app).patch(`/api/bible-study/${todayLessonId}/publish`).set("Cookie", adminCookie);
    expect(publishRes.status).toBe(200);

    const currentRes = await request(app).get("/api/bible-study/current").set("Cookie", memberCookie);
    logResponse("Bible Study Series", "GET /current (today is Tuesday, should match)", currentRes.status, currentRes.body);
    expect(currentRes.status).toBe(200);
    expect(currentRes.body.data.id).toBe(todayLessonId);
    expect(currentRes.body.data.scheduledDate).toBe(todayStr);
  });

  it.runIf(!todayIsTuesday)("On a non-Tuesday: /current returns 404, no fallback to a past lesson", async () => {
    const res = await request(app).get("/api/bible-study/current").set("Cookie", memberCookie);
    logResponse("Bible Study Series", "GET /current (today is not Tuesday, expect 404)", res.status, res.body);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NO_CURRENT_STUDY");
  });

  it("The existing standalone (pre-series) study still works, unaffected", async () => {
    const res = await request(app).get("/api/bible-study").set("Cookie", memberCookie);
    logResponse("Bible Study Series", "Member -> GET /api/bible-study (standalone study check)", res.status, res.body);
    expect(res.status).toBe(200);
    const standalone = res.body.data.find((s: any) => !s.seriesId);
    expect(standalone).toBeDefined();
  });
});