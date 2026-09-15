import { db } from "../../db/index.js";
import { bibleStudies } from "../../db/schema/index.js";
import { eq, and, lte, desc } from "drizzle-orm";

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
    .where(and(eq(bibleStudies.publicationStatus, "published"), lte(bibleStudies.studyDate, today)))
    .orderBy(desc(bibleStudies.studyDate))
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