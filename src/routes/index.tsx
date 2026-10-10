import { createFileRoute } from "@tanstack/react-router";
import { useSessionUser } from "@/hooks/use-session-user";
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
  const { user, ready } = useSessionUser();
  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) return <AuthCard />;
  return <Dashboard userId={user.id} email={user.email ?? ""} />;
}
