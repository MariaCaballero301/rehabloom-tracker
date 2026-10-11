// /profile — the profile editor on its own page, opened from the account header's Edit Profile button.
import { createFileRoute } from "@tanstack/react-router";
import { AppNav } from "@/components/AppNav";
import { useSessionUser } from "@/hooks/use-session-user";
import { AuthCard } from "@/components/rehab/AuthCard";
import { useNetwork } from "@/components/network/useNetwork";
import { ProfileCard } from "@/components/network/ProfileCard";

export const Route = createFileRoute("/profile")({
  validateSearch: (search: Record<string, unknown>): { edit?: string } => {
    const edit = search["edit"];
    return edit === "profile" ? { edit } : {};
  },
  head: () => ({
    meta: [
      { title: "Profile — Rehabloom" },
      { name: "description", content: "Your Rehabloom profile: photo, name, therapy areas, languages and availability." },
      { property: "og:title", content: "Profile — Rehabloom" },
      { property: "og:description", content: "Your Rehabloom profile: photo, name, therapy areas, languages and availability." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  return <ProfileView />;
}

function ProfileView() {
  const { user, ready } = useSessionUser();
  if (!ready) return <p className="p-10 text-center text-muted-foreground">Loading…</p>;
  if (!user) return <AuthCard />;
  return <Profile userId={user.id} email={user.email ?? ""} />;
}

function Profile({ userId, email }: { userId: string; email: string }) {
  const n = useNetwork(userId);
  const { edit } = Route.useSearch();
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <AppNav email={email} />
      {n.loading ? (
        <p className="p-10 text-center text-muted-foreground">Loading…</p>
      ) : (
        <ProfileCard profile={n.profile} saved={n.hasProfile && !!n.profile.display_name} onSaved={n.reload} openEditRequest={edit} />
      )}
    </div>
  );
}
