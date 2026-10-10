// Pure logic for Rehabloom. XP never depends on pain level — it only rewards
// showing up (completing exercises or checking in honestly, including rest).
export const XP_PER_EXERCISE = 10;
export const XP_PER_CHECKIN = 5;

export const XP_PER_CHEER = 2;
export const MAX_XP_CHEERS_PER_DAY = 5;

/** Cheers (encouragements sent) that earn XP: at most MAX_XP_CHEERS_PER_DAY per day. */
export function cheerCount(sent: { created_at: string }[]) {
  const perDay = new Map<string, number>();
  for (const c of sent) {
    const k = dayKey(new Date(c.created_at));
    perDay.set(k, Math.min(MAX_XP_CHEERS_PER_DAY, (perDay.get(k) ?? 0) + 1));
  }
  return [...perDay.values()].reduce((a, b) => a + b, 0);
}

export function computeXp(completionCount: number, checkinCount: number, cheers = 0) {
  return completionCount * XP_PER_EXERCISE + checkinCount * XP_PER_CHECKIN + cheers * XP_PER_CHEER;
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
  return { index: i, name: STAGES[i]?.name ?? "Seed", min: STAGES[i]?.min ?? 0, nextAt: next?.min ?? null };
}

/** 0–1 progress within the current stage; each stage's bar starts empty. */
export function stageProgress(xp: number) {
  const s = stageFor(xp);
  if (s.nextAt === null) return 1;
  return Math.min(1, Math.max(0, (xp - s.min) / (s.nextAt - s.min)));
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
export function scheduledCount(ex: { frequency: string; occurrences: number; days: number[]; weekly_mode?: string }, date: Date) {
  if (ex.frequency === "daily") return ex.occurrences;
  if (ex.weekly_mode === "interval") return 1;
  return ex.days.includes(date.getDay()) ? 1 : 0;
}

export function positiveInteger(value: number) {
  return Math.max(1, Math.round(Number.isFinite(value) ? value : 1));
}

export function weeklySchedule(mode: string, days: number[], occurrences: number, gapDays: number) {
  return mode === "interval"
    ? { weekly_mode: "interval", days: [], occurrences: Math.min(6, positiveInteger(occurrences)), gap_days: positiveInteger(gapDays) }
    : { weekly_mode: "days", days, occurrences: 1, gap_days: 0 };
}

export function checkinCount(records: { day: string }[]) {
  return new Set(records.map((record) => record.day)).size;
}

/** Flexible weekly occurrences share one quota and require full rest days. */
export function weeklyAvailability(ex: { id: string; occurrences: number; gap_days: number }, records: { exercise_id: string; day: string; status: string }[], today: Date) {
  const key = dayKey(today);
  const start = dayKey(currentWeek(today)[0] ?? today);
  const mine = completedRecords(records).filter((r) => r.exercise_id === ex.id);
  const count = mine.filter((r) => r.day >= start && r.day <= key).length;
  const last = mine.filter((r) => r.day < key).map((r) => r.day).sort().at(-1);
  const gap = gapDaysRemaining(last, ex.gap_days, key);
  return { count, gap, available: gap === 0 && (mine.some((r) => r.day === key) || count < ex.occurrences) };
}

export function monthWeeks(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const weeks: Date[][] = [];
  for (let offset = 0; ; offset++) {
    const week = weekAt(offset, first);
    if ((week[0] ?? first) > last) break;
    weeks.push(week);
  }
  return weeks;
}

export function ordinal(n: number) {
  const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${suffix}`;
}

export function weekRange(days: Date[]) {
  const first = days[0];
  const last = days.at(-1);
  if (!first || !last) return "";
  const format = (d: Date) => `${d.toLocaleDateString("en-US", { month: "long" })} ${ordinal(d.getDate())}${first.getFullYear() !== last.getFullYear() ? `, ${d.getFullYear()}` : ""}`;
  return `${format(first)} - ${format(last)}`;
}

export function historyPeriod(days: Date[], joinedAt: string, activityDays: string[], today: Date) {
  const first = dayKey(days[0] ?? today);
  const last = dayKey(days.at(-1) ?? today);
  const key = dayKey(today);
  const joined = dayKey(new Date(joinedAt));
  return {
    temporal: last < key ? "Past" : first > key ? "Upcoming" : "This week",
    empty: last < joined ? "No Data Available" : first > key ? null : activityDays.some((d) => d >= first && d <= last) ? null : "No Action Taken",
  };
}

/** Milliseconds left before the next daily occurrence may be checked off. */
export function cooldownRemainingMs(lastCompletedAt: string | undefined, cooldownMinutes: number, now = new Date()) {
  if (!lastCompletedAt || cooldownMinutes <= 0) return 0;
  const ready = new Date(lastCompletedAt).getTime() + cooldownMinutes * 60_000;
  return Math.max(0, ready - now.getTime());
}

function dayNumber(key: string) {
  const [y = 0, m = 1, d = 1] = key.split("-").map(Number);
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
