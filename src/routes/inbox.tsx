import { createFileRoute } from "@tanstack/react-router";
import { HomeInbox } from "@/components/network/HomeInbox";
import { Dashboard } from "@/components/rehab/Dashboard";
import { AuthCard } from "@/components/rehab/AuthCard";
import { useSessionUser } from "@/hooks/use-session-user";

export const Route = createFileRoute("/inbox")({
  head: () => ({ meta: [
    { title: "Inbox — Rehabloom" },
    { name: "description", content: "Messages and connection requests from your Rehabloom support network." },
    { property: "og:title", content: "Inbox — Rehabloom" },
    { property: "og:description", content: "Messages and connection requests from your Rehabloom support network." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InboxPage,
});
function InboxPage() {
  const { user, ready } = useSessionUser();
  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) return <AuthCard />;
  return <HomeInbox key={user.id} userId={user.id} initiallyOpen><Dashboard userId={user.id} email={user.email ?? ""} /></HomeInbox>;
}