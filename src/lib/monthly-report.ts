// Pure helpers for the Gemini monthly summary. Only anonymous numbers ever leave the app.
import { dayKey, scheduledCount } from "@/lib/rehab";
import { summaryRange, type SummaryPeriod } from "@/lib/summary-period";

export const GEMINI_MODEL = "gemini-3.5-flash-lite";

type Ex = { created_at: string; frequency: string; occurrences: number; days: number[]; weekly_mode?: string };
type Co = { day: string; status: string };
type Ci = { day: string; pain: number; motivation: number; status: string };

export type MonthStats = {
  reportPeriod?: SummaryPeriod; periodStart?: string; periodEnd?: string;
  month: string; daysInPeriod: number; scheduledExercises: number; completedExercises: number; skippedExercises: number;
  completionRatePct: number | null; daysWithAllDone: number; checkinDays: number; daysWithoutCheckin: number;
  restDays: number; unableDays: number; avgPain: number | null; minPain: number | null; maxPain: number | null;
  firstHalfAvgPain: number | null; secondHalfAvgPain: number | null; avgMotivation: number | null;
  sessionsTogetherScheduled: number; sessionsTogetherStillAwaitingReply: number;
};

const avg = (a: number[]) => (a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null);

/** month = "YYYY-MM". Counts only up to today for the current month. */
export function monthStats(month: string, exercises: Ex[], completions: Co[], checkins: Ci[], sessions: { status: string }[], today = new Date()): MonthStats {
  return periodStats("monthly", month, exercises, completions, checkins, sessions, today);
}

export function periodStats(period: SummaryPeriod, date: string, exercises: Ex[], completions: Co[], checkins: Ci[], sessions: { status: string }[], today = new Date()): MonthStats {
  const range = summaryRange(period, date);
  const start = new Date(`${range.from}T12:00:00`);
  const end = new Date(`${range.to}T12:00:00`);
  const days: Date[] = [];
  const periodDays: string[] = [];
  for (const dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
    periodDays.push(dayKey(dt));
    if (dayKey(dt) <= dayKey(today)) days.push(new Date(dt));
  }
  const keys = new Set(days.map(dayKey));
  let scheduled = 0, allDone = 0;
  for (const d of days) {
    const k = dayKey(d);
    const s = exercises.filter((e) => dayKey(new Date(e.created_at)) <= k).reduce((n, e) => n + scheduledCount(e, d), 0);
    scheduled += s;
    if (s && completions.filter((c) => c.day === k && c.status === "complete").length >= s) allDone++;
  }
  const co = completions.filter((c) => keys.has(c.day));
  const ci = checkins.filter((c) => keys.has(c.day));
  const normal = ci.filter((c) => c.status === "normal");
  const firstHalf = new Set(periodDays.slice(0, Math.ceil(periodDays.length / 2)));
  const done = co.filter((c) => c.status === "complete").length;
  return {
    month: range.from.slice(0, 7), reportPeriod: period, periodStart: range.from, periodEnd: range.to,
    daysInPeriod: days.length, scheduledExercises: scheduled, completedExercises: done,
    skippedExercises: co.filter((c) => c.status === "skip").length,
    completionRatePct: scheduled ? Math.min(100, Math.round((done / scheduled) * 100)) : null,
    daysWithAllDone: allDone, checkinDays: ci.length, daysWithoutCheckin: days.length - ci.length,
    restDays: ci.filter((c) => c.status === "rest").length, unableDays: ci.filter((c) => c.status === "unable").length,
    avgPain: avg(normal.map((c) => c.pain)),
    minPain: normal.length ? Math.min(...normal.map((c) => c.pain)) : null,
    maxPain: normal.length ? Math.max(...normal.map((c) => c.pain)) : null,
    firstHalfAvgPain: avg(normal.filter((c) => firstHalf.has(c.day)).map((c) => c.pain)),
    secondHalfAvgPain: avg(normal.filter((c) => !firstHalf.has(c.day)).map((c) => c.pain)),
    avgMotivation: avg(normal.map((c) => c.motivation)),
    sessionsTogetherScheduled: sessions.filter((s) => s.status === "accepted" || s.status === "completed").length,
    sessionsTogetherStillAwaitingReply: sessions.filter((s) => s.status === "proposed").length,
  };
}

/** Clearly fictional demo month for presentations. */
export function demoStats(month: string): MonthStats {
  return {
    month, daysInPeriod: 30, scheduledExercises: 90, completedExercises: 71, skippedExercises: 6, completionRatePct: 79,
    daysWithAllDone: 19, checkinDays: 24, daysWithoutCheckin: 6, restDays: 3, unableDays: 1, avgPain: 3.4, minPain: 1,
    maxPain: 6, firstHalfAvgPain: 4.1, secondHalfAvgPain: 2.8, avgMotivation: 3.9, sessionsTogetherScheduled: 2, sessionsTogetherStillAwaitingReply: 1,
  };
}

export function demoPeriodStats(period: SummaryPeriod, date: string): MonthStats {
  const range = summaryRange(period, date);
  const base = demoStats(range.from.slice(0, 7));
  if (period === "weekly") Object.assign(base, {
    daysInPeriod: 7, scheduledExercises: 21, completedExercises: 17, skippedExercises: 2, completionRatePct: 81,
    daysWithAllDone: 4, checkinDays: 6, daysWithoutCheckin: 1, restDays: 1, unableDays: 0,
    sessionsTogetherScheduled: 1, sessionsTogetherStillAwaitingReply: 0,
  });
  return { ...base, reportPeriod: period, periodStart: range.from, periodEnd: range.to };
}

export function buildPrompt(s: MonthStats) {
  return [
    "You write a short self-reported progress summary a patient can bring to their physical therapist.",
    `Summarize the ${s.reportPeriod ?? "monthly"} reporting period only.`,
    "Write ONE paragraph of 80-120 words in plain, professional, objective, nonjudgmental English, in second person (\"you\").",
    "Use ONLY the numbers below. Do not invent, round differently, or estimate any statistic.",
    "Do not diagnose, do not interpret causes, and do not recommend any change to exercises or treatment.",
    "If a value is null or a count is low, say plainly that the data is missing or limited.",
    "Pain is self-reported on a 0-10 scale; motivation on a 1-5 scale. 'Sessions together' are exercise sessions planned with a support person; 'Scheduled' and 'StillAwaitingReply' are separate, non-overlapping counts.",
    "End by suggesting the patient discuss these self-reported figures with their physical therapist.",
    "Data (JSON):",
    JSON.stringify(s),
  ].join("\n");
}

export function wordCount(t: string) { return t.trim().split(/\s+/).filter(Boolean).length; }
