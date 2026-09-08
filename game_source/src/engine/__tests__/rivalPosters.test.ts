/* Rival poster selection engine — operates against a small synthetic manifest */
import { describe, expect, it, vi } from "vitest";

vi.mock("../generated/rivalPosterManifest.json", () => ({
  default: {
    schema: 1,
    posters: [
      /* Toe-i Frontier — blockbuster */
      { id: "t1", img: "/rival-posters/t1.webp", studio: "Toe-i Frontier", persona: "blockbuster", animeTypes: ["shonen"], genres: ["mecha", "sports"], family: "titans", pending: false },
      { id: "t2", img: "/rival-posters/t2.webp", studio: "Toe-i Frontier", persona: "blockbuster", animeTypes: ["shonen"], genres: ["military"], family: "titans", pending: false },
      { id: "t3", img: "/rival-posters/t3.webp", studio: "Toe-i Frontier", persona: "blockbuster", animeTypes: ["shonen"], genres: ["sports"], family: "pitch", pending: false },
      { id: "t4", img: "/rival-posters/t4.webp", studio: "Toe-i Frontier", persona: "blockbuster", animeTypes: ["shojo"], genres: ["idol"], family: null, pending: false },
      /* this slot's art hasn't shipped — never selectable */
      { id: "t5", img: "/rival-posters/t5.webp", studio: "Toe-i Frontier", persona: "blockbuster", animeTypes: ["shonen"], genres: ["mecha"], family: null, pending: true },
      /* Sunnyrise — technical */
      { id: "s1", img: "/rival-posters/s1.webp", studio: "Sunnyrise", persona: "technical", animeTypes: ["shonen"], genres: ["mecha"], family: "orb", pending: false },
      { id: "s2", img: "/rival-posters/s2.webp", studio: "Sunnyrise", persona: "technical", animeTypes: ["shonen"], genres: ["mecha", "sci"], family: "orb", pending: false },
      { id: "s3", img: "/rival-posters/s3.webp", studio: "Sunnyrise", persona: "technical", animeTypes: ["shojo"], genres: ["romance"], family: null, pending: false },
    ],
  },
}));

import {
  RIVAL_POSTERS,
  RIVAL_POSTER_SLOTS,
  pickRivalPoster,
  poolSize,
  rivalPosterById,
  noDuplicatePosters,
  postersInUse,
} from "../rivalPosters";

describe("rival poster pools", () => {
  it("pending slots are excluded from selection but visible to tooling", () => {
    expect(RIVAL_POSTORS_ALL()).toBe(RIVAL_POSTER_SLOTS);
    expect(RIVAL_POSTER_SLOTS.length).toBe(8);
    expect(RIVAL_POSTERS.length).toBe(7);
    expect(poolSize("Toe-i Frontier")).toBe(4);
    expect(poolSize("Sunnyrise")).toBe(3);
    expect(rivalPosterById("t5")).toBeNull();
  });
});

describe("pickRivalPoster", () => {
  const rnd0 = () => 0; /* deterministic choice */

  it("only ever picks from the OWNING studio's pool", () => {
    for (let i = 0; i < 30; i++) {
      const p = pickRivalPoster({ studio: "Sunnyrise", animeType: "shonen", genres: ["mecha"], rand: Math.random });
      expect(p!.studio).toBe("Sunnyrise");
    }
    /* unknown studio → graceful null, never a crash */
    expect(pickRivalPoster({ studio: "Nobody", animeType: "shonen", genres: ["mecha"], rand: rnd0 })).toBeNull();
  });

  it("respects recent-use avoidance within the requested Anime Type", () => {
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
  });

  it("when the whole pool is on cooldown it falls back to the least-recent slice", () => {
    const recent = ["t1", "t2", "t3", "t4"];
    const p = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], recent, rand: rnd0 });
    expect(p).toBeTruthy();
    /* least-recently used = t1 / t2 slice, never the just-used t4 */
    expect(["t1", "t2"]).toContain(p!.id);
  });

  it("continues a franchise's visual family when one is given", () => {
    /* the titans family has t1+t2: two consecutive entries differ but stay in family w/ rand spread */
    const p1 = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], family: "titans", rand: () => 0.01 });
    const p2 = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shonen", genres: ["mecha"], family: "titans", recent: [p1!.id], rand: () => 0.99 });
    expect(p1!.family).toBe("titans");
    expect(p2!.family).toBe("titans");
    expect(p2!.id).not.toBe(p1!.id);
  });

  it("genre fit beats type-only matches", () => {
    /* shojo+idol request: t4 is the only idol poster even though it's shojo-only */
    const p = pickRivalPoster({ studio: "Toe-i Frontier", animeType: "shojo", genres: ["idol"], rand: rnd0 });
    expect(p!.id).toBe("t4");
  });

  it("is deterministic under a fixed rand", () => {
    const a = pickRivalPoster({ studio: "Sunnyrise", animeType: "shonen", genres: ["mecha"], rand: rnd0 });
    const b = pickRivalPoster({ studio: "Sunnyrise", animeType: "shonen", genres: ["mecha"], rand: rnd0 });
    expect(a!.id).toBe(b!.id);
  });
});

describe("ceremony poster audits", () => {
  it("postersInUse + noDuplicatePosters audit a ceremony's nominees", () => {
    const releases = [{ posterId: "t1" }, { posterId: "t2" }, { posterId: null }];
    expect([...postersInUse(releases)].sort()).toEqual(["t1", "t2"]);
    expect(noDuplicatePosters(releases)).toBe(true);
    expect(noDuplicatePosters([...releases, { posterId: "t1" }])).toBe(false);
  });
});

/* shush — TS keeps the import used */
function RIVAL_POSTORS_ALL() { return RIVAL_POSTER_SLOTS; }
