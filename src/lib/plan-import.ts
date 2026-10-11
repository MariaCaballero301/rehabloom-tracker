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

/** Only map explicit daily instructions; ambiguous weekly quotas must be reviewed. */
export function inferImportSchedule(frequency: string): ImportSchedule | null {
  const text = frequency.trim().toLowerCase();
  let occurrences: number | undefined;
  if (/\btwice\s+(?:a\s+day|daily|per\s+day)\b/.test(text)) occurrences = 2;
  else if (/\b(?:three times|thrice)\s+(?:daily|a day|per day)\b/.test(text)) occurrences = 3;
  else {
    const match = text.match(/\b(\d+)\s*(?:x|×|times)?\s*(?:daily|per day|a day)\b/);
    if (match) occurrences = Number(match[1]);
    else if (/^(?:once daily|daily|every day|once a day|once per day)$/.test(text)) occurrences = 1;
  }
  if (!occurrences || occurrences > 10) return null;
  // Do not erase prescribed spacing or day restrictions when auto-mapping.
  if (/\b(?:apart|hours?|minutes?|week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|rest)\b/.test(text)) return null;
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