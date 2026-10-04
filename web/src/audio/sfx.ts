// Sound effects and a light music bed, synthesised with the Web Audio API —
// no audio files, nothing to download past the lab firewall. Sound is always
// a bonus: every alert is visual first, and lab PCs may have no speakers.
//
// Signal chain: voices → (dry + reverb send) → compressor → master → speakers.
// Musical sounds use A minor pentatonic so everything sounds like one game.

const MUTE_KEY = "overclock.muted";
const MUSIC_KEY = "overclock.music";

// ---------- settings (remembered per browser) ----------

function readFlag(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v === "1";
  } catch {
    return fallback;
  }
}
function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // ignore — just won't be remembered
  }
}

let muted = readFlag(MUTE_KEY, false);
let musicOn = readFlag(MUSIC_KEY, true);
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const isMuted = () => muted;
/** True once the browser lets audio play (after the first click or key press). */
export const isAudioRunning = () => graph?.ctx.state === "running";
export const isMusicOn = () => musicOn;
/** For useSyncExternalStore: re-render when settings change. */
export function onSoundSettingsChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function setMuted(value: boolean): void {
  muted = value;
  writeFlag(MUTE_KEY, value);
  if (value) music.stop();
  notify();
}
export function setMusicOn(value: boolean): void {
  musicOn = value;
  writeFlag(MUSIC_KEY, value);
  if (!value) music.stop();
  notify();
}

// ---------- the audio graph ----------

type Graph = { ctx: AudioContext; dry: GainNode; wet: GainNode; noise: AudioBuffer; meter: AnalyserNode };
let graph: Graph | null = null;

function buildGraph(): Graph {
  const ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16;
  comp.ratio.value = 4;
  comp.attack.value = 0.004;
  comp.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = 0.5;
  comp.connect(master).connect(ctx.destination);
  const meter = ctx.createAnalyser();
  meter.fftSize = 2048;
  master.connect(meter);

  // Short, dark room reverb from a generated impulse response.
  const len = Math.floor(ctx.sampleRate * 1.4);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  const reverb = ctx.createConvolver();
  reverb.buffer = ir;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  wet.connect(reverb).connect(comp);
  const dry = ctx.createGain();
  dry.connect(comp);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  return { ctx, dry, wet, noise, meter };
}

/** Browsers only allow audio after a click or key press, so start lazily. */
function audio(): Graph | null {
  if (muted) return null;
  try {
    if (!graph) {
      graph = buildGraph();
      graph.ctx.onstatechange = notify;
    }
    if (graph.ctx.state === "suspended") void graph.ctx.resume();
    return graph;
  } catch {
    return null;
  }
}

if (typeof window !== "undefined") {
  // Keep trying on every interaction until the browser lets audio run.
  const unlock = () => {
    const g = audio();
    if (g?.ctx.state === "running") {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);

  if (import.meta.env.DEV) {
    // Dev only: current output level (RMS, 0 → 1) and audio state, for checking sound without ears.
    Object.assign(window, {
      __overclockAudio: () => {
        if (!graph) return { state: "not started", level: 0 };
        const data = new Float32Array(graph.meter.fftSize);
        graph.meter.getFloatTimeDomainData(data);
        const rms = Math.sqrt(data.reduce((sum, x) => sum + x * x, 0) / data.length);
        return { state: graph.ctx.state, level: Math.round(rms * 1000) / 1000 };
      },
    });
  }
}

/** Route a node to the speakers with some reverb. */
function out(g: Graph, node: AudioNode, reverb = 0.25): void {
  node.connect(g.dry);
  if (reverb > 0) {
    const send = g.ctx.createGain();
    send.gain.value = reverb;
    node.connect(send).connect(g.wet);
  }
}

// ---------- building blocks ----------

type Voice = {
  freq: number;
  to?: number; // pitch glide target
  type?: OscillatorType;
  dur: number;
  at?: number; // delay in seconds
  gain?: number;
  attack?: number;
  /** Lowpass cutoff that sweeps from `cutoff` to `cutoffTo` (Hz). */
  cutoff?: number;
  cutoffTo?: number;
  /** Extra detuned copies for width (cents). */
  detune?: number;
  reverb?: number;
};

function voice(v: Voice): void {
  const g = audio();
  if (!g) return;
  const t0 = g.ctx.currentTime + (v.at ?? 0);
  const env = g.ctx.createGain();
  const peak = v.gain ?? 0.4;
  const attack = v.attack ?? 0.008;
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + v.dur);

  let dest: AudioNode = env;
  if (v.cutoff) {
    const f = g.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 3;
    f.frequency.setValueAtTime(v.cutoff, t0);
    if (v.cutoffTo) f.frequency.exponentialRampToValueAtTime(v.cutoffTo, t0 + v.dur);
    f.connect(env);
    dest = f;
  }

  const spreads = v.detune ? [-v.detune, 0, v.detune] : [0];
  for (const cents of spreads) {
    const osc = g.ctx.createOscillator();
    osc.type = v.type ?? "sine";
    osc.detune.value = cents;
    osc.frequency.setValueAtTime(v.freq, t0);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, t0 + v.dur);
    const scale = g.ctx.createGain();
    scale.gain.value = 1 / spreads.length;
    osc.connect(scale).connect(dest);
    osc.start(t0);
    osc.stop(t0 + v.dur + 0.05);
  }
  out(g, env, v.reverb ?? 0.2);
}

