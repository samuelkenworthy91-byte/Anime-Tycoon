/* Tiny synthesized SFX engine — no audio assets needed. */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem("kirameki.muted") === "1";
const ceremonySources = new Set<AudioScheduledSourceNode>();

function trackCeremony(node: AudioScheduledSourceNode) {
  ceremonySources.add(node);
  node.addEventListener("ended", () => ceremonySources.delete(node), { once: true });
}

function stopCeremonyAudio() {
  for (const node of ceremonySources) {
    try { node.stop(); } catch { /* already stopped */ }
  }
  ceremonySources.clear();
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function primeAudio() {
  ac();
}

export function isMuted() {
  return muted;
}

export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem("kirameki.muted", m ? "1" : "0");
  if (master) master.gain.value = m ? 0 : 0.5;
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.5, delay = 0, slideTo?: number, ceremony = false) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  if (ceremony) trackCeremony(o);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol = 0.4, cutoff = 1800, delay = 0, ceremony = false) {
  const c = ac();
  if (!c || !master) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  if (ceremony) trackCeremony(src);
  src.start(t0);
}

export const sfx = {
  stopCeremony() {
    stopCeremonyAudio();
  },
  audienceSwell() {
    noise(0.45, 0.08, 4300, 0, true);
    noise(0.7, 0.09, 5200, 0.28, true);
    noise(0.9, 0.08, 6000, 0.62, true);
    tone(330, 0.34, "sine", 0.07, 0.18, 440, true);
    tone(440, 0.34, "sine", 0.06, 0.54, 660, true);
  },
  drumroll(grand = false) {
    const beats = grand ? 34 : 26;
    for (let i = 0; i < beats; i++) {
      const p = i / Math.max(1, beats - 1);
      const delay = i * (grand ? 0.075 : 0.082);
      noise(0.07, 0.08 + p * 0.13, 850 + p * 1800, delay, true);
      tone(72 + p * 28, 0.055, "triangle", 0.055 + p * 0.06, delay, undefined, true);
    }
    tone(105, 0.42, "sine", 0.12, beats * (grand ? 0.075 : 0.082) - 0.12, 70, true);
  },
  applause(grand = false) {
    const bursts = grand ? 24 : 16;
    for (let i = 0; i < bursts; i++) {
      const delay = (i % 8) * 0.085 + Math.floor(i / 8) * 0.3;
      noise(0.11 + (i % 3) * 0.035, grand ? 0.19 : 0.14, 5200 + (i % 5) * 700, delay, true);
    }
    noise(grand ? 2.4 : 1.7, grand ? 0.085 : 0.06, 7000, 0.06, true);
    [660, 784, 880, 988].forEach((f, i) => tone(f, 0.24, "sine", grand ? 0.08 : 0.05, 0.16 + i * 0.17, f * 1.08, true));
  },
  click() {
    tone(720, 0.06, "square", 0.22);
  },
  hover() {
    tone(440, 0.035, "sine", 0.1);
  },
  select() {
    tone(620, 0.07, "triangle", 0.3);
    tone(930, 0.08, "triangle", 0.24, 0.05);
  },
  back() {
    tone(400, 0.07, "triangle", 0.25);
    tone(280, 0.08, "triangle", 0.2, 0.05);
  },
  type() {
    tone(1500 + Math.random() * 500, 0.02, "square", 0.05);
  },
  hit(combo = 0) {
    const base = 520 + Math.min(combo, 24) * 18;
    tone(base, 0.07, "sine", 0.4);
    tone(base * 1.5, 0.05, "triangle", 0.2, 0.01);
  },
  perfect(combo = 0) {
    const base = 660 + Math.min(combo, 24) * 20;
    tone(base, 0.08, "sine", 0.45);
    tone(base * 2, 0.09, "triangle", 0.28, 0.02);
    noise(0.05, 0.1, 6000);
  },
  miss() {
    tone(180, 0.16, "sawtooth", 0.3, 0, 90);
    noise(0.12, 0.22, 700);
  },
  coin() {
    tone(990, 0.07, "square", 0.3);
    tone(1320, 0.16, "square", 0.28, 0.07);
  },
  cash() {
    [0, 0.05, 0.1, 0.15].forEach((d, i) => tone(880 + i * 220, 0.07, "square", 0.2, d));
  },
  reveal() {
    tone(180, 0.5, "sawtooth", 0.16, 0, 640);
    noise(0.5, 0.06, 2400);
  },
  stamp() {
    noise(0.09, 0.5, 500);
    tone(90, 0.12, "sine", 0.5);
  },
  fanfare(ceremony = false) {
    const seq = [523, 523, 523, 659, 784, 1046];
    seq.forEach((f, i) => tone(f, i === seq.length - 1 ? 0.4 : 0.12, "square", 0.26, i * 0.11, undefined, ceremony));
    seq.forEach((f, i) => tone(f / 2, 0.12, "triangle", 0.18, i * 0.11, undefined, ceremony));
  },
  fail() {
    [420, 360, 300, 220].forEach((f, i) => tone(f, 0.16, "sawtooth", 0.2, i * 0.14));
  },
  phase() {
    tone(300, 0.24, "sawtooth", 0.14, 0, 900);
    tone(600, 0.2, "sine", 0.2, 0.08, 1200);
  },
  whoosh() {
    noise(0.25, 0.18, 1400);
    tone(200, 0.22, "sine", 0.18, 0, 700);
  },
};
