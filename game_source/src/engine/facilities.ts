import type { BudgetId, PointType } from "./data";

/* ====================================================================
   STUDIO FACILITIES — rooms you build into your office.

   Each office grants a number of ROOM SLOTS. A facility occupies one
   slot regardless of tier, so a small studio must specialise: you
   cannot own everything until the campus.  Upgrades never take a new
   slot, they deepen the room you already have.
   ==================================================================== */

export type FacilityId =
  | "writers"
  | "animation"
  | "recording"
  | "editing"
  | "marketing"
  | "merch"
  | "training"
  | "canteen"
  | "render"
  | "archive";

/** owned rooms: facility id → tier (1..maxTier) */
export type Facilities = Partial<Record<FacilityId, number>>;

export interface FacilityTier {
  cost: number; // build / upgrade price
  rd: number; // research points required
  upkeep: number; // weekly running cost once at this tier
}

export interface FacilityDef {
  id: FacilityId;
  name: string;
  /** which studio strategy this belongs to (shown as a chip) */
  category: "production" | "marketing" | "people" | "revenue";
  color: string;
  blurb: string;
  tiers: FacilityTier[];
  /** exact numeric effect lines for a given tier (1-based) */
  effects: (tier: number) => string[];
}

export const FACILITY_DEFS: FacilityDef[] = [
  {
    id: "writers",
    name: "Writers' Room",
    category: "production",
    color: "#a78bfa",
    blurb: "Whiteboards, index cards and a suspicious amount of coffee.",
    tiers: [
      { cost: 45_000, rd: 0, upkeep: 300 },
      { cost: 140_000, rd: 15, upkeep: 600 },
      { cost: 420_000, rd: 45, upkeep: 900 },
    ],
    effects: (t) => [`Story production +${[15, 30, 50][t - 1]}%`],
  },
  {
    id: "animation",
    name: "Animation Department",
    category: "production",
    color: "#3be1ff",
    blurb: "Light tables, cintiqs, and one very protective sakuga lead.",
    tiers: [
      { cost: 60_000, rd: 0, upkeep: 400 },
      { cost: 190_000, rd: 20, upkeep: 800 },
      { cost: 560_000, rd: 55, upkeep: 1_200 },
    ],
    effects: (t) => [
      `Art production +${[15, 30, 50][t - 1]}%`,
      `Animation stage speed +${[10, 20, 35][t - 1]}% (fewer delays)`,
    ],
  },
  {
    id: "recording",
    name: "Recording Booth",
    category: "production",
    color: "#ffd166",
    blurb: "Soundproofed to survive even the loudest shonen scream.",
    tiers: [
      { cost: 50_000, rd: 0, upkeep: 300 },
      { cost: 155_000, rd: 15, upkeep: 600 },
      { cost: 470_000, rd: 45, upkeep: 900 },
    ],
    effects: (t) => [`Sound & voice production +${[15, 30, 50][t - 1]}%`],
  },
  {
    id: "editing",
    name: "Editing & QA Suite",
    category: "production",
    color: "#5ef0c0",
    blurb: "Where frames go to be fixed and egos go to be bruised.",
    tiers: [
      { cost: 55_000, rd: 0, upkeep: 350 },
      { cost: 170_000, rd: 15, upkeep: 700 },
      { cost: 500_000, rd: 50, upkeep: 1_050 },
    ],
    effects: (t) => [
      `Post-production fixes +${t} issue${t > 1 ? "s" : ""}/week`,
      `New production issues reduced by ${t} per sprint`,
    ],
  },
  {
    id: "marketing",
    name: "Marketing Office",
    category: "marketing",
    color: "#ff7a3d",
    blurb: "They speak fluent hashtag and know every convention organiser.",
    tiers: [
      { cost: 65_000, rd: 0, upkeep: 450 },
      { cost: 200_000, rd: 20, upkeep: 900 },
      { cost: 600_000, rd: 55, upkeep: 1_350 },
    ],
    effects: (t) => [
      `All hype gains +${[25, 50, 80][t - 1]}%`,
      `Promo campaigns cost −${[10, 20, 30][t - 1]}%`,
      ...(t >= 2 ? ["Premium campaigns unlocked"] : []),
    ],
  },
  {
    id: "merch",
    name: "Merch Department",
    category: "revenue",
    color: "#ff8fc7",
    blurb: "Acrylic stands. Body pillows. A licensing lawyer on speed dial.",
    tiers: [
      { cost: 80_000, rd: 0, upkeep: 500 },
      { cost: 260_000, rd: 25, upkeep: 1_000 },
      { cost: 780_000, rd: 70, upkeep: 1_500 },
    ],
    effects: (t) => [`Release revenue +${[8, 16, 25][t - 1]}% (merchandise)`],
  },
  {
    id: "training",
    name: "Training Room",
    category: "people",
    color: "#c8f05e",
    blurb: "Masterclasses, mentorship, and the sacred pile of reference books.",
    tiers: [
      { cost: 70_000, rd: 0, upkeep: 400 },
      { cost: 220_000, rd: 20, upkeep: 800 },
      { cost: 650_000, rd: 60, upkeep: 1_200 },
    ],
    effects: (t) => [
      `Milestone sprints teach the team +${t} in that discipline`,
      `Shipping a show grants +${1 + t} to every skill (instead of +1)`,
    ],
  },
  {
    id: "canteen",
    name: "Canteen & Break Room",
    category: "people",
    color: "#f0b95e",
    blurb: "Free ramen on Fridays. Morale has never been higher.",
    tiers: [
      { cost: 40_000, rd: 0, upkeep: 250 },
      { cost: 120_000, rd: 10, upkeep: 500 },
      { cost: 360_000, rd: 35, upkeep: 750 },
    ],
    effects: (t) => [
      `Idle staff recover +${[4, 8, 12][t - 1]} stamina/week (base 9)`,
      `Assigned staff lose ${[1, 1, 2][t - 1]} less stamina/week`,
      `Everyone gains +${t} morale/week`,
    ],
  },
  {
    id: "render",
    name: "Render Farm",
    category: "production",
    color: "#5e9df0",
    blurb: "A humming server room that doubles as winter heating.",
    tiers: [
      { cost: 100_000, rd: 10, upkeep: 700 },
      { cost: 320_000, rd: 35, upkeep: 1_400 },
      { cost: 950_000, rd: 90, upkeep: 2_100 },
    ],
    effects: (t) => [
      `All production speed +${[8, 16, 28][t - 1]}%`,
      `Blockbuster-budget projects get double that (+${[16, 32, 56][t - 1]}%)`,
    ],
  },
  {
    id: "archive",
    name: "Archive & Research Room",
    category: "people",
    color: "#b08fff",
    blurb: "Every storyboard ever drawn, catalogued by someone who cares deeply.",
    tiers: [
      { cost: 60_000, rd: 0, upkeep: 350 },
      { cost: 180_000, rd: 15, upkeep: 700 },
      { cost: 540_000, rd: 50, upkeep: 1_050 },
    ],
    effects: (t) => [
      `+${[1, 2, 4][t - 1]} research point${t > 1 ? "s" : ""}/week`,
      `Research earned from sprints +${[25, 50, 100][t - 1]}%`,
    ],
  },
];

