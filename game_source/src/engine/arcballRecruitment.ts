import { OFFICES, STAFF_STAT_CAP, type PointType, type Staff, type StaffRole } from "./data";
import { ensureCareer } from "./careers";
import { bumpRivalry } from "./rivals";
import { staffCapacity, type RunState } from "./state";
import {
  ARCBALL_STATS,
  arcballBaseProfile,
  arcballStateOf,
  type ArcballPlayerProgress,
  type ArcballPosition,
  type ArcballRivalPlayer,
} from "./arcball";

function hash32(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
const roll = (seed: string, n: number) => ((hash32(seed + "|" + n) % 10_000) / 10_000);

export interface RivalArcballSigningTerms {
  fee: number;
  weeklySalary: number;
  productionRole: StaffRole;
  story: number;
  art: number;
  sound: number;
  blockedReason: string | null;
}

export function rivalArcballSigningTerms(run: RunState, studioId: string, playerId: string): RivalArcballSigningTerms | null {
  const state = arcballStateOf(run);
  const player = state.rivalRosters[studioId]?.find((p) => p.id === playerId);
  const studio = run.rivalWorld.studios.find((s) => s.id === studioId);
  if (!player || !studio) return null;
  const rolePool: StaffRole[] = ["writer", "animator", "composer"];
  const productionRole = rolePool[hash32(player.id + "|role") % rolePool.length];
  /* Intentionally independent from Arcball talent: a 95-rated striker can be a
     mediocre animator, which is the central roster trade-off. */
  const story = 18 + Math.floor(roll(player.id, 1) * 48);
  const art = 18 + Math.floor(roll(player.id, 2) * 48);
  const sound = 18 + Math.floor(roll(player.id, 3) * 48);
  const fame = Math.max(0, player.fans ?? 0);
  const fee = Math.round((35_000 + player.rating * player.rating * 185 + fame * .55 + studio.rivalry * 4_000) / 1_000) * 1_000;
  const weeklySalary = Math.round((550 + player.rating * 21 + fame / 850) / 10) * 10;
  let blockedReason: string | null = null;
  if (run.staff.length >= staffCapacity(run)) blockedReason = "No staff desk available";
  else if (run.cash < fee) blockedReason = "Insufficient cash";
  return { fee, weeklySalary, productionRole, story, art, sound, blockedReason };
}

function desiredSportStats(position: ArcballPosition, rating: number): Record<(typeof ARCBALL_STATS)[number], number> {
  const low = Math.max(28, rating - 20);
  const mid = Math.max(35, rating - 9);
  const high = Math.min(99, rating + 6);
  const stats = { pace: mid, power: mid, control: mid, pass: mid, awareness: mid, finish: low };
  if (position === "keeper") Object.assign(stats, { awareness: high, control: rating, power: rating, pass: mid, pace: low, finish: low });
  if (position === "anchor") Object.assign(stats, { power: high, awareness: high, pass: rating, control: mid, pace: low, finish: low });
  if (position === "runner") Object.assign(stats, { pace: high, control: high, awareness: mid, pass: mid, power: mid, finish: mid });
  if (position === "creator") Object.assign(stats, { pass: high, control: high, awareness: rating, finish: mid, pace: mid, power: low });
  if (position === "striker") Object.assign(stats, { finish: high, pace: high, control: rating, power: mid, awareness: mid, pass: low });
  return stats;
}

function progressForSignedStar(staff: Staff, player: ArcballRivalPlayer): ArcballPlayerProgress {
  const base = arcballBaseProfile(staff);
  const desired = desiredSportStats(player.position, player.rating);
  const boosts = Object.fromEntries(ARCBALL_STATS.map((stat) => [stat, desired[stat] - base.stats[stat]]));
  return {
    boosts,
    appearances: 0, goals: 0, assists: 0, wins: 0, playerOfMatch: 0,
    arcballFans: Math.max(0, player.fans ?? 0),
    seasonAppearances: 0, seasonGoals: 0, seasonAssists: 0, seasonWins: 0, seasonPlayerOfMatch: 0,
    form: 0,
  };
}

function replacementFor(player: ArcballRivalPlayer, studioId: string, week: number): ArcballRivalPlayer {
  const seed = player.id + "|replacement|" + week;
  const first = ["Kai","Noa","Rei","Mina","Jin","Aya","Leo","Nami"][hash32(seed + "f") % 8];
  const last = ["Sato","Mori","Park","Bell","Chen","Arai","Khan","Price"][hash32(seed + "l") % 8];
  const rating = Math.max(38, Math.min(76, 44 + Math.floor(roll(seed, 5) * 25)));
  return {
    id: "rival|" + studioId + "|rookie|" + week + "|" + hash32(seed).toString(36),
    name: first + " " + last,
    look: hash32(seed + "|look") %  Math.max(1, 120),
    position: player.position,
    rating,
    potential: Math.min(99, rating + 10 + Math.floor(roll(seed, 6) * 22)),
    age: 18 + Math.floor(roll(seed, 7) * 6),
    fans: 500 + Math.floor(roll(seed, 8) * 6_000),
    seasons: 0,
  };
}

export function signRivalArcballPlayer(run: RunState, studioId: string, playerId: string): RunState | null {
  const state = arcballStateOf(run);
  const player = state.rivalRosters[studioId]?.find((p) => p.id === playerId);
  const studio = run.rivalWorld.studios.find((s) => s.id === studioId);
  const terms = rivalArcballSigningTerms(run, studioId, playerId);
  if (!player || !studio || !terms || terms.blockedReason) return null;

  const baseStaff: Staff = {
    id: player.id,
    name: player.name,
    role: terms.productionRole,
    story: terms.story,
    art: terms.art,
    sound: terms.sound,
    level: 1,
    salary: terms.weeklySalary,
    cost: terms.fee,
    stamina: 100,
    portrait: player.look,
    look: player.look,
    potential: 38 + (hash32(player.id + "|prod-pot") % 45),
    xp: 0,
    morale: 78,
    traits: [],
    joinedWeek: run.week,
    shows: [],
    creatorFans: Math.max(0, player.fans ?? 0),
    awardsWon: 0,
    bestShow: null,
  };
  const staff = ensureCareer(baseStaff, run.week);
  const replacement = replacementFor(player, studioId, run.week);
  const roster = state.rivalRosters[studioId].map((row) => row.id === playerId ? replacement : row);
  const progress = progressForSignedStar(staff, player);
  const registered = state.registered.length < 8 ? [...state.registered, staff.id] : state.registered;
  return {
    ...run,
    cash: run.cash - terms.fee,
    staff: [...run.staff, staff],
    rivalWorld: bumpRivalry(run.rivalWorld, studioId, 12),
    arcball: {
      ...state,
      registered,
      players: { ...state.players, [staff.id]: progress },
      rivalRosters: { ...state.rivalRosters, [studioId]: roster },
    },
    notices: [
      ...run.notices,
      "⚽ ARCBALL TRANSFER — " + player.name + " leaves " + studio.name + " and joins your studio. ARC " + player.rating + ", but production ability remains independent. Rivalry +" + 12 + ".",
    ].slice(-40),
  };
}
