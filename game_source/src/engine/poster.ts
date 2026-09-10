/*
 * Poster design — the pure half of the key-visual system.
 *
 * `posterDesign(draft, opts)` turns a show's metadata into everything the
 * <Poster/> renderer needs: genre typography, title layout, billing, decorative
 * motifs and deterministic wall-poster presentation.
 */

import { GENRE, GENRES, MEDIUMS, SLOTS, type AnimeType, type Draft, type GenreId, type Genre } from "./data";

export interface PosterFont {
  family: string;
  weight: number;
  italic: boolean;
  upperCase: boolean;
  tracking: number;
  glow?: string;
  skew: number;
  scale: number;
}

const ANTON: Omit<PosterFont, "upperCase" | "tracking" | "skew"> = {
  family: '"Anton", "Arial Narrow", "Impact", sans-serif', weight: 400, italic: false, scale: 1.12,
};
const BLACKOPS: Pick<PosterFont, "family"> = { family: '"Black Ops One", "Arial Black", sans-serif' };
const CHAKRA: Pick<PosterFont, "family"> = { family: '"Chakra Petch", "Trebuchet MS", sans-serif' };
const COMFORTAA: Pick<PosterFont, "family"> = { family: '"Comfortaa", "Trebuchet MS", sans-serif' };
const CINZEL: Pick<PosterFont, "family"> = { family: '"Cinzel", "Times New Roman", serif' };
const PLAYFAIR: Pick<PosterFont, "family"> = { family: '"Playfair Display", Georgia, serif' };
const LILITA: Pick<PosterFont, "family"> = { family: '"Lilita One", "Comic Sans MS", cursive' };
const CREEPSTER: Pick<PosterFont, "family"> = { family: '"Creepster", Impact, fantasy' };

