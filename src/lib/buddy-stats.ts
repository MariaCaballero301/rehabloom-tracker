import { dayKey } from "./rehab";

export type BuddyStats = {
  user_id: string;
  messages_sent: number;
  cheer_xp: number;
  message_days: string[];
  shared_today: number | null;
  shared_week: number | null;
  shared_total: number | null;
};

/** A current conversation streak may end today or yesterday. */
export function messageStreak(days: string[], now = new Date()) {
  const recorded = new Set(days);
  const cursor = new Date(now);
  if (!recorded.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (recorded.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function sharedExerciseTotals(stats?: BuddyStats) {
  if (!stats || stats.shared_today === null || stats.shared_week === null || stats.shared_total === null) return null;
  return [stats.shared_today, stats.shared_week, stats.shared_total];
}