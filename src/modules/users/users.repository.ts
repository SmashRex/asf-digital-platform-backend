import { db } from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import type { UpdateProfileInput } from "./users.validation.js";

type UserRow = typeof users.$inferSelect;

// Never send the password hash to any client.
function withoutPasswordHash(user: UserRow | null | undefined) {
  if (!user) return user;
  const { passwordHash: _passwordHash, ...safe } = user;
  return safe;
}

export async function getProfile(userId: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  return withoutPasswordHash(user);
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const [updated] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return withoutPasswordHash(updated);
}