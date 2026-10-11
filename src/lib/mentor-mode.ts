// Mentor mode: people who finished therapy (network_profiles.finished_therapy).

/** IDs of people in mentor mode; they never trigger missed-session alerts. */
export function finishedTherapyIds(profiles: { user_id: string; finished_therapy?: boolean | null }[]) {
  return new Set(profiles.filter((p) => p.finished_therapy === true).map((p) => p.user_id));
}

/** Drops patients in mentor mode from the missed-session job. */
export function withoutMentors<T>(byPatient: Map<string, T>, finished: ReadonlySet<string>) {
  return new Map([...byPatient].filter(([id]) => !finished.has(id)));
}

/** Values written when someone switches from mentor mode back to rehab. */
export const BACK_IN_REHAB = { finished_therapy: false, is_mentor: false } as const;

/** True for calendar days after the recovery date (maintenance only, never "missed"). */
export function isAfterRecovery(day: string, finishedDay: string | null | undefined) {
  return !!finishedDay && day > finishedDay;
}

/** Whole-journey totals, from the first record up to and including the recovery day. */
export function journeyTotals(
  completions: { day: string; status: string }[],
  checkins: { day: string }[],
  finishedDay: string,
) {
  const done = completions.filter((c) => c.status === "complete" && c.day <= finishedDay);
  const active = new Set([...done.map((c) => c.day), ...checkins.filter((c) => c.day <= finishedDay).map((c) => c.day)]);
  const days = [...new Set(done.map((c) => c.day))].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of days) {
    const next = prev ? new Date(`${prev}T12:00:00`) : null;
    next?.setDate(next.getDate() + 1);
    run = next && next.toISOString().slice(0, 10) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  const first = [...active].sort()[0] ?? finishedDay;
  return { daysActive: active.size, exercisesCompleted: done.length, bestStreak: best, firstDay: first };
}

/** Recovery story range: account creation (or first completion, if earlier) → finished day; never a single day. */
export function recoveryRange(joinedDay: string, completions: { day: string; status: string }[], finishedDay: string) {
  const first = completions.filter((c) => c.status === "complete").map((c) => c.day).sort()[0];
  let from = first && first < joinedDay ? first : joinedDay;
  if (from >= finishedDay) {
    const d = new Date(`${finishedDay}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    from = d.toISOString().slice(0, 10);
  }
  return { from, to: finishedDay };
}

/** "1 person", "2 people", "1 session"… */
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
