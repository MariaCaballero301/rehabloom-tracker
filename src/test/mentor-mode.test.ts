import { describe, expect, it } from "vitest";
import { BACK_IN_REHAB, finishedTherapyIds, withoutMentors } from "@/lib/mentor-mode";

describe("mentor mode", () => {
  it("skips patients who finished therapy in the missed-session job", () => {
    const finished = finishedTherapyIds([
      { user_id: "a", finished_therapy: true },
      { user_id: "b", finished_therapy: false },
    ]);
    const result = withoutMentors(new Map([["a", 1], ["b", 2], ["c", 3]]), finished);
    expect([...result.keys()]).toEqual(["b", "c"]);
  });

  it("switching back clears both finished_therapy and is_mentor", () => {
    expect(BACK_IN_REHAB).toEqual({ finished_therapy: false, is_mentor: false });
  });
});
