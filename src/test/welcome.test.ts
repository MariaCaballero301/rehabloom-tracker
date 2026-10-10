import { describe, expect, it } from "vitest";
import { buildWelcomeMessage, canSendWelcome, welcomeToast } from "@/lib/welcome";

describe("welcome SMS", () => {
  it("builds the exact message", () => {
    expect(buildWelcomeMessage("Ana", "Jaiden")).toBe(
      "Hi Ana! Jaiden added you to their support network on Rehabloom 🌱 If they miss their rehab sessions for a couple of days, we'll text you so you can check in. Reply STOP to opt out.",
    );
  });
  it("allows at most 5 per day", () => {
    const now = new Date("2026-10-10T20:00:00Z");
    const recent = Array.from({ length: 4 }, () => "2026-10-10T10:00:00Z");
    expect(canSendWelcome(recent, now)).toBe(true);
    expect(canSendWelcome([...recent, "2026-10-10T19:00:00Z"], now)).toBe(false);
    expect(canSendWelcome([...recent, "2026-10-08T19:00:00Z", null], now)).toBe(true);
  });
  it("toast text", () => {
    expect(welcomeToast("Ana", "sent")).toBe("We sent Ana a welcome text");
    expect(welcomeToast("Ana", "simulated")).toBe("Ana will get a welcome text");
  });
});