export const POSTER_FONTS: Record<GenreId, PosterFont> = {
  sports: { ...ANTON, upperCase: true, tracking: 0.03, italic: true, skew: -7 },
  martial: { ...ANTON, upperCase: true, tracking: 0.01, italic: true, skew: -5 },
  military: { ...BLACKOPS, weight: 400, italic: false, upperCase: true, tracking: 0.05, skew: 0, scale: 0.96 },
  mecha: { ...CHAKRA, weight: 700, italic: false, upperCase: true, tracking: 0.07, skew: 0, scale: 1, glow: "#7af0ff" },
  cyber: { ...CHAKRA, weight: 600, italic: false, upperCase: true, tracking: 0.04, skew: 0, scale: 1, glow: "#22d3ee" },
  space: { ...CHAKRA, weight: 700, italic: false, upperCase: true, tracking: 0.12, skew: 0, scale: 0.94, glow: "#4cc9f0" },
  romance: { ...PLAYFAIR, weight: 700, italic: true, upperCase: false, tracking: 0.01, skew: 0, scale: 1.04 },
  mystery: { ...PLAYFAIR, weight: 600, italic: false, upperCase: false, tracking: 0.06, skew: 0, scale: 1 },
  idol: { ...COMFORTAA, weight: 700, italic: false, upperCase: true, tracking: 0.04, skew: 0, scale: 0.96, glow: "#f472b6" },
  magical: { ...COMFORTAA, weight: 700, italic: false, upperCase: false, tracking: 0.03, skew: -1, scale: 1, glow: "#f72585" },
  slice: { ...LILITA, weight: 400, italic: false, upperCase: false, tracking: 0.01, skew: 0, scale: 1.06 },
  comedy: { ...LILITA, weight: 400, italic: false, upperCase: true, tracking: 0.02, skew: -2, scale: 1.04 },
  cooking: { ...LILITA, weight: 400, italic: false, upperCase: false, tracking: 0.01, skew: 0, scale: 1.04 },
  fantasy: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.06, skew: 0, scale: 1, glow: "#d6b2ff" },
  isekai: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.05, skew: 0, scale: 0.98, glow: "#a78bfa" },
  supernatural: { ...CINZEL, weight: 600, italic: false, upperCase: true, tracking: 0.07, skew: 0, scale: 0.98, glow: "#9d4edd" },
  horror: { ...CREEPSTER, weight: 400, italic: false, upperCase: true, tracking: 0.04, skew: 1, scale: 1.1, glow: "#86e03c" },
  survival: { ...BLACKOPS, weight: 400, italic: false, upperCase: true, tracking: 0.025, skew: 0, scale: 0.98 },
  pirate: { ...CINZEL, weight: 700, italic: true, upperCase: true, tracking: 0.035, skew: -2, scale: 1.02 },
  mythology: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.08, skew: 0, scale: 0.98 },
  nordic: { ...PLAYFAIR, weight: 800, italic: false, upperCase: true, tracking: 0.055, skew: 0, scale: 0.98 },
  samurai: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.05, skew: 0, scale: 1, glow: "#f4a261" },
  shinobi: { ...PLAYFAIR, weight: 700, italic: false, upperCase: true, tracking: 0.06, skew: 1, scale: 0.98 },
  vampire: { ...PLAYFAIR, weight: 800, italic: true, upperCase: true, tracking: 0.045, skew: 0, scale: 1.02, glow: "#b91c1c" },
  grimdark: { ...BLACKOPS, weight: 400, italic: false, upperCase: true, tracking: 0.035, skew: -1, scale: 0.98, glow: "#78716c" },
  monster_taming: { ...COMFORTAA, weight: 700, italic: false, upperCase: true, tracking: 0.035, skew: -2, scale: 1.02, glow: "#34d399" },
  crime: { ...BLACKOPS, weight: 400, italic: false, upperCase: true, tracking: 0.055, skew: -3, scale: 0.98, glow: "#94a3b8" },
  kaiju: { ...ANTON, weight: 400, italic: false, upperCase: true, tracking: 0.055, skew: -4, scale: 1.08, glow: "#f97316" },
  cosmic_horror: { ...CREEPSTER, weight: 400, italic: false, upperCase: true, tracking: 0.075, skew: 1, scale: 1.04, glow: "#6366f1" },
  arabia: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.06, skew: -1, scale: 1.02, glow: "#d97706" },
};

export const posterFontFor = (genre: GenreId): PosterFont => POSTER_FONTS[genre];

export const genreTitleCss = (genre: GenreId): Record<string, string | number | undefined> => {
  const f = POSTER_FONTS[genre];
  return {
    fontFamily: f.family,
    fontWeight: f.weight,
    fontStyle: f.italic ? "italic" : undefined,
    letterSpacing: `${f.tracking}em`,
    textTransform: f.upperCase ? "uppercase" : undefined,
  };
};

export type PosterDeco =
  | "burst" | "speedlines" | "petals" | "sparkles" | "hearts" | "checker" | "stars"
  | "steam" | "reticle" | "hex" | "orbit" | "runes" | "drips" | "fog" | "glitter"
  | "laurel" | "neonBars";

export const POSTER_DECOS: Record<GenreId, PosterDeco[]> = {
  slice: ["steam"], fantasy: ["runes"], romance: ["hearts", "petals"], sports: ["stars", "speedlines"],
  mecha: ["hex", "neonBars"], isekai: ["runes", "sparkles"], horror: ["drips", "fog"], idol: ["glitter", "stars"],
  mystery: ["fog"], cyber: ["neonBars", "hex"], comedy: ["burst"], cooking: ["steam", "stars"],
  martial: ["burst", "speedlines"], military: ["reticle", "stars"], supernatural: ["runes", "fog"],
  space: ["orbit", "stars"], magical: ["sparkles", "glitter"], survival: ["fog", "reticle"],
  pirate: ["speedlines", "stars"], mythology: ["runes", "stars"], nordic: ["fog", "stars"],
  samurai: ["speedlines", "burst"], shinobi: ["fog", "speedlines"],
  vampire: ["drips", "fog", "hearts"], grimdark: ["fog", "runes", "reticle"],
  monster_taming: ["sparkles", "stars", "speedlines"],
  crime: ["reticle", "fog", "neonBars"],
  kaiju: ["burst", "speedlines", "reticle"],
  cosmic_horror: ["runes", "fog", "orbit"],
  arabia: ["runes", "stars", "petals"],
};

