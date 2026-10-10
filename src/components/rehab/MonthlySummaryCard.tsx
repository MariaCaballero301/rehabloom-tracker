// Monthly progress summary from Google's Gemini API; copy, print and revisit past summaries.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Copy, Printer, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateMonthlySummary } from "@/lib/ai-summary.functions";

type Summary = { id: string; month: string; is_demo: boolean; model: string; summary: string; created_at: string };

const monthLabel = (m: string) => new Date(`${m}-15T12:00:00`).toLocaleDateString("en-US", { month: "long", year: "numeric" });

export function MonthlySummaryCard() {
  const now = new Date();
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
  const [list, setList] = useState<Summary[]>([]);
  const [current, setCurrent] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const generate = useServerFn(generateMonthlySummary);

  useEffect(() => {
    void supabase.from("ai_summaries").select("id, month, is_demo, model, summary, created_at").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { setList(data ?? []); setCurrent((data ?? [])[0] ?? null); });
  }, []);

  async function run(demo: boolean) {
    setBusy(true);
    try {
      const row = await generate({ data: { month, demo } });
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
    h.textContent = `Rehabloom progress summary — ${monthLabel(s.month)}${s.is_demo ? " (DEMO — fictional data)" : ""}`;
    const f = w.document.createElement("small");
    f.textContent = `Written by Google Gemini (${s.model}) from self-reported data. Not medical advice.`;
    w.document.body.append(h, p, f);
    w.print();
  }

  return (
    <section className="aero-report glass mt-5 p-5 sm:p-6" aria-labelledby="ai-h">
      <h2 id="ai-h" className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" /> Monthly AI summary</h2>
      <p className="text-xs text-muted-foreground">Written by Google Gemini from anonymous numbers only (no names or emails). Not medical advice.</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm font-semibold">Month
          <input className="field mt-1" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </label>
        <button className="btn-aqua" disabled={busy} onClick={() => void run(false)}><Sparkles className="h-4 w-4" /> {busy ? "Writing…" : "Generate AI Summary"}</button>
        <button className="btn-soft text-sm" disabled={busy} onClick={() => void run(true)}>Try with demo data</button>
      </div>
      {current && (
        <div className="mt-4 rounded-2xl border bg-popover p-4 text-sm">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">
            {monthLabel(current.month)} · {current.model}{current.is_demo && <span className="ml-1 rounded-full bg-warning px-2 py-0.5 text-foreground">DEMO — fictional data</span>}
          </p>
          <p className="leading-relaxed">{current.summary}</p>
          <div className="mt-3 flex gap-2">
            <button className="btn-soft text-sm" onClick={() => void navigator.clipboard.writeText(current.summary).then(() => toast.success("Copied"))}><Copy className="h-4 w-4" /> Copy</button>
            <button className="btn-soft text-sm" onClick={() => print(current)}><Printer className="h-4 w-4" /> Print</button>
          </div>
        </div>
      )}
      {list.length > 1 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-semibold">Earlier summaries ({list.length})</summary>
          <ul className="mt-2 space-y-1">
            {list.map((s) => (
              <li key={s.id}><button className="text-left text-primary underline" onClick={() => setCurrent(s)}>
                {monthLabel(s.month)}{s.is_demo ? " (demo)" : ""} · {new Date(s.created_at).toLocaleString()}
              </button></li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
