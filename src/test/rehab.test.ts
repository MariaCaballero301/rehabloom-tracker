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
