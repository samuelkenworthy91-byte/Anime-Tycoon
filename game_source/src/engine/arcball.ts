/* ============================================================================
 * ARCBALL — optional inter-studio worker sport
 *
 * Arcball is deliberately a management side-loop, not an action game.
 * Production craft and Arcball talent are independent. Workers reuse their
 * existing portraits, stamina and creator-fan fields so the sport creates
 * meaningful staffing trade-offs without duplicating core systems.
 * ========================================================================== */
import {
  RIVAL_STUDIOS,
  ROLE_POINT,
  STAFF_STAT_CAP,
  WORKER_LOOKS,
  type PointType,
  type Staff,
} from "./data";
import { merchValueOf } from "./franchise";
import { bumpRivalry, type RivalStudio } from "./rivals";
import type { RunState } from "./state";
import { staffIsInjured } from "./staffAvailability";

export const ARCBALL_VERSION = 1;
export const ARCBALL_TEAM_SIZE = 5;
export const ARCBALL_REGISTERED_MAX = 8;
export const ARCBALL_MIN_OFFICE = 1;
export const ARCBALL_MIN_STAFF = 5;

export type ArcballStat = "pace" | "power" | "control" | "pass" | "awareness" | "finish";
export type ArcballPosition = "keeper" | "anchor" | "runner" | "creator" | "striker";
export type ArcballFormationId = "balanced" | "possession" | "attack" | "shutdown";
export type ArcballApproachId = "short" | "direct" | "press" | "counter";
export type ArcballIntensity = "calm" | "normal" | "push" | "allin";
export type ArcballInstruction = "none" | "feed" | "flanks" | "keep" | "press" | "drop";
export type ArcballMatchPhase = "kickoff" | "buildup" | "midfield" | "breakaway" | "chance" | "shot" | "goal" | "defence";

export const ARCBALL_STATS: ArcballStat[] = ["pace", "power", "control", "pass", "awareness", "finish"];
export const ARCBALL_POSITIONS: ArcballPosition[] = ["keeper", "anchor", "runner", "creator", "striker"];

export const ARCBALL_POSITION_LABEL: Record<ArcballPosition, string> = {
  keeper: "Keeper",
  anchor: "Anchor",
  runner: "Runner",
  creator: "Creator",
  striker: "Striker",
};

export const ARCBALL_FORMATIONS: Record<ArcballFormationId, { label: string; desc: string }> = {
  balanced: { label: "2-1-1 Balanced", desc: "No major weakness. Safe default shape." },
  possession: { label: "1-2-1 Possession", desc: "More control and passing, slightly less bite." },
  attack: { label: "1-1-2 Attack", desc: "Creates chances but leaves space behind." },
  shutdown: { label: "2-2-0 Shut Up Shop", desc: "Defensive shell. Harder to break down, harder to score." },
};

export const ARCBALL_APPROACHES: Record<ArcballApproachId, { label: string; desc: string }> = {
  short: { label: "Short Build", desc: "Control + passing. Patient possession." },
  direct: { label: "Direct", desc: "Power + pace + finishing. Lower control." },
  press: { label: "Press", desc: "Aggressive awareness and pressure. Higher fatigue." },
  counter: { label: "Counter", desc: "Absorb pressure, then release pace." },
};

export interface ArcballBaseProfile {
  potential: number;
  stats: Record<ArcballStat, number>;
  bestPosition: ArcballPosition;
  overall: number;
}

export interface ArcballPlayerProgress {
  boosts?: Partial<Record<ArcballStat, number>>;
  appearances: number;
  goals: number;
  assists: number;
  wins: number;
  playerOfMatch: number;
  arcballFans: number;
  /** Season-only counters reset each new league year; career totals above never reset. */
  seasonAppearances: number;
  seasonGoals: number;
  seasonAssists: number;
  seasonWins: number;
  seasonPlayerOfMatch: number;
  /** −3..+3 short-term confidence/form, earned through real match performance. */
  form: number;
  lastTrainingWeek?: number;
  /** Expensive private Arcball coaching can be bought once per player per season. */
  lastPrivateCoachingYear?: number;
}

export type ArcballCompetition = "league" | "cup";
export type ArcballCupRound = "quarterfinal" | "semifinal" | "final";

export interface ArcballFixture {
  id: string;
  seasonYear: number;
  round: number;
  week: number;
  homeId: string;
  awayId: string;
  competition?: ArcballCompetition;
  cupRound?: ArcballCupRound;
  homeScore?: number;
  awayScore?: number;
  resolvedBy?: "watch" | "instant" | "auto" | "rival";
}

export interface ArcballSeasonHistory {
  year: number;
  position: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  title: boolean;
}

export interface ArcballCupHistory {
  year: number;
  championId: string;
  playerWon: boolean;
}

export interface ArcballRecords {
  biggestWinMargin: number;
  biggestWinText: string;
  longestWinStreak: number;
  currentWinStreak: number;
  mostGoalsInMatch: number;
  mostGoalsText: string;
}

export interface ArcballMerchDrop {
  year: number;
  revenue: number;
  fanGain: number;
}

export type ArcballHonourId = "player_year" | "golden_scorer" | "playmaker" | "guardian" | "team_season";
export interface ArcballHonour {
  year: number;
  id: ArcballHonourId;
  staffId: string;
  name: string;
  productionPerk?: string;
}
export type ArcballSponsorId = "local" | "stream" | "prestige";
export type ArcballInvestmentId = "performance" | "medical" | "analytics" | "arena";

export interface ArcballState {
  version: 1;
  unlocked: boolean;
  seasonYear: number;
  tokens: number;
  registered: string[];
  lineup: Partial<Record<ArcballPosition, string>>;
  formation: ArcballFormationId;
  approach: ArcballApproachId;
  players: Record<string, ArcballPlayerProgress>;
  fixtures: ArcballFixture[];
  cupFixtures: ArcballFixture[];
  seasonPurchases: { tier1: number; tier2: number };
  championshipSpotlights: number;
  titles: number;
  cupTitles: number;
  history: ArcballSeasonHistory[];
  cupHistory: ArcballCupHistory[];
  records: ArcballRecords;
  merchDrops: ArcballMerchDrop[];
  honours: ArcballHonour[];
  /** Rival workers persist across seasons instead of being regenerated every match. */
  rivalRosters: Record<string, ArcballRivalPlayer[]>;
  sponsor: ArcballSponsorId | null;
  sponsorYear: number;
  /** Permanent, cash-funded Arcball infrastructure. Levels are 0..3. */
  investments: Record<ArcballInvestmentId, number>;
  /** One whole-squad high-performance camp can be funded per Arcball season. */
  campYear: number;
}

declare module "./state" {
  interface RunState {
    arcball?: ArcballState;
  }
}

export interface ArcballStanding {
  teamId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  gf: number;
  ga: number;
  gd: number;
  points: number;
}

export interface ArcballRivalPlayer {
  id: string;
  name: string;
  look: number;
  position: ArcballPosition;
  rating: number;
  potential?: number;
  age?: number;
  fans?: number;
  seasons?: number;
}

export interface ArcballPlayerMatchStat {
  goals: number;
  assists: number;
  shots: number;
  rating: number;
}

export interface ArcballMatchEvent {
  minute: number;
  text: string;
  kind: "goal" | "shot" | "defence" | "info";
  playerId?: string;
}

