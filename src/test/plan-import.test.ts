import { describe, expect, it } from "vitest";
import { importedExercisePayload, inferImportSchedule, sharedImportSchedule } from "@/lib/plan-import";
import { confirmDisabledReason, pickedSchedule } from "@/lib/plan-import";
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
describe("confirmDisabledReason", () => {
  const daily = { frequency: "daily" as const, occurrences: 2, days: [0, 1, 2, 3, 4, 5, 6] };
  it("asks to set how often for unscheduled selected exercises", () => {
    expect(confirmDisabledReason([{ selected: true, schedule: null }, { selected: true, schedule: null }], true)).toBe("Set how often for 2 exercises, or unselect them.");
    expect(confirmDisabledReason([{ selected: true, schedule: null }, { selected: false, schedule: null }], true)).toBe("Set how often for 1 exercise, or unselect it.");
  });
  it("asks to tick the box once schedules are set, and allows confirming after", () => {
    expect(confirmDisabledReason([{ selected: true, schedule: daily }], false)).toBe("Tick the confirmation box first.");
    expect(confirmDisabledReason([{ selected: true, schedule: daily }], true)).toBeNull();
  });
  it("has no default picked schedule", () => {
    expect(pickedSchedule({ days: [] })).toBeNull();
    expect(pickedSchedule({ frequency: "daily", days: [] })).toBeNull();
    expect(pickedSchedule({ frequency: "weekly", days: [3, 1] })?.days).toEqual([1, 3]);
  });
});

import { isReadyToAdd } from "@/lib/plan-import";
describe("clear schedules from documents", () => {
  it("shares three daily targets across five exercises without erasing exceptions", () => {
    const daily = inferImportSchedule("3 times each day");
    expect(sharedImportSchedule(Array.from({ length: 5 }, () => daily))?.occurrences).toBe(3);
    expect(sharedImportSchedule([daily, inferImportSchedule("twice daily")])).toBeNull();
    expect(sharedImportSchedule([daily, null])).toBeNull();
    expect(sharedImportSchedule([])).toBeNull();
  });
  it("allows direct confirmation of selected exercises with explicit schedules", () => {
    expect(confirmDisabledReason(Array.from({ length: 5 }, () => ({ selected: true, name: "Quad Setting", schedule: inferImportSchedule("3 times each day") })))).toBeNull();
  });
  it("never fills an unspecified hold duration or omitted repetitions", () => {
    const payload = importedExercisePayload({ name: "Quad Setting", sets: "", reps: "", frequency: "3 times each day", notes: "Hold for _____ seconds." }, { frequency: "daily", occurrences: 3, days: [] });
    expect(payload.reps).toBe("");
    expect(payload.notes).toBe("Prescribed frequency: 3 times each day\nHold for _____ seconds.");
  });
  it("maps 3 times each day, daily and Mon/Wed/Fri", () => {
    expect(inferImportSchedule("3 times each day")).toMatchObject({ frequency: "daily", occurrences: 3 });
    expect(inferImportSchedule("Daily")).toMatchObject({ frequency: "daily", occurrences: 1 });
    expect(inferImportSchedule("Mon/Wed/Fri")).toEqual({ frequency: "weekly", occurrences: 1, days: [1, 3, 5] });
    expect(inferImportSchedule("5 times daily")).toBeNull();
  });
  it("is ready only with a name and schedule", () => {
    expect(isReadyToAdd({ name: "Quad Sets", schedule: { frequency: "daily", occurrences: 1, days: [0,1,2,3,4,5,6] } })).toBe(true);
    expect(isReadyToAdd({ name: " ", schedule: { frequency: "daily", occurrences: 1, days: [0,1,2,3,4,5,6] } })).toBe(false);
    expect(isReadyToAdd({ name: "Quad Sets", schedule: null })).toBe(false);
  });
});
