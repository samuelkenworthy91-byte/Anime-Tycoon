import { describe, expect, it } from "vitest";
import {
  GENRES,
  GENRE,
  type Draft,
  type GenreId,
} from "../data";
import {
  POSTER_FONTS,
  POSTER_DECOS,
  POSTER_GENRE_IDS,
  posterDesign,
  posterFontFor,
  genreTitleCss,
  posterTilt,
  titleHash,
  titleLines,
} from "../poster";
import { hofDesign } from "../../components/Poster";

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Starfall Blade",
  medium: "tv",
  budget: "standard",
  slot: "midnight", animeType:"shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "kai",
  protagName: "Kai",
  secondary: "s_ren",
  pet: "p_mochi",
  villain: "v_kurogane",
  arcs: ["hook", "montage", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

describe("genre font table", () => {
  it("covers every genre defined in data", () => {
    for (const g of GENRES) {
      expect(POSTER_FONTS[g.id], `font for ${g.id}`).toBeTruthy();
      expect(POSTER_DECOS[g.id], `decos for ${g.id}`).toBeTruthy();
      expect(POSTER_DECOS[g.id].length, `≥1 deco for ${g.id}`).toBeGreaterThan(0);
    }
    expect(POSTER_GENRE_IDS).toEqual(GENRES.map((g) => g.id));
  });

  it("uses a real variety of display families across genres", () => {
    const families = new Set(Object.values(POSTER_FONTS).map((f) => f.family));
    expect(families.size).toBeGreaterThanOrEqual(8);
  });

  it("genre voices are unmistakable: kinetic sports caps vs flowing romance serif", () => {
    const sh = posterFontFor("sports");
    const ro = posterFontFor("romance");
    expect(sh.upperCase).toBe(true);
    expect(ro.italic).toBe(true);
    expect(sh.family).not.toBe(ro.family);
    expect(sh.skew).toBeLessThan(0);
  });

  it("genreTitleCss reflects the same table", () => {
    expect(genreTitleCss("mecha").textTransform).toBe("uppercase");
    expect(genreTitleCss("romance").fontStyle).toBe("italic");
  });
});

describe("titleLines", () => {
  it("preserves every word exactly once", () => {
    for (const t of ["Starfall Blade", "The Long And Winding Mecha Romance", "Witch's Big Last Spell"]) {
      const flat = titleLines(t).join(" ").replace(/\s+/g, " ");
      expect(flat).toBe(t.replace(/\s+/g, " "));
    }
  });

  it("never exceeds three lines, and one-word titles stay on one line", () => {
    expect(titleLines("A Very Very Long Anime Title With Many Words").length).toBeLessThanOrEqual(3);
    expect(titleLines("Unstoppable")).toEqual(["Unstoppable"]);
    expect(titleLines("One Two Three Four Five Six Seven")).toHaveLength(3);
  });

  it("balances a two-word title onto one line", () => {
    expect(titleLines("Starfall Blade")).toEqual(["Starfall Blade"]);
  });
});

describe("posterDesign extras", () => {
  it("originals get a studio-presents kicker and no ribbon", () => {
    const d = posterDesign(draft(), { studio: "Magiclamp" });
    expect(d.kicker).toBe("MAGICLAMP PRESENTS");
    expect(d.ribbon).toBeNull();
    expect(d.lines.join(" ")).toBe("Starfall Blade");
    expect(d.font.family).toBe(posterFontFor("sports").family);
  });

  it("season 2 announces itself in kicker and ribbon", () => {
    const d = posterDesign(draft({ season: 2, continuation: "season" }), { studio: "Magiclamp" });
    expect(d.kicker).toContain("SEASON 2");
    expect(d.ribbon).toBe("SEASON 2");
  });

  it("movies and OVAs get their own ribbons", () => {
    expect(posterDesign(draft({ continuation: "movie" })).ribbon).toBe("THE MOVIE");
    expect(posterDesign(draft({ continuation: "ova" })).ribbon).toBe("ORIGINAL VIDEO ANIMATION");
  });

  it("billing block cites studio, lead and genre", () => {
    const d = posterDesign(draft(), { studio: "Magiclamp" });
    expect(d.billing[0]).toContain("MAGICLAMP PRESENTS");
    expect(d.billing[1]).toContain("KAI");
    expect(d.billing[2]).toContain(GENRE("sports").label.toUpperCase());
  });

  it("decorations come from the primary genre first, then blend others in", () => {
    const d = posterDesign(draft({ genres: ["sports", "cooking"] }));
    expect(d.decos.slice(0, 2)).toEqual(POSTER_DECOS.sports);
    expect(d.decos).toContain("steam");
    /* no duplicates even when genres overlap */
    const d2 = posterDesign(draft({ genres: ["sports", "sports"] }));
    expect(new Set(d2.decos).size).toBe(d2.decos.length);
  });

  it("hall-of-fame flag passes through", () => {
    expect(posterDesign(draft(), { hallOfFame: true }).hallOfFame).toBe(true);
  });
});

describe("deterministic tilt/hash", () => {
  it("same title, same tilt; bounded and granular", () => {
    expect(posterTilt("Starfall Blade")).toBe(posterTilt("Starfall Blade"));
    expect(Math.abs(posterTilt("Starfall Blade"))).toBeLessThanOrEqual(2.5);
    expect(new Set([1, 2, 3, 4, 5, 6].map((i) => posterTilt(`Show ${i}`))).size).toBeGreaterThan(3);
  });

  it("hash is stable and 32-bit", () => {
    expect(titleHash("x")).toBe(titleHash("x"));
    expect(titleHash("longer anime title")).toBeLessThan(2 ** 32);
  });
});

/* keep GenreId import meaningful in the type checker */
const _id: GenreId = "sports";
void _id;

describe("hall-of-fame posters must never crash the office", () => {
  /* regression: hofDesign() fed a fake draft without medium/slot and the
     wall tiles + list rows crashed the whole office screen after any 32+
     release; the entry shape below is what saves actually persist */
  it("designs posters from the sparse hall-of-fame entry shape", () => {
    const hof = { title: "Moonlit Mecha Rose", genres: ["supernatural", "mecha"] as GenreId[], protag: "n_aoi", score: 36 };
    const design = hofDesign(hof);
    expect(design.lines.join(" ")).toBe("Moonlit Mecha Rose");
    expect(design.primary.id).toBe("supernatural");
    expect(design.hallOfFame).toBe(true);
    expect(design.billing).toHaveLength(3);
  });

  it("posterDesign degrades gracefully on a cast-only draft", () => {
    const sparse = { title: "T", genres: ["mystery"], protagName: "T" } as Draft;
    const d = posterDesign(sparse);
    expect(d.primary.id).toBe("mystery");
    expect(d.billing[0]).toContain("TV PRODUCTION");
    expect(d.ribbon).toBeNull();
  });
});
