import { db } from "../../db/index.js";
import { bibleStudies, bibleStudySeries } from "../../db/schema/index.js";
import { eq, and, asc, desc } from "drizzle-orm";
import type { Transaction } from "../../db/index.js";

export async function listStudies(includeUnpublished: boolean) {
  return db.query.bibleStudies.findMany({
    where: includeUnpublished ? undefined : eq(bibleStudies.publicationStatus, "published"),
    orderBy: [desc(bibleStudies.studyDate)],
  });
}

export async function findCurrentStudy() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(bibleStudies)
    .where(and(eq(bibleStudies.publicationStatus, "published"), eq(bibleStudies.scheduledDate, today)))
    .orderBy(desc(bibleStudies.publishedAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function findById(id: string) {
  return db.query.bibleStudies.findFirst({ where: eq(bibleStudies.id, id) });
}

export async function create(input: any, createdBy: string) {
  const [study] = await db.insert(bibleStudies).values({ ...input, createdBy }).returning();
  return study;
}

export async function update(id: string, input: any) {
  const [study] = await db
    .update(bibleStudies)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(bibleStudies.id, id))
    .returning();
  return study;
}

export async function publish(id: string, publishedBy: string) {
  const [study] = await db
    .update(bibleStudies)
    .set({ publicationStatus: "published", publishedBy, publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(bibleStudies.id, id))
    .returning();
  return study;
}

// ---- Bible Study Series ----

export async function createSeriesTx(tx: Transaction, input: { title: string; theme?: string; startDate: string; academicSessionId?: string }, createdBy: string) {
  const [series] = await tx
    .insert(bibleStudySeries)
    .values({ ...input, createdBy })
    .returning();
  return series;
}

export async function bulkCreateLessonsTx(tx: Transaction, seriesId: string, lessons: any[], createdBy: string) {
  const rows = lessons.map((lesson) => ({ ...lesson, seriesId, createdBy }));
  return tx.insert(bibleStudies).values(rows).returning();
}

export async function findSeriesById(id: string) {
  return db.query.bibleStudySeries.findFirst({ where: eq(bibleStudySeries.id, id) });
}

export async function findLessonsBySeriesId(seriesId: string) {
  return db.query.bibleStudies.findMany({
    where: eq(bibleStudies.seriesId, seriesId),
    orderBy: [asc(bibleStudies.lessonNumber)],
  });
}