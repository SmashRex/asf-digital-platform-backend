const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:4000";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";
const results = [];

function extractCookie(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0];
}

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`✅ ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.log(`❌ ${name} — ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log(`\nRunning smoke tests against ${BASE_URL}\n`);

  const testEmail = `smoketest-${Date.now()}@example.com`;
  const testPassword = "smoketest123";
  let sessionCookie = null;

  await check("GET /health", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.status === "ok", "expected status: ok");
  });

  await check("POST /api/auth/register", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        name: "Smoke Test",
        department: "Computer Science",
        academicLevel: "100 Level",
      }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.roles?.includes("Member"), "expected roles to include Member");
    sessionCookie = extractCookie(res);
    assert(sessionCookie, "expected Set-Cookie header on register (auto-login)");
  });

  await check("GET /api/auth/me (auto-login session)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.email === testEmail, "expected matching email");
  });

  await check("POST /api/auth/login", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    sessionCookie = extractCookie(res) || sessionCookie;
  });

  await check("POST /api/auth/login (wrong password rejected)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: testEmail, password: "wrongpassword" }),
    });
    const body = await res.json();
    assert(res.status === 401, `expected 401, got ${res.status}`);
    assert(body.error?.code === "INVALID_CREDENTIALS", "expected INVALID_CREDENTIALS");
  });

  await check("GET /api/bible/translations", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/translations`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length >= 3, `expected at least 3 translations, got ${body.data.length}`);
  });

  await check("GET /api/bible/books", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/books`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length === 66, `expected 66 books, got ${body.data.length}`);
  });

  await check("GET /api/bible/KJV/john/3", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/KJV/john/3`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.verses.length === 36, `expected 36 verses in John 3, got ${body.data.verses.length}`);
  });

  await check("GET /api/bible/KJV/john/3?verseStart=16&verseEnd=18", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/KJV/john/3?verseStart=16&verseEnd=18`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.verses.length === 3, `expected 3 verses, got ${body.data.verses.length}`);
  });

  await check("GET /api/bible/search?q=beginning", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/search?q=beginning&translationId=KJV`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length > 0, "expected at least one search result");
  });

  await check("GET /api/bible-study (member view)", async () => {
    const res = await fetch(`${BASE_URL}/api/bible-study`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(body.data), "expected an array");
  });

  await check("GET /api/bible-study/current", async () => {
    const res = await fetch(`${BASE_URL}/api/bible-study/current`, { headers: { Cookie: sessionCookie } });
    assert(res.status === 200 || res.status === 404, `expected 200 or 404, got ${res.status}`);
  });

  await check("GET /api/media/placements (public, no auth)", async () => {
    const res = await fetch(`${BASE_URL}/api/media/placements`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length === 11, `expected 11 placements, got ${body.data.length}`);
  });

  await check("GET /api/members (plain Member correctly forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/members`, { headers: { Cookie: sessionCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    const anyHasEmail = body.data.some((m) => "email" in m);
    assert(!anyHasEmail, "plain Member should not see email field (privacy scoping broken)");
  });

  // ============================================================
  // FS (Foundational School)
  // ============================================================

  let adminCookie = null;
  let admissionId = null;
  let classId = null;
  let studentId = null;

  await check("POST /api/auth/login (admin)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    adminCookie = extractCookie(res);
    assert(adminCookie, "expected Set-Cookie on admin login");
  });

  await check("POST /api/fs/admissions (apply)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ testimony: "Smoke test testimony" }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Pending", "expected status Pending");
    admissionId = body.data.id;
  });

  await check("POST /api/fs/admissions (duplicate rejected)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "ADMISSION_ALREADY_PENDING", "expected ADMISSION_ALREADY_PENDING");
  });

  await check("GET /api/fs/admissions/admin (admin sees pending)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin?status=Pending`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.some((a) => a.id === admissionId);
    assert(found, "expected to find the smoke-test admission in the pending list");
  });

  await check("GET /api/fs/admissions/admin (member forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin`, { headers: { Cookie: sessionCookie } });
    assert(res.status === 403, `expected 403, got ${res.status}`);
  });

  await check("POST /api/fs/classes (create)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/classes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        name: `Smoke Test Class ${Date.now()}`,
        academicSessionId: "2027/2028",
        semester: "First",
      }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    classId = body.data.id;
  });

  await check("PATCH /api/fs/admissions/admin/:id/review (approve)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin/${admissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ action: "approve", classId }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Approved", "expected status Approved");
  });

  await check("PATCH .../review (already reviewed rejected)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin/${admissionId}/review`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ action: "reject" }),
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "ALREADY_REVIEWED", "expected ALREADY_REVIEWED");
  });

  await check("GET /api/fs/students?classId=... (enrollment confirmed)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students?classId=${classId}`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.find((s) => s.status === "Active");
    assert(found, "expected an Active student in the new class");
    studentId = found.id;
  });

  await check("PATCH /api/fs/students/:id/withdraw", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students/${studentId}/withdraw`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Withdrawn", "expected status Withdrawn");
  });

  await check("PATCH /api/fs/students/:id/withdraw (rejected second time)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students/${studentId}/withdraw`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "STUDENT_NOT_ACTIVE", "expected STUDENT_NOT_ACTIVE");
  });

  await check("GET /api/fs/manual (unrelated member blocked)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/manual`, { headers: { Cookie: sessionCookie } });
    assert(res.status === 403 || res.status === 404, `expected 403 or 404, got ${res.status}`);
  });

  // ============================================================
  // CMS — Website Content
  // ============================================================

  await check("GET /api/content/website (public, auto-creates default)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "published", "expected status published");
    assert(Array.isArray(body.data.sections), "expected sections array");
  });

  await check("GET /api/content/website/draft (admin, auto-creates default)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website/draft`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "draft", "expected status draft");
  });

  await check("GET /api/content/website/draft (member forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website/draft`, { headers: { Cookie: sessionCookie } });
    assert(res.status === 403, `expected 403, got ${res.status}`);
  });

  const newHeadline = `Smoke Test Headline ${Date.now()}`;

  await check("POST /api/content/website/draft (save)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website/draft`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        copy: { hero: { headline: newHeadline, supportingText: "test", primaryCtaText: "Go", secondaryCtaText: "See" } },
        sections: [{ sectionKey: "sec-hero", type: "hero", title: "Hero Welcome", isCore: true, order: 1, isVisible: true }],
      }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.copy.hero.headline === newHeadline, "expected draft headline to match what was saved");
  });

  let publishedVersionBefore = null;

  await check("GET /api/content/website (version before publish)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website`);
    const body = await res.json();
    publishedVersionBefore = body.data.version;
    assert(typeof publishedVersionBefore === "number", "expected a numeric version");
  });

  await check("POST /api/content/website/publish", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website/publish`, {
      method: "POST",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.version === publishedVersionBefore + 1, "expected version to increment by 1");
    assert(body.data.copy.hero.headline === newHeadline, "expected published headline to match the published draft");
  });

  await check("GET /api/content/website (public sees published change)", async () => {
    const res = await fetch(`${BASE_URL}/api/content/website`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.copy.hero.headline === newHeadline, "expected public site to reflect the newly published headline");
  });

  // ============================================================
  // Announcements — full lifecycle
  // ============================================================

  let normalAnnouncementId = null;
  let revisionAnnouncementId = null;

  await check("POST /api/announcements (create normal draft)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: "Prayer Meeting", message: "Join us Thursday", priority: "Normal" }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Draft", "expected status Draft");
    normalAnnouncementId = body.data.id;
  });

  await check("PATCH /api/announcements/:id/submit-review", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${normalAnnouncementId}/submit-review`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Pending Review", "expected status Pending Review");
  });

  await check("PATCH /api/announcements/:id/approve", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${normalAnnouncementId}/approve`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Approved", "expected status Approved");
  });

  await check("PATCH /api/announcements/:id/publish", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${normalAnnouncementId}/publish`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Published", "expected status Published");
  });

  await check("PATCH /api/announcements/:id/archive", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${normalAnnouncementId}/archive`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Archived", "expected status Archived");
  });

  await check("PATCH /api/announcements/:id/archive (double archive rejected)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${normalAnnouncementId}/archive`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "INVALID_STATUS", "expected INVALID_STATUS");
  });

  await check("POST /api/announcements (create for revision branch)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: "Prayer Meeting 2", message: "Join us Thursday", priority: "Normal" }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    revisionAnnouncementId = body.data.id;
  });

  await check("PATCH /api/announcements/:id/submit-review (revision branch)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${revisionAnnouncementId}/submit-review`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  await check("PATCH /api/announcements/:id/request-revision", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${revisionAnnouncementId}/request-revision`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ notes: "Please add the venue" }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Revision Requested", "expected status Revision Requested");
  });

  await check("PUT /api/announcements/:id (edit after revision)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements/${revisionAnnouncementId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ message: "Join us Thursday at the main hall" }),
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Draft", "expected status back to Draft");
    assert(body.data.message === "Join us Thursday at the main hall", "expected message updated");
  });

  await check("POST /api/announcements (isUrgent fast-track)", async () => {
    const res = await fetch(`${BASE_URL}/api/announcements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({ title: "Service starting now", message: "Come quickly!", priority: "Urgent", isUrgent: true }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Published", "expected urgent announcement to skip straight to Published");
  });

  // ============================================================
  // Events
  // ============================================================

  let eventId = null;

  await check("POST /api/events (minimal fields only)", async () => {
    const res = await fetch(`${BASE_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: adminCookie },
      body: JSON.stringify({
        title: "Sunday Service",
        location: "Glory Tabernacle",
        startTime: "2026-12-21T08:00:00.000Z",
      }),
    });
    const body = await res.json();
    assert(res.status === 201, `expected 201, got ${res.status}: ${JSON.stringify(body)}`);
    eventId = body.data.id;
  });

  await check("GET /api/events", async () => {
    const res = await fetch(`${BASE_URL}/api/events`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.some((e) => e.id === eventId);
    assert(found, "expected created event in list");
  });

  await check("GET /api/events?filter=upcoming", async () => {
    const res = await fetch(`${BASE_URL}/api/events?filter=upcoming`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.some((e) => e.id === eventId);
    assert(found, "expected event to appear as upcoming");
  });

  await check("GET /api/events/featured", async () => {
    const res = await fetch(`${BASE_URL}/api/events/featured`, { headers: { Cookie: adminCookie } });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.id, "expected a featured event to be returned");
  });

  await check("PATCH /api/events/:id/cancel", async () => {
    const res = await fetch(`${BASE_URL}/api/events/${eventId}/cancel`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Cancelled", "expected status Cancelled");
  });

  await check("PATCH /api/events/:id/cancel (double cancel rejected)", async () => {
    const res = await fetch(`${BASE_URL}/api/events/${eventId}/cancel`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "ALREADY_CANCELLED", "expected ALREADY_CANCELLED");
  });

  // ============================================================
  // End new tests
  // ============================================================

  await check("POST /api/auth/logout", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: "POST", headers: { Cookie: sessionCookie } });
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  await check("GET /api/auth/me (session revoked after logout)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, { headers: { Cookie: sessionCookie } });
    assert(res.status === 401, `expected 401 after logout, got ${res.status}`);
  });

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed\n`);
  if (failed.length > 0) {
    console.log("FAILURES:");
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.error}`));
    process.exit(1);
  }
  process.exit(0);
}

run();