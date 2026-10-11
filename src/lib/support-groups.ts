/** Presentation grouping only; keep relationship records and permissions unchanged. */
export type GroupKey = "buddies" | "familyFriends" | "mentors";

export function groupForKind(kind: string): GroupKey | null {
  if (kind === "buddy") return "buddies";
  if (kind === "family" || kind === "friend") return "familyFriends";
  if (kind === "mentor") return "mentors";
  return null;
}

/** Label for someone I support (from people_i_support), keyed by my role for them. */
export function supportingLabel(kind: string): string {
  if (kind === "mentor") return "You're their mentor";
  if (kind === "family") return "You're in their family circle";
  if (kind === "friend") return "You're in their friend circle";
  return "Rehab buddy";
}

type Group<C, S> = { contacts: C[]; supporting: S[] };

export function supportGroups<
  C extends { connected_user_id: string | null; kind: string },
  S extends { user_id: string; kind: string },
>(contacts: C[], supporting: S[]): Record<GroupKey, Group<C, S>> {
  const groups: Record<GroupKey, Group<C, S>> = {
    buddies: { contacts: [], supporting: [] },
    familyFriends: { contacts: [], supporting: [] },
    mentors: { contacts: [], supporting: [] },
  };
  const seen: Record<GroupKey, Set<string>> = { buddies: new Set(), familyFriends: new Set(), mentors: new Set() };
  for (const c of contacts) {
    const key = groupForKind(c.kind);
    if (!key) continue;
    if (c.connected_user_id) {
      if (seen[key].has(c.connected_user_id)) continue;
      seen[key].add(c.connected_user_id);
    }
    groups[key].contacts.push(c);
  }
  for (const s of supporting) {
    const key = groupForKind(s.kind);
    if (!key || seen[key].has(s.user_id)) continue;
    seen[key].add(s.user_id);
    groups[key].supporting.push(s);
  }
  return groups;
}
