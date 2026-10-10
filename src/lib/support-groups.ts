/** Presentation grouping only; keep relationship records and permissions unchanged. */
export function supportGroups<C extends { connected_user_id: string | null }, S extends { user_id: string }>(contacts: C[], supporting: S[]) {
  const familyFriends = contacts.filter((contact) => !contact.connected_user_id);
  const accounts = new Map<string, C>();
  for (const contact of contacts) {
    if (contact.connected_user_id && !accounts.has(contact.connected_user_id)) {
      accounts.set(contact.connected_user_id, contact);
    }
  }
  const remaining = new Map<string, S>();
  for (const person of supporting) {
    if (!accounts.has(person.user_id)) remaining.set(person.user_id, person);
  }
  return { familyFriends, buddyContacts: [...accounts.values()], supportingOnly: [...remaining.values()] };
}