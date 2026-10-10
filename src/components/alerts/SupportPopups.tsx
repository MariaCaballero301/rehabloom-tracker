// In-app pop-up alerts for supporters: shows unread missed-session notifications live
// (Realtime) or on next open. Replaces real SMS while Twilio isn't available.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { HeartHandshake, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Note = {
  id: string;
  patient_name: string;
  missed_days: number;
  support_token: string;
};

export function SupportPopups() {
  const [userId, setUserId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) return setNotes([]);
    let active = true;
    void supabase
      .from("support_notifications")
      .select("id, patient_name, missed_days, support_token")
      .eq("recipient_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => active && setNotes(data ?? []));

    const channel = supabase
      .channel(`support-notes-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Note;
          setNotes((prev) => (prev.some((p) => p.id === n.id) ? prev : [n, ...prev]));
        },
      )
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function close(n: Note, opened: boolean) {
    setNotes((prev) => prev.filter((p) => p.id !== n.id));
    const now = new Date().toISOString();
    await supabase
      .from("support_notifications")
      .update(opened ? { read_at: now, dismissed_at: now } : { dismissed_at: now })
      .eq("id", n.id);
  }

  if (notes.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      role="region"
      aria-label="Support alerts"
    >
      {notes.map((n) => (
        <div key={n.id} role="alertdialog" aria-labelledby={`sn-${n.id}`} className="glass p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div className="min-w-0 flex-1">
              <p id={`sn-${n.id}`} className="font-semibold">
                {n.patient_name} could use a check-in
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                They've missed their rehab sessions for {n.missed_days} days. A kind message can
                help.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  to="/support/$token"
                  params={{ token: n.support_token }}
                  className="btn-aqua text-sm"
                  onClick={() => void close(n, true)}
                >
                  Offer support
                </Link>
                <button className="btn-soft text-sm" onClick={() => void close(n, false)}>
                  Later
                </button>
              </div>
            </div>
            <button
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
              onClick={() => void close(n, false)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
