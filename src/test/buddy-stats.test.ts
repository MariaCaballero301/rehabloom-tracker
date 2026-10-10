import { describe, expect, it } from "vitest";
import { messageStreak, sharedExerciseTotals, type BuddyStats } from "@/lib/buddy-stats";
const stats: BuddyStats = { user_id: "buddy", messages_sent: 8, cheer_xp: 12, message_days: [], shared_today: 2, shared_week: 15, shared_total: 130 };
describe("Buddy statistics", () => {
  it("shows the opted-in today/week/all-time counts in order", () => {
    expect(sharedExerciseTotals(stats)).toEqual([2, 15, 130]);
  });
  it("never shows counts when sharing is off", () => {
    expect(sharedExerciseTotals({ ...stats, shared_today: null, shared_week: null, shared_total: null })).toBeNull();
  });
  it("counts consecutive messaging days once per day", () => {
    expect(messageStreak(["2026-10-08", "2026-10-09", "2026-10-09", "2026-10-10"], new Date(2026, 9, 10))).toBe(3);
  });
  it("keeps yesterday's streak alive and breaks after a missed day", () => {
    expect(messageStreak(["2026-10-08", "2026-10-09"], new Date(2026, 9, 10))).toBe(2);
    expect(messageStreak(["2026-10-08"], new Date(2026, 9, 10))).toBe(0);
  });
});