type Noise = { dur: number; at?: number; gain?: number; type?: BiquadFilterType; from: number; to?: number; q?: number; reverb?: number; attack?: number };

function noise(n: Noise): void {
  const g = audio();
  if (!g) return;
  const t0 = g.ctx.currentTime + (n.at ?? 0);
  const src = g.ctx.createBufferSource();
  src.buffer = g.noise;
  const f = g.ctx.createBiquadFilter();
  f.type = n.type ?? "bandpass";
  f.Q.value = n.q ?? 1;
  f.frequency.setValueAtTime(n.from, t0);
  if (n.to) f.frequency.exponentialRampToValueAtTime(n.to, t0 + n.dur);
  const env = g.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(n.gain ?? 0.4, t0 + (n.attack ?? 0.01));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
  src.connect(f).connect(env);
  out(g, env, n.reverb ?? 0.2);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + n.dur + 0.05);
}

/** FM bell: metallic, bright — shields, coins, chimes. */
function bell(freq: number, { at = 0, dur = 0.6, gain = 0.3, ratio = 3.5, index = 2.5, reverb = 0.35 } = {}): void {
  const g = audio();
  if (!g) return;
  const t0 = g.ctx.currentTime + at;
  const carrier = g.ctx.createOscillator();
  const mod = g.ctx.createOscillator();
  const modGain = g.ctx.createGain();
  carrier.frequency.value = freq;
  mod.frequency.value = freq * ratio;
  modGain.gain.setValueAtTime(freq * index, t0);
  modGain.gain.exponentialRampToValueAtTime(1, t0 + dur);
  mod.connect(modGain).connect(carrier.frequency);
  const env = g.ctx.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.004);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  carrier.connect(env);
  out(g, env, reverb);
  for (const o of [carrier, mod]) {
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
}

/** Punchy low drum: pitch drops fast. */
const kick = (at = 0, gain = 0.9, from = 150, to = 42) =>
  voice({ freq: from, to, type: "sine", dur: 0.32, at, gain, attack: 0.002, reverb: 0.08 });

// A minor pentatonic, a few octaves.
const N = {
  A2: 110, C3: 130.8, D3: 146.8, E3: 164.8, G3: 196, A3: 220, C4: 261.6, D4: 293.7, E4: 329.6, G4: 392,
  A4: 440, C5: 523.3, D5: 587.3, E5: 659.3, G5: 784, A5: 880, C6: 1046.5, E6: 1318.5,
};

/** A short melody of plucked notes. */
function melody(freqs: number[], step: number, { type = "triangle" as OscillatorType, gain = 0.32, hold = 1.8 } = {}) {
  freqs.forEach((f, i) => {
    voice({ freq: f, type, dur: step * hold, at: i * step, gain, cutoff: 5000, cutoffTo: 1200, detune: 6, reverb: 0.3 });
  });
}

/** A held chord (all notes at once). */
function chord(freqs: number[], { at = 0, dur = 1.2, gain = 0.18, type = "sawtooth" as OscillatorType } = {}) {
  for (const f of freqs) voice({ freq: f, type, dur, at, gain, attack: 0.02, cutoff: 2800, cutoffTo: 600, detune: 9, reverb: 0.4 });
}

// ---------- the sounds ----------

