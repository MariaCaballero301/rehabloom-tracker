// Session-completion celebrations shared by SessionsBubble (fallback + tapper) and SupportPopups (realtime).
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { celebrateXp } from "@/components/XpFish";
import { earnsSessionXp } from "@/lib/rehab";

type DoneRow = { id: string; status: string; completed_by: string | null; completed_at: string | null };

/** Completed by the other person within the last 24 h and not yet celebrated here. */
export function uncelebratedCompletions<T extends DoneRow>(rows: T[], userId: string, celebrated: Set<string>, now: Date): T[] {
  return rows.filter((r) => r.status === "completed" && !!r.completed_by && r.completed_by !== userId && !!r.completed_at
    && now.getTime() - new Date(r.completed_at).getTime() <= 24 * 3600_000 && new Date(r.completed_at).getTime() <= now.getTime() + 60_000
    && !celebrated.has(r.id));
}

const key = (userId: string) => `rehabloom:celebrated:${userId}`;
export function readCelebrated(userId: string): Set<string> {
  try { const v = JSON.parse(localStorage.getItem(key(userId)) ?? "[]"); return new Set(Array.isArray(v) ? v.map(String) : []); } catch { return new Set(); }
}
/** Returns false when this session was already celebrated (so callers skip it). */
export function markCelebrated(userId: string, sessionId: string): boolean {
  const set = readCelebrated(userId);
  if (set.has(sessionId)) return false;
  set.add(sessionId);
  try { localStorage.setItem(key(userId), JSON.stringify([...set].slice(-200))); } catch { /* storage unavailable */ }
  return true;
}

/** Toast + fish for a completed session; honest one-per-day XP. `name` = who marked it (null = me). */
export async function celebrateCompletion(userId: string, sessionId: string, name: string | null) {
  if (!markCelebrated(userId, sessionId)) return;
  const { data: mine } = await supabase.from("rehab_sessions").select("id, status, completed_at").eq("status", "completed");
  if (earnsSessionXp(mine ?? [], sessionId, new Date())) {
    toast.success(name ? `${name} marked your session as done 🎉 +15 XP` : "Session done together 🎉 +15 XP");
    celebrateXp("+15 XP");
  } else {
    toast.success("Session done together 🎉 (today’s session XP already earned)");
    celebrateXp("Done together 🎉");
  }
  window.dispatchEvent(new Event("rehabloom:xp-changed"));
  window.dispatchEvent(new Event("rehabloom:message-sent"));
}
