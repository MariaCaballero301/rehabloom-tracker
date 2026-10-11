export type Sound = "tap" | "pop" | "success";
export type SoundElement = { disabled?: boolean; override?: string | null; bubble?: boolean; interactive?: boolean };
/** Pure selection, independent of browser state or audio. */
export function soundForElement(element: SoundElement): Sound | null {
  if (element.disabled || element.override === "none") return null;
  if (element.override === "pop" || element.override === "success") return element.override;
  if (element.bubble) return "pop";
  return element.interactive ? "tap" : null;
}

const KEY = "rehabloom:sound-enabled";
export const SOUND_SETTING_EVENT = "rehabloom:sound-setting";
const BUBBLES = ".bubble, .inbox-trigger, .sessions-trigger, .nav-bubble, .buddy-icon-btn, .buddy-cycle-btn";
const CONTROLS = 'button, a[href], input[type="checkbox"], input[type="radio"], select, [role="button"], [role="switch"], [role="checkbox"], [role="combobox"]';
let enabled = true;
let context: AudioContext | undefined;
let master: GainNode | undefined;
let gestureReceived = false;
let lastPlayed = -Infinity;

export function getSoundEnabled() {
  try { return localStorage.getItem(KEY) !== "false"; } catch { return enabled; }
}
export function setSoundEnabled(value: boolean) {
  enabled = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* Private browsing may block storage. */ }
  window.dispatchEvent(new Event(SOUND_SETTING_EVENT));
}

export function playSound(sound: Sound) {
  // Explicit success calls bypass the anti-spam guard so they aren't swallowed by the tap from the same click.
  if (!gestureReceived || !enabled || (sound !== "success" && Date.now() - lastPlayed < 100)) return;
  try {
    if (!window.AudioContext) return;
    context ??= new AudioContext();
    const audio = context;
    if (!master) {
      master = audio.createGain();
      master.gain.value = 0.6;
      // Compressor keeps the louder output from clipping.
      const compressor = audio.createDynamicsCompressor();
      compressor.threshold.value = -10;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.1;
      master.connect(compressor);
      compressor.connect(audio.destination);
    }
    const output = master;
    lastPlayed = Date.now();
    void audio.resume().then(() => {
      if (audio.state !== "running" || !enabled) return;
      const tone = (from: number, to: number, offset: number, duration: number, volume: number, type: OscillatorType = "triangle") => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const time = audio.currentTime + offset;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from, time);
        oscillator.frequency.exponentialRampToValueAtTime(to, time + duration * 0.7);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume, time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(gain); gain.connect(output);
        oscillator.start(time); oscillator.stop(time + duration + 0.01);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      };
      if (sound === "tap") tone(1000, 700, 0, 0.07, 0.45);
      if (sound === "pop") { tone(450, 1400, 0, 0.12, 0.8); tone(2200, 1600, 0.08, 0.05, 0.35, "sine"); }
      if (sound === "success") {
        tone(700, 660, 0, 0.2, 0.55);
        tone(990, 880, 0.13, 0.28, 0.55);
        tone(1320, 1320, 0.13, 0.3, 0.2, "sine");
      }
    }).catch(() => {});
  } catch { /* Audio must never prevent an action. */ }
}

export function installSounds() {
  enabled = getSoundEnabled();
  const sync = () => { enabled = getSoundEnabled(); };
  const onClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    let control = event.target.closest(CONTROLS);
    // Clicking a checkbox label also emits a click on its input: sound only once on that input.
    if (!control) {
      const label = event.target.closest("label");
      if (label instanceof HTMLLabelElement && label.control) return;
      control = event.target.closest(BUBBLES);
    }
    if (!control) return;
    if (event.isTrusted) gestureReceived = true;
    const override = control.closest("[data-sound]")?.getAttribute("data-sound") ?? null;
    const sound = soundForElement({ disabled: Boolean(control.closest('[disabled], [aria-disabled="true"], [inert]')), override,
      bubble: Boolean(control.closest(BUBBLES)), interactive: control.matches(CONTROLS) });
    if (sound) playSound(sound);
  };
  // Capture precedes React updates, so newly disabled saving buttons still sound on the initiating click.
  document.addEventListener("click", onClick, true);
  window.addEventListener("storage", sync);
  window.addEventListener(SOUND_SETTING_EVENT, sync);
  return () => {
    document.removeEventListener("click", onClick, true);
    window.removeEventListener("storage", sync);
    window.removeEventListener(SOUND_SETTING_EVENT, sync);
  };
}