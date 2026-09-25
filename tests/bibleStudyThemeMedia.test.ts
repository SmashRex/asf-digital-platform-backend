import { describe, it, expect } from "vitest";
import request from "supertest";
import path from "path";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";
const SAMPLE_IMAGE = path.resolve("tests/fixtures/sample-image.jpg");
const PLACEMENT_KEY = "public.bible-study.theme";

describe("Bible Study theme media placement", () => {
  let adminCookie: string;
  let memberCookie: string;
  let uploadedAssetId: string;

  it("setup: login as admin + register a plain member", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("Bible Study Theme Media", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-bstheme-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest Bible Study Theme Member",
      departmentId: "other",
      gender: "Male",
      academicLevel: "200 Level",
    });
    logResponse("Bible Study Theme Media", "setup: register member", reg.status, reg.body);
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
  });

  it("GET the placement before any image is assigned: 200, asset is null", async () => {
    const res = await request(app).get(`/api/media/placements/${PLACEMENT_KEY}`);
    logResponse("Bible Study Theme Media", "GET placement (before upload)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe(PLACEMENT_KEY);
    expect(res.body.data.asset).toBeNull();
  });

  it("Admin uploads a real image asset", async () => {
    const res = await request(app)
      .post("/api/media/assets")
      .set("Cookie", adminCookie)
      .attach("file", SAMPLE_IMAGE)
      .field("altText", "Vitest Bible Study theme test image");
    logResponse("Bible Study Theme Media", "Admin -> upload image", res.status, res.body);
    expect(res.status).toBe(201);
    uploadedAssetId = res.body.data.id;
  });

  it("Member is BLOCKED from assigning an asset to the placement (no permission)", async () => {
    const res = await request(app)
      .put(`/api/media/placements/${PLACEMENT_KEY}`)
      .set("Cookie", memberCookie)
      .send({ assetId: uploadedAssetId });
    logResponse("Bible Study Theme Media", "Member -> assign asset (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin assigns the uploaded asset to the Bible Study theme placement", async () => {
    const res = await request(app)
      .put(`/api/media/placements/${PLACEMENT_KEY}`)
      .set("Cookie", adminCookie)
      .send({ assetId: uploadedAssetId });
    logResponse("Bible Study Theme Media", "Admin -> assign asset to placement", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.key).toBe(PLACEMENT_KEY);
    expect(res.body.data.asset.id).toBe(uploadedAssetId);
  });

  it("GET the placement after assignment: the real asset is now returned", async () => {
    const res = await request(app).get(`/api/media/placements/${PLACEMENT_KEY}`);
    logResponse("Bible Study Theme Media", "GET placement (after upload)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.asset).not.toBeNull();
    expect(res.body.data.asset.id).toBe(uploadedAssetId);
  });

  it("The new placement now appears in the full placements list", async () => {
    const res = await request(app).get("/api/media/placements");
    logResponse("Bible Study Theme Media", "GET all placements (should include new key)", res.status, res.body);
    expect(res.status).toBe(200);
    const found = res.body.data.find((p: any) => p.key === PLACEMENT_KEY);
    expect(found).toBeDefined();
    expect(found.asset.id).toBe(uploadedAssetId);
  });
});