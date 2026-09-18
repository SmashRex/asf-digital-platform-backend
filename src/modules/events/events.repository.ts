import { db } from "../../db/index.js";
import { events } from "../../db/schema/index.js";
import { eq, gte, lt, desc, asc } from "drizzle-orm";

export async function createEvent(input: {
  title: string;
  category?: string;
  description?: string | null;
  location: string;
  startTime: Date;
  endTime?: Date | null;
  speaker?: string | null;
  speakerRole?: string | null;
  mode?: string;
  theme?: string | null;
  imageUrl?: string | null;
  createdBy: string;
}) {
  const [row] = await db.insert(events).values(input).returning();
  return row;
}

export async function findById(id: string) {
  const rows = await db.select().from(events).where(eq(events.id, id));
  return rows[0] ?? null;
}

export async function listEvents(filter?: "upcoming" | "past") {
  const now = new Date();
  const query = db.select().from(events);
  if (filter === "upcoming") return query.where(gte(events.startTime, now)).orderBy(asc(events.startTime));
  if (filter === "past") return query.where(lt(events.startTime, now)).orderBy(desc(events.startTime));
  return query.orderBy(asc(events.startTime));
}

export async function getFeatured() {
  const now = new Date();
  const rows = await db.select().from(events).where(gte(events.startTime, now)).orderBy(asc(events.startTime)).limit(1);
  return rows[0] ?? null;
}

export async function updateEvent(id: string, input: Partial<{
  title: string;
  category: string;
  description: string | null;
  location: string;
  startTime: Date;
  endTime: Date | null;
  speaker: string | null;
  speakerRole: string | null;
  mode: string;
  theme: string | null;
  imageUrl: string | null;
}>) {
  const [row] = await db.update(events).set({ ...input, updatedAt: new Date() }).where(eq(events.id, id)).returning();
  return row;
}

export async function cancelEvent(id: string) {
  const [row] = await db.update(events).set({ status: "Cancelled", updatedAt: new Date() }).where(eq(events.id, id)).returning();
  return row;
}