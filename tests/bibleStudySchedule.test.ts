import { describe, it, expect } from "vitest";
import { isTuesday, generateWeeklySchedule } from "../src/utils/bibleStudySchedule.js";

describe("Bible Study schedule generation", () => {
  it("isTuesday correctly identifies a real Tuesday", () => {
    expect(isTuesday("2026-09-15")).toBe(true);
  });

  it("isTuesday correctly rejects a non-Tuesday", () => {
    expect(isTuesday("2026-09-14")).toBe(false); // Monday
    expect(isTuesday("2026-09-16")).toBe(false); // Wednesday
  });

  it("generates the exact sequence from the frontend guy's own example", () => {
    const dates = generateWeeklySchedule("2026-09-15", 4);
    expect(dates).toEqual(["2026-09-15", "2026-09-22", "2026-09-29", "2026-10-06"]);
  });

  it("correctly crosses a month boundary (Sep -> Oct)", () => {
    const dates = generateWeeklySchedule("2026-09-15", 12);
    expect(dates[dates.length - 1]).toBe("2026-12-01");
  });

  it("every generated date is a real Tuesday", () => {
    const dates = generateWeeklySchedule("2026-09-15", 20);
    for (const d of dates) {
      expect(isTuesday(d)).toBe(true);
    }
  });

  it("generates exactly lessonCount dates, no more, no fewer", () => {
    const dates = generateWeeklySchedule("2026-09-15", 7);
    expect(dates.length).toBe(7);
  });

  it("first date always equals the given startDate", () => {
    const dates = generateWeeklySchedule("2026-09-15", 5);
    expect(dates[0]).toBe("2026-09-15");
  });

  it("correctly crosses a year boundary", () => {
    const dates = generateWeeklySchedule("2026-12-22", 3);
    expect(dates).toEqual(["2026-12-22", "2026-12-29", "2027-01-05"]);
  });
});