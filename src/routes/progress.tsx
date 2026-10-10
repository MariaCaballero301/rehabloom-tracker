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
  useEffect(() => {
    void Promise.all([
      db.from("rehab_sessions").select("*").in("status", ["proposed", "accepted", "completed"]),
      db.from("shared_sessions").select("id, contact_name, proposed_for").eq("status", "accepted"),
      db.from("network_profiles").select("display_name").eq("user_id", userId).maybeSingle(),
    ]).then(([r, s, p]) => {
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
      {data ? (
        <HistoryCard exercises={data.ex} completions={completedRecords(data.co)} allCompletions={data.co} checkins={data.ci} joinedAt={joinedAt} sessions={sessions} />
      ) : null}
      {data && <MonthlySummaryCard />}
      {data ? <WeeklyReportCard exercises={data.ex} completions={completedRecords(data.co)} checkins={data.ci} name={name} /> : (
        <p className="p-10 text-center text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
