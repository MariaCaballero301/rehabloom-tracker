import { describe, expect, it } from "vitest";
import { supportGroups, supportingLabel } from "@/lib/support-groups";

describe("Your people grouping", () => {
  it("groups family and friends together, with or without an account", () => {
    const g = supportGroups(
      [
        { connected_user_id: null, kind: "family" },
        { connected_user_id: "ana", kind: "friend" },
        { connected_user_id: "maria", kind: "buddy" },
        { connected_user_id: "leo", kind: "mentor" },
      ],
      [],
    );
    expect(g.familyFriends.contacts.map((c) => c.connected_user_id)).toEqual([null, "ana"]);
    expect(g.buddies.contacts.map((c) => c.connected_user_id)).toEqual(["maria"]);
    expect(g.mentors.contacts.map((c) => c.connected_user_id)).toEqual(["leo"]);
  });
  it("places people I support in the group matching their kind", () => {
    const g = supportGroups([], [
      { user_id: "a", kind: "family" },
      { user_id: "b", kind: "buddy" },
      { user_id: "c", kind: "mentor" },
    ]);
    expect(g.familyFriends.supporting.map((s) => s.user_id)).toEqual(["a"]);
    expect(g.buddies.supporting.map((s) => s.user_id)).toEqual(["b"]);
    expect(g.mentors.supporting.map((s) => s.user_id)).toEqual(["c"]);
  });
  it("shows a buddy account once across both support directions", () => {
    const g = supportGroups(
      [{ connected_user_id: "maria", kind: "buddy" }, { connected_user_id: "maria", kind: "buddy" }],
      [{ user_id: "maria", kind: "buddy" }, { user_id: "alex", kind: "buddy" }, { user_id: "alex", kind: "buddy" }],
    );
    expect(g.buddies.contacts).toHaveLength(1);
    expect(g.buddies.supporting.map((s) => s.user_id)).toEqual(["alex"]);
  });
  it("labels my role for people I support", () => {
    expect(supportingLabel("mentor")).toBe("You're their mentor");
    expect(supportingLabel("family")).toBe("You're in their family circle");
    expect(supportingLabel("friend")).toBe("You're in their friend circle");
  });
});
