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
    expect(dayKey(weekAt(1, new Date(2026, 9, 10))[0]!)).toBe("2026-10-11");
    expect(longDate(new Date(2026, 9, 10))).toBe("Saturday, Oct. 10th");
  });
});