export interface ArcballMatchState {
  fixtureId: string;
  minute: number;
  homeScore: number;
  awayScore: number;
  playerIsHome: boolean;
  events: ArcballMatchEvent[];
  playerStats: Record<string, ArcballPlayerMatchStat>;
  effort: Record<string, number>;
  /** Match-day lineup can change independently of the saved default five. */
  lineup: Partial<Record<ArcballPosition, string>>;
  substitutionsUsed: number;
  subbedOutIds: string[];
  activePlayerId?: string;
  supportingPlayerId?: string;
  activeRivalName?: string;
  supportingRivalName?: string;
  lastPossession: "home" | "away" | null;
  phase: ArcballMatchPhase;
  homeShots: number;
  awayShots: number;
  homeOnTarget: number;
  awayOnTarget: number;
  homePossessionTicks: number;
  awayPossessionTicks: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** One rested team has a 1-in-5 injury risk per match. Fatigue raises this
 * toward a hard 45% ceiling so repeatedly fielding exhausted staff is dangerous. */
export function arcballInjuryChance(energies: number[], fatigueMitigation = 0): number {
  if (!energies.length) return 0;
  const fatiguePressure = energies.reduce((sum, energy) => sum + Math.max(0, 45 - energy) / 45, 0) / energies.length;
  const lowestEnergy = Math.min(...energies);
  const surcharge = (fatiguePressure * .16 + (lowestEnergy < 25 ? .08 : 0)) * (1 - clamp(fatigueMitigation, 0, .8));
  return clamp(.20 + surcharge, .20, .45);
}

export function arcballInjuryWeeks(energy: number, roll: number): number {
  const fatigueWeeks = energy < 20 ? 2 : energy < 35 ? 1 : 0;
  return Math.min(6, 2 + Math.floor(clamp(roll, 0, .999999) * 3) + fatigueWeeks);
}

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function seeded(seedText: string): () => number {
  let a = hash32(seedText) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const ratingWeights: Record<ArcballPosition, Partial<Record<ArcballStat, number>>> = {
  keeper: { awareness: .34, control: .24, power: .24, pass: .18 },
  anchor: { power: .30, awareness: .30, pass: .20, control: .20 },
  runner: { pace: .30, control: .25, awareness: .20, pass: .15, power: .10 },
  creator: { pass: .35, control: .30, awareness: .20, finish: .10, pace: .05 },
  striker: { finish: .40, pace: .25, control: .20, power: .10, awareness: .05 },
};

function positionRating(stats: Record<ArcballStat, number>, position: ArcballPosition): number {
  const weights = ratingWeights[position];
  return Math.round(ARCBALL_STATS.reduce((sum, stat) => sum + stats[stat] * (weights[stat] ?? 0), 0));
}

function bestPositionFor(stats: Record<ArcballStat, number>): { position: ArcballPosition; rating: number } {
  return ARCBALL_POSITIONS
    .map((position) => ({ position, rating: positionRating(stats, position) }))
    .sort((a, b) => b.rating - a.rating)[0];
}

export function arcballBaseProfile(staff: Pick<Staff, "id">): ArcballBaseProfile {
  const r = seeded("arcball-worker|" + staff.id);
  const potential = 32 + Math.floor(r() * 68);
  const stats = Object.fromEntries(ARCBALL_STATS.map((stat) => [stat, 24 + Math.floor(r() * 54)])) as Record<ArcballStat, number>;
  const spikeA = ARCBALL_STATS[Math.floor(r() * ARCBALL_STATS.length)];
  let spikeB = ARCBALL_STATS[Math.floor(r() * ARCBALL_STATS.length)];
  if (spikeB === spikeA) spikeB = ARCBALL_STATS[(ARCBALL_STATS.indexOf(spikeA) + 2) % ARCBALL_STATS.length];
  stats[spikeA] = clamp(stats[spikeA] + 12 + Math.floor(r() * 14), 1, 94);
  stats[spikeB] = clamp(stats[spikeB] + 8 + Math.floor(r() * 12), 1, 92);
  const best = bestPositionFor(stats);
  return { potential, stats, bestPosition: best.position, overall: best.rating };
}

export function arcballProfile(staff: Pick<Staff, "id">, progress?: ArcballPlayerProgress): ArcballBaseProfile {
  const base = arcballBaseProfile(staff);
  const stats = { ...base.stats };
  for (const stat of ARCBALL_STATS) stats[stat] = clamp(stats[stat] + (progress?.boosts?.[stat] ?? 0), 1, 99);
  const best = bestPositionFor(stats);
  return { potential: base.potential, stats, bestPosition: best.position, overall: best.rating };
}

export function arcballPotentialLabel(value: number): string {
  if (value >= 90) return "World Class";
  if (value >= 78) return "Elite";
  if (value >= 64) return "Promising";
  if (value >= 48) return "Useful";
  return "Limited";
}

export interface ArcballArchetype {
  id: string;
  label: string;
  desc: string;
  attack: number;
  defence: number;
  possession: number;
}
export function arcballArchetype(profile: ArcballBaseProfile): ArcballArchetype {
  const s = profile.stats;
  if (profile.bestPosition === "keeper") return s.pass + s.control >= s.power + s.awareness
    ? { id: "sweeper", label: "Sweeper Keeper", desc: "Starts attacks cleanly from the back.", attack: 0, defence: 1, possession: 3 }
    : { id: "stopper", label: "Shot Stopper", desc: "Built around awareness and physical saves.", attack: 0, defence: 4, possession: 0 };
  if (profile.bestPosition === "anchor") return s.pass >= s.power
    ? { id: "distributor", label: "Distributor", desc: "Turns defensive wins into clean possession.", attack: 0, defence: 2, possession: 3 }
    : { id: "wall", label: "Wall", desc: "Wins duels and protects the scoring lane.", attack: 0, defence: 5, possession: -1 };
  if (profile.bestPosition === "runner") return s.awareness + s.pass >= s.pace + s.control
    ? { id: "engine", label: "Engine", desc: "Links both halves and keeps the team moving.", attack: 1, defence: 2, possession: 2 }
    : { id: "sprinter", label: "Sprinter", desc: "Explodes into space and stretches the defence.", attack: 4, defence: 0, possession: -1 };
  if (profile.bestPosition === "creator") return s.pass >= s.control
    ? { id: "playmaker", label: "Playmaker", desc: "Creates chances through vision and passing.", attack: 2, defence: 0, possession: 5 }
    : { id: "dribbler", label: "Dribbler", desc: "Carries through pressure to break shape.", attack: 3, defence: 0, possession: 3 };
  return s.finish >= s.power
    ? { id: "poacher", label: "Poacher", desc: "Lives for the final movement and finish.", attack: 5, defence: -1, possession: 0 }
    : { id: "target", label: "Target Finisher", desc: "Holds defenders off and attacks direct service.", attack: 4, defence: 1, possession: -1 };
}

export type ArcballReadinessLabel = "EXCELLENT" | "GOOD" | "NORMAL" | "POOR";
export function arcballTrainingReadiness(staff: Pick<Staff, "id">, drillId: string, week: number): { label: ArcballReadinessLabel; gainMult: number; penaltyMult: number } {
  const r = seeded("arcball-readiness|" + staff.id + "|" + drillId + "|" + week);
  const roll = r();
  if (roll < .16) return { label: "EXCELLENT", gainMult: 1.34, penaltyMult: .35 };
  if (roll < .40) return { label: "GOOD", gainMult: 1.16, penaltyMult: .70 };
  if (roll < .82) return { label: "NORMAL", gainMult: 1, penaltyMult: 1 };
  return { label: "POOR", gainMult: .72, penaltyMult: 1.55 };
}

export const ARCBALL_SPONSORS: Record<ArcballSponsorId, { name: string; sign: number; win: number; top3: number; title: number; requirement: string }> = {
  local: { name: "Manga Mart", sign: 12_000, win: 1_500, top3: 8_000, title: 18_000, requirement: "Open to any league entrant." },
  stream: { name: "AniWave Stream", sign: 30_000, win: 3_000, top3: 22_000, title: 45_000, requirement: "Requires 25,000 studio fans." },
  prestige: { name: "Kirin Motion Systems", sign: 70_000, win: 6_000, top3: 45_000, title: 100_000, requirement: "Requires 1 Arcball title or 200,000 studio fans." },
};

export interface ArcballInvestmentDef {
  id: ArcballInvestmentId;
  name: string;
  desc: string;
  costs: readonly [number, number, number];
  effects: readonly [string, string, string];
}

/* Arcball is deliberately an expensive sport once the studio becomes wealthy.
 * These are permanent capital projects, not token rewards. Fully upgrading the
 * programme costs over £1bn, giving dynasty studios a serious cash sink. */
export const ARCBALL_INVESTMENTS: Record<ArcballInvestmentId, ArcballInvestmentDef> = {
  performance: {
    id: "performance",
    name: "High Performance Centre",
    desc: "Dedicated courts, motion capture and specialist coaches accelerate player development.",
    costs: [5_000_000, 25_000_000, 100_000_000],
    effects: ["Training gains ×1.12", "Training gains ×1.25", "Training gains ×1.40"],
  },
  medical: {
    id: "medical",
    name: "Sports Science & Medical Centre",
    desc: "Physios, load monitoring and rehabilitation reduce fatigue costs without removing Arcball's inherent injury risk.",
    costs: [10_000_000, 50_000_000, 200_000_000],
    effects: ["Match/training energy −5% · fatigue injury surcharge −15%", "Energy −10% · surcharge −30% · long injuries −1 week", "Energy −15% · surcharge −45% · long injuries −2 weeks"],
  },
  analytics: {
    id: "analytics",
    name: "Arcball Analytics Department",
    desc: "Video analysts and tactical modelling improve how effectively the five execute your chosen system.",
    costs: [8_000_000, 40_000_000, 150_000_000],
    effects: ["Team tactical strength +1.5", "Team tactical strength +3", "Team tactical strength +5"],
  },
  arena: {
    id: "arena",
    name: "Studio Arcball Arena",
    desc: "A purpose-built home venue turns sporting success into a much larger commercial and fan platform.",
    costs: [20_000_000, 100_000_000, 400_000_000],
    effects: ["Match fans / sponsors / merch ×1.15", "Commercial Arcball returns ×1.35", "Commercial Arcball returns ×1.65"],
  },
};

export interface ArcballClubEffects {
  trainingGainMult: number;
  energyCostMult: number;
  fatigueRiskMitigation: number;
  injuryWeeksReduction: number;
  tacticalBonus: number;
  commercialMult: number;
}

export function arcballClubEffects(state: Pick<ArcballState, "investments">): ArcballClubEffects {
  const performance = clamp(Math.floor(state.investments?.performance ?? 0), 0, 3);
  const medical = clamp(Math.floor(state.investments?.medical ?? 0), 0, 3);
  const analytics = clamp(Math.floor(state.investments?.analytics ?? 0), 0, 3);
  const arena = clamp(Math.floor(state.investments?.arena ?? 0), 0, 3);
  return {
    trainingGainMult: [1, 1.12, 1.25, 1.40][performance],
    energyCostMult: [1, .95, .90, .85][medical],
    fatigueRiskMitigation: [0, .15, .30, .45][medical],
    injuryWeeksReduction: [0, 0, 1, 2][medical],
    tacticalBonus: [0, 1.5, 3, 5][analytics],
    commercialMult: [1, 1.15, 1.35, 1.65][arena],
  };
}

export function arcballInvestmentQuote(run: RunState, id: ArcballInvestmentId): { level: number; nextLevel: number; cost: number | null; blockedReason: string | null } {
  const state = arcballStateOf(run);
  const def = ARCBALL_INVESTMENTS[id];
  const level = clamp(Math.floor(state.investments[id] ?? 0), 0, 3);
  const cost = level < 3 ? def.costs[level] : null;
  let blockedReason: string | null = null;
  if (!state.unlocked) blockedReason = "Enter the Arcball League first";
  else if (level >= 3) blockedReason = "MAX LEVEL";
  else if (cost !== null && run.cash < cost) blockedReason = "Needs £" + cost.toLocaleString("en-GB");
  return { level, nextLevel: Math.min(3, level + 1), cost, blockedReason };
}

export function purchaseArcballInvestment(run: RunState, id: ArcballInvestmentId): RunState | null {
  const quote = arcballInvestmentQuote(run, id);
  if (quote.blockedReason || quote.cost === null) return null;
  const state = arcballStateOf(run);
  const def = ARCBALL_INVESTMENTS[id];
  return {
    ...run,
    cash: run.cash - quote.cost,
    arcball: {
      ...state,
      investments: { ...state.investments, [id]: quote.nextLevel },
    },
    strategicSpend: [
      ...run.strategicSpend,
      { id: "arcball_invest_" + id + "_" + quote.nextLevel + "_" + run.week, label: def.name + " Lv" + quote.nextLevel, amount: quote.cost, week: run.week },
    ],
    notices: [...run.notices, "🏟️ ARCBALL INVESTMENT — " + def.name + " reaches Lv" + quote.nextLevel + " for £" + quote.cost.toLocaleString("en-GB") + ". " + def.effects[quote.nextLevel - 1] + "."].slice(-40),
  };
}

export const ARCBALL_CAMPS = [
  { tier: 1 as const, name: "National Performance Camp", cost: 10_000_000, gain: 1, stamina: 10 },
  { tier: 2 as const, name: "International Elite Camp", cost: 50_000_000, gain: 2, stamina: 18 },
  { tier: 3 as const, name: "World-Class Residency", cost: 150_000_000, gain: 3, stamina: 25 },
] as const;

function weakestTrainableArcballStat(member: Staff, progress: ArcballPlayerProgress): ArcballStat | null {
  const profile = arcballProfile(member, progress);
  const base = arcballBaseProfile(member);
  return [...ARCBALL_STATS]
    .filter((stat) => profile.stats[stat] < Math.min(99, Math.max(base.stats[stat], 55 + Math.round(base.potential * .45))))
    .sort((a, b) => profile.stats[a] - profile.stats[b] || a.localeCompare(b))[0] ?? null;
}

export function runArcballCamp(run: RunState, tier: 1 | 2 | 3): RunState | null {
  const state = arcballStateOf(run);
  const camp = ARCBALL_CAMPS.find((row) => row.tier === tier);
  if (!camp || !state.unlocked || state.campYear === state.seasonYear || run.cash < camp.cost) return null;
  const currentDay = run.day ?? run.week * 7;
  const participants = state.registered
    .map((id) => run.staff.find((member) => member.id === id))
    .filter((member): member is Staff => !!member && !staffIsInjured(member, currentDay));
  if (!participants.length) return null;
  const players = { ...state.players };
  const improved = new Set<string>();
  for (const member of participants) {
    const progress = ensurePlayerProgress(state, member.id);
    const stat = weakestTrainableArcballStat(member, progress);
    if (!stat) continue;
    const boosts = { ...(progress.boosts ?? {}) };
    boosts[stat] = (boosts[stat] ?? 0) + camp.gain;
    players[member.id] = { ...progress, boosts };
    improved.add(member.id);
  }
  return {
    ...run,
    cash: run.cash - camp.cost,
    staff: run.staff.map((member) => state.registered.includes(member.id) && !staffIsInjured(member, currentDay)
      ? { ...member, stamina: Math.min(100, member.stamina + camp.stamina) }
      : member),
    arcball: { ...state, players, campYear: state.seasonYear },
    strategicSpend: [
      ...run.strategicSpend,
      { id: "arcball_camp_" + state.seasonYear, label: camp.name, amount: camp.cost, week: run.week },
    ],
    notices: [...run.notices, "🌍 ARCBALL CAMP — " + camp.name + " costs £" + camp.cost.toLocaleString("en-GB") + ". " + improved.size + " players gain +" + camp.gain + " to their weakest trainable Arcball stat and recover +" + camp.stamina + " energy."].slice(-40),
  };
}

export function arcballPrivateCoachingQuote(run: RunState, staffId: string): { cost: number; blockedReason: string | null; stat: ArcballStat | null } {
  const state = arcballStateOf(run);
  const member = run.staff.find((staff) => staff.id === staffId);
  if (!member) return { cost: 0, blockedReason: "No such worker", stat: null };
  const progress = ensurePlayerProgress(state, staffId);
  const profile = arcballProfile(member, progress);
  const cost = Math.round((8_000_000 + Math.max(0, profile.overall - 55) * 350_000) / 500_000) * 500_000;
  const stat = weakestTrainableArcballStat(member, progress);
  let blockedReason: string | null = null;
  if (!state.unlocked || !state.registered.includes(staffId)) blockedReason = "Register this worker first";
  else if (staffIsInjured(member, run.day ?? run.week * 7)) blockedReason = "Worker is injured";
  else if (progress.lastPrivateCoachingYear === state.seasonYear) blockedReason = "Private coaching already used this season";
  else if (!stat) blockedReason = "Player has reached their current training ceiling";
  else if (run.cash < cost) blockedReason = "Needs £" + cost.toLocaleString("en-GB");
  return { cost, blockedReason, stat };
}

export function runArcballPrivateCoaching(run: RunState, staffId: string): RunState | null {
  const quote = arcballPrivateCoachingQuote(run, staffId);
  if (quote.blockedReason || !quote.stat) return null;
  const state = arcballStateOf(run);
  const member = run.staff.find((staff) => staff.id === staffId)!;
  const progress = ensurePlayerProgress(state, staffId);
  const boosts = { ...(progress.boosts ?? {}) };
  boosts[quote.stat] = (boosts[quote.stat] ?? 0) + 2;
  return {
    ...run,
    cash: run.cash - quote.cost,
    arcball: {
      ...state,
      players: { ...state.players, [staffId]: { ...progress, boosts, lastPrivateCoachingYear: state.seasonYear } },
    },
    strategicSpend: [
      ...run.strategicSpend,
      { id: "arcball_private_" + staffId + "_" + state.seasonYear, label: "Private Arcball coaching — " + member.name, amount: quote.cost, week: run.week },
    ],
    notices: [...run.notices, "🎯 PRIVATE ARCBALL COACHING — " + member.name + " gains +2 " + quote.stat.toUpperCase() + " for £" + quote.cost.toLocaleString("en-GB") + "."].slice(-40),
  };
}

export function arcballSponsorBlock(run: RunState, id: ArcballSponsorId): string | null {
  const state = arcballStateOf(run);
  if (state.sponsor && state.sponsorYear === state.seasonYear) return "Sponsor already signed for this season";
  if (id === "stream" && run.fans < 25_000) return "Requires 25,000 studio fans";
  if (id === "prestige" && state.titles < 1 && run.fans < 200_000) return "Requires an Arcball title or 200,000 studio fans";
  return null;
}

export function signArcballSponsor(run: RunState, id: ArcballSponsorId): RunState | null {
  const block = arcballSponsorBlock(run, id);
  if (block) return null;
  const state = arcballStateOf(run);
  const sponsor = ARCBALL_SPONSORS[id];
  return {
    ...run,
    cash: run.cash + sponsor.sign,
    incomeThisWeek: (run.incomeThisWeek ?? 0) + sponsor.sign,
    arcball: { ...state, sponsor: id, sponsorYear: state.seasonYear },
    notices: [...run.notices, "🤝 ARCBALL SPONSOR — " + sponsor.name + " signs for Year " + state.seasonYear + " (+" + sponsor.sign.toLocaleString("en-GB") + " upfront)."].slice(-40),
  };
}

function freshProgress(): ArcballPlayerProgress {
  return {
    boosts: {},
    appearances: 0, goals: 0, assists: 0, wins: 0, playerOfMatch: 0, arcballFans: 0,
    seasonAppearances: 0, seasonGoals: 0, seasonAssists: 0, seasonWins: 0, seasonPlayerOfMatch: 0,
    form: 0,
  };
}

function yearOfWeek(week: number) {
  return Math.floor(Math.max(0, week) / 48) + 1;
}

function fixtureId(year: number, round: number, home: string, away: string) {
  return "arc_y" + year + "_r" + round + "_" + hash32(home + "|" + away).toString(36);
}

export function buildArcballFixtures(year: number): ArcballFixture[] {
  const baseTeams = ["player", ...RIVAL_STUDIOS];
  const teams = [...baseTeams, "__bye"];
  const firstHalf: ArcballFixture[] = [];
  let ring = [...teams];
  for (let round = 0; round < 7; round += 1) {
    const week = (year - 1) * 48 + 2 + Math.round((round * 21.5) / 6);
    for (let i = 0; i < ring.length / 2; i += 1) {
      let a = ring[i];
      let b = ring[ring.length - 1 - i];
      if (a === "__bye" || b === "__bye") continue;
      if ((round + i) % 2 === 1) [a, b] = [b, a];
      firstHalf.push({ id: fixtureId(year, round, a, b), seasonYear: year, round, week, homeId: a, awayId: b });
    }
    ring = [ring[0], ring[ring.length - 1], ...ring.slice(1, -1)];
  }
  const secondHalf = firstHalf.map((f) => {
    const round = f.round + 7;
    const week = (year - 1) * 48 + 25 + Math.round((f.round * 20) / 6);
    return { ...f, id: fixtureId(year, round, f.awayId, f.homeId), round, week, homeId: f.awayId, awayId: f.homeId };
  });
  return [...firstHalf, ...secondHalf].sort((a, b) => a.week - b.week || a.round - b.round || a.id.localeCompare(b.id));
}

function cupFixtureId(year: number, round: ArcballCupRound, index: number, home: string, away: string) {
  return "arc_cup_y" + year + "_" + round + "_" + index + "_" + hash32(home + "|" + away).toString(36);
}

function shuffledCupTeams(year: number): string[] {
  const teams = ["player", ...RIVAL_STUDIOS];
  const rng = seeded("arcball-cup-draw|" + year);
  for (let i = teams.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }
  return teams;
}

export function buildArcballCupFixtures(year: number): ArcballFixture[] {
  const teams = shuffledCupTeams(year);
  const base = (year - 1) * 48;
  const entrants = teams.slice(1); // one deterministic bye into the semi-finals
  const fixtures: ArcballFixture[] = [];
  for (let i = 0; i < 3; i += 1) {
    fixtures.push({
      id: cupFixtureId(year, "quarterfinal", i, entrants[i * 2], entrants[i * 2 + 1]),
      seasonYear: year,
      round: 100 + i,
      week: base + 10,
      homeId: entrants[i * 2],
      awayId: entrants[i * 2 + 1],
      competition: "cup",
      cupRound: "quarterfinal",
    });
  }
  return fixtures;
}

function cupFixtureWinner(fixture: ArcballFixture): string | null {
  if (fixture.homeScore === undefined || fixture.awayScore === undefined || fixture.homeScore === fixture.awayScore) return null;
  return fixture.homeScore > fixture.awayScore ? fixture.homeId : fixture.awayId;
}

function ensureArcballCupRounds(state: ArcballState): ArcballState {
  const fixtures = [...state.cupFixtures];
  const quarters = fixtures.filter((f) => f.cupRound === "quarterfinal");
  const semis = fixtures.filter((f) => f.cupRound === "semifinal");
  const finals = fixtures.filter((f) => f.cupRound === "final");
  const base = (state.seasonYear - 1) * 48;

  if (quarters.length === 3 && quarters.every((f) => cupFixtureWinner(f)) && semis.length === 0) {
    const quarterTeams = new Set(quarters.flatMap((f) => [f.homeId, f.awayId]));
    const bye = ["player", ...RIVAL_STUDIOS].find((id) => !quarterTeams.has(id));
    const winners = quarters.map((f) => cupFixtureWinner(f)!).filter(Boolean);
    const teams = [bye, ...winners].filter((id): id is string => !!id);
    const rng = seeded("arcball-cup-semi|" + state.seasonYear);
    if (rng() < .5) [teams[1], teams[2]] = [teams[2], teams[1]];
    for (let i = 0; i < 2; i += 1) {
      const home = teams[i * 2];
      const away = teams[i * 2 + 1];
      fixtures.push({
        id: cupFixtureId(state.seasonYear, "semifinal", i, home, away),
        seasonYear: state.seasonYear,
        round: 110 + i,
        week: base + 29,
        homeId: home,
        awayId: away,
        competition: "cup",
        cupRound: "semifinal",
      });
    }
  }

  const updatedSemis = fixtures.filter((f) => f.cupRound === "semifinal");
  if (updatedSemis.length === 2 && updatedSemis.every((f) => cupFixtureWinner(f)) && finals.length === 0) {
    const finalists = updatedSemis.map((f) => cupFixtureWinner(f)!).filter(Boolean);
    fixtures.push({
      id: cupFixtureId(state.seasonYear, "final", 0, finalists[0], finalists[1]),
      seasonYear: state.seasonYear,
      round: 120,
      week: base + 43,
      homeId: finalists[0],
      awayId: finalists[1],
      competition: "cup",
      cupRound: "final",
    });
  }
  return { ...state, cupFixtures: fixtures };
}

function arcballFixtureById(state: ArcballState, fixtureId: string): ArcballFixture | undefined {
  return state.fixtures.find((f) => f.id === fixtureId) ?? state.cupFixtures.find((f) => f.id === fixtureId);
}

function playerArcballFixtures(state: ArcballState): ArcballFixture[] {
  return [...state.fixtures, ...state.cupFixtures]
    .filter((f) => f.homeId === "player" || f.awayId === "player")
    .sort((a, b) => a.week - b.week || a.round - b.round || a.id.localeCompare(b.id));
}

export function initialArcballState(week: number): ArcballState {
  const seasonYear = yearOfWeek(week);
  return {
    version: ARCBALL_VERSION,
    unlocked: false,
    seasonYear,
    tokens: 0,
    registered: [],
    lineup: {},
    formation: "balanced",
    approach: "short",
    players: {},
    fixtures: buildArcballFixtures(seasonYear),
    cupFixtures: buildArcballCupFixtures(seasonYear),
    seasonPurchases: { tier1: 0, tier2: 0 },
    championshipSpotlights: 0,
    titles: 0,
    cupTitles: 0,
    history: [],
    cupHistory: [],
    records: { biggestWinMargin: 0, biggestWinText: "—", longestWinStreak: 0, currentWinStreak: 0, mostGoalsInMatch: 0, mostGoalsText: "—" },
    merchDrops: [],
    honours: [],
    rivalRosters: {},
    sponsor: null,
    sponsorYear: 0,
    investments: { performance: 0, medical: 0, analytics: 0, arena: 0 },
    campYear: 0,
  };
}

export function migrateArcballState(raw: unknown, week: number): ArcballState {
  const fresh = initialArcballState(week);
  if (!raw || typeof raw !== "object") return fresh;
  const r = raw as Partial<ArcballState>;
  const seasonYear = typeof r.seasonYear === "number" && r.seasonYear > 0 ? Math.floor(r.seasonYear) : fresh.seasonYear;
  const positions = new Set(ARCBALL_POSITIONS);
  const lineup: Partial<Record<ArcballPosition, string>> = {};
  if (r.lineup && typeof r.lineup === "object") {
    for (const [key, value] of Object.entries(r.lineup)) {
      if (positions.has(key as ArcballPosition) && typeof value === "string") lineup[key as ArcballPosition] = value;
    }
  }
  const players: Record<string, ArcballPlayerProgress> = {};
  if (r.players && typeof r.players === "object") {
    for (const [id, value] of Object.entries(r.players)) {
      if (!value || typeof value !== "object") continue;
      const p = value as Partial<ArcballPlayerProgress>;
      players[id] = {
        boosts: p.boosts && typeof p.boosts === "object" ? { ...p.boosts } : {},
        appearances: Math.max(0, Math.floor(p.appearances ?? 0)),
        goals: Math.max(0, Math.floor(p.goals ?? 0)),
        assists: Math.max(0, Math.floor(p.assists ?? 0)),
        wins: Math.max(0, Math.floor(p.wins ?? 0)),
        playerOfMatch: Math.max(0, Math.floor(p.playerOfMatch ?? 0)),
        arcballFans: Math.max(0, Math.floor(p.arcballFans ?? 0)),
        seasonAppearances: Math.max(0, Math.floor(p.seasonAppearances ?? 0)),
        seasonGoals: Math.max(0, Math.floor(p.seasonGoals ?? 0)),
        seasonAssists: Math.max(0, Math.floor(p.seasonAssists ?? 0)),
        seasonWins: Math.max(0, Math.floor(p.seasonWins ?? 0)),
        seasonPlayerOfMatch: Math.max(0, Math.floor(p.seasonPlayerOfMatch ?? 0)),
        form: clamp(Math.round(p.form ?? 0), -3, 3),
        lastTrainingWeek: typeof p.lastTrainingWeek === "number" ? p.lastTrainingWeek : undefined,
        lastPrivateCoachingYear: typeof p.lastPrivateCoachingYear === "number" ? p.lastPrivateCoachingYear : undefined,
      };
    }
  }
  return {
    version: ARCBALL_VERSION,
    unlocked: !!r.unlocked,
    seasonYear,
    tokens: Math.max(0, Math.floor(r.tokens ?? 0)),
    registered: Array.isArray(r.registered) ? [...new Set(r.registered.filter((x): x is string => typeof x === "string"))].slice(0, ARCBALL_REGISTERED_MAX) : [],
    lineup,
    formation: r.formation && r.formation in ARCBALL_FORMATIONS ? r.formation : "balanced",
    approach: r.approach && r.approach in ARCBALL_APPROACHES ? r.approach : "short",
    players,
    fixtures: Array.isArray(r.fixtures) && r.fixtures.length ? r.fixtures.map((f) => ({ ...f, competition: f.competition ?? "league" })) : buildArcballFixtures(seasonYear),
    cupFixtures: Array.isArray(r.cupFixtures) && r.cupFixtures.length ? r.cupFixtures.map((f) => ({ ...f, competition: "cup" })) : buildArcballCupFixtures(seasonYear),
    seasonPurchases: {
      tier1: Math.max(0, Math.floor(r.seasonPurchases?.tier1 ?? 0)),
      tier2: Math.max(0, Math.floor(r.seasonPurchases?.tier2 ?? 0)),
    },
    championshipSpotlights: Math.max(0, Math.floor(r.championshipSpotlights ?? 0)),
    titles: Math.max(0, Math.floor(r.titles ?? 0)),
    cupTitles: Math.max(0, Math.floor(r.cupTitles ?? 0)),
    history: Array.isArray(r.history) ? r.history.slice(-30).map((h) => ({ ...h })) : [],
    cupHistory: Array.isArray(r.cupHistory) ? r.cupHistory.slice(-30).map((h) => ({ ...h })) : [],
    records: {
      biggestWinMargin: Math.max(0, Math.floor(r.records?.biggestWinMargin ?? 0)),
      biggestWinText: typeof r.records?.biggestWinText === "string" ? r.records.biggestWinText : "—",
      longestWinStreak: Math.max(0, Math.floor(r.records?.longestWinStreak ?? 0)),
      currentWinStreak: Math.max(0, Math.floor(r.records?.currentWinStreak ?? 0)),
      mostGoalsInMatch: Math.max(0, Math.floor(r.records?.mostGoalsInMatch ?? 0)),
      mostGoalsText: typeof r.records?.mostGoalsText === "string" ? r.records.mostGoalsText : "—",
    },
    merchDrops: Array.isArray(r.merchDrops) ? r.merchDrops.slice(-30).map((drop) => ({ ...drop })) : [],
    honours: Array.isArray(r.honours) ? r.honours.slice(-100).map((h) => ({ ...h })) : [],
    rivalRosters: r.rivalRosters && typeof r.rivalRosters === "object"
      ? Object.fromEntries(Object.entries(r.rivalRosters).map(([id, roster]) => [id, Array.isArray(roster) ? roster.map((p) => ({ ...p })) : []]))
      : {},
    sponsor: r.sponsor === "local" || r.sponsor === "stream" || r.sponsor === "prestige" ? r.sponsor : null,
    sponsorYear: Math.max(0, Math.floor(r.sponsorYear ?? 0)),
    investments: {
      performance: clamp(Math.floor(r.investments?.performance ?? 0), 0, 3),
      medical: clamp(Math.floor(r.investments?.medical ?? 0), 0, 3),
      analytics: clamp(Math.floor(r.investments?.analytics ?? 0), 0, 3),
      arena: clamp(Math.floor(r.investments?.arena ?? 0), 0, 3),
    },
    campYear: Math.max(0, Math.floor(r.campYear ?? 0)),
  };
}

export function arcballStateOf(run: Pick<RunState, "arcball" | "week">): ArcballState {
  return migrateArcballState(run.arcball, run.week);
}

export function arcballUnlockReason(run: Pick<RunState, "officeLevel" | "staff">): string | null {
  if (run.officeLevel < ARCBALL_MIN_OFFICE) return "Move into the Anime Runner Building first";
  if (run.staff.length < ARCBALL_MIN_STAFF) return "Arcball needs five employees on the books";
  return null;
}

function ensurePlayerProgress(state: ArcballState, staffId: string): ArcballPlayerProgress {
  return state.players[staffId] ?? freshProgress();
}

function buildBestLineup(staff: Staff[], state: ArcballState, registered: string[]): Partial<Record<ArcballPosition, string>> {
  const remaining = new Set(registered.filter((id) => staff.some((s) => s.id === id)));
  const lineup: Partial<Record<ArcballPosition, string>> = {};
  for (const position of ARCBALL_POSITIONS) {
    const pick = staff
      .filter((s) => remaining.has(s.id))
      .map((s) => ({ id: s.id, rating: positionRating(arcballProfile(s, state.players[s.id]).stats, position) }))
      .sort((a, b) => b.rating - a.rating)[0];
    if (!pick) continue;
    lineup[position] = pick.id;
    remaining.delete(pick.id);
  }
  return lineup;
}

export function activateArcball(run: RunState): RunState | null {
  const block = arcballUnlockReason(run);
  if (block) return null;
  let state = arcballStateOf(run);
  if (state.seasonYear !== yearOfWeek(run.week)) state = initialArcballState(run.week);
  const ranked = [...run.staff]
    .map((s) => ({ id: s.id, rating: arcballProfile(s, state.players[s.id]).overall }))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, ARCBALL_REGISTERED_MAX)
    .map((x) => x.id);
  const registered = [...new Set([...state.registered.filter((id) => run.staff.some((s) => s.id === id)), ...ranked])].slice(0, ARCBALL_REGISTERED_MAX);
  const players = { ...state.players };
  for (const id of registered) players[id] = players[id] ?? freshProgress();
  state = {
    ...state,
    unlocked: true,
    registered,
    players,
    lineup: Object.keys(state.lineup).length >= ARCBALL_TEAM_SIZE ? state.lineup : buildBestLineup(run.staff, { ...state, players }, registered),
  };
  state = ensureArcballRivalRosters(run, state);
  return {
    ...run,
    arcball: state,
    notices: [...run.notices, "⚽ ARCBALL LEAGUE UNLOCKED — register your workers, set a five-person side and manage the studio team."].slice(-40),
  };
}

function cleanArcballRoster(run: RunState, state: ArcballState): ArcballState {
  const ids = new Set(run.staff.map((s) => s.id));
  const registered = state.registered.filter((id) => ids.has(id)).slice(0, ARCBALL_REGISTERED_MAX);
  const lineup: Partial<Record<ArcballPosition, string>> = {};
  for (const position of ARCBALL_POSITIONS) {
    const id = state.lineup[position];
    if (id && ids.has(id) && registered.includes(id)) lineup[position] = id;
  }
  return { ...state, registered, lineup };
}

export function registerArcballPlayer(run: RunState, staffId: string): RunState | null {
  let state = cleanArcballRoster(run, arcballStateOf(run));
  if (!state.unlocked || !run.staff.some((s) => s.id === staffId)) return null;
  if (state.registered.includes(staffId)) {
    const registered = state.registered.filter((id) => id !== staffId);
    const lineup = { ...state.lineup };
    for (const pos of ARCBALL_POSITIONS) if (lineup[pos] === staffId) delete lineup[pos];
    return { ...run, arcball: { ...state, registered, lineup } };
  }
  if (state.registered.length >= ARCBALL_REGISTERED_MAX) return null;
  return {
    ...run,
    arcball: {
      ...state,
      registered: [...state.registered, staffId],
      players: { ...state.players, [staffId]: state.players[staffId] ?? freshProgress() },
    },
  };
}

export function setArcballLineup(run: RunState, position: ArcballPosition, staffId: string | null): RunState | null {
  let state = cleanArcballRoster(run, arcballStateOf(run));
  if (!state.unlocked) return null;
  if (staffId && !state.registered.includes(staffId)) return null;
  if (staffId) {
    const member = run.staff.find((staff) => staff.id === staffId);
    if (!member || staffIsInjured(member, run.day ?? run.week * 7)) return null;
  }
  const lineup = { ...state.lineup };
  if (staffId) {
    for (const pos of ARCBALL_POSITIONS) if (lineup[pos] === staffId) delete lineup[pos];
    lineup[position] = staffId;
  } else {
    delete lineup[position];
  }
  return { ...run, arcball: { ...state, lineup } };
}

export function setArcballTactics(run: RunState, formation: ArcballFormationId, approach: ArcballApproachId): RunState {
  const state = arcballStateOf(run);
  return { ...run, arcball: { ...state, formation, approach } };
}

export function arcballLineupStaff(run: RunState, lineupOverride?: Partial<Record<ArcballPosition, string>>): Staff[] {
  const state = cleanArcballRoster(run, arcballStateOf(run));
  const lineup = lineupOverride ?? state.lineup;
  const day = run.day ?? run.week * 7;
  return ARCBALL_POSITIONS
    .map((position) => run.staff.find((s) => s.id === lineup[position]))
    .filter((s): s is Staff => !!s && !staffIsInjured(s, day));
}

export function arcballReady(run: RunState): boolean {
  return arcballStateOf(run).unlocked && arcballLineupStaff(run).length === ARCBALL_TEAM_SIZE;
}

const rivalFirst = ["Akira", "Mika", "Jun", "Sora", "Rin", "Kei", "Mio", "Ren", "Yuna", "Haru", "Niko", "Ami", "Tomo", "Kira", "Ryo", "Emi"];
const rivalLast = ["Sato", "Ito", "Mori", "Tanaka", "Park", "Khan", "Price", "Bell", "Nakamura", "Suzuki", "Hughes", "Kim", "Arai", "Jones", "Miller", "Chen"];

function generateRivalArcballRoster(studio: RivalStudio, year: number): ArcballRivalPlayer[] {
  const r = seeded("arcball-rival-career|" + studio.id + "|" + year);
  const base = 38 + studio.tier * 6 + studio.reputation * .12 + Math.min(12, (year - 1) * .65);
  return ARCBALL_POSITIONS.map((position, index) => {
    const rating = clamp(Math.round(base - 10 + r() * 20 + (position === "creator" && studio.persona === "experimental" ? 4 : 0)), 30, 94);
    return {
      id: "rival|" + studio.id + "|" + year + "|" + index,
      name: rivalFirst[Math.floor(r() * rivalFirst.length)] + " " + rivalLast[Math.floor(r() * rivalLast.length)],
      look: Math.floor(r() * Math.max(1, WORKER_LOOKS.length)),
      position,
      rating,
      potential: clamp(rating + 4 + Math.floor(r() * 22), rating, 99),
      age: 19 + Math.floor(r() * 12),
      fans: Math.max(500, Math.round((rating - 25) * 550 + r() * 12_000)),
      seasons: 0,
    };
  });
}

export function rivalArcballRoster(studio: RivalStudio, year: number, persistent?: ArcballRivalPlayer[]): ArcballRivalPlayer[] {
  return persistent?.length ? persistent : generateRivalArcballRoster(studio, year);
}

function ensureArcballRivalRosters(run: RunState, state: ArcballState): ArcballState {
  const rivalRosters = { ...state.rivalRosters };
  for (const studio of run.rivalWorld.studios) {
    if (!rivalRosters[studio.id]?.length) rivalRosters[studio.id] = generateRivalArcballRoster(studio, state.seasonYear);
  }
  return { ...state, rivalRosters };
}

function evolveArcballRivalRosters(run: RunState, state: ArcballState, newYear: number): ArcballState {
  const rivalRosters: Record<string, ArcballRivalPlayer[]> = {};
  for (const studio of run.rivalWorld.studios) {
    const prior = state.rivalRosters[studio.id]?.length ? state.rivalRosters[studio.id] : generateRivalArcballRoster(studio, state.seasonYear);
    const evolved = prior.map((player, index) => {
      const r = seeded("arcball-rival-evolve|" + player.id + "|" + newYear);
      const age = (player.age ?? 24) + 1;
      const potential = player.potential ?? Math.min(99, player.rating + 10);
      const development = age <= 27 ? Math.max(0, Math.round((potential - player.rating) * (.10 + r() * .12))) : 0;
      const decline = age >= 32 ? 1 + Math.floor(r() * Math.max(1, age - 30)) : 0;
      return {
        ...player,
        age,
        rating: clamp(player.rating + development - decline, 30, 99),
        fans: Math.max(0, Math.round((player.fans ?? 0) * 1.08 + player.rating * 120)),
        seasons: (player.seasons ?? 0) + 1,
        position: player.position ?? ARCBALL_POSITIONS[index % ARCBALL_POSITIONS.length],
      };
    });
    rivalRosters[studio.id] = ARCBALL_POSITIONS.map((position, index) => {
      const veteran = evolved.find((player) => player.position === position);
      if (veteran && (veteran.age ?? 24) <= 36) return veteran;
      return generateRivalArcballRoster(studio, newYear)[index];
    });
  }
  return { ...state, rivalRosters };
}

interface TeamNumbers { attack: number; defence: number; possession: number; }

function playerTeamNumbers(run: RunState, intensity: ArcballIntensity = "normal", instruction: ArcballInstruction = "none", lineupOverride?: Partial<Record<ArcballPosition, string>>): TeamNumbers {
  const state = arcballStateOf(run);
  const lineup = lineupOverride ?? state.lineup;
  const byPosition = Object.fromEntries(ARCBALL_POSITIONS.map((position) => {
    const member = run.staff.find((s) => s.id === lineup[position]);
    if (!member) return [position, null];
    const profile = arcballProfile(member, state.players[member.id]);
    return [position, { member, profile }];
  })) as Record<ArcballPosition, { member: Staff; profile: ArcballBaseProfile } | null>;
  const values = ARCBALL_POSITIONS.map((position) => {
    const row = byPosition[position];
    if (!row) return 20;
    const form = state.players[row.member.id]?.form ?? 0;
    return positionRating(row.profile.stats, position) + form * 1.4;
  });
  let attack = values[4] * .38 + values[3] * .25 + values[2] * .18 + values[1] * .11 + values[0] * .08;
  let defence = values[0] * .35 + values[1] * .30 + values[2] * .18 + values[3] * .10 + values[4] * .07;
  let possession = values[3] * .34 + values[2] * .28 + values[1] * .18 + values[4] * .12 + values[0] * .08;

  /* Archetypes alter how similarly-rated workers actually play. */
  for (const position of ARCBALL_POSITIONS) {
    const row = byPosition[position];
    if (!row) continue;
    const archetype = arcballArchetype(row.profile);
    attack += archetype.attack * .55;
    defence += archetype.defence * .55;
    possession += archetype.possession * .55;
  }

  const formation = state.formation;
  if (formation === "possession") { possession += 7; attack -= 1; defence -= 1; }
  if (formation === "attack") { attack += 8; defence -= 6; possession += 1; }
  if (formation === "shutdown") { defence += 9; attack -= 7; possession -= 2; }

  if (state.approach === "short") { possession += 6; attack += 1; }
  if (state.approach === "direct") { attack += 6; possession -= 5; }
  if (state.approach === "press") { defence += 5; possession += 4; }
  if (state.approach === "counter") { defence += 2; attack += 4; possession -= 2; }

  if (intensity === "calm") { attack -= 3; defence += 1; }
  if (intensity === "push") { attack += 5; possession += 2; defence -= 1; }
  if (intensity === "allin") { attack += 10; possession += 3; defence -= 5; }

  if (instruction === "feed") attack += 4;
  if (instruction === "flanks") { attack += 3; possession += 2; }
  if (instruction === "keep") { possession += 7; attack -= 2; }
  if (instruction === "press") { defence += 5; possession += 3; }
  if (instruction === "drop") { defence += 8; attack -= 6; possession -= 2; }

  const tacticalBonus = arcballClubEffects(state).tacticalBonus;
  attack += tacticalBonus;
  defence += tacticalBonus;
  possession += tacticalBonus;

  return { attack, defence, possession };
}

function rivalTeamNumbers(studio: RivalStudio, year: number, persistent?: ArcballRivalPlayer[]): TeamNumbers {
  const roster = rivalArcballRoster(studio, year, persistent);
  const byPos = Object.fromEntries(roster.map((p) => [p.position, p.rating])) as Record<ArcballPosition, number>;
  return {
    attack: byPos.striker * .40 + byPos.creator * .27 + byPos.runner * .18 + byPos.anchor * .10 + byPos.keeper * .05,
    defence: byPos.keeper * .36 + byPos.anchor * .30 + byPos.runner * .18 + byPos.creator * .10 + byPos.striker * .06,
    possession: byPos.creator * .34 + byPos.runner * .27 + byPos.anchor * .19 + byPos.striker * .12 + byPos.keeper * .08,
  };
}

export function arcballStandings(run: RunState): ArcballStanding[] {
  const state = arcballStateOf(run);
  const teams = ["player", ...RIVAL_STUDIOS];
  const rows = Object.fromEntries(teams.map((teamId) => [teamId, { teamId, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0, gd: 0, points: 0 }])) as Record<string, ArcballStanding>;
  for (const fixture of state.fixtures) {
    if (fixture.homeScore === undefined || fixture.awayScore === undefined) continue;
    const h = rows[fixture.homeId];
    const a = rows[fixture.awayId];
    if (!h || !a) continue;
    h.played += 1; a.played += 1;
    h.gf += fixture.homeScore; h.ga += fixture.awayScore;
    a.gf += fixture.awayScore; a.ga += fixture.homeScore;
    if (fixture.homeScore > fixture.awayScore) { h.wins += 1; a.losses += 1; h.points += 3; }
    else if (fixture.homeScore < fixture.awayScore) { a.wins += 1; h.losses += 1; a.points += 3; }
    else { h.draws += 1; a.draws += 1; h.points += 1; a.points += 1; }
  }
  for (const row of Object.values(rows)) row.gd = row.gf - row.ga;
  return Object.values(rows).sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.teamId.localeCompare(b.teamId));
}

