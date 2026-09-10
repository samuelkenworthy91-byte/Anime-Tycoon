import { GENRES, RESEARCH, SECRET_COMBOS, comboKey, comboMult, type GenreId } from "./data";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const EXPERIMENTAL_COMBO_RESEARCH_PREFIX = "experimental_combo_";
export const MAX_RESEARCHABLE_SECRET_COMBOS = 8;

export const secretComboResearchId = (key: string) =>
  `${EXPERIMENTAL_COMBO_RESEARCH_PREFIX}${key.replaceAll("|", "__")}`;

export const secretComboResearched = (research: readonly string[], key: string) =>
  research.includes(secretComboResearchId(key));

/**
 * The strongest experimental pairings can be found two ways: gamble on the
 * actual release, or spend heavily after Genre Studies to investigate an R&D
 * hypothesis first. Registration lives here so the generated genre manifest
 * remains the single source of truth for which combinations are experimental.
 */
export const RESEARCHABLE_SECRET_COMBOS = Object.entries(SECRET_COMBOS)
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .slice(0, MAX_RESEARCHABLE_SECRET_COMBOS)
  .map(([key, mult], index) => {
    const ids = key.split("|") as GenreId[];
    const label = ids.map((id) => GENRES.find((g) => g.id === id)?.label ?? id).join(" × ");
    return {
      key,
      mult,
      id: secretComboResearchId(key),
      label,
      rd: 62 + index * 4,
    };
  });

/* Register the studies into the existing timed R&D catalogue. The array is an
   exported runtime catalogue; this avoids duplicating generated combo data in
   data.ts and keeps future manifests self-updating. */
for (const study of RESEARCHABLE_SECRET_COMBOS) {
  if (RESEARCH.some((item) => item.id === study.id)) continue;
  RESEARCH.push({
    id: study.id,
    name: `Experimental Pair Study: ${study.label}`,
    rd: study.rd,
    requires: "genre_studies",
    desc: `R&D suspects this unlikely pairing may hide an unusual audience response. Complete the study to reveal whether the ${study.label} theory is real before risking a production.`,
  });
}

export interface GenreReleaseEffect {
  key: string;
  label: string;
  baseMultiplier: number;
  salesMultiplier: number;
  secret: boolean;
  kind: "single" | "disastrous" | "poor" | "awkward" | "neutral" | "strong" | "excellent" | "secret";
}

/**
 * Genre pairings have always affected craft quality. This adds an equally
 * legible commercial consequence: incoherent pairings lose word of mouth,
 * while experimental hidden pairings can become breakout anomalies.
 *
 * The secret effect applies on the discovery release itself. Creation UI can
 * still hide it because that screen checks combo knowledge separately.
 */
export function genreReleaseEffect(genres: GenreId[]): GenreReleaseEffect {
  if (genres.length !== 2) {
    const label = genres.map((id) => GENRES.find((g) => g.id === id)?.label ?? id).join(" × ") || "Single genre";
    return { key: comboKey(genres), label, baseMultiplier: 1, salesMultiplier: 1, secret: false, kind: "single" };
  }

  const key = comboKey(genres);
  const baseMultiplier = comboMult(genres, true);
  const secret = key in SECRET_COMBOS;
  const label = genres.map((id) => GENRES.find((g) => g.id === id)?.label ?? id).join(" × ");

  if (secret) {
    /* Existing experimental pairs sit around the mid-1.2s. Their score lift is
       already handled by quality; this is the unmistakable commercial jackpot. */
    const salesMultiplier = clamp(1.28 + Math.max(0, baseMultiplier - 1) * 0.95, 1.35, 1.62);
    return { key, label, baseMultiplier, salesMultiplier, secret: true, kind: "secret" };
  }

  if (baseMultiplier < 0.82)
    return { key, label, baseMultiplier, salesMultiplier: 0.66, secret: false, kind: "disastrous" };
  if (baseMultiplier < 0.90)
    return { key, label, baseMultiplier, salesMultiplier: 0.76, secret: false, kind: "poor" };
  if (baseMultiplier < 0.97)
    return { key, label, baseMultiplier, salesMultiplier: 0.88, secret: false, kind: "awkward" };
  if (baseMultiplier < 1.08)
    return { key, label, baseMultiplier, salesMultiplier: 1, secret: false, kind: "neutral" };
  if (baseMultiplier < 1.20)
    return { key, label, baseMultiplier, salesMultiplier: 1.08, secret: false, kind: "strong" };
  return { key, label, baseMultiplier, salesMultiplier: 1.14, secret: false, kind: "excellent" };
}

export interface ArcDiscoveryEffect {
  id: string;
  name: string;
  arcs: string[];
  q: number;
  f: number;
  ordered: boolean;
  kind: "clash";
  explanation: string;
}

/**
 * Explicit bad story structures. These are hidden knowledge: they only become
 * known after the player ships the pattern, just like positive ARC_COMBOS.
 * Ordered clashes deliberately make sequence matter rather than merely the
 * shopping list of beats.
 */
export const ARC_CLASHES: ArcDiscoveryEffect[] = [
  {
    id: "clash_finale_before_origin",
    name: "Climax Without Foundations",
    arcs: ["finale", "origin"],
    q: -9,
    f: -0.07,
    ordered: true,
    kind: "clash",
    explanation: "The climax arrives before the story has earned the character foundation it depends on.",
  },
  {
    id: "clash_twist_before_case",
    name: "Answer Before Question",
    arcs: ["twist", "case"],
    q: -8,
    f: -0.08,
    ordered: true,
    kind: "clash",
    explanation: "The reveal lands before the investigation gives viewers anything meaningful to solve.",
  },
  {
    id: "clash_sacrifice_to_beach",
    name: "Emotional Whiplash",
    arcs: ["narr_sacrifice", "beach"],
    q: -7,
    f: -0.06,
    ordered: true,
    kind: "clash",
    explanation: "A major sacrifice is followed too quickly by lightweight diversion, collapsing the intended emotional weight.",
  },
  {
    id: "clash_betrayal_to_foundfamily",
    name: "Trust Reset",
    arcs: ["narr_betrayal", "narr_foundfamily"],
    q: -6,
    f: -0.05,
    ordered: true,
    kind: "clash",
    explanation: "The story asks the audience to rebuild intimacy immediately after breaking trust, without a recovery beat.",
  },
  {
    id: "clash_falsewin_to_slowburn",
    name: "Momentum Collapse",
    arcs: ["narr_falsewin", "narr_slowburn"],
    q: -7,
    f: -0.07,
    ordered: true,
    kind: "clash",
    explanation: "A false climax creates urgency, then the structure abruptly returns to introductory pacing.",
  },
  {
    id: "clash_siege_to_quiet",
    name: "Siege With the Brakes On",
    arcs: ["narr_siege", "narr_quiet"],
    q: -5,
    f: -0.04,
    ordered: true,
    kind: "clash",
    explanation: "The pressure of a siege dissipates when the story stops for an extended low-stakes character detour.",
  },
];

function containsInOrder(haystack: string[], needles: string[]): boolean {
  let at = 0;
  for (const item of haystack) {
    if (item === needles[at]) at += 1;
    if (at >= needles.length) return true;
  }
  return false;
}

export function arcClashesFor(arcIds: string[]): ArcDiscoveryEffect[] {
  return ARC_CLASHES.filter((clash) => clash.ordered
    ? containsInOrder(arcIds, clash.arcs)
    : clash.arcs.every((id) => arcIds.includes(id)));
}

export const arcClashById = (id: string) => ARC_CLASHES.find((clash) => clash.id === id) ?? null;
