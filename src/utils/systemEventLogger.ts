import { db } from "../db/index.js";
import { systemEvents } from "../db/schema/index.js";

export async function logSystemEvent(input: {
  component: string;
  severity?: "Info" | "Success" | "Warning" | "Error";
  event: string;
  message: string;
  details?: string;
}) {
  try {
    await db.insert(systemEvents).values({
      component: input.component,
      severity: input.severity ?? "Info",
      event: input.event,
      message: input.message,
      details: input.details ?? null,
    });
  } catch (err) {
    console.error("Failed to log system event:", err);
  }
}