import { describe, expect, it } from "vitest";
import { BACK_IN_REHAB, finishedTherapyIds, withoutMentors } from "@/lib/mentor-mode";

describe("mentor mode", () => {
  it("skips patients who finished therapy in the missed-session job", () => {
    const finished = finishedTherapyIds([
      { user_id: "a", finished_therapy: true },
      { user_id: "b", finished_therapy: false },
    ]);
    const result = withoutMentors(new Map([["a", 1], ["b", 2], ["c", 3]]), finished);
    expect([...result.keys()]).toEqual(["b", "c"]);
  });

  it("switching back clears both finished_therapy and is_mentor", () => {
    expect(BACK_IN_REHAB).toEqual({ finished_therapy: false, is_mentor: false });
  });
});

import { isAfterRecovery, journeyTotals } from "@/lib/mentor-mode";
describe("recovery journey", () => {
  it("counts only up to the recovery day and finds the best streak", () => {
    const t = journeyTotals(
      [
        { day: "2026-03-01", status: "complete" }, { day: "2026-03-02", status: "complete" },
        { day: "2026-03-03", status: "complete" }, { day: "2026-03-05", status: "complete" },
        { day: "2026-03-05", status: "skip" }, { day: "2026-03-09", status: "complete" },
      ],
      [{ day: "2026-03-06" }],
      "2026-03-07",
    );
    expect(t).toEqual({ daysActive: 5, exercisesCompleted: 4, bestStreak: 3, firstDay: "2026-03-01" });
  });
  it("days after the recovery date are maintenance days", () => {
    expect(isAfterRecovery("2026-03-08", "2026-03-07")).toBe(true);
    expect(isAfterRecovery("2026-03-07", "2026-03-07")).toBe(false);
    expect(isAfterRecovery("2026-03-08", null)).toBe(false);
  });
});
