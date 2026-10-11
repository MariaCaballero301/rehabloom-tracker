import { describe, expect, it } from "vitest";
import { shouldPlaySound, soundForElement, type Sound } from "@/lib/sounds";

describe("Interaction sound selection", () => {
  it("uses a tap for ordinary interactive controls", () => { expect(soundForElement({ interactive: true })).toBe("tap"); });
  it("uses pop for bubble controls instead of tap", () => { expect(soundForElement({ interactive: true, bubble: true })).toBe("pop"); });
  it("uses only success when overridden", () => { expect(soundForElement({ interactive: true, bubble: true, override: "success" })).toBe("success"); });
  it("allows ordinary controls to request pop", () => { expect(soundForElement({ interactive: true, override: "pop" })).toBe("pop"); });
  it("never sounds for disabled elements even with overrides", () => { expect(soundForElement({ disabled: true, override: "success", bubble: true })).toBeNull(); });
  it("respects explicit silence", () => { expect(soundForElement({ interactive: true, bubble: true, override: "none" })).toBeNull(); });
  it("ignores noninteractive content", () => { expect(soundForElement({})).toBeNull(); });
});

describe("Sound overlap", () => {
  const recent = new Map<Sound, number>([["pop", 1000]]);
  it("lets a different sound play on top of a recent one", () => {
    expect(shouldPlaySound("success", 1010, recent)).toBe(true);
    expect(shouldPlaySound("swim", 1001, recent)).toBe(true);
  });
  it("drops only an exact repeat of the same sound", () => {
    expect(shouldPlaySound("pop", 1030, recent)).toBe(false);
    expect(shouldPlaySound("pop", 1070, recent)).toBe(true);
  });
  it("plays the first sound of a kind with no history", () => {
    expect(shouldPlaySound("tap", 5000, new Map())).toBe(true);
  });
});