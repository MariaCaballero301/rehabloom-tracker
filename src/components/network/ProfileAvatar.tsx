import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROFILE_PHOTO_BUCKET } from "@/lib/profile-photo";

export function ProfileAvatar({ userId, name, path, preview, large = false }: {
  userId?: string | null;
  name: string;
  path?: string | null;
  preview?: string | null;
  large?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl(null);
    setFailed(false);
    async function load() {
      if (!userId || preview) return;
      const photoPath = path !== undefined ? path : (await supabase.rpc("visible_profile_photo", { p_user_id: userId })).data;
      if (!photoPath) return;
      const { data } = await supabase.storage.from(PROFILE_PHOTO_BUCKET).createSignedUrl(photoPath, 3600);
      if (active) setUrl(data?.signedUrl ?? null);
    }
    void load().catch(() => {});
    return () => { active = false; };
  }, [userId, path, preview]);
  const source = preview ?? url;
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-accent text-accent-foreground shadow-sm ${large ? "h-20 w-20" : "h-10 w-10"}`}>
      {source && !failed ? (
        <img src={source} alt={`${name || "Your"} profile photo`} className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : <UserRound aria-hidden="true" className={large ? "h-9 w-9" : "h-5 w-5"} />}
    </span>
  );
}