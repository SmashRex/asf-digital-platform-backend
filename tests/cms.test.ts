import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { logResponse } from "./helpers/logResponse.js";

const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

// The GET responses contain extra fields (id, configId, timestamps) and nulls that the
// save endpoint rejects or ignores, so reduce a snapshot to what saveDraft accepts.
function toSaveShape(snapshot: any) {
  return {
    copy: snapshot.copy,
    sections: snapshot.sections.map((s: any) => {
      const out: Record<string, any> = { type: s.type, title: s.title, order: s.order };
      for (const key of ["sectionKey", "subtitle", "description", "imageUrl", "items", "configuration", "isCore", "isVisible"]) {
        if (s[key] !== null && s[key] !== undefined) out[key] = s[key];
      }
      return out;
    }),
  };
}

describe("CMS (Website Content)", () => {
  let adminCookie: string;
  let memberCookie: string;
  let publishedSnapshot: any;
  let draftSnapshot: any;

  it("setup: login as admin, snapshot the live site, register a plain member", async () => {
    const login = await request(app).post("/api/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    logResponse("CMS", "setup login (admin)", login.status, login.body);
    expect(login.status).toBe(200);
    adminCookie = login.headers["set-cookie"]![0].split(";")[0];

    // Snapshot BEFORE any test touches the site, so afterAll can put it back.
    const pub = await request(app).get("/api/content/website");
    expect(pub.status).toBe(200);
    publishedSnapshot = pub.body.data;
    const drf = await request(app).get("/api/content/website/draft").set("Cookie", adminCookie);
    expect(drf.status).toBe(200);
    draftSnapshot = drf.body.data;

    const reg = await request(app).post("/api/auth/register").send({
      email: `vitest-cms-${Date.now()}@example.com`,
      password: "vitestpass123",
      name: "Vitest CMS Member",
      departmentId: "other",
      gender: "Male",
      academicLevel: "200 Level",
    });
    logResponse("CMS", "setup: register member", reg.status, reg.body);
    expect(reg.status).toBe(201);
    memberCookie = reg.headers["set-cookie"]![0].split(";")[0];
  });

  afterAll(async () => {
    if (!publishedSnapshot || !draftSnapshot) return;

    const saveLive = await request(app)
      .post("/api/content/website/draft")
      .set("Cookie", adminCookie)
      .send(toSaveShape(publishedSnapshot));
    if (saveLive.status !== 200) throw new Error(`CMS restore failed: saving the live copy as draft returned ${saveLive.status}`);

    const republish = await request(app).post("/api/content/website/publish").set("Cookie", adminCookie);
    if (republish.status !== 200) throw new Error(`CMS restore failed: republishing returned ${republish.status}`);

    const saveDraft = await request(app)
      .post("/api/content/website/draft")
      .set("Cookie", adminCookie)
      .send(toSaveShape(draftSnapshot));
    if (saveDraft.status !== 200) throw new Error(`CMS restore failed: restoring the working draft returned ${saveDraft.status}`);

    const live = await request(app).get("/api/content/website");
    if (live.body.data.copy?.hero?.headline !== publishedSnapshot.copy?.hero?.headline) {
      throw new Error("CMS restore failed: the live headline does not match the original snapshot");
    }
  }, 60000);

  it("GET /api/content/website is public, no auth required", async () => {
    const res = await request(app).get("/api/content/website");
    logResponse("CMS", "Public -> GET /api/content/website", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("published");
    expect(Array.isArray(res.body.data.sections)).toBe(true);
  });

  it("Member is BLOCKED from viewing the draft (no edit_draft permission)", async () => {
    const res = await request(app).get("/api/content/website/draft").set("Cookie", memberCookie);
    logResponse("CMS", "Member -> GET draft (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin CAN view the draft", async () => {
    const res = await request(app).get("/api/content/website/draft").set("Cookie", adminCookie);
    logResponse("CMS", "Admin -> GET draft", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("draft");
  });

  it("Member is BLOCKED from saving a draft", async () => {
    const res = await request(app).post("/api/content/website/draft").set("Cookie", memberCookie).send({
      copy: { hero: { headline: "Should Not Save" } },
      sections: [{ sectionKey: "sec-hero", type: "hero", title: "Hero", order: 1 }],
    });
    logResponse("CMS", "Member -> save draft (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  const headlineForSave = `Vitest Headline ${Date.now()}`;

  it("Admin saves a draft, and the saved content is returned back", async () => {
    const res = await request(app).post("/api/content/website/draft").set("Cookie", adminCookie).send({
      copy: { hero: { headline: headlineForSave, supportingText: "test", primaryCtaText: "Go", secondaryCtaText: "See" } },
      sections: [{ sectionKey: "sec-hero", type: "hero", title: "Hero Welcome", isCore: true, order: 1, isVisible: true }],
    });
    logResponse("CMS", "Admin -> save draft", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.copy.hero.headline).toBe(headlineForSave);
  });

  it("Saving a section with a non-integer order is rejected", async () => {
    const res = await request(app).post("/api/content/website/draft").set("Cookie", adminCookie).send({
      copy: { hero: { headline: "Bad Order Test" } },
      sections: [{ sectionKey: "sec-hero", type: "hero", title: "Hero", order: 1.5 }],
    });
    logResponse("CMS", "Admin -> save draft with non-integer order (should fail)", res.status, res.body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("Member is BLOCKED from publishing", async () => {
    const res = await request(app).post("/api/content/website/publish").set("Cookie", memberCookie);
    logResponse("CMS", "Member -> publish (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  let versionBeforePublish: number;

  it("Admin publishes: version increments by 1, public site reflects the saved draft", async () => {
    const before = await request(app).get("/api/content/website");
    versionBeforePublish = before.body.data.version;

    const res = await request(app).post("/api/content/website/publish").set("Cookie", adminCookie);
    logResponse("CMS", "Admin -> publish", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.version).toBe(versionBeforePublish + 1);
    expect(res.body.data.copy.hero.headline).toBe(headlineForSave);

    const after = await request(app).get("/api/content/website");
    logResponse("CMS", "Public -> GET website (after publish)", after.status, after.body);
    expect(after.body.data.copy.hero.headline).toBe(headlineForSave);
  });

  const unsavedHeadline = `Vitest Unsaved Draft ${Date.now()}`;

  it("Admin edits the draft again without publishing, then discards: draft reverts to the last published content", async () => {
    const save = await request(app).post("/api/content/website/draft").set("Cookie", adminCookie).send({
      copy: { hero: { headline: unsavedHeadline, supportingText: "test", primaryCtaText: "Go", secondaryCtaText: "See" } },
      sections: [{ sectionKey: "sec-hero", type: "hero", title: "Hero Welcome", isCore: true, order: 1, isVisible: true }],
    });
    expect(save.status).toBe(200);
    expect(save.body.data.copy.hero.headline).toBe(unsavedHeadline);

    const res = await request(app).post("/api/content/website/draft/discard").set("Cookie", adminCookie);
    logResponse("CMS", "Admin -> discard draft", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.copy.hero.headline).toBe(headlineForSave);
    expect(res.body.data.copy.hero.headline).not.toBe(unsavedHeadline);
  });

  it("Member is BLOCKED from discarding the draft", async () => {
    const res = await request(app).post("/api/content/website/draft/discard").set("Cookie", memberCookie);
    logResponse("CMS", "Member -> discard (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Member is BLOCKED from factory-resetting", async () => {
    const res = await request(app).post("/api/content/website/reset").set("Cookie", memberCookie);
    logResponse("CMS", "Member -> reset (should be blocked)", res.status, res.body);
    expect(res.status).toBe(403);
  });

  it("Admin factory-resets: draft returns to hardcoded defaults, not the last published content", async () => {
    const res = await request(app).post("/api/content/website/reset").set("Cookie", adminCookie);
    logResponse("CMS", "Admin -> factory reset", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("draft");
    expect(res.body.data.copy.hero?.headline).not.toBe(headlineForSave);
  });

  it("Factory reset does not touch the live published site", async () => {
    const res = await request(app).get("/api/content/website");
    logResponse("CMS", "Public -> GET website (after factory reset, should be unaffected)", res.status, res.body);
    expect(res.status).toBe(200);
    expect(res.body.data.copy.hero.headline).toBe(headlineForSave);
  });

  it("Unauthenticated request to draft is blocked", async () => {
    const res = await request(app).get("/api/content/website/draft");
    logResponse("CMS", "No cookie -> GET draft", res.status, res.body);
    expect(res.status).toBe(401);
  });
});