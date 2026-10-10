import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { AuthCard } from "@/components/rehab/AuthCard";
import { AppNav } from "@/components/AppNav";
import { HistoryCard } from "@/components/rehab/HistoryCard";
import { useSessionUser } from "@/hooks/use-session-user";
import { completedRecords } from "@/lib/rehab";

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
  return <Progress key={user.id} email={user.email ?? ""} joinedAt={user.created_at} />;
}

function Progress({ email, joinedAt }: { email: string; joinedAt: string }) {
  const [data, setData] = useState<{ ex: Tables<"exercises">[]; co: Tables<"completions">[]; ci: Tables<"checkins">[] } | null>(null);
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
        <HistoryCard exercises={data.ex} completions={completedRecords(data.co)} allCompletions={data.co} checkins={data.ci} joinedAt={joinedAt} />
      ) : (
        <p className="p-10 text-center text-muted-foreground">Loading…</p>
      )}
    </div>
  );
}
