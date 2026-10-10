// Weekly summary + plain recap the user can show their physical therapist. Built from their own records only.
import { ClipboardList, Droplet, Flame, Sparkles } from "lucide-react";
import { weeklyReport } from "@/lib/weekly-report";

type Props = Parameters<typeof weeklyReport>;

export function WeeklyReportCard({ exercises, completions, checkins, name }: { exercises: Props[0]; completions: Props[1]; checkins: Props[2]; name: string }) {
  const r = weeklyReport(exercises, completions, checkins);
  const pain = r.painFirst
    ? r.painLast ? `Pain logged ${r.painFirst.pain}/10 on ${weekday(r.painFirst.day)}, ${r.painLast.pain}/10 on ${weekday(r.painLast.day)}.` : `Pain logged ${r.painFirst.pain}/10 on ${weekday(r.painFirst.day)}.`
    : "No pain check-ins this week.";
  return (
    <section className="aero-report glass mt-5 p-5 sm:p-6" aria-labelledby="report-h">
      <h2 id="report-h" className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-primary" /> Weekly Progress Insight &amp; PT Report</h2>
      <p className="text-xs text-muted-foreground">Last 7 days, from your own logs. Not medical advice.</p>
      <h3 className="mt-4 font-bold">🌟 Weekly Encouragement</h3>
      <ul className="mt-2 space-y-2 text-sm">
        <li className="flex gap-2"><Droplet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          {r.fullDays.length ? `Great focus this week${name ? `, ${name}` : ""}! You finished every exercise on ${list(r.fullDays)}.` : `Every exercise counts${name ? `, ${name}` : ""} — try to finish a full day this week.`}</li>
        <li className="flex gap-2"><Flame className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          Current streak: {r.streak} {r.streak === 1 ? "day" : "days"}. XP earned this week: +{r.xp}.</li>
      </ul>
      <h3 className="mt-4 flex items-center gap-2 font-bold"><ClipboardList className="h-4 w-4" /> For your physical therapist</h3>
      <ul className="mt-2 flex flex-wrap gap-2 text-sm">
        <li className="aero-pill">Adherence: {r.adherence === null ? "no exercises scheduled" : `${r.adherence}% of scheduled exercises completed (${r.targetsMet}/${r.targetDays} daily targets met)`}.</li>
        <li className="aero-pill">{pain}</li>
        {r.restDays > 0 && <li className="aero-pill">Rest or unable days: {r.restDays}.</li>}
      </ul>
    </section>
  );
}

const weekday = (k: string) => new Date(`${k}T12:00:00`).toLocaleDateString("en-US", { weekday: "long" });
const list = (a: string[]) => (a.length < 2 ? a.join("") : `${a.slice(0, -1).join(", ")} & ${a[a.length - 1]}`);
