// Glossy circular bubble holding the rehab buddies, one at a time.
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { messageStreak, sharedExerciseTotals, type BuddyStats } from "@/lib/buddy-stats";

export function BuddyBubble({
  children,
  empty,
  total = 0,
  page = 0,
  onPrev,
  onNext,
}: {
  children: ReactNode;
  empty: boolean;
  total?: number;
  page?: number;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const shown = total > 0 ? (((page % total) + total) % total) + 1 : 0;
  return (
    <div className="mt-7">
      <h3 className="mb-4 text-center text-2xl font-bold">Buddies</h3>
      <div className="buddy-bubble buddy-size-one">
        <div className="buddy-bubble-shell" aria-hidden="true">
          <span className="buddy-shine buddy-shine-a" />
          <span className="buddy-shine buddy-shine-b" />
        </div>
        <div className="buddy-bubble-content" aria-live="polite">
          {empty ? <p className="text-center text-muted-foreground">No buddies yet</p> : children}
        </div>
        {total > 1 && (
          <>
            <button type="button" className="buddy-cycle-btn buddy-cycle-prev btn-aqua" aria-label="Previous buddy" onClick={onPrev}>
              <ChevronLeft />
            </button>
            <button type="button" className="buddy-cycle-btn buddy-cycle-next btn-aqua" aria-label="Next buddy" onClick={onNext}>
              <ChevronRight />
            </button>
            <p className="buddy-cycle-count">
              {shown} of {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function IconAction({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return <button type="button" className="buddy-icon-btn btn-soft" aria-label={label} aria-pressed={pressed} data-on={pressed ? "true" : undefined} onClick={onClick}>
    {children}<span className="buddy-tip" role="tooltip">{label}</span>
  </button>;
}

export function BuddyMetrics({ stats, error = false }: { stats?: BuddyStats | undefined; error?: boolean }) {
  const totals = sharedExerciseTotals(stats);
  return <>
    {totals && <div className="buddy-progress-bar mt-2 grid grid-cols-3 divide-x divide-input" aria-label="Shared completed exercises">
      {totals.map((value, i) => <div key={i} className="px-1 py-1 text-center"><p className="text-base font-bold tabular-nums">{value}</p><p className="text-[0.65em] text-muted-foreground">{["today", "this week", "all-time"][i]}</p></div>)}
    </div>}
    <ul className="mt-2 list-disc space-y-0.5 pl-4 text-left text-[0.8em]">
      <li><strong className="tabular-nums">{stats ? stats.cheer_xp : "—"}</strong> XP together</li>
      <li><strong className="tabular-nums">{stats ? stats.messages_sent : "—"}</strong> messages sent</li>
      <li><strong className="tabular-nums">{stats ? messageStreak(stats.message_days) : "—"}</strong>-day streak</li>
    </ul>
    {error && <p className="mt-2 text-xs text-muted-foreground">Statistics couldn't be loaded. Try refreshing.</p>}
  </>;
}
