import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/rehab/AuthCard";
import { Dashboard } from "@/components/rehab/Dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rehabloom — Stick with your physical therapy" },
      { name: "description", content: "Track your prescribed PT exercises, check in daily, and grow a plant as you stay consistent." },
      { property: "og:title", content: "Rehabloom — Stick with your physical therapy" },
      { property: "og:description", content: "Track your prescribed PT exercises, check in daily, and grow a plant as you stay consistent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) return <AuthCard />;
  return <Dashboard key={user.id} userId={user.id} email={user.email ?? ""} />;
}
