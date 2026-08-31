import {
  ARCS,
  AUDIENCES,
  BUDGETS,
  CAST_WEIGHTS,
  MEDIUMS,
  PROTAGONISTS,
  REVIEWERS,
  SECRET_COMBOS,
  SLOTS,
  castById,
  castChemFor,
  comboKey,
  comboLevelBonus,
  comboMult,
  type CastRole,
  type Draft,
  type PointType,
} from "./data";

export interface Points {
  story: number;
  art: number;
  sound: number;
}

export interface Review {
  outlet: string;
  focus: string;
  score: number; // out of 10
  quote: string;
}

export interface ShowResult {
  reviews: Review[];
  total: number; // out of 40
  tier: TierKey;
  hallOfFame: boolean;
  points: Points;
  issues: number;
  revenue: number;
  fans: number;
  costs: number;
  rd: number;
  sales: number[]; // weekly units
  breakdown: { label: string; pts: string }[];
  comboLevel: number;
  newCombo: boolean;
  /** cast chemistry multipliers applied this show */
  chemMult: number;
  /** chemistry combos newly discovered by shipping this show */
  chemDiscovered: string[];
  /** a secret genre combo was discovered by shipping this show */
  secretDiscovered: boolean;
}

export type TierKey = "masterpiece" | "hit" | "solid" | "mixed" | "flop";

export const TIERS: Record<TierKey, { label: string; color: string }> = {
  masterpiece: { label: "HALL OF FAME", color: "#ffd166" },
  hit: { label: "SMASH HIT", color: "#5ef0c0" },
  solid: { label: "SOLID", color: "#3be1ff" },
  mixed: { label: "MIXED", color: "#a78bfa" },
  flop: { label: "FLOP", color: "#ff4d8d" },
};

