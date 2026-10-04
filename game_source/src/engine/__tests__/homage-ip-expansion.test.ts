import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { AUCTION_IPS, generateAuction, initIPMarket } from "../ip";
import { HOMAGE_IP_CATALOG, HOMAGE_IP_HIDDEN_ARCS, HOMAGE_IP_SOURCE_CANON } from "../homageIpExpansion";
import { ARCS, GENRES, type GenreId } from "../data";
import { genericPosterOptions, rivalPostersForStudio } from "../rivalPosters";

const authored = JSON.parse(readFileSync(join(process.cwd(), "docs/HOMAGE_IP_EXPANSION.json"), "utf8")) as {
  slot: number; series: string; poster: string; genres: GenreId[];
  characters: { name: string; sourceCharacter: string }[];
}[];

describe("uploaded homage expansion", () => {
  it("maps every uploaded IP to its poster title, original-source spoof cast and native genres", () => {
    expect(authored).toHaveLength(37);
    for (const row of authored) {
      const ip = AUCTION_IPS.find((ip) => ip.posterSlot === row.slot)!;
      expect(ip, `slot ${row.slot}`).toBeDefined();
      expect(ip.title).toBe(row.series);
      expect(ip.posterAsset).toBe(row.poster);
      expect(ip.genreTags).toEqual(row.genres);
      expect(ip.characters.map((c) => c.name)).toEqual(row.characters.map((c) => c.name));
      expect(ip.characters.every((c, i) => c.name !== row.characters[i].sourceCharacter)).toBe(true);
      expect(existsSync(join(process.cwd(), "public", ip.posterAsset))).toBe(true);
      expect(HOMAGE_IP_SOURCE_CANON[row.slot].reference.length).toBeGreaterThan(3);
      expect(ip.specialArcUnlock).toBe(`ip_arc_${row.slot}`);
    }
    expect(new Set(HOMAGE_IP_CATALOG.map((ip) => ip.title)).size).toBe(37);
  });

  it("makes every new scene available in both native player catalogue categories and the rival pool", () => {
    for (const row of authored) {
      const id = `homage_rival_${row.slot}`;
      for (const animeType of ["shonen", "shojo"] as const) {
        const options = genericPosterOptions(animeType, row.genres);
        const poster = options.find((p) => p.id === id)!;
        expect(poster, id).toBeDefined();
        expect(poster.genres).toEqual(row.genres);
        expect(poster.shared).toBe(true);
        expect(poster.pending).toBe(false);
        for (const genre of row.genres) {
          // The release browser builds each category using this native-genre filter.
          expect(options.filter((p) => p.genres.includes(genre)).some((p) => p.id === id)).toBe(true);
          expect(GENRES.some((g) => g.id === genre)).toBe(true);
        }
        expect(genericPosterOptions(animeType, row.genres, undefined, [id]).some((p) => p.id === id)).toBe(false);
        expect(existsSync(join(process.cwd(), "public", poster.img))).toBe(true);
      }
      expect(rivalPostersForStudio("Any rival").some((p) => p.id === id)).toBe(true);
    }
  });

  it("gives each new IP a valid learnable arc and a path into late-game auctions", () => {
    for (const seed of HOMAGE_IP_HIDDEN_ARCS) {
      expect(ARCS.some((a) => a.id === seed.id && a.unlock?.kind === "studioArc")).toBe(true);
      expect(ARCS.some((a) => a.id === seed.partnerArc)).toBe(true);
    }
    for (const row of authored) {
      const market = initIPMarket(1000, () => 0);
      market.rivalOwned = Object.fromEntries(AUCTION_IPS.filter((ip) => ip.posterSlot !== row.slot).map((ip) => [ip.id, "rival"]));
      const auction = generateAuction({ week: 1000, fans: 2_000_000, awards: 20, bestScore: 40, showsMade: 50, ipMarket: market }, () => 0);
      expect(auction?.ipId).toBe(`ip_${row.slot}`);
    }
  });
});
