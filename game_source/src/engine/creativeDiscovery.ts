import { ARCS, ARC_COMBOS, GENRES, RESEARCH, SECRET_COMBOS, comboKey, comboMult, type GenreId } from "./data";

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
      order: index + 1,
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
    name: `Experimental Combination Study ${study.order}`,
    rd: study.rd,
    requires: "genre_studies",
    desc: "Investigate an unusual relationship between two genres. Completing this study will identify the pairing and its effect.",
  });
}

export function experimentalStudyPresentation(item: { id: string; name: string; desc: string }, completed: boolean) {
  const study = RESEARCHABLE_SECRET_COMBOS.find((candidate) => candidate.id === item.id);
  if (!study || !completed) return { name: item.name, desc: item.desc };
  const effect = study.mult >= 1.2 ? "an unusually strong relationship" : study.mult < 0.95 ? "a risky relationship" : "a measurable relationship";
  return {
    name: `Breakthrough: ${study.label}`,
    desc: `Research confirms ${effect} between ${study.label}. The pairing is now known before production.`,
  };
}

const LITERAL_ARC_DESCRIPTIONS: Record<string, string> = {
  hook: "Open with an immediate problem, image or confrontation that gives the audience a clear reason to keep watching.",
  montage: "A character trains repeatedly over time, showing visible improvement before the challenge that tests that training.",
  tournament: "Characters enter an organised bracket or series of competitive matches, with advancement decided by performance.",
  origin: "Reveal the antagonist's earlier life and the events that shaped their current motives before the audience is asked to reassess them.",
  redemption: "An antagonist recognises the harm they caused and changes sides or takes meaningful action to repair it.",
  finale: "Bring the major conflicts and character goals to their decisive confrontation and resolve the season's central promises.",
  confession: "A character directly admits a hidden feeling, truth or relationship choice that has been building through earlier scenes.",
  case: "Introduce a mystery with evidence, suspects and questions that characters actively investigate before a reveal.",
  twist: "Reveal information that changes the audience's understanding of earlier events while still fitting the clues already shown.",
  narr_betrayal: "A trusted ally turns against the group, abandons them at a critical moment or reveals divided loyalties.",
  narr_revenge: "A character pursues the person or group responsible for an earlier loss, betrayal or defeat.",
  narr_rescue: "The cast attempts to recover a captured, missing or defecting character from an enemy or dangerous location.",
  narr_mentor: "An experienced figure trains or guides another character, establishing a relationship whose approval or loss can matter later.",
  narr_sacrifice: "A character knowingly gives up their safety, future or life so that somebody else can survive or succeed.",
  narr_foundfamily: "Characters who were not originally family choose mutual loyalty and belonging through shared experience.",
  narr_secretid: "A character maintains a concealed identity or role whose discovery would materially change their relationships.",
  narr_villainreveal: "Expose who the true antagonist is after earlier scenes have established the threat, suspects or false assumptions.",
  narr_falsewin: "Let the characters believe they have won before revealing that the apparent victory hid a larger failure or trap.",
};
for (const arc of ARCS) {
  const literal = LITERAL_ARC_DESCRIPTIONS[arc.id];
  if (literal) arc.desc = literal;
}

/* Keep the structure model semantically clean: positive structures live in
   ARC_COMBOS, negative structures in ARC_CLASHES. */
for (const oldNegative of ["backwards_training", "spoiled_mystery"]) {
  const at = ARC_COMBOS.findIndex((combo) => combo.id === oldNegative);
  if (at >= 0) ARC_COMBOS.splice(at, 1);
}
const EXTRA_ARC_COMBOS = [
  { id: "failed_retrieval", name: "Failed Retrieval", arcs: ["narr_rescue", "narr_betrayal"], q: 4, f: 0.03, ordered: true },
  { id: "personal_vendetta", name: "Personal Vendetta", arcs: ["narr_betrayal", "narr_revenge"], q: 4, f: 0.03, ordered: true },
  { id: "retrieval_crisis", name: "Retrieval Crisis", arcs: ["narr_rivalintro", "narr_rescue", "narr_betrayal"], q: 5, f: 0.04, ordered: true },
  { id: "lie_becomes_personal", name: "The Lie Becomes Personal", arcs: ["narr_falsewin", "narr_betrayal", "narr_revenge"], q: 6, f: 0.04, ordered: true },
  { id: "avenge_the_mentor", name: "Avenge the Mentor", arcs: ["narr_mentor", "narr_sacrifice", "narr_revenge"], q: 6, f: 0.03, ordered: true },
  { id: "bring_them_home", name: "Bring Them Home", arcs: ["narr_foundfamily", "narr_betrayal", "narr_rescue"], q: 5, f: 0.05, ordered: true },
  { id: "mask_was_threat", name: "The Mask Was the Threat", arcs: ["narr_secretid", "narr_villainreveal"], q: 4, f: 0.03, ordered: true },
];
for (const combo of EXTRA_ARC_COMBOS) {
  if (!ARC_COMBOS.some((existing) => existing.id === combo.id)) ARC_COMBOS.push(combo);
}
const redemptionRoad = ARC_COMBOS.find((combo) => combo.id === "road");
if (redemptionRoad) {
  redemptionRoad.ordered = true;
  redemptionRoad.q = Math.max(redemptionRoad.q, 4);
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
  adjacent?: boolean;
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
    id: "clash_backwards_training",
    name: "Training After the Test",
    arcs: ["tournament", "montage"],
    q: -7,
    f: -0.05,
    ordered: true,
    kind: "clash",
    explanation: "Training arrives after the decisive competition, so the preparation cannot earn the result the audience already watched.",
  },
  {
    id: "clash_spoiled_mystery",
    name: "Answer Before the Question",
    arcs: ["narr_villainreveal", "case"],
    q: -8,
    f: -0.07,
    ordered: true,
    kind: "clash",
    explanation: "The antagonist is exposed before the investigation gives the audience a mystery to solve.",
  },
  {
    id: "clash_redemption_before_origin",
    name: "Motive Too Late",
    arcs: ["redemption", "origin"],
    q: -7,
    f: -0.05,
    ordered: true,
    kind: "clash",
    explanation: "The story asks the audience to accept redemption before showing the history meant to make that change understandable.",
  },
  {
    id: "clash_sacrifice_undone",
    name: "Sacrifice Undone",
    arcs: ["narr_sacrifice", "narr_rescue"],
    q: -8,
    f: -0.08,
    ordered: true,
    adjacent: true,
    kind: "clash",
    explanation: "The sacrifice is immediately reversed by a rescue beat, stripping the loss of the consequence the scene promised.",
  },
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

function containsAdjacent(haystack: string[], needles: string[]): boolean {
  if (!needles.length || needles.length > haystack.length) return false;
  return haystack.some((_, start) => needles.every((needle, offset) => haystack[start + offset] === needle));
}

export function arcClashesFor(arcIds: string[]): ArcDiscoveryEffect[] {
  return ARC_CLASHES.filter((clash) => clash.adjacent
    ? containsAdjacent(arcIds, clash.arcs)
    : clash.ordered
      ? containsInOrder(arcIds, clash.arcs)
      : clash.arcs.every((id) => arcIds.includes(id)));
}

export const arcClashById = (id: string) => ARC_CLASHES.find((clash) => clash.id === id) ?? null;
