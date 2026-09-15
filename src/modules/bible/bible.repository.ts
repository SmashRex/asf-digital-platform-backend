import { db } from "../../db/index.js";
import { bibleTranslations, bibleBooks, bibleVerses } from "../../db/schema/index.js";
import { eq, and, sql } from "drizzle-orm";

export async function listTranslations() {
  return db.query.bibleTranslations.findMany({ where: eq(bibleTranslations.isActive, true) });
}

export async function findTranslation(translationId: string) {
  return db.query.bibleTranslations.findFirst({ where: eq(bibleTranslations.id, translationId) });
}

export async function listBooks() {
  return db.query.bibleBooks.findMany({ orderBy: (table, { asc }) => [asc(table.bookOrder)] });
}

export async function findBook(bookId: string) {
  return db.query.bibleBooks.findFirst({ where: eq(bibleBooks.id, bookId) });
}

export async function getChapter(
  translationId: string,
  bookId: string,
  chapter: number,
  verseStart?: number,
  verseEnd?: number
) {
  const conditions = [
    eq(bibleVerses.translationId, translationId),
    eq(bibleVerses.bookId, bookId),
    eq(bibleVerses.chapter, chapter),
  ];

  if (verseStart !== undefined) {
    conditions.push(sql`${bibleVerses.verse} >= ${verseStart}`);
    conditions.push(sql`${bibleVerses.verse} <= ${verseEnd ?? verseStart}`);
  }

  return db
    .select({ verse: bibleVerses.verse, text: bibleVerses.text })
    .from(bibleVerses)
    .where(and(...conditions))
    .orderBy(bibleVerses.verse);
}

export async function searchVerses(translationId: string, query: string, limit: number) {
  return db
    .select({
      bookId: bibleVerses.bookId,
      chapter: bibleVerses.chapter,
      verse: bibleVerses.verse,
      text: bibleVerses.text,
    })
    .from(bibleVerses)
    .where(
      and(
        eq(bibleVerses.translationId, translationId),
        sql`${bibleVerses.tsv} @@ plainto_tsquery('english', ${query})`
      )
    )
    .limit(limit);
}