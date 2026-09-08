#!/usr/bin/env node
import fs from "node:fs";

const seedPath = "game_source/src/engine/playtestSeed.ts";
let seed = fs.readFileSync(seedPath, "utf8");
seed = seed.replace(
  'nominee(0, "Rurouni Ember: Crimson Pulse", "shonen", ["samurai", "martial"], 36, 47, 53, 42, 19_800)',
  'nominee(0, "Rurouni Ember: Crimson Pulse", "shonen", ["samurai", "martial"], 36, 50, 72, 44, 48_000)'
);
seed = seed.replace(
  'nominee(1, "Kimi ni Starlight", "shojo", ["romance", "slice"], 35, 52, 43, 48, 23_600)',
  'nominee(1, "Kimi ni Starlight", "shojo", ["romance", "slice"], 35, 70, 43, 50, 240_000)'
);
seed = seed.replace(
  'nominee(3, "Moonflower After Rain", "shojo", ["slice", "fantasy"], 32, 45, 40, 50, 15_700)',
  'nominee(3, "Moonflower After Rain", "shojo", ["slice", "fantasy"], 32, 45, 42, 70, 34_000)'
);
fs.writeFileSync(seedPath, seed);

const testPath = "game_source/src/engine/__tests__/rivalPosters.test.ts";
let test = fs.readFileSync(testPath, "utf8");
const oldBlock = `  it("respects recent-use avoidance; consecutive greenlights don't repeat", () => {
    const recent: string[] = [];
    for (let i = 0; i < 4; i++) {
      const p = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], recent, rand: () => 0.5 });
      expect(p).toBeTruthy();
      expect(recent).not.toContain(p!.id);
      recent.push(p!.id);
    }
    expect(new Set(recent).size).toBe(4);
  });`;
const newBlock = `  it("respects recent-use avoidance within the requested Anime Type", () => {
    const recent: string[] = [];
    /* The synthetic Toe-i pool has exactly three Shonen-compatible posters.
       Use each once before cooldown fallback is allowed to repeat one. */
    for (let i = 0; i < 3; i++) {
      const p = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], recent, rand: () => 0.5 });
      expect(p).toBeTruthy();
      expect(p!.animeTypes).toContain("shonen");
      expect(recent).not.toContain(p!.id);
      recent.push(p!.id);
    }
    expect(new Set(recent).size).toBe(3);
    const fallback = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], recent, rand: () => 0.5 });
    expect(fallback).toBeTruthy();
    expect(fallback!.animeTypes).toContain("shonen");
    expect(["t1", "t2", "t3"]).toContain(fallback!.id);
  });`;
if (!test.includes(newBlock)) {
  if (!test.includes(oldBlock)) throw new Error("Could not locate recent-use poster test");
  test = test.replace(oldBlock, newBlock);
  fs.writeFileSync(testPath, test);
}

console.log("Awards v5 validation fixtures aligned with hard Anime Type poster matching.");
