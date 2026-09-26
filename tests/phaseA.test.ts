import { describe, expect, it } from "vitest";
import { db } from "../src/db/index.js";
import { executiveOffices } from "../src/db/schema/index.js";
import { canonicalExecutiveOffices } from "../src/config/executiveOffices.config.js";
import { asc } from "drizzle-orm";

describe("Phase A catalogs", () => {
  it("matches the live executive office catalog exactly", async () => {
    const live = await db.select({ id: executiveOffices.id, name: executiveOffices.name }).from(executiveOffices).orderBy(asc(executiveOffices.id));
    const canonical = [...canonicalExecutiveOffices].sort((left, right) => left.id.localeCompare(right.id));
    expect(live).toEqual(canonical);
  });
});