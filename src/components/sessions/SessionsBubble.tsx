// Floating Sessions bubble (above Inbox) + side panel: support alerts, session invites, upcoming
// sessions together and invites waiting for a reply. Mounted once in the root layout.
import { useCallback, useEffect, useRef, useState } from "react";
import { NavSlot } from "@/components/NavSlot";
import { toast } from "sonner";
import { CalendarClock, CalendarPlus2, CalendarHeart, CalendarPlus, Check, HeartHandshake, MessageCircleHeart, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { db, rpc } from "@/components/network/useNetwork";
import { PlanSessionDialog, type PlanTarget } from "@/components/sessions/PlanSessionDialog";
import { celebrateXp } from "@/components/XpFish";
import { buildIcs, canComplete, canJoin, needsConfirmation, formatWhen, inviteLabel, otherPerson, sessionsBadgeCount, splitSessions, startingSoon, type RehabSession } from "@/lib/sessions";
import { playSound } from "@/lib/sounds";

export const OPEN_SESSIONS_EVENT = "rehabloom:open-sessions";
export const PANEL_OPEN_EVENT = "rehabloom:panel-open";

type Alert = { id: string; patient_id: string; patient_name: string; missed_days: number };
type Shared = { id: string; contact_name: string; proposed_for: string; note: string; status: string };

const ENCOURAGEMENT = "Thinking of you — you've got this! 💪";

type Person = { id: string; name: string };

const readSet = (key: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || "[]") as string[]); } catch { return new Set<string>(); }
};
const saveSet = (key: string, s: Set<string>) => localStorage.setItem(key, JSON.stringify([...s].slice(-100)));

