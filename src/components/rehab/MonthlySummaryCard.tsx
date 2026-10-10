// Monthly progress summary from Google's Gemini API; copy, print and revisit past summaries.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CalendarDays, Copy, Printer, Sparkles } from "lucide-react";
import { parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { dayKey } from "@/lib/rehab";
import { summaryRange, summaryPeriodLabel, type SummaryPeriod } from "@/lib/summary-period";
import { supabase } from "@/integrations/supabase/client";
import { generateMonthlySummary } from "@/lib/ai-summary.functions";

type Summary = { id: string; month: string; is_demo: boolean; model: string; summary: string; created_at: string; period?: SummaryPeriod; periodDate?: string };
const reportLabel = (s: Summary) => summaryPeriodLabel(s.period ?? "monthly", s.periodDate ?? s.month);

export function MonthlySummaryCard() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [period, setPeriod] = useState<SummaryPeriod>("monthly");
  const [week, setWeek] = useState(summaryRange("weekly", dayKey(now)).from);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [list, setList] = useState<Summary[]>([]);
  const [current, setCurrent] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateMonthlySummary);

  useEffect(() => {
    void supabase.from("ai_summaries").select("id, month, is_demo, model, summary, created_at, stats").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        const rows: Summary[] = (data ?? []).map((row) => {
          const stats = row.stats && typeof row.stats === "object" && !Array.isArray(row.stats) ? row.stats : {};
          const weekly = stats["reportPeriod"] === "weekly" && typeof stats["periodStart"] === "string";
          return { ...row, period: weekly ? "weekly" : "monthly", periodDate: weekly ? String(stats["periodStart"]) : row.month };
        });
        setList(rows); setCurrent(rows[0] ?? null);
      });
  }, []);

  async function run(demo: boolean) {
    setBusy(true);
    try {
      const row = await generate({ data: { month: period === "monthly" ? month : week, period, demo } });
      setCurrent(row);
      setList((l) => [row, ...l]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function print(s: Summary) {
    const w = window.open("", "_blank");
    if (!w) return;
    const p = w.document.createElement("p");
    p.textContent = s.summary;
    const h = w.document.createElement("h2");
    h.textContent = `Rehabloom progress summary — ${reportLabel(s)}${s.is_demo ? " (DEMO — fictional data)" : ""}`;
    const f = w.document.createElement("small");
    f.textContent = `Written by Google Gemini (${s.model}) from self-reported data. Not medical advice.`;
    w.document.body.append(h, p, f);
    w.print();
  }

  return (
    <section className="aero-report glass mt-5 p-5 sm:p-6" aria-labelledby="ai-h">
      <h2 id="ai-h" className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 shrink-0 text-primary" /> {period === "monthly" ? "Monthly" : "Weekly"} AI summary</h2>
      <p className="text-xs text-muted-foreground">Written by Google Gemini from anonymous numbers only (no names or emails). Not medical advice.</p>
      <div className="mt-4 inline-flex gap-2" role="group" aria-label="Summary period">
        {(["monthly", "weekly"] as const).map((mode) => <Button key={mode} variant="ghost" className="nav-bubble justify-center px-5" data-active={period === mode} aria-pressed={period === mode} disabled={busy} onClick={() => setPeriod(mode)}>{mode === "monthly" ? "Monthly" : "Weekly"}</Button>)}
      </div>
      <div className="mt-3 grid gap-3">
        {period === "monthly" ? <label className="block max-w-xs text-sm font-semibold">Month
          <input className="field mt-1" type="month" value={month} disabled={busy} onChange={(e) => setMonth(e.target.value)} />
        </label> : <div className="min-w-0 text-sm font-semibold">
          <p className="mb-1">Week · Monday–Sunday</p>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild><Button variant="outline" disabled={busy} className="btn-soft h-auto max-w-full justify-start whitespace-normal text-left"><CalendarDays /> {summaryPeriodLabel("weekly", week)}</Button></PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="range" weekStartsOn={1} defaultMonth={parseISO(week)} selected={{ from: parseISO(week), to: parseISO(summaryRange("weekly", week).to) }} onDayClick={(date) => { setWeek(summaryRange("weekly", dayKey(date)).from); setPickerOpen(false); }} className="pointer-events-auto p-3" />
            </PopoverContent>
          </Popover>
        </div>}
        <div className="grid gap-2 sm:flex sm:flex-wrap">
          <Button variant="ghost" className="btn-aqua" disabled={busy || !month} onClick={() => void run(false)}><Sparkles className="h-4 w-4" /> {busy ? "Writing…" : "Generate AI Summary"}</Button>
          <Button variant="ghost" className="btn-soft text-sm" disabled={busy || !month} onClick={() => void run(true)}>Try with demo data</Button>
        </div>
      </div>
      {current && (
        <div className="mt-4 rounded-2xl border bg-popover p-4 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {reportLabel(current)} · {current.model}{current.is_demo && <span className="ml-1 rounded-full bg-warning px-2 py-0.5 text-foreground">DEMO — fictional data</span>}
          </p>
          <p className="leading-relaxed">{current.summary}</p>
          <div className="mt-3 flex gap-2">
            <Button variant="ghost" className="btn-soft text-sm" onClick={() => void navigator.clipboard.writeText(current.summary).then(() => toast.success("Copied"))}><Copy className="h-4 w-4" /> Copy</Button>
            <Button variant="ghost" className="btn-soft text-sm" onClick={() => print(current)}><Printer className="h-4 w-4" /> Print</Button>
          </div>
        </div>
      )}
      {list.length > 1 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold">Earlier summaries ({list.length})</summary>
          <ul className="mt-2 space-y-1">
            {list.map((s) => (
               <li key={s.id}><Button variant="link" className="h-auto max-w-full whitespace-normal px-0 text-left" onClick={() => { setCurrent(s); setPeriod(s.period ?? "monthly"); if (s.period === "weekly") setWeek(s.periodDate ?? week); else setMonth(s.month); }}>
                 {reportLabel(s)}{s.is_demo ? " (demo)" : ""} · {new Date(s.created_at).toLocaleString()}
               </Button></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
