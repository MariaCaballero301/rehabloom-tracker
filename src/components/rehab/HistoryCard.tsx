import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
import { DAY_LABELS, dayKey, historyPeriod, monthWeeks, scheduledCount, weekAt, weekRange } from "@/lib/rehab";

type Exercise = Tables<"exercises">;
type Completion = Tables<"completions">;
type Checkin = Tables<"checkins">;

export function HistoryCard({ exercises, completions, allCompletions, checkins, joinedAt }: { exercises: Exercise[]; completions: Completion[]; allCompletions?: Completion[]; checkins: Checkin[]; joinedAt: string }) {
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [monthly, setMonthly] = useState(false);
  const today = new Date();
  const todayKey = dayKey(today);
  const week = weekAt(offset, today);
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const activityDays = completions.map((c) => c.day);
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const monthPeriod = historyPeriod([monthStart, monthEnd], joinedAt, activityDays, today);

  function navigate(direction: number) {
    if (monthly) setMonth(new Date(month.getFullYear(), month.getMonth() + direction, 1));
    else setOffset((value) => value + direction);
  }

  function renderDay(d: Date, compact: boolean, showDayLabel: boolean) {
    const key = dayKey(d);
    const beforeJoining = key < dayKey(new Date(joinedAt));
    const future = key > todayKey;
    const outsideMonth = monthly && d.getMonth() !== month.getMonth();
    const scheduled = exercises.filter((e) => dayKey(new Date(e.created_at)) <= key).reduce((sum, e) => sum + scheduledCount(e, d), 0);
    const done = completions.filter((c) => c.day === key).length;
    const ci = checkins.find((c) => c.day === key);
    const label = beforeJoining ? "—" : future ? "—" : ci?.status === "rest" ? "Rest" : ci?.status === "unable" ? "Unable" : scheduled ? `${done}/${scheduled}` : done ? `${done}` : "—";
    const pct = scheduled ? Math.min(100, Math.round(done / scheduled * 100)) : done ? 100 : 0;
    const note = beforeJoining ? "No Data Available" : future ? "Upcoming" : done ? `${done} completed` : "No Action Taken";
    return (
      <button type="button" key={key} onClick={() => setSelected(selected === key ? null : key)} aria-expanded={selected === key} aria-controls="day-detail" className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl p-0.5 text-center transition hover:bg-accent/50 ${selected === key ? "bg-accent ring-2 ring-primary" : ""} ${outsideMonth || future || beforeJoining ? "opacity-50" : ""}`} title={`${d.toDateString()}: ${note}. Tap to see exercises.`}>
        {showDayLabel && <span className="text-xs font-semibold text-muted-foreground">{DAY_LABELS[d.getDay()]}</span>}
        <span className={`text-xs ${key === todayKey ? "font-bold text-primary" : "text-muted-foreground"}`}>{d.getDate()}</span>
        <div className={`relative flex w-full items-end overflow-hidden rounded-xl border bg-card ${compact ? "h-10" : "h-20"}`} aria-label={`${d.toDateString()}: ${note}`}>
          <div className={`w-full ${ci && ci.status !== "normal" ? "bg-secondary" : "bg-success"}`} style={{ height: beforeJoining || future ? "0%" : ci && ci.status !== "normal" ? "100%" : `${pct}%` }} />
        </div>
        <span className="text-[11px] font-bold">{label}</span>
      </button>
    );
  }

  function renderDetail(days: Date[]) {
    const d = days.find((x) => dayKey(x) === selected);
    if (!d) return null;
    const key = dayKey(d);
    const list = exercises.filter((e) => scheduledCount(e, d) > 0);
    const records = (allCompletions ?? completions).filter((c) => c.day === key);
    const ci = checkins.find((c) => c.day === key);
    return (
      <div id="day-detail" className="mt-3 rounded-2xl border bg-popover p-3 text-left text-sm" role="region" aria-label={`Exercises for ${d.toDateString()}`}>
        <p className="font-bold">{d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        {ci && ci.status !== "normal" && <p className="text-xs text-muted-foreground">Marked as {ci.status === "rest" ? "a rest day" : "unable to complete"}.</p>}
        {list.length === 0 ? (
          <p className="mt-1 text-muted-foreground">No prescribed exercises scheduled.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {list.map((e) => {
              const mine = records.filter((r) => r.exercise_id === e.id);
              const total = scheduledCount(e, d);
              const done = mine.filter((r) => r.status === "complete").length;
              const skipped = mine.some((r) => r.status === "skip");
              const state = done >= total ? "Done" : skipped ? "Skipped" : key > todayKey ? "Upcoming" : key === todayKey ? "To do" : "Not done";
              const tone = state === "Done" ? "text-success" : state === "Skipped" ? "text-warning-foreground" : "text-muted-foreground";
              return (
                <li key={e.id} className="flex items-start justify-between gap-2 rounded-xl bg-card px-3 py-2">
                  <span className="min-w-0">
                    <span className="block font-semibold">{e.name}</span>
                    <span className="block text-xs text-muted-foreground">{e.reps}{total > 1 ? ` · ${total} times` : ""}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-bold ${tone}`}>{state}{total > 1 && state !== "Upcoming" ? ` ${done}/${total}` : ""}</span>
                </li>
              );
            })}
          </ul>
        )}
        <Link to="/" hash="prescribed" className="mt-2 inline-block text-xs font-semibold text-primary underline">Manage in Prescribed exercises</Link>
      </div>
    );
  }

  function renderWeek(days: Date[]) {
    const period = historyPeriod(days, joinedAt, activityDays, today);
    return (
      <div key={dayKey(days[0] ?? today)} className="mt-3">
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold text-muted-foreground">{period.temporal}</span>
          {period.empty && <span className="text-muted-foreground">{period.empty}</span>}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-3">
          {days.map((d) => renderDay(d, false, true))}
        </div>
        {renderDetail(days)}
      </div>
    );
  }

  return (
    <section className="glass min-w-0 p-5" aria-labelledby="hist-h">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label={monthly ? "Previous month" : "Previous week"} title={monthly ? "Previous month" : "Previous week"} onClick={() => navigate(-1)}><ChevronLeft /></Button>
        <div className="min-w-0 text-center">
          <h2 id="hist-h" className="text-xl">{monthly ? month.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "Last 7 days"}</h2>
          {!monthly && <p className="mt-1 text-sm text-muted-foreground">{weekRange(week)}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Tap a day to see its exercises</p>
        </div>
        <Button variant="outline" size="icon" className="shrink-0 rounded-full" aria-label={monthly ? "Next month" : "Next week"} title={monthly ? "Next month" : "Next week"} onClick={() => navigate(1)}><ChevronRight /></Button>
      </div>
      {monthly ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">{monthPeriod.temporal === "This week" ? "This month" : monthPeriod.temporal}</span>
            {monthPeriod.empty && <span className="text-muted-foreground">{monthPeriod.empty}</span>}
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-3">
            {DAY_LABELS.map((label) => <span key={label} className="text-center text-xs font-semibold text-muted-foreground">{label}</span>)}
            {monthWeeks(month).flat().map((d) => renderDay(d, true, false))}
          </div>
          {renderDetail(monthWeeks(month).flat())}
        </div>
      ) : renderWeek(week)}
      <Button variant="outline" className="btn-soft mt-4 w-full" onClick={() => {
        if (!monthly) { const selected = week[0] ?? today; setMonth(new Date(selected.getFullYear(), selected.getMonth(), 1)); }
        setMonthly((value) => !value);
      }}><CalendarDays />{monthly ? "Weekly View" : "Monthly View"}</Button>
    </section>
  );
}