export function titleLines(title: string, maxLines = 3): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || maxLines <= 1) return [words.join(" ")];
  const cap = Math.min(words.length, maxLines);
  const MAX_LINE = 16;
  const fair = title.length / Math.min(cap, Math.ceil(title.length / MAX_LINE) || 1);
  const target = Math.max(Math.ceil(fair), 10);
  const out: string[] = [""];
  for (const w of words) {
    const cur = out[out.length - 1];
    const joined = cur ? `${cur} ${w}` : w;
    if (joined.length > target && cur && out.length < cap) out.push(w);
    else out[out.length - 1] = joined;
  }
  return out;
}

export function titleHash(title: string): number {
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const posterTilt = (title: string): number => ((titleHash(title) % 21) - 10) / 4;

const CONT_RIBBON: Record<NonNullable<Draft["continuation"]>, string> = {
  season: "SEASON {n}", movie: "THE MOVIE", ova: "ORIGINAL VIDEO ANIMATION", side: "SIDE STORY",
  prequel: "THE PREQUEL", spinoff: "SPIN-OFF", reboot: "THE REBOOT", crossover: "CROSSOVER EVENT",
};

export interface PosterDesign {
  primary: Genre;
  font: PosterFont;
  lines: string[];
  kicker: string;
  ribbon: string | null;
  billing: string[];
  decos: PosterDeco[];
  tilt: number;
  hallOfFame: boolean;
}

export interface PosterOptions {
  studio?: string;
  score?: number | null;
  hallOfFame?: boolean;
}

export function posterDesign(draft: Draft, opts: PosterOptions = {}): PosterDesign {
  const primary = GENRE(draft.genres[0]) ?? GENRES[0];
  const studio = (opts.studio ?? "YOUR STUDIO").toUpperCase();
  let kicker: string;
  if (draft.continuation === "season") kicker = `SEASON ${draft.season} — THE CONTINUING STORY`;
  else if (draft.continuation) kicker = CONT_RIBBON[draft.continuation].replace("{n}", String(draft.season)) + " IN THE SERIES";
  else kicker = `${studio} PRESENTS`;

  const ribbon = draft.continuation ? CONT_RIBBON[draft.continuation].replace("{n}", String(draft.season)) : null;
  const medium = (MEDIUMS[draft.medium]?.label ?? "TV").toUpperCase();
  const slot = (SLOTS[draft.slot]?.label ?? "LATE NIGHT").toUpperCase();
  const genreCol = draft.genres.map((g) => GENRE(g).label.toUpperCase()).join(" × ");
  const billing = [
    `${studio} PRESENTS A ${medium} PRODUCTION`,
    `STARRING ${draft.protagName.toUpperCase()} WITH THE ${primary.label.toUpperCase()} ENSEMBLE`,
    `${genreCol} · ${slot} · ARCH STUDIO SYSTEM`,
  ];

  const decos: PosterDeco[] = [];
  for (const g of draft.genres) for (const d of POSTER_DECOS[g]) if (!decos.includes(d)) decos.push(d);

  return {
    primary,
    font: posterFontFor(primary.id),
    lines: titleLines(draft.title),
    kicker,
    ribbon,
    billing,
    decos,
    tilt: posterTilt(draft.title),
    hallOfFame: !!opts.hallOfFame,
  };
}

export const POSTER_GENRE_IDS = GENRES.map((g) => g.id);

export interface HofEntryLite {
  title: string;
  genres: GenreId[];
  animeType?: AnimeType;
  protag: string;
  score: number;
}
