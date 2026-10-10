import { describe, it, expect } from "vitest";
import { buildPrompt, demoStats, monthStats } from "@/lib/monthly-report";

const ex = [{ created_at: "2026-01-01T00:00:00Z", frequency: "daily", occurrences: 1, days: [0, 1, 2, 3, 4, 5, 6] }];

describe("monthStats", () => {
  it("counts only days up to today and reports missing pain as null", () => {
    const s = monthStats("2026-10", ex, [{ day: "2026-10-01", status: "complete" }, { day: "2026-10-02", status: "skip" }], [], [{ status: "accepted" }], new Date(2026, 9, 4));
    expect(s.daysInPeriod).toBe(4);
    expect(s.scheduledExercises).toBe(4);
    expect(s.completionRatePct).toBe(25);
    expect(s.skippedExercises).toBe(1);
    expect(s.avgPain).toBeNull();
    expect(s.daysWithoutCheckin).toBe(4);
    expect(s.sessionsTogetherAccepted).toBe(1);
  });
});

describe("buildPrompt", () => {
  it("sends only numbers, no names or emails", () => {
    const p = buildPrompt(demoStats("2026-10"));
    expect(p).not.toMatch(/@|name/i);
    expect(p).toContain("\"completionRatePct\":79");
  });
});
