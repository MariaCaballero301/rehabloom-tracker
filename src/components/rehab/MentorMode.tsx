// Mentor mode pieces for people who finished therapy.
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { CalendarPlus, ChevronDown, MessageCircleHeart } from "lucide-react";
import { db, useNetwork } from "@/components/network/useNetwork";
import { Encourage } from "@/components/network/PeopleCard";
import { BuddyMetrics } from "@/components/network/BuddyBubble";
import { PlanSessionDialog, type PlanTarget } from "@/components/sessions/PlanSessionDialog";
import { BACK_IN_REHAB } from "@/lib/mentor-mode";
import { Plant } from "./Plant";

export function BackInRehabButton({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    if (!confirm("Switch back to rehab? Your daily exercises and missed-session alerts will return.")) return;
    setBusy(true);
    const { error } = await db.from("network_profiles").update(BACK_IN_REHAB).eq("user_id", userId);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Welcome back — your rehab plan is on Home again");
    onDone();
  }
  return <button type="button" className="btn-soft text-sm" disabled={busy} onClick={go}>I'm back in rehab</button>;
}

export function MentorHome({ userId, xp, onSwitched, maintenance }: { userId: string; xp: number; onSwitched: () => void; maintenance: ReactNode }) {
  const n = useNetwork(userId);
  const [open, setOpen] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanTarget | null>(null);
  const [showMaint, setShowMaint] = useState(false);
  const statsFor = (id: string) => n.buddyStats.find((s) => s.user_id === id);

  return (
    <div className="space-y-5">
      <section className="glass p-5 text-center sm:p-6" aria-labelledby="mentor-h">
        <h2 id="mentor-h" className="text-3xl">You made it 🌸</h2>
        <p className="text-sm text-muted-foreground">You finished your therapy. Now you can help others grow.</p>
        <div className="flex justify-center"><Plant stage={3} size="lg" /></div>
        <p className="font-bold">Fully bloomed</p>
        <p className="text-2xl font-extrabold text-success">{xp} XP</p>
        <div className="mt-3"><BackInRehabButton userId={userId} onDone={onSwitched} /></div>
      </section>

      <section className="glass p-5 sm:p-6" aria-labelledby="pys-h">
        <h2 id="pys-h" className="text-xl">People you support</h2>
        {n.loading ? <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
          : n.supporting.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No one yet. Share an invite from the Support page.</p>
          : <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {n.supporting.map((p) => (
              <li key={p.user_id} className="rounded-2xl border bg-card p-3">
                <p className="font-bold">{p.name}</p>
                <BuddyMetrics stats={statsFor(p.user_id)} error={n.statsError} />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="btn-soft text-sm" onClick={() => setOpen(open === p.user_id ? null : p.user_id)}>
                    <MessageCircleHeart className="h-4 w-4" /> Send encouragement
                  </button>
                  <button className="btn-aqua text-sm" onClick={() => setPlan({ id: p.user_id, name: p.name })}>
                    <CalendarPlus className="h-4 w-4" /> Plan a session
                  </button>
                </div>
                {open === p.user_id && <Encourage to={p.user_id} name={p.name} onDone={() => { setOpen(null); void n.reload(); }} />}
              </li>
            ))}
          </ul>}
      </section>

      <section className="glass p-5 sm:p-6">
        <button type="button" className="flex w-full items-center justify-between text-left" aria-expanded={showMaint} onClick={() => setShowMaint((v) => !v)}>
          <h2 className="text-xl">Maintenance exercises (optional)</h2>
          <ChevronDown className={`h-5 w-5 transition ${showMaint ? "rotate-180" : ""}`} />
        </button>
        {showMaint && <div className="mt-3"><p className="mb-2 text-xs text-muted-foreground">Completing these still earns XP. Nobody gets alerted if you skip them.</p>{maintenance}</div>}
      </section>
      <PlanSessionDialog target={plan} onClose={() => setPlan(null)} />
    </div>
  );
}
