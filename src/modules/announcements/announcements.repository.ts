import { db } from "../../db/index.js";
import { announcements } from "../../db/schema/index.js";
import { eq, and, gte, isNull, or, desc } from "drizzle-orm";

export async function createAnnouncement(input: {
  title: string;
  message: string;
  priority: string;
  expiresAt?: Date | null;
  createdBy: string;
}) {
  const [row] = await db.insert(announcements).values(input).returning();
  return row;
}

export async function findById(id: string) {
  const rows = await db.select().from(announcements).where(eq(announcements.id, id));
  return rows[0] ?? null;
}

export async function listAnnouncements(includeUnpublished: boolean) {
  const now = new Date();
  const conditions = includeUnpublished
    ? undefined
    : and(
        eq(announcements.publicationStatus, "published"),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
      );

  const query = db.select().from(announcements);
  if (conditions) {
    return query.where(conditions).orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }
  return query.orderBy(desc(announcements.createdAt));
}

export async function publishAnnouncement(id: string) {
  const [row] = await db
    .update(announcements)
    .set({ publicationStatus: "published", publishedAt: new Date(), updatedAt: new Date() })
    .where(eq(announcements.id, id))
    .returning();
  return row;
}