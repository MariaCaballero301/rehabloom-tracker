import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AuthCard } from "@/components/rehab/AuthCard";
import { AppNav } from "@/components/AppNav";
import { HistoryCard } from "@/components/rehab/HistoryCard";
import { useSessionUser } from "@/hooks/use-session-user";
import { completedRecords, dayKey } from "@/lib/rehab";
import { MonthlySummaryCard } from "@/components/rehab/MonthlySummaryCard";
import { WeeklyReportCard } from "@/components/rehab/WeeklyReportCard";
import { db } from "@/components/network/useNetwork";
import type { DaySession, RehabSession } from "@/lib/sessions";
import { journeyTotals } from "@/lib/mentor-mode";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — Rehabloom" },
      { name: "description", content: "See your last 7 days or a monthly calendar of your prescribed exercises." },
      { property: "og:title", content: "Progress — Rehabloom" },
      { property: "og:description", content: "See your last 7 days or a monthly calendar of your prescribed exercises." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const { user, ready } = useSessionUser();
  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) return <AuthCard />;
  return <Progress key={user.id} userId={user.id} email={user.email ?? ""} joinedAt={user.created_at} />;
}

function Progress({ userId, email, joinedAt }: { userId: string; email: string; joinedAt: string }) {
  const [data, setData] = useState<{ ex: Tables<"exercises">[]; co: Tables<"completions">[]; ci: Tables<"checkins">[] } | null>(null);
  const [sessions, setSessions] = useState<DaySession[]>([]);
  const [name, setName] = useState("");
  const [finishedAt, setFinishedAt] = useState<string | null>(null);
  const [impact, setImpact] = useState({ supported: 0, sent: 0, together: 0 });
  useEffect(() => {
    void Promise.all([
      db.from("rehab_sessions").select("*").in("status", ["proposed", "accepted", "completed"]),
      db.from("shared_sessions").select("id, contact_name, proposed_for").eq("status", "accepted"),
      db.from("network_profiles").select("display_name, finished_therapy, finished_at").eq("user_id", userId).maybeSingle(),
      db.rpc("people_i_support"),
      db.from("encouragements").select("id", { count: "exact", head: true }).eq("from_user", userId),
    ]).then(([r, s, p, sup, enc]) => {
      const prof = p.data as { finished_therapy?: boolean; finished_at?: string | null } | null;
      setFinishedAt(prof?.finished_therapy && prof.finished_at ? prof.finished_at : null);
      const done = ((r.data ?? []) as RehabSession[]).filter((x) => x.status === "completed" || (x.status === "accepted" && new Date(x.starts_at) < new Date())).length;
      setImpact({ supported: ((sup.data ?? []) as unknown[]).length, sent: enc.count ?? 0, together: done });
      const rows = ((r.data ?? []) as RehabSession[]).map((x) => ({
        id: x.id, day: dayKey(new Date(x.starts_at)), startsAt: x.starts_at, mode: x.mode, status: x.status,
        name: (x.organizer_id === userId ? x.guest_name : x.organizer_name) || "Someone",
      }));
      const shared = ((s.data ?? []) as { id: string; contact_name: string; proposed_for: string }[]).map((x) => ({
        id: x.id, day: dayKey(new Date(x.proposed_for)), startsAt: x.proposed_for, mode: "in_person", status: "accepted", name: x.contact_name || "Someone",
      }));
      setSessions([...rows, ...shared]);
      setName(((p.data as { display_name?: string } | null)?.display_name ?? "").split(" ")[0] ?? "");
    });
  }, [userId]);
  useEffect(() => {
    void Promise.all([
      supabase.from("exercises").select("*").order("created_at"),
      supabase.from("completions").select("*"),
      supabase.from("checkins").select("*"),
    ]).then(([ex, co, ci]) => setData({ ex: ex.data ?? [], co: co.data ?? [], ci: ci.data ?? [] }));
  }, []);
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <AppNav email={email} />
      {data && finishedAt && <RecoveryCard finishedAt={finishedAt} completions={data.co} checkins={data.ci} impact={impact} />}
      {data ? (
        <HistoryCard finishedDay={finishedAt ? dayKey(new Date(finishedAt)) : null} exercises={data.ex} completions={completedRecords(data.co)} allCompletions={data.co} checkins={data.ci} joinedAt={joinedAt} sessions={sessions} />
      ) : null}
      {data && <MonthlySummaryCard key={finishedAt ?? "rehab"} journey={finishedAt ? { from: journeyTotals(data.co, data.ci, dayKey(new Date(finishedAt))).firstDay, to: dayKey(new Date(finishedAt)) } : undefined} />}
      {data ? <WeeklyReportCard exercises={data.ex} completions={completedRecords(data.co)} checkins={data.ci} name={name} /> : (
        <p className="p-10 text-center text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}

function RecoveryCard({ finishedAt, completions, checkins, impact }: {
  finishedAt: string; completions: Tables<"completions">[]; checkins: Tables<"checkins">[];
  impact: { supported: number; sent: number; together: number };
}) {
  const t = journeyTotals(completions, checkins, dayKey(new Date(finishedAt)));
  const stat = (n: number, label: string) => (
    <div className="rounded-2xl bg-card/70 px-3 py-2 text-center"><p className="text-2xl font-extrabold tabular-nums text-success">{n}</p><p className="text-xs text-muted-foreground">{label}</p></div>
  );
  return (
    <section className="glass mb-5 p-5 sm:p-6" aria-labelledby="recovery-h">
      <h2 id="recovery-h" className="text-xl">Recovery completed 🌸 on {new Date(finishedAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {stat(t.daysActive, "days active")}
        {stat(t.exercisesCompleted, "exercises completed")}
        {stat(t.bestStreak, "best streak (days)")}
      </div>
      <h3 className="mt-4 text-sm font-bold uppercase text-muted-foreground">Mentor impact</h3>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {stat(impact.supported, "people supported")}
        {stat(impact.sent, "encouragements sent")}
        {stat(impact.together, "sessions together")}
      </div>
    </section>
  );
}
