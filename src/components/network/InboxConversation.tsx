import { celebrateXp } from "@/components/XpFish";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUp, Send, Smile } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { conversationFilter, INBOX_PAGE_SIZE, INBOX_QUICK_MESSAGES, mergeInboxMessages, type InboxMessage } from "@/lib/inbox";
import { MAX_ENCOURAGEMENT_LENGTH } from "@/lib/network";
import { cheerCount, MAX_XP_CHEERS_PER_DAY, XP_PER_CHEER } from "@/lib/rehab";
import { ProfileAvatar } from "./ProfileAvatar";
import type { InboxChannel } from "./useInbox";
import { useInboxTyping } from "./useInboxTyping";

export function InboxConversation({ userId, person, revision, onRead, onSent }: { userId: string; person: InboxChannel; revision: number; onRead: () => void; onSent: () => void }) {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [presets, setPresets] = useState(false);
  const { typing, updateTyping } = useInboxTyping(userId, person.user_id, person.can_message);
  const scroll = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const onReadRef = useRef(onRead);
  onReadRef.current = onRead;
  const load = useCallback(async () => {
    const { data, error } = await supabase.from("encouragements").select("*")
      .or(conversationFilter(userId, person.user_id)).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(INBOX_PAGE_SIZE);
    setLoadError(Boolean(error));
    if (!error) {
      setMessages((old) => mergeInboxMessages(old, data ?? []));
      setMore((old) => old || (data?.length ?? 0) === INBOX_PAGE_SIZE);
      const ids = (data ?? []).filter((m) => m.to_user === userId && !m.read_at).map((m) => m.id);
      if (ids.length) {
        const { error: readError } = await supabase.from("encouragements").update({ read_at: new Date().toISOString() }).eq("to_user", userId).in("id", ids);
        if (!readError) onReadRef.current();
      }
    }
    setLoading(false);
  }, [userId, person.user_id]);
  useEffect(() => { void load(); }, [load, revision]);
  useEffect(() => {
    if (atBottom.current && scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [messages]);
  async function older() {
    const first = messages[0];
    if (!first || loading) return;
    setLoading(true);
    const { data, error } = await supabase.from("encouragements").select("*").or(conversationFilter(userId, person.user_id))
      .or(`created_at.lt.${first.created_at},and(created_at.eq.${first.created_at},id.lt.${first.id})`)
      .order("created_at", { ascending: false }).order("id", { ascending: false }).limit(INBOX_PAGE_SIZE);
    if (error) toast.error("Older messages couldn't be loaded. Please try again.");
    else {
      const element = scroll.current;
      const height = element?.scrollHeight ?? 0;
      atBottom.current = false;
      setMessages((old) => mergeInboxMessages(data ?? [], old));
      setMore((data?.length ?? 0) === INBOX_PAGE_SIZE);
      requestAnimationFrame(() => { if (element) element.scrollTop += element.scrollHeight - height; });
    }
    setLoading(false);
  }
  async function send(message: string) {
    const clean = message.trim();
    if (!clean || sending || !person.can_message) return;
    setSending(true);
    updateTyping(false);
    try {
      const { error } = await supabase.rpc("send_encouragement", { p_to: person.user_id, p_message: clean });
      if (error) throw error;
      setText(""); setPresets(false); atBottom.current = true;
      await load(); onSent();
      const { data } = await supabase.from("encouragements").select("created_at").eq("from_user", userId)
        .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString());
      if (data && data.length <= MAX_XP_CHEERS_PER_DAY && cheerCount(data) > 0) celebrateXp(`+${XP_PER_CHEER} XP`);
      else toast.success("Message sent");
    } catch (e) { toast.error(e instanceof Error ? e.message : (e as { message?: string }).message ?? "Message couldn't be sent."); }
    finally { setSending(false); }
  }
  return (
    <section className="flex min-h-0 flex-1 flex-col" aria-label={`Conversation with ${person.name}`}>
      <header className="flex items-center gap-3 border-y bg-card px-4 py-3">
        <ProfileAvatar userId={person.user_id} name={person.name} />
        <h2 className="min-w-0 break-words text-lg font-bold">{person.name}</h2>
      </header>
      <div ref={scroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-label="Message history" aria-live="polite" onScroll={() => {
        const el = scroll.current;
        if (el) atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}>
        {more && <Button variant="ghost" className="mx-auto flex" disabled={loading} onClick={older}><ArrowUp /> Earlier messages</Button>}
        {loading && messages.length === 0 && <p className="text-center text-sm text-muted-foreground">Loading messages…</p>}
        {loadError && <div className="text-center text-sm"><p>Messages couldn't be loaded.</p><Button variant="ghost" onClick={() => void load()}>Try again</Button></div>}
        {!loading && !loadError && messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet 🌱</p>}
        {messages.map((m) => {
          const own = m.from_user === userId;
          return <div key={m.id} className={`flex flex-col ${own ? "items-end" : "items-start"}`}>
            <p className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${own ? "rounded-br-sm bg-primary text-primary-foreground" : "inbox-received rounded-bl-sm"}`}>{m.message}</p>
            <time dateTime={m.created_at} className="mt-1 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</time>
          </div>;
        })}
      </div>
      <div className="flex h-10 shrink-0 items-center px-4" role="status" aria-live="polite">
        {typing && <div className="flex min-w-0 items-center gap-2">
          <span className="inbox-received inbox-typing-dots flex shrink-0 items-center gap-1 rounded-2xl px-3 py-2" aria-hidden="true"><span /><span /><span /></span>
          <span className="truncate text-xs text-muted-foreground">{person.name} is typing…</span>
        </div>}
      </div>
      {person.can_message ? <footer className="shrink-0 border-t bg-card p-3">
        {presets && <div className="mb-2 flex flex-col gap-2">{INBOX_QUICK_MESSAGES.map((m) => <Button key={m} variant="ghost" className="btn-soft h-auto whitespace-normal text-left text-xs" disabled={sending} onClick={() => void send(m)}>{m}</Button>)}</div>}
        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <Button type="button" variant="ghost" size="icon" className="btn-soft shrink-0 rounded-full" aria-label="Quick messages" title="Quick messages" aria-expanded={presets} onClick={() => setPresets((v) => !v)}><Smile /></Button>
          <textarea className="field min-w-0 resize-none text-sm" rows={2} maxLength={MAX_ENCOURAGEMENT_LENGTH} value={text} disabled={sending} aria-label={`Message to ${person.name}`} placeholder="Message…" onChange={(e) => { setText(e.target.value); updateTyping(Boolean(e.target.value.trim())); }} onBlur={() => updateTyping(false)} />
          <Button variant="ghost" size="icon" className="btn-aqua shrink-0 rounded-full p-2" disabled={sending || !text.trim()} aria-label="Send message" title="Send message"><Send /></Button>
        </form>
      </footer> : <p className="border-t p-3 text-sm text-muted-foreground">This connection has ended. Your conversation history is still here.</p>}
    </section>
  );
}