import {
  GENRES,
  ROLE_POINT,
  rollCandidate,
  staffPoint,
  type GenreId,
  type PointType,
  type Staff,
  type StaffRole,
} from "./data";
import type { Project } from "./projects";

/* ====================================================================
   STAFF CAREERS — people, not stat blocks.

   Twelve-level careers driven by XP, specialisations that interact
   with the shows they work on, personality traits with exact numeric
   effects, morale, relationships that grow between colleagues,
   department heads, salary politics and — for the longest careers —
   retirement into studio legend.
   ==================================================================== */

/* ------------------------------------------------------------ levels */
export const CAREER_TITLES = [
  "Trainee",
  "Junior",
  "Staffer",
  "Key Staff",
  "Senior",
  "Lead",
  "Chief",
  "Director",
  "Veteran",
  "Master",
  "Luminary",
  "Living Legend",
];
export const MAX_LEVEL = CAREER_TITLES.length;

/** cumulative XP needed to REACH level n (index n-1) */
export const XP_LEVELS = [0, 100, 260, 500, 850, 1350, 2050, 3000, 4250, 5900, 8000, 10700];

export const levelFromXp = (xp: number): number => {
  let lvl = 1;
  for (let i = 1; i < XP_LEVELS.length; i++) if (xp >= XP_LEVELS[i]) lvl = i + 1;
  return lvl;
};
export const levelTitle = (lvl: number) => CAREER_TITLES[Math.max(0, Math.min(MAX_LEVEL, lvl) - 1)];
/** progress 0..1 inside the current level */
export function levelProgress(xp: number): number {
  const lvl = levelFromXp(xp);
  if (lvl >= MAX_LEVEL) return 1;
  const lo = XP_LEVELS[lvl - 1];
  const hi = XP_LEVELS[lvl];
  return Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
}

/** add XP; every level gained trains +2 main / +1 off stats */
export function gainXp(s: Staff, amount: number): { staff: Staff; levelsGained: number } {
  const xp = (s.xp ?? 0) + Math.max(0, Math.round(amount));
  const before = levelFromXp(s.xp ?? 0);
  const after = levelFromXp(xp);
  let out: Staff = { ...s, xp, level: after };
  const main = ROLE_POINT[s.role];
  for (let l = before; l < after; l++) {
    out = {
      ...out,
      story: Math.min(99, out.story + (main === "story" ? 2 : 1)),
      art: Math.min(99, out.art + (main === "art" ? 2 : 1)),
      sound: Math.min(99, out.sound + (main === "sound" ? 2 : 1)),
    };
  }
  return { staff: out, levelsGained: after - before };
}

/* ---------------------------------------------------- specialisations */
export interface SpecDef {
  id: string;
  role: StaffRole;
  name: string;
  /** genres this spec shines on (+25% personal output) */
  genres?: GenreId[];
  /** "sequel" = season 2+, "movie" = movie medium, "speed" = always faster */
  special?: "sequel" | "movie" | "speed";
}

export const SPEC_OUTPUT_BONUS = 0.25; // +25% on matching projects
export const SPEC_SPEED_BONUS = 0.1; // production-speed spec: +10% pace, always