export function arcballTeamName(run: Pick<RunState, "studio">, teamId: string): string {
  return teamId === "player" ? run.studio : teamId;
}

export function nextArcballFixture(run: RunState): ArcballFixture | null {
  const state = ensureArcballCupRounds(arcballStateOf(run));
  return playerArcballFixtures(state).find((f) => f.homeScore === undefined) ?? null;
}

export function playableArcballFixture(run: RunState): ArcballFixture | null {
  if (!arcballReady(run)) return null;
  const state = ensureArcballCupRounds(arcballStateOf(run));
  return playerArcballFixtures(state).find((f) => f.homeScore === undefined && f.week <= run.week) ?? null;
}

function pickWeighted<T>(rows: { item: T; weight: number }[], roll: number): T {
  const total = rows.reduce((sum, row) => sum + Math.max(.01, row.weight), 0);
  let cursor = roll * total;
  for (const row of rows) {
    cursor -= Math.max(.01, row.weight);
    if (cursor <= 0) return row.item;
  }
  return rows[rows.length - 1].item;
}

function playerAttackPick(run: RunState, roll: number, instruction: ArcballInstruction, lineupOverride?: Partial<Record<ArcballPosition, string>>): Staff {
  const state = arcballStateOf(run);
  const lineup = lineupOverride ?? state.lineup;
  const rows = ARCBALL_POSITIONS.flatMap((position) => {
    const member = run.staff.find((s) => s.id === lineup[position]);
    if (!member) return [];
    const profile = arcballProfile(member, state.players[member.id]);
    let weight = position === "striker" ? profile.stats.finish * 1.6 : position === "creator" ? profile.stats.control * 1.25 : position === "runner" ? profile.stats.pace : profile.overall * .65;
    if (instruction === "feed" && position === "striker") weight *= 1.8;
    if (instruction === "flanks" && position === "runner") weight *= 1.6;
    return [{ item: member, weight }];
  });
  return pickWeighted(rows, roll);
}

