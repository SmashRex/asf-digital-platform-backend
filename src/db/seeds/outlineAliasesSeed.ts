import { db, pool } from "../index.js";
import { outlineSectionAliases } from "../schema/index.js";

const defaultAliases: { canonicalKey: string; alias: string }[] = [
  { canonicalKey: "studyMarker", alias: "Study" },
  { canonicalKey: "studyMarker", alias: "Bible Study" },
  { canonicalKey: "studyMarker", alias: "Lesson" },

  { canonicalKey: "topic", alias: "Topic" },
  { canonicalKey: "theme", alias: "Theme" },

  { canonicalKey: "subTheme", alias: "Sub-Theme" },
  { canonicalKey: "subTheme", alias: "Sub Theme" },

  { canonicalKey: "textRef", alias: "Text" },
  { canonicalKey: "textRef", alias: "Scripture" },

  { canonicalKey: "memoryVerseRef", alias: "Memory Verse" },
  { canonicalKey: "memoryVerseRef", alias: "Verse to Memorize" },
  { canonicalKey: "memoryVerseRef", alias: "Verse to Learn" },

  { canonicalKey: "aim", alias: "Aim" },
  { canonicalKey: "aim", alias: "Objective" },

  { canonicalKey: "introduction", alias: "Introduction" },

  { canonicalKey: "studyGuide", alias: "Study Guide" },
  { canonicalKey: "studyGuide", alias: "Food for Thought" },
  { canonicalKey: "studyGuide", alias: "Lesson Thought" },

  { canonicalKey: "discussionQuestions", alias: "Discussion Questions" },
  { canonicalKey: "discussionQuestions", alias: "Questions" },

  { canonicalKey: "conclusion", alias: "Conclusion" },
  { canonicalKey: "conclusion", alias: "Summary" },

  { canonicalKey: "prayerPoints", alias: "Prayer Points" },
  { canonicalKey: "prayerPoints", alias: "Prayer" },
];

async function seedAliases() {
  console.log("Seeding default outline section aliases...");
  await db.insert(outlineSectionAliases).values(defaultAliases).onConflictDoNothing();
  console.log(`Seeded ${defaultAliases.length} aliases.`);
  await pool.end();
}

seedAliases().catch((err) => {
  console.error("Failed to seed aliases:", err);
  process.exit(1);
});