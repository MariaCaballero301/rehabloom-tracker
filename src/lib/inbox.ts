export const INBOX_PAGE_SIZE = 50;
export const INBOX_QUICK_MESSAGES = ["How's your therapy going today? 🌱", "Cheering you on! 🎊"];
export type InboxMessage = { id: string; from_user: string; to_user: string; from_name: string; message: string; created_at: string; read_at: string | null };
export function mergeInboxMessages(older: InboxMessage[], newer: InboxMessage[]) {
  return [...new Map([...older, ...newer].map((m) => [m.id, m])).values()]
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}
export function unreadInboxCount(messages: { to_user: string; read_at: string | null }[], requests: { to_user: string; status: string; read_at: string | null }[], userId: string) {
  return messages.filter((m) => m.to_user === userId && !m.read_at).length
    + requests.filter((r) => r.to_user === userId && r.status === "pending" && !r.read_at).length;
}
export function conversationFilter(me: string, other: string) {
  return `and(from_user.eq.${me},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${me})`;
}