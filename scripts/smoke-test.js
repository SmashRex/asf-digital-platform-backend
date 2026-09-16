const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:4000";
const results = [];

function extractCookie(response) {
  const raw = response.headers.get("set-cookie");
  if (!raw) return null;
  return raw.split(";")[0]; // "asf_session=..."
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
    // 200 if a published lesson exists, 404 NO_CURRENT_STUDY if none — both are valid states
    assert(res.status === 200 || res.status === 404, `expected 200 or 404, got ${res.status}`);
  });

  // 13. Media placements (public, no auth)
  await check("GET /api/media/placements (public, no auth)", async () => {
    const res = await fetch(`${BASE_URL}/api/media/placements`);
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}`);
    assert(body.data.length === 11, `expected 11 placements, got ${body.data.length}`);
  });

  // 14. Members directory (requires permission — expect 403 for plain Member)
  await check("GET /api/members (plain Member correctly forbidden)", async () => {
    const res = await fetch(`${BASE_URL}/api/members`, {
      headers: { Cookie: sessionCookie },
    });
    // Member role DOES have members.view_directory per the permission matrix, so expect 200
    const body = await res.json();
    assert(res.status === 200, `expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    // A plain member should NOT see private fields
    const anyHasEmail = body.data.some((m) => "email" in m);
    assert(!anyHasEmail, "plain Member should not see email field (privacy scoping broken)");
  });

  // 15. Logout
  await check("POST /api/auth/logout", async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: sessionCookie },
    });
    assert(res.status === 200, `expected 200, got ${res.status}`);
  });

  // 16. Session actually revoked after logout
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