export const facilityDef = (id: FacilityId): FacilityDef =>
  FACILITY_DEFS.find((f) => f.id === id)!;

export const MAX_TIER = 3;

/* ------------------------------------------------------------- slots */
export const slotsUsed = (fac: Facilities): number =>
  Object.values(fac).filter((t) => (t ?? 0) > 0).length;

/* -------------------------------------------------------------- cost */
/** cost of the NEXT tier for a facility (build if unowned), null if maxed */
export function nextTier(fac: Facilities, id: FacilityId): { tier: number; cost: number; rd: number } | null {
  const cur = fac[id] ?? 0;
  const def = facilityDef(id);
  if (cur >= def.tiers.length) return null;
  const t = def.tiers[cur];
  return { tier: cur + 1, cost: t.cost, rd: t.rd };
}

/** weekly running cost of every room at its current tier */
export function facilityUpkeep(fac: Facilities): number {
  let sum = 0;
  for (const [id, tier] of Object.entries(fac) as [FacilityId, number][]) {
    if (!tier) continue;
    sum += facilityDef(id).tiers[tier - 1].upkeep;
  }
  return sum;
}

/* ----------------------------------------------------------- effects */
/** the aggregate mechanical effect of every room, ready to be applied */
export interface FacilityFX {
  /** multiplier on weekly production point gains per discipline */
  pointMult: Record<PointType, number>;
  /** flat team-speed bonus on every stage */
  speed: number;
  /** extra speed during the animation stage */
  speedAnimation: number;
  /** extra issues fixed per week during post */
  issueFix: number;
  /** issues coming out of a milestone sprint are reduced by this */
  issueGuard: number;
  /** multiplier on hype gains (marketing stage + promo campaigns) */
  hypeMult: number;
  /** promo campaign price discount 0..1 */
  promoDiscount: number;
  /** premium promo campaigns available without the research */
  promoUnlock: boolean;
  /** release revenue multiplier from merchandising */
  merchMult: number;
  /** extra skill points taught by sprints / releases */
  trainSkill: number;
  /** extra idle stamina recovery per week */
  staminaRest: number;
  /** reduced stamina drain per week for assigned staff */
  staminaSave: number;
  /** weekly morale bonus for everyone (a happy canteen) */
  moraleRest: number;
  /** flat research points per week */
  rdWeekly: number;
  /** multiplier on research earned from sprints */
  rdMult: number;
}

