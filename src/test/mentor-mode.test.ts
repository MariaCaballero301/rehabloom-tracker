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

import { recoveryRange, plural } from "@/lib/mentor-mode";
import { isInviteActive } from "@/lib/network";
describe("mentor polish", () => {
  it("permanent 'infinity' invites never expire", () => {
    expect(isInviteActive({ expires_at: "infinity" })).toBe(true);
    expect(isInviteActive({ expires_at: "2020-01-01T00:00:00Z" }, new Date("2026-01-01"))).toBe(false);
  });
  it("recovery story starts at account creation or an earlier first completion, ends at finished day", () => {
    expect(recoveryRange("2026-09-01", [{ day: "2026-08-20", status: "complete" }], "2026-10-01")).toEqual({ from: "2026-08-20", to: "2026-10-01" });
    expect(recoveryRange("2026-09-01", [], "2026-10-01")).toEqual({ from: "2026-09-01", to: "2026-10-01" });
  });
  it("never uses the same start and end day", () => {
    const r = recoveryRange("2026-10-01", [], "2026-10-01");
    expect(r.from < r.to).toBe(true);
  });
  it("uses singular and plural", () => {
    expect(plural(1, "person", "people")).toBe("1 person");
    expect(plural(2, "session", "sessions")).toBe("2 sessions");
  });
});
