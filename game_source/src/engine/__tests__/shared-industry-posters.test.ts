import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifestJson from "../generated/rivalPosterManifest.json";
import catalogJson from "../generated/sharedIndustryPosterCatalog.json";
import {
  RIVAL_POSTERS,
  genericPosterOptions,
  pickRivalPoster,
  rivalPostersForStudio,
} from "../rivalPosters";

type RuntimePoster = {
  id: string;
  img: string;
  studio: string;
  persona: string;
  animeTypes: string[];
  genres: string[];
  family: string | null;
  pending?: boolean;
};

const manifest = manifestJson as {
  schema: number;
  generated: number;
  pending: number;
  posters: RuntimePoster[];
};

const catalog = catalogJson as {
  schema: number;
  posters: Array<RuntimePoster & {
    n: number;
    sourceKind: string;
    variant: string;
  }>;
};

const shared = catalog.posters;
const sharedIds = new Set(shared.map((poster) => poster.id));

function pngDimensions(file: string): [number, number] {
  const bytes = fs.readFileSync(file);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

describe("shared industry poster batch", () => {
  it("registers all 213 uploaded originals with stable unique ids and paths", () => {
    expect(shared).toHaveLength(213);
    expect(shared.map((poster) => poster.n)).toEqual(Array.from({ length: 213 }, (_, i) => i + 1));
    expect(new Set(shared.map((poster) => poster.id)).size).toBe(213);
    expect(new Set(shared.map((poster) => poster.img)).size).toBe(213);
    expect(shared[0].id).toBe("shared_industry_0001");
    expect(shared[212].id).toBe("shared_industry_0213");
  });

  it("keeps every uploaded crop present, valid, and normalized to 354x537", () => {
    for (const poster of shared) {
      const file = path.join(process.cwd(), "public", poster.img);
      expect(fs.existsSync(file), poster.img).toBe(true);
      expect(pngDimensions(file), poster.img).toEqual([354, 537]);
    }
  });

  it("wires the catalog into the runtime manifest without duplicate ids or image paths", () => {
    expect(manifest.schema).toBe(3);
    expect(manifest.posters).toHaveLength(381);
    expect(manifest.generated).toBe(379);
    expect(manifest.pending).toBe(2);
    expect(new Set(manifest.posters.map((poster) => poster.id)).size).toBe(manifest.posters.length);
    const images = manifest.posters.filter((poster) => poster.img).map((poster) => poster.img);
    expect(new Set(images).size).toBe(images.length);

    for (const poster of shared) {
      const runtime = manifest.posters.find((candidate) => candidate.id === poster.id);
      expect(runtime).toMatchObject({
        img: poster.img,
        studio: poster.studio,
        persona: poster.persona,
        animeTypes: poster.animeTypes,
        genres: poster.genres,
        family: null,
      });
    }
  });

  it("preserves the approved core and strange-combo mapping anchors", () => {
    expect(shared[0]).toMatchObject({ genres: ["fantasy"], sourceKind: "standard-core", variant: "male" });
    expect(shared[1]).toMatchObject({ genres: ["fantasy"], sourceKind: "standard-core", variant: "female" });
    expect(shared[95]).toMatchObject({ genres: ["comedy"], sourceKind: "standard-alt", variant: "female-alt" });
    expect(shared[96]).toMatchObject({ genres: ["mecha", "pirate"], sourceKind: "strange-combo", variant: "str-01" });
    expect(shared[97]).toMatchObject({ genres: ["kaiju", "slice"], sourceKind: "strange-combo", variant: "str-02" });
    expect(shared[98]).toMatchObject({ genres: ["arabia", "cyber"], sourceKind: "strange-combo", variant: "str-03" });
    expect(shared[119]).toMatchObject({ genres: ["cosmic_horror", "cooking"], sourceKind: "strange-combo", variant: "str-24" });
  });

  it("contains two complete non-human passes across all 30 normal genres", () => {
    const passA = shared.filter((poster) => poster.sourceKind === "standard-nonhuman" && poster.variant === "a");
    const passB = shared.filter((poster) => poster.sourceKind === "standard-nonhuman" && poster.variant === "b");
    expect(passA).toHaveLength(30);
    expect(passB).toHaveLength(30);
    expect(new Set(passA.flatMap((poster) => poster.genres)).size).toBe(30);
    expect(new Set(passB.flatMap((poster) => poster.genres)).size).toBe(30);
  });

  it("exposes the new art to both generic player choices and rival studio selection", () => {
    const oldIds = RIVAL_POSTERS.filter((poster) => !sharedIds.has(poster.id)).map((poster) => poster.id);
    const options = genericPosterOptions("shonen", ["fantasy"], 6, oldIds);
    expect(options).toHaveLength(6);
    expect(options.every((poster) => sharedIds.has(poster.id))).toBe(true);
    expect(options.some((poster) => poster.genres.includes("fantasy"))).toBe(true);

    const toePool = rivalPostersForStudio("Toe-i Animation");
    const blocked = toePool.filter((poster) => !sharedIds.has(poster.id)).map((poster) => poster.id);
    const pick = pickRivalPoster({
      studio: "Toe-i Animation",
      animeType: "shojo",
      genres: ["fantasy"],
      blocked,
      rand: () => 0,
    });
    expect(pick).not.toBeNull();
    expect(sharedIds.has(pick!.id)).toBe(true);
    expect(pick!.animeTypes).toContain("shojo");
  });

  it("does not create accidental franchise-family continuity", () => {
    expect(shared.every((poster) => poster.family === null)).toBe(true);
  });
});
