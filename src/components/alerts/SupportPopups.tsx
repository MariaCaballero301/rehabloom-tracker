// Short live heads-up toasts for supporters and session guests (Realtime). The alert itself stays
// in the Sessions panel (SessionsBubble) until it's handled.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SupportPopups() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const open = { label: "Open", onClick: () => void window.dispatchEvent(new Event("rehabloom:open-sessions")) };
    const channel = supabase
      .channel(`support-popups-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_notifications", filter: `recipient_id=eq.${userId}` }, (payload) => {
        const n = payload.new as { patient_name?: string };
        toast(`${n.patient_name || "Someone"} could use a little support 💚`, { description: "See it in Sessions.", action: open });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rehab_sessions", filter: `guest_id=eq.${userId}` }, (payload) => {
        const s = payload.new as { organizer_name?: string };
        toast(`${s.organizer_name || "Someone"} invited you to a session together 🤝`, { action: open });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rehab_sessions", filter: `guest_id=eq.${userId}` }, (payload) => {
        const s = payload.new as { organizer_name?: string; status?: string };
        if (s.status === "proposed") toast(`${s.organizer_name || "Someone"} suggested a new time for your session 🔁`, { action: open });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
