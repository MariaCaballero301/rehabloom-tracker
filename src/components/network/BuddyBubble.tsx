import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";
import { useState } from "react";
import { messageStreak, sharedExerciseTotals, type BuddyStats } from "@/lib/buddy-stats";

export function BuddyBubble({ children, empty }: { children: ReactNode; empty: boolean }) {
  const [paused, setPaused] = useState(false);
  return <div className="mt-7">
    <div className="mb-4 flex items-center justify-center gap-3">
      <h3 className="text-center text-2xl font-bold">Rehab buddies</h3>
      <Button variant="ghost" size="icon" className="btn-soft rounded-full" aria-label={paused ? "Resume bubble rotation" : "Pause bubble rotation"} title={paused ? "Resume bubble rotation" : "Pause bubble rotation"} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}</Button>
    </div>
    <div className={`buddy-bubble ${paused ? "buddy-bubble-paused" : ""}`}>
      <div className="buddy-bubble-shell" aria-hidden="true" />
      <div className="buddy-bubble-content">
        {empty ? <p className="py-12 text-center text-muted-foreground">No rehab buddies yet.</p> : children}
      </div>
    </div>
  </div>;
}

export function BuddyMetrics({ stats, error = false }: { stats?: BuddyStats | undefined; error?: boolean }) {
  const totals = sharedExerciseTotals(stats);
  return <>
    {totals && <div className="buddy-progress-bar mt-3 grid grid-cols-3 divide-x divide-input" aria-label="Shared completed exercises">
      {totals.map((value, i) => <div key={i} className="px-2 py-3 text-center"><p className="text-xl font-bold tabular-nums">{value}</p><p className="text-xs text-muted-foreground">{["today", "this week", "all-time"][i]}</p></div>)}
    </div>}
    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm">
      <li><strong className="tabular-nums">{stats ? stats.cheer_xp : "—"}</strong> XP earned cheering each other</li>
      <li><strong className="tabular-nums">{stats ? stats.messages_sent : "—"}</strong> messages sent by you</li>
      <li><strong className="tabular-nums">{stats ? messageStreak(stats.message_days) : "—"}</strong> consecutive messaging days</li>
    </ul>
    {error && <p className="mt-2 text-xs text-muted-foreground">Statistics couldn't be loaded. Try refreshing.</p>}
  </>;
}