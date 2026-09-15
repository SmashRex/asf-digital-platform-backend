import { db } from "../../db/index.js";
import { outlineSectionAliases } from "../../db/schema/index.js";
import type { AliasMap } from "../../utils/pdfOutlineExtractor.js";

export async function loadAliasMap(): Promise<AliasMap> {
  const rows = await db.select().from(outlineSectionAliases);
  const map: AliasMap = {};
  for (const row of rows) {
    if (!map[row.canonicalKey]) map[row.canonicalKey] = [];
    map[row.canonicalKey].push(row.alias);
  }
  return map;
}

export async function addAlias(canonicalKey: string, alias: string) {
  const [row] = await db.insert(outlineSectionAliases).values({ canonicalKey, alias }).onConflictDoNothing().returning();
  return row;
}

export async function listAliases() {
  return db.select().from(outlineSectionAliases).orderBy(outlineSectionAliases.canonicalKey);
}