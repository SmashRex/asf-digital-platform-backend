import { pgTable, uuid, varchar, text, timestamp, smallint, uniqueIndex, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    department: varchar("department", { length: 255 }).notNull(),
    academicLevel: varchar("academic_level", { length: 50 }).notNull(),
    programDurationYears: smallint("program_duration_years").notNull().default(4),
    phoneNumber: varchar("phone_number", { length: 50 }),
    subgroup: varchar("subgroup", { length: 100 }),
    accountStatus: varchar("account_status", { length: 50 }).notNull().default("Active"),
    membershipStatus: varchar("membership_status", { length: 50 }).notNull().default("Active Student"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("idx_users_email_lower").on(sql`lower(${table.email})`),
    index("idx_users_account_status").on(table.accountStatus),
    index("idx_users_academic_level").on(table.academicLevel),
    check("chk_account_status", sql`${table.accountStatus} IN ('Active', 'Suspended', 'Deactivated')`),
    check("chk_membership_status", sql`${table.membershipStatus} IN ('Active Student', 'Alumni', 'Visiting')`),
    check(
      "chk_academic_level",
      sql`${table.academicLevel} IN ('100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'Postgraduate', 'Alumni')`
    ),
    check("chk_program_duration", sql`${table.programDurationYears} IN (4, 5)`),
  ]
);