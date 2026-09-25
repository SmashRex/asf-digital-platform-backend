import { db } from "../db/index.js";
import { auditLogs } from "../db/schema/index.js";
import type { Transaction } from "../db/index.js";

export async function recordAudit(input: {
  actorId: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown> | null;
}, executor: typeof db | Transaction = db) {
  const [row] = await executor.insert(auditLogs).values({
    actorId: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata ?? null,
  }).returning();
  return row;
}