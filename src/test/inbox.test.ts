import { describe, expect, it } from "vitest";
import { conversationFilter, mergeInboxMessages, unreadInboxCount, type InboxMessage } from "@/lib/inbox";
const message = (id: string, from: string, to: string, created_at: string): InboxMessage => ({ id, from_user: from, to_user: to, created_at, from_name: from, message: id, read_at: null });
describe("Inbox", () => {
  it("counts only unread incoming messages and pending incoming requests", () => {
    expect(unreadInboxCount([
      { to_user: "me", read_at: null }, { to_user: "other", read_at: null }, { to_user: "me", read_at: "read" },
    ], [
      { to_user: "me", status: "pending", read_at: null }, { to_user: "me", status: "accepted", read_at: null }, { to_user: "other", status: "pending", read_at: null },
    ], "me")).toBe(2);
  });
  it("merges both directions chronologically without duplicates", () => {
    const one = message("1", "me", "maria", "2026-10-09T10:00:00Z");
    const two = message("2", "maria", "me", "2026-10-10T10:00:00Z");
    expect(mergeInboxMessages([two, one], [{ ...two, read_at: "read" }]).map((m) => [m.id, m.read_at])).toEqual([["1", null], ["2", "read"]]);
  });
  it("queries only the two participants in either direction", () => {
    expect(conversationFilter("me", "maria")).toBe("and(from_user.eq.me,to_user.eq.maria),and(from_user.eq.maria,to_user.eq.me)");
  });
});