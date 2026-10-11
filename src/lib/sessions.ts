// Pure logic for "sessions together" (rehab_sessions). No database access, so it can be unit-tested.

export type RehabSession = {
  id: string;
  organizer_id: string;
  guest_id: string;
  organizer_name: string;
  guest_name: string;
  starts_at: string;
  mode: "video" | "in_person" | string;
  place: string;
  note: string;
  meeting_url: string;
  status: "proposed" | "accepted" | "declined" | "cancelled" | string;
};

export const SESSION_LENGTH_MS = 2 * 60 * 60 * 1000;
export const JOIN_EARLY_MS = 15 * 60 * 1000;
export const MAX_PLACE_LENGTH = 120;
export const MAX_SESSION_NOTE_LENGTH = 200;

const startMs = (s: Pick<RehabSession, "starts_at">) => new Date(s.starts_at).getTime();
const byStart = (a: RehabSession, b: RehabSession) => startMs(a) - startMs(b);

/** Only accepted sessions that have started can be marked finished. */
export function canFinishSession(s: Pick<RehabSession, "status" | "starts_at">, now: Date) {
  return s.status === "accepted" && startMs(s) <= now.getTime();
}

/** Split my sessions into invites to answer, upcoming accepted ones, and my invites waiting for a reply. */
export function splitSessions(rows: RehabSession[], me: string, now: Date) {
  const t = now.getTime();
  const notEnded = (s: RehabSession) => startMs(s) + SESSION_LENGTH_MS > t;
  return {
    invites: rows.filter((s) => s.status === "proposed" && s.guest_id === me && notEnded(s)).sort(byStart),
    upcoming: rows
      .filter((s) => s.status === "accepted" && (s.guest_id === me || s.organizer_id === me) && notEnded(s))
      .sort(byStart),
    waiting: rows.filter((s) => s.status === "proposed" && s.organizer_id === me && notEnded(s)).sort(byStart),
  };
}

/** The video link works from 15 minutes before the start until 2 hours after. */
export function canJoin(s: Pick<RehabSession, "starts_at" | "mode" | "meeting_url">, now: Date) {
  if (s.mode !== "video" || !s.meeting_url) return false;
  const t = now.getTime();
  const start = startMs(s);
  return t >= start - JOIN_EARLY_MS && t <= start + SESSION_LENGTH_MS;
}

/** The other person in the session, from my point of view. */
export function otherPerson(s: RehabSession, me: string) {
  return s.organizer_id === me
    ? { id: s.guest_id, name: s.guest_name || "Someone" }
    : { id: s.organizer_id, name: s.organizer_name || "Someone" };
}

const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** "Today 6:00 PM", "Tomorrow 9:30 AM" or "Mon, Oct 12 · 6:00 PM" (local time). */
export function formatWhen(iso: string, now: Date) {
  const d = new Date(iso);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (dayKey(d) === dayKey(now)) return `Today ${time(d)}`;
  if (dayKey(d) === dayKey(tomorrow)) return `Tomorrow ${time(d)}`;
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return `${day} · ${time(d)}`;
}

/** Local date "YYYY-MM-DD" + time "HH:MM" → ISO timestamp, or null if invalid. */
export function toStartsAt(date: string, timeStr: string) {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const tm = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!dm || !tm) return null;
  const [y, mo, da, h, mi] = [dm[1], dm[2], dm[3], tm[1], tm[2]].map(Number) as [number, number, number, number, number];
  if (h > 23 || mi > 59) return null;
  const d = new Date(y, mo - 1, da, h, mi);
  if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== da) return null;
  return d.toISOString();
}

/** "YYYY-MM-DD" for a local date (used for the date picker). */
export function localDateInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Red badge on the Sessions bubble: open alerts + invites waiting for my answer. */
export function sessionsBadgeCount(
  alerts: number,
  sessions: RehabSession[],
  sharedProposed: number,
  me: string,
  now: Date,
) {
  return alerts + splitSessions(sessions, me, now).invites.length + sharedProposed;
}

/** "{name} suggested a new time · {when}" for rescheduled invites, otherwise "{name} · {when}". */
export function inviteLabel(s: RehabSession, rescheduled: ReadonlySet<string>, now: Date) {
  const name = s.organizer_name || "Someone";
  const when = formatWhen(s.starts_at, now);
  return rescheduled.has(s.id) ? `${name} suggested a new time · ${when}` : `${name} · ${when}`;
}

export type DaySession = { id: string; day: string; startsAt: string; name: string; mode: string; status: string };

/** Status text shown on the Progress calendar. */
export function sessionStatusLabel(status: string, startsAt: string, now: Date) {
  if (status === "completed") return "Done together";
  if (status === "proposed") return "Waiting for reply";
  return new Date(startsAt).getTime() < now.getTime() ? "Planned" : "Scheduled";
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (t: string) => t.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** A one-hour calendar event (.ics) for a session. */
export function buildIcs(s: RehabSession, me: string, stamp = new Date()) {
  const other = otherPerson(s, me).name;
  const start = new Date(s.starts_at);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const where = s.mode === "video" ? s.meeting_url : s.place;
  const desc = [s.mode === "video" ? `Video call: ${s.meeting_url}` : `In person${s.place ? `: ${s.place}` : ""}`, s.note].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Rehabloom//Sessions//EN", "BEGIN:VEVENT",
    `UID:${s.id}@rehabloom`, `DTSTAMP:${icsDate(stamp)}`, `DTSTART:${icsDate(start)}`, `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(`Rehab session with ${other}`)}`,
    `DESCRIPTION:${icsText(desc)}`,
    ...(where ? [`LOCATION:${icsText(where)}`] : []),
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
}

/** Accepted sessions starting within the next 15 minutes (for the one-time reminder toast). */
export function startingSoon(rows: RehabSession[], now: Date) {
  const t = now.getTime();
  return rows.filter((s) => s.status === "accepted" && startMs(s) > t && startMs(s) - t <= JOIN_EARLY_MS);
}
