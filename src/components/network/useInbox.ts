import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { unreadInboxCount } from "@/lib/inbox";
import type { ConnectionRequest } from "./useNetwork";

export type InboxChannel = { user_id: string; name: string; kind: string; can_message: boolean };
export function useInbox(userId: string) {
  const [channels, setChannels] = useState<InboxChannel[]>([]);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [unreadByChannel, setUnreadByChannel] = useState<Record<string, number>>({});
  const [count, setCount] = useState(0);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState(false);
  const reload = useCallback(async () => {
    const [ch, msgs, req] = await Promise.all([
      supabase.rpc("inbox_channels"),
      supabase.from("encouragements").select("from_user,to_user,read_at").eq("to_user", userId).is("read_at", null),
      supabase.from("connection_requests").select("*").eq("status", "pending").order("created_at", { ascending: false }),
    ]);
    setError(Boolean(ch.error || msgs.error || req.error));
    setChannels(ch.data ?? []);
    setRequests(req.data ?? []);
    const by: Record<string, number> = {};
    for (const m of msgs.data ?? []) by[m.from_user] = (by[m.from_user] ?? 0) + 1;
    setUnreadByChannel(by);
    setCount(unreadInboxCount(msgs.data ?? [], req.data ?? [], userId));
    setRevision((v) => v + 1);
  }, [userId]);
  useEffect(() => {
    void reload();
    // Cleanup is asynchronous; a remount must not reuse the still-subscribed channel.
    const channel = supabase.channel(`inbox-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "encouragements", filter: `to_user=eq.${userId}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "encouragements", filter: `from_user=eq.${userId}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests", filter: `to_user=eq.${userId}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests", filter: `from_user=eq.${userId}` }, () => void reload())
      .subscribe();
    const interval = window.setInterval(() => void reload(), 30000);
    const focus = () => void reload();
    window.addEventListener("focus", focus);
    return () => { void supabase.removeChannel(channel); window.clearInterval(interval); window.removeEventListener("focus", focus); };
  }, [userId, reload]);
  return { channels, requests, unreadByChannel, count, revision, error, reload };
}