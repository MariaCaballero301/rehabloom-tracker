import { describe, it, expect } from "vitest";
import { computeXp, stageFor } from "@/lib/rehab";

describe("rehab rules", () => {
  it("awards 10 XP per exercise and 5 per check-in", () => {
    expect(computeXp(3, 2)).toBe(40);
  });
  it("plant stages unlock at 0, 50, 150, 300 XP", () => {
    expect(stageFor(49).index).toBe(0);
    expect(stageFor(50).index).toBe(1);
    expect(stageFor(150).index).toBe(2);
    expect(stageFor(300).index).toBe(3);
    expect(stageFor(1000).nextAt).toBeNull();
  });
});
