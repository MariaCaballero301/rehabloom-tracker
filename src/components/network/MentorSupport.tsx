// Support page pieces for mentor mode: "Your mentoring" and "People looking for a mentor".
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, GraduationCap, Sparkles, X } from "lucide-react";
import { areasOf, type DirectoryProfile } from "@/lib/network";
import { db, rpc, type ConnectionRequest, type MyProfile } from "./useNetwork";
import { ProfileAvatar } from "./ProfileAvatar";
import { RequestButton, Tags } from "./DiscoverCard";

export function MentoringCard({ userId, profile, requests, onChange }: { userId: string; profile: MyProfile; requests: ConnectionRequest[]; onChange: () => void }) {
  const [bio, setBio] = useState(profile.mentor_bio ?? "");
  const [busy, setBusy] = useState(false);
  const pending = requests.filter((r) => r.kind === "mentor" && r.to_user === userId);

  async function update(values: Partial<MyProfile>, ok: string) {
    setBusy(true);
    const { error } = await db.from("network_profiles").update(values).eq("user_id", userId);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success(ok);
    onChange();
  }
  async function respond(id: string, accept: boolean) {
    try {
      await rpc("respond_connection_request", { p_id: id, p_accept: accept });
      toast.success(accept ? "You're now their mentor 🎓" : "Request declined");
      onChange();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <section className="glass p-5" aria-labelledby="mentoring-h">
      <h2 id="mentoring-h" className="flex items-center gap-2 text-xl"><GraduationCap className="h-5 w-5" /> Your mentoring</h2>
      <label className="mt-3 block text-sm font-semibold">Mentor bio
        <textarea className="field mt-1 min-h-20" maxLength={300} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Share a little about your recovery (no medical advice)." />
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button className="btn-soft text-sm" disabled={busy || bio === (profile.mentor_bio ?? "")} onClick={() => void update({ mentor_bio: bio.trim() }, "Bio saved")}>Save bio</button>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" role="switch" className="h-4 w-4" checked={profile.is_mentor} disabled={busy}
            onChange={(e) => void update({ is_mentor: e.target.checked }, e.target.checked ? "You're open to new mentees" : "You're not taking new mentees")} />
          Open to new mentees
        </label>
      </div>
      <h3 className="mt-4 text-sm font-bold uppercase text-muted-foreground">Mentorship requests</h3>
      {pending.length === 0 ? <p className="mt-1 text-sm text-muted-foreground">No requests right now.</p> : (
        <ul className="mt-2 space-y-2">
          {pending.map((r) => (
            <li key={r.id} className="rounded-2xl border bg-popover p-3 text-sm">
              <div className="flex items-center gap-2"><ProfileAvatar userId={r.from_user} name={r.from_name} /><p className="font-semibold">{r.from_name || "Someone"}</p></div>
              {r.message && <p className="mt-1 text-muted-foreground">“{r.message}”</p>}
              <div className="mt-2 flex gap-2">
                <button className="btn-aqua btn-leaf text-sm" onClick={() => void respond(r.id, true)}><Check className="h-4 w-4" /> Accept</button>
                <button className="btn-soft text-sm" onClick={() => void respond(r.id, false)}><X className="h-4 w-4" /> Decline</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MenteeFinder({ profile, directory, excluded, onChange }: { profile: MyProfile; directory: DirectoryProfile[]; excluded: Set<string>; onChange: () => void }) {
  const people = useMemo(() => {
    const mine = new Set(areasOf(profile));
    return directory.filter((p) => p.user_id !== profile.user_id && !p.is_mentor && !excluded.has(p.user_id) && areasOf(p).some((a) => mine.has(a)));
  }, [profile, directory, excluded]);
  return (
    <section className="glass p-5" aria-labelledby="mentees-h">
      <h2 id="mentees-h" className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5" /> People looking for a mentor</h2>
      <p className="mt-1 text-sm text-muted-foreground">People in rehab for the same area as you.</p>
      {people.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No one with a matching rehab area right now.</p> : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {people.map((p) => (
            <li key={p.user_id} className="rounded-2xl border bg-popover p-3 text-sm">
              <div className="flex items-center gap-2"><ProfileAvatar userId={p.user_id} name={p.display_name} /><p className="min-w-0 break-words font-semibold">{p.display_name}</p></div>
              <Tags person={p} />
              {profile.display_name && <RequestButton person={p} kind="buddy" onSent={onChange} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