function rivalAttackPick(roster: ArcballRivalPlayer[], roll: number): ArcballRivalPlayer {
  return pickWeighted(roster.map((p) => ({ item: p, weight: p.rating * (p.position === "striker" ? 1.6 : p.position === "creator" ? 1.3 : .8) })), roll);
}

export function beginArcballMatch(run: RunState, fixtureId: string): ArcballMatchState | null {
  const state = arcballStateOf(run);
  const fixture = arcballFixtureById(ensureArcballCupRounds(state), fixtureId);
  if (!fixture || fixture.homeScore !== undefined || fixture.week > run.week || !arcballReady(run)) return null;
  const playerIsHome = fixture.homeId === "player";
  if (!playerIsHome && fixture.awayId !== "player") return null;
  const playerStats = Object.fromEntries(arcballLineupStaff(run).map((s) => [s.id, { goals: 0, assists: 0, shots: 0, rating: 6 }]));
  return {
    fixtureId,
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    playerIsHome,
    events: [{ minute: 0, text: "Arcball begins.", kind: "info" }],
    playerStats,
    effort: {},
    lineup: { ...state.lineup },
    substitutionsUsed: 0,
    subbedOutIds: [],
    lastPossession: null,
    phase: "kickoff",
    homeShots: 0,
    awayShots: 0,
    homeOnTarget: 0,
    awayOnTarget: 0,
    homePossessionTicks: 0,
    awayPossessionTicks: 0,
  };
}