export const sfx = {
  // UI
  click: () => noise({ dur: 0.03, from: 4000, gain: 0.15, type: "highpass", reverb: 0 }),
  tab: () => noise({ dur: 0.18, from: 900, to: 3500, gain: 0.12, q: 2, reverb: 0.1 }),
  slot: () => {
    noise({ dur: 0.04, from: 2500, gain: 0.2, type: "highpass", reverb: 0 });
    voice({ freq: N.E5, type: "triangle", dur: 0.12, gain: 0.15, at: 0.02 });
  },
  ready: () => melody([N.A4, N.E5], 0.07, { gain: 0.28 }),
  unready: () => melody([N.E5, N.A4], 0.07, { gain: 0.22 }),
  vote: () => bell(N.C6, { dur: 0.35, gain: 0.18, index: 1.5 }),

  // Economy
  buy: () => {
    bell(N.E6, { dur: 0.25, gain: 0.16, ratio: 2, index: 1.2, reverb: 0.15 });
    bell(N.A5 * 2, { at: 0.05, dur: 0.3, gain: 0.14, ratio: 2, index: 1.2, reverb: 0.15 });
  },
  sell: () => voice({ freq: N.A5, to: N.A4, type: "triangle", dur: 0.16, gain: 0.2, cutoff: 3000 }),
  denied: () => {
    voice({ freq: 98, type: "square", dur: 0.14, gain: 0.16, cutoff: 700 });
    voice({ freq: 92, type: "square", dur: 0.14, gain: 0.12, cutoff: 700, at: 0.02 });
  },
  boost: () => {
    for (let i = 0; i < 6; i++) bell(N.A5 * (1 + i * 0.12), { at: i * 0.035, dur: 0.4, gain: 0.08, index: 1 });
    voice({ freq: N.A3, to: N.A4, type: "sawtooth", dur: 0.45, gain: 0.08, cutoff: 600, cutoffTo: 4000 });
  },
  serverOnline: () => voice({ freq: N.A3, to: N.A4, type: "sine", dur: 0.22, gain: 0.14, cutoff: 1200, cutoffTo: 5000, reverb: 0.15 }),
  defenceReady: () => {
    noise({ dur: 0.05, from: 3000, gain: 0.25, type: "highpass", reverb: 0 });
    bell(N.E5, { at: 0.04, dur: 0.5, gain: 0.2, index: 1.8 });
  },
  attackReady: () => {
    voice({ freq: N.E4, to: N.E5, type: "sawtooth", dur: 0.16, gain: 0.08, cutoff: 900, cutoffTo: 4000, reverb: 0.1 });
    bell(N.E6, { at: 0.12, dur: 0.3, gain: 0.1, index: 1 });
  },

  // Combat
  attackSent: () => {
    noise({ dur: 0.55, from: 300, to: 4500, gain: 0.35, q: 1.5, attack: 0.2, reverb: 0.3 });
    voice({ freq: 80, to: 320, type: "sawtooth", dur: 0.5, gain: 0.12, cutoff: 400, cutoffTo: 3000 });
    kick(0.45, 0.6, 120, 50);
  },
  warning: () => {
    voice({ freq: 988, type: "square", dur: 0.13, gain: 0.13, cutoff: 3500, reverb: 0.15 });
    voice({ freq: 740, type: "square", dur: 0.13, gain: 0.13, cutoff: 3500, at: 0.15, reverb: 0.15 });
  },
  hit: () => {
    kick(0, 1, 160, 38);
    noise({ dur: 0.3, from: 1800, to: 150, gain: 0.4, q: 0.8, reverb: 0.25 });
  },
  landed: () => {
    kick(0, 0.35, 110, 50);
    melody([N.C5, N.E5, N.A5], 0.06, { gain: 0.22 });
  },
  blocked: () => {
    bell(N.A5, { dur: 1.1, gain: 0.3, ratio: 2.76, index: 3, reverb: 0.5 });
    bell(N.E6, { at: 0.02, dur: 0.8, gain: 0.15, ratio: 3.1, index: 2, reverb: 0.5 });
  },
  crash: () => {
    kick(0, 1, 140, 30);
    noise({ dur: 1.6, from: 900, to: 50, gain: 0.7, q: 0.6, reverb: 0.5 });
    voice({ freq: 55, to: 28, type: "sawtooth", dur: 1.6, gain: 0.3, cutoff: 300, reverb: 0.3 });
    chord([N.A2, N.C3, N.E3], { at: 0.25, dur: 1.4, gain: 0.12 });
  },
  theyCrashed: () => {
    kick(0, 0.7, 140, 35);
    noise({ dur: 0.9, from: 700, to: 80, gain: 0.45, reverb: 0.4 });
    melody([N.A4, N.C5, N.E5, N.A5], 0.08, { gain: 0.28 });
  },
  recovered: () => melody([N.A4, N.C5, N.E5, N.A5, N.C6], 0.06, { gain: 0.24, type: "sine" }),
  heartbeat: () => {
    kick(0, 0.55, 90, 40);
    kick(0.16, 0.4, 85, 40);
  },

  // What hit you — each attack has its own signature
  hitBots: () => {
    for (let i = 0; i < 10; i++) {
      voice({ freq: 400 + ((i * 337) % 900), type: "square", dur: 0.04, at: i * 0.035, gain: 0.07, cutoff: 3000, reverb: 0.05 });
    }
  },
  hitCut: () => {
    for (let i = 0; i < 6; i++) voice({ freq: i % 2 ? 180 : 720, type: "square", dur: 0.035, at: i * 0.05, gain: 0.12, cutoff: 2500, reverb: 0 });
    noise({ dur: 0.25, from: 6000, gain: 0.15, type: "highpass", at: 0.3, reverb: 0.1 });
  },
  hitSlow: () => voice({ freq: N.A4, to: N.A2, type: "sawtooth", dur: 0.9, gain: 0.14, cutoff: 2000, cutoffTo: 300, detune: 25 }),
  hitSurge: () => noise({ dur: 1.4, from: 300, to: 1400, gain: 0.3, q: 0.5, attack: 0.5, reverb: 0.5 }),
  hitMelt: () => {
    for (let i = 0; i < 5; i++) noise({ dur: 0.12, from: 5000, gain: 0.18, type: "highpass", at: i * 0.07 + Math.random() * 0.03, reverb: 0.1 });
    voice({ freq: 300, to: 90, type: "sawtooth", dur: 0.6, gain: 0.1, cutoff: 1500 });
  },
  hitFlush: () => noise({ dur: 0.8, from: 3000, to: 200, gain: 0.25, q: 3, reverb: 0.3 }),

  // Clock + rounds
  tick: () => {
    noise({ dur: 0.03, from: 3200, gain: 0.25, q: 6, reverb: 0.05 });
    voice({ freq: 1600, type: "sine", dur: 0.04, gain: 0.08, reverb: 0 });
  },
  tickUrgent: () => {
    noise({ dur: 0.04, from: 2400, gain: 0.35, q: 6, reverb: 0.1 });
    voice({ freq: N.A5, type: "square", dur: 0.08, gain: 0.08, cutoff: 3000 });
  },
  go: () => {
    kick(0, 0.8);
    chord([N.A3, N.E4, N.A4], { dur: 0.7, gain: 0.16 });
    melody([N.E5, N.A5], 0.08, { gain: 0.25 });
  },
  roundWon: () => {
    melody([N.A4, N.C5, N.E5, N.A5], 0.11, { gain: 0.3 });
    chord([N.A3, N.E4, N.A4], { at: 0.33, dur: 1, gain: 0.12 });
  },
  roundLost: () => melody([N.E5, N.D5, N.C5, N.A4], 0.15, { gain: 0.26, type: "sine" }),
  matchWon: () => {
    melody([N.A4, N.C5, N.E5, N.A5, N.E5, N.A5, N.C6], 0.12, { gain: 0.3 });
    chord([N.A3, N.E4, N.A4, N.C5], { at: 0.72, dur: 1.8, gain: 0.14 });
    kick(0.72, 0.7);
  },
  matchLost: () => {
    melody([N.A4, N.G4, N.E4, N.D4, N.C4], 0.2, { gain: 0.24, type: "sine", hold: 2.2 });
    chord([N.A2, N.C3, N.E3], { at: 0.8, dur: 1.8, gain: 0.1 });
  },
};

