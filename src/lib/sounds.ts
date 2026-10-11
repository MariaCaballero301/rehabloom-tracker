export type Sound = "tap" | "pop" | "success" | "swim";
export type SoundElement = { disabled?: boolean; override?: string | null; bubble?: boolean; interactive?: boolean };
/** Pure selection, independent of browser state or audio. */
export function soundForElement(element: SoundElement): Sound | null {
  if (element.disabled || element.override === "none") return null;
  if (element.override === "pop" || element.override === "success") return element.override;
  if (element.bubble) return "pop";
  return element.interactive ? "tap" : null;
}

/** Pure overlap policy: only an exact repeat of the same sound is dropped, so
 * different sounds can play on top of one another instead of silencing each other. */
export function shouldPlaySound(sound: Sound, now: number, lastPlayed: Map<Sound, number>, windowMs = 60): boolean {
  const previous = lastPlayed.get(sound);
  return previous === undefined || now - previous >= windowMs;
}

const KEY = "rehabloom:sound-enabled";
export const SOUND_SETTING_EVENT = "rehabloom:sound-setting";
const BUBBLES = ".bubble, .inbox-trigger, .sessions-trigger, .nav-bubble, .buddy-icon-btn, .buddy-cycle-btn";
const CONTROLS = 'button, a[href], input[type="checkbox"], input[type="radio"], select, [role="button"], [role="switch"], [role="checkbox"], [role="combobox"]';
let enabled = true;
let context: AudioContext | undefined;
let master: GainNode | undefined;
let swimBus: GainNode | undefined;
let gestureReceived = false;
// Only an exact repeat of the same sound is suppressed; different sounds overlap freely.
const lastPlayedFor = new Map<Sound, number>();

export function getSoundEnabled() {
  try { return localStorage.getItem(KEY) !== "false"; } catch { return enabled; }
}
export function setSoundEnabled(value: boolean) {
  enabled = value;
  try { localStorage.setItem(KEY, String(value)); } catch { /* Private browsing may block storage. */ }
  window.dispatchEvent(new Event(SOUND_SETTING_EVENT));
}

function ensureMaster(): { audio: AudioContext; output: GainNode; swim: GainNode } | null {
  if (!window.AudioContext) return null;
  context ??= new AudioContext();
  const audio = context;
  if (!master || !swimBus) {
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
    // The swim is long and quiet, so it gets its own path straight to the
    // speakers: a pop or chime landing on top of it can no longer duck it.
    swimBus = audio.createGain();
    swimBus.gain.value = 0.5;
    swimBus.connect(audio.destination);
  }
  if (!master || !swimBus) return null;
  return { audio, output: master, swim: swimBus };
}

/**
 * Continuous watery swish that lasts the whole fish swim and fades out as the
 * fish leaves the screen. Returns a stop function for early teardown.
 */
export function startSwimSound(duration = 3.6): () => void {
  const noop = () => {};
  if (!gestureReceived || !enabled) return noop;
  let stopper: () => void = noop;
  try {
    const setup = ensureMaster();
    if (!setup) return noop;
    const { audio, swim } = setup;
    let stopped = false;
    void audio.resume().then(() => {
      if (stopped || audio.state !== "running" || !enabled) return;
      const now = audio.currentTime;
      const length = Math.max(0.6, duration);
      const holdUntil = now + Math.max(0.4, length - 0.6);
      // One buffer long enough for the whole swim, so nothing has to restart.
      const noise = audio.createBufferSource();
      const buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * (length + 0.5)), audio.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      noise.buffer = buffer;
      noise.loop = true;
      const filter = audio.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 650;
      filter.Q.value = 0.8;
      const gain = audio.createGain();
      // Slow wobble makes the swish bob like the fish.
      const lfo = audio.createOscillator();
      lfo.type = "sine";
      lfo.frequency.value = 2.3;
      const lfoGain = audio.createGain();
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(swim);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.5, now + 0.25);
      gain.gain.setValueAtTime(0.5, holdUntil);
      // Fade out exactly as the fish swims off screen.
      gain.gain.linearRampToValueAtTime(0.0001, now + length);
      // The wobble has to leave with the swish, otherwise it keeps the tail audible.
      lfoGain.gain.setValueAtTime(0.18, now);
      lfoGain.gain.setValueAtTime(0.18, holdUntil);
      lfoGain.gain.linearRampToValueAtTime(0.0001, now + length);
      noise.start(now);
      lfo.start(now);
      // Watery blub-bloops sprinkled across the whole swim.
      const bloop = (from: number, to: number, offset: number, bloopyLength: number, volume: number) => {
        const oscillator = audio.createOscillator();
        const bGain = audio.createGain();
        const time = now + offset;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(from, time);
        oscillator.frequency.exponentialRampToValueAtTime(to, time + bloopyLength * 0.7);
        bGain.gain.setValueAtTime(0.0001, time);
        bGain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
        bGain.gain.exponentialRampToValueAtTime(0.0001, time + bloopyLength);
        oscillator.connect(bGain);
        bGain.connect(swim);
        oscillator.start(time);
        oscillator.stop(time + bloopyLength + 0.01);
        oscillator.onended = () => { oscillator.disconnect(); bGain.disconnect(); };
      };
      for (let t = 0.1; t < length - 0.4; t += 0.32) {
        bloop(380 + Math.random() * 420, 700 + Math.random() * 500, t, 0.1, 0.3);
      }
      noise.stop(now + length + 0.05);
      lfo.stop(now + length + 0.05);
      const stop = () => {
        if (stopped) return;
        stopped = true;
        try { noise.stop(); } catch { /* already stopped */ }
        try { lfo.stop(); } catch { /* already stopped */ }
      };
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
      window.setTimeout(stop, (length + 0.1) * 1000);
      stopper = stop;
    }).catch(() => {});
    return () => { stopped = true; stopper(); };
  } catch {
    return noop;
  }
}

export function playSound(sound: Sound) {
  if (!gestureReceived || !enabled) return;
  if (!shouldPlaySound(sound, Date.now(), lastPlayedFor)) return;
  lastPlayedFor.set(sound, Date.now());
  try {
    const setup = ensureMaster();
    if (!setup) return;
    const { audio, output } = setup;
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
        tone(660, 700, 0, 0.2, 0.55);
        tone(880, 990, 0.13, 0.28, 0.55);
        tone(1320, 1320, 0.13, 0.3, 0.2, "sine");
      }
      if (sound === "swim") {
        // Watery swim-by: a soft low sweep with rising blub-bloop bubbles.
        tone(180, 420, 0, 0.4, 0.22, "sine");
        tone(500, 800, 0.05, 0.09, 0.3, "sine");
        tone(700, 1000, 0.14, 0.09, 0.3, "sine");
        tone(900, 1300, 0.23, 0.11, 0.3, "sine");
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
