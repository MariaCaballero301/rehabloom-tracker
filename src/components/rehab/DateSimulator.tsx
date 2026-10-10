import { useEffect, useState } from "react";
import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

// Testing-only: overrides "today" for the whole app by shifting the browser clock.
const KEY = "rehab-sim-date";
const RealDate = Date;

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function keyOf(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

if (typeof window !== "undefined") {
  const sim = window.localStorage.getItem(KEY);
  if (sim && /^\d{4}-\d{2}-\d{2}$/.test(sim)) {
    const real = new RealDate();
    const [y = 0, m = 1, d = 1] = sim.split("-").map(Number);
    const target = new RealDate(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds());
    const offset = target.getTime() - real.getTime();
    class SimDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(RealDate.now() + offset);
        else super(...(args as [string]));
      }
      static override now() {
        return RealDate.now() + offset;
      }
    }
    (window as unknown as { Date: DateConstructor }).Date = SimDate as unknown as DateConstructor;
  }
}

function apply(value: string | null) {
  if (value) window.localStorage.setItem(KEY, value);
  else window.localStorage.removeItem(KEY);
  window.location.reload();
}

export function DateSimulator() {
  const [current, setCurrent] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setCurrent(keyOf(new Date())), []);
  if (!current) return null;
  const simulated = typeof window !== "undefined" && !!window.localStorage.getItem(KEY);

  const shift = (days: number) => {
    const d = new Date(`${current}T12:00:00`);
    d.setDate(d.getDate() + days);
    apply(keyOf(d));
  };
  const nextSunday = () => {
    const d = new Date(`${current}T12:00:00`);
    d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
    apply(keyOf(d));
  };

  return (
    <div className="fixed right-3 top-3 z-50 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`glass flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${simulated ? "ring-2 ring-primary" : ""}`}
      >
        <CalendarClock className="h-4 w-4" aria-hidden />
        {simulated ? `Simulating ${new Date(`${current}T12:00:00`).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}` : "Date simulator"}
      </button>
      {open && (
        <div className="glass w-64 space-y-3 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Testing only. Changes what "today" means in the app.</p>
          <input
            type="date"
            className="field w-full"
            value={current}
            onChange={(e) => e.target.value && apply(e.target.value)}
            aria-label="Simulated date"
          />
          <div className="flex gap-2">
            <button type="button" className="btn-soft flex-1 rounded-full border px-2 py-1.5" onClick={() => shift(-1)} aria-label="Previous day"><ChevronLeft className="mx-auto h-4 w-4" /></button>
            <button type="button" className="btn-aqua flex-[2] rounded-full px-2 py-1.5 text-xs" onClick={nextSunday}>Next Sunday</button>
            <button type="button" className="btn-soft flex-1 rounded-full border px-2 py-1.5" onClick={() => shift(1)} aria-label="Next day"><ChevronRight className="mx-auto h-4 w-4" /></button>
          </div>
          {simulated && (
            <button type="button" className="btn-soft flex w-full items-center justify-center gap-1 rounded-full border px-2 py-1.5 text-xs" onClick={() => apply(null)}>
              <RotateCcw className="h-3 w-3" /> Reset to real today
            </button>
          )}
        </div>
      )}
    </div>
  );
}
