import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, FileUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { analyzeTherapyPlan } from "@/lib/plan-import.functions";
import { DEMO_PT_NOTE, MAX_PLAN_BYTES, PLAN_MIMES, importedExercisePayload, inferImportSchedule, pickedSchedule, scheduleLabel, confirmDisabledReason, isReadyToAdd, type ImportedExercise, type ImportSchedule } from "@/lib/plan-import";

type Pick = { frequency?: "daily" | "weekly"; occurrences?: number; days: number[] };
type Row = { exercise: ImportedExercise; schedule: ImportSchedule | null; selected: boolean; pick: Pick; clear: boolean };
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result.split(",")[1] ?? "") : reject(new Error("Document could not be read."));
    reader.onerror = () => reject(new Error("Document could not be read."));
    reader.readAsDataURL(file);
  });
}

export function PlanImportDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const analyze = useServerFn(analyzeTherapyPlan);
  const picker = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [demo, setDemo] = useState(false);
  const [consent, setConsent] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [analyzed, setAnalyzed] = useState(false);
  function invalidate() { setRows([]); setAnalyzed(false); setReviewed(false); setError(""); }
  function addFiles(incoming: File[]) {
    const next = [...files, ...incoming];
    if (next.length > 10 || next.reduce((sum, file) => sum + file.size, 0) > MAX_PLAN_BYTES) return setError("Choose up to 10 documents, totaling 20 MB or less.");
    if (next.some((file) => !PLAN_MIMES.some((mime) => mime === file.type))) return setError("Use PDF, JPG, PNG or WebP files.");
    invalidate(); setFiles(next);
  }
  async function run() {
    if (busy || !consent || (!text.trim() && !files.length)) return;
    setBusy(true); invalidate();
    try {
      const documents = await Promise.all(files.map(async (file) => ({ mime: file.type as typeof PLAN_MIMES[number], data: await readFile(file) })));
      const result = await analyze({ data: { text, files: documents } });
      setRows(result.exercises.map((exercise) => {
        const schedule = inferImportSchedule(exercise.frequency);
        const pick: Pick = schedule ? (schedule.frequency === "daily" ? { frequency: "daily", occurrences: schedule.occurrences, days: [] } : { frequency: "weekly", days: schedule.days }) : { days: [] };
        return { exercise, schedule, selected: true, pick, clear: !!schedule };
      }));
      setAnalyzed(true);
    } catch (e) { setError(e instanceof Error ? e.message : "The plan couldn't be analyzed. Nothing was saved."); }
    finally { setBusy(false); }
  }
  function edit(i: number, patch: Partial<ImportedExercise>) {
    setReviewed(false);
    setRows((all) => all.map((r, index) => index === i ? { ...r, exercise: { ...r.exercise, ...patch } } : r));
  }
  async function save() {
    const selected = rows.filter((row) => row.selected);
    if (saving || !reviewed || !selected.length || selected.some((row) => !isReadyToAdd({ name: row.exercise.name, schedule: row.schedule }))) return;
    setSaving(true); setError("");
    try {
      const payload = selected.map((row) => {
        if (!row.schedule) throw new Error("Choose the prescribed schedule for every selected exercise.");
        const result = importedExercisePayload({ ...row.exercise, name: row.exercise.name.trim() }, row.schedule);
        return { ...result, notes: demo ? `Fictional demo plan — not a prescription.\n${result.notes}` : result.notes };
      });
      const { error: saveError } = await supabase.from("exercises").insert(payload);
      if (saveError) throw new Error(saveError.message);
      onSaved(); onOpenChange(false); setFiles([]); setText(""); setDemo(false); setConsent(false); invalidate();
      toast.success(`${payload.length} exercise${payload.length === 1 ? "" : "s"} added to your schedule`);
    } catch (e) { setError(e instanceof Error ? e.message : "Exercises couldn't be saved."); }
    finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={(value) => { if (!busy && !saving) onOpenChange(value); }}>
    <DialogContent className="glass max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto p-5 sm:p-6">
      <DialogHeader><DialogTitle className="pr-6 text-xl">🤖 Gemini Therapy Plan Agent</DialogTitle><DialogDescription>Import your therapist’s existing instructions. Review every detail before saving; this is not medical advice.</DialogDescription></DialogHeader>
      <fieldset disabled={busy || saving} className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button className="btn-soft" variant="outline" onClick={() => picker.current?.click()}><FileUp className="h-4 w-4" /> Add documents</Button>
          <Button className="btn-soft whitespace-normal" variant="outline" onClick={() => { invalidate(); setFiles([]); setText(DEMO_PT_NOTE); setDemo(true); }}>⚡ Use Demo PT Note</Button>
          <input ref={picker} type="file" multiple accept={PLAN_MIMES.join(",")} className="sr-only" aria-label="Upload therapy plan documents" onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
        </div>
        <p className="text-xs text-muted-foreground">PDF, JPG, PNG or WebP · Up to 10 files · 20 MB total</p>
        {files.length > 0 && <ul className="divide-y divide-input">{files.map((file, i) => <li key={`${file.name}-${i}`} className="flex items-center gap-2 py-1 text-sm"><span className="min-w-0 flex-1 break-words">{file.name}</span><Button size="icon" variant="ghost" aria-label={`Remove ${file.name}`} title={`Remove ${file.name}`} onClick={() => { invalidate(); setFiles(files.filter((_, index) => index !== i)); }}><Trash2 className="h-4 w-4" /></Button></li>)}</ul>}
        <label className="block text-sm font-semibold">Therapist’s notes<textarea className="field mt-1 min-h-28 resize-y" maxLength={30000} value={text} placeholder="Paste your prescribed exercises here…" onChange={(e) => { invalidate(); setText(e.target.value); }} /></label>
        {demo && <p className="rounded-lg bg-warning/20 p-2 text-sm font-semibold">Fictional demo PT note — not a real prescription.</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to send these documents and notes to Google Gemini. Remove names and personal details first. Documents are not stored in Rehabloom.</span></label>
        <Button className="btn-aqua w-full" disabled={!consent || (!files.length && !text.trim())} onClick={() => void run()}>Analyze with Gemini</Button>
      </fieldset>
      {busy && <p role="status" className="flex items-center justify-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Reading your plan…</p>}
      {error && <p role="alert" className="break-words rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {analyzed && <div className="space-y-3">
        <h3 className="font-bold">Review extracted exercises</h3>
        {!rows.length && <p className="text-sm text-muted-foreground">No prescribed exercises were found. Try clearer documents or notes.</p>}
        <ul className="space-y-3">{rows.map((row, i) => <li key={i} className="rounded-lg border bg-card/80 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <input type="checkbox" aria-label={`Include ${row.exercise.name || "exercise"}`} checked={row.selected} disabled={saving} onChange={(e) => { setReviewed(false); setRows(rows.map((r, index) => index === i ? { ...r, selected: e.target.checked } : r)); }} className="accent-primary" />
            <input className="field min-w-0 flex-1 font-bold" aria-label="Exercise name" maxLength={200} value={row.exercise.name} disabled={saving} onChange={(e) => edit(i, { name: e.target.value })} />
            {isReadyToAdd({ name: row.exercise.name, schedule: row.schedule }) && <span className="shrink-0 rounded-full bg-success/20 px-2.5 py-1 text-xs font-bold text-success">✓ Ready to Add</span>}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
            <label className="text-muted-foreground">Sets<input className="field mt-1 text-foreground" maxLength={200} value={row.exercise.sets} placeholder="From your plan" disabled={saving} onChange={(e) => edit(i, { sets: e.target.value })} /></label>
            <label className="text-muted-foreground">Reps<input className="field mt-1 text-foreground" maxLength={200} value={row.exercise.reps} placeholder="From your plan" disabled={saving} onChange={(e) => edit(i, { reps: e.target.value })} /></label>
            {row.exercise.frequency && <div className="col-span-2"><span className="text-muted-foreground">Prescribed frequency</span><p className="break-words">{row.exercise.frequency}</p></div>}
            {row.exercise.notes && <div className="col-span-2"><span className="text-muted-foreground">Instructions</span><p className="whitespace-pre-wrap break-words">{row.exercise.notes}</p></div>}
          </div>
          <SchedulePicker pick={row.pick} clear={row.clear} disabled={saving} onChange={(pick) => { setReviewed(false); setRows(rows.map((r, index) => index === i ? { ...r, pick, schedule: pickedSchedule(pick) } : r)); }} schedule={row.schedule} />
        </li>)}</ul>}
        <label className="block text-sm font-semibold">Therapist’s notes<textarea className="field mt-1 min-h-28 resize-y" maxLength={30000} value={text} placeholder="Paste your prescribed exercises here…" onChange={(e) => { invalidate(); setText(e.target.value); }} /></label>
        {demo && <p className="rounded-lg bg-warning/20 p-2 text-sm font-semibold">Fictional demo PT note — not a real prescription.</p>}
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 accent-primary" checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to send these documents and notes to Google Gemini. Remove names and personal details first. Documents are not stored in Rehabloom.</span></label>
        <Button className="btn-aqua w-full" disabled={!consent || (!files.length && !text.trim())} onClick={() => void run()}>Analyze with Gemini</Button>
      </fieldset>
      {busy && <p role="status" className="flex items-center justify-center gap-2 text-sm text-primary"><Loader2 className="h-4 w-4 animate-spin" /> Reading your plan…</p>}
      {error && <p role="alert" className="break-words rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {analyzed && <div className="space-y-3">
        <h3 className="font-bold">Review extracted exercises</h3>
        {!rows.length && <p className="text-sm text-muted-foreground">No prescribed exercises were found. Try clearer documents or notes.</p>}
        <ul className="space-y-3">{rows.map((row, i) => <li key={i} className="rounded-lg border bg-card/80 p-4 shadow-sm">
          <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={row.selected} disabled={saving} onChange={(e) => { setReviewed(false); setRows(rows.map((r, index) => index === i ? { ...r, selected: e.target.checked } : r)); }} className="accent-primary" />{row.exercise.name}</label>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-muted-foreground">Sets</dt><dd>{row.exercise.sets || "Not specified"}</dd></div><div><dt className="text-muted-foreground">Reps</dt><dd>{row.exercise.reps || "Not specified"}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Prescribed frequency</dt><dd className="break-words">{row.exercise.frequency || "Not specified"}</dd></div><div className="col-span-2"><dt className="text-muted-foreground">Notes</dt><dd className="whitespace-pre-wrap break-words">{row.exercise.notes || "None provided"}</dd></div></dl>
          {row.pick ? <SchedulePicker pick={row.pick} disabled={saving} onChange={(pick) => { setReviewed(false); setRows(rows.map((r, index) => index === i ? { ...r, pick, schedule: pickedSchedule(pick) } : r)); }} schedule={row.schedule} />
            : row.schedule && <p className="mt-2 text-sm font-semibold text-primary">Schedule: {scheduleLabel(row.schedule)}</p>}
        </li>)}</ul>
        {rows.length > 0 && <>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} disabled={saving} onChange={(e) => setReviewed(e.target.checked)} className="mt-1 accent-primary" /><span>I checked the selected exercises and schedule against {demo ? "the fictional demo note" : "my therapist’s instructions"}.</span></label>
          <Button className="btn-aqua w-full whitespace-normal" disabled={saving || !!confirmDisabledReason(rows.map((r) => ({ ...r, name: r.exercise.name })), reviewed)} onClick={() => void save()}><Check className="h-4 w-4" />{saving ? "Adding…" : "Confirm & Add to Schedule"}</Button>
          {!saving && confirmDisabledReason(rows.map((r) => ({ ...r, name: r.exercise.name })), reviewed) && <p className="text-center text-sm text-muted-foreground">{confirmDisabledReason(rows.map((r) => ({ ...r, name: r.exercise.name })), reviewed)}</p>}
        </>}
      </div>}
    </DialogContent>
  </Dialog>;
}

function SchedulePicker({ pick, schedule, clear, disabled, onChange }: { pick: Pick; schedule: ImportSchedule | null; clear: boolean; disabled: boolean; onChange: (p: Pick) => void }) {
  const chip = (on: boolean) => `h-auto min-h-9 rounded-full px-3 text-sm ${on ? "btn-aqua btn-leaf" : "btn-soft"}`;
  return <div className={`mt-3 space-y-2 rounded-lg border ${clear ? "" : "border-dashed"} p-3`}>
    {!clear && <p className="text-sm text-muted-foreground">The schedule needs clarification. Check this with your therapist’s instructions.</p>}
    <fieldset disabled={disabled} className="space-y-2">
      <legend className="text-sm font-semibold">{clear ? "How often (from your plan)" : "Set how often"}</legend>
      <div className="flex flex-wrap gap-2">
        {(["daily", "weekly"] as const).map((f) => <Button key={f} type="button" variant="outline" aria-pressed={pick.frequency === f} className={chip(pick.frequency === f)} onClick={() => onChange({ frequency: f, days: [] })}>{f === "daily" ? "Daily" : "Specific weekdays"}</Button>)}
      </div>
      {pick.frequency === "daily" && <div className="flex flex-wrap items-center gap-2"><span className="text-sm">Times per day</span>
        {[1, 2, 3].map((n) => <Button key={n} type="button" variant="outline" aria-pressed={pick.occurrences === n} className={`h-10 w-10 rounded-full p-0 font-bold ${pick.occurrences === n ? "btn-aqua btn-leaf" : "btn-soft"}`} onClick={() => onChange({ ...pick, occurrences: n })}>{n}</Button>)}
      </div>}
      {pick.frequency === "weekly" && <div className="flex flex-wrap gap-1.5">
        {DAYS.map((label, d) => { const on = pick.days.includes(d); return <Button key={label} type="button" variant="outline" aria-pressed={on} className={chip(on)} onClick={() => onChange({ ...pick, days: on ? pick.days.filter((x) => x !== d) : [...pick.days, d] })}>{label}</Button>; })}
      </div>}
    </fieldset>
    {schedule && <p className="text-sm font-semibold text-primary">Schedule: {scheduleLabel(schedule)} {!clear && <span className="font-normal text-muted-foreground">(set by you)</span>}</p>}
  </div>;
}