export function substituteArcballMatch(run: RunState, match: ArcballMatchState, position: ArcballPosition, incomingId: string): ArcballMatchState | null {
  if (match.minute >= 90 || match.substitutionsUsed >= 3) return null;
  const state = arcballStateOf(run);
  if (!state.registered.includes(incomingId)) return null;
  if (Object.values(match.lineup).includes(incomingId)) return null;
  if (match.subbedOutIds.includes(incomingId)) return null;
  const outgoingId = match.lineup[position];
  if (!outgoingId || outgoingId === incomingId) return null;
  const incoming = run.staff.find((staff) => staff.id === incomingId);
  const outgoing = run.staff.find((staff) => staff.id === outgoingId);
  if (!incoming || !outgoing || staffIsInjured(incoming, run.day ?? run.week * 7)) return null;
  const playerStats = { ...match.playerStats };
  playerStats[incomingId] = playerStats[incomingId] ?? { goals: 0, assists: 0, shots: 0, rating: 6 };
  return {
    ...match,
    lineup: { ...match.lineup, [position]: incomingId },
    substitutionsUsed: match.substitutionsUsed + 1,
    subbedOutIds: [...match.subbedOutIds, outgoingId],
    playerStats,
    activePlayerId: undefined,
    supportingPlayerId: undefined,
    events: [...match.events, {
      minute: match.minute,
      text: "SUBSTITUTION — " + incoming.name + " replaces " + outgoing.name + " at " + ARCBALL_POSITION_LABEL[position] + ".",
      kind: "info" as const,
      playerId: incomingId,
    }].slice(-24),
  };
}

function rivalForFixture(run: RunState, fixture: ArcballFixture): RivalStudio | null {
  const id = fixture.homeId === "player" ? fixture.awayId : fixture.homeId;
  return run.rivalWorld.studios.find((s) => s.id === id || s.name === id) ?? null;
}

export function stepArcballMatch(
  run: RunState,
  match: ArcballMatchState,
  intensity: ArcballIntensity,
  instruction: ArcballInstruction,
): ArcballMatchState {
  if (match.minute >= 90) return match;
  const state = arcballStateOf(run);
  const fixture = arcballFixtureById(state, match.fixtureId);
  if (!fixture) return match;
  const rival = rivalForFixture(run, fixture);
  if (!rival) return { ...match, minute: 90 };
  const nextMinute = Math.min(90, match.minute + 5);
  const rng = seeded(fixture.id + "|" + nextMinute + "|" + match.homeScore + "|" + match.awayScore + "|" + intensity + "|" + instruction);
  const playerNumbers = playerTeamNumbers(run, intensity, instruction, match.lineup);
  const rivalNumbers = rivalTeamNumbers(rival, state.seasonYear, state.rivalRosters[rival.id]);
  const homeNumbers = match.playerIsHome ? playerNumbers : rivalNumbers;
  const awayNumbers = match.playerIsHome ? rivalNumbers : playerNumbers;
  const homePoss = (homeNumbers.possession + 2) / Math.max(1, homeNumbers.possession + awayNumbers.possession + 2);
  const attackHome = rng() < homePoss;
  const attackNumbers = attackHome ? homeNumbers : awayNumbers;
  const defendNumbers = attackHome ? awayNumbers : homeNumbers;
  const shotChance = clamp(.42 + (attackNumbers.attack - defendNumbers.defence) * .007, .18, .72);
  const isPlayerAttack = attackHome === match.playerIsHome;
  let homeScore = match.homeScore;
  let awayScore = match.awayScore;
  let activePlayerId: string | undefined;
  let supportingPlayerId: string | undefined;
  let activeRivalName: string | undefined;
  let supportingRivalName: string | undefined;
  let phase: ArcballMatchPhase = "buildup";
  let homeShots = match.homeShots;
  let awayShots = match.awayShots;
  let homeOnTarget = match.homeOnTarget;
  let awayOnTarget = match.awayOnTarget;
  const homePossessionTicks = match.homePossessionTicks + (attackHome ? 1 : 0);
  const awayPossessionTicks = match.awayPossessionTicks + (attackHome ? 0 : 1);
  const playerStats = Object.fromEntries(Object.entries(match.playerStats).map(([id, row]) => [id, { ...row }]));
  const events = [...match.events];
  const approachText: Record<ArcballApproachId, string> = {
    short: "with a patient short-passing move",
    direct: "with a direct vertical attack",
    press: "after winning it high with the press",
    counter: "on a quick counterattack",
  };
  const intensityText: Record<ArcballIntensity, string> = {
    calm: "without forcing the tempo",
    normal: "at a measured tempo",
    push: "with extra runners committing forward",
    allin: "with almost everyone pouring forward",
  };

  /* Pick a visible ball carrier on every tick. The presentation can now show
     actual possession even when a move never reaches the shot calculation. */
  if (isPlayerAttack) {
    const carrier = playerAttackPick(run, rng(), instruction, match.lineup);
    activePlayerId = carrier.id;
    const supportPool = arcballLineupStaff(run, match.lineup).filter((s) => s.id !== carrier.id);
    if (supportPool.length) supportingPlayerId = supportPool[Math.floor(rng() * supportPool.length)].id;
  } else {
    const roster = rivalArcballRoster(rival, state.seasonYear, state.rivalRosters[rival.id]);
    const carrier = rivalAttackPick(roster, rng());
    activeRivalName = carrier.name;
    const supportPool = roster.filter((p) => p.name !== carrier.name);
    if (supportPool.length) supportingRivalName = supportPool[Math.floor(rng() * supportPool.length)].name;
  }

  if (rng() < shotChance) {
    phase = "chance";
    const goalChance = clamp(.27 + (attackNumbers.attack - defendNumbers.defence) * .0035, .13, .46);
    const scored = rng() < goalChance;
    if (attackHome) homeShots += 1; else awayShots += 1;
    if (isPlayerAttack) {
      const scorer = playerAttackPick(run, rng(), instruction, match.lineup);
      activePlayerId = scorer.id;
      playerStats[scorer.id] = playerStats[scorer.id] ?? { goals: 0, assists: 0, shots: 0, rating: 6 };
      playerStats[scorer.id].shots += 1;
      if (scored) {
        phase = "goal";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        playerStats[scorer.id].goals += 1;
        playerStats[scorer.id].rating += 1;
        const assistPool = arcballLineupStaff(run, match.lineup).filter((s) => s.id !== scorer.id);
        if (assistPool.length && rng() < .68) {
          const assister = assistPool[Math.floor(rng() * assistPool.length)];
          supportingPlayerId = assister.id;
          playerStats[assister.id] = playerStats[assister.id] ?? { goals: 0, assists: 0, shots: 0, rating: 6 };
          playerStats[assister.id].assists += 1;
          playerStats[assister.id].rating += .45;
          events.push({ minute: nextMinute, text: assister.name + " collects the ball " + approachText[state.approach] + ", draws a defender and slides it into " + scorer.name + "'s run. " + scorer.name + " attacks the space " + intensityText[intensity] + ", takes one touch to set and drives the finish beyond the keeper — GOAL.", kind: "goal", playerId: scorer.id });
        } else {
          events.push({ minute: nextMinute, text: scorer.name + " carries the ball through the central lane " + approachText[state.approach] + ". The defence backs off for a moment, " + scorer.name + " steps into range and buries the shot for " + run.studio + " — GOAL.", kind: "goal", playerId: scorer.id });
        }
        if (attackHome) homeScore += 1; else awayScore += 1;
      } else {
        phase = "shot";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        events.push({ minute: nextMinute, text: scorer.name + " receives in the final third " + approachText[state.approach] + " and turns toward goal. " + scorer.name + " gets the shot away " + intensityText[intensity] + ", but the keeper reads it and makes the save.", kind: "shot", playerId: scorer.id });
      }
    } else {
      const roster = rivalArcballRoster(rival, state.seasonYear);
      const attacker = rivalAttackPick(roster, rng());
      activeRivalName = attacker.name;
      if (scored) {
        phase = "goal";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        if (attackHome) homeScore += 1; else awayScore += 1;
        events.push({ minute: nextMinute, text: rival.name + " works the ball through midfield and pulls the shape apart. " + attacker.name + " accelerates into the gap, reaches the edge of the scoring area and finishes cleanly — GOAL for " + rival.name + ".", kind: "goal" });
      } else {
        phase = "shot";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        events.push({ minute: nextMinute, text: rival.name + " moves the ball quickly into " + attacker.name + "'s path. " + attacker.name + " opens a shooting lane and lets it go, but " + run.studio + " closes the angle and keeps it out.", kind: "shot" });
      }
    }
  } else if (rng() < .34) {
    phase = "defence";
    const playerCarrier = run.staff.find((s) => s.id === activePlayerId)?.name ?? "The ball carrier";
    const playerSupport = run.staff.find((s) => s.id === supportingPlayerId)?.name;
    events.push({
      minute: nextMinute,
      text: isPlayerAttack
        ? (playerSupport ? playerSupport + " carries forward and looks for " + playerCarrier + " between the lines. " : playerCarrier + " carries toward the final third. ") + "The defence anticipates the pass, steps across the lane and cuts it out before the chance can develop."
        : (supportingRivalName ? supportingRivalName + " tries to feed " + (activeRivalName ?? "the runner") + " through the middle. " : rival.name + " pushes into the final third. ") + run.studio + " tracks the run, gets a body in the lane and clears the danger.",
      kind: "defence",
      playerId: isPlayerAttack ? activePlayerId : undefined,
    });
  } else {
    phase = rng() < .45 ? "midfield" : rng() < .55 ? "breakaway" : "buildup";
    const carrierName = isPlayerAttack
      ? run.staff.find((s) => s.id === activePlayerId)?.name
      : activeRivalName;
    const supportName = isPlayerAttack
      ? run.staff.find((s) => s.id === supportingPlayerId)?.name
      : supportingRivalName;
    events.push({
      minute: nextMinute,
      text: phase === "breakaway"
        ? (supportName ? supportName + " wins it and releases " : "") + (carrierName ?? "the runner") + " into open space. " + (carrierName ?? "The runner") + " carries hard toward the scoring area, but the recovering defence closes the route before a shot opens up."
        : phase === "midfield"
          ? (supportName ? supportName + " and " + (carrierName ?? "the carrier") + " exchange a quick pass in midfield. " : (carrierName ?? "The ball carrier") + " takes control in midfield. ") + "The move shifts the defence side to side, but there is no clean route through yet."
          : (supportName ? supportName + " drops short for the ball and finds " + (carrierName ?? "the carrier") + " ahead. " : (carrierName ?? "The ball carrier") + " settles possession. ") + "The team keeps its shape " + approachText[isPlayerAttack ? state.approach : "short"] + " and probes for the next opening.",
      kind: "info",
      playerId: isPlayerAttack ? activePlayerId : undefined,
    });
  }

  const intensityCost: Record<ArcballIntensity, number> = { calm: .45, normal: .67, push: .90, allin: 1.20 };
  const extraPress = (arcballStateOf(run).approach === "press" || instruction === "press") ? .08 : 0;
  const effort = { ...match.effort };
  for (const member of arcballLineupStaff(run, match.lineup)) effort[member.id] = (effort[member.id] ?? 0) + intensityCost[intensity] + extraPress;

  return {
    ...match,
    minute: nextMinute,
    homeScore,
    awayScore,
    playerStats,
    effort,
    events: events.slice(-24),
    activePlayerId,
    supportingPlayerId,
    activeRivalName,
    supportingRivalName,
    lastPossession: attackHome ? "home" : "away",
    phase,
    homeShots,
    awayShots,
    homeOnTarget,
    awayOnTarget,
    homePossessionTicks,
    awayPossessionTicks,
  };
}

