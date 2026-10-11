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
