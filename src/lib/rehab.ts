// Pure logic for Rehabloom. XP never depends on pain level — it only rewards
// showing up (completing exercises or checking in honestly, including rest).
export const XP_PER_EXERCISE = 10;
export const XP_PER_CHECKIN = 5;

export function computeXp(completionCount: number, checkinCount: number) {
  return completionCount * XP_PER_EXERCISE + checkinCount * XP_PER_CHECKIN;
}

export const STAGES = [
  { min: 0, name: "Seed" },
  { min: 50, name: "Sprout" },
  { min: 150, name: "Young plant" },
  { min: 300, name: "In bloom" },
] as const;

export function stageFor(xp: number) {
  let i = 0;
  STAGES.forEach((s, idx) => {
    if (xp >= s.min) i = idx;
  });
  const next = STAGES[i + 1];
  return { index: i, name: STAGES[i]?.name ?? "Seed", nextAt: next?.min ?? null };
}

export function dayKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function lastNDays(n: number, from = new Date()) {
  const out: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(d);
  }
  return out;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type ExerciseStatus = "complete" | "skip";

export function completedRecords<T extends { status: string }>(records: T[]) {
  return records.filter((record) => record.status === "complete");
}

export function currentWeek(from = new Date()) {
  const end = new Date(from);
  end.setDate(end.getDate() - end.getDay() + 6);
  return lastNDays(7, end);
}

export function nextExerciseStatus(current: string | undefined, requested: ExerciseStatus) {
  return current === requested ? null : requested;
}

export type Frequency = "daily" | "weekly";

/** Sunday–Saturday week, shifted by whole weeks (0 = this week, 1 = next). */
export function weekAt(offset: number, from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + offset * 7);
  return currentWeek(d);
}

/** Daily exercises first; otherwise keep the original order. */
export function sortExercises<T extends { frequency: string }>(list: T[]) {
  return [...list].sort((a, b) => Number(b.frequency === "daily") - Number(a.frequency === "daily"));
}

/** How many check-offs an exercise has on a given date. */
export function scheduledCount(ex: { frequency: string; occurrences: number; days: number[] }, date: Date) {
  if (ex.frequency === "daily") return ex.occurrences;
  return ex.days.includes(date.getDay()) ? 1 : 0;
}

/** Milliseconds left before the next daily occurrence may be checked off. */
export function cooldownRemainingMs(lastCompletedAt: string | undefined, cooldownMinutes: number, now = new Date()) {
  if (!lastCompletedAt || cooldownMinutes <= 0) return 0;
  const ready = new Date(lastCompletedAt).getTime() + cooldownMinutes * 60_000;
  return Math.max(0, ready - now.getTime());
}

function dayNumber(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Days left before a weekly exercise may be checked off again ("days in between"). */
export function gapDaysRemaining(lastCompleteDay: string | undefined, gapDays: number, todayKey: string) {
  if (!lastCompleteDay || gapDays <= 0) return 0;
  return Math.max(0, dayNumber(lastCompleteDay) + gapDays + 1 - dayNumber(todayKey));
}

export function formatWait(ms: number) {
  const totalMin = Math.ceil(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const parts = [];
  if (h) parts.push(`${h} hour${h === 1 ? "" : "s"}`);
  if (m || !h) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  return parts.join(" ");
}

export function longDate(d: Date) {
  const n = d.getDate();
  const suf = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${month}${month.length > 3 ? "" : "."} ${n}${suf}`;
}
