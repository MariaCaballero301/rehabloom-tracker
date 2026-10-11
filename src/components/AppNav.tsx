// Top navigation: Rehabloom name, three glossy bubble buttons, sign out.
import { Link } from "@tanstack/react-router";
import { CalendarDays, Home, LogOut, Users } from "lucide-react";
import { useEffect, useState } from "react";
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
  // The bubble row stays pinned to the top of the page; a soft white gloss
  // fades in once the page has been scrolled so it reads clearly over content.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="shrink-0 text-2xl text-primary sm:text-3xl">Rehabloom</h1>
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <AccountProfile />
          <SoundToggle />
          <Button variant="ghost" className="btn-soft shrink-0" onClick={() => supabase.auth.signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>
      <nav aria-label="Main" data-scrolled={scrolled ? "true" : "false"} className="app-nav -mx-4 mb-5 flex flex-wrap gap-2 px-4 py-2 sm:-mx-6 sm:gap-3 sm:px-6">
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
        <div className="nav-triggers ml-auto flex items-center gap-2">
          <span id="nav-slot-sessions" className="contents" />
          <span id="nav-slot-inbox" className="contents" />
        </div>
      </nav>
    </>
  );
}
