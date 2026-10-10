import { describe, expect, it } from "vitest";
import { xpBadgeText } from "@/lib/xp-message";

describe("xpBadgeText", () => {
  it("shows only the amount when a sentence follows it", () => {
    expect(xpBadgeText("+10 XP — nice work!")).toBe("+10 XP");
  });

  it("shows only the amount when a sentence precedes it", () => {
    expect(xpBadgeText("Checked in — +5 XP")).toBe("+5 XP");
  });

  it("drops names and emoji from cheer messages", () => {
    expect(xpBadgeText("Sent to maria 💌 +2 XP")).toBe("+2 XP");
    expect(xpBadgeText("Message sent · +2 XP")).toBe("+2 XP");
  });

  it("keeps a message that has no XP amount", () => {
    expect(xpBadgeText("  Well done  ")).toBe("Well done");
  });
});
