// Swimming fish that carry XP messages across the screen (replaces plain XP toasts).
import { useEffect, useState } from "react";
import butterfly from "@/assets/fish-butterfly.png";
import tang from "@/assets/fish-tang.png";
import clown from "@/assets/fish-clown.png";
import { xpBadgeText } from "@/lib/xp-message";
import { playSound } from "@/lib/sounds";

const FISH = [
  { src: butterfly, facesLeft: false },
  { src: tang, facesLeft: true },
  { src: clown, facesLeft: false },
];

const EVENT = "rehabloom:xp";

export function celebrateXp(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

type Swim = { id: number; message: string; fish: number; top: number };

export function XpFishLayer() {
  const [swims, setSwims] = useState<Swim[]>([]);
  useEffect(() => {
    let n = 0;
    const on = (e: Event) => {
      const id = ++n;
      const message = String((e as CustomEvent).detail ?? "");
      playSound("success");
      playSound("swim");
      setSwims((s) => [...s, { id, message, fish: Math.floor(Math.random() * FISH.length), top: 18 + Math.random() * 30 }]);
      window.setTimeout(() => setSwims((s) => s.filter((x) => x.id !== id)), 3800);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  return (
    <div className="xp-fish-layer" aria-live="polite">
      {swims.map((s) => {
        const f = FISH[s.fish]!;
        return (
          <div key={s.id} className="xp-fish-swim" style={{ top: `${s.top}%` }}>
            <div className="xp-fish-bob">
              <img src={f.src} alt="" className={f.facesLeft ? "xp-fish-img xp-fish-flip" : "xp-fish-img"} />
              <span className="xp-fish-text">{xpBadgeText(s.message)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
