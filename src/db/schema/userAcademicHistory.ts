import { pgTable, uuid, varchar, boolean, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { academicSessions } from "./academicSessions.js";

export const userAcademicHistory = pgTable(
  "user_academic_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    academicSessionId: varchar("academic_session_id", { length: 20 })
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    academicLevel: varchar("academic_level", { length: 50 }).notNull(),
    progressionStatus: varchar("progression_status", { length: 50 }).notNull().default("Promoted"),
    isOverride: boolean("is_override").notNull().default(false),
    overrideReason: text("override_reason"),
    recordedBy: uuid("recorded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_academic_history_user").on(table.userId),
    uniqueIndex("unq_user_session_history").on(table.userId, table.academicSessionId),
  ]
);