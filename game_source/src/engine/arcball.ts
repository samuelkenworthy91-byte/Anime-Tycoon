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
  STAFF_STAT_CAP,
  WORKER_LOOKS,
  type PointType,
  type Staff,
} from "./data";
import { merchValueOf } from "./franchise";
import type { RivalStudio } from "./rivals";
import type { RunState } from "./state";

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
  lastTrainingWeek?: number;
}

export interface ArcballFixture {
  id: string;
  seasonYear: number;
  round: number;
  week: number;
  homeId: string;
  awayId: string;
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
  seasonPurchases: { tier1: number; tier2: number };
  championshipSpotlights: number;
  titles: number;
  history: ArcballSeasonHistory[];
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

function freshProgress(): ArcballPlayerProgress {
  return { boosts: {}, appearances: 0, goals: 0, assists: 0, wins: 0, playerOfMatch: 0, arcballFans: 0 };
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
    seasonPurchases: { tier1: 0, tier2: 0 },
    championshipSpotlights: 0,
    titles: 0,
    history: [],
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
        lastTrainingWeek: typeof p.lastTrainingWeek === "number" ? p.lastTrainingWeek : undefined,
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
    fixtures: Array.isArray(r.fixtures) && r.fixtures.length ? r.fixtures.map((f) => ({ ...f })) : buildArcballFixtures(seasonYear),
    seasonPurchases: {
      tier1: Math.max(0, Math.floor(r.seasonPurchases?.tier1 ?? 0)),
      tier2: Math.max(0, Math.floor(r.seasonPurchases?.tier2 ?? 0)),
    },
    championshipSpotlights: Math.max(0, Math.floor(r.championshipSpotlights ?? 0)),
    titles: Math.max(0, Math.floor(r.titles ?? 0)),
    history: Array.isArray(r.history) ? r.history.slice(-30).map((h) => ({ ...h })) : [],
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

export function arcballLineupStaff(run: RunState): Staff[] {
  const state = cleanArcballRoster(run, arcballStateOf(run));
  return ARCBALL_POSITIONS.map((position) => run.staff.find((s) => s.id === state.lineup[position])).filter((s): s is Staff => !!s);
}

export function arcballReady(run: RunState): boolean {
  return arcballStateOf(run).unlocked && arcballLineupStaff(run).length === ARCBALL_TEAM_SIZE;
}

const rivalFirst = ["Akira", "Mika", "Jun", "Sora", "Rin", "Kei", "Mio", "Ren", "Yuna", "Haru", "Niko", "Ami", "Tomo", "Kira", "Ryo", "Emi"];
const rivalLast = ["Sato", "Ito", "Mori", "Tanaka", "Park", "Khan", "Price", "Bell", "Nakamura", "Suzuki", "Hughes", "Kim", "Arai", "Jones", "Miller", "Chen"];

export function rivalArcballRoster(studio: RivalStudio, year: number): ArcballRivalPlayer[] {
  const r = seeded("arcball-rival|" + studio.id + "|" + year);
  const base = 38 + studio.tier * 6 + studio.reputation * .12 + Math.min(12, (year - 1) * .65);
  return ARCBALL_POSITIONS.map((position, index) => ({
    id: "rival|" + studio.id + "|" + index,
    name: rivalFirst[Math.floor(r() * rivalFirst.length)] + " " + rivalLast[Math.floor(r() * rivalLast.length)],
    look: Math.floor(r() * Math.max(1, WORKER_LOOKS.length)),
    position,
    rating: clamp(Math.round(base - 10 + r() * 20 + (position === "creator" && studio.persona === "experimental" ? 4 : 0)), 30, 96),
  }));
}

interface TeamNumbers { attack: number; defence: number; possession: number; }

function playerTeamNumbers(run: RunState, intensity: ArcballIntensity = "normal", instruction: ArcballInstruction = "none"): TeamNumbers {
  const state = arcballStateOf(run);
  const byPosition = Object.fromEntries(ARCBALL_POSITIONS.map((position) => {
    const member = run.staff.find((s) => s.id === state.lineup[position]);
    if (!member) return [position, null];
    const profile = arcballProfile(member, state.players[member.id]);
    return [position, { member, profile }];
  })) as Record<ArcballPosition, { member: Staff; profile: ArcballBaseProfile } | null>;
  const values = ARCBALL_POSITIONS.map((position) => {
    const row = byPosition[position];
    return row ? positionRating(row.profile.stats, position) : 20;
  });
  let attack = values[4] * .38 + values[3] * .25 + values[2] * .18 + values[1] * .11 + values[0] * .08;
  let defence = values[0] * .35 + values[1] * .30 + values[2] * .18 + values[3] * .10 + values[4] * .07;
  let possession = values[3] * .34 + values[2] * .28 + values[1] * .18 + values[4] * .12 + values[0] * .08;

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

  return { attack, defence, possession };
}

function rivalTeamNumbers(studio: RivalStudio, year: number): TeamNumbers {
  const roster = rivalArcballRoster(studio, year);
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
  const state = arcballStateOf(run);
  return state.fixtures.find((f) => (f.homeId === "player" || f.awayId === "player") && f.homeScore === undefined) ?? null;
}

export function playableArcballFixture(run: RunState): ArcballFixture | null {
  if (!arcballReady(run)) return null;
  const state = arcballStateOf(run);
  return state.fixtures.find((f) =>
    (f.homeId === "player" || f.awayId === "player") &&
    f.homeScore === undefined &&
    f.week <= run.week
  ) ?? null;
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

function playerAttackPick(run: RunState, roll: number, instruction: ArcballInstruction): Staff {
  const state = arcballStateOf(run);
  const rows = ARCBALL_POSITIONS.flatMap((position) => {
    const member = run.staff.find((s) => s.id === state.lineup[position]);
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
  const fixture = state.fixtures.find((f) => f.id === fixtureId);
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
  const fixture = state.fixtures.find((f) => f.id === match.fixtureId);
  if (!fixture) return match;
  const rival = rivalForFixture(run, fixture);
  if (!rival) return { ...match, minute: 90 };
  const nextMinute = Math.min(90, match.minute + 5);
  const rng = seeded(fixture.id + "|" + nextMinute + "|" + match.homeScore + "|" + match.awayScore + "|" + intensity + "|" + instruction);
  const playerNumbers = playerTeamNumbers(run, intensity, instruction);
  const rivalNumbers = rivalTeamNumbers(rival, state.seasonYear);
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

  /* Pick a visible ball carrier on every tick. The presentation can now show
     actual possession even when a move never reaches the shot calculation. */
  if (isPlayerAttack) {
    const carrier = playerAttackPick(run, rng(), instruction);
    activePlayerId = carrier.id;
    const supportPool = arcballLineupStaff(run).filter((s) => s.id !== carrier.id);
    if (supportPool.length) supportingPlayerId = supportPool[Math.floor(rng() * supportPool.length)].id;
  } else {
    const roster = rivalArcballRoster(rival, state.seasonYear);
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
      const scorer = playerAttackPick(run, rng(), instruction);
      activePlayerId = scorer.id;
      playerStats[scorer.id] = playerStats[scorer.id] ?? { goals: 0, assists: 0, shots: 0, rating: 6 };
      playerStats[scorer.id].shots += 1;
      if (scored) {
        phase = "goal";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        playerStats[scorer.id].goals += 1;
        playerStats[scorer.id].rating += 1;
        const assistPool = arcballLineupStaff(run).filter((s) => s.id !== scorer.id);
        if (assistPool.length && rng() < .68) {
          const assister = assistPool[Math.floor(rng() * assistPool.length)];
          supportingPlayerId = assister.id;
          playerStats[assister.id] = playerStats[assister.id] ?? { goals: 0, assists: 0, shots: 0, rating: 6 };
          playerStats[assister.id].assists += 1;
          playerStats[assister.id].rating += .45;
          events.push({ minute: nextMinute, text: assister.name + " releases " + scorer.name + ". GOAL — " + scorer.name + " finishes it.", kind: "goal", playerId: scorer.id });
        } else {
          events.push({ minute: nextMinute, text: scorer.name + " breaks into range. GOAL — " + scorer.name + " scores for " + run.studio + ".", kind: "goal", playerId: scorer.id });
        }
        if (attackHome) homeScore += 1; else awayScore += 1;
      } else {
        phase = "shot";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        events.push({ minute: nextMinute, text: scorer.name + " gets the chance and shoots — saved.", kind: "shot", playerId: scorer.id });
      }
    } else {
      const roster = rivalArcballRoster(rival, state.seasonYear);
      const attacker = rivalAttackPick(roster, rng());
      activeRivalName = attacker.name;
      if (scored) {
        phase = "goal";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        if (attackHome) homeScore += 1; else awayScore += 1;
        events.push({ minute: nextMinute, text: attacker.name + " breaks through. GOAL — " + attacker.name + " scores for " + rival.name + ".", kind: "goal" });
      } else {
        phase = "shot";
        if (attackHome) homeOnTarget += 1; else awayOnTarget += 1;
        events.push({ minute: nextMinute, text: attacker.name + " gets a shooting lane — stopped by " + run.studio + ".", kind: "shot" });
      }
    }
  } else if (rng() < .34) {
    phase = "defence";
    events.push({
      minute: nextMinute,
      text: isPlayerAttack ? "The passing move is read and cut out before the final ball." : run.studio + " reads the build-up and clears.",
      kind: "defence",
    });
  } else {
    phase = rng() < .45 ? "midfield" : rng() < .55 ? "breakaway" : "buildup";
    const carrierName = isPlayerAttack
      ? run.staff.find((s) => s.id === activePlayerId)?.name
      : activeRivalName;
    events.push({
      minute: nextMinute,
      text: phase === "breakaway"
        ? (carrierName ?? "The ball carrier") + " drives into space, but the opening closes."
        : phase === "midfield"
          ? (carrierName ?? "The ball carrier") + " keeps the move alive through midfield."
          : (carrierName ?? "The ball carrier") + " recycles possession and builds again.",
      kind: "info",
      playerId: isPlayerAttack ? activePlayerId : undefined,
    });
  }

  const intensityCost: Record<ArcballIntensity, number> = { calm: .45, normal: .67, push: .90, allin: 1.20 };
  const extraPress = (arcballStateOf(run).approach === "press" || instruction === "press") ? .08 : 0;
  const effort = { ...match.effort };
  for (const member of arcballLineupStaff(run)) effort[member.id] = (effort[member.id] ?? 0) + intensityCost[intensity] + extraPress;

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

function resolveFixtureScores(state: ArcballState, fixtureId: string, homeScore: number, awayScore: number, resolvedBy: ArcballFixture["resolvedBy"]): ArcballState {
  return {
    ...state,
    fixtures: state.fixtures.map((f) => f.id === fixtureId ? { ...f, homeScore, awayScore, resolvedBy } : f),
  };
}

export function finishArcballMatch(run: RunState, match: ArcballMatchState, resolvedBy: "watch" | "instant" | "auto" = "watch"): RunState | null {
  if (match.minute < 90) return null;
  let state = cleanArcballRoster(run, arcballStateOf(run));
  const fixture = state.fixtures.find((f) => f.id === match.fixtureId);
  if (!fixture || fixture.homeScore !== undefined) return null;
  state = resolveFixtureScores(state, fixture.id, match.homeScore, match.awayScore, resolvedBy);
  const playerScore = match.playerIsHome ? match.homeScore : match.awayScore;
  const opponentScore = match.playerIsHome ? match.awayScore : match.homeScore;
  const win = playerScore > opponentScore;
  const draw = playerScore === opponentScore;
  const tokenGain = resultTokenReward(playerScore, opponentScore);
  const rows = Object.entries(match.playerStats)
    .map(([id, row]) => ({ id, ...row }))
    .sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists);
  const mvpId = rows[0]?.id;
  const seasonScale = 1 + Math.min(1.5, Math.max(0, state.seasonYear - 1) * .05);
  const progress = { ...state.players };
  let staff = run.staff.map((member) => {
    const stat = match.playerStats[member.id];
    if (!stat) return member;
    const mvp = member.id === mvpId;
    const fanGain = Math.round((80 + stat.goals * 700 + stat.assists * 350 + (win ? 180 : draw ? 90 : 30) + (mvp ? 1200 : 0)) * seasonScale);
    const prior = progress[member.id] ?? freshProgress();
    progress[member.id] = {
      ...prior,
      appearances: prior.appearances + 1,
      goals: prior.goals + stat.goals,
      assists: prior.assists + stat.assists,
      wins: prior.wins + (win ? 1 : 0),
      playerOfMatch: prior.playerOfMatch + (mvp ? 1 : 0),
      arcballFans: prior.arcballFans + fanGain,
    };
    return {
      ...member,
      stamina: Math.max(0, member.stamina - Math.round(match.effort[member.id] ?? 10)),
      creatorFans: Math.max(0, Math.round((member.creatorFans ?? 0) + fanGain)),
    };
  });
  const studioFans = Math.round((win ? 500 : draw ? 250 : 100) + playerScore * 100);
  const opponent = arcballTeamName(run, match.playerIsHome ? fixture.awayId : fixture.homeId);
  state = { ...state, players: progress, tokens: state.tokens + tokenGain };
  const resultText = run.studio + " " + playerScore + "–" + opponentScore + " " + opponent;
  return {
    ...run,
    arcball: state,
    staff,
    fans: run.fans + studioFans,
    fansThisWeek: (run.fansThisWeek ?? 0) + studioFans,
    notices: [
      ...run.notices,
      "⚽ ARCBALL: " + resultText + " · +" + tokenGain + " Arc Tokens · +" + studioFans.toLocaleString("en-GB") + " studio fans" + (mvpId ? " · " + (run.staff.find((s) => s.id === mvpId)?.name ?? "a player") + " Player of the Match" : "") + ".",
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
  const hn = rivalTeamNumbers(home, fixture.seasonYear);
  const an = rivalTeamNumbers(away, fixture.seasonYear);
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
  let out = run;
  let state = cleanArcballRoster(out, arcballStateOf(out));
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
    state = completeArcballSeason(out, state);
    const last = state.history[state.history.length - 1];
    const notices = [...out.notices];
    if (last?.year === currentYear - 1) {
      notices.push(last.title
        ? "🏆 ARCBALL CHAMPIONS — +" + 40 + " Arc Tokens and 1 Championship Spotlight."
        : "⚽ Arcball season complete — " + ordinal(last.position) + " place" + (last.position <= 3 ? " · placement tokens awarded." : "."));
    }
    state = {
      ...state,
      seasonYear: currentYear,
      fixtures: buildArcballFixtures(currentYear),
      seasonPurchases: { tier1: 0, tier2: 0 },
    };
    out = { ...out, arcball: state, notices: notices.slice(-40) };
  }

  state = cleanArcballRoster(out, arcballStateOf(out));
  const fixtures = state.fixtures.map((fixture) => {
    if (fixture.homeScore !== undefined || fixture.week > out.week) return fixture;
    if (fixture.homeId === "player" || fixture.awayId === "player") return fixture;
    return simulateRivalFixture(out, fixture);
  });
  state = { ...state, fixtures };
  out = { ...out, arcball: state };

  const overdue = arcballStateOf(out).fixtures
    .filter((f) => (f.homeId === "player" || f.awayId === "player") && f.homeScore === undefined && f.week < out.week)
    .sort((a, b) => a.week - b.week);
  for (const fixture of overdue) {
    out = arcballReady(out) ? (instantResolveArcballFixture(out, fixture.id, "auto") ?? out) : forfeitPlayerFixture(out, fixture);
  }

  const due = playableArcballFixture(out);
  if (due && due.week === out.week) {
    const opponent = arcballTeamName(out, due.homeId === "player" ? due.awayId : due.homeId);
    out = { ...out, notices: [...out.notices, "⚽ ARCBALL MATCH WEEK — " + out.studio + " vs " + opponent + ". Manage it from MORE → ARCBALL or let it auto-sim next week."].slice(-40) };
  }
  return out;
}

function ordinal(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return n + "st";
  if (n % 10 === 2 && n % 100 !== 12) return n + "nd";
  if (n % 10 === 3 && n % 100 !== 13) return n + "rd";
  return n + "th";
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
  if (!member || !drill || !state.unlocked || !state.registered.includes(staffId) || state.tokens < drill.cost) return null;
  const progress = ensurePlayerProgress(state, staffId);
  if (progress.lastTrainingWeek === run.week) return null;
  const base = arcballBaseProfile(member);
  const cap = Math.max(base.stats[drill.primary], 55 + Math.round(base.potential * .45));
  const current = arcballProfile(member, progress).stats[drill.primary];
  const primaryGain = Math.max(0, Math.min(drill.gain, cap - current));
  if (primaryGain <= 0) return null;
  const boosts = { ...(progress.boosts ?? {}) };
  boosts[drill.primary] = (boosts[drill.primary] ?? 0) + primaryGain;
  if (drill.secondary && drill.secondaryGain) boosts[drill.secondary] = (boosts[drill.secondary] ?? 0) + drill.secondaryGain;
  if (drill.penalty) {
    const r = seeded("arcball-drill|" + staffId + "|" + drill.id + "|" + run.week);
    if (r() < .28) boosts[drill.penalty] = (boosts[drill.penalty] ?? 0) - 1;
  }
  state = {
    ...state,
    tokens: state.tokens - drill.cost,
    players: { ...state.players, [staffId]: { ...progress, boosts, lastTrainingWeek: run.week } },
  };
  return {
    ...run,
    arcball: state,
    staff: run.staff.map((s) => s.id === staffId ? { ...s, stamina: Math.max(0, s.stamina - drill.stamina) } : s),
    notices: [...run.notices, "⚽ " + member.name + " completes " + drill.name + ": +" + primaryGain + " " + drill.primary.toUpperCase() + " (−" + drill.cost + " Arc Tokens, −" + drill.stamina + " energy)."].slice(-40),
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