function downloadIcs(s: RehabSession, me: string) {
  const url = URL.createObjectURL(new Blob([buildIcs(s, me)], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "rehab-session.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SessionsBubble({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const previousOpen = useRef(false);
  useEffect(() => {
    if (previousOpen.current !== open) playSound("pop");
    previousOpen.current = open;
  }, [open]);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [rescheduled, setRescheduled] = useState<Set<string>>(() => new Set());
  const trigger = useRef<HTMLButtonElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const reminded = useRef<Set<string>>(new Set());
  const reKey = `rehabloom:rescheduled:${userId}`;
  const remKey = `rehabloom:reminded:${userId}`;
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sessions, setSessions] = useState<RehabSession[]>([]);
  const [shared, setShared] = useState<Shared[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [plan, setPlan] = useState<PlanTarget | null>(null);
  const [finishing, setFinishing] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 2 * 3600_000).toISOString();
    const [a, r, s] = await Promise.all([
      db.from("support_notifications").select("id, patient_id, patient_name, missed_days")
        .eq("recipient_id", userId).is("dismissed_at", null).order("created_at", { ascending: false }).limit(10),
      db.from("rehab_sessions").select("*").or(`organizer_id.eq.${userId},guest_id.eq.${userId}`)
        .in("status", ["proposed", "accepted"]).gte("starts_at", since).order("starts_at").limit(50),
      db.from("shared_sessions").select("id, contact_name, proposed_for, note, status")
        .eq("patient_id", userId).in("status", ["proposed", "accepted"]).gte("proposed_for", new Date().toISOString()).order("proposed_for"),
    ]);
    setAlerts((a.data as Alert[]) ?? []);
    setSessions((r.data as RehabSession[]) ?? []);
    setShared((s.data as Shared[]) ?? []);
  }, [userId]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`home-support-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_notifications", filter: `recipient_id=eq.${userId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "rehab_sessions", filter: `guest_id=eq.${userId}` }, (payload) => {
        const row = payload.new as Partial<RehabSession> | undefined;
        if (payload.eventType === "UPDATE" && row?.id && row.status === "proposed") {
          setRescheduled((prev) => { const next = new Set(prev).add(row.id!); saveSet(reKey, next); return next; });
        }
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rehab_sessions", filter: `organizer_id=eq.${userId}` }, () => void load())
      .subscribe();
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const onFocus = () => { setNow(new Date()); void load(); };
    const onVisible = () => { if (document.visibilityState === "visible") onFocus(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [userId, load, reKey]);

  useEffect(() => {
    setRescheduled(readSet(reKey));
    reminded.current = readSet(remKey);
  }, [reKey, remKey]);

  // Only one side panel at a time; toasts elsewhere can ask this panel to open.
  useEffect(() => {
    const onPanel = (e: Event) => { if ((e as CustomEvent<string>).detail !== "sessions") setOpen(false); };
    const onOpen = () => setOpen(true);
    window.addEventListener(PANEL_OPEN_EVENT, onPanel);
    window.addEventListener(OPEN_SESSIONS_EVENT, onOpen);
    return () => { window.removeEventListener(PANEL_OPEN_EVENT, onPanel); window.removeEventListener(OPEN_SESSIONS_EVENT, onOpen); };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("sessions-panel-open", open);
    if (!open) return;
    window.dispatchEvent(new CustomEvent(PANEL_OPEN_EVENT, { detail: "sessions" }));
    closeBtn.current?.focus();
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener("keydown", esc);
    return () => { window.removeEventListener("keydown", esc); document.body.classList.remove("sessions-panel-open"); };
  }, [open]);

  // One-time reminder when a session starts within 15 minutes.
  useEffect(() => {
    for (const s of startingSoon(sessions, now)) {
      if (reminded.current.has(s.id)) continue;
      reminded.current.add(s.id);
      saveSet(remKey, reminded.current);
      const mins = Math.max(1, Math.round((new Date(s.starts_at).getTime() - now.getTime()) / 60_000));
      const video = s.mode === "video" && s.meeting_url;
      toast(`Your session with ${otherPerson(s, userId).name} starts in ${mins} min`, {
        action: video
          ? { label: "Join", onClick: () => window.open(s.meeting_url, "_blank", "noopener,noreferrer") }
          : { label: "Open", onClick: () => setOpen(true) },
      });
    }
  }, [sessions, now, userId, remKey]);

  async function loadPeople() {
    if (people) return setPeople(null);
    const [c, p] = await Promise.all([
      db.from("support_contacts").select("connected_user_id, name").not("connected_user_id", "is", null),
      db.rpc("people_i_support"),
    ]);
    const map = new Map<string, string>();
    for (const r of (c.data ?? []) as { connected_user_id: string; name: string }[]) map.set(r.connected_user_id, r.name);
    for (const r of (p.data ?? []) as { user_id: string; name: string }[]) if (!map.has(r.user_id)) map.set(r.user_id, r.name);
    setPeople([...map].map(([id, name]) => ({ id, name: name || "Someone" })));
  }

  async function handled(a: Alert) {
    setAlerts((prev) => prev.filter((x) => x.id !== a.id));
    const t = new Date().toISOString();
    await db.from("support_notifications").update({ read_at: t, dismissed_at: t }).eq("id", a.id);
  }

  async function encourage(a: Alert) {
    try {
      await rpc("send_encouragement", { p_to: a.patient_id, p_message: ENCOURAGEMENT });
      toast.success(`Sent to ${a.patient_name} 💚`);
      window.dispatchEvent(new Event("rehabloom:message-sent"));
      void handled(a);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function act(fn: string, args: Record<string, unknown>, done: string) {
    try {
      await rpc(fn, args);
      toast.success(done);
      void load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function answerShared(id: string, status: "accepted" | "declined") {
    const { error } = await db.from("shared_sessions").update({ status }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(status === "accepted" ? "Session accepted — enjoy it together!" : "Invite declined");
    void load();
  }

  async function finishSession(s: RehabSession) {
    if (finishing.has(s.id) || !canComplete(s, new Date())) return;
    setFinishing((prev) => new Set(prev).add(s.id));
    try {
      await rpc("complete_rehab_session", { p_id: s.id });
      setSessions((prev) => prev.filter((row) => row.id !== s.id));
      const { data: mine } = await supabase.from("rehab_sessions").select("id, status, completed_at").eq("status", "completed");
      if (earnsSessionXp(mine ?? [], s.id, new Date())) {
        toast.success("Session done together 🎉 +15 XP");
        celebrateXp("+15 XP");
      } else {
        toast.success("Session done together 🎉 (today’s session XP already earned)");
      }
      window.dispatchEvent(new Event("rehabloom:xp-changed"));
      window.dispatchEvent(new Event("rehabloom:message-sent"));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFinishing((prev) => { const next = new Set(prev); next.delete(s.id); return next; });
    }
  }

  const { invites, upcoming, waiting } = splitSessions(sessions, userId, now);
  const sharedInvites = shared.filter((s) => s.status === "proposed");
  const sharedUpcoming = shared.filter((s) => s.status === "accepted");
  const count = sessionsBadgeCount(alerts.length, sessions, sharedInvites.length, userId, now);
  const empty = !alerts.length && !invites.length && !sharedInvites.length && !upcoming.length && !sharedUpcoming.length && !waiting.length;

  return (
    <>
      {open && <aside id="sessions-panel" className="inbox-sidebar" aria-label="Sessions">
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-4">
          <h1 className="flex items-center gap-2 text-xl"><CalendarHeart className="h-5 w-5" /> Sessions</h1>
          <Button data-sound="pop" ref={closeBtn} variant="ghost" size="icon" className="btn-soft rounded-full" aria-label="Close Sessions" title="Close Sessions" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X /></Button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <button className="btn-aqua text-sm" aria-expanded={!!people} onClick={() => void loadPeople()}><CalendarPlus className="h-4 w-4" /> Plan a new session</button>
            {people && (people.length ? (
              <ul className="mt-2 space-y-1">
                {people.map((p) => <li key={p.id}><button className="btn-soft w-full justify-start text-sm" onClick={() => { setPlan(p); setPeople(null); }}>{p.name}</button></li>)}
              </ul>
            ) : <p className="mt-2 text-sm text-muted-foreground">Connect with someone on Support first 🌱</p>)}
          </div>
      {empty && <p className="text-center text-sm text-muted-foreground">No alerts or sessions right now.</p>}
      {!empty && (
        <section className="space-y-4" aria-label="Support and sessions">
          {alerts.length > 0 && (
            <div>
              <h2 className="flex items-center gap-2 text-lg"><HeartHandshake className="h-5 w-5 text-success" /> Someone could use you</h2>
              <ul className="mt-2 space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="rounded-2xl border bg-popover p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">{a.patient_name} could use a little support 💚</p>
                        <p className="text-muted-foreground">They haven't logged their rehab sessions for {a.missed_days} days.</p>
                      </div>
                      <button className="rounded-full p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss" onClick={() => void handled(a)}>
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button variant="ghost" className="btn-aqua h-auto whitespace-normal text-sm" onClick={() => { setPlan({ id: a.patient_id, name: a.patient_name }); void handled(a); }}><CalendarPlus className="h-4 w-4" /> Do a session together</Button>
                      <Button variant="ghost" className="btn-soft h-auto whitespace-normal text-sm" onClick={() => void encourage(a)}><MessageCircleHeart className="h-4 w-4" /> Send encouragement</Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(invites.length > 0 || sharedInvites.length > 0) && (
            <div>
              <h2 className="flex items-center gap-2 text-lg"><CalendarHeart className="h-5 w-5" /> Session invites</h2>
              <ul className="mt-2 space-y-2">
                {invites.map((s) => (
                  <li key={s.id} className="rounded-2xl border bg-popover p-3 text-sm">
                    <p className="font-semibold">{inviteLabel(s, rescheduled, now)}</p>
                    <SessionDetails s={s} />
                    <div className="mt-2 flex gap-2">
                      <button data-sound="success" className="btn-aqua btn-leaf text-sm" onClick={() => void act("respond_rehab_session", { p_id: s.id, p_accept: true }, "Session accepted — enjoy it together!")}><Check className="h-4 w-4" /> Accept</button>
                      <button className="btn-soft text-sm" onClick={() => void act("respond_rehab_session", { p_id: s.id, p_accept: false }, "Invite declined")}><X className="h-4 w-4" /> Not this time</button>
                    </div>
                  </li>
                ))}
                {sharedInvites.map((s) => (
                  <li key={s.id} className="rounded-2xl border bg-popover p-3 text-sm">
                    <p className="font-semibold">{s.contact_name || "Someone"} · {formatWhen(s.proposed_for, now)}</p>
                    {s.note && <p className="text-muted-foreground">“{s.note}”</p>}
                    <div className="mt-2 flex gap-2">
                      <button data-sound="success" className="btn-aqua btn-leaf text-sm" onClick={() => void answerShared(s.id, "accepted")}><Check className="h-4 w-4" /> Accept</button>
                      <button className="btn-soft text-sm" onClick={() => void answerShared(s.id, "declined")}><X className="h-4 w-4" /> Not this time</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(upcoming.length > 0 || sharedUpcoming.length > 0) && (
            <div>
              <h2 className="flex items-center gap-2 text-lg"><CalendarHeart className="h-5 w-5" /> Upcoming sessions together</h2>
              <ul className="mt-2 space-y-2">
                {upcoming.map((s) => {
                  const other = otherPerson(s, userId);
                  const joinable = canJoin(s, now);
                  return (
                    <li key={s.id} className="rounded-2xl border bg-popover p-3 text-sm">
                      <p className="font-semibold">With {other.name} · {formatWhen(s.starts_at, now)}</p>
                      <SessionDetails s={s} />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {needsConfirmation(s, now) && <p className="w-full text-xs font-semibold text-muted-foreground">Did it happen?</p>}
                        <Button variant="ghost" data-sound="success" className="btn-aqua btn-leaf h-auto text-sm" disabled={finishing.has(s.id) || !canComplete(s, now)} title={canComplete(s, now) ? undefined : "Available once the session starts"} onClick={() => void finishSession(s)}><Check className="h-4 w-4" /> {finishing.has(s.id) ? "Saving…" : "Mark as done"}</Button>
                        {needsConfirmation(s, now) && <button className="btn-soft text-sm" onClick={() => void act("cancel_rehab_session", { p_id: s.id }, "Okay, we removed it")}><X className="h-4 w-4" /> It didn't happen</button>}
                        {s.mode === "video" && (joinable ? (
                          <a className="btn-aqua text-sm" href={s.meeting_url} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" /> Join video call</a>
                        ) : (
                          <button className="btn-soft text-sm" disabled><Video className="h-4 w-4" /> Link opens 15 min before</button>
                        ))}
                        <button className="btn-soft text-sm" onClick={() => setPlan({ id: other.id, name: other.name, session: s })}><CalendarClock className="h-4 w-4" /> Reschedule</button>
                        <button className="btn-soft text-sm" onClick={() => downloadIcs(s, userId)}><CalendarPlus2 className="h-4 w-4" /> Add to calendar</button>
                        <button className="btn-soft text-sm" onClick={() => { if (confirm(`Cancel your session with ${other.name}?`)) void act("cancel_rehab_session", { p_id: s.id }, "Session cancelled"); }}><X className="h-4 w-4" /> Cancel</button>
                      </div>
                    </li>
                  );
                })}
                {sharedUpcoming.map((s) => (
                  <li key={s.id} className="rounded-2xl border bg-popover p-3 text-sm">
                    <p className="font-semibold">With {s.contact_name || "Someone"} · {formatWhen(s.proposed_for, now)}</p>
                    {s.note && <p className="text-muted-foreground">“{s.note}”</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {waiting.length > 0 && (
            <div>
              <h2 className="text-lg">Waiting for a reply</h2>
              <ul className="mt-2 space-y-2">
                {waiting.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-popover p-3 text-sm">
                    <p className="font-semibold">{s.guest_name || "Someone"} · {formatWhen(s.starts_at, now)}</p>
                    <span className="flex gap-2">
                      <button className="btn-soft text-sm" onClick={() => setPlan({ id: s.guest_id, name: s.guest_name || "Someone", session: s })}><CalendarClock className="h-4 w-4" /> Reschedule</button>
                      <button className="btn-soft text-sm" onClick={() => void act("cancel_rehab_session", { p_id: s.id }, "Invite cancelled")}>Cancel invite</button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
        </div>
      </aside>}
      {!open && <NavSlot id="nav-slot-sessions"><Button ref={trigger} variant="ghost" className={`bubble inbox-trigger sessions-trigger rounded-full p-0 text-primary ${count > 0 ? "inbox-attention" : ""}`} aria-label={count ? `Open Sessions, ${count} waiting` : "Open Sessions"} title="Sessions" aria-expanded={open} aria-controls="sessions-panel" onClick={() => setOpen(true)}>
        <CalendarHeart className="size-7" />
        {count > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-popover bg-destructive px-1 text-xs font-bold text-destructive-foreground">{count > 99 ? "99+" : count}</span>}
      </Button></NavSlot>}
      <PlanSessionDialog target={plan} onClose={() => setPlan(null)} onSent={() => void load()} />
    </>
  );
}

function SessionDetails({ s }: { s: RehabSession }) {
  return (
    <p className="text-muted-foreground">
      {s.mode === "video" ? "Video call" : `In person${s.place ? ` · ${s.place}` : ""}`}
      {s.note && <> · “{s.note}”</>}
    </p>
  );
}
