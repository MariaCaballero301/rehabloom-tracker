import { describe, it, expect } from "vitest";
import { computeXp, stageFor, completedRecords, currentWeek, dayKey, nextExerciseStatus } from "@/lib/rehab";

describe("rehab rules", () => {
  it("awards 10 XP per exercise and 5 per check-in", () => {
    expect(computeXp(3, 2)).toBe(40);
  });
  it("plant stages unlock at 0, 50, 150, 300 XP", () => {
    expect(stageFor(49).index).toBe(0);
    expect(stageFor(50).index).toBe(1);
    expect(stageFor(150).index).toBe(2);
    expect(stageFor(300).index).toBe(3);
    expect(stageFor(1000).nextAt).toBeNull();
  });
  it("skipped exercises do not earn completion XP", () => {
    expect(computeXp(completedRecords([{ status: "complete" }, { status: "skip" }]).length, 0)).toBe(10);
  });
  it("complete and skip replace one another for a daily record", () => {
    expect(nextExerciseStatus("complete", "skip")).toBe("skip");
    expect(nextExerciseStatus("skip", "complete")).toBe("complete");
    expect(nextExerciseStatus("complete", "complete")).toBeNull();
    expect(nextExerciseStatus("skip", "skip")).toBeNull();
  });
  it("daily lines cover the current Sunday to Saturday week including today", () => {
    expect(currentWeek(new Date(2026, 9, 10)).map(dayKey)).toEqual([
      "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10",
    ]);
  });
});

import { cooldownRemainingMs, gapDaysRemaining, formatWait, sortExercises, scheduledCount, weekAt, longDate } from "@/lib/rehab";

describe("frequency rules", () => {
  it("daily cooldown blocks the next occurrence until the wait has passed", () => {
    const now = new Date("2026-10-10T12:30:00Z");
    expect(cooldownRemainingMs("2026-10-10T12:00:00Z", 60, now)).toBe(30 * 60_000);
    expect(cooldownRemainingMs("2026-10-10T11:00:00Z", 60, now)).toBe(0);
    expect(formatWait(90 * 60_000)).toBe("1 hour 30 minutes");
  });
  it("weekly days-in-between blocks until enough days pass", () => {
    expect(gapDaysRemaining("2026-10-08", 2, "2026-10-10")).toBe(1);
    expect(gapDaysRemaining("2026-10-08", 2, "2026-10-11")).toBe(0);
  });
  it("daily exercises sort to the top and count occurrences every day", () => {
    expect(sortExercises([{ frequency: "weekly", n: 1 }, { frequency: "daily", n: 2 }]).map((e) => e.n)).toEqual([2, 1]);
    expect(scheduledCount({ frequency: "daily", occurrences: 3, days: [] }, new Date(2026, 9, 10))).toBe(3);
    expect(scheduledCount({ frequency: "weekly", occurrences: 1, days: [1] }, new Date(2026, 9, 10))).toBe(0);
  });
  it("next week starts the following Sunday and dates read like Saturday, Oct. 10th", () => {
    const first = weekAt(1, new Date(2026, 9, 10))[0];
    expect(first && dayKey(first)).toBe("2026-10-11");
    expect(longDate(new Date(2026, 9, 10))).toBe("Saturday, Oct. 10th");
  });
});

import { positiveInteger, weeklyAvailability, weeklySchedule, checkinCount, historyPeriod, monthWeeks, weekRange } from "@/lib/rehab";

describe("weekly scheduling and history rules", () => {
  it("scheduled weekdays exclude interval gaps and occurrence counts", () => {
    expect(weeklySchedule("days", [1, 3], 6, 2)).toEqual({ weekly_mode: "days", days: [1, 3], occurrences: 1, gap_days: 0 });
  });
  it("interval scheduling excludes weekdays and allows 1–6 occurrences", () => {
    expect(weeklySchedule("interval", [1, 3], 6, 2)).toEqual({ weekly_mode: "interval", days: [], occurrences: 6, gap_days: 2 });
    expect(weeklySchedule("interval", [], 10, 2).occurrences).toBe(6);
    expect(weeklySchedule("interval", [], 0, 2).occurrences).toBe(1);
  });
  it("days in between never go below one and remain integers", () => {
    expect(positiveInteger(-2)).toBe(1);
    expect(positiveInteger(0)).toBe(1);
    expect(positiveInteger(3)).toBe(3);
    expect(positiveInteger(2.4)).toBe(2);
  });
  it("weekly interval quota and days in between apply independently", () => {
    const ex = { id: "exercise", occurrences: 2, gap_days: 1 };
    const records = [{ exercise_id: "exercise", day: "2026-10-06", status: "complete" }, { exercise_id: "exercise", day: "2026-10-08", status: "complete" }];
    expect(weeklyAvailability(ex, records, new Date(2026, 9, 9)).gap).toBe(1);
    expect(weeklyAvailability(ex, records, new Date(2026, 9, 10)).available).toBe(false);
    expect(weeklyAvailability(ex, records, new Date(2026, 9, 11)).available).toBe(true);
    expect(weeklyAvailability(ex, [{ exercise_id: "exercise", day: "2026-10-06", status: "skip" }], new Date(2026, 9, 10)).count).toBe(0);
  });
  it("editing a daily check-in cannot award another five XP", () => {
    expect(computeXp(0, checkinCount([{ day: "2026-10-10" }, { day: "2026-10-10" }]))).toBe(5);
  });
  it("before joining is unavailable; inactive joined weeks have no action", () => {
    const days = currentWeek(new Date(2026, 9, 10));
    expect(historyPeriod(days, "2026-10-11T12:00:00", [], new Date(2026, 9, 20))).toEqual({ temporal: "Past", empty: "No Data Available" });
    expect(historyPeriod(days, "2026-10-01T12:00:00", [], new Date(2026, 9, 20))).toEqual({ temporal: "Past", empty: "No Action Taken" });
    expect(historyPeriod(days, "2026-10-01T12:00:00", ["2026-10-08"], new Date(2026, 9, 20)).empty).toBeNull();
    expect(historyPeriod(weekAt(1, new Date(2026, 9, 10)), "2026-10-01T12:00:00", [], new Date(2026, 9, 10))).toEqual({ temporal: "Upcoming", empty: null });
  });
  it("weekly ranges show October 4th - October 10th", () => {
    expect(weekRange(currentWeek(new Date(2026, 9, 10)))).toBe("October 4th - October 10th");
  });
  it("monthly history includes every date even when the month spans five weeks", () => {
    const weeks = monthWeeks(new Date(2026, 9, 1));
    expect(weeks).toHaveLength(5);
    expect(weeks.flat().filter((d) => d.getMonth() === 9)).toHaveLength(31);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
  });
});
