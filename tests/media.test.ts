import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";
const SAMPLE_IMAGE = path.resolve("tests/fixtures/sample-image.jpg");

describe("Media", () => {
  let adminCookie: string;
  let memberCookie: string;
  let uploadedAssetId: string;

  it("setup: login as admin + register member", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-media-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Adaeze Nnamdi",
      departmentId: "other",
      gender: "Female",
      academicLevel: "300 Level",
    });
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];

    expect(login.status).toBe(200);
    expect(reg.status).toBe(201);
  });

  it("GET /api/media/placements (public, no auth)", async () => {
    const res = await request(app).get("/api/media/placements");
    logResponse("Media", "GET /api/media/placements (public)", res.status, res.body);
    expect(res.status).toBe(200);
  });

  it("Member is BLOCKED from uploading media (no permission)", async () => {
    const res = await request(app)
      .post("/api/media/assets")
      .set("Cookie", memberCookie)
      .attach("file", SAMPLE_IMAGE);
    logResponse("Media", "Member -> upload asset (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin CAN upload a real image asset", async () => {
    const res = await request(app)
      .post("/api/media/assets")
      .set("Cookie", adminCookie)
      .attach("file", SAMPLE_IMAGE)
      .field("altText", "Vitest test upload");
    logResponse("Media", "Admin -> upload real image", res.status, res.body);
    expect(res.status).toBe(201);
    uploadedAssetId = res.body.data.id;
  });

  it("Uploading a fake image (text file renamed to .jpg) is rejected by the real magic-byte check", async () => {
    const fakeImageBuffer = Buffer.from("this is not really an image, just plain text");
    const res = await request(app)
      .post("/api/media/assets")
      .set("Cookie", adminCookie)
      .attach("file", fakeImageBuffer, "fake.jpg");
    logResponse("Media", "Admin -> upload fake image (should be rejected)", res.status, res.body);
    expect(res.status).toBe(400);
  });

  it("GET /api/media/assets lists the uploaded asset", async () => {
    const res = await request(app).get("/api/media/assets").set("Cookie", adminCookie);
    logResponse("Media", "GET /api/media/assets", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.some((a: any) => a.id === uploadedAssetId);
    expect(found).toBe(true);
  });

  it("Uploading with no file at all is rejected cleanly", async () => {
    const res = await request(app).post("/api/media/assets").set("Cookie", adminCookie);
    logResponse("Media", "Admin -> upload with no file", res.status, res.body);
    expect(res.status).toBe(400);
  });
});