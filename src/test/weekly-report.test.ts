import { describe, it, expect } from "vitest";
import { weeklyReport } from "@/lib/weekly-report";

const today = new Date(2026, 9, 10);
const ex = [{ created_at: "2026-01-01T00:00:00Z", frequency: "daily", occurrences: 1, days: [0, 1, 2, 3, 4, 5, 6] }];

describe("weeklyReport", () => {
  it("counts adherence, XP and streak from own records only", () => {
    const co = [{ day: "2026-10-10" }, { day: "2026-10-09" }, { day: "2026-10-08" }];
    const ci = [{ day: "2026-10-06", pain: 4, status: "normal" }, { day: "2026-10-10", pain: 2, status: "normal" }];
    const r = weeklyReport(ex, co, ci, today);
    expect(r.adherence).toBe(43);
    expect(r.targetsMet).toBe(3);
    expect(r.xp).toBe(40);
    expect(r.streak).toBe(3);
    expect(r.painFirst?.pain).toBe(4);
    expect(r.painLast?.pain).toBe(2);
  });
  it("has no adherence without exercises", () => {
    expect(weeklyReport([], [], [], today).adherence).toBeNull();
  });
});
