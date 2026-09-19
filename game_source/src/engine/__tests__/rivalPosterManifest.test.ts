import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import * as path from "node:path";

import manifest from "../generated/rivalPosterManifest.json";
import expansionPlan from "../generated/rivalPosterExpansionPlan.json";
import genreRuntime from "../generated/genreV3.json";
import {
  BIG_THREE_RESERVED_POSTER_IDS,
  RIVAL_POSTERS,
  genericPosterOptions,
  pickRivalPoster,
} from "../rivalPosters";

const ROOT = path.resolve(__dirname, "../../..");
const PUBLIC = path.join(ROOT, "public");

const STUDIO_PERSONAS: Record<string, string> = {
  "Toe-i Animation": "blockbuster",
  Sunnyrise: "technical",
  Boneworks: "experimental",
  "Kyo-Hani": "prestige",
  "Madcap House": "volume",
  "Turtle Line": "idol",
};

const activeGenres = new Set(genreRuntime.genres.map((genre) => genre.id));
const live = manifest.posters.filter((poster) => !poster.pending);
const pending = manifest.posters.filter((poster) => !!poster.pending);

describe("real shared industry poster manifest", () => {
  it("keeps capacity/generated/pending metadata exact", () => {
    expect(manifest.posters).toHaveLength(manifest.capacity.total);
    expect(live).toHaveLength(manifest.generated);
    expect(pending).toHaveLength(manifest.pending);
    expect(manifest.capacity.studios).toBe(Object.keys(STUDIO_PERSONAS).length);

    for (const studio of Object.keys(STUDIO_PERSONAS)) {
      expect(
        manifest.posters.filter((poster) => poster.studio === studio).length,
        `${studio} slot count`
      ).toBe(manifest.capacity.perStudio);
    }
  });

  it("has unique stable IDs and unique live asset paths", () => {
    const ids = manifest.posters.map((poster) => poster.id);
    const images = live.map((poster) => poster.img);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(images).size).toBe(images.length);
  });

  it("uses valid studios, personas, anime types and active genre IDs", () => {
    for (const poster of manifest.posters) {
      expect(STUDIO_PERSONAS[poster.studio], `${poster.id} studio`).toBeTruthy();
      expect(poster.persona, `${poster.id} persona`).toBe(STUDIO_PERSONAS[poster.studio]);
      expect(poster.animeTypes.length, `${poster.id} animeTypes`).toBeGreaterThan(0);
      expect(poster.animeTypes.every((type) => type === "shonen" || type === "shojo")).toBe(true);
      expect(new Set(poster.animeTypes).size).toBe(poster.animeTypes.length);
      if (!poster.pending) {
        expect(poster.genres.length, `${poster.id} genres`).toBeGreaterThan(0);
        expect(poster.genres.length, `${poster.id} genres`).toBeLessThanOrEqual(3);
        expect(poster.genres.every((genre) => activeGenres.has(genre)), `${poster.id} active genres`).toBe(true);
      }
    }
  });

  it("all live manifest assets exist and are non-empty", () => {
    const broken = live.filter((poster) => {
      const file = path.join(PUBLIC, poster.img.replace(/^\//, ""));
      return !existsSync(file) || statSync(file).size === 0;
    });
    expect(broken.map((poster) => `${poster.id}: ${poster.img}`)).toEqual([]);
  });

  it("ordinary live art is reachable by both player and owning rival studio", () => {
    const unreachablePlayer: string[] = [];
    const unreachableRival: string[] = [];

    for (const poster of live) {
      if (BIG_THREE_RESERVED_POSTER_IDS.has(poster.id)) continue;
      const type = poster.animeTypes[0] as "shonen" | "shojo";

      const playerPool = genericPosterOptions(type, poster.genres as never[], 10_000);
      if (!playerPool.some((candidate) => candidate.id === poster.id)) unreachablePlayer.push(poster.id);

      const blocked = RIVAL_POSTERS
        .filter((candidate) => candidate.studio === poster.studio && candidate.id !== poster.id)
        .map((candidate) => candidate.id);
      const rival = pickRivalPoster({
        studio: poster.studio,
        animeType: type,
        genres: poster.genres as never[],
        blocked,
        rand: () => 0,
      });
      if (rival?.id !== poster.id) unreachableRival.push(poster.id);
    }

    expect(unreachablePlayer, "player-unreachable poster IDs").toEqual([]);
    expect(unreachableRival, "rival-unreachable poster IDs").toEqual([]);
  });

  it("Big Three reserved art remains live but unreachable to routine poster selection", () => {
    for (const id of BIG_THREE_RESERVED_POSTER_IDS) {
      const poster = live.find((candidate) => candidate.id === id);
      expect(poster, `missing reserved poster ${id}`).toBeTruthy();
      const type = poster!.animeTypes[0] as "shonen" | "shojo";
      expect(genericPosterOptions(type, poster!.genres as never[], 10_000).some((candidate) => candidate.id === id)).toBe(false);
      expect(
        pickRivalPoster({
          studio: poster!.studio,
          animeType: type,
          genres: poster!.genres as never[],
          blocked: [],
          recent: [],
          rand: () => 0,
        })?.id
      ).not.toBe(id);
    }
  });
});

describe("96-poster expansion plan", () => {
  const additions = expansionPlan.additions;

  it("adds exactly 16 posters to each established studio without ID/path collisions", () => {
    expect(additions).toHaveLength(96);
    expect(new Set(additions.map((poster) => poster.id)).size).toBe(96);
    expect(new Set(additions.map((poster) => poster.img)).size).toBe(96);

    const existingIds = new Set(manifest.posters.map((poster) => poster.id));
    const existingPaths = new Set(live.map((poster) => poster.img));
    for (const addition of additions) {
      expect(existingIds.has(addition.id), `${addition.id} ID collision`).toBe(false);
      expect(existingPaths.has(addition.img), `${addition.id} path collision`).toBe(false);
    }

    for (const studio of Object.keys(STUDIO_PERSONAS)) {
      expect(additions.filter((poster) => poster.studio === studio), studio).toHaveLength(16);
    }
  });

  it("keeps expansion metadata valid and families intentional", () => {
    const families = new Map<string, typeof additions>();
    for (const poster of additions) {
      expect(poster.persona).toBe(STUDIO_PERSONAS[poster.studio]);
      expect(poster.animeTypes.length).toBeGreaterThan(0);
      expect(poster.animeTypes.every((type) => type === "shonen" || type === "shojo")).toBe(true);
      expect(poster.genres.length).toBeGreaterThanOrEqual(1);
      expect(poster.genres.length).toBeLessThanOrEqual(3);
      expect(poster.genres.every((genre) => activeGenres.has(genre))).toBe(true);
      expect(poster.concept.trim().length).toBeGreaterThan(40);
      expect(BIG_THREE_RESERVED_POSTER_IDS.has(poster.id)).toBe(false);
      if (poster.family) {
        const rows = families.get(poster.family) ?? [];
        rows.push(poster);
        families.set(poster.family, rows);
      }
    }

    expect(families.size).toBe(12);
    expect(additions.filter((poster) => !!poster.family)).toHaveLength(36);
    expect(additions.filter((poster) => !poster.family)).toHaveLength(60);
    for (const [family, rows] of families) {
      expect(rows, family).toHaveLength(3);
      expect(new Set(rows.map((poster) => poster.studio)).size, family).toBe(1);
    }
  });

  it("closes every currently active genre coverage hole without padding only legacy favourites", () => {
    const combined = [...live, ...additions];
    const coverage = Object.fromEntries([...activeGenres].map((genre) => [
      genre,
      combined.filter((poster) => poster.genres.includes(genre)).length,
    ]));

    for (const genre of activeGenres) {
      expect(coverage[genre], `${genre} combined coverage`).toBeGreaterThan(0);
    }

    for (const gap of ["isekai", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"]) {
      expect(additions.filter((poster) => poster.genres.includes(gap)).length, gap).toBeGreaterThanOrEqual(8);
    }

    expect(additions.filter((poster) => poster.genres.includes("romance")).length).toBeLessThanOrEqual(10);
    expect(additions.filter((poster) => poster.genres.includes("mecha")).length).toBeLessThanOrEqual(2);
  });

  it("keeps new Shonen and Shojo compatibility effectively balanced", () => {
    const shonenCompatible = additions.filter((poster) => poster.animeTypes.includes("shonen")).length;
    const shojoCompatible = additions.filter((poster) => poster.animeTypes.includes("shojo")).length;
    expect(Math.abs(shonenCompatible - shojoCompatible)).toBeLessThanOrEqual(1);
  });
});