export const NO_FX: FacilityFX = {
  pointMult: { story: 1, art: 1, sound: 1 },
  speed: 0,
  speedAnimation: 0,
  issueFix: 0,
  issueGuard: 0,
  hypeMult: 1,
  promoDiscount: 0,
  promoUnlock: false,
  merchMult: 1,
  trainSkill: 0,
  staminaRest: 0,
  staminaSave: 0,
  moraleRest: 0,
  rdWeekly: 0,
  rdMult: 1,
};

export function facilityFX(fac: Facilities | undefined): FacilityFX {
  const fx: FacilityFX = {
    ...NO_FX,
    pointMult: { ...NO_FX.pointMult },
  };
  if (!fac) return fx;
  const tier = (id: FacilityId) => fac[id] ?? 0;

  const w = tier("writers");
  if (w) fx.pointMult.story *= [1.15, 1.3, 1.5][w - 1];

  const a = tier("animation");
  if (a) {
    fx.pointMult.art *= [1.15, 1.3, 1.5][a - 1];
    fx.speedAnimation += [0.1, 0.2, 0.35][a - 1];
  }

  const rec = tier("recording");
  if (rec) fx.pointMult.sound *= [1.15, 1.3, 1.5][rec - 1];

  const e = tier("editing");
  if (e) {
    fx.issueFix += e;
    fx.issueGuard += e;
  }

  const m = tier("marketing");
  if (m) {
    fx.hypeMult *= [1.25, 1.5, 1.8][m - 1];
    fx.promoDiscount = [0.1, 0.2, 0.3][m - 1];
    fx.promoUnlock = m >= 2;
  }

  const mc = tier("merch");
  if (mc) fx.merchMult *= [1.08, 1.16, 1.25][mc - 1];

  const t = tier("training");
  if (t) fx.trainSkill += t;

  const c = tier("canteen");
  if (c) {
    fx.staminaRest += [4, 8, 12][c - 1];
    fx.staminaSave += [1, 1, 2][c - 1];
    fx.moraleRest += c;
  }

  const rf = tier("render");
  if (rf) fx.speed += [0.08, 0.16, 0.28][rf - 1];

  const ar = tier("archive");
  if (ar) {
    fx.rdWeekly += [1, 2, 4][ar - 1];
    fx.rdMult *= [1.25, 1.5, 2][ar - 1];
  }

  return fx;
}

/** render-farm speed for a given project budget (blockbusters gain double) */
export const fxSpeedFor = (fx: FacilityFX, budget: BudgetId): number =>
  fx.speed * (budget === "blockbuster" ? 2 : 1);
