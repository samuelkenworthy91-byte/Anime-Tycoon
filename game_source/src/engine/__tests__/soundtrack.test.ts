import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeAudio extends EventTarget {
  static instances: FakeAudio[] = [];
  src = "";
  preload = "";
  volume = 1;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor() { super(); FakeAudio.instances.push(this); }
}

let values: Map<string, string>;
let doc: EventTarget & { hidden: boolean };
beforeEach(() => {
  vi.resetModules();
  FakeAudio.instances = [];
  values = new Map();
  doc = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal("document", doc);
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});

describe("soundtrack", () => {
  it("plays all seven once each and avoids boundary repeats over many cycles", async () => {
    const music = await import("../soundtrack");
    music.primeSoundtrack(false);
    const audio = FakeAudio.instances[0];
    let previous = "";
    for (let cycle = 0; cycle < 100; cycle++) {
      const played: string[] = [];
      for (let i = 0; i < 7; i++) {
        expect(audio.src).not.toBe(previous);
        previous = audio.src;
        played.push(decodeURIComponent(audio.src.split("music/")[1]));
        audio.dispatchEvent(new Event("ended"));
      }
      expect(played.sort()).toEqual([...music.soundtrackTracks].sort());
    }
    music.primeSoundtrack(false);
    expect(FakeAudio.instances).toHaveLength(1);
  });

  it("remembers music mute, respects global mute and resumes the same track", async () => {
    values.set("kirameki.musicMuted", "1");
    const music = await import("../soundtrack");
    music.primeSoundtrack(false);
    const audio = FakeAudio.instances[0];
    const track = audio.src;
    expect(audio.play).not.toHaveBeenCalled();
    music.setMusicMuted(false);
    expect(values.get("kirameki.musicMuted")).toBe("0");
    expect(audio.play).toHaveBeenCalled();
    music.setSoundtrackGlobalMuted(true);
    audio.play.mockClear();
    doc.dispatchEvent(new Event("pointerdown"));
    expect(audio.play).not.toHaveBeenCalled();
    music.setSoundtrackGlobalMuted(false);
    expect(audio.src).toBe(track);
    doc.hidden = true;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(audio.pause).toHaveBeenCalled();
    audio.play.mockClear();
    doc.hidden = false;
    doc.dispatchEvent(new Event("visibilitychange"));
    expect(audio.play).toHaveBeenCalled();
  });

  it("bounds missing-track retries and recovers on a gesture", async () => {
    const music = await import("../soundtrack");
    music.primeSoundtrack(false);
    const audio = FakeAudio.instances[0];
    for (let i = 0; i < 7; i++) audio.dispatchEvent(new Event("error"));
    expect(audio.play).toHaveBeenCalledTimes(8); // initial prime also resumes
    audio.play.mockClear();
    doc.dispatchEvent(new Event("pointerdown"));
    expect(audio.play).toHaveBeenCalledOnce();
  });
});
