import { writeFileSync } from "node:fs";

const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:4000";
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || "test2@example.com";
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || "AdminTest2026x";

// The recovered copy also carries lastUpdated / updatedBy / version. The backend tracks
// version and updatedBy itself. Set this to false to leave those three out of the draft.
const KEEP_FRONTEND_METADATA = true;

const copy = {
  hero: {
    headline: "Faith. Friends. FUTA.",
    supportingText: "A community of students at the Federal University of Technology, Akure growing together in Christ. We're learning, worshipping, praying, serving, laughing, and walking through university life together.",
    primaryCtaText: "Come Along",
    secondaryCtaText: "See This Week",
  },
  about: {
    headline: "We Follow Jesus Together.",
    description: "ASF means Anglican Students' Fellowship. We're a community of students who desire to know Christ, grow in God's Word, live faithfully, and encourage one another throughout our university journey. Here, faith isn't something we practise alone, it becomes part of everyday student life.",
    worshipTitle: "We Worship",
    worshipDesc: "We lift our voices, open our hearts, and gather simply to give God praise.",
    learnTitle: "We Learn",
    learnDesc: "We open the Bible, ask questions, listen, and grow deeper in God's Word.",
    prayTitle: "We Pray",
    prayDesc: "For one another. For our campus. For our future. And for God's will in our lives.",
    lifeTitle: "We Do Life Together",
    lifeDesc: "Because university isn't just lectures and exams. We laugh, encourage one another, make memories, and walk through life together.",
  },
  life: {
    heading: "Just Students. Just Like You.",
    supportingCopy: "We're students. We have lectures. We write tests. We have group assignments. We celebrate birthdays. We make friends. We get tired. We figure things out. And in the middle of all of it, we follow Jesus together.",
    lifeAtAsfHeading: "Life at ASF",
    lifeAtAsfSubheading: "Worship. Fellowship. Service. Memories. A glimpse into life together at ASF FUTA.",
  },
  visit: {
    headline: "Never Been to ASF Before?",
    subheading: "That's completely fine.",
    introText: "You don't need to know anyone. You don't need an invitation. You don't need to have everything figured out. Just come.",
    step1Title: "Show Up",
    step1Desc: "Come to one of our gatherings.",
    step2Title: "Meet People",
    step2Desc: "Meet students who are walking the same university journey.",
    step3Title: "Find Your Place",
    step3Desc: "Stay, grow, serve, and become part of the community.",
    visitHeadline: "Come Worship With Us",
    visitSubheading: "Whether you're a fresher, a returning student, an Anglican, or simply looking for a Christian community on campus, you're welcome.",
    locationName: "Federal University of Technology, Akure",
    mainGatheringName: "Sunday Worship Service",
    serviceTime: "8:00 AM",
    serviceVenue: "TBD (Official Venue)",
    directionsCtaText: "Get Directions",
  },
  cta: {
    heading: "Maybe You Should Come Along.",
    text: "University is a journey. Faith is a journey too. You don't have to walk either one alone.",
    ctaButtonText: "Come Worship With Us",
  },
  lastUpdated: "Sept 6, 2026",
  updatedBy: "Default System Configuration",
  version: 1,
};

if (!KEEP_FRONTEND_METADATA) {
  delete copy.lastUpdated;
  delete copy.updatedBy;
  delete copy.version;
}

// Only fields the save endpoint accepts. Dropped on purpose: id (the backend assigns its own),
// status, createdAt, updatedAt. sectionKey is kept, so the sections stay identifiable.
const sections = [
  { sectionKey: "sec-hero", type: "hero", title: "Hero Welcome", configuration: { background: "default" }, isCore: true, order: 1, isVisible: true },
  { sectionKey: "sec-about", type: "about", title: "About Fellowship", configuration: { background: "default" }, isCore: true, order: 2, isVisible: true },
  { sectionKey: "sec-schedule", type: "schedule", title: "Weekly Schedule", configuration: { background: "default" }, isCore: true, order: 3, isVisible: true },
  { sectionKey: "sec-life", type: "life", title: "Life at ASF", configuration: { background: "default" }, isCore: true, order: 4, isVisible: true },
  { sectionKey: "sec-visit", type: "visit", title: "Visit Us", configuration: { background: "default" }, isCore: true, order: 5, isVisible: true },
  { sectionKey: "sec-cta", type: "cta", title: "Call to Action", configuration: { background: "brand" }, isCore: true, order: 6, isVisible: true },
];

// Key order can change when the database stores JSON, so compare with sorted keys.
function canon(value) {
  if (Array.isArray(value)) return `[${value.map(canon).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canon(value[k])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function main() {
  const login = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  if (login.status !== 200) throw new Error(`Login failed: ${login.status} ${await login.text()}`);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const auth = { Cookie: cookie };

  // Back up the current draft before overwriting it.
  const before = await fetch(`${BASE_URL}/api/content/website/draft`, { headers: auth });
  if (before.status !== 200) throw new Error(`Could not read the current draft: ${before.status}`);
  writeFileSync("cms-draft-backup.json", JSON.stringify((await before.json()).data, null, 2));
  console.log("Backed up the current draft to cms-draft-backup.json");

  // Save as a DRAFT only. This script never calls publish.
  const save = await fetch(`${BASE_URL}/api/content/website/draft`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify({ copy, sections }),
  });
  if (save.status !== 200) throw new Error(`Saving the draft failed: ${save.status} ${await save.text()}`);

  const after = await fetch(`${BASE_URL}/api/content/website/draft`, { headers: auth });
  const draft = (await after.json()).data;
  writeFileSync("cms-draft-after-restore.json", JSON.stringify(draft, null, 2));
  console.log("Wrote the saved draft to cms-draft-after-restore.json\n");

  console.log(`copy identical to the recovered source: ${canon(draft.copy) === canon(copy)}`);
  for (const sent of sections) {
    const got = draft.sections.find((s) => s.sectionKey === sent.sectionKey);
    const same = got
      && got.type === sent.type && got.title === sent.title && got.order === sent.order
      && got.isCore === sent.isCore && got.isVisible === sent.isVisible
      && canon(got.configuration) === canon(sent.configuration);
    console.log(`section ${sent.sectionKey}: ${same ? "matches" : "MISMATCH"}`);
  }
  console.log(`sections sent: ${sections.length}, sections in draft: ${draft.sections.length}`);
  console.log(`draft status: ${draft.status}, published version untouched`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });