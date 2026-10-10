// Pure weekly summary built only from the user's own records. Never medical advice.
import { dayKey, lastNDays, scheduledCount, XP_PER_CHECKIN, XP_PER_EXERCISE } from "@/lib/rehab";

type Ex = { created_at: string; frequency: string; occurrences: number; days: number[]; weekly_mode?: string };
type Co = { day: string };
type Ci = { day: string; pain: number; status: string };

export function weeklyReport(exercises: Ex[], completions: Co[], checkins: Ci[], today = new Date()) {
  const days = lastNDays(7, today);
  const keys = days.map(dayKey);
  let scheduled = 0, done = 0, targetsMet = 0, targetDays = 0;
  const perDay: { key: string; label: string; done: number; scheduled: number }[] = [];
  for (const d of days) {
    const k = dayKey(d);
    const s = exercises.filter((e) => dayKey(new Date(e.created_at)) <= k).reduce((n, e) => n + scheduledCount(e, d), 0);
    const c = completions.filter((x) => x.day === k).length;
    scheduled += s; done += Math.min(c, s || c);
    if (s) { targetDays++; if (c >= s) targetsMet++; }
    perDay.push({ key: k, label: d.toLocaleDateString("en-US", { weekday: "long" }), done: c, scheduled: s });
  }
  const weekCheckins = checkins.filter((c) => keys.includes(c.day)).sort((a, b) => a.day.localeCompare(b.day));
  const pains = weekCheckins.filter((c) => c.status === "normal");
  let streak = 0;
  for (const k of [...keys].reverse()) {
    const active = completions.some((c) => c.day === k) || checkins.some((c) => c.day === k);
    if (active) streak++; else if (k !== dayKey(today)) break;
  }
  return {
    adherence: scheduled ? Math.round((done / scheduled) * 100) : null,
    targetsMet, targetDays,
    fullDays: perDay.filter((d) => d.scheduled > 0 && d.done >= d.scheduled).map((d) => d.label),
    xp: completions.filter((c) => keys.includes(c.day)).length * XP_PER_EXERCISE + weekCheckins.length * XP_PER_CHECKIN,
    streak,
    painFirst: pains[0] ?? null,
    painLast: pains.length > 1 ? pains[pains.length - 1]! : null,
    restDays: weekCheckins.filter((c) => c.status !== "normal").length,
  };
}
