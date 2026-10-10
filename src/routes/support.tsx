// /support — the whole support network on one page: profile, alerts, people, find support, invites.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppNav } from "@/components/AppNav";
import { SupportAlertsPanel } from "@/components/alerts/SupportAlertsPanel";
import { useSessionUser } from "@/hooks/use-session-user";
import { AuthCard } from "@/components/rehab/AuthCard";
import { useNetwork } from "@/components/network/useNetwork";
import { ProfileCard } from "@/components/network/ProfileCard";
import { InboxCard } from "@/components/network/InboxCard";
import { PeopleCard } from "@/components/network/PeopleCard";
import { DiscoverCard } from "@/components/network/DiscoverCard";
import { InviteCard } from "@/components/network/InviteCard";

export const Route = createFileRoute("/support")({
  validateSearch: (search: Record<string, unknown>): { code?: string } => {
    const code = search["code"];
    return typeof code === "string" ? { code: code.slice(0, 12) } : {};
  },
  head: () => ({
    meta: [
      { title: "Support — Rehabloom" },
      { name: "description", content: "Your Rehabloom support network: family, friends, rehab buddies and mentors." },
      { property: "og:title", content: "Support — Rehabloom" },
      { property: "og:description", content: "Your Rehabloom support network: family, friends, rehab buddies and mentors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PeoplePage,
});

function PeoplePage() {
  const { user, ready } = useSessionUser();
  const { code } = Route.useSearch();

  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) {
    return (
      <div>
        {code && (
          <p className="mx-auto mt-6 max-w-md px-4 text-center text-sm font-semibold">
            Sign in or create an account to join with your invite code.
          </p>
        )}
        <AuthCard />
      </div>
    );
  }
  return <People key={user.id} userId={user.id} email={user.email ?? ""} initialCode={code ?? ""} />;
}

function People({ userId, email, initialCode }: { userId: string; email: string; initialCode: string }) {
  const n = useNetwork(userId);

  // Don't suggest people we're already connected with or have a pending request with.
  const excluded = useMemo(() => {
    const ids = new Set<string>();
    n.contacts.forEach((c) => c.connected_user_id && ids.add(c.connected_user_id));
    n.supporting.forEach((s) => ids.add(s.user_id));
    n.requests.forEach((r) => {
      ids.add(r.from_user);
      ids.add(r.to_user);
    });
    return ids;
  }, [n.contacts, n.supporting, n.requests]);

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <AppNav email={email} />

      {n.loading ? (
        <p className="p-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-4">
          <ProfileCard profile={n.profile} saved={n.hasProfile && !!n.profile.display_name} onSaved={n.reload} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <SupportAlertsPanel userId={userId} />
              <InboxCard
                key={n.encouragements.map((e) => e.id).join()}
                userId={userId}
                requests={n.requests}
                encouragements={n.encouragements}
                onChange={n.reload}
              />
            </div>
            <div className="space-y-4">
              <DiscoverCard profile={n.profile} directory={n.directory} excluded={excluded} onChange={n.reload} />
            </div>
          </div>
          <PeopleCard contacts={n.contacts} supporting={n.supporting} blocks={n.blocks} buddyStats={n.buddyStats} statsError={n.statsError} onChange={n.reload} />
          <InviteCard invites={n.invites} initialCode={initialCode} onChange={n.reload} />
        </div>
      )}
    </div>
  );
}
