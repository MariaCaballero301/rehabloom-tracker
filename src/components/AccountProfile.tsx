import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { User } from "@supabase/supabase-js";
import { CalendarDays, Mail, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileAvatar } from "@/components/network/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const PROFILE_SAVED_EVENT = "rehabloom:profile-saved";
export const PROFILE_EDIT_EVENT = "rehabloom:profile-edit";
type Account = { user: User; name: string; photoPath: string | null };
const AccountContext = createContext<Account | null>(null);

export function AccountProfileProvider({ user, children }: { user: User; children: ReactNode }) {
  const [profile, setProfile] = useState<{ name: string; photoPath: string | null }>({ name: "Your profile", photoPath: null });
  useEffect(() => {
    let active = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const { data, error } = await supabase.from("network_profiles").select("display_name,photo_path").eq("user_id", user.id).maybeSingle();
        if (active && current === revision && !error) setProfile({ name: data?.display_name.trim() || "Your profile", photoPath: data?.photo_path ?? null });
      } catch { /* Keep account controls available if the optional profile read fails. */ }
    };
    void load();
    const refresh = () => void load();
    const channel = supabase.channel(`account-profile-${user.id}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "network_profiles", filter: `user_id=eq.${user.id}` }, refresh)
      .subscribe();
    window.addEventListener(PROFILE_SAVED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener(PROFILE_SAVED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [user.id]);
  return <AccountContext.Provider value={{ user, ...profile }}>{children}</AccountContext.Provider>;
}

export function AccountProfile() {
  const account = useContext(AccountContext);
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!account) return null;
  const enter = () => { clearTimeout(timer.current); setHovered(true); };
  const leave = () => { timer.current = setTimeout(() => setHovered(false), 150); };
  const openEditor = () => {
    setPinned(false);
    setHovered(false);
    void navigate({ to: "/support", search: { edit: "profile" } });
    // If the profile card is already mounted (e.g. on /support), open it directly.
    window.dispatchEvent(new Event(PROFILE_EDIT_EVENT));
  };
  const date = new Date(account.user.created_at);
  const joined = Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  return (
    <Popover open={hovered || pinned} onOpenChange={(open) => { setPinned(open); if (!open) setHovered(false); }}>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="h-auto min-w-0 max-w-full gap-2 rounded-full px-2 py-1" aria-label={`Account details for ${account.name}`}
          onPointerEnter={(e) => { if (e.pointerType === "mouse") enter(); }} onPointerLeave={leave}
          onClick={(e) => { e.preventDefault(); setPinned(!pinned); setHovered(false); }}>
          <ProfileAvatar userId={account.user.id} name={account.name} path={account.photoPath} />
          <span className="min-w-0 max-w-40 truncate font-semibold text-foreground">{account.name}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] border-input" aria-label="Your account details"
        onPointerEnter={enter} onPointerLeave={leave} onOpenAutoFocus={(e) => { if (!pinned) e.preventDefault(); }}>
        <p className="break-words font-bold">{account.name}</p>
        <dl className="mt-3 space-y-3 text-sm">
          <div><dt className="flex items-center gap-2 text-muted-foreground"><Mail className="size-4" /> Email account</dt><dd className="mt-1 break-all">{account.user.email || "Unavailable"}</dd></div>
          <div><dt className="flex items-center gap-2 text-muted-foreground"><CalendarDays className="size-4" /> Joined Rehabloom</dt><dd className="mt-1">{joined}</dd></div>
        </dl>
        <Button variant="ghost" className="btn-aqua mt-4 w-full rounded-full" onClick={openEditor}>
          <Pencil className="h-4 w-4" /> Edit Profile
        </Button>
      </PopoverContent>
    </Popover>
  );
}