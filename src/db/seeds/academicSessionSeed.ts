import { db, pool } from "../index.js";
import { academicSessions } from "../schema/index.js";

async function seedAcademicSession() {
  console.log("Seeding active academic session...");

  await db
    .insert(academicSessions)
    .values({
      id: "2026/2027",
      name: "2026/2027 Academic Session",
      startDate: "2026-10-01",
      endDate: "2027-07-31",
      isActive: true,
    })
    .onConflictDoNothing();

  console.log("Seeded academic session 2026/2027 as active.");
  await pool.end();
}

seedAcademicSession().catch((err) => {
  console.error("Failed to seed academic session:", err);
  process.exit(1);
});