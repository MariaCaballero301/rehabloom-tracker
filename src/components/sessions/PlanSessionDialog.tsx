// "Do a session with {name}": propose a video or in-person session to someone in my network.
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, MapPin, Video } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { rpc } from "@/components/network/useNetwork";
import { localDateInput, MAX_PLACE_LENGTH, MAX_SESSION_NOTE_LENGTH, toStartsAt, type RehabSession } from "@/lib/sessions";

/** Pass `session` to reschedule an existing session instead of proposing a new one. */
export type PlanTarget = { id: string; name: string; session?: RehabSession };

export function PlanSessionDialog({
  target,
  onClose,
  onSent,
}: {
  target: PlanTarget | null;
  onClose: () => void;
  onSent?: () => void;
}) {
  const [mode, setMode] = useState<"video" | "in_person">("video");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("18:00");
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!target) return;
    const s = target.session;
    if (s) {
      const d = new Date(s.starts_at);
      setMode(s.mode === "in_person" ? "in_person" : "video");
      setDate(localDateInput(d));
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      setPlace(s.place);
      setNote(s.note);
      return;
    }
    const t = new Date();
    t.setDate(t.getDate() + 1);
    setMode("video");
    setDate(localDateInput(t));
    setTime("18:00");
    setPlace("");
    setNote("");
  }, [target]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!target) return;
    const startsAt = toStartsAt(date, time);
    if (!startsAt) return void toast.error("Pick a valid date and time.");
    setSending(true);
    try {
      if (target.session) {
        await rpc("reschedule_rehab_session", { p_id: target.session.id, p_starts_at: startsAt, p_note: note });
        toast.success(`New time sent to ${target.name} 💌`);
        onSent?.();
        onClose();
        return;
      }
      await rpc("propose_rehab_session", {
        p_with: target.id,
        p_starts_at: startsAt,
        p_mode: mode,
        p_place: mode === "in_person" ? place : "",
        p_note: note,
      });
      toast.success(`Invite sent to ${target.name} 💌`);
      onSent?.();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> {target?.session ? "Reschedule with" : "Do a session with"} {target?.name}
          </DialogTitle>
          <DialogDescription>{target?.session ? "They'll need to accept the new time." : "They'll get an invite and can accept or say not this time."}</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={submit}>
          <div className="flex gap-2" role="radiogroup" aria-label="How">
            {([
              ["video", "Video call", Video],
              ["in_person", "In person", MapPin],
            ] as const).map(([v, label, Icon]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mode === v}
                disabled={!!target?.session && mode !== v}
                className={mode === v ? "btn-aqua flex-1" : "btn-soft flex-1"}
                onClick={() => setMode(v)}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-semibold">
              Date
              <input className="field mt-1" type="date" required min={localDateInput(new Date())} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="text-sm font-semibold">
              Time
              <input className="field mt-1" type="time" required value={time} onChange={(e) => setTime(e.target.value)} />
            </label>
          </div>
          {mode === "in_person" && (
            <label className="block text-sm font-semibold">
              Where?
              <input className="field mt-1" disabled={!!target?.session} maxLength={MAX_PLACE_LENGTH} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Riverside park" />
            </label>
          )}
          <label className="block text-sm font-semibold">
            Note (optional)
            <textarea className="field mt-1" rows={2} maxLength={MAX_SESSION_NOTE_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Let's do our knee exercises together!" />
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-soft" onClick={onClose}>Cancel</button>
            <button className="btn-aqua" disabled={sending}>{sending ? "Sending…" : target?.session ? "Send new time" : "Send invite"}</button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
