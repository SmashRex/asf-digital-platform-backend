import { pgTable, uuid, varchar, text, integer, date, timestamp, jsonb, check, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { bibleStudySeries } from "./bibleStudySeries.js";

export const bibleStudies = pgTable(
  "bible_studies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonNumber: integer("lesson_number").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    topic: varchar("topic", { length: 255 }).notNull(),
    theme: varchar("theme", { length: 255 }).notNull(),
    studyDate: date("study_date").notNull(),
    textRef: varchar("text_ref", { length: 255 }).notNull(),
    textContent: text("text_content"),
    memoryVerseRef: varchar("memory_verse_ref", { length: 100 }).notNull(),
    memoryVerseText: text("memory_verse_text").notNull(),
    aim: text("aim").notNull(),
    introduction: text("introduction").notNull(),
    studyGuide: jsonb("study_guide").notNull().default([]),
    discussionQuestions: jsonb("discussion_questions").notNull().default([]),
    conclusion: text("conclusion").notNull(),
    prayerPoints: jsonb("prayer_points").notNull().default([]),
    publicationStatus: varchar("publication_status", { length: 50 }).notNull().default("draft"),
    seriesId: uuid("series_id").references(() => bibleStudySeries.id, { onDelete: "set null" }),
    scheduledDate: date("scheduled_date"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    publishedBy: uuid("published_by").references(() => users.id, { onDelete: "restrict" }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("chk_bible_study_status", sql`${table.publicationStatus} IN ('draft', 'published', 'archived')`),
    check("chk_lesson_number", sql`${table.lessonNumber} > 0`),
    index("idx_bible_studies_date").on(sql`${table.studyDate} DESC`),
    index("idx_bible_studies_status").on(table.publicationStatus),
    index("idx_bible_studies_scheduled_date").on(table.scheduledDate),
  ]
);