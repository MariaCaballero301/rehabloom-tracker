import { describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/components/XpFish", () => ({ celebrateXp: () => {} }));
import { uncelebratedCompletions } from "@/lib/session-celebrations";

const now = new Date("2026-10-11T12:00:00Z");
const row = (id: string, by: string | null, hoursAgo: number, status = "completed") => ({ id, status, completed_by: by, completed_at: new Date(now.getTime() - hoursAgo * 3600_000).toISOString() });

describe("uncelebratedCompletions", () => {
  it("returns only the other person's completions from the last 24 h not yet celebrated", () => {
    const rows = [row("a", "other", 1), row("b", "me", 1), row("c", "other", 25), row("d", "other", 2), row("e", "other", 1, "accepted")];
    expect(uncelebratedCompletions(rows, "me", new Set(["d"]), now).map((r) => r.id)).toEqual(["a"]);
  });
});
