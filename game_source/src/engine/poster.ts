/*
 * Poster design — the pure half of the key-visual system.
 *
 * `posterDesign(draft, opts)` turns a show's metadata into everything the
 * <Poster/> renderer needs:
 *
 *   font        — genre-appropriate title typography: every genre is mapped
 *                 to a display family plus casing/tracking/italic/skew and a
 *                 genre-coloured glow. See POSTER_FONTS.
 *   titleLines  — the title balanced across up to 3 lines
 *   kicker      — the studio banner line ("MAGICLAMP PRESENTS",
 *                 "SEASON 2 — THE CONTINUING STORY"…)
 *   ribbon      — SEASON/MOVIE/OVA tab, when this is a continuation
 *   billing     — cinema-style condensed credit segments for the foot strip
 *   decos       — little decorations sprinkled over the artwork
 *   tilt        — deterministic paper rotation for wall posters
 *
 * Rendering lives in src/components/Poster.tsx; this module stays UI-free so
 * the design of every poster is unit-testable.
 */

import { GENRE, GENRES, MEDIUMS, SLOTS, type Draft, type GenreId, type Genre } from "./data";

/* ------------------------------------------------------------- fonts ---- */

export interface PosterFont {
  /** CSS font-family stack (display font first, graceful fallbacks) */
  family: string;
  weight: number;
  italic: boolean;
  upperCase: boolean;
  /** letter-spacing in em */
  tracking: number;
  /** text-shadow glow colour (defaults to the genre colour) */
  glow?: string;
  /** transform skew in degrees (jersey stencils lean) */
  skew: number;
  /** font-size multiplier for faces that render small/large at same px */
  scale: number;
}

const ANTON: Omit<PosterFont, "upperCase" | "tracking" | "skew"> = {
  family: '"Anton", "Arial Narrow", "Impact", sans-serif',
  weight: 400,
  italic: false,
  scale: 1.12,
};
const BLACKOPS: Pick<PosterFont, "family"> = { family: '"Black Ops One", "Arial Black", sans-serif' };
const CHAKRA: Pick<PosterFont, "family"> = { family: '"Chakra Petch", "Trebuchet MS", sans-serif' };
const COMFORTAA: Pick<PosterFont, "family"> = { family: '"Comfortaa", "Trebuchet MS", sans-serif' };
const CINZEL: Pick<PosterFont, "family"> = { family: '"Cinzel", "Times New Roman", serif' };
const PLAYFAIR: Pick<PosterFont, "family"> = { family: '"Playfair Display", Georgia, serif' };
const LILITA: Pick<PosterFont, "family"> = { family: '"Lilita One", "Comic Sans MS", cursive' };
const CREEPSTER: Pick<PosterFont, "family"> = { family: '"Creepster", Impact, fantasy' };