export const SPEC_DEFS: SpecDef[] = [
  /* writers */
  { id: "w_comedy", role: "writer", name: "Comedy", genres: ["comedy", "slice", "cooking"] },
  { id: "w_drama", role: "writer", name: "Drama", genres: ["noir", "supernatural", "military"] },
  { id: "w_romance", role: "writer", name: "Romance", genres: ["romance", "shojo", "idol"] },
  { id: "w_action", role: "writer", name: "Action", genres: ["shonen", "sports", "mecha"] },
  { id: "w_mystery", role: "writer", name: "Mystery", genres: ["mystery", "horror", "noir"] },
  { id: "w_adapt", role: "writer", name: "Adaptation", special: "sequel" },
  /* animators */
  { id: "a_sakuga", role: "animator", name: "Action Sakuga", genres: ["shonen", "sports", "military"] },
  { id: "a_char", role: "animator", name: "Character Animation", genres: ["slice", "romance", "shojo", "idol"] },
  { id: "a_fx", role: "animator", name: "Effects", genres: ["magical", "supernatural", "space", "cyber"] },
  { id: "a_mecha", role: "animator", name: "Mecha", genres: ["mecha", "racing", "military"] },
  { id: "a_bg", role: "animator", name: "Backgrounds", genres: ["fantasy", "isekai", "noir"] },
  { id: "a_speed", role: "animator", name: "Production Speed", special: "speed" },
  /* composers */
  { id: "c_orch", role: "composer", name: "Orchestral", genres: ["fantasy", "space", "military"] },
  { id: "c_elec", role: "composer", name: "Electronic", genres: ["cyber", "racing", "mecha"] },
  { id: "c_idol", role: "composer", name: "Idol / Pop", genres: ["idol", "shojo", "comedy"] },
  { id: "c_horror", role: "composer", name: "Horror Atmosphere", genres: ["horror", "mystery", "supernatural"] },
  { id: "c_battle", role: "composer", name: "Battle Themes", genres: ["shonen", "mecha", "sports"] },
  { id: "c_emote", role: "composer", name: "Emotional Scoring", genres: ["slice", "romance", "magical"] },
];

export const specDef = (id: string | undefined): SpecDef | null =>
  SPEC_DEFS.find((d) => d.id === id) ?? null;

export function specLabel(d: SpecDef): string {
  if (d.special === "sequel") return `+${Math.round(SPEC_OUTPUT_BONUS * 100)}% output on sequels & continuations`;
  if (d.special === "movie") return `+${Math.round(SPEC_OUTPUT_BONUS * 100)}% output on movies`;
  if (d.special === "speed") return `+${Math.round(SPEC_SPEED_BONUS * 100)}% production pace, always`;
  return `+${Math.round(SPEC_OUTPUT_BONUS * 100)}% output on ${d
    .genres!.map((g) => GENRES.find((x) => x.id === g)?.label ?? g)
    .join(" / ")}`;
}

export function specMatches(d: SpecDef | null, p: Project): boolean {
  if (!d) return false;
  if (d.special === "sequel") return p.draft.season > 1 || !!p.draft.franchiseKey;
  if (d.special === "movie") return p.draft.medium === "movie";
  if (d.special === "speed") return false; // handled as pace, not output
  return p.draft.genres.some((g) => d.genres!.includes(g));
}

/* -------------------------------------------------------------- traits */
export interface TraitDef {
  id: string;
  name: string;
  /** exact numeric effect, shown verbatim in the UI */
  desc: string;
  good: boolean;
}

export const TRAIT_DEFS: TraitDef[] = [
  { id: "perfectionist", name: "Perfectionist", desc: "+15% output · −20% personal pace", good: true },
  { id: "fast", name: "Fast Worker", desc: "+25% personal pace", good: true },
  { id: "team", name: "Team Player", desc: "+0.08 speed to any team they join", good: true },
  { id: "genius", name: "Difficult Genius", desc: "+30% output · teammates −1 morale/wk", good: false },
  { id: "mentor", name: "Mentor", desc: "teammates earn +50% XP · bonds with juniors faster", good: true },
  { id: "crunch", name: "Crunch Monster", desc: "output never drops below 85% from exhaustion", good: true },
  { id: "fragile", name: "Fragile Confidence", desc: "morale swings ×2 (hits AND flops)", good: false },
  { id: "reliable", name: "Reliable", desc: "output never below 90% from stamina or morale", good: true },
  { id: "fanatic", name: "Genre Fanatic", desc: "+30% output on favourite genre · +1 morale/wk on it, −1 off it", good: true },
  { id: "adapt", name: "Adaptation Expert", desc: "+20% output on season 2+ projects", good: true },
  { id: "movie", name: "Movie Specialist", desc: "+25% output on movie projects", good: true },
  { id: "veteran", name: "Franchise Veteran", desc: "+15% output on franchise projects", good: true },
];

export const traitDef = (id: string): TraitDef | null => TRAIT_DEFS.find((t) => t.id === id) ?? null;
export const hasTrait = (s: Staff, id: string): boolean => (s.traits ?? []).includes(id);

