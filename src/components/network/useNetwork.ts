// Loads everything the "Your people" page needs and exposes a reload function.
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { DirectoryProfile } from "@/lib/network";
import type { BuddyStats } from "@/lib/buddy-stats";

// The network tables are not in the generated types until Lovable regenerates them.
export const db = supabase as unknown as SupabaseClient;

export type MyProfile = DirectoryProfile & { finished_therapy: boolean; photo_path?: string | null; share_exercise_counts?: boolean };
export type Contact = {
  id: string;
  name: string;
  phone: string;
  notify_on_missed: boolean;
  kind: string;
  connected_user_id: string | null;
};
export type Supported = { user_id: string; name: string; kind: string };
export type ConnectionRequest = {
  id: string;
  from_user: string;
  to_user: string;
  from_name: string;
  to_name: string;
  kind: string;
  message: string;
  created_at: string;
  read_at?: string | null;
};
export type Encouragement = {
  id: string;
  from_name: string;
  message: string;
  created_at: string;
  read_at: string | null;
};
export type InviteCode = { id: string; code: string; relationship: string; expires_at: string };
export type Block = { blocked_id: string; blocked_name: string };

export const emptyProfile = (userId: string): MyProfile => ({
  user_id: userId,
  display_name: "",
  rehab_area: "other",
  languages: [],
  availability: [],
  discoverable: false,
  is_mentor: false,
  mentor_bio: "",
  finished_therapy: false,
  share_exercise_counts: false,
});

/** Calls a database function and turns its error into a thrown Error with a readable message. */
export async function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await db.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function useNetwork(userId: string) {
  const [state, setState] = useState({
    loading: true,
    profile: emptyProfile(userId),
    hasProfile: false,
    contacts: [] as Contact[],
    supporting: [] as Supported[],
    requests: [] as ConnectionRequest[],
    encouragements: [] as Encouragement[],
    directory: [] as DirectoryProfile[],
    invites: [] as InviteCode[],
    blocks: [] as Block[],
    buddyStats: [] as BuddyStats[],
    statsError: false,
  });

  const reload = useCallback(async () => {
    const [profile, contacts, supporting, requests, encouragements, directory, invites, blocks, stats] =
      await Promise.all([
        db.from("network_profiles").select("*").eq("user_id", userId).maybeSingle(),
        db
          .from("support_contacts")
          .select("id, name, phone, notify_on_missed, kind, connected_user_id")
          .eq("user_id", userId)
          .order("created_at"),
        db.rpc("people_i_support"),
        db
          .from("connection_requests")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        db
          .from("encouragements")
          .select("id, from_name, message, created_at, read_at")
          .eq("to_user", userId)
          .order("created_at", { ascending: false })
          .limit(20),
        db.rpc("network_directory"),
        db
          .from("invite_codes")
          .select("id, code, relationship, expires_at")
          .is("used_at", null)
          .order("created_at", { ascending: false }),
        db.from("blocks").select("blocked_id, blocked_name"),
        db.rpc("buddy_relationship_stats", { p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      ]);
    setState({
      loading: false,
      profile: (profile.data as MyProfile | null) ?? emptyProfile(userId),
      hasProfile: Boolean(profile.data),
      contacts: (contacts.data ?? []) as Contact[],
      supporting: (supporting.data ?? []) as Supported[],
      requests: (requests.data ?? []) as ConnectionRequest[],
      encouragements: (encouragements.data ?? []) as Encouragement[],
      directory: (directory.data ?? []) as DirectoryProfile[],
      invites: (invites.data ?? []) as InviteCode[],
      blocks: (blocks.data ?? []) as Block[],
      buddyStats: (stats.data ?? []) as BuddyStats[],
      statsError: Boolean(stats.error),
    });
  }, [userId]);

  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), 30_000);
    const refresh = () => void reload();
    window.addEventListener("focus", refresh);
    window.addEventListener("rehabloom:message-sent", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("rehabloom:message-sent", refresh);
    };
  }, [reload]);

  return { ...state, reload };
}
