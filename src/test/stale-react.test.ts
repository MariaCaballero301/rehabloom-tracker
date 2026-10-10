import { describe, expect, it } from "vitest";
import { hasMixedReactVersions } from "@/lib/stale-react";

describe("stale React dependency graph", () => {
  it("detects the reported old renderer and new React versions", () => {
    expect(hasMixedReactVersions([
      "/node_modules/.vite/deps/react.js?v=5adce075",
      "/node_modules/.vite/deps/react-dom_client.js?v=b2ef8108",
    ])).toBe(true);
  });
  it("allows matching React and renderer versions", () => {
    expect(hasMixedReactVersions([
      "/node_modules/.vite/deps/react.js?v=5adce075",
      "/node_modules/.vite/deps/react-dom_client.js?v=5adce075",
      "/src/routes/support.tsx?tsr-split=component",
    ])).toBe(false);
  });
});