function resultTokenReward(playerScore: number, opponentScore: number): number {
  return playerScore > opponentScore ? 10 : playerScore === opponentScore ? 6 : 4;
}

function finalizeArcballCup(state: ArcballState): { state: ArcballState; playerWon: boolean; championId: string | null } {
  if (state.cupHistory.some((entry) => entry.year === state.seasonYear)) return { state, playerWon: false, championId: null };
  const final = state.cupFixtures.find((fixture) => fixture.cupRound === "final");
  if (!final) return { state, playerWon: false, championId: null };
  const championId = cupFixtureWinner(final);
  if (!championId) return { state, playerWon: false, championId: null };
  const playerWon = championId === "player";
  return {
    state: {
      ...state,
      tokens: state.tokens + (playerWon ? 30 : 0),
      championshipSpotlights: state.championshipSpotlights + (playerWon ? 1 : 0),
      cupTitles: state.cupTitles + (playerWon ? 1 : 0),
      cupHistory: [...state.cupHistory, { year: state.seasonYear, championId, playerWon }].slice(-30),
    },
    playerWon,
    championId,
  };
}

function resolveFixtureScores(state: ArcballState, fixtureId: string, homeScore: number, awayScore: number, resolvedBy: ArcballFixture["resolvedBy"]): ArcballState {
  return {
    ...state,
    fixtures: state.fixtures.map((f) => f.id === fixtureId ? { ...f, homeScore, awayScore, resolvedBy } : f),
    cupFixtures: state.cupFixtures.map((f) => f.id === fixtureId ? { ...f, homeScore, awayScore, resolvedBy } : f),
  };
}

export function finishArcballMatch(run: RunState, match: ArcballMatchState, resolvedBy: "watch" | "instant" | "auto" = "watch"): RunState | null {
  if (match.minute < 90) return null;
  let state = cleanArcballRoster(run, arcballStateOf(run));
  const fixture = arcballFixtureById(state, match.fixtureId);
  if (!fixture || fixture.homeScore !== undefined) return null;
  let resolvedHomeScore = match.homeScore;
  let resolvedAwayScore = match.awayScore;
  let cupTiebreak = false;
  if (fixture.competition === "cup" && resolvedHomeScore === resolvedAwayScore) {
    const tieRng = seeded("arcball-cup-tiebreak|" + fixture.id);
    if (tieRng() < .5) resolvedHomeScore += 1;
    else resolvedAwayScore += 1;
    cupTiebreak = true;
  }
  state = resolveFixtureScores(state, fixture.id, resolvedHomeScore, resolvedAwayScore, resolvedBy);
  state = ensureArcballCupRounds(state);
  const cupFinalized = finalizeArcballCup(state);
  state = cupFinalized.state;
  const playerScore = match.playerIsHome ? resolvedHomeScore : resolvedAwayScore;
  const opponentScore = match.playerIsHome ? resolvedAwayScore : resolvedHomeScore;
  const win = playerScore > opponentScore;
  const draw = playerScore === opponentScore;
  const tokenGain = resultTokenReward(playerScore, opponentScore);
  const rows = Object.entries(match.playerStats)
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists);
  const mvpId = rows[0]?.id;
  const seasonScale = 1 + Math.min(1.5, Math.max(0, state.seasonYear - 1) * .05);
  const progress = { ...state.players };
  const club = arcballClubEffects(state);
  let staff = run.staff.map((member) => {
    const stat = match.playerStats[member.id];
    if (!stat) return member;
    const mvp = member.id === mvpId;
    const fanGain = Math.round((80 + stat.goals * 700 + stat.assists * 350 + (win ? 180 : draw ? 90 : 30) + (mvp ? 1200 : 0)) * seasonScale);
    const prior = progress[member.id] ?? freshProgress();
    const formDelta = stat.rating >= 7.7 || mvp ? 1 : stat.rating < 6.2 ? -1 : win ? 1 : 0;
    progress[member.id] = {
      ...prior,
      appearances: prior.appearances + 1,
      goals: prior.goals + stat.goals,
      assists: prior.assists + stat.assists,
      wins: prior.wins + (win ? 1 : 0),
      playerOfMatch: prior.playerOfMatch + (mvp ? 1 : 0),
      arcballFans: prior.arcballFans + fanGain,
      seasonAppearances: prior.seasonAppearances + 1,
      seasonGoals: prior.seasonGoals + stat.goals,
      seasonAssists: prior.seasonAssists + stat.assists,
      seasonWins: prior.seasonWins + (win ? 1 : 0),
      seasonPlayerOfMatch: prior.seasonPlayerOfMatch + (mvp ? 1 : 0),
      form: clamp(prior.form + formDelta, -3, 3),
    };
    return {
      ...member,
      stamina: Math.max(0, member.stamina - Math.max(1, Math.round((match.effort[member.id] ?? 10) * club.energyCostMult))),
      creatorFans: Math.max(0, Math.round((member.creatorFans ?? 0) + fanGain)),
    };
  });
  /* A normal Arcball match carries a 20% team injury risk. The risk rises when
     the squad is exhausted, making repeated low-energy fixtures a real studio gamble. */
  let injuryNotice = "";
  const injuryRng = seeded("arcball-injury|" + fixture.id);
  const participants = staff.filter((member) => !!match.playerStats[member.id]);
  if (participants.length) {
    const energies = participants.map((member) => member.stamina);
    const injuryChance = arcballInjuryChance(energies, club.fatigueRiskMitigation);
    if (injuryRng() < injuryChance) {
      const injured = pickWeighted(participants.map((member) => ({
        item: member,
        weight: 1 + Math.max(0, 55 - member.stamina) / 7,
      })), injuryRng());
      const weeksOut = Math.max(2, arcballInjuryWeeks(injured.stamina, injuryRng()) - club.injuryWeeksReduction);
      const injuries = ["ankle sprain", "shoulder strain", "wrist sprain", "knee strain", "back strain"];
      const injuryLabel = injuries[Math.floor(injuryRng() * injuries.length)];
      const currentDay = run.day ?? run.week * 7;
      const injuredUntilDay = currentDay + weeksOut * 7;
      const activeProject = run.projects.find((project) =>
        !["airing", "done", "shelved"].includes(project.stage) && project.staffIds.includes(injured.id)
      );
      staff = staff.map((member) => member.id === injured.id ? {
        ...member,
        injuredUntilDay,
        injuryLabel,
        arcballInjuries: (member.arcballInjuries ?? 0) + 1,
      } : member);
      injuryNotice = " · 🤕 " + injured.name + " suffers a " + injuryLabel + " and is OUT " + weeksOut + " weeks" +
        (activeProject ? " — they remain assigned to “" + activeProject.draft.title + "” but cannot contribute to production" : "") + ".";
    }
  }

  const cupFanBonus = cupFinalized.playerWon ? 5_000 : 0;
  const studioFans = Math.round(((win ? 500 : draw ? 250 : 100) + playerScore * 100 + cupFanBonus) * club.commercialMult);
  const opponentId = match.playerIsHome ? fixture.awayId : fixture.homeId;
  const opponent = arcballTeamName(run, opponentId);
  const sponsor = state.sponsor && state.sponsorYear === state.seasonYear ? ARCBALL_SPONSORS[state.sponsor] : null;
  const sponsorGain = sponsor ? Math.round((win ? sponsor.win : draw ? sponsor.win * .35 : 0) * club.commercialMult) : 0;
  state = { ...state, players: progress, tokens: state.tokens + tokenGain };
  const competitionLabel = fixture.competition === "cup" ? "ARCBALL CUP" : "ARCBALL";
  const resultText = run.studio + " " + playerScore + "–" + opponentScore + " " + opponent + (cupTiebreak ? " (overtime)" : "");
  const margin = playerScore - opponentScore;
  const currentWinStreak = win ? state.records.currentWinStreak + 1 : 0;
  state = {
    ...state,
    records: {
      biggestWinMargin: margin > state.records.biggestWinMargin ? margin : state.records.biggestWinMargin,
      biggestWinText: margin > state.records.biggestWinMargin ? resultText : state.records.biggestWinText,
      longestWinStreak: Math.max(state.records.longestWinStreak, currentWinStreak),
      currentWinStreak,
      mostGoalsInMatch: playerScore > state.records.mostGoalsInMatch ? playerScore : state.records.mostGoalsInMatch,
      mostGoalsText: playerScore > state.records.mostGoalsInMatch ? resultText : state.records.mostGoalsText,
    },
  };
  const opponentStudio = run.rivalWorld.studios.find((studio) => studio.id === opponentId || studio.name === opponentId);
  return {
    ...run,
    arcball: state,
    staff,
    cash: run.cash + sponsorGain,
    incomeThisWeek: (run.incomeThisWeek ?? 0) + sponsorGain,
    rivalWorld: opponentStudio ? bumpRivalry(run.rivalWorld, opponentStudio.id, win ? 2 : 1) : run.rivalWorld,
    fans: run.fans + studioFans,
    fansThisWeek: (run.fansThisWeek ?? 0) + studioFans,
    notices: [
      ...run.notices,
      "⚽ " + competitionLabel + ": " + resultText + " · +" + tokenGain + " Arc Tokens · +" + studioFans.toLocaleString("en-GB") + " studio fans" + (cupFinalized.playerWon ? " · 🏆 CUP WINNERS: +30 Arc Tokens, +1 Championship Spotlight and +5,000 studio fans" : "") + (sponsorGain ? " · +" + sponsorGain.toLocaleString("en-GB") + " sponsor bonus" : "") + (mvpId ? " · " + (run.staff.find((s) => s.id === mvpId)?.name ?? "a player") + " Player of the Match" : "") + "." + injuryNotice,
    ].slice(-40),
  };
}

