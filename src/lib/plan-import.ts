import { z } from "zod";

export const DEMO_PT_NOTE = "Knee Rehab Phase 1: Heel slides 3x10 twice daily, Talon rotations 3x10 3x daily";
export const MAX_PLAN_BYTES = 20 * 1024 * 1024;
export const PLAN_MIMES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
export const extractedExerciseSchema = z.object({
  name: z.string().trim().min(1).max(200),
  sets: z.string().max(200), reps: z.string().max(200),
  frequency: z.string().max(500), notes: z.string().max(2000),
});
export const extractedPlanSchema = z.array(extractedExerciseSchema).max(50);
export type ImportedExercise = z.infer<typeof extractedExerciseSchema>;
export type ImportSchedule = { frequency: "daily" | "weekly"; occurrences: number; days: number[] };

const DAY_WORDS: Record<string, number> = { sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3, thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6 };

/** Map only explicit schedules: N times daily (1–3) or a plain list of weekdays. Anything else must be reviewed. */
export function inferImportSchedule(frequency: string): ImportSchedule | null {
  const text = frequency.trim().toLowerCase().replace(/[.;]+$/, "");
  if (!text) return null;
  const tokens = text.replace(/\b(?:every|each|on|and)\b/g, " ").split(/[\s,/&+-]+/).filter(Boolean);
  if (tokens.length && tokens.every((t) => t in DAY_WORDS)) {
    const days = [...new Set(tokens.map((t) => DAY_WORDS[t]))].sort((a, b) => a - b);
    return days.length === 7 ? { frequency: "daily", occurrences: 1, days: [0, 1, 2, 3, 4, 5, 6] } : { frequency: "weekly", occurrences: 1, days };
  }
  const per = "(?:daily|a day|per day|each day|every day)";
  let occurrences: number | undefined;
  if (new RegExp(`\\btwice\\s+${per}`).test(text)) occurrences = 2;
  else if (new RegExp(`\\b(?:three times|thrice)\\s+${per}`).test(text)) occurrences = 3;
  else if (new RegExp(`\\b(?:two times)\\s+${per}`).test(text)) occurrences = 2;
  else {
    const match = text.match(new RegExp(`\\b(\\d+)\\s*(?:x|×|times)?\\s*${per}`));
    if (match) occurrences = Number(match[1]);
    else if (/^(?:once daily|daily|every day|each day|once a day|once per day|once each day)$/.test(text)) occurrences = 1;
  }
  // Only 1–3 times per day, matching the normal Add exercise form.
  if (!occurrences || occurrences > 3) return null;
  // Do not erase prescribed spacing or day restrictions when auto-mapping.
  if (/\b(?:apart|hours?|minutes?|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|rest|other)\b/.test(text)) return null;
  return { frequency: "daily", occurrences, days: [0, 1, 2, 3, 4, 5, 6] };
}

export function importedExercisePayload(exercise: ImportedExercise, schedule: ImportSchedule) {
  extractedExerciseSchema.parse(exercise);
  if (!Number.isInteger(schedule.occurrences) || schedule.occurrences < 1 || schedule.occurrences > 10) throw new Error("Choose 1–10 daily occurrences.");
  if (schedule.frequency === "weekly" && (!schedule.days.length || schedule.days.some((d) => !Number.isInteger(d) || d < 0 || d > 6))) throw new Error("Choose the prescribed weekdays.");
  return {
    name: exercise.name,
    reps: [exercise.sets ? `${exercise.sets} sets` : "", exercise.reps ? `${exercise.reps} reps` : ""].filter(Boolean).join(" × "),
    notes: [exercise.frequency ? `Prescribed frequency: ${exercise.frequency}` : "", exercise.notes].filter(Boolean).join("\n"),
    frequency: schedule.frequency, occurrences: schedule.frequency === "daily" ? schedule.occurrences : 1,
    days: schedule.frequency === "daily" ? [0, 1, 2, 3, 4, 5, 6] : schedule.days,
    weekly_mode: "days", cooldown_minutes: 0, gap_days: 0,
  };
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Human-readable schedule line, e.g. "2× daily" or "Mon, Wed, Fri". */
export function scheduleLabel(s: ImportSchedule) {
  return s.frequency === "daily" ? `${s.occurrences}× daily` : s.days.map((d) => WEEKDAYS[d]).join(", ");
}

/** A picked schedule is complete once daily has 1–3 times or weekly has at least one weekday; no defaults. */
export function pickedSchedule(pick: { frequency?: "daily" | "weekly"; occurrences?: number; days: number[] }): ImportSchedule | null {
  if (pick.frequency === "daily" && pick.occurrences && pick.occurrences >= 1 && pick.occurrences <= 3) return { frequency: "daily", occurrences: pick.occurrences, days: [0, 1, 2, 3, 4, 5, 6] };
  if (pick.frequency === "weekly" && pick.days.length) return { frequency: "weekly", occurrences: 1, days: [...pick.days].sort() };
  return null;
}

/** Why "Confirm & Add to Schedule" is disabled, or null when it can be used. */
export function confirmDisabledReason(rows: { selected: boolean; schedule: ImportSchedule | null; name?: string }[], reviewed: boolean) {
  const selected = rows.filter((r) => r.selected);
  if (!selected.length) return "Select at least one exercise.";
  if (selected.some((r) => r.name !== undefined && !r.name.trim())) return "Give every selected exercise a name.";
  const missing = selected.filter((r) => !r.schedule).length;
  if (missing) return `Set how often for ${missing} exercise${missing === 1 ? "" : "s"}, or unselect ${missing === 1 ? "it" : "them"}.`;
  if (!reviewed) return "Tick the confirmation box first.";
  return null;
}

/** A review card is ready once it has a name and a complete schedule. */
export function isReadyToAdd(row: { name: string; schedule: ImportSchedule | null }) {
  return !!row.name.trim() && !!row.schedule;
}