/** out of 40, Game Dev Story style */
export const tierOf = (total: number): TierKey =>
  total >= 32 ? "masterpiece" : total >= 27 ? "hit" : total >= 21 ? "solid" : total >= 15 ? "mixed" : "flop";

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function computeResult(opts: {
  draft: Draft;
  points: Points;
  issues: number;
  hype: number;
  research: string[];
  showrunner: string;
  genreIdeal: [number, number, number];
  genreRatio: [number, number, number];
  comboLevel: number;
  newCombo: boolean;
  /** whether this genre pairing has been shipped before (secret combos need discovery) */
  comboDiscovered: boolean;
  /** cast chemistry ids already discovered this run */
  castCombos: string[];
  franchiseMult: number;
  costs: number;
  fanBase: number;
}): ShowResult {
  const {
    draft,
    points,
    issues,
    hype,
    research,
    showrunner,
    genreIdeal,
    genreRatio,
    comboLevel,
    newCombo,
    comboDiscovered,
    castCombos,
    franchiseMult,
    costs,
    fanBase,
  } = opts;

  const totalPts = points.story + points.art + points.sound;

  /* ---- how well the point mix matches what the genre wants (GDT tech/design) */
  const mix: [number, number, number] = totalPts
    ? [points.story / totalPts, points.art / totalPts, points.sound / totalPts]
    : [0.34, 0.33, 0.33];
  const drift = Math.abs(mix[0] - genreRatio[0]) + Math.abs(mix[1] - genreRatio[1]) + Math.abs(mix[2] - genreRatio[2]);
  const ratioMatch = clamp(1.18 - drift * 0.95, 0.55, 1.18);

  /* ---- slider focus vs the director's memo */
  let sliderPart = 0;
  const perPhase: number[] = [];
  for (let p = 0; p < 3; p++) {
    const diff = Math.abs(draft.sliders[p] - genreIdeal[p]);
    const pts = clamp(4 - (diff / 100) * 4 * 1.7, 0, 4);
    perPhase.push(pts);
    sliderPart += pts;
  }

  /* ---- casting: lead + supporting + pet + villain each contribute */
  const protag = castById(draft.protag);
  const sec = castById(draft.secondary);
  const pet = castById(draft.pet);
  const vil = castById(draft.villain);
  const castFit = (m: { aff: string[] }, w: number) => {
    const n = m.aff.filter((g) => draft.genres.includes(g as never)).length;
    return Math.min(6, n * 2.6) * w;
  };
  const casting =
    castFit(protag, CAST_WEIGHTS.protag) +
    castFit(sec, CAST_WEIGHTS.secondary) +
    castFit(vil, CAST_WEIGHTS.villain) +
    castFit(pet, CAST_WEIGHTS.pet);

  /* ---- arcs (greater impact: cast synergy + bigger finale payoff) */
  let arcQ = 0;
  let arcsF = 0;
  const castOf = (role: CastRole) => castById(draft[role]);
  draft.arcs.forEach((id, idx) => {
    const arc = ARCS.find((a) => a.id === id)!;
    arcQ += arc.q;
    arcsF += arc.f;
    if (arc.syn?.some((s) => draft.genres.includes(s))) {
      arcQ += arc.synQ ?? 0;
      arcsF += arc.synF ?? 0;
      if (showrunner === "vision" && (arc.id === "twist" || arc.id === "lore")) arcQ += 2;
    }
    /* arcs that shine with the right cast member */
    if (arc.cast && arc.castQ) {
      const m = castOf(arc.cast);
      if (m && m.aff.some((g) => draft.genres.includes(g as never))) {
        arcQ += arc.castQ;
        arcsF += 0.02;
      }
    }
    if (arc.id === "finale" && idx === draft.arcs.length - 1) {
      if (draft.arcs.length >= 6) arcQ += 6;
      else if (draft.arcs.length >= 4) arcQ += 4;
    }
  });

  const slot = SLOTS[draft.slot];
  const slotFit = slot.best.some((g) => draft.genres.includes(g)) ? 2 : 0;
  const scope = BUDGETS[draft.budget].scope;

  /* ---- raw quality on a 0..40-ish curve */
  const pointScore = Math.pow(totalPts, 0.82) * 1.32 * scope;
  let raw = 6 + pointScore * ratioMatch + sliderPart + casting + arcQ * 0.85 + slotFit;
  raw *= comboMult(draft.genres, comboDiscovered) * comboLevelBonus(comboLevel);
  raw -= issues * 0.9;

  /* ---- hidden cast chemistry (discovered by experimenting) */
  const matchingChems = castChemFor(draft);
  const chemMult = matchingChems.reduce((a, c) => a * c.mult, 1);
  const chemDiscovered = matchingChems.filter((c) => !castCombos.includes(c.id)).map((c) => c.id);
  const secretDiscovered = !comboDiscovered && draft.genres.length === 2 && comboKey(draft.genres) in SECRET_COMBOS;

  const quality = clamp(raw * chemMult, 4, 40);

  /* ---- four critics, each out of 10 */
  const floor = showrunner === "vision" ? 3 : 1;
  const base = quality / 4;
  const reviews: Review[] = REVIEWERS.map((r) => {
    let s = base;
    if (r.bias === "story") s += (perPhase[0] - 2) * 0.3 + (mix[0] - genreRatio[0]) * 3 + (Math.random() - 0.5) * 0.7;
    if (r.bias === "hype") s += (hype / 100) * 1.2 + (Math.random() - 0.4) * 1.6;
    if (r.bias === "harsh") s += -0.5 - issues * 0.12 + Math.random() * 0.5;
    if (r.bias === "tech") s += (mix[1] - genreRatio[1]) * 3 - issues * 0.18 + (Math.random() - 0.5) * 0.7;
    s = Math.round(clamp(s, floor, 10));
    const tier = tierOf(s * 4);
    const pool = r.quotes[tier];
    return { outlet: r.name, focus: r.focus, score: s, quote: pool[Math.floor(Math.random() * pool.length)] };
  });

  const total = reviews.reduce((a, r) => a + r.score, 0);
  const tier = tierOf(total);
  const hallOfFame = total >= 32;

  /* ---- sales: a weekly curve like the Game Dev Story chart */
  const medium = MEDIUMS[draft.medium];
  const aud = AUDIENCES[draft.audience];
  const audFit = draft.genres.length
    ? draft.genres.reduce((a, g) => a + (aud.fit[g] ?? 1), 0) / draft.genres.length
    : 1;
  const merch = research.includes("merch2") ? 1.3 : research.includes("merch") ? 1.18 : 1;
  const local = research.includes("local") ? 1.12 : 1;
  const appeal =
    Math.pow(total / 40, 2.1) *
    slot.reach *
    medium.reach *
    aud.mult *
    audFit *
    scope *
    (1 + arcsF * 1.5) *
    (1 + hype / 90) *
    franchiseMult *
    merch *
    local *
    (1 + fanBase / 260_000);

  const peak = 90_000 * appeal;
  const weeks = 8;
  const sales: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const shape = Math.exp(-Math.pow(i - 1.1, 2) / 6.2);
    sales.push(Math.max(0, Math.round(peak * shape * (0.88 + Math.random() * 0.24))));
  }
  const units = sales.reduce((a, b) => a + b, 0);
  const revenue = Math.round(units * 2.6);

  const tierFan = { masterpiece: 1.5, hit: 1.2, solid: 1, mixed: 0.62, flop: 0.3 }[tier];
  const fans = Math.round(units * 0.09 * tierFan);
  const rd = Math.max(2, Math.round(total * 0.55 + issues * 0.4));

  const breakdown = [
    { label: `Development points (${Math.round(totalPts)})`, pts: `+${pointScore.toFixed(1)}` },
    { label: `Genre focus match (${Math.round(ratioMatch * 100)}%)`, pts: `×${ratioMatch.toFixed(2)}` },
    { label: "Direction sliders", pts: `+${sliderPart.toFixed(1)}` },
    { label: `Casting · ${protag.name} + ${sec.name} + ${pet.name} + ${vil.name}`, pts: `+${casting.toFixed(1)}` },
    { label: "Story arcs", pts: `${arcQ >= 0 ? "+" : ""}${(arcQ * 0.7).toFixed(1)}` },
    { label: slotFit ? "Time-slot fit" : "Time-slot mismatch", pts: slotFit ? "+2.0" : "+0.0" },
    { label: `Genre combo ×${comboMult(draft.genres).toFixed(2)} (Lv${comboLevel})`, pts: `×${(comboMult(draft.genres) * comboLevelBonus(comboLevel)).toFixed(2)}` },
    { label: `Production issues (${issues})`, pts: `−${(issues * 0.9).toFixed(1)}` },
    { label: `Hype`, pts: `${Math.round(hype)}%` },
  ];
  if (chemMult !== 1) breakdown.push({ label: `Cast chemistry ×${chemMult.toFixed(2)}`, pts: `×${chemMult.toFixed(2)}` });
  if (secretDiscovered) breakdown.push({ label: "Secret combo discovered!", pts: "✦" });

  return {
    reviews,
    total,
    tier,
    hallOfFame,
    points,
    issues,
    revenue,
    fans,
    costs,
    rd,
    sales,
    breakdown,
    comboLevel,
    newCombo,
    chemMult,
    chemDiscovered,
    secretDiscovered,
  };
}

export const POINT_ORDER: PointType[] = ["story", "art", "sound"];
export type { CastRole };
export { PROTAGONISTS };
