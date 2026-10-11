import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSoundEnabled, setSoundEnabled, SOUND_SETTING_EVENT } from "@/lib/sounds";

export function SoundToggle() {
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const sync = () => setEnabled(getSoundEnabled());
    sync();
    window.addEventListener(SOUND_SETTING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(SOUND_SETTING_EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  return <Button variant="ghost" size="icon" className="btn-soft shrink-0 rounded-full p-0" data-sound="none"
    title={enabled ? "Mute sounds" : "Enable sounds"} aria-label={enabled ? "Mute sounds" : "Enable sounds"} aria-pressed={enabled}
    onClick={() => setSoundEnabled(!enabled)}>{enabled ? <Volume2 /> : <VolumeX />}</Button>;
}