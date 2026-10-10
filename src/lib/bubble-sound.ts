const BUBBLE_CONTROL = ".bubble, .btn-aqua, .btn-soft, .nav-bubble, .buddy-icon-btn, .buddy-cycle-btn";

/** Sound is created only after a deliberate click, never during rendering or background updates. */
export function installBubbleSounds() {
  let context: AudioContext | undefined;
  let lastPlayed = 0;
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target.closest(BUBBLE_CONTROL) : null;
    if (!target || target.closest('[disabled], [aria-disabled="true"]') || !target.matches('button, a, [role="button"]')) return;
    if (Date.now() - lastPlayed < 100) return;
    if (!window.AudioContext) return;
    lastPlayed = Date.now();
    try {
      context ??= new AudioContext();
      const audio = context;
      void audio.resume().then(() => {
        if (audio.state !== "running") return;
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const time = audio.currentTime;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(650, time);
        oscillator.frequency.exponentialRampToValueAtTime(180, time + 0.085);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.055, time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(time);
        oscillator.stop(time + 0.12);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }).catch(() => {});
    } catch { /* Unsupported or blocked audio never prevents a click. */ }
  };
  document.addEventListener("click", onClick);
  return () => { document.removeEventListener("click", onClick); void context?.close().catch(() => {}); };
}