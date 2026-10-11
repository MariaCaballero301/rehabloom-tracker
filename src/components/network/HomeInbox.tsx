import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { InboxCard } from "./InboxCard";
import { InboxConversation } from "./InboxConversation";
import { useInbox } from "./useInbox";
import { ProfileAvatar } from "./ProfileAvatar";
import { useLocation } from "@tanstack/react-router";

export function HomeInbox({ userId, children, initiallyOpen = false }: { userId: string; children: ReactNode; initiallyOpen?: boolean }) {
  const inbox = useInbox(userId);
  const [open, setOpen] = useState(initiallyOpen);
  const pathname = useLocation({ select: (location) => location.pathname });
  useEffect(() => { if (pathname === "/inbox") setOpen(true); }, [pathname]);
  const [selected, setSelected] = useState<string | null>(null);
  const [requests, setRequests] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const person = inbox.channels.find((c) => c.user_id === selected);
  const latestReload = useRef(inbox.reload);
  latestReload.current = inbox.reload;
  const incoming = inbox.requests.filter((r) => r.to_user === userId);
  useEffect(() => {
    const onPanel = (e: Event) => { if ((e as CustomEvent<string>).detail !== "inbox") setOpen(false); };
    window.addEventListener("rehabloom:panel-open", onPanel);
    return () => window.removeEventListener("rehabloom:panel-open", onPanel);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("inbox-panel-open", open);
    return () => document.body.classList.remove("inbox-panel-open");
  }, [open]);
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new CustomEvent("rehabloom:panel-open", { detail: "inbox" }));
    close.current?.focus();
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  useEffect(() => {
    if (!open || !requests) return;
    const ids = incoming.filter((r) => !r.read_at).map((r) => r.id);
    if (!ids.length) return;
    void supabase.from("connection_requests").update({ read_at: new Date().toISOString() }).eq("to_user", userId).in("id", ids)
      .then(({ error }) => { if (!error) void latestReload.current(); });
  }, [open, requests, inbox.revision, userId]);
  function sent() {
    void inbox.reload();
    window.dispatchEvent(new Event("rehabloom:message-sent"));
  }
  return (
    <div className={`home-inbox-layout ${open ? "home-inbox-open" : ""}`}>
      {open && <aside id="home-inbox" className="inbox-sidebar" aria-label="Inbox">
        <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-4">
          <h1 className="flex items-center gap-2 text-xl"><Inbox className="h-5 w-5" /> Inbox</h1>
          <Button data-sound="pop" ref={close} variant="ghost" size="icon" className="btn-soft rounded-full" aria-label="Close Inbox" title="Close Inbox" onClick={() => { setOpen(false); trigger.current?.focus(); }}><X /></Button>
        </header>
        {(person || requests) ? <div className="shrink-0 px-3 pb-2"><Button variant="ghost" className="text-sm" onClick={() => { setSelected(null); setRequests(false); }}><ArrowLeft /> All conversations</Button></div> : null}
        {requests ? <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {inbox.requests.length ? <InboxCard userId={userId} requests={inbox.requests} encouragements={[]} onChange={inbox.reload} /> : <p className="text-sm text-muted-foreground">No connection requests.</p>}
        </div> : person ? <InboxConversation key={person.user_id} userId={userId} person={person} revision={inbox.revision} onRead={inbox.reload} onSent={sent} /> : <nav className="min-h-0 flex-1 overflow-y-auto" aria-label="Inbox channels">
          {inbox.error && <div className="p-4 text-sm"><p>Inbox couldn't be loaded.</p><Button variant="ghost" onClick={() => void inbox.reload()}>Try again</Button></div>}
          <Button variant="ghost" className="flex h-auto w-full justify-start gap-3 rounded-none border-y px-4 py-4" onClick={() => setRequests(true)}>
            <span className="nav-bubble-icon"><Inbox className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1 text-left">Connection requests</span>
            {incoming.length > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">{incoming.length}</span>}
          </Button>
          {inbox.channels.map((c) => <Button key={c.user_id} variant="ghost" className="flex h-auto w-full justify-start gap-3 rounded-none border-b px-4 py-4" onClick={() => setSelected(c.user_id)}>
            <ProfileAvatar userId={c.user_id} name={c.name} />
            <span className="min-w-0 flex-1 whitespace-normal break-words text-left">{c.name}</span>
            {(inbox.unreadByChannel[c.user_id] ?? 0) > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">{inbox.unreadByChannel[c.user_id]}</span>}
          </Button>)}
          {!inbox.error && inbox.channels.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No conversations yet. Connect with your people on Support 🌱</p>}
        </nav>}
      </aside>}
      <main className="home-inbox-content">{children}</main>
      {!open && <Button ref={trigger} variant="ghost" className={`bubble inbox-trigger rounded-full p-0 text-primary ${inbox.count > 0 ? "inbox-attention" : ""}`} aria-label={inbox.count ? `Open Inbox, ${inbox.count} unread` : "Open Inbox"} title="Inbox" aria-expanded={open} aria-controls="home-inbox" onClick={() => setOpen(true)}>
        <Inbox className="size-7" />
        {inbox.count > 0 && <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-popover bg-destructive px-1 text-xs font-bold text-destructive-foreground">{inbox.count > 99 ? "99+" : inbox.count}</span>}
      </Button>}
    </div>
  );
}