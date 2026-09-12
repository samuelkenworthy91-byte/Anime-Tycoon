import {
  GENRES,
  ROLE_POINT,
  STAFF_STAT_CAP,
  rollCandidate,
  staffPoint,
  type GenreId,
  type PointType,
  type Staff,
  type StaffLevelUpRecord,
  type StaffRole,
} from "./data";
import type { Project } from "./projects";

/* ====================================================================
   STAFF CAREERS — people, not stat blocks.

   Long-form careers driven by XP, specialisations that interact
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
] as const;

/** Staff can keep developing for the entire campaign and deep Dynasty saves. */
export const MAX_LEVEL = 999;

/** The original 12 thresholds are preserved byte-for-byte for existing saves. */
const LEGACY_XP_LEVELS = [0, 100, 260, 500, 850, 1350, 2050, 3000, 4250, 5900, 8000, 10700] as const;

/**
 * Cumulative XP needed to reach each level (index = level - 1). After Lv12,
 * mastery levels deliberately slow down rather than ending. The gap starts
 * around 2.9k XP and grows smoothly, making Lv999 a true endless-save goal.
 */
export const XP_LEVELS: number[] = [...LEGACY_XP_LEVELS];
for (let level = 13; level <= MAX_LEVEL; level += 1) {
  const mastery = level - 12;
  const gap = Math.round(2800 + mastery * 22 + Math.sqrt(mastery) * 80);
  XP_LEVELS.push(XP_LEVELS[XP_LEVELS.length - 1] + gap);
}

/** Higher levels retain familiar early titles, then gain long-run prestige ranks. */
const CAREER_TITLE_MILESTONES: { level: number; title: string }[] = [
  ...CAREER_TITLES.map((title, i) => ({ level: i + 1, title })),
  { level: 25, title: "Grandmaster" },
  { level: 50, title: "Industry Icon" },
  { level: 100, title: "Auteur" },
  { level: 250, title: "Hall of Famer" },
  { level: 500, title: "Immortal" },
  { level: 750, title: "Mythic" },
  { level: 999, title: "Pinnacle" },
];

export const levelFromXp = (xp: number): number => {
  const value = Math.max(0, xp);
  let lo = 0;
  let hi = XP_LEVELS.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (XP_LEVELS[mid] <= value) lo = mid;
    else hi = mid - 1;
  }
  return Math.min(MAX_LEVEL, lo + 1);
};

export const levelTitle = (lvl: number) => {
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(lvl)));
  return [...CAREER_TITLE_MILESTONES].reverse().find((x) => level >= x.level)?.title ?? CAREER_TITLES[0];
};

/** progress 0..1 inside the current level */
export function levelProgress(xp: number): number {
  const lvl = levelFromXp(xp);
  if (lvl >= MAX_LEVEL) return 1;
  const lo = XP_LEVELS[lvl - 1];
  const hi = XP_LEVELS[lvl];
  return Math.max(0, Math.min(1, (xp - lo) / (hi - lo)));
}


/** Add XP and resolve every crossed level through the employee's stable hidden
 * Potential. Growth is deterministic for staff-id + level so save/reload can
 * never reroll a good or bad level. */
