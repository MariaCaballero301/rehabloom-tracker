import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Pencil, Trash2, Plus, LogOut, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Plant } from "./Plant";
import { HistoryCard } from "./HistoryCard";
import { SupportAlertsPanel } from "@/components/alerts/SupportAlertsPanel";
import { positiveInteger, weeklySchedule, checkinCount, weeklyAvailability, computeXp, stageFor, stageProgress, dayKey, weekAt, completedRecords, nextExerciseStatus, sortExercises, scheduledCount, cooldownRemainingMs, gapDaysRemaining, formatWait, type ExerciseStatus, type Frequency, DAY_LABELS, XP_PER_EXERCISE, XP_PER_CHECKIN } from "@/lib/rehab";

type Exercise = Tables<"exercises">;
type Completion = Tables<"completions">;
type Checkin = Tables<"checkins">;
type Prefs = Tables<"preferences">;

export function Dashboard({ userId, email, joinedAt }: { userId: string; email: string; joinedAt: string }) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const todayKey = dayKey(today);

  const load = useCallback(async () => {
    const [ex, co, ci, pr] = await Promise.all([
      supabase.from("exercises").select("*").order("created_at"),
      supabase.from("completions").select("*"),
      supabase.from("checkins").select("*"),
      supabase.from("preferences").select("*").maybeSingle(),
    ]);
    setExercises(ex.data ?? []);
    setCompletions(co.data ?? []);
    setCheckins(ci.data ?? []);
    setPrefs(pr.data ?? { user_id: userId, partner_email: "", reminder_time: "09:00:00", reminders_enabled: true, updated_at: "" });
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  // Exercises the user undid today: undo restores eligibility so they can redo it.
  const [undone, setUndone] = useState<Set<string>>(() => new Set());
  const completed = completedRecords(completions);
  const xp = computeXp(completed.length, checkinCount(checkins));
  const stage = stageFor(xp);
  const sorted = sortExercises(exercises);
  const todays = sorted.filter((e) => scheduledCount(e, today) > 0 && (e.weekly_mode !== "interval" || e.frequency === "daily" || weeklyAvailability(e, completions, today).available || undone.has(e.id)));
  const todayCheckin = checkins.find((c) => c.day === todayKey);
  const [waitNotes, setWaitNotes] = useState<Record<string, string>>({});

  function blockReason(ex: Exercise, occurrence: number): string | null {
    const mine = completed.filter((c) => c.exercise_id === ex.id);
    if (ex.frequency === "daily") {
      const last = mine.filter((c) => c.day === todayKey && c.occurrence !== occurrence)
        .map((c) => c.created_at).sort().at(-1);
      const ms = cooldownRemainingMs(last, ex.cooldown_minutes);
      return ms > 0 ? `Please wait ${formatWait(ms)} before the next occurrence.` : null;
    }
    if (ex.weekly_mode === "days" || undone.has(ex.id)) return null;
    const available = weeklyAvailability(ex, completions, today);
    if (available.count >= ex.occurrences && !mine.some((c) => c.day === todayKey)) return "All weekly occurrences are complete. Your next week starts Sunday.";
    const lastDay = mine.filter((c) => c.day < todayKey).map((c) => c.day).sort().at(-1);
    const d = gapDaysRemaining(lastDay, ex.gap_days, todayKey);
    return d > 0 ? `Please wait ${d} more day${d === 1 ? "" : "s"} before doing this again.` : null;
  }

  async function track(ex: Exercise, day: string, requested: ExerciseStatus, occurrence = 1): Promise<void> {
    if (saving || scheduledCount(ex, today) === 0) return;
    const existing = completions.find((c) => c.exercise_id === ex.id && c.day === day && c.occurrence === occurrence);
    const status = nextExerciseStatus(existing?.status, requested);
    if (day !== todayKey && status !== null) return; // past/future days: undo only
    if (status === "complete") {
      const reason = blockReason(ex, occurrence);
      setWaitNotes((n) => ({ ...n, [ex.id]: reason ?? "" }));
      if (reason) return;
    }
    setSaving(true);
    try {
      const { error } = status === null
        ? await supabase.from("completions").delete().eq("exercise_id", ex.id).eq("day", day).eq("occurrence", occurrence)
        : await supabase.from("completions").upsert({ exercise_id: ex.id, day, occurrence, status, created_at: new Date().toISOString() }, { onConflict: "exercise_id,day,occurrence" });
      if (error) return void toast.error(error.message);
      if (status === null) setUndone((u) => new Set(u).add(ex.id));
      if (status === "complete") toast.success(`+${XP_PER_EXERCISE} XP — nice work!`);
      else toast.success(status === "skip" ? "Skipped for today" : "Exercise reset");
      await load();
    } finally {
      setSaving(false);
    }
  }

  function toggleToday(ex: Exercise) {
    const total = scheduledCount(ex, today);
    const doneOcc = completed.filter((c) => c.exercise_id === ex.id && c.day === todayKey).map((c) => c.occurrence);
    const next = Array.from({ length: total }, (_, i) => i + 1).find((o) => !doneOcc.includes(o));
    if (next) return track(ex, todayKey, "complete", next);
    return track(ex, todayKey, "complete", Math.max(...doneOcc));
  }

  if (loading) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <h1 className="text-2xl text-primary sm:text-3xl">Rehabloom</h1>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">{email}</span>
          <button className="btn-soft" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <p className="mb-5 rounded-2xl bg-secondary/70 px-4 py-2 text-xs text-secondary-foreground">
        Rehabloom helps you follow your therapist's plan. It doesn't give medical advice. If pain increases, stop and contact your physical therapist.
      </p>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="glass flex flex-col items-center p-6 text-center lg:col-span-3" aria-labelledby="plant-h">
          <h2 id="plant-h" className="text-xl">Your plant</h2>
          <Plant stage={stage.index} size="lg" />
          <p className="font-bold">{stage.name}</p>
          <p className="text-2xl font-extrabold text-success">{xp} XP</p>
          {stage.nextAt !== null ? (
            <>
              <div className="mt-2 h-3 w-full max-w-md overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={xp - stage.min} aria-valuemin={0} aria-valuemax={stage.nextAt - stage.min}>
                <div className="h-full rounded-full bg-success" style={{ width: `${stageProgress(xp) * 100}%` }} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{stage.nextAt - xp} XP to next stage</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Fully grown!</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            +{XP_PER_EXERCISE} per exercise, +{XP_PER_CHECKIN} per check-in (rest days included). Pain level never changes XP.
          </p>
        </section>

        <section className="glass p-5 lg:col-span-2" aria-labelledby="today-h">
          <h2 id="today-h" className="text-xl">Today's exercises</h2>
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {todayCheckin && todayCheckin.status !== "normal" && (
            <p className="mt-3 rounded-xl bg-accent px-3 py-2 text-sm text-accent-foreground">
              You marked today as {todayCheckin.status === "rest" ? "a rest day" : "unable to complete"}. That's okay — listening to your body counts.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {todays.length === 0 && (
              <li className="text-sm text-muted-foreground">No exercises scheduled today. Add your prescribed exercises below.</li>
            )}
            {todays.map((ex) => {
              const total = scheduledCount(ex, today);
              const count = completed.filter((c) => c.exercise_id === ex.id && c.day === todayKey).length;
              const done = count >= total;
              return (
                <li key={ex.id}>
                  <label className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3 transition ${done ? "bg-accent/70" : "bg-card"}`}>
                    <input type="checkbox" className="sr-only" checked={done} disabled={saving} onChange={() => toggleToday(ex)} />
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-success bg-card text-success" : "bubble border-transparent"}`} aria-hidden>
                      {done && <Check className="h-5 w-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block font-bold ${done ? "line-through opacity-70" : ""}`}>{ex.name}</span>
                      <span className="block text-sm text-muted-foreground">{ex.reps}{total > 1 ? ` · ${count}/${total} today` : ""}</span>
                      {ex.notes && <span className="block text-xs text-muted-foreground">{ex.notes}</span>}
                      {waitNotes[ex.id] && <span className="block text-xs font-semibold text-destructive">{waitNotes[ex.id]}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>

        <CheckinCard existing={todayCheckin} todayKey={todayKey} onSaved={load} />
        <HistoryCard exercises={exercises} completions={completed} checkins={checkins} joinedAt={joinedAt} />
        <ExerciseManager exercises={sorted} completions={completions} todayKey={todayKey} saving={saving} waitNotes={waitNotes} undone={undone} onTrack={track} onChange={load} />
        {prefs && <SettingsCard prefs={prefs} email={email} onSaved={load} />}
        <SupportAlertsPanel userId={userId} />
      </div>
    </div>
  );
}

function CheckinCard({ existing, todayKey, onSaved }: { existing: Checkin | undefined; todayKey: string; onSaved: () => void }) {
  const [pain, setPain] = useState(existing?.pain ?? 0);
  const [motivation, setMotivation] = useState(existing?.motivation ?? 3);
  const [status, setStatus] = useState<string>(existing?.status ?? "normal");

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function save(): Promise<void> {
    if (submitting) return;
    setSubmitting(true);
    const { error } = await supabase.from("checkins").upsert(
      { day: todayKey, pain, motivation, status },
      { onConflict: "user_id,day" },
    );
    setSubmitting(false);
    if (error) return void toast.error(error.message);
    toast.success(existing || justSaved ? "Check-in updated" : `Checked in — +${XP_PER_CHECKIN} XP`);
    setJustSaved(true);
    setEditing(false);
    onSaved();
  }

  if ((existing || justSaved) && !editing) return (
    <section className="glass self-start border-success bg-accent p-5 text-accent-foreground" aria-labelledby="ci-h">
      <h2 id="ci-h" className="text-xl">Daily check-in</h2>
      <div className="mt-2 flex items-center gap-2" role="status">
        <Check className="h-5 w-5" /><span className="font-bold">Saved</span>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Edit daily check-in" title="Edit daily check-in" onClick={() => {
          setPain(existing?.pain ?? pain); setMotivation(existing?.motivation ?? motivation); setStatus(existing?.status ?? status); setEditing(true);
        }}><Pencil /></Button>
      </div>
    </section>
  );

  return (
    <section className="glass self-start p-5" aria-labelledby="ci-h">
      <h2 id="ci-h" className="text-xl">Daily check-in</h2>
      <label className="mt-3 block text-sm font-semibold">
        Pain level: <span className="text-primary">{pain}/10</span>
        <input type="range" min={0} max={10} value={pain} onChange={(e) => setPain(+e.target.value)} className="mt-2 w-full accent-primary" />
      </label>
      {pain >= 7 && (
        <p className="mt-1 text-xs text-destructive">High pain — consider resting and contacting your physical therapist.</p>
      )}
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Motivation</legend>
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((m) => (
            <Button variant="outline" key={m} type="button" aria-pressed={motivation === m} onClick={() => setMotivation(m)}
              className={`h-10 flex-1 rounded-full border font-bold ${motivation === m ? "btn-aqua min-h-0 p-0" : "bg-card"}`}>
              {m}
            </Button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-3">
        <legend className="text-sm font-semibold">Today</legend>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-sm">
          {([["normal", "On track"], ["rest", "Rest day"], ["unable", "Unable"]] as const).map(([v, l]) => (
            <Button variant="outline" key={v} type="button" aria-pressed={status === v} onClick={() => setStatus(v)}
              className={`min-h-10 rounded-full border px-2 font-semibold ${status === v ? "btn-aqua btn-leaf min-h-10 px-2" : "bg-card"}`}>
              {l}
            </Button>
          ))}
        </div>
      </fieldset>
      <Button className="btn-aqua mt-4 w-full" onClick={save} disabled={submitting}>{existing || justSaved ? "Update check-in" : "Save check-in"}</Button>
    </section>
  );
}

function ExerciseManager({ exercises, completions, todayKey, saving, waitNotes, undone, onTrack, onChange }: {
  undone: Set<string>;
  exercises: Exercise[];
  completions: Completion[];
  todayKey: string;
  saving: boolean;
  waitNotes: Record<string, string>;
  onTrack: (exercise: Exercise, day: string, status: ExerciseStatus, occurrence?: number) => Promise<void>;
  onChange: () => void;
}) {
  const [editing, setEditing] = useState<Partial<Exercise> | null>(null);
  const week = weekAt(0);
  const today = new Date();

  async function save(): Promise<void> {
    if (!editing?.name?.trim()) return void toast.error("Please enter the exercise name");
    const frequency = (editing.frequency ?? "weekly") as Frequency;
    if (frequency === "weekly" && editing.weekly_mode !== "interval" && !editing.days?.length) return void toast.error("Pick at least one day");
    const payload = {
      name: editing.name.trim(), reps: editing.reps ?? "", notes: editing.notes ?? "", frequency,
      days: frequency === "daily" ? [0, 1, 2, 3, 4, 5, 6] : editing.weekly_mode === "interval" ? [] : editing.days ?? [],
      weekly_mode: editing.weekly_mode ?? "days",
      occurrences: frequency === "daily" ? Math.min(10, positiveInteger(editing.occurrences ?? 1)) : editing.weekly_mode === "interval" ? Math.min(6, positiveInteger(editing.occurrences ?? 1)) : 1,
      cooldown_minutes: Math.max(0, Math.round(editing.cooldown_minutes ?? 0)),
      gap_days: frequency === "weekly" && editing.weekly_mode === "interval" ? positiveInteger(editing.gap_days ?? 1) : 0,
      ...(frequency === "weekly" ? weeklySchedule(editing.weekly_mode ?? "days", editing.days ?? [], editing.occurrences ?? 1, editing.gap_days ?? 1) : {}),
    };
    const { error } = editing.id
      ? await supabase.from("exercises").update(payload).eq("id", editing.id)
      : await supabase.from("exercises").insert(payload);
    if (error) return void toast.error(error.message);
    setEditing(null);
    onChange();
  }

  async function remove(id: string): Promise<void> {
    if (!confirm("Remove this exercise?")) return;
    await supabase.from("exercises").delete().eq("id", id);
    onChange();
  }

  const freq = (editing?.frequency ?? "weekly") as Frequency;
  const cdH = Math.floor((editing?.cooldown_minutes ?? 0) / 60);
  const cdM = (editing?.cooldown_minutes ?? 0) % 60;

  function editPanel() {
    if (!editing) return null;
    return (
        <div className="mt-4 space-y-3 rounded-2xl border bg-card p-4">
          <label className="block text-sm font-semibold">Exercise name
            <input className="field mt-1" value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Heel slides" />
          </label>
          <label className="block text-sm font-semibold">Repetitions / sets
            <input className="field mt-1" value={editing.reps ?? ""} onChange={(e) => setEditing({ ...editing, reps: e.target.value })} placeholder="e.g. 3 sets of 10" />
          </label>
          <label className="block text-sm font-semibold">Therapist's notes (optional)
            <input className="field mt-1" value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          </label>
          <fieldset>
            <legend className="text-sm font-semibold">Frequency</legend>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {(["daily", "weekly"] as const).map((f) => (
                <Button variant="outline" key={f} type="button" aria-pressed={freq === f} onClick={() => setEditing({ ...editing, frequency: f, occurrences: 1 })}
                  className={`h-auto min-h-10 whitespace-normal rounded-full border font-bold ${freq === f ? "btn-aqua min-h-10" : "btn-soft"}`}>
                  {f === "daily" ? "Daily Occurrence" : "Weekly Occurrence"}
                </Button>
              ))}
            </div>
          </fieldset>
          {freq === "daily" ? (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">Times per day</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <Button variant="outline" key={n} type="button" aria-pressed={editing.occurrences === n} onClick={() => setEditing({ ...editing, occurrences: n })}
                      className={`h-10 w-10 rounded-full border text-sm font-bold ${editing.occurrences === n ? "btn-aqua btn-leaf min-h-0 p-0" : "btn-soft min-h-0 p-0"}`}>
                      {n}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="text-sm font-semibold">Time between occurrences</legend>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <input type="number" min={0} max={23} className="field w-20" aria-label="Hours" value={cdH} onChange={(e) => setEditing({ ...editing, cooldown_minutes: Math.max(0, +e.target.value) * 60 + cdM })} /> hours
                  <input type="number" min={0} max={59} className="field w-20" aria-label="Minutes" value={cdM} onChange={(e) => setEditing({ ...editing, cooldown_minutes: cdH * 60 + Math.min(59, Math.max(0, +e.target.value)) })} /> minutes
                </div>
              </fieldset>
            </>
          ) : (
            <>
              <fieldset>
                <legend className="text-sm font-semibold">Weekly schedule</legend>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {([["days", "Scheduled days"], ["interval", "Occurrences"]] as const).map(([mode, label]) => (
                    <Button key={mode} variant="outline" className={`h-auto min-h-11 whitespace-normal rounded-full ${editing.weekly_mode === mode ? "btn-aqua" : "btn-soft"}`} aria-pressed={editing.weekly_mode === mode} onClick={() => setEditing({ ...editing, weekly_mode: mode, occurrences: 1, gap_days: mode === "interval" ? 1 : 0, days: mode === "interval" ? [] : [today.getDay()] })}>{label}</Button>
                  ))}
                </div>
              </fieldset>
              {editing.weekly_mode === "interval" ? (
                <>
                  <fieldset>
                    <legend className="text-sm font-semibold">Times per week</legend>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                        <Button key={n} variant="outline" aria-pressed={editing.occurrences === n} onClick={() => setEditing({ ...editing, occurrences: n })} className={`h-10 w-10 rounded-full p-0 font-bold ${editing.occurrences === n ? "btn-aqua btn-leaf min-h-0 p-0" : "btn-soft min-h-0 p-0"}`}>{n}</Button>
                      ))}
                    </div>
                  </fieldset>
                  <label className="block text-sm font-semibold">Days in between
                    <input type="number" min={1} step={1} aria-label="Days in between" className="field mt-1 w-24" value={editing.gap_days ?? 1} onChange={(e) => setEditing({ ...editing, gap_days: positiveInteger(+e.target.value) })} />
                  </label>
                </>
              ) : (
                <fieldset>
                  <legend className="text-sm font-semibold">Days of the week</legend>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {DAY_LABELS.map((label, i) => {
                      const on = editing.days?.includes(i);
                      return <Button key={label} variant="outline" aria-pressed={on} onClick={() => setEditing({ ...editing, days: on ? (editing.days ?? []).filter((d) => d !== i) : [...(editing.days ?? []), i].sort() })} className={`h-10 w-12 rounded-full p-0 font-bold ${on ? "btn-aqua min-h-0 p-0" : "btn-soft min-h-0 p-0"}`}>{label}</Button>;
                    })}
                  </div>
                </fieldset>
              )}
            </>
          )}
          <div className="flex gap-2">
            <Button className="btn-aqua" onClick={save}>Save</Button>
            <Button variant="outline" className="btn-soft" onClick={() => setEditing(null)}><X className="h-4 w-4" /> Cancel</Button>
          </div>
        </div>
    );
  }

  return (
    <section className="glass p-5 lg:col-span-2" aria-labelledby="ex-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="ex-h" className="text-xl">My prescribed exercises</h2>
        <div className="flex items-center gap-2">
          <Button className="btn-aqua btn-leaf" onClick={() => setEditing({ name: "", reps: "", notes: "", frequency: "weekly", weekly_mode: "days", days: [1, 2, 3, 4, 5], occurrences: 1, cooldown_minutes: 0, gap_days: 0 })}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Enter exercises exactly as your therapist prescribed them.</p>

      {editing && !editing.id && editPanel()}

      <ul className="mt-4 divide-y divide-input">
        {exercises.length === 0 && <li className="py-2 text-sm text-muted-foreground">No exercises yet.</li>}
        {exercises.map((ex) => {
          const daily = ex.frequency === "daily";
          const interval = !daily && ex.weekly_mode === "interval";
          const avail = weeklyAvailability(ex, completions, today);
          const available = undone.has(ex.id) ? { ...avail, gap: 0, available: true } : avail;
          const scheduledToday = scheduledCount(ex, today) > 0 && (!interval || available.available);
          const lines = daily
            ? Array.from({ length: ex.occurrences }, (_, i) => ({ key: `o${i + 1}`, label: `Occurrence ${i + 1}`, day: todayKey, occ: i + 1, date: new Date() }))
            : [];
          return (
            <li key={ex.id} className="py-4">
              <div className="flex flex-wrap items-center gap-2">
                <div className={`group relative min-w-0 flex-1 ${scheduledToday ? "" : "opacity-60"}`}>
                  <p className="break-words font-bold">
                    {ex.name}
                    {daily && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 align-middle text-[11px] font-bold text-accent-foreground">Daily</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {ex.reps} · {daily ? `${ex.occurrences}× per day${ex.cooldown_minutes ? `, ${formatWait(ex.cooldown_minutes * 60_000)} apart` : ""}` : interval ? `${ex.occurrences}× per week, ${ex.gap_days} day${ex.gap_days === 1 ? "" : "s"} in between · ${available.count}/${ex.occurrences} this week` : `${ex.days.length === 7 ? "Every day" : ex.days.map((d) => DAY_LABELS[d]).join(", ")}${ex.gap_days ? `, ${ex.gap_days} day${ex.gap_days === 1 ? "" : "s"} in between` : ""}`}
                  </p>
                  {ex.notes && <p className="break-words text-xs text-muted-foreground">{ex.notes}</p>}
                  {!scheduledToday && (
                    <span className="pointer-events-none absolute left-0 top-full z-10 mt-1 hidden rounded-xl border bg-popover px-2 py-1 text-xs text-popover-foreground shadow group-hover:block">
                      It's not the right day yet! Check this off when you complete it on the scheduled date.
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button variant="outline" size="icon" className="rounded-full" title="Edit exercise" aria-label={`Edit ${ex.name}`} onClick={() => setEditing(ex)}><Pencil /></Button>
                  <Button variant="outline" size="icon" className="rounded-full text-destructive" title="Remove exercise" aria-label={`Remove ${ex.name}`} onClick={() => remove(ex.id)}><Trash2 /></Button>
                </div>
              </div>
              {editing?.id === ex.id && editPanel()}
              {interval && !scheduledToday && <p className="mt-2 text-xs text-muted-foreground">{available.gap ? `Please wait ${available.gap} more day${available.gap === 1 ? "" : "s"}.` : "All weekly occurrences are complete."} Upcoming</p>}
              {waitNotes[ex.id] && <p className="mt-2 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-secondary-foreground" role="status">{waitNotes[ex.id]}</p>}
              {!daily && (
                <div className="mt-3 rounded-2xl border bg-card/60 p-3">
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="group" aria-label={`${ex.name} schedule this week`}>
                     {week.map((d) => {
                      const key = dayKey(d);
                      const isToday = key === todayKey;
                      const past = key < todayKey;
                      const future = key > todayKey;
                      const scheduled = interval ? true : ex.days.includes(d.getDay());
                      const record = completions.find((c) => c.exercise_id === ex.id && c.day === key);
                      const status = record?.status;
                      const blocked = isToday && scheduled && !status && interval && !undone.has(ex.id) && !weeklyAvailability(ex, completions, d).available;
                      const label = `${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}${isToday ? ", today" : ""}${past ? ", past" : future ? ", upcoming" : ""}${blocked ? ", waiting period — not available yet" : ""}${status === "complete" ? ", completed" : status === "skip" ? ", skipped" : ""}`;
                      return (
                        <div key={key} className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{DAY_LABELS[d.getDay()]}</span>
                          <button
                            type="button"
                            disabled={saving || !scheduled || blocked || (isToday ? !scheduledToday : !status)}
                            aria-label={label}
                            aria-pressed={status === "complete"}
                            title={blocked ? "Please wait one more day before doing this exercise." : past ? (status ? "Undo available below" : "Past — can no longer be edited") : future ? "Upcoming — it's not this day yet! Check this off when you complete it on the appropriate date." : isToday ? (status ? "Right-click to undo" : "Mark as complete") : label}
                            onClick={() => isToday && !status && !blocked && onTrack(ex, key, "complete", 1)}
                            onContextMenu={(e) => { e.preventDefault(); if (status && (isToday || past)) onTrack(ex, key, status as ExerciseStatus, 1); }}
                            className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 text-[10px] font-bold transition sm:h-11 sm:w-11 ${
                              status === "complete" ? "border-success bg-card text-success"
                              : status === "skip" ? "border-warning bg-warning/25 text-foreground"
                              : isToday && scheduled && !blocked ? "bubble border-transparent text-primary"
                              : "border-input bg-muted text-muted-foreground"
                            } ${!isToday || !scheduled || blocked ? "cursor-not-allowed opacity-60" : ""}`}
                          >
                            {(past || blocked) && status !== "complete" && status !== "skip" && <span aria-hidden className="absolute h-0.5 w-8 rotate-45 rounded bg-muted-foreground/60" />}
                            {status === "complete" ? <Check className="h-5 w-5" /> : status === "skip" ? <span className="leading-none">Skipped</span> : <span className={past || blocked ? "opacity-0" : ""}>{d.getDate()}</span>}
                          </button>
                          {isToday && scheduled && scheduledToday && !status && !blocked && (
                            <button type="button" disabled={saving} onClick={() => onTrack(ex, key, "skip", 1)}
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground underline hover:text-foreground">
                              Skip
                            </button>
                          )}
                          {status && (isToday || past) && (
                            <button type="button" disabled={saving} onClick={() => onTrack(ex, key, status as ExerciseStatus, 1)}
                              className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-muted-foreground underline hover:text-foreground">
                              Undo
                            </button>
                          )}
                          {isToday && <span className="text-[10px] font-bold text-primary">Today</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {lines.length > 0 && (
                <ul className="mt-2 space-y-1 rounded-2xl border bg-card/60 p-2 text-xs">
                  {lines.map((line) => {
                    const record = completions.find((c) => c.exercise_id === ex.id && c.day === line.day && c.occurrence === line.occ);
                    const isToday = line.day === todayKey;
                    const canTrack = isToday && scheduledToday;
                    const note = isToday && !scheduledToday ? "Upcoming" : line.day > todayKey ? "Upcoming" : line.day < todayKey ? "Past" : null;
                    return (
                      <li key={line.key} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-1 ${canTrack ? "" : "opacity-50"}`}
                        title={isToday ? undefined : `It's not ${line.date.toLocaleDateString("en-US", { weekday: "long" })} yet! Check this off when you complete it on the appropriate date.`}>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{line.label}</span>
                          {isToday && !daily && <span className="font-bold text-primary">Today</span>}
                          {note && <span className="text-muted-foreground">{note}</span>}
                          {record && <span className={record.status === "complete" ? "font-semibold text-success" : "text-muted-foreground"}>{record.status === "complete" ? "Completed" : "Skipped"}</span>}
                        </span>
                        <span className="flex gap-1">
                          <Button variant="outline" type="button" disabled={saving || !canTrack} aria-pressed={record?.status === "complete"} onClick={() => onTrack(ex, line.day, "complete", line.occ)}
                            className={`rounded-full border px-2.5 py-1 font-semibold disabled:cursor-not-allowed ${record?.status === "complete" ? "border-success bg-accent text-accent-foreground" : "bg-card"}`}>
                            Mark as complete
                          </Button>
                          <Button variant="outline" type="button" disabled={saving || !canTrack} aria-pressed={record?.status === "skip"} onClick={() => onTrack(ex, line.day, "skip", line.occ)}
                            className={`rounded-full border px-2.5 py-1 font-semibold disabled:cursor-not-allowed ${record?.status === "skip" ? "border-primary bg-secondary text-secondary-foreground" : "bg-card"}`}>
                            Skip for today
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SettingsCard({ prefs, email, onSaved }: { prefs: Prefs; email: string; onSaved: () => void }) {
  const [partner, setPartner] = useState(prefs.partner_email);
  const [time, setTime] = useState(prefs.reminder_time.slice(0, 5) || "09:00");
  const [enabled, setEnabled] = useState(prefs.reminders_enabled);
  const [preview, setPreview] = useState(false);

  async function save(): Promise<void> {
    const { error } = await supabase.from("preferences").upsert({
      partner_email: partner.trim(), reminder_time: time, reminders_enabled: enabled, updated_at: new Date().toISOString(),
    });
    if (error) return void toast.error(error.message);
    toast.success("Settings saved");
    onSaved();
  }

  const sample = useMemo(() => ({
    to: email,
    cc: partner || "(no partner set)",
    subject: "Rehabloom reminder: your exercises for today",
    body: `Hi there,\n\nThis is your ${time} reminder to do the exercises your physical therapist prescribed. Open Rehabloom to check them off and water your plant.\n\nIf you're in pain or need rest today, it's okay to log a rest day.\n\n— Rehabloom`,
  }), [email, partner, time]);

  return (
    <section className="glass p-5" aria-labelledby="set-h">
      <h2 id="set-h" className="text-xl">Reminders</h2>
      <label className="mt-3 block text-sm font-semibold">Accountability partner email
        <input type="email" className="field mt-1" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="friend@example.com" />
      </label>
      <label className="mt-3 block text-sm font-semibold">Reminder time
        <input type="time" className="field mt-1" value={time} onChange={(e) => setTime(e.target.value)} />
      </label>
      <label className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold">
        Reminders {enabled ? "on" : "paused"}
        <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled(!enabled)}
          className={`relative h-8 w-14 rounded-full border transition ${enabled ? "bg-success" : "bg-muted"}`}>
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-card shadow transition-all ${enabled ? "left-7" : "left-0.5"}`} />
        </button>
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-aqua" onClick={save}>Save</button>
        <button className="btn-soft" onClick={() => { setPreview(true); toast.info(enabled ? "Test reminder simulated — no email was sent." : "Reminders are paused, but here's a preview."); }}>
          <Bell className="h-4 w-4" /> Test reminder
        </button>
      </div>
      {preview && (
        <div className="mt-4 rounded-2xl border bg-popover p-3 text-sm" aria-live="polite">
          <p className="mb-1 text-xs font-bold uppercase text-muted-foreground">Sample email (simulation only)</p>
          <p><b>To:</b> {sample.to}</p>
          <p><b>CC:</b> {sample.cc}</p>
          <p><b>Subject:</b> {sample.subject}</p>
          <p className="mt-2 whitespace-pre-line text-muted-foreground">{sample.body}</p>
        </div>
      )}
    </section>
  );
}