export function instantResolveArcballFixture(run: RunState, fixtureId: string, source: "instant" | "auto" = "instant"): RunState | null {
  let match = beginArcballMatch(run, fixtureId);
  if (!match) return null;
  while (match.minute < 90) match = stepArcballMatch(run, match, "normal", "none");
  return finishArcballMatch(run, match, source);
}

function forfeitPlayerFixture(run: RunState, fixture: ArcballFixture): RunState {
  const state = arcballStateOf(run);
  const playerHome = fixture.homeId === "player";
  const next = resolveFixtureScores(state, fixture.id, playerHome ? 0 : 3, playerHome ? 3 : 0, "auto");
  return {
    ...run,
    arcball: next,
    notices: [...run.notices, "⚽ ARCBALL FORFEIT — fewer than five registered starters were available for the fixture."].slice(-40),
  };
}

function simulateRivalFixture(run: RunState, fixture: ArcballFixture): ArcballFixture {
  const home = run.rivalWorld.studios.find((s) => s.id === fixture.homeId || s.name === fixture.homeId);
  const away = run.rivalWorld.studios.find((s) => s.id === fixture.awayId || s.name === fixture.awayId);
  if (!home || !away) return { ...fixture, homeScore: 0, awayScore: 0, resolvedBy: "rival" };
  const state = arcballStateOf(run);
  const hn = rivalTeamNumbers(home, fixture.seasonYear, state.rivalRosters[home.id]);
  const an = rivalTeamNumbers(away, fixture.seasonYear, state.rivalRosters[away.id]);
  const rng = seeded(fixture.id + "|rival");
  let hs = 0, as = 0;
  for (let i = 0; i < 18; i += 1) {
    const homeAttack = rng() < (hn.possession + 2) / Math.max(1, hn.possession + an.possession + 2);
    const atk = homeAttack ? hn : an;
    const def = homeAttack ? an : hn;
    const scoreChance = clamp(.115 + (atk.attack - def.defence) * .0025, .045, .22);
    if (rng() < scoreChance) { if (homeAttack) hs += 1; else as += 1; }
  }
  return { ...fixture, homeScore: hs, awayScore: as, resolvedBy: "rival" };
}

function addArcballTrait(member: Staff, traitId: string, statGain = 0): Staff {
  const traits = member.traits ?? [];
  const point = ROLE_POINT[member.role];
  return {
    ...member,
    traits: traits.includes(traitId) ? traits : [...traits, traitId],
    [point]: Math.min(STAFF_STAT_CAP, member[point] + statGain),
  };
}

function arcballSeasonHonours(run: RunState, state: ArcballState, position: number, goalsAgainst: number): { staff: Staff[]; state: ArcballState; notices: string[] } {
  const eligible = Object.entries(state.players)
    .map(([staffId, p]) => ({ staffId, p, staff: run.staff.find((s) => s.id === staffId) }))
    .filter((row): row is { staffId: string; p: ArcballPlayerProgress; staff: Staff } => !!row.staff && row.p.seasonAppearances > 0);
  if (!eligible.length) return { staff: run.staff, state, notices: [] };

  const honourRows: { id: ArcballHonourId; row: typeof eligible[number]; trait?: string; statGain?: number; perk: string }[] = [];
  const scorer = [...eligible].sort((a, b) => b.p.seasonGoals - a.p.seasonGoals || b.p.seasonPlayerOfMatch - a.p.seasonPlayerOfMatch)[0];
  if (scorer?.p.seasonGoals >= 4) honourRows.push({ id: "golden_scorer", row: scorer, trait: "arcball_finisher", perk: "+12% anime output during Post and Marketing" });

  const playmaker = [...eligible].sort((a, b) => b.p.seasonAssists - a.p.seasonAssists || b.p.seasonPlayerOfMatch - a.p.seasonPlayerOfMatch)[0];
  if (playmaker?.p.seasonAssists >= 3) honourRows.push({ id: "playmaker", row: playmaker, trait: "arcball_playmaker", perk: "+0.08 anime team-speed aura" });

  const poy = [...eligible].sort((a, b) => {
    const av = a.p.seasonGoals * 4 + a.p.seasonAssists * 3 + a.p.seasonPlayerOfMatch * 5 + a.p.seasonWins;
    const bv = b.p.seasonGoals * 4 + b.p.seasonAssists * 3 + b.p.seasonPlayerOfMatch * 5 + b.p.seasonWins;
    return bv - av;
  })[0];
  const poyScore = poy ? poy.p.seasonGoals * 4 + poy.p.seasonAssists * 3 + poy.p.seasonPlayerOfMatch * 5 + poy.p.seasonWins : 0;
  if (poy && position <= 3 && poyScore >= 22) honourRows.push({ id: "player_year", row: poy, trait: "arcball_icon", statGain: 1, perk: "+12% anime output, +10% release fans, +1 main craft" });

  const keeperId = state.lineup.keeper;
  const keeper = eligible.find((row) => row.staffId === keeperId);
  if (keeper && keeper.p.seasonAppearances >= 7 && goalsAgainst <= 18) honourRows.push({ id: "guardian", row: keeper, trait: "arcball_guardian", perk: "+8% anime output and steadier condition" });

  for (const row of [...eligible].sort((a, b) => (b.p.seasonGoals * 2 + b.p.seasonAssists * 2 + b.p.seasonPlayerOfMatch * 3) - (a.p.seasonGoals * 2 + a.p.seasonAssists * 2 + a.p.seasonPlayerOfMatch * 3)).slice(0, 2)) {
    honourRows.push({ id: "team_season", row, perk: "Team of the Season recognition" });
  }

  let staff = run.staff;
  const honours = [...state.honours];
  const notices: string[] = [];
  for (const honour of honourRows) {
    if (honours.some((record) => record.year === state.seasonYear && record.id === honour.id && record.staffId === honour.row.staffId)) continue;
    if (honour.trait) staff = staff.map((member) => member.id === honour.row.staffId ? addArcballTrait(member, honour.trait!, honour.statGain ?? 0) : member);
    honours.push({ year: state.seasonYear, id: honour.id, staffId: honour.row.staffId, name: honour.row.staff.name, productionPerk: honour.perk });
    const label = honour.id === "player_year" ? "PLAYER OF THE YEAR" : honour.id === "golden_scorer" ? "GOLDEN SCORER" : honour.id === "playmaker" ? "PLAYMAKER AWARD" : honour.id === "guardian" ? "GUARDIAN AWARD" : "TEAM OF THE SEASON";
    notices.push("🏅 ARCBALL " + label + " — " + honour.row.staff.name + (honour.trait ? " · anime production perk earned: " + honour.perk + "." : "."));
  }
  return { staff, state: { ...state, honours: honours.slice(-100) }, notices };
}

function resetArcballSeasonPlayerStats(players: Record<string, ArcballPlayerProgress>): Record<string, ArcballPlayerProgress> {
  return Object.fromEntries(Object.entries(players).map(([id, p]) => [id, {
    ...p,
    seasonAppearances: 0,
    seasonGoals: 0,
    seasonAssists: 0,
    seasonWins: 0,
    seasonPlayerOfMatch: 0,
    form: p.form > 0 ? 1 : p.form < 0 ? -1 : 0,
  }]));
}

function completeArcballSeason(run: RunState, state: ArcballState): ArcballState {
  const tableRun = { ...run, arcball: state };
  const table = arcballStandings(tableRun);
  const player = table.find((row) => row.teamId === "player");
  if (!player) return state;
  const position = table.findIndex((row) => row.teamId === "player") + 1;
  const title = position === 1;
  const placementTokens = title ? 40 : position === 2 ? 20 : position === 3 ? 10 : 0;
  return {
    ...state,
    tokens: state.tokens + placementTokens,
    championshipSpotlights: state.championshipSpotlights + (title ? 1 : 0),
    titles: state.titles + (title ? 1 : 0),
    history: [...state.history, {
      year: state.seasonYear,
      position,
      wins: player.wins,
      draws: player.draws,
      losses: player.losses,
      gf: player.gf,
      ga: player.ga,
      title,
    }].slice(-30),
  };
}

export function advanceArcballWeek(run: RunState): RunState {
  const currentDay = run.day ?? run.week * 7;
  const recovered = run.staff.filter((member) => member.injuredUntilDay !== undefined && member.injuredUntilDay <= currentDay);
  let out = recovered.length ? {
    ...run,
    staff: run.staff.map((member) => member.injuredUntilDay !== undefined && member.injuredUntilDay <= currentDay
      ? { ...member, injuredUntilDay: undefined, injuryLabel: undefined }
      : member),
    notices: [
      ...run.notices,
      ...recovered.map((member) => "✅ " + member.name + " is cleared to return after their Arcball injury."),
    ].slice(-40),
  } : run;
  let state = ensureArcballRivalRosters(out, cleanArcballRoster(out, arcballStateOf(out)));
  if (!state.unlocked) {
    if (!arcballUnlockReason(out)) {
      const activated = activateArcball({ ...out, arcball: state });
      if (activated) { out = activated; state = arcballStateOf(out); }
    } else {
      return { ...out, arcball: state };
    }
  }

  const currentYear = yearOfWeek(out.week);
  if (state.seasonYear < currentYear) {
    const endingSponsor = state.sponsor && state.sponsorYear === state.seasonYear ? ARCBALL_SPONSORS[state.sponsor] : null;
    state = completeArcballSeason(out, state);
    const last = state.history[state.history.length - 1];
    const position = last?.position ?? 7;
    const honourResult = arcballSeasonHonours(out, state, position, last?.ga ?? 99);
    out = { ...out, staff: honourResult.staff };
    state = honourResult.state;
    const notices = [...out.notices, ...honourResult.notices];
    let sponsorBonus = 0;
    if (endingSponsor && last) {
      const baseSponsorBonus = last.title ? endingSponsor.title : last.position <= 3 ? endingSponsor.top3 : 0;
      sponsorBonus = Math.round(baseSponsorBonus * arcballClubEffects(state).commercialMult);
    }
    if (sponsorBonus && endingSponsor) {
      out = { ...out, cash: out.cash + sponsorBonus, incomeThisWeek: (out.incomeThisWeek ?? 0) + sponsorBonus };
      notices.push("🤝 " + endingSponsor.name + " season objective paid +" + sponsorBonus.toLocaleString("en-GB") + ".");
    }
    if (last?.year === currentYear - 1) {
      notices.push(last.title
        ? "🏆 ARCBALL CHAMPIONS — +" + 40 + " Arc Tokens and 1 Championship Spotlight."
        : "⚽ Arcball season complete — " + ordinal(last.position) + " place" + (last.position <= 3 ? " · placement tokens awarded." : "."));
    }
    state = evolveArcballRivalRosters(out, state, currentYear);
    state = {
      ...state,
      seasonYear: currentYear,
      fixtures: buildArcballFixtures(currentYear),
      cupFixtures: buildArcballCupFixtures(currentYear),
      seasonPurchases: { tier1: 0, tier2: 0 },
      players: resetArcballSeasonPlayerStats(state.players),
      sponsor: null,
      sponsorYear: 0,
    };
    out = { ...out, arcball: state, notices: notices.slice(-40) };
  }

  state = cleanArcballRoster(out, ensureArcballCupRounds(arcballStateOf(out)));
  const fixtures = state.fixtures.map((fixture) => {
    if (fixture.homeScore !== undefined || fixture.week > out.week) return fixture;
    if (fixture.homeId === "player" || fixture.awayId === "player") return fixture;
    return simulateRivalFixture(out, fixture);
  });
  state = { ...state, fixtures };
  for (let pass = 0; pass < 3; pass += 1) {
    state = ensureArcballCupRounds(state);
    state = {
      ...state,
      cupFixtures: state.cupFixtures.map((fixture) => {
        if (fixture.homeScore !== undefined || fixture.week > out.week) return fixture;
        if (fixture.homeId === "player" || fixture.awayId === "player") return fixture;
        return simulateRivalFixture({ ...out, arcball: state }, fixture);
      }),
    };
  }
  state = finalizeArcballCup(ensureArcballCupRounds(state)).state;
  out = { ...out, arcball: state };

  const overdue = playerArcballFixtures(arcballStateOf(out))
    .filter((f) => f.homeScore === undefined && f.week < out.week)
    .sort((a, b) => a.week - b.week);
  for (const fixture of overdue) {
    out = arcballReady(out) ? (instantResolveArcballFixture(out, fixture.id, "auto") ?? out) : forfeitPlayerFixture(out, fixture);
  }

  const due = playableArcballFixture(out);
  if (due && due.week === out.week) {
    const opponent = arcballTeamName(out, due.homeId === "player" ? due.awayId : due.homeId);
    const comp = due.competition === "cup" ? "ARCBALL CUP " + (due.cupRound?.toUpperCase() ?? "MATCH") : "ARCBALL LEAGUE";
    out = { ...out, notices: [...out.notices, "⚽ " + comp + " WEEK — " + out.studio + " vs " + opponent + ". Manage it from MORE → ARCBALL or let it auto-sim next week."].slice(-40) };
  }
  return out;
}

