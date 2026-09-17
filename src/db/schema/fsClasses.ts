import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { academicSessions } from "./academicSessions.js";

export const fsClasses = pgTable(
  "fs_classes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    academicSessionId: varchar("academic_session_id", { length: 20 })
      .notNull()
      .references(() => academicSessions.id, { onDelete: "restrict" }),
    semester: varchar("semester", { length: 20 }).notNull(),
    teacherCap: integer("teacher_cap"),
    manualVisible: boolean("manual_visible").notNull().default(false),
    status: varchar("status", { length: 20 }).notNull().default("Active"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_fs_classes_session").on(table.academicSessionId),
    index("idx_fs_classes_status").on(table.status),
    check("chk_fs_class_semester", sql`${table.semester} IN ('First', 'Second')`),
    check("chk_fs_class_status", sql`${table.status} IN ('Active', 'Archived')`),
    check("chk_fs_class_teacher_cap", sql`${table.teacherCap} IS NULL OR ${table.teacherCap} > 0`),
  ]
);