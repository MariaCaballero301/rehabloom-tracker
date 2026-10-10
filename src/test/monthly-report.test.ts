import { describe, it, expect } from "vitest";
import { buildPrompt, demoStats, demoPeriodStats, monthStats, periodStats } from "@/lib/monthly-report";
import { summaryRange } from "@/lib/summary-period";

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
    expect(s.sessionsTogetherScheduled).toBe(1);
  });
});

describe("buildPrompt", () => {
  it("sends only numbers, no names or emails", () => {
    const p = buildPrompt(demoStats("2026-10"));
    expect(p).not.toMatch(/@|name/i);
    expect(p).toContain("\"completionRatePct\":79");
  });
});

describe("weekly summary periods", () => {
  it("selects a Monday–Sunday week across a month boundary", () => {
    expect(summaryRange("weekly", "2026-10-01")).toEqual({ from: "2026-09-28", to: "2026-10-04" });
  });
  it("counts only weekly records up to today, excluding skips from completions", () => {
    const stats = periodStats("weekly", "2026-10-10", ex, [
      { day: "2026-10-04", status: "complete" }, { day: "2026-10-05", status: "complete" },
      { day: "2026-10-06", status: "skip" }, { day: "2026-10-11", status: "complete" },
    ], [], [], new Date(2026, 9, 10));
    expect(stats.daysInPeriod).toBe(6);
    expect(stats.scheduledExercises).toBe(6);
    expect(stats.completedExercises).toBe(1);
    expect(stats.skippedExercises).toBe(1);
    expect(stats.avgPain).toBeNull();
  });
  it("rejects impossible weekly dates", () => {
    expect(() => summaryRange("weekly", "2026-02-30")).toThrow();
  });
  it("uses seven days and weekly counts for fictional weekly data", () => {
    const stats = demoPeriodStats("weekly", "2026-10-10");
    expect(stats.daysInPeriod).toBe(7);
    expect(stats.scheduledExercises).toBe(21);
    expect(stats.completedExercises).toBe(17);
    expect(stats.periodStart).toBe("2026-10-05");
  });
});