/* ------------------------------------------------- generation / migration */
/** stable tiny hash so an old save always regenerates the same personality */
function idHash(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const GENRE_IDS = GENRES.map((g) => g.id);

function pickTraits(seedA: number, seedB: number): string[] {
  const count = 1 + (seedA % 3); // 1..3
  const ids: string[] = [];
  let x = seedB;
  while (ids.length < count) {
    x = (x * 1103515245 + 12345) & 0x7fffffff;
    const t = TRAIT_DEFS[x % TRAIT_DEFS.length].id;
    if (!ids.includes(t)) ids.push(t);
  }
  return ids;
}

/** fill in career fields — deterministic from the staff id, so loading an
    old save always produces the same person */
export function ensureCareer(s: Staff, week: number): Staff {
  if (s.xp !== undefined && s.traits && s.spec && s.shows) return s;
  const h = idHash(s.id);
  const roleSpecs = SPEC_DEFS.filter((d) => d.role === s.role);
  return {
    ...s,
    xp: s.xp ?? XP_LEVELS[Math.max(0, Math.min(MAX_LEVEL, s.level) - 1)],
    morale: s.morale ?? 70,
    traits: s.traits ?? pickTraits(h, h >> 3),
    spec: s.spec ?? roleSpecs[h % roleSpecs.length].id,
    favGenre: s.favGenre ?? GENRE_IDS[(h >> 5) % GENRE_IDS.length],
    joinedWeek: s.joinedWeek ?? week,
    shows: s.shows ?? [],
    awardsWon: s.awardsWon ?? 0,
    bestShow: s.bestShow ?? null,
  };
}

/** roll a fresh candidate with a full personality */
export function rollHire(week: number): Staff {
  return ensureCareer(rollCandidate(week), week);
}

/* -------------------------------------------------------------- morale */
export const moraleOf = (s: Staff) => s.morale ?? 70;
/** morale output factor: 70 morale = ×1.00, 100 = ×1.11, 20 = ×0.82 */
export const moraleF = (s: Staff) => 0.75 + moraleOf(s) / 280;
/** Fragile Confidence doubles every swing */
export function moraleDelta(s: Staff, delta: number): Staff {
  const mult = hasTrait(s, "fragile") ? 2 : 1;
  return { ...s, morale: Math.max(0, Math.min(100, moraleOf(s) + delta * mult)) };
}

/* --------------------------------------------------------------- bonds */
export type BondKind = "partnership" | "mentorship" | "rivalry" | "clash";
export const BOND_WEEKS = 8; // weeks worked together before a bond forms

export const bondKey = (a: string, b: string) => [a, b].sort().join("~");

export interface BondInfo {
  kind: BondKind;
  /** exact numeric effect, shown verbatim in the UI */
  desc: string;
}

/** what two colleagues become after BOND_WEEKS together — rule-based and
    deterministic so it survives save/load */
export function bondKind(a: Staff, b: Staff): BondKind {
  const gap = Math.abs(a.level - b.level);
  const mentorGap = hasTrait(a, "mentor") || hasTrait(b, "mentor") ? 2 : 3;
  const spiky = (s: Staff) => hasTrait(s, "genius");
  const bruised = (s: Staff) => hasTrait(s, "perfectionist") || hasTrait(s, "fragile") || hasTrait(s, "genius");
  const social = (s: Staff) => hasTrait(s, "team");
  if ((spiky(a) && bruised(b) && !social(b)) || (spiky(b) && bruised(a) && !social(a))) return "clash";
  if (gap >= mentorGap) return "mentorship";
  if (a.role === b.role && gap <= 1) return "rivalry";
  return "partnership";
}

export const BOND_DESC: Record<BondKind, string> = {
  partnership: "+8% output when working together",
  mentorship: "junior +5% output & +50% XP · mentor +3% output",
  rivalry: "+10% pace for both · +1 XP/wk",
  clash: "−8% output for both · −1 morale/wk",
};

export function bondBetween(bonds: Record<string, number>, a: Staff, b: Staff): BondInfo | null {
  const weeks = bonds[bondKey(a.id, b.id)] ?? 0;
  if (weeks < BOND_WEEKS) return null;
  const kind = bondKind(a, b);
  return { kind, desc: BOND_DESC[kind] };
}

/* ----------------------------------------------------- per-person output */
export interface PersonMod {
  /** multiplier on weekly production points (includes stamina & morale) */
  out: number;
  /** multiplier on this person's team-speed contribution */
  pace: number;
  /** flat team-speed added just by being on the team */
  aura: number;
  /** multiplier on weekly XP earned */
  xpMult: number;
}

const staminaFactor = (s: Staff) => 0.55 + s.stamina / 220;

export interface CareerCtx {
  bonds: Record<string, number>;
}

/** the full personal multiplier set for one staff member on one project */
export function personMod(s: Staff, p: Project, team: Staff[], ctx: CareerCtx): PersonMod {
  let cond = staminaFactor(s) * moraleF(s);
  if (hasTrait(s, "crunch")) cond = Math.max(0.85, cond);
  if (hasTrait(s, "reliable")) cond = Math.max(0.9, cond);

  let out = cond;
  let pace = cond;
  let aura = 0;
  let xpMult = 1;

  /* traits */
  if (hasTrait(s, "perfectionist")) {
    out *= 1.15;
    pace *= 0.8;
  }
  if (hasTrait(s, "fast")) pace *= 1.25;
  if (hasTrait(s, "team")) aura += 0.08;
  if (hasTrait(s, "genius")) out *= 1.3;
  if (hasTrait(s, "fanatic") && s.favGenre && p.draft.genres.includes(s.favGenre)) out *= 1.3;
  if (hasTrait(s, "adapt") && p.draft.season > 1) out *= 1.2;
  if (hasTrait(s, "movie") && p.draft.medium === "movie") out *= 1.25;
  if (hasTrait(s, "veteran") && (p.draft.franchiseKey || p.draft.season > 1)) out *= 1.15;

  /* specialisation */
  const d = specDef(s.spec);
  if (d) {
    if (specMatches(d, p)) out *= 1 + SPEC_OUTPUT_BONUS;
    if (d.special === "speed") pace *= 1 + SPEC_SPEED_BONUS;
  }

  /* relationships with teammates on the same project */
  for (const mate of team) {
    if (mate.id === s.id) continue;
    const bond = bondBetween(ctx.bonds, s, mate);
    if (!bond) continue;
    if (bond.kind === "partnership") out *= 1.08;
    if (bond.kind === "rivalry") pace *= 1.1;
    if (bond.kind === "clash") out *= 0.92;
    if (bond.kind === "mentorship") {
      if (s.level < mate.level) {
        out *= 1.05;
        xpMult *= 1.5;
      } else out *= 1.03;
    }
    /* mentors boost every junior teammate's XP */
    if (hasTrait(mate, "mentor") && mate.level > s.level) xpMult *= 1.5;
  }

  return { out, pace, aura, xpMult };
}

/* ----------------------------------------------------- department heads */
export type HeadSlot = "writer" | "animator" | "composer" | "production";
export type Heads = Partial<Record<HeadSlot, string>>;

export const HEAD_TITLES: Record<HeadSlot, string> = {
  writer: "Head Writer",
  animator: "Animation Director",
  composer: "Music Director",
  production: "Production Manager",
};
export const HEAD_DESC: Record<HeadSlot, string> = {
  writer: "all Story production +10%",
  animator: "all Art production +10%",
  composer: "all Sound production +10%",
  production: "all projects +0.08 speed · weekly burn −10%",
};
export const HEAD_MIN_LEVEL: Record<HeadSlot, number> = { writer: 6, animator: 6, composer: 6, production: 7 };
export const HEAD_MIN_OFFICE: Record<HeadSlot, number> = { writer: 2, animator: 2, composer: 2, production: 3 };
export const HEAD_OUTPUT_BONUS = 1.1;
export const HEAD_SALARY_MULT = 1.25;

export interface LegendRec {
  name: string;
  role: StaffRole;
  look?: number;
  portrait: number;
  level: number;
  retiredWeek: number;
  shows: number;
  bestShow: { title: string; score: number } | null;
}
export const LEGEND_BONUS = 0.03; // each retired legend: +3% to their discipline, forever

/** studio-wide production multipliers from heads + retired legends */
export function studioPointMult(heads: Heads, staff: Staff[], legends: LegendRec[]): Record<PointType, number> {
  const mult: Record<PointType, number> = { story: 1, art: 1, sound: 1 };
  (["writer", "animator", "composer"] as const).forEach((slot) => {
    const id = heads[slot];
    if (id && staff.some((s) => s.id === id)) mult[ROLE_POINT[slot]] *= HEAD_OUTPUT_BONUS;
  });
  for (const l of legends) mult[ROLE_POINT[l.role]] *= 1 + LEGEND_BONUS;
  return mult;
}

/** studio-wide speed / burn effects from the Production Manager */
export function studioProduction(heads: Heads, staff: Staff[]): { speed: number; burnMult: number } {
  const pm = heads.production;
  const active = !!pm && staff.some((s) => s.id === pm);
  return { speed: active ? 0.08 : 0, burnMult: active ? 0.9 : 1 };
}

/* ------------------------------------------------------- salary politics */
export interface StaffEvent {
  id: string;
  staffId: string;
  kind: "raise" | "poach";
  /** raise: requested weekly salary · poach: the rival's weekly offer */
  amount: number;
  week: number;
  expiresWeek: number;
  /** which rival studio is courting (poach only) */
  studio?: string;
  studioId?: string;
}

/** what this person is worth on the open market */
export const marketSalary = (s: Staff) =>
  Math.round((280 + staffPoint(s, ROLE_POINT[s.role]) * 13 + s.level * 140) / 10) * 10;

export const wantsRaise = (s: Staff, week: number) =>
  marketSalary(s) > s.salary * 1.35 && week - (s.joinedWeek ?? 0) >= 24;

export const poachable = (s: Staff) =>
  (s.level >= 7 || staffPoint(s, ROLE_POINT[s.role]) >= 85) && moraleOf(s) < 60;

/* ------------------------------------------------------------ experience */
/** XP a release grants each team member */
export function releaseXp(p: Project, score: number, tier: string): number {
  let xp = 40 + score;
  if (p.draft.budget === "blockbuster") xp += 25; // difficult project
  if (p.draft.medium === "movie") xp += 20;
  if (tier === "hit") xp += 20;
  return xp;
}
export const CONTRACT_XP = 15;
export const AWARD_XP = 60; // per award, whole studio
export const WEEKLY_XP = 3; // for assigned staff

/* -------------------------------------------------------------- training */
export const TRAIN_COOLDOWN = 6; // weeks between courses per person
export const trainCost = (tier: number) => ({ cash: 4_000 + 2_000 * tier, rd: 2 * tier });
export const trainXp = (tier: number) => 50 * tier;

/* ------------------------------------------------------------ retirement */
export const RETIRE_MIN_LEVEL = 10;
export const RETIRE_MIN_WEEKS = 48 * 6; // six years of service
export const RETIRE_CHANCE = 0.3; // per year-end once eligible

export const retirementEligible = (s: Staff, week: number) =>
  s.level >= RETIRE_MIN_LEVEL && week - (s.joinedWeek ?? 0) >= RETIRE_MIN_WEEKS;

export function toLegend(s: Staff, week: number): LegendRec {
  return {
    name: s.name,
    role: s.role,
    look: s.look,
    portrait: s.portrait,
    level: s.level,
    retiredWeek: week,
    shows: (s.shows ?? []).length,
    bestShow: s.bestShow ?? null,
  };
}

/* --------------------------------------------------------------- history */
export const yearsEmployed = (s: Staff, week: number) =>
  Math.max(0, (week - (s.joinedWeek ?? 0)) / 48);

export function recordShow(s: Staff, title: string, score: number, week: number): Staff {
  const shows = [...(s.shows ?? []), { title, score, week }].slice(-20);
  const best = s.bestShow && s.bestShow.score >= score ? s.bestShow : { title, score };
  return { ...s, shows, bestShow: best };
}