// ---------- background music ----------

/**
 * A light chiptune loop: square-wave melody and triangle bass over
 * Am – F – C – G. "menu" is gentle (melody + bass); "live" adds hats and a
 * soft kick, and `intensity` 0 → 1 speeds it up for the end of a round.
 * Notes are scheduled ahead on the audio clock so timing stays tight.
 */
export type MusicMode = "off" | "menu" | "live";

export const music = (() => {
  const LOOKAHEAD = 0.2; // seconds of notes scheduled ahead
  /** Overall music loudness: light under the effects, but audible on laptop speakers. */
  const LEVEL = 3;
  // Chord roots and their arpeggio tones (A minor arcade progression).
  const CHORDS = [
    { bass: N.A2, tones: [N.A4, N.C5, N.E5, N.A5] },
    { bass: 87.31, tones: [349.2, N.A4, N.C5, 698.5] }, // F
    { bass: N.C3, tones: [N.C5, N.E5, N.G5, N.C6] },
    { bass: 98, tones: [N.G4, 493.9, N.D5, N.G5] }, // G
  ];
  // Melody shape per bar: index into the chord's tones (-1 = rest).
  const PATTERNS = [
    [0, 2, 1, 2, 3, 2, 1, 2],
    [0, 1, 2, 3, 2, 1, 0, -1],
    [3, 2, 1, 2, 0, 1, 2, 3],
    [0, 2, 3, 2, 1, -1, 1, 2],
  ];

  let mode: MusicMode = "off";
  let intensity = 0;
  let step = 0;
  let nextTime = 0;
  let timer: number | null = null;

  const stepSec = () => 60 / (104 + intensity * 36) / 2; // eighth notes

  function playStep(i: number, when: number, g: Graph) {
    const at = Math.max(0, when - g.ctx.currentTime);
    const bar = Math.floor(i / 8) % CHORDS.length;
    const beat = i % 8;
    const chord = CHORDS[bar]!;
    const pattern = PATTERNS[Math.floor(i / 32) % PATTERNS.length]!;
    const live = mode === "live";

    // Pad: a soft held chord each bar, so there's always a gentle bed of sound.
    if (beat === 0) {
      for (const f of chord.tones.slice(0, 3)) {
        voice({ freq: f / 2, type: "triangle", dur: stepSec() * 8, at, gain: 0.05 * LEVEL, attack: 0.25, cutoff: 1400, cutoffTo: 700, detune: 7, reverb: 0.5 });
      }
    }

    // Bass: root on the beat (plus a quiet octave so laptop speakers can hear it),
    // octave bounce on the off-beat in rounds.
    if (beat % 2 === 0) {
      voice({ freq: chord.bass, type: "triangle", dur: 0.3, at, gain: 0.09 * LEVEL, reverb: 0.05 });
      voice({ freq: chord.bass * 2, type: "square", dur: 0.22, at, gain: 0.025 * LEVEL, cutoff: 900, cutoffTo: 300, reverb: 0.05 });
    } else if (live) {
      voice({ freq: chord.bass * 2, type: "triangle", dur: 0.14, at, gain: 0.06 * LEVEL, reverb: 0.05 });
    }

    // Melody: softer and sparser in menus.
    const note = pattern[beat]!;
    if (note >= 0 && (live || beat % 2 === 0)) {
      voice({
        freq: chord.tones[note]!,
        type: "square",
        dur: live ? 0.16 : 0.3,
        at,
        gain: (live ? 0.085 : 0.075) * LEVEL,
        cutoff: live ? 3600 : 2600,
        cutoffTo: 900,
        reverb: 0.25,
      });
    }

    // Drums (live only): kick on 1 and 3, hats on the off-beats.
    if (live) {
      if (beat === 0 || beat === 4) kick(at, (0.28 + intensity * 0.12) * LEVEL, 120, 48);
      if (beat % 2 === 1) noise({ dur: 0.04, at, from: 8000, gain: 0.05 * LEVEL + intensity * 0.03, type: "highpass", reverb: 0 });
    }
  }

  function tick() {
    const g = graph;
    if (!g || g.ctx.state !== "running" || muted || !musicOn || mode === "off") return;
    const now = g.ctx.currentTime;
    if (nextTime < now) nextTime = now + 0.05;
    while (nextTime < now + LOOKAHEAD) {
      playStep(step, nextTime, g);
      nextTime += stepSec();
      step++;
    }
  }

  return {
    setMode(next: MusicMode) {
      if (next === mode) return;
      // Restart the phrase on a mode change so it lands on the downbeat.
      if (mode === "off" || next === "live") step = 0;
      mode = next;
      if (mode !== "off" && timer === null) timer = window.setInterval(tick, 50);
      if (mode === "off" && timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    },
    setIntensity(value: number) {
      intensity = Math.max(0, Math.min(1, value));
    },
    /** Silence immediately (muting); the mode is kept for when sound returns. */
    stop() {
      nextTime = 0;
    },
  };
})();
