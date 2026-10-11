// Looping Frutiger Aero background track, generated once with Google Lyria.
// Starts on the first click (browser autoplay rules) and follows the shared sound toggle.
import { useEffect, useRef } from "react";
import themeMp3 from "@/assets/frutiger-aero-theme.mp3";
import { getSoundEnabled, SOUND_SETTING_EVENT } from "@/lib/sounds";

export function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const el = audio.current;
    if (!el) return;
    el.volume = 0.22;
    const sync = () => {
      if (getSoundEnabled()) {
        void el.play().catch(() => { /* Browsers wait for the first click. */ });
      } else {
        el.pause();
      }
    };
    const onGesture = () => { if (getSoundEnabled()) void el.play().catch(() => {}); };
    sync();
    document.addEventListener("pointerdown", onGesture, true);
    window.addEventListener(SOUND_SETTING_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      el.pause();
      document.removeEventListener("pointerdown", onGesture, true);
      window.removeEventListener(SOUND_SETTING_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return <audio ref={audio} src={themeMp3} loop preload="auto" aria-hidden />;
}
