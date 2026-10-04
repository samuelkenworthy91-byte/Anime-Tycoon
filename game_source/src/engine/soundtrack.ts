export const soundtrackTracks = [
  "Blade of the Void.mp3",
  "Calm of the Shinobi World.mp3",
  "Episode in Progress.mp3",
  "First Series Dreams.mp3",
  "First Sketch.mp3",
  "Late Studio Sketches.mp3",
  "Storyboard Groove.mp3",
];

/** Fisher–Yates shuffle, with no immediate repeat between cycles. */
export function shuffledTracks(previous?: string, random = Math.random): string[] {
  const tracks = [...soundtrackTracks];
  for (let i = tracks.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
  }
  if (tracks[0] === previous && tracks.length > 1) {
    const j = 1 + Math.floor(random() * (tracks.length - 1));
    [tracks[0], tracks[j]] = [tracks[j], tracks[0]];
  }
  return tracks;
}

function readMusicMuted() {
  try { return localStorage.getItem("kirameki.musicMuted") === "1"; }
  catch { return false; }
}

let musicMuted = readMusicMuted();
let globalMuted = false;
let player: HTMLAudioElement | null = null;
let queue: string[] = [];
let current: string | undefined;
let failures = 0;

export function isMusicMuted() { return musicMuted; }

function resume() {
  if (!player || musicMuted || globalMuted || document.hidden) return;
  // Autoplay restrictions are retried on the next user gesture.
  void player.play().catch(() => {});
}

function updatePlayback() {
  if (!player) return;
  if (musicMuted || globalMuted || document.hidden) player.pause();
  else resume();
}

export function setMusicMuted(value: boolean) {
  musicMuted = value;
  try { localStorage.setItem("kirameki.musicMuted", value ? "1" : "0"); }
  catch { /* still works when storage is unavailable */ }
  updatePlayback();
}

export function setSoundtrackGlobalMuted(value: boolean) {
  globalMuted = value;
  updatePlayback();
}

function nextTrack() {
  if (!player) return;
  if (!queue.length) queue = shuffledTracks(current);
  current = queue.shift();
  player.src = `${import.meta.env.BASE_URL}music/${encodeURIComponent(current!)}`;
  resume();
}

/** Called from game-start gestures; the single player survives screen changes. */
export function primeSoundtrack(muted: boolean) {
  globalMuted = muted;
  if (!player && typeof Audio !== "undefined") {
    player = new Audio();
    player.preload = "auto";
    player.volume = 0.3;
    player.addEventListener("playing", () => { failures = 0; });
    player.addEventListener("ended", nextTrack);
    player.addEventListener("error", () => {
      // Skip unavailable tracks without an infinite error loop.
      if (++failures < soundtrackTracks.length) nextTrack();
    });
    const retry = () => {
      if (failures >= soundtrackTracks.length) { failures = 0; nextTrack(); }
      else resume();
    };
    document.addEventListener("pointerdown", retry);
    document.addEventListener("keydown", retry);
    document.addEventListener("visibilitychange", updatePlayback);
    nextTrack();
  }
  updatePlayback();
}
