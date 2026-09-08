import { db, pool } from "../index.js";
import { roles } from "../schema/index.js";

const canonicalRoles = [
  { id: "Member", name: "Member", description: "Default role assigned to every registered member." },
  { id: "FS Student", name: "FS Student", description: "Enrolled student in the Foundational School programme." },
  { id: "FS Teacher", name: "FS Teacher", description: "Teacher assigned to a Foundational School class." },
  { id: "VP / FS Coordinator", name: "VP / FS Coordinator", description: "Oversees Foundational School operations and admissions." },
  { id: "Bible Study Coordinator", name: "Bible Study Coordinator", description: "Manages weekly Bible Study outline creation and publishing." },
  { id: "Publicity Coordinator", name: "Publicity Coordinator", description: "Manages announcements and public broadcast content." },
  { id: "General Secretary", name: "General Secretary", description: "Maintains fellowship records and official documentation." },
  { id: "Organizing Coordinator", name: "Organizing Coordinator", description: "Coordinates events and logistics scheduling." },
  { id: "Drama Coordinator", name: "Drama Coordinator", description: "Leads the fellowship's drama unit." },
  { id: "Prayer Coordinator", name: "Prayer Coordinator", description: "Leads the fellowship's prayer unit." },
  { id: "Financial Secretary", name: "Financial Secretary", description: "Manages financial records and reporting." },
  { id: "Treasurer", name: "Treasurer", description: "Manages fellowship funds and disbursements." },
  { id: "Librarian", name: "Librarian", description: "Manages the fellowship's media and resource vault." },
  { id: "President / Executive", name: "President / Executive", description: "Holds global governance authority over the fellowship." },
  { id: "Technical Administrator", name: "Technical Administrator", description: "Manages system health, technical configuration, and audit visibility." },
] as const;

async function seedRoles() {
  console.log("Seeding roles...");

  await db.insert(roles).values([...canonicalRoles]).onConflictDoNothing();

  console.log(`Seeded ${canonicalRoles.length} roles.`);
  await pool.end();
}

seedRoles().catch((err) => {
  console.error("Failed to seed roles:", err);
  process.exit(1);
});