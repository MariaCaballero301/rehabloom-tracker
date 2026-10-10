import { describe, expect, it } from "vitest";
import { supportGroups } from "@/lib/support-groups";

describe("Your people grouping", () => {
  it("keeps only contacts without accounts in Family & friends", () => {
    const result = supportGroups([{ connected_user_id: null }, { connected_user_id: "maria" }], []);
    expect(result.familyFriends).toEqual([{ connected_user_id: null }]);
    expect(result.buddyContacts).toEqual([{ connected_user_id: "maria" }]);
  });
  it("shows each buddy account once across both support directions", () => {
    const result = supportGroups([{ connected_user_id: "maria" }, { connected_user_id: "maria" }], [{ user_id: "maria" }, { user_id: "alex" }, { user_id: "alex" }]);
    expect(result.buddyContacts).toEqual([{ connected_user_id: "maria" }]);
    expect(result.supportingOnly).toEqual([{ user_id: "alex" }]);
  });
});