export function gainXp(s: Staff, amount: number): { staff: Staff; levelsGained: number; levelUps: StaffLevelUpRecord[] } {
  const xp = (s.xp ?? 0) + Math.max(0, Math.round(amount));
  const before = levelFromXp(s.xp ?? 0);
  const after = levelFromXp(xp);
  let out: Staff = { ...s, potential: potentialOf(s), xp, level: after };
  const levelUps: StaffLevelUpRecord[] = [];
  const queued = [...(s.pendingLevelUps ?? [])];
  for (let level = before + 1; level <= after; level += 1) {
    const oldStats = { story: out.story, art: out.art, sound: out.sound };
    const gains = growthForLevel(out, level);
    const nextStats = {
      story: Math.min(STAFF_STAT_CAP, oldStats.story + gains.story),
      art: Math.min(STAFF_STAT_CAP, oldStats.art + gains.art),
      sound: Math.min(STAFF_STAT_CAP, oldStats.sound + gains.sound),
    };
    const record: StaffLevelUpRecord = {
      id: `${out.id}:lv${level}`,
      beforeLevel: level - 1,
      afterLevel: level,
      title: levelTitle(level),
      before: oldStats,
      after: nextStats,
      gains: {
        story: nextStats.story - oldStats.story,
        art: nextStats.art - oldStats.art,
        sound: nextStats.sound - oldStats.sound,
      },
    };
    levelUps.push(record);
    queued.push(record);
    out = { ...out, ...nextStats, pendingLevelUps: queued };
  }
  return { staff: out, levelsGained: after - before, levelUps };
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

export const SPEC_OUTPUT_BONUS = 0.35; // +35% on matching projects
export const SPEC_SPEED_BONUS = 0.15; // production-speed spec: +15% pace, always

export const SPEC_DEFS: SpecDef[] = [
  /* writers */
  { id: "w_comedy", role: "writer", name: "Comedy", genres: ["comedy", "slice", "cooking"] },
  { id: "w_drama", role: "writer", name: "Drama", genres: ["survival", "supernatural", "military", "nordic", "samurai"] },
  { id: "w_romance", role: "writer", name: "Romance", genres: ["romance", "slice", "idol"] },
  { id: "w_action", role: "writer", name: "Action", genres: ["martial", "sports", "mecha", "pirate", "samurai", "shinobi"] },
  { id: "w_mystery", role: "writer", name: "Mystery", genres: ["mystery", "horror", "cyber", "shinobi"] },
  { id: "w_adapt", role: "writer", name: "Adaptation", special: "sequel" },
  /* animators */
  { id: "a_sakuga", role: "animator", name: "Action Sakuga", genres: ["martial", "sports", "military", "pirate", "samurai", "shinobi"] },
  { id: "a_char", role: "animator", name: "Character Animation", genres: ["slice", "romance", "idol"] },
  { id: "a_fx", role: "animator", name: "Effects", genres: ["magical", "supernatural", "space", "cyber"] },
  { id: "a_mecha", role: "animator", name: "Mecha", genres: ["mecha", "sports", "military"] },
  { id: "a_bg", role: "animator", name: "Backgrounds", genres: ["fantasy", "isekai", "nordic", "survival"] },
  { id: "a_speed", role: "animator", name: "Production Speed", special: "speed" },
  /* composers */
  { id: "c_orch", role: "composer", name: "Orchestral", genres: ["fantasy", "space", "military"] },
  { id: "c_elec", role: "composer", name: "Electronic", genres: ["cyber", "sports", "mecha"] },
  { id: "c_idol", role: "composer", name: "Idol / Pop", genres: ["idol", "romance", "comedy"] },
  { id: "c_horror", role: "composer", name: "Horror Atmosphere", genres: ["horror", "mystery", "supernatural", "shinobi"] },
  { id: "c_battle", role: "composer", name: "Battle Themes", genres: ["martial", "mecha", "sports", "military", "samurai"] },
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
  { id: "perfectionist", name: "Perfectionist", desc: "+30% output · −25% personal pace", good: true },
  { id: "fast", name: "Fast Worker", desc: "+40% personal pace · −5% output", good: true },
  { id: "team", name: "Team Player", desc: "+0.12 team speed aura", good: true },
  { id: "genius", name: "Difficult Genius", desc: "+50% output · teammates −2 morale/wk", good: false },
  { id: "mentor", name: "Mentor", desc: "junior teammates +75% XP · mentor relationships form after 5 weeks", good: true },
  { id: "crunch", name: "Crunch Monster", desc: "condition output never below 92% while working", good: true },
  { id: "fragile", name: "Fragile Confidence", desc: "morale swings ×2", good: false },
  { id: "reliable", name: "Reliable", desc: "condition output never below 95%", good: true },
  { id: "fanatic", name: "Genre Fanatic", desc: "+65% output on favourite genre · +2 morale/wk on it, −2 off it", good: true },
  { id: "adapt", name: "Adaptation Expert", desc: "+35% output on licensed adaptations and season 2+", good: true },
  { id: "movie", name: "Movie Specialist", desc: "+40% output on movie projects", good: true },
  { id: "veteran", name: "Franchise Veteran", desc: "+25% output on franchise & season 2+ projects", good: true },
  { id: "researcher", name: "Research Hound", desc: "studio research duration −8% each · stacks to −24%", good: true },
  { id: "gossip", name: "Industry Gossip", desc: "releases they worked on gain +10% fans", good: true },
  { id: "publicist", name: "Fan Whisperer", desc: "releases they worked on gain +15% fans", good: true },
  { id: "organizer", name: "Production Organizer", desc: "+0.10 team speed aura", good: true },
  { id: "fixer", name: "Continuity Hawk", desc: "+30% output while a project carries editing notes", good: true },
  { id: "prodigy", name: "Fast Learner", desc: "+50% personal XP earned", good: true },
  { id: "ensemble", name: "Ensemble Brain", desc: "+15% output on teams of 3+", good: true },
  { id: "lonewolf", name: "Lone Wolf", desc: "+25% output on teams of 1–2 · −10% on teams of 4+", good: false },
  { id: "closer", name: "Finisher", desc: "+25% output during Sound, Post and Marketing stages", good: true },
  { id: "starter", name: "Concept Ace", desc: "+25% output during Concept and Pre-production", good: true },
  { id: "lorekeeper", name: "Lore Keeper", desc: "+30% output on licensed IP and franchise productions", good: true },
  { id: "networker", name: "Industry Networker", desc: "contracts they work on pay +15% each · team cap +45%", good: true },
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

/** Hidden development ceiling. Distribution is deliberately broad: about
 * 15% low, 30% limited/steady, 35% normal-high, 16% exceptional and 4% elite. */
export function potentialForId(id: string): number {
  const h = idHash(id + "|potential");
  const roll = (h % 10_000) / 10_000;
  const detail = idHash(id + "|potential-detail");
  if (roll < 0.15) return 1 + (detail % 20);
  if (roll < 0.45) return 21 + (detail % 25);
  if (roll < 0.80) return 46 + (detail % 25);
  if (roll < 0.96) return 71 + (detail % 20);
  return 91 + (detail % 10);
}

export function potentialOf(s: Staff): number {
  return Math.max(1, Math.min(100, Math.round(s.potential ?? potentialForId(s.id))));
}

function levelRng(id: string, level: number): () => number {
  let x = (idHash(`${id}|growth|${level}`) || 0x6d2b79f5) >>> 0;
  return () => {
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 4_294_967_296;
  };
}

/** Exact stat roll for one level. The total-point gap between weak and elite
 * Potential is intentionally dramatic; role only biases WHERE the points land. */
export function growthForLevel(s: Staff, newLevel: number): { story: number; art: number; sound: number } {
  const potential = potentialOf(s);
  const rng = levelRng(s.id, newLevel);
  let lo = 0, hi = 2;
  if (potential > 20 && potential <= 45) [lo, hi] = [2, 4];
  else if (potential > 45 && potential <= 70) [lo, hi] = [4, 7];
  else if (potential > 70 && potential <= 90) [lo, hi] = [6, 10];
  else if (potential > 90) [lo, hi] = [9, 15];
  let total = lo + Math.floor(rng() * (hi - lo + 1));
  if (potential >= 91 && rng() < 0.12) total += 1 + Math.floor(rng() * 4);
  else if (potential >= 71 && rng() < 0.08) total += 1 + Math.floor(rng() * 3);

  const gains = { story: 0, art: 0, sound: 0 };
  const main = ROLE_POINT[s.role];
  const points: PointType[] = ["story", "art", "sound"];
  for (let i = 0; i < total; i += 1) {
    const weights = points.map((point) => point === main ? 5 : 1.5);
    let pick = rng() * weights.reduce((a, b) => a + b, 0);
    let chosen: PointType = main;
    for (let j = 0; j < points.length; j += 1) {
      pick -= weights[j];
      if (pick <= 0) { chosen = points[j]; break; }
    }
    gains[chosen] += 1;
  }
  return gains;
}

const GENRE_IDS = GENRES.map((g) => g.id);

function pickTraits(seedA: number, seedB: number): string[] {
  const count = 2 + (seedA % 3); // 2..4: candidates should feel meaningfully distinct
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
  const h = idHash(s.id);
  const roleSpecs = SPEC_DEFS.filter((d) => d.role === s.role);
  const savedLevel = Math.max(1, Math.min(MAX_LEVEL, Math.round(s.level || 1)));
  const xp = Math.max(0, s.xp ?? XP_LEVELS[savedLevel - 1]);
  const inferredLevel = levelFromXp(xp);
  /* Old max-level saves continued banking XP even though Lv12 could not move.
     On first load, honour that earned XP and grant the missing level stat growth. */
  const retroLevels = Math.max(0, inferredLevel - savedLevel);
  const potential = potentialOf(s);
  let retro: Staff = { ...s, potential };
  for (let level = savedLevel + 1; level <= inferredLevel; level += 1) {
    const gain = growthForLevel(retro, level);
    retro = {
      ...retro,
      story: Math.min(STAFF_STAT_CAP, retro.story + gain.story),
      art: Math.min(STAFF_STAT_CAP, retro.art + gain.art),
      sound: Math.min(STAFF_STAT_CAP, retro.sound + gain.sound),
    };
  }
  return {
    ...retro,
    level: inferredLevel,
    xp,
    potential,
    pendingLevelUps: Array.isArray(s.pendingLevelUps) ? s.pendingLevelUps : [],
    story: retro.story,
    art: retro.art,
    sound: retro.sound,
    morale: s.morale ?? 70,
    traits: s.traits ?? pickTraits(h, h >> 3),
    spec: s.spec ?? roleSpecs[h % roleSpecs.length].id,
    favGenre: s.favGenre ?? GENRE_IDS[(h >> 5) % GENRE_IDS.length],
    genreExperience: s.genreExperience && typeof s.genreExperience === "object" ? { ...s.genreExperience } : {},
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
  const threshold = hasTrait(a, "mentor") || hasTrait(b, "mentor") ? 5 : BOND_WEEKS;
  if (weeks < threshold) return null;
  const kind = bondKind(a, b);
  return { kind, desc: BOND_DESC[kind] };
}

/* ------------------------------------------------ personal genre craft */
/** Three real shipped productions takes an unfamiliar genre to neutral. */
export const GENRE_NEUTRAL_SHOWS = 3;

export const genreShows = (s: Staff, genre: GenreId): number =>
  Math.max(0, Math.floor(s.genreExperience?.[genre] ?? 0));

/** Professional specialisation/fandom supplies a starting familiarity floor,
 * while the stored counter always remains the number actually shipped. */
export function genreFamiliarity(s: Staff, genre: GenreId): number {
  let floor = 0;
  const d = specDef(s.spec);
  if (d?.genres?.includes(genre)) floor = Math.max(floor, 3);
  if (s.favGenre === genre) floor = Math.max(floor, 4);
  return Math.max(genreShows(s, genre), floor);
}

export function genreExperienceMultiplier(familiarity: number): number {
  const n = Math.max(0, Math.floor(familiarity));
  if (n === 0) return 0.60;
  if (n === 1) return 0.75;
  if (n === 2) return 0.90;
  if (n === 3) return 1.00;
  return Math.min(1.25, Math.round((1 + (n - 3) * 0.04) * 100) / 100);
}

export function genreExperienceLabel(familiarity: number): string {
  const n = Math.max(0, Math.floor(familiarity));
  if (n === 0) return "UNTESTED";
  if (n === 1) return "ROOKIE";
  if (n === 2) return "LEARNING";
  if (n === 3) return "NEUTRAL";
  if (n <= 5) return "COMFORTABLE";
  if (n <= 8) return "EXPERIENCED";
  return "EXPERT";
}

/** Average genre readiness across the production's one/two genres. */
export function staffGenreMultiplier(s: Staff, genres: GenreId[]): number {
  if (!genres.length) return 1;
  return genres.reduce((sum, g) => sum + genreExperienceMultiplier(genreFamiliarity(s, g)), 0) / genres.length;
}

/** Employed Research Hounds accelerate the studio's research desk. */
export function staffResearchDurationMult(staff: Staff[]): number {
  const n = staff.filter((s) => hasTrait(s, "researcher")).length;
  return Math.max(0.76, 1 - Math.min(3, n) * 0.08);
}

/** Project-specific audience personalities only count if they actually shipped it. */
export function staffReleaseFanMult(staff: Staff[]): number {
  const gossip = staff.filter((s) => hasTrait(s, "gossip")).length;
  const publicists = staff.filter((s) => hasTrait(s, "publicist")).length;
  return Math.min(1.55, 1 + gossip * 0.10 + publicists * 0.15);
}

/** Networkers improve freelance terms only when assigned to that contract. */
export function contractCrewPayMult(staff: Staff[]): number {
  const n = staff.filter((s) => hasTrait(s, "networker")).length;
  return 1 + Math.min(3, n) * 0.15;
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
  if (hasTrait(s, "crunch")) cond = Math.max(0.92, cond);
  if (hasTrait(s, "reliable")) cond = Math.max(0.95, cond);

  let out = cond * staffGenreMultiplier(s, p.draft.genres);
  let pace = cond;
  let aura = 0;
  let xpMult = 1;

  /* traits — deliberately large enough that hiring personality matters */
  if (hasTrait(s, "perfectionist")) { out *= 1.30; pace *= 0.75; }
  if (hasTrait(s, "fast")) { pace *= 1.40; out *= 0.95; }
  if (hasTrait(s, "team")) aura += 0.12;
  if (hasTrait(s, "genius")) out *= 1.50;
  if (hasTrait(s, "fanatic") && s.favGenre && p.draft.genres.includes(s.favGenre)) out *= 1.65;
  if (hasTrait(s, "adapt") && (p.draft.season > 1 || !!p.draft.licensedIpId)) out *= 1.35;
  if (hasTrait(s, "movie") && p.draft.medium === "movie") out *= 1.40;
  if (hasTrait(s, "veteran") && (p.draft.franchiseKey || p.draft.season > 1)) out *= 1.25;
  if (hasTrait(s, "organizer")) aura += 0.10;
  if (hasTrait(s, "fixer") && p.issues > 0) out *= 1.30;
  if (hasTrait(s, "prodigy")) xpMult *= 1.50;
  if (hasTrait(s, "ensemble") && team.length >= 3) out *= 1.15;
  if (hasTrait(s, "lonewolf")) out *= team.length <= 2 ? 1.25 : team.length >= 4 ? 0.90 : 1;
  if (hasTrait(s, "closer") && ["sound", "post", "marketing"].includes(p.stage)) out *= 1.25;
  if (hasTrait(s, "starter") && ["concept", "preprod"].includes(p.stage)) out *= 1.25;
  if (hasTrait(s, "lorekeeper") && (!!p.draft.licensedIpId || !!p.draft.franchiseKey)) out *= 1.30;

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
        xpMult *= 1.75;
      } else out *= 1.03;
    }
    /* mentors boost every junior teammate's XP */
    if (hasTrait(mate, "mentor") && mate.level > s.level) xpMult *= 1.75;
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
export function studioProduction(heads: Heads, staff: Staff[], showrunner = ""): { speed: number; burnMult: number } {
  const pm = heads.production;
  const active = !!pm && staff.some((s) => s.id === pm);
  return { speed: (active ? 0.08 : 0) + (showrunner === "operations" ? 0.1 : 0), burnMult: (active ? 0.9 : 1) * (showrunner === "operations" ? 0.9 : 1) };
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

/* -------------------------------------------------- intensive development
 * Spend RD to advance an employee to EXACTLY the XP threshold of their next
 * career level. All stat growth flows through gainXp() — canonical +2 main /
 * +1 off per level — nothing is bumped manually. No cooldown (that is Timed
 * Training's job); the cost escalates with level so it stays a deliberate,
 * expensive choice. */
export const INTENSIVE_RD_BASE = 15;
export const INTENSIVE_RD_PER_LEVEL = 10;
export const intensiveRdCost = (level: number) => INTENSIVE_RD_BASE + level * INTENSIVE_RD_PER_LEVEL;

/** exactly the XP needed to cross into the next level, or null at max */
export function intensiveTargetXp(s: Staff): number | null {
  const xp = s.xp ?? XP_LEVELS[Math.max(0, Math.min(MAX_LEVEL, s.level) - 1)];
  if (s.level >= MAX_LEVEL || xp >= XP_LEVELS[s.level]) return null;
  return XP_LEVELS[s.level] - xp;
}

/** Preview the exact stable roll the normal XP path will use next level. */
export function intensiveGainFor(s: Staff): { story: number; art: number; sound: number } {
  return growthForLevel(s, Math.min(MAX_LEVEL, s.level + 1));
}

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

export function recordShow(s: Staff, title: string, score: number, week: number, genres: GenreId[] = []): Staff {
  const shows = [...(s.shows ?? []), { title, score, week }].slice(-20);
  const best = s.bestShow && s.bestShow.score >= score ? s.bestShow : { title, score };
  const genreExperience = { ...(s.genreExperience ?? {}) };
  for (const genre of new Set(genres)) genreExperience[genre] = genreShows(s, genre) + 1;
  return { ...s, shows, bestShow: best, genreExperience };
}
