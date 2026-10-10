// Short live heads-up toasts for supporters and session guests (Realtime). The alert itself stays
// on the home screen (HomeSupport) until it's handled.
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SupportPopups() {
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const open = { label: "Open", onClick: () => void navigate({ to: "/" }) };
    const channel = supabase
      .channel(`support-popups-${userId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "support_notifications", filter: `recipient_id=eq.${userId}` }, (payload) => {
        const n = payload.new as { patient_name?: string };
        toast(`${n.patient_name || "Someone"} could use a little support 💚`, { description: "See it on your home screen.", action: open });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rehab_sessions", filter: `guest_id=eq.${userId}` }, (payload) => {
        const s = payload.new as { organizer_name?: string };
        toast(`${s.organizer_name || "Someone"} invited you to a session together 🤝`, { action: open });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, navigate]);

  return null;
}
