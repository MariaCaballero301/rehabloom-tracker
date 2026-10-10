// Home: support alerts about people I support, session invites, upcoming sessions together and
// invites waiting for a reply. Renders nothing when every section is empty.
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarHeart, CalendarPlus, Check, HeartHandshake, MessageCircleHeart, Phone, Video, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { db, rpc } from "@/components/network/useNetwork";
import { PlanSessionDialog, type PlanTarget } from "@/components/sessions/PlanSessionDialog";
import { canJoin, formatWhen, otherPerson, splitSessions, type RehabSession } from "@/lib/sessions";

type Alert = { id: string; patient_id: string; patient_name: string; missed_days: number };
type Shared = { id: string; contact_name: string; proposed_for: string; note: string; status: string };

const ENCOURAGEMENT = "Thinking of you — you've got this! 💪";

export function HomeSupport({ userId }: { userId: string }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [sessions, setSessions] = useState<RehabSession[]>([]);
  const [shared, setShared] = useState<Shared[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [plan, setPlan] = useState<PlanTarget | null>(null);

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
      .on("postgres_changes", { event: "*", schema: "public", table: "rehab_sessions", filter: `guest_id=eq.${userId}` }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "rehab_sessions", filter: `organizer_id=eq.${userId}` }, () => void load())
      .subscribe();
    const tick = setInterval(() => setNow(new Date()), 60_000);
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(tick);
      window.removeEventListener("focus", onFocus);
      void supabase.removeChannel(channel);
    };
  }, [userId, load]);

  async function handled(a: Alert) {
    setAlerts((prev) => prev.filter((x) => x.id !== a.id));
    const t = new Date().toISOString();
    await db.from("support_notifications").update({ read_at: t, dismissed_at: t }).eq("id", a.id);
  }

  async function call(a: Alert) {
    try {
      const phone = await rpc<string | null>("supported_person_phone", { p_user: a.patient_id });
      if (!phone) return void toast(`${a.patient_name} hasn't shared a phone number yet.`);
      void handled(a);
      window.location.href = `tel:${phone.replace(/[^\d+]/g, "")}`;
    } catch (e) {
      toast.error((e as Error).message);
    }
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

  const { invites, upcoming, waiting } = splitSessions(sessions, userId, now);
  const sharedInvites = shared.filter((s) => s.status === "proposed");
  const sharedUpcoming = shared.filter((s) => s.status === "accepted");
  const empty = !alerts.length && !invites.length && !sharedInvites.length && !upcoming.length && !sharedUpcoming.length && !waiting.length;

  return (
    <>
      {!empty && (
        <section className="glass mb-5 space-y-4 p-5" aria-label="Support and sessions">
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
                      <button className="btn-aqua text-sm" onClick={() => void call(a)}><Phone className="h-4 w-4" /> Call {a.patient_name}</button>
                      <button className="btn-soft text-sm" onClick={() => { setPlan({ id: a.patient_id, name: a.patient_name }); void handled(a); }}><CalendarPlus className="h-4 w-4" /> Do a session together</button>
                      <button className="btn-soft text-sm" onClick={() => void encourage(a)}><MessageCircleHeart className="h-4 w-4" /> Send encouragement</button>
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
                    <p className="font-semibold">{s.organizer_name || "Someone"} · {formatWhen(s.starts_at, now)}</p>
                    <SessionDetails s={s} />
                    <div className="mt-2 flex gap-2">
                      <button className="btn-aqua btn-leaf text-sm" onClick={() => void act("respond_rehab_session", { p_id: s.id, p_accept: true }, "Session accepted — enjoy it together!")}><Check className="h-4 w-4" /> Accept</button>
                      <button className="btn-soft text-sm" onClick={() => void act("respond_rehab_session", { p_id: s.id, p_accept: false }, "Invite declined")}><X className="h-4 w-4" /> Not this time</button>
                    </div>
                  </li>
                ))}
                {sharedInvites.map((s) => (
                  <li key={s.id} className="rounded-2xl border bg-popover p-3 text-sm">
                    <p className="font-semibold">{s.contact_name || "Someone"} · {formatWhen(s.proposed_for, now)}</p>
                    {s.note && <p className="text-muted-foreground">“{s.note}”</p>}
                    <div className="mt-2 flex gap-2">
                      <button className="btn-aqua btn-leaf text-sm" onClick={() => void answerShared(s.id, "accepted")}><Check className="h-4 w-4" /> Accept</button>
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
                        {s.mode === "video" && (joinable ? (
                          <a className="btn-aqua text-sm" href={s.meeting_url} target="_blank" rel="noopener noreferrer"><Video className="h-4 w-4" /> Join video call</a>
                        ) : (
                          <button className="btn-soft text-sm" disabled><Video className="h-4 w-4" /> Link opens 15 min before</button>
                        ))}
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
                    <button className="btn-soft text-sm" onClick={() => void act("cancel_rehab_session", { p_id: s.id }, "Invite cancelled")}>Cancel invite</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
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
