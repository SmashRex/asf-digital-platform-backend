import { db } from "../../db/index.js";
import { bibleBookAliases, bibleBooks } from "../../db/schema/index.js";
import { eq, or, sql, inArray } from "drizzle-orm";



export async function resolveBooksByAlias(
  normalizedTokens: string[]
): Promise<Map<string, { bookId: string; bookName: string }>> {
  if (normalizedTokens.length === 0) return new Map();

  const aliasRows = await db
    .select({ token: bibleBookAliases.alias, bookId: bibleBookAliases.bookId, bookName: bibleBooks.name })
    .from(bibleBookAliases)
    .innerJoin(bibleBooks, eq(bibleBookAliases.bookId, bibleBooks.id))
    .where(inArray(bibleBookAliases.alias, normalizedTokens));

  const nameRows = await db
    .select({ token: sql<string>`lower(${bibleBooks.name})`, bookId: bibleBooks.id, bookName: bibleBooks.name })
    .from(bibleBooks)
    .where(inArray(sql`lower(${bibleBooks.name})`, normalizedTokens));

  const map = new Map<string, { bookId: string; bookName: string }>();
  for (const row of [...aliasRows, ...nameRows]) {
    map.set(row.token, { bookId: row.bookId, bookName: row.bookName });
  }
  return map;
}

export async function resolveBookByAlias(normalizedToken: string): Promise<{ bookId: string; bookName: string } | null> {
  const row = await db
    .select({ bookId: bibleBooks.id, bookName: bibleBooks.name })
    .from(bibleBooks)
    .leftJoin(bibleBookAliases, eq(bibleBookAliases.bookId, bibleBooks.id))
    .where(or(sql`lower(${bibleBooks.name}) = ${normalizedToken}`, eq(bibleBookAliases.alias, normalizedToken)))
    .limit(1);
  return row[0] ?? null;
}

export async function addBookAlias(bookId: string, alias: string) {
  const [row] = await db.insert(bibleBookAliases).values({ bookId, alias: alias.toLowerCase() }).onConflictDoNothing().returning();
  return row;
}