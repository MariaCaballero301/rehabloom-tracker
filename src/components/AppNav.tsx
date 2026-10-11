// Top navigation: Rehabloom name, three glossy bubble buttons, sign out.
import { Link } from "@tanstack/react-router";
import { CalendarDays, Home, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AccountProfile } from "@/components/AccountProfile";
import { Button } from "@/components/ui/button";
import { SoundToggle } from "@/components/SoundToggle";

const items = [
  { to: "/", label: "Home", Icon: Home },
  { to: "/progress", label: "Progress", Icon: CalendarDays },
  { to: "/support", label: "Support", Icon: Users },
] as const;

export function AppNav(_props: { email?: string }) {
  return (
    <header className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="shrink-0 text-2xl text-primary sm:text-3xl">Rehabloom</h1>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <AccountProfile />
          <SoundToggle />
          <Button variant="ghost" className="btn-soft shrink-0" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
      <nav aria-label="Main" className="flex flex-wrap gap-2 sm:gap-3">
        {items.map(({ to, label, Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: true }}
            className="nav-bubble"
            activeProps={{ "aria-current": "page", "data-active": "true" }}
          >
            <span className="nav-bubble-icon" aria-hidden>
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
