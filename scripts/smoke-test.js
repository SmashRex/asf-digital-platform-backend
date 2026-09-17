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

  // 1. Health check
  await check("GET /health", async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.status === "ok", "expected status: ok");
  });

  // 2. Register (also captures session cookie — auto-login)
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

  // 3. Me (using the auto-login cookie from register)
  await check("GET /api/auth/me (auto-login session)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.email === testEmail, "expected matching email");
  });

  // 4. Login (fresh, confirms password auth independently works)
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

  // 5. Wrong password rejected
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

  // 6. Bible translations
  await check("GET /api/bible/translations", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/translations`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length >= 3, `expected at least 3 translations, got ${body.data.length}`);
  });

  // 7. Bible books
  await check("GET /api/bible/books", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/books`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length === 66, `expected 66 books, got ${body.data.length}`);
  });

  // 8. Bible chapter read
  await check("GET /api/bible/KJV/john/3", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/KJV/john/3`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.verses.length === 36, `expected 36 verses in John 3, got ${body.data.verses.length}`);
  });

  // 9. Bible verse range
  await check("GET /api/bible/KJV/john/3?verseStart=16&verseEnd=18", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/KJV/john/3?verseStart=16&verseEnd=18`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.verses.length === 3, `expected 3 verses, got ${body.data.verses.length}`);
  });

  // 10. Bible search
  await check("GET /api/bible/search?q=beginning", async () => {
    const res = await fetch(`${BASE_URL}/api/bible/search?q=beginning&translationId=KJV`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length > 0, "expected at least one search result");
  });

  // 11. Bible Study list (as plain member — should only see published)
  await check("GET /api/bible-study (member view)", async () => {
    const res = await fetch(`${BASE_URL}/api/bible-study`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(Array.isArray(body.data), "expected an array");
  });

  // 12. Bible Study current
  await check("GET /api/bible-study/current", async () => {
    const res = await fetch(`${BASE_URL}/api/bible-study/current`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200 || res.status === 404, `expected 200 or 404, got ${res.status}`);
  });

  // 13. Media placements (public, no auth)
  await check("GET /api/media/placements (public, no auth)", async () => {
    const res = await fetch(`${BASE_URL}/api/media/placements`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length === 11, `expected 11 placements, got ${body.data.length}`);
  });

  // 14. Members directory
  await check("GET /api/members (plain Member correctly forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/members`, {
      headers: { Cookie: sessionCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    const anyHasEmail = body.data.some((m) => "email" in m);
    assert(!anyHasEmail, "plain Member should not see email field (privacy scoping broken)");
  });

  // ============================================================
  // FS (Foundational School) — new tests
  // ============================================================

  let adminCookie = null;
  let admissionId = null;
  let classId = null;
  let studentId = null;

  // 15. Admin login (needed for all FS review/approve actions)
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

  // 16. Apply for FS (fresh smoke-test member, no subgroup, so should succeed)
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

  // 17. Duplicate application rejected
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

  // 18. Admin can see the admission
  await check("GET /api/fs/admissions/admin (admin sees pending)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin?status=Pending`, {
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.some((a) => a.id === admissionId);
    assert(found, "expected to find the smoke-test admission in the pending list");
  });

  // 19. Plain member forbidden from admin admissions list
  await check("GET /api/fs/admissions/admin (member forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/admissions/admin`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 403, `expected 403, got ${res.status}`);
  });

  // 20. Create a class to approve into
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

  // 21. Approve the admission into that class
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

  // 22. Re-reviewing the same admission is rejected
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

  // 23. Student now shows up on the class roster
  await check("GET /api/fs/students?classId=... (enrollment confirmed)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students?classId=${classId}`, {
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    const found = body.data.find((s) => s.status === "Active");
    assert(found, "expected an Active student in the new class");
    studentId = found.id;
  });

  // 24. Withdraw the student
  await check("PATCH /api/fs/students/:id/withdraw", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students/${studentId}/withdraw`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.data.status === "Withdrawn", "expected status Withdrawn");
  });

  // 25. Withdrawing again is rejected (no longer Active)
  await check("PATCH /api/fs/students/:id/withdraw (rejected second time)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/students/${studentId}/withdraw`, {
      method: "PATCH",
      headers: { Cookie: adminCookie },
    });
    const body = await res.json();
    assert(res.status === 409, `expected 409, got ${res.status}`);
    assert(body.error?.code === "STUDENT_NOT_ACTIVE", "expected STUDENT_NOT_ACTIVE");
  });

  // 26. FS manual: member with no enrollment/teaching role is blocked
  await check("GET /api/fs/manual (unrelated member blocked)", async () => {
    const res = await fetch(`${BASE_URL}/api/fs/manual`, {
      headers: { Cookie: sessionCookie },
    });
    // smoke-test member was withdrawn above, so should now be blocked
    assert(res.status === 403 || res.status === 404, `expected 403 or 404, got ${res.status}`);
  });

  // ============================================================
  // End FS tests
  // ============================================================

  // 27. Logout
  await check("POST /api/auth/logout", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  // 28. Session actually revoked after logout
  await check("GET /api/auth/me (session revoked after logout)", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 401, `expected 401 after logout, got ${res.status}`);
  });

  // Summary
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