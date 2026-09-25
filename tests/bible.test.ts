import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

describe("Bible", () => {
  let memberCookie: string;

  it("setup: register member", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: `vitest-bible-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Chinedu Eze",
      departmentId: "chemistry",
      gender: "Male",
      academicLevel: "200 Level",
    });
    memberCookie = res.headers["set-cookie"]![0].split(";")[0];
    expect(res.status).toBe(201);
  });

  it("GET /api/bible/translations", async () => {
    const res = await request(app).get("/api/bible/translations").set("Cookie", memberCookie);
    logResponse("Bible", "GET /api/bible/translations", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("GET /api/bible/books returns exactly 66 books", async () => {
    const res = await request(app).get("/api/bible/books").set("Cookie", memberCookie);
    logResponse("Bible", "GET /api/bible/books", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(66);
  });

  it("GET /api/bible/KJV/john/3 returns 36 verses", async () => {
    const res = await request(app).get("/api/bible/KJV/john/3").set("Cookie", memberCookie);
    logResponse("Bible", "GET /api/bible/KJV/john/3", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.verses.length).toBe(36);
  });

  it("Verse range query returns exactly the requested range", async () => {
    const res = await request(app).get("/api/bible/KJV/john/3?verseStart=16&verseEnd=18").set("Cookie", memberCookie);
    logResponse("Bible", "GET verse range 16-18", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.verses.length).toBe(3);
  });

  it("Invalid translation ID is handled safely, not a 500", async () => {
    const res = await request(app).get("/api/bible/FAKE_TRANSLATION/john/3").set("Cookie", memberCookie);
    logResponse("Bible", "GET with fake translation ID", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Invalid book name is handled safely, not a 500", async () => {
    const res = await request(app).get("/api/bible/KJV/not-a-real-book/3").set("Cookie", memberCookie);
    logResponse("Bible", "GET with fake book name", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Chapter number way out of range (e.g. 9999) is handled safely", async () => {
    const res = await request(app).get("/api/bible/KJV/john/9999").set("Cookie", memberCookie);
    logResponse("Bible", "GET chapter 9999 (out of range)", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Search with SQL-injection-style query does not crash", async () => {
    const res = await request(app)
      .get(`/api/bible/search?q=${encodeURIComponent("'; DROP TABLE bible_verses;--")}&translationId=KJV`)
      .set("Cookie", memberCookie);
    logResponse("Bible", "Search with injection-style query", res.status, res.body);
    expect(res.status).not.toBe(500);
  });

  it("Search finds real results for a common word", async () => {
    const res = await request(app).get("/api/bible/search?q=beginning&translationId=KJV").set("Cookie", memberCookie);
    logResponse("Bible", "Search for 'beginning'", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it("Unauthenticated request to translations is blocked (if auth required) or allowed (if public) — just confirm no crash", async () => {
    const res = await request(app).get("/api/bible/translations");
    logResponse("Bible", "No cookie -> GET /api/bible/translations", res.status, res.body);
    expect([200, 401]).toContain(res.status);
  });
});