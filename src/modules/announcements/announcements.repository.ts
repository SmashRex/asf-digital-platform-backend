import { db } from "../../db/index.js";
import { announcements } from "../../db/schema/index.js";
import { eq, and, gte, isNull, or, desc } from "drizzle-orm";

export async function createAnnouncement(input: {
  title: string;
  message: string;
  priority: string;
  isUrgent: boolean;
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

export async function listAnnouncements(includeAll: boolean) {
  const now = new Date();
  if (includeAll) {
    return db.select().from(announcements).orderBy(desc(announcements.priority), desc(announcements.createdAt));
  }
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, "Published"),
        or(isNull(announcements.expiresAt), gte(announcements.expiresAt, now))
      )
    )
    .orderBy(desc(announcements.priority), desc(announcements.createdAt));
}

export async function updateStatus(id: string, fields: Partial<{
  status: string;
  revisionNotes: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  publishedBy: string | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
}>) {
  const [row] = await db.update(announcements).set({ ...fields, updatedAt: new Date() }).where(eq(announcements.id, id)).returning();
  return row;
}

export async function updateContent(id: string, fields: { title?: string; message?: string }) {
  const [row] = await db.update(announcements).set({ ...fields, status: "Draft", revisionNotes: null, updatedAt: new Date() }).where(eq(announcements.id, id)).returning();
  return row;
}