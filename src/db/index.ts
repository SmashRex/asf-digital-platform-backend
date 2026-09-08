import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.config.js";
import * as schema from "./schema/index.js";

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];