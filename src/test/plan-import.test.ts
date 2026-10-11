import { describe, expect, it } from "vitest";
import { importedExercisePayload, inferImportSchedule } from "@/lib/plan-import";
import { scheduledCount } from "@/lib/rehab";

describe("prescription import", () => {
  it("maps heel slides twice daily to two daily targets", () => {
    const schedule = inferImportSchedule("twice daily");
    expect(schedule?.occurrences).toBe(2);
    if (!schedule) throw new Error("Missing schedule");
    const payload = importedExercisePayload({ name: "Heel slides", sets: "3", reps: "10", frequency: "twice daily", notes: "" }, schedule);
    expect(payload.reps).toBe("3 sets × 10 reps");
    expect(scheduledCount(payload, new Date(2026, 9, 11))).toBe(2);
  });
  it("maps Talon rotations 3x daily to three targets", () => {
    expect(inferImportSchedule("3x daily")?.occurrences).toBe(3);
  });
  it("never guesses an unspecified, interval or restricted schedule", () => {
    for (const text of ["", "as needed", "3x weekly", "twice daily 4 hours apart", "twice daily Monday to Friday"]) expect(inferImportSchedule(text)).toBeNull();
  });
  it("preserves missing sets and the exact therapist note", () => {
    const payload = importedExercisePayload({ name: "Talon rotations", sets: "", reps: "10", frequency: "3x daily", notes: "Do not force movement." }, { frequency: "daily", occurrences: 3, days: [] });
    expect(payload.reps).toBe("10 reps");
    expect(payload.notes).toBe("Prescribed frequency: 3x daily\nDo not force movement.");
  });
  it("rejects a weekly schedule without prescribed weekdays", () => {
    expect(() => importedExercisePayload({ name: "Heel slides", sets: "3", reps: "10", frequency: "", notes: "" }, { frequency: "weekly", occurrences: 1, days: [] })).toThrow("Choose the prescribed weekdays.");
  });
});