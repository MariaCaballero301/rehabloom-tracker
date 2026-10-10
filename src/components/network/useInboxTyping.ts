import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useInboxTyping(userId: string, otherId: string, enabled: boolean) {
  const [typing, setTyping] = useState(false);
  const updateRef = useRef<(active: boolean) => void>(() => {});
  useEffect(() => {
    setTyping(false);
    if (!enabled) return;
    let disposed = false;
    let lastSent = 0;
    let active = false;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    let queue = Promise.resolve();
    const publish = (value: boolean) => {
      // Serialize start/stop so a slow start cannot arrive after the stop.
      queue = queue.then(async () => {
        try { await supabase.rpc("set_inbox_typing", { p_to: otherId, p_typing: value }); }
        catch { /* Optional presence must never prevent sending a message. */ }
      });
    };
    const stop = () => {
      clearTimeout(idle);
      if (active) publish(false);
      active = false;
      lastSent = 0;
    };
    updateRef.current = (value) => {
      if (!value) { stop(); return; }
      const now = Date.now();
      if (!active || now - lastSent >= 2000) { publish(true); lastSent = now; }
      active = true;
      clearTimeout(idle);
      idle = setTimeout(stop, 3000);
    };
    let readRevision = 0;
    const refresh = async () => {
      const revision = ++readRevision;
      try {
        const { data, error } = await supabase.from("inbox_typing").select("expires_at")
          .eq("sender_id", otherId).eq("recipient_id", userId).maybeSingle();
        if (disposed || revision !== readRevision) return;
        clearTimeout(expiry);
        const remaining = error ? 0 : Date.parse(data?.expires_at ?? "") - Date.now();
        setTyping(remaining > 0);
        if (remaining > 0) expiry = setTimeout(() => setTyping(false), Math.min(remaining, 6000));
      } catch { if (!disposed) setTyping(false); }
    };
    const channel = supabase.channel(`inbox-typing-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_typing", filter: `recipient_id=eq.${userId}` }, () => void refresh())
      .subscribe((status) => { if (status === "SUBSCRIBED") void refresh(); });
    void refresh();
    const interval = window.setInterval(() => void refresh(), 3000);
    const onVisibility = () => { if (document.hidden) stop(); else void refresh(); };
    const onFocus = () => void refresh();
    window.addEventListener("blur", stop);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      stop();
      updateRef.current = () => {};
      clearTimeout(expiry);
      window.clearInterval(interval);
      window.removeEventListener("blur", stop);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      void supabase.removeChannel(channel);
    };
  }, [userId, otherId, enabled]);
  const updateTyping = useCallback((active: boolean) => updateRef.current(active), []);
  return { typing, updateTyping };
}