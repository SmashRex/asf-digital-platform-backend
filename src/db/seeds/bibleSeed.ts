import fs from "node:fs";
import { db, pool } from "../index.js";
import { bibleBooks, bibleTranslations, bibleVerses } from "../schema/index.js";
import { canonicalBooks } from "./bibleBooksData.js";
import { parseBibleFile } from "./bibleParsers.js";

async function seedBible() {
  const [translationId, displayName, filePath] = process.argv.slice(2);

  if (!translationId || !displayName || !filePath) {
    console.error("Usage: tsx bibleSeed.ts <TRANSLATION_ID> <DISPLAY_NAME> <FILE_PATH>");
    process.exit(1);
  }

  console.log("Seeding canonical book list (idempotent)...");
  await db.insert(bibleBooks).values([...canonicalBooks]).onConflictDoNothing();

  console.log(`Registering translation: ${translationId}...`);
  await db.insert(bibleTranslations).values({ id: translationId, name: displayName, sourceType: "local" }).onConflictDoNothing();

  console.log(`Reading ${filePath}...`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  console.log("Detecting file format...");
  const verses = parseBibleFile(data);
  console.log(`Parsed ${verses.length} verses using detected format.`);

  const bookNameToId = new Map(canonicalBooks.map((b) => [b.name.toLowerCase(), b.id]));

  function resolveBookId(bookName: string): string | null {
    const normalized = bookName.toLowerCase();
    if (bookNameToId.has(normalized)) return bookNameToId.get(normalized)!;
    if (bookNameToId.has(normalized + "s")) return bookNameToId.get(normalized + "s")!;
    if (normalized.endsWith("s") && bookNameToId.has(normalized.slice(0, -1))) {
      return bookNameToId.get(normalized.slice(0, -1))!;
    }
    return null;
  }

  let totalVerses = 0;
  const BATCH_SIZE = 1000;
  let batch: (typeof bibleVerses.$inferInsert)[] = [];
  const unrecognized = new Set<string>();

  for (const v of verses) {
    const bookId = resolveBookId(v.bookName);
    if (!bookId) {
      unrecognized.add(v.bookName);
      continue;
    }

    batch.push({ translationId, bookId, chapter: v.chapter, verse: v.verse, text: v.text });

    if (batch.length >= BATCH_SIZE) {
      await db.insert(bibleVerses).values(batch).onConflictDoNothing();
      totalVerses += batch.length;
      console.log(`  ...${totalVerses} verses imported so far`);
      batch = [];
    }
  }

  if (batch.length > 0) {
    await db.insert(bibleVerses).values(batch).onConflictDoNothing();
    totalVerses += batch.length;
  }

  if (unrecognized.size > 0) {
    console.warn(`⚠️  Unrecognized book names skipped: ${[...unrecognized].join(", ")}`);
  }

  console.log(`✅ Done. Imported ${totalVerses} verses for ${translationId}.`);
  await pool.end();
}

seedBible().catch((err) => {
  console.error("❌ Bible seed failed:", err);
  process.exit(1);
});