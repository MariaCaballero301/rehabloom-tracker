// "Your people": who supports me (with the alert toggle) and who I support.
import { celebrateXp } from "@/components/XpFish";
import { useState } from "react";
import { toast } from "sonner";
import { Ban, HeartHandshake, MessageCircleHeart, UserMinus } from "lucide-react";
import { KIND_LABEL, MAX_ENCOURAGEMENT_LENGTH, QUICK_ENCOURAGEMENTS } from "@/lib/network";
import { db, rpc, type Block, type Contact, type Supported } from "./useNetwork";
import { ProfileAvatar } from "./ProfileAvatar";
import { supportGroups } from "@/lib/support-groups";
import { BuddyBubble, BuddyMetrics, IconAction } from "./BuddyBubble";
import { BellRing } from "lucide-react";
import type { BuddyStats } from "@/lib/buddy-stats";
import { Button } from "@/components/ui/button";

function Encourage({ to, name, onDone }: { to: string; name: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send(message: string) {
    setSending(true);
    try {
      await rpc("send_encouragement", { p_to: to, p_message: message });
      celebrateXp(`Sent to ${name} 💌 +2 XP`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-2 space-y-2 rounded-2xl border bg-card p-3">
      <div className="flex flex-wrap gap-2">
        {QUICK_ENCOURAGEMENTS.map((q) => (
          <button key={q} className="btn-soft text-sm" disabled={sending} onClick={() => send(q)}>
            {q}
          </button>
        ))}
      </div>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void send(text);
        }}
      >
        <input
          className="field"
          maxLength={MAX_ENCOURAGEMENT_LENGTH}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Or write your own…"
          aria-label={`Message to ${name}`}
        />
        <button className="btn-aqua shrink-0" disabled={sending || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export function PeopleCard({
  contacts,
  supporting,
  blocks,
  onChange,
  buddyStats = [],
  statsError = false,
}: {
  contacts: Contact[];
  supporting: Supported[];
  blocks: Block[];
  onChange: () => void;
  buddyStats?: BuddyStats[];
  statsError?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const { familyFriends, buddyContacts, supportingOnly } = supportGroups(contacts, supporting);

  async function toggleNotify(c: Contact) {
    const { error } = await db
      .from("support_contacts")
      .update({ notify_on_missed: !c.notify_on_missed })
      .eq("id", c.id);
    if (error) return void toast.error(error.message);
    onChange();
  }

  async function remove(c: Contact) {
    if (!confirm(`Remove ${c.name} from your people? They won't get alerts about you anymore.`))
      return;
    try {
      if (c.connected_user_id) await rpc("disconnect_person", { p_other: c.connected_user_id });
      else {
        const { error } = await db.from("support_contacts").delete().eq("id", c.id);
        if (error) throw new Error(error.message);
      }
      toast.success(`${c.name} removed`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function disconnect(userId: string, name: string) {
    if (!confirm(`Stop supporting ${name}? You'll no longer get alerts about them.`)) return;
    try {
      await rpc("disconnect_person", { p_other: userId });
      toast.success(`Disconnected from ${name}`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function block(userId: string, name: string) {
    if (
      !confirm(
        `Block ${name}? You'll be disconnected and they won't be able to find you or contact you here.`,
      )
    )
      return;
    try {
      await rpc("block_person", { p_other: userId });
      toast.success(`${name} blocked`);
      onChange();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function unblock(b: Block) {
    const { error } = await db.from("blocks").delete().eq("blocked_id", b.blocked_id);
    if (error) return void toast.error(error.message);
    toast.success(`${b.blocked_name || "Person"} unblocked`);
    onChange();
  }

  return (
    <section className="glass p-5" aria-labelledby="people-h">
      <h2 id="people-h" className="flex items-center gap-2 text-xl">
        <HeartHandshake className="h-5 w-5" /> Your people
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        People with alerts on get a text if you miss your sessions for 2 days, so they can call you
        or plan a session together.
      </p>

      {[
        { title: "Family & friends", people: familyFriends, empty: "No family or friends yet." },
      ].map((group) => (
        <div key={group.title}>
        <h3 className="mt-5 text-sm font-bold text-muted-foreground">{group.title}</h3>
        {group.people.length === 0 && (group.title !== "Rehab buddies" || supportingOnly.length === 0) && <p className="mt-2 text-sm text-muted-foreground">{group.empty}</p>}
        <ul className="mt-3 space-y-2">
          {group.people.map((c) => (
            <li key={c.id} className="rounded-2xl border bg-popover p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2"><ProfileAvatar userId={c.connected_user_id} name={c.name} /><p className="min-w-0 break-words font-semibold">
                  {c.name}{" "}
                  <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-bold">
                    {KIND_LABEL[c.kind] ?? c.kind}
                  </span>
                </p></div>
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={c.notify_on_missed}
                    onChange={() => toggleNotify(c)}
                  />
                  Alert them if I miss sessions
                </label>
              </div>
              {!c.connected_user_id && !c.phone && c.notify_on_missed && (
                <p className="mt-1 text-xs text-muted-foreground">
                  No phone number saved, so they can't be texted yet.
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {c.connected_user_id && (
                  <button
                    className="btn-soft text-sm"
                    onClick={() => setOpen(open === c.id ? null : c.id)}
                  >
                    <MessageCircleHeart className="h-4 w-4" /> Send encouragement
                  </button>
                )}
                <button className="btn-soft text-sm" onClick={() => remove(c)}>
                  <UserMinus className="h-4 w-4" /> {c.connected_user_id ? "Disconnect" : "Remove"}
                </button>
                {c.connected_user_id && (
                  <button
                    className="btn-soft text-sm"
                    onClick={() => { if (c.connected_user_id) void block(c.connected_user_id, c.name); }}
                  >
                    <Ban className="h-4 w-4" /> Block
                  </button>
                )}
              </div>
              {open === c.id && c.connected_user_id && (
                <Encourage to={c.connected_user_id} name={c.name} onDone={() => setOpen(null)} />
              )}
            </li>
          ))}
        </ul>
        </div>
      ))}

      <BuddyBubble empty={buddyContacts.length === 0 && supportingOnly.length === 0} count={buddyContacts.length + supportingOnly.length}>
        <ul className="buddy-people">
          {buddyContacts.map((c) => (
            <li key={c.id} className="buddy-person">
              <div className="flex flex-col items-center gap-1 text-center">
                <ProfileAvatar userId={c.connected_user_id} name={c.name} />
                <p className="w-full break-words font-bold leading-tight">{c.name}</p>
                <span className="text-[0.7em] font-semibold text-muted-foreground">{KIND_LABEL[c.kind] ?? c.kind}</span>
              </div>
              <BuddyMetrics stats={buddyStats.find((s) => s.user_id === c.connected_user_id)} error={statsError} />
              <div className="mt-2 flex justify-center gap-1.5">
                <IconAction label="Send encouragement" onClick={() => setOpen(open === c.id ? null : c.id)}><MessageCircleHeart /></IconAction>
                <IconAction label={c.notify_on_missed ? "Alerts on: tap to stop alerting them if I miss sessions" : "Alert them if I miss sessions"} pressed={c.notify_on_missed} onClick={() => toggleNotify(c)}><BellRing /></IconAction>
                <IconAction label="Disconnect" onClick={() => remove(c)}><UserMinus /></IconAction>
                <IconAction label="Block" onClick={() => { if (c.connected_user_id) void block(c.connected_user_id, c.name); }}><Ban /></IconAction>
              </div>
              {open === c.id && c.connected_user_id && <Encourage to={c.connected_user_id} name={c.name} onDone={() => { setOpen(null); onChange(); }} />}
            </li>
          ))}
          {supportingOnly.map((s) => {
            const key = `s-${s.user_id}`;
            return (
              <li key={key} className="buddy-person">
                <div className="flex flex-col items-center gap-1 text-center">
                  <ProfileAvatar userId={s.user_id} name={s.name} />
                  <p className="w-full break-words font-bold leading-tight">{s.name}</p>
                  <span className="text-[0.7em] font-semibold text-muted-foreground">{s.kind === "mentor" ? "You're their mentor" : KIND_LABEL[s.kind]}</span>
                </div>
                <BuddyMetrics stats={buddyStats.find((stat) => stat.user_id === s.user_id)} error={statsError} />
                <div className="mt-2 flex justify-center gap-1.5">
                  <IconAction label="Send encouragement" onClick={() => setOpen(open === key ? null : key)}><MessageCircleHeart /></IconAction>
                  <IconAction label="Disconnect" onClick={() => disconnect(s.user_id, s.name)}><UserMinus /></IconAction>
                  <IconAction label="Block" onClick={() => block(s.user_id, s.name)}><Ban /></IconAction>
                </div>
                {open === key && <Encourage to={s.user_id} name={s.name} onDone={() => { setOpen(null); onChange(); }} />}
              </li>
            );
          })}
        </ul>
      </BuddyBubble>

      {blocks.length > 0 && (
        <details className="mt-5 text-sm">
          <summary className="cursor-pointer font-semibold text-muted-foreground">
            Blocked ({blocks.length})
          </summary>
          <ul className="mt-2 space-y-1">
            {blocks.map((b) => (
              <li key={b.blocked_id} className="flex items-center justify-between gap-2">
                <span>{b.blocked_name || "Someone"}</span>
                <button className="btn-soft text-sm" onClick={() => unblock(b)}>
                  Unblock
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
