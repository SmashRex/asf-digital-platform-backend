import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import type { UpdateProfileInput } from "./users.validation.js";

export async function getProfile(userId: string) {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const [updated] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}