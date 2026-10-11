export type Sound = "tap" | "pop" | "success" | "swim";
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

function ensureMaster(): { audio: AudioContext; output: GainNode } | null {
  if (!window.AudioContext) return null;
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
  return { audio, output: master };
}

/**
 * Continuous watery swish that lasts the whole fish swim and fades out as the
 * fish leaves the screen. Returns a stop function for early teardown.
 */
export function startSwimSound(duration = 3.6): () => void {
  const noop = () => {};
  if (!gestureReceived || !enabled) return noop;
  try {
    const setup = ensureMaster();
    if (!setup) return noop;
    const { audio, output } = setup;
    let stopped = false;
    void audio.resume().then(() => {
      if (stopped || audio.state !== "running" || !enabled) return;
      const now = audio.currentTime;
      // Looping soft noise through a bandpass filter = rushing water.
      const noise = audio.createBufferSource();
      const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate);
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
      lfoGain.gain.value = 0.18;
      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(output);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.5, now + 0.3);
      gain.gain.setValueAtTime(0.5, now + Math.max(0.4, duration - 0.7));
      // Fade out exactly as the fish swims off screen.
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      noise.start(now);
      lfo.start(now);
      // Watery blub-bloops sprinkled across the whole swim.
      const bloop = (from: number, to: number, offset: number, length: number, volume: number) => {
        const oscillator = audio.createOscillator();
        const bGain = audio.createGain();
        const time = now + offset;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(from, time);
        oscillator.frequency.exponentialRampToValueAtTime(to, time + length * 0.7);
        bGain.gain.setValueAtTime(0.0001, time);
        bGain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
        bGain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        oscillator.connect(bGain);
        bGain.connect(output);
        oscillator.start(time);
        oscillator.stop(time + length + 0.01);
        oscillator.onended = () => { oscillator.disconnect(); bGain.disconnect(); };
      };
      for (let t = 0.1; t < duration - 0.4; t += 0.32) {
        bloop(380 + Math.random() * 420, 700 + Math.random() * 500, t, 0.1, 0.4);
      }
      noise.stop(now + duration + 0.05);
      lfo.stop(now + duration + 0.05);
      const end = now + duration + 0.06;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        try { noise.stop(); } catch { /* already stopped */ }
        try { lfo.stop(); } catch { /* already stopped */ }
      };
      noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); lfo.disconnect(); lfoGain.disconnect(); };
      window.setTimeout(stop, (end - now) * 1000 + 50);
      stopper = stop;
    }).catch(() => {});
    let stopper: () => void = noop;
    return () => { stopped = true; stopper(); };
  } catch {
    return noop;
  }
}

export function playSound(sound: Sound) {
  // Success and swim accompany the same click as a tap, so they bypass the anti-spam guard.
  if (!gestureReceived || !enabled || (sound !== "success" && sound !== "swim" && Date.now() - lastPlayed < 100)) return;
  try {
    const setup = ensureMaster();
    if (!setup) return;
    const { audio, output } = setup;
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