function ordinal(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return n + "st";
  if (n % 10 === 2 && n % 100 !== 12) return n + "nd";
  if (n % 10 === 3 && n % 100 !== 13) return n + "rd";
  return n + "th";
}

export function arcballMerchQuote(run: RunState): { cost: number; revenue: number; fanGain: number; blockedReason: string | null } {
  const state = arcballStateOf(run);
  const cost = 20_000;
  const sportFans = Object.values(state.players).reduce((sum, player) => sum + (player.arcballFans ?? 0), 0);
  const commercial = arcballClubEffects(state).commercialMult;
  const revenue = Math.round((
    25_000 +
    Math.min(350_000, sportFans * .18) +
    Math.min(180_000, run.fans * .015) +
    (state.titles + state.cupTitles) * 25_000
  ) * commercial);
  const fanGain = Math.round(Math.min(14_000, (500 + sportFans * .01) * commercial));
  let blockedReason: string | null = null;
  if (!state.unlocked) blockedReason = "Enter the Arcball League first";
  else if (!run.research.includes("merch")) blockedReason = "Requires Merchandising research";
  else if (state.merchDrops.some((drop) => drop.year === state.seasonYear)) blockedReason = "Arcball merch drop already run this season";
  else if (run.cash < cost) blockedReason = "Needs £20,000 cash";
  return { cost, revenue, fanGain, blockedReason };
}

export function runArcballMerchDrop(run: RunState): RunState | null {
  const quote = arcballMerchQuote(run);
  if (quote.blockedReason) return null;
  const state = arcballStateOf(run);
  const star = Object.entries(state.players)
    .map(([id, progress]) => ({ id, progress, staff: run.staff.find((member) => member.id === id) }))
    .filter((row) => !!row.staff)
    .sort((a, b) => b.progress.arcballFans - a.progress.arcballFans)[0];
  const starBonus = star?.staff ? Math.round(Math.min(2_500, quote.fanGain * .3)) : 0;
  return {
    ...run,
    cash: run.cash - quote.cost + quote.revenue,
    incomeThisWeek: (run.incomeThisWeek ?? 0) + quote.revenue,
    fans: run.fans + quote.fanGain,
    fansThisWeek: (run.fansThisWeek ?? 0) + quote.fanGain,
    staff: star?.staff ? run.staff.map((member) => member.id === star.id ? { ...member, creatorFans: (member.creatorFans ?? 0) + starBonus } : member) : run.staff,
    arcball: {
      ...state,
      merchDrops: [...state.merchDrops, { year: state.seasonYear, revenue: quote.revenue, fanGain: quote.fanGain }].slice(-30),
    },
    strategicSpend: [
      ...run.strategicSpend,
      { id: "arcball_merch_" + state.seasonYear, label: "Arcball team merchandise", amount: quote.cost, week: run.week },
    ],
    notices: [
      ...run.notices,
      "🧢 ARCBALL MERCH DROP — team shirts and player gear return £" + quote.revenue.toLocaleString("en-GB") +
      " on £" + quote.cost.toLocaleString("en-GB") + " spend · +" + quote.fanGain.toLocaleString("en-GB") + " studio fans" +
      (star?.staff ? " · " + star.staff.name + " gains +" + starBonus.toLocaleString("en-GB") + " creator followers." : "."),
    ].slice(-40),
  };
}

export interface ArcballDrill {
  id: string;
  name: string;
  cost: number;
  stamina: number;
  primary: ArcballStat;
  gain: number;
  secondary?: ArcballStat;
  secondaryGain?: number;
  penalty?: ArcballStat;
  desc: string;
}

export const ARCBALL_DRILLS: ArcballDrill[] = [
  { id: "sprint", name: "Sprint Drills", cost: 8, stamina: 8, primary: "pace", gain: 3, penalty: "control", desc: "+Pace, small chance of −Control." },
  { id: "technical", name: "Technical Circuit", cost: 10, stamina: 8, primary: "control", gain: 2, secondary: "pass", secondaryGain: 1, desc: "+Control and +Pass." },
  { id: "power", name: "Strength Block", cost: 10, stamina: 10, primary: "power", gain: 3, penalty: "pace", desc: "+Power, small chance of −Pace." },
  { id: "finishing", name: "Finishing Lab", cost: 10, stamina: 9, primary: "finish", gain: 3, penalty: "pass", desc: "+Finish, small chance of −Pass." },
  { id: "vision", name: "Vision Session", cost: 11, stamina: 8, primary: "awareness", gain: 2, secondary: "pass", secondaryGain: 1, desc: "+Awareness and +Pass." },
];

export function trainArcball(run: RunState, staffId: string, drillId: string): RunState | null {
  const member = run.staff.find((s) => s.id === staffId);
  const drill = ARCBALL_DRILLS.find((d) => d.id === drillId);
  let state = arcballStateOf(run);
  if (!member || !drill || !state.unlocked || !state.registered.includes(staffId) || state.tokens < drill.cost || staffIsInjured(member, run.day ?? run.week * 7)) return null;
  const progress = ensurePlayerProgress(state, staffId);
  if (progress.lastTrainingWeek === run.week) return null;
  const readiness = arcballTrainingReadiness(member, drill.id, run.week);
  const base = arcballBaseProfile(member);
  const cap = Math.max(base.stats[drill.primary], 55 + Math.round(base.potential * .45));
  const current = arcballProfile(member, progress).stats[drill.primary];
  const club = arcballClubEffects(state);
  const plannedGain = Math.max(1, Math.round(drill.gain * readiness.gainMult * club.trainingGainMult));
  const primaryGain = Math.max(0, Math.min(plannedGain, cap - current));
  if (primaryGain <= 0) return null;
  const boosts = { ...(progress.boosts ?? {}) };
  boosts[drill.primary] = (boosts[drill.primary] ?? 0) + primaryGain;
  if (drill.secondary && drill.secondaryGain) {
    const secondaryGain = Math.max(1, Math.round(drill.secondaryGain * readiness.gainMult * club.trainingGainMult));
    boosts[drill.secondary] = (boosts[drill.secondary] ?? 0) + secondaryGain;
  }
  if (drill.penalty) {
    const r = seeded("arcball-drill|" + staffId + "|" + drill.id + "|" + run.week);
    if (r() < .28 * readiness.penaltyMult) boosts[drill.penalty] = (boosts[drill.penalty] ?? 0) - 1;
  }
  state = {
    ...state,
    tokens: state.tokens - drill.cost,
    players: { ...state.players, [staffId]: { ...progress, boosts, lastTrainingWeek: run.week } },
  };
  return {
    ...run,
    arcball: state,
    staff: run.staff.map((s) => s.id === staffId ? { ...s, stamina: Math.max(0, s.stamina - Math.max(1, Math.round(drill.stamina * club.energyCostMult))) } : s),
    notices: [...run.notices, "⚽ " + member.name + " completes " + drill.name + " at " + readiness.label + " readiness: +" + primaryGain + " " + drill.primary.toUpperCase() + " (−" + drill.cost + " Arc Tokens, −" + Math.max(1, Math.round(drill.stamina * club.energyCostMult)) + " energy)."].slice(-40),
  };
}

export type ArcballConsumableId = "recovery" | "morale";
export const ARCBALL_CONSUMABLES = [
  { id: "recovery" as const, name: "Recovery Kit", cost: 12, desc: "+30 worker energy immediately." },
  { id: "morale" as const, name: "Team Night Out", cost: 14, desc: "+12 worker morale immediately." },
];

export function useArcballConsumable(run: RunState, id: ArcballConsumableId, staffId: string): RunState | null {
  const member = run.staff.find((s) => s.id === staffId);
  const def = ARCBALL_CONSUMABLES.find((x) => x.id === id);
  const state = arcballStateOf(run);
  if (!member || !def || state.tokens < def.cost) return null;
  return {
    ...run,
    arcball: { ...state, tokens: state.tokens - def.cost },
    staff: run.staff.map((s) => s.id !== staffId ? s : id === "recovery"
      ? { ...s, stamina: Math.min(100, s.stamina + 30) }
      : { ...s, morale: Math.min(100, (s.morale ?? 70) + 12) }),
    notices: [...run.notices, "⚽ Arcball reward used on " + member.name + ": " + def.name + "."].slice(-40),
  };
}

export function redeemArcballMedal(run: RunState, staffId: string, point: PointType, tier: 1 | 2): RunState | null {
  const member = run.staff.find((s) => s.id === staffId);
  const state = arcballStateOf(run);
  const cost = tier === 1 ? 35 : 75;
  const gain = tier === 1 ? 2 : 5;
  const limit = tier === 1 ? 2 : 1;
  const used = tier === 1 ? state.seasonPurchases.tier1 : state.seasonPurchases.tier2;
  if (!member || !state.unlocked || state.tokens < cost || used >= limit || member[point] >= STAFF_STAT_CAP) return null;
  const actual = Math.min(gain, STAFF_STAT_CAP - member[point]);
  const seasonPurchases = { ...state.seasonPurchases, [tier === 1 ? "tier1" : "tier2"]: used + 1 };
  return {
    ...run,
    arcball: { ...state, tokens: state.tokens - cost, seasonPurchases },
    staff: run.staff.map((s) => s.id === staffId ? { ...s, [point]: s[point] + actual } : s),
    notices: [...run.notices, "🏅 " + member.name + " receives a Tier " + tier + " Arcball Development Medal: +" + actual + " " + point.toUpperCase() + "."].slice(-40),
  };
}

export function applyChampionshipSpotlight(run: RunState, franchiseKey: string): RunState | null {
  const state = arcballStateOf(run);
  const fr = run.franchises[franchiseKey];
  if (!fr || fr.soldTo || state.championshipSpotlights <= 0) return null;
  const next = {
    ...fr,
    popularity: Math.min(100, fr.popularity + 15),
    fatigue: Math.max(0, fr.fatigue - 15),
  };
  next.merchValue = merchValueOf(next);
  const expiresWeek = run.week + 48;
  const modifiers = [
    { id: "arc_spot_fans_" + run.week + "_" + franchiseKey, kind: "releaseFans" as const, label: "Arcball Championship Spotlight", createdWeek: run.week, expiresWeek, uses: 1, mult: 1.30, franchiseKey },
    { id: "arc_spot_sales_" + run.week + "_" + franchiseKey, kind: "releaseSales" as const, label: "Arcball Championship Spotlight", createdWeek: run.week, expiresWeek, uses: 1, mult: 1.20, franchiseKey },
    { id: "arc_spot_merch_" + run.week + "_" + franchiseKey, kind: "merch" as const, label: "Arcball Championship Spotlight", createdWeek: run.week, expiresWeek, uses: 1, mult: 1.20, franchiseKey },
  ];
  return {
    ...run,
    arcball: { ...state, championshipSpotlights: state.championshipSpotlights - 1 },
    franchises: { ...run.franchises, [franchiseKey]: next },
    decisionModifiers: [...(run.decisionModifiers ?? []), ...modifiers],
    notices: [...run.notices, "🏆 CHAMPIONSHIP SPOTLIGHT — “" + fr.baseTitle + "” gains +15 popularity, −15 fatigue, next release ×1.30 fans / ×1.20 sales and next merch push ×1.20."].slice(-40),
  };
}
