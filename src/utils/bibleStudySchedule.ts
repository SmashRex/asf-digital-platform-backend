const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses a 'YYYY-MM-DD' date string into a UTC-anchored Date object,
 * avoiding local-timezone drift that plain `new Date(str)` can cause
 * near midnight or across DST boundaries.
 */
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Returns true if the given 'YYYY-MM-DD' date string falls on a Tuesday.
 * Uses UTC day-of-week (0 = Sunday, 2 = Tuesday) to stay consistent
 * with parseDateOnly's UTC anchoring.
 */
export function isTuesday(dateStr: string): boolean {
  return parseDateOnly(dateStr).getUTCDay() === 2;
}

/**
 * Generates weekly Tuesday scheduled dates starting from `startDate`,
 * one per lesson, in lesson order. `startDate` MUST already be a Tuesday;
 * callers are responsible for validating this via `isTuesday` first and
 * raising a clean error otherwise — this function does not validate.
 *
 * Example: startDate '2026-09-15', lessonCount 3
 *   -> ['2026-09-15', '2026-09-22', '2026-09-29']
 */
export function generateWeeklySchedule(startDate: string, lessonCount: number): string[] {
  const start = parseDateOnly(startDate);
  const dates: string[] = [];
  for (let i = 0; i < lessonCount; i++) {
    const next = new Date(start.getTime() + i * 7 * DAY_MS);
    dates.push(formatDateOnly(next));
  }
  return dates;
}