/** one font treatment per genre — this is the "different font per genre" rule */
export const POSTER_FONTS: Record<GenreId, PosterFont> = {
  shonen: { ...ANTON, upperCase: true, tracking: 0.02, skew: -2, glow: "#ff9a3d" },
  sports: { ...ANTON, upperCase: true, tracking: 0.03, italic: true, skew: -7 },
  racing: { ...ANTON, upperCase: true, tracking: 0.01, italic: true, skew: -11 },
  military: { ...BLACKOPS, weight: 400, italic: false, upperCase: true, tracking: 0.05, skew: 0, scale: 0.96 },
  mecha: { ...CHAKRA, weight: 700, italic: false, upperCase: true, tracking: 0.07, skew: 0, scale: 1, glow: "#7af0ff" },
  cyber: { ...CHAKRA, weight: 600, italic: false, upperCase: true, tracking: 0.04, skew: 0, scale: 1, glow: "#22d3ee" },
  space: { ...CHAKRA, weight: 700, italic: false, upperCase: true, tracking: 0.12, skew: 0, scale: 0.94, glow: "#4cc9f0" },
  romance: { ...PLAYFAIR, weight: 700, italic: true, upperCase: false, tracking: 0.01, skew: 0, scale: 1.04 },
  noir: { ...PLAYFAIR, weight: 800, italic: false, upperCase: true, tracking: 0.09, skew: 0, scale: 0.98 },
  mystery: { ...PLAYFAIR, weight: 600, italic: false, upperCase: false, tracking: 0.06, skew: 0, scale: 1 },
  shojo: { ...COMFORTAA, weight: 700, italic: false, upperCase: false, tracking: 0.02, skew: 0, scale: 1, glow: "#ff9ecf" },
  idol: { ...COMFORTAA, weight: 700, italic: false, upperCase: true, tracking: 0.04, skew: 0, scale: 0.96, glow: "#f472b6" },
  magical: { ...COMFORTAA, weight: 700, italic: false, upperCase: false, tracking: 0.03, skew: -1, scale: 1, glow: "#f72585" },
  slice: { ...LILITA, weight: 400, italic: false, upperCase: false, tracking: 0.01, skew: 0, scale: 1.06 },
  comedy: { ...LILITA, weight: 400, italic: false, upperCase: true, tracking: 0.02, skew: -2, scale: 1.04 },
  cooking: { ...LILITA, weight: 400, italic: false, upperCase: false, tracking: 0.01, skew: 0, scale: 1.04 },
  fantasy: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.06, skew: 0, scale: 1, glow: "#d6b2ff" },
  isekai: { ...CINZEL, weight: 700, italic: false, upperCase: true, tracking: 0.05, skew: 0, scale: 0.98, glow: "#a78bfa" },
  supernatural: { ...CINZEL, weight: 600, italic: false, upperCase: true, tracking: 0.07, skew: 0, scale: 0.98, glow: "#9d4edd" },
  horror: { ...CREEPSTER, weight: 400, italic: false, upperCase: true, tracking: 0.04, skew: 1, scale: 1.1, glow: "#86e03c" },
};

export const posterFontFor = (genre: GenreId): PosterFont => POSTER_FONTS[genre];

/** plain CSS for rendering one-off genre-typed titles ( Hof list rows etc. ) */
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

/* ----------------------------------------------------- decorations ---- */

export type PosterDeco =
  | "burst" /* shonen action star-burst behind the title */
  | "speedlines" /* swept action strokes */
  | "petals" /* falling flower petals */
  | "sparkles" /* four-point sparkles */
  | "hearts" /* little heart confetti */
  | "checker" /* chequered-flag strip */
  | "stars" /* rating/affair stars */
  | "steam" /* rising steam wisps */
  | "reticle" /* targeting corners */
  | "hex" /* tech hex tiles */
  | "orbit" /* planet ring */
  | "runes" /* floating glyph circle */
  | "drips" /* horror drips off the top edge */
  | "fog" /* low fog band */
  | "glitter" /* idol strobe dots */
  | "laurel" /* hall-of-fame side laurels */
  | "neonBars"; /* cyberpunk neon slats */

export const POSTER_DECOS: Record<GenreId, PosterDeco[]> = {
  shonen: ["burst", "speedlines"],
  shojo: ["petals", "sparkles"],
  slice: ["steam"],
  fantasy: ["runes"],
  romance: ["hearts", "petals"],
  sports: ["stars", "speedlines"],
  mecha: ["hex", "neonBars"],
  isekai: ["runes", "sparkles"],
  horror: ["drips", "fog"],
  idol: ["glitter", "stars"],
  mystery: ["fog"],
  cyber: ["neonBars", "hex"],
  comedy: ["burst"],
  cooking: ["steam", "stars"],
  racing: ["checker", "speedlines"],
  military: ["reticle", "stars"],
  supernatural: ["runes", "fog"],
  space: ["orbit", "stars"],
  noir: ["fog"],
  magical: ["sparkles", "glitter"],
};

/* ------------------------------------------------------------ layout ---- */

/** word-balance a title over as many lines as look good (cap `maxLines`) */
export function titleLines(title: string, maxLines = 3): string[] {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || maxLines <= 1) return [words.join(" ")];
  const cap = Math.min(words.length, maxLines);
  /* a line is allowed roughly twice the "fair share" of characters; short
     titles keep one line, long ones break as needed */
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

/* small deterministic hash → stable per-show tilt + deco phase */
export function titleHash(title: string): number {
  let h = 2166136261;
  for (let i = 0; i < title.length; i++) {
    h ^= title.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** poster tilt in degrees, deterministic per title (-2.5°..+2.5°) */
export const posterTilt = (title: string): number => ((titleHash(title) % 21) - 10) / 4;

const CONT_RIBBON: Record<NonNullable<Draft["continuation"]>, string> = {
  season: "SEASON {n}",
  movie: "THE MOVIE",
  ova: "ORIGINAL VIDEO ANIMATION",
  side: "SIDE STORY",
  prequel: "THE PREQUEL",
  spinoff: "SPIN-OFF",
  reboot: "THE REBOOT",
  crossover: "CROSSOVER EVENT",
};

/* ------------------------------------------------------------- design ---- */

export interface PosterDesign {
  /** primary genre driving the look (first picked wins) */
  primary: Genre;
  font: PosterFont;
  lines: string[];
  kicker: string;
  /** continuation tab text; null for original seasons */
  ribbon: string | null;
  /** condensed billing-block segments for the bottom strip */
  billing: string[];
  /** decorations to scatter (union of the show's genres, primary first) */
  decos: PosterDeco[];
  tilt: number;
  /** true when the poster earns the gold laurel + score medal */
  hallOfFame: boolean;
}

export interface PosterOptions {
  studio?: string;
  /** critic total (0-40) once released; drives the medal + laurel */
  score?: number | null;
  hallOfFame?: boolean;
}

export function posterDesign(draft: Draft, opts: PosterOptions = {}): PosterDesign {
  const primary = GENRE(draft.genres[0]) ?? GENRES[0];
  const studio = (opts.studio ?? "YOUR STUDIO").toUpperCase();

  /* kicker: the line just above the title */
  let kicker: string;
  if (draft.continuation === "season") kicker = `SEASON ${draft.season} — THE CONTINUING STORY`;
  else if (draft.continuation) kicker = CONT_RIBBON[draft.continuation].replace("{n}", String(draft.season)) + " IN THE SERIES";
  else kicker = `${studio} PRESENTS`;

  /* ribbon tab (top-left diagonal) for continuations */
  const ribbon = draft.continuation
    ? CONT_RIBBON[draft.continuation].replace("{n}", String(draft.season))
    : null;

  /* billing block (cinema credit strip) — a draft always carries medium +
     slot, but hall-of-fame entries and older saves reach here through
     hofDesign()'s synthetic draft, so degrade gracefully rather than crash
     the whole office screen */
  const medium = (MEDIUMS[draft.medium]?.label ?? "TV").toUpperCase();
  const slot = (SLOTS[draft.slot]?.label ?? "LATE NIGHT").toUpperCase();
  const genreCol = draft.genres.map((g) => GENRE(g).label.toUpperCase()).join(" × ");
  const billing = [
    `${studio} PRESENTS A ${medium} PRODUCTION`,
    `STARRING ${draft.protagName.toUpperCase()} WITH THE ${primary.label.toUpperCase()} ENSEMBLE`,
    `${genreCol} · ${slot} · ARCH STUDIO SYSTEM`,
  ];

  /* decorations: primary genre's set first, then any extras from other genres */
  const decos: PosterDeco[] = [];
  for (const g of draft.genres) {
    for (const d of POSTER_DECOS[g]) if (!decos.includes(d)) decos.push(d);
  }

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

/* every genre must have both a font and at least one decoration — the test
   enforces this table's completeness against GENRES */
export const POSTER_GENRE_IDS = GENRES.map((g) => g.id);

/** hall-of-fame wall entries carry only what the mini poster needs */
export interface HofEntryLite {
  title: string;
  genres: GenreId[];
  protag: string;
  score: number;
}
