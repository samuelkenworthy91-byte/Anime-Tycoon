from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected at least {count} occurrence(s), found {found}: {old[:140]!r}")
    p.write_text(text.replace(old, new, count))


def write(path: str, content: str) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)


big_three = r'''import type { AnimeType, Draft, GenreId } from "./data";
import { playerCraftFor } from "./awards";
import { merchValueOf } from "./franchise";
import type { RivalFranchise, RivalRelease, RivalStudio } from "./rivals";
import type { RunState } from "./state";

export const BIG_THREE_START_WEEK = 5 * 48; // opening of industry Year 6
export const BIG_THREE_MAX_SLOTS = 3;
export const BIG_THREE_MIN_SCORE = 34;
export const BIG_THREE_MIN_REACH = 55_000;
export const BIG_THREE_MIN_CRAFT_FLOOR = 32;
export const BIG_THREE_MIN_MOMENTUM = 68;
export const BIG_THREE_BREAKOUT_REACH = 120_000;
export const BIG_THREE_PLAYER_FAN_REWARD = 75_000;
export const BIG_THREE_PLAYER_RD_REWARD = 60;
export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;

export const BIG_THREE_SEED_TITLE = "Astra Breaker: Eclipse";
export const BIG_THREE_SEED_STUDIO_ID = "Sunnyrise";
export const BIG_THREE_SEED_STUDIO = "Sunnyrise";
export const BIG_THREE_SEED_POSTER_ID = "sunrise_p003";
export const BIG_THREE_SEED_FRANCHISE = "big-three:astra-breaker";

export type BigThreeOwnerType = "player" | "rival" | "network" | "rights_holder";
export type BigThreeRevealKind = "era" | "new_name";

export interface BigThreeMetrics {
  score: number;
  reach: number;
  craftFloor: number;
  momentum: number;
  culturalScore: number;
}

export interface BigThreeSlot {
  id: string;
  sourceId: string;
  title: string;
  originalStudioId: string;
  originalStudio: string;
  currentOwnerId: string;
  currentOwner: string;
  currentOwnerType: BigThreeOwnerType;
  player: boolean;
  recognisedWeek: number;
  recognisedYear: number;
  genres: GenreId[];
  animeType: AnimeType;
  score: number;
  reach: number;
  craftFloor: number;
  momentum: number;
  culturalScore: number;
  posterId: string | null;
  franchiseKey: string | null;
  licensedIpId: string | null;
  draft: Draft | null;
  protag: string | null;
}

export interface BigThreeReveal {
  id: string;
  kind: BigThreeRevealKind;
  slotId: string;
}

export interface BigThreeState {
  introduced: boolean;
  slots: BigThreeSlot[];
  pendingReveals: BigThreeReveal[];
  lastRivalScanWeek: number;
}

export interface BigThreePlayerReleaseInput {
  projectId: string;
  draft: Draft;
  score: number;
  points: { story: number; art: number; sound: number };
  reach: number;
  franchiseKey: string;
}

const yearOf = (week: number) => Math.floor(Math.max(0, week) / 48) + 1;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

export const initialBigThreeState = (): BigThreeState => ({
  introduced: false,
  slots: [],
  pendingReveals: [],
  lastRivalScanWeek: BIG_THREE_START_WEEK - 1,
});

function isOwnerType(value: unknown): value is BigThreeOwnerType {
  return value === "player" || value === "rival" || value === "network" || value === "rights_holder";
}

function migrateSlot(raw: unknown): BigThreeSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Partial<BigThreeSlot>;
  if (!s.id || !s.title || !s.sourceId || !s.originalStudio) return null;
  return {
    id: String(s.id),
    sourceId: String(s.sourceId),
    title: String(s.title),
    originalStudioId: String(s.originalStudioId ?? s.originalStudio),
    originalStudio: String(s.originalStudio),
    currentOwnerId: String(s.currentOwnerId ?? s.originalStudioId ?? s.originalStudio),
    currentOwner: String(s.currentOwner ?? s.originalStudio),
    currentOwnerType: isOwnerType(s.currentOwnerType) ? s.currentOwnerType : (s.player ? "player" : "rival"),
    player: !!s.player,
    recognisedWeek: typeof s.recognisedWeek === "number" ? s.recognisedWeek : BIG_THREE_START_WEEK,
    recognisedYear: typeof s.recognisedYear === "number" ? s.recognisedYear : yearOf(s.recognisedWeek ?? BIG_THREE_START_WEEK),
    genres: Array.isArray(s.genres) ? s.genres : [],
    animeType: s.animeType === "shojo" ? "shojo" : "shonen",
    score: typeof s.score === "number" ? s.score : 0,
    reach: typeof s.reach === "number" ? s.reach : 0,
    craftFloor: typeof s.craftFloor === "number" ? s.craftFloor : 0,
    momentum: typeof s.momentum === "number" ? s.momentum : 0,
    culturalScore: typeof s.culturalScore === "number" ? s.culturalScore : 0,
    posterId: typeof s.posterId === "string" ? s.posterId : null,
    franchiseKey: typeof s.franchiseKey === "string" ? s.franchiseKey : null,
    licensedIpId: typeof s.licensedIpId === "string" ? s.licensedIpId : null,
    draft: s.draft && typeof s.draft === "object" ? s.draft as Draft : null,
    protag: typeof s.protag === "string" ? s.protag : null,
  };
}

export function migrateBigThreeState(raw: unknown): BigThreeState {
  if (!raw || typeof raw !== "object") return initialBigThreeState();
  const b = raw as Partial<BigThreeState>;
  const slots = (Array.isArray(b.slots) ? b.slots : []).map(migrateSlot).filter((x): x is BigThreeSlot => !!x).slice(0, BIG_THREE_MAX_SLOTS);
  const slotIds = new Set(slots.map((slot) => slot.id));
  const pendingReveals = (Array.isArray(b.pendingReveals) ? b.pendingReveals : []).flatMap((rawReveal) => {
    if (!rawReveal || typeof rawReveal !== "object") return [];
    const reveal = rawReveal as Partial<BigThreeReveal>;
    if (!reveal.id || !reveal.slotId || !slotIds.has(String(reveal.slotId))) return [];
    return [{ id: String(reveal.id), kind: reveal.kind === "era" ? "era" as const : "new_name" as const, slotId: String(reveal.slotId) }];
  });
  return {
    introduced: b.introduced === true || slots.length > 0,
    slots,
    pendingReveals,
    lastRivalScanWeek: typeof b.lastRivalScanWeek === "number" ? b.lastRivalScanWeek : BIG_THREE_START_WEEK - 1,
  };
}

export function bigThreeQualifies(metrics: BigThreeMetrics): boolean {
  return (
    metrics.score >= BIG_THREE_MIN_SCORE &&
    metrics.reach >= BIG_THREE_MIN_REACH &&
    metrics.craftFloor >= BIG_THREE_MIN_CRAFT_FLOOR &&
    (metrics.momentum >= BIG_THREE_MIN_MOMENTUM || metrics.reach >= BIG_THREE_BREAKOUT_REACH)
  );
}

function culturalScore(score: number, reach: number, craftFloor: number, momentum: number): number {
  return Math.round((score * 5 + Math.min(80, reach / 2_000) + craftFloor * 1.5 + momentum) * 10) / 10;
}

function playerMomentum(run: RunState, franchiseKey: string, reach: number): number {
  const fr = run.franchises[franchiseKey];
  if (!fr) return reach >= BIG_THREE_BREAKOUT_REACH ? 72 : 0;
  return clamp(Math.round(
    fr.popularity * 0.55 +
    Math.min(24, fr.entries.length * 7) +
    Math.min(18, fr.lifetimeFans / 5_000) +
    (fr.cult ? 8 : 0)
  ), 0, 100);
}

function rivalMomentum(studio: RivalStudio, release: RivalRelease): number {
  const fr = studio.franchises.find((f) => f.key === release.franchiseKey || f.baseTitle === release.title);
  const popularity = fr?.popularity ?? clamp(Math.round(18 + release.score * 1.6 + (release.hallOfFame ? 10 : 0)), 0, 100);
  const entries = fr?.entries ?? 1;
  return clamp(Math.round(
    popularity * 0.58 +
    Math.min(22, entries * 7) +
    Math.min(18, release.fans / 4_000) +
    Math.min(8, Math.max(0, studio.momentum) / 3)
  ), 0, 100);
}

function seedSlot(): BigThreeSlot {
  return {
    id: "big-three-slot-1",
    sourceId: "seed:sunnyrise:astra-breaker",
    title: BIG_THREE_SEED_TITLE,
    originalStudioId: BIG_THREE_SEED_STUDIO_ID,
    originalStudio: BIG_THREE_SEED_STUDIO,
    currentOwnerId: BIG_THREE_SEED_STUDIO_ID,
    currentOwner: BIG_THREE_SEED_STUDIO,
    currentOwnerType: "rival",
    player: false,
    recognisedWeek: BIG_THREE_START_WEEK,
    recognisedYear: 6,
    genres: ["mecha", "space"],
    animeType: "shonen",
    score: 38,
    reach: 180_000,
    craftFloor: 48,
    momentum: 96,
    culturalScore: 404,
    posterId: BIG_THREE_SEED_POSTER_ID,
    franchiseKey: BIG_THREE_SEED_FRANCHISE,
    licensedIpId: null,
    draft: null,
    protag: null,
  };
}

function seedRivalRelease(run: RunState): RunState {
  const seeded = seedSlot();
  const studios = run.rivalWorld.studios.map((studio) => {
    if (studio.id !== BIG_THREE_SEED_STUDIO_ID && studio.name !== BIG_THREE_SEED_STUDIO) return studio;
    const exists = studio.releases.some((release) => release.title === BIG_THREE_SEED_TITLE && release.week === BIG_THREE_START_WEEK);
    if (exists) return studio;
    const release: RivalRelease = {
      title: BIG_THREE_SEED_TITLE,
      studioId: studio.id,
      studio: studio.name,
      score: 38,
      week: BIG_THREE_START_WEEK,
      year: 6,
      genres: ["mecha", "space"],
      animeType: "shonen",
      revenue: 4_200_000,
      fans: 180_000,
      kind: "original",
      hallOfFame: true,
      craft: { story: 52, art: 68, sound: 48 },
      posterId: BIG_THREE_SEED_POSTER_ID,
      franchiseKey: BIG_THREE_SEED_FRANCHISE,
      licensedIpId: null,
    };
    const franchise: RivalFranchise = {
      key: BIG_THREE_SEED_FRANCHISE,
      baseTitle: BIG_THREE_SEED_TITLE,
      genres: ["mecha", "space"],
      animeType: "shonen",
      season: 1,
      popularity: 96,
      bestScore: 38,
      lastScore: 38,
      lastEntryWeek: BIG_THREE_START_WEEK,
      entries: 1,
      posterId: BIG_THREE_SEED_POSTER_ID,
      licensedIpId: null,
    };
    const count = Math.max(0, studio.releasesCount);
    return {
      ...studio,
      reputation: Math.min(100, studio.reputation + 10),
      momentum: Math.min(30, studio.momentum + 12),
      revenue: studio.revenue + release.revenue,
      fans: studio.fans + release.fans,
      releasesCount: count + 1,
      hits: studio.hits + 1,
      masterpieces: studio.masterpieces + 1,
      avgScore: Math.round(((studio.avgScore * count + release.score) / (count + 1)) * 10) / 10,
      releases: [...studio.releases, release].slice(-60),
      franchises: studio.franchises.some((fr) => fr.key === BIG_THREE_SEED_FRANCHISE) ? studio.franchises : [...studio.franchises, franchise],
      posterRecent: [...(studio.posterRecent ?? []).filter((id) => id !== BIG_THREE_SEED_POSTER_ID), BIG_THREE_SEED_POSTER_ID].slice(-10),
    };
  });
  return { ...run, rivalWorld: { ...run.rivalWorld, studios } };
}

export function resolveBigThreeSlotOwner(run: RunState, slot: BigThreeSlot): BigThreeSlot {
  if (slot.franchiseKey && slot.player) {
    const fr = run.franchises[slot.franchiseKey];
    if (fr?.soldTo) {
      return {
        ...slot,
        currentOwnerId: fr.soldTo.id,
        currentOwner: fr.soldTo.name,
        currentOwnerType: fr.soldTo.kind === "rival" ? "rival" : "network",
      };
    }
  }
  if (slot.licensedIpId) {
    if (run.ipMarket.owned[slot.licensedIpId]) {
      return { ...slot, currentOwnerId: "player", currentOwner: run.studio, currentOwnerType: "player" };
    }
    const rivalId = run.ipMarket.rivalOwned[slot.licensedIpId];
    if (rivalId) {
      const rival = run.rivalWorld.studios.find((studio) => studio.id === rivalId);
      return { ...slot, currentOwnerId: rivalId, currentOwner: rival?.name ?? rivalId, currentOwnerType: "rival" };
    }
    if (slot.player) return { ...slot, currentOwnerId: "rights-holder", currentOwner: "Rights holder", currentOwnerType: "rights_holder" };
  }
  return slot;
}

export function refreshBigThreeOwnership(run: RunState): RunState {
  if (!(run.bigThree?.slots?.length)) return run;
  const slots = run.bigThree.slots.map((slot) => resolveBigThreeSlotOwner(run, slot));
  const changed = slots.some((slot, index) => {
    const before = run.bigThree.slots[index];
    return slot.currentOwnerId !== before.currentOwnerId || slot.currentOwner !== before.currentOwner || slot.currentOwnerType !== before.currentOwnerType;
  });
  return changed ? { ...run, bigThree: { ...run.bigThree, slots } } : run;
}

export function syncBigThreeEra(input: RunState): RunState {
  let run = refreshBigThreeOwnership(input);
  if (run.week < BIG_THREE_START_WEEK || run.bigThree.introduced) return run;
  run = seedRivalRelease(run);
  const slot = seedSlot();
  return {
    ...run,
    bigThree: {
      ...run.bigThree,
      introduced: true,
      slots: [slot],
      pendingReveals: [...run.bigThree.pendingReveals, { id: "big-three-era-intro", kind: "era", slotId: slot.id }],
      /* old post-Year-6 saves start competing from the moment this feature is
         introduced; we do not retroactively steal both open slots with releases
         the player never had the chance to answer. */
      lastRivalScanWeek: run.week,
    },
    notices: [...run.notices, `🌠 YEAR 6 — fans name ${BIG_THREE_SEED_TITLE} (${BIG_THREE_SEED_STUDIO}) as the first title of anime's new Big Three. Two places remain.`].slice(-40),
  };
}

export function recognisePlayerBigThreeRelease(inputRun: RunState, release: BigThreePlayerReleaseInput): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced || run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return run;
  const sourceId = `player:${release.projectId}`;
  if (run.bigThree.slots.some((slot) => slot.sourceId === sourceId)) return run;
  const craft = playerCraftFor(release.score, release.points);
  const craftFloor = Math.min(craft.story, craft.art, craft.sound);
  const momentum = playerMomentum(run, release.franchiseKey, release.reach);
  const metrics: BigThreeMetrics = {
    score: release.score,
    reach: release.reach,
    craftFloor,
    momentum,
    culturalScore: culturalScore(release.score, release.reach, craftFloor, momentum),
  };
  if (!bigThreeQualifies(metrics)) return run;

  const slot: BigThreeSlot = {
    id: `big-three-slot-${run.bigThree.slots.length + 1}`,
    sourceId,
    title: release.draft.title,
    originalStudioId: "player",
    originalStudio: run.studio,
    currentOwnerId: "player",
    currentOwner: run.studio,
    currentOwnerType: "player",
    player: true,
    recognisedWeek: run.week,
    recognisedYear: yearOf(run.week),
    genres: [...release.draft.genres],
    animeType: release.draft.animeType,
    score: release.score,
    reach: release.reach,
    craftFloor,
    momentum,
    culturalScore: metrics.culturalScore,
    posterId: null,
    franchiseKey: release.franchiseKey,
    licensedIpId: release.draft.licensedIpId ?? null,
    draft: { ...release.draft, genres: [...release.draft.genres], arcs: [...release.draft.arcs], sliders: [...release.draft.sliders] as [number, number, number] },
    protag: release.draft.protag,
  };

  let franchises = run.franchises;
  const fr = franchises[release.franchiseKey];
  if (fr) {
    const boosted = { ...fr, bigThree: true, popularity: Math.min(100, fr.popularity + 12) };
    boosted.merchValue = merchValueOf(boosted);
    franchises = { ...franchises, [release.franchiseKey]: boosted };
  }

  let ipMarket = run.ipMarket;
  const licensedIpId = release.draft.licensedIpId;
  if (licensedIpId && ipMarket.owned[licensedIpId]) {
    ipMarket = {
      ...ipMarket,
      owned: {
        ...ipMarket.owned,
        [licensedIpId]: { ...ipMarket.owned[licensedIpId], bigThreePrestige: true },
      },
      history: [...ipMarket.history, `Big Three cultural recognition: ${release.draft.title}. Renewal leverage improved.`].slice(-100),
    };
  }

  const rivalWorld = {
    ...run.rivalWorld,
    studios: run.rivalWorld.studios.map((studio) => studio.status === "collapsed" ? studio : { ...studio, rivalry: Math.min(100, studio.rivalry + 8) }),
  };

  return {
    ...run,
    fans: run.fans + BIG_THREE_PLAYER_FAN_REWARD,
    rd: run.rd + BIG_THREE_PLAYER_RD_REWARD,
    franchises,
    ipMarket,
    rivalWorld,
    bigThree: {
      ...run.bigThree,
      slots: [...run.bigThree.slots, slot],
      pendingReveals: [...run.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }],
    },
    notices: [
      ...run.notices,
      `🌠 FANDOM CONSENSUS — “${release.draft.title}” enters THE BIG THREE (+${BIG_THREE_PLAYER_FAN_REWARD.toLocaleString("en-GB")} fans, +${BIG_THREE_PLAYER_RD_REWARD} RD).`,
    ].slice(-40),
  };
}

function rivalMetrics(studio: RivalStudio, release: RivalRelease): BigThreeMetrics {
  const craftFloor = Math.min(release.craft.story, release.craft.art, release.craft.sound);
  const momentum = rivalMomentum(studio, release);
  return {
    score: release.score,
    reach: release.fans,
    craftFloor,
    momentum,
    culturalScore: culturalScore(release.score, release.fans, craftFloor, momentum),
  };
}

function rivalSlot(run: RunState, studio: RivalStudio, release: RivalRelease, metrics: BigThreeMetrics): BigThreeSlot {
  return {
    id: `big-three-slot-${run.bigThree.slots.length + 1}`,
    sourceId: `rival:${studio.id}:${release.week}:${release.title}`,
    title: release.title,
    originalStudioId: studio.id,
    originalStudio: studio.name,
    currentOwnerId: studio.id,
    currentOwner: studio.name,
    currentOwnerType: "rival",
    player: false,
    recognisedWeek: run.week,
    recognisedYear: yearOf(run.week),
    genres: [...release.genres],
    animeType: release.animeType,
    score: release.score,
    reach: release.fans,
    craftFloor: metrics.craftFloor,
    momentum: metrics.momentum,
    culturalScore: metrics.culturalScore,
    posterId: release.posterId ?? null,
    franchiseKey: release.franchiseKey ?? null,
    licensedIpId: release.licensedIpId ?? null,
    draft: null,
    protag: null,
  };
}

export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced) return run;
  const lastScan = run.bigThree.lastRivalScanWeek;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } });
  }

  const candidates = run.rivalWorld.studios.flatMap((studio) =>
    studio.releases
      .filter((release) => release.week > lastScan && release.week <= run.week && release.title !== BIG_THREE_SEED_TITLE)
      .map((release) => ({ studio, release, metrics: rivalMetrics(studio, release) }))
      .filter((candidate) => bigThreeQualifies(candidate.metrics))
  ).sort((a, b) => b.metrics.culturalScore - a.metrics.culturalScore || b.release.score - a.release.score);

  let state = { ...run.bigThree, slots: [...run.bigThree.slots], pendingReveals: [...run.bigThree.pendingReveals], lastRivalScanWeek: run.week };
  let rivalWorld = run.rivalWorld;
  const notices = [...run.notices];

  for (const candidate of candidates) {
    if (state.slots.length >= BIG_THREE_MAX_SLOTS) break;
    const sourceId = `rival:${candidate.studio.id}:${candidate.release.week}:${candidate.release.title}`;
    if (state.slots.some((slot) => slot.sourceId === sourceId)) continue;
    const stagedRun = { ...run, bigThree: state };
    const slot = rivalSlot(stagedRun, candidate.studio, candidate.release, candidate.metrics);
    state = {
      ...state,
      slots: [...state.slots, slot],
      pendingReveals: [...state.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }],
    };
    rivalWorld = {
      ...rivalWorld,
      studios: rivalWorld.studios.map((studio) => studio.id === candidate.studio.id ? {
        ...studio,
        fans: studio.fans + 50_000,
        reputation: Math.min(100, studio.reputation + 8),
        momentum: Math.min(30, studio.momentum + 8),
      } : studio),
    };
    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);
  }

  return refreshBigThreeOwnership({ ...run, rivalWorld, bigThree: state, notices: notices.slice(-40) });
}

export function pendingBigThreeReveal(run: RunState): { reveal: BigThreeReveal; slot: BigThreeSlot } | null {
  const reveal = run.bigThree.pendingReveals[0];
  if (!reveal) return null;
  const slot = run.bigThree.slots.find((candidate) => candidate.id === reveal.slotId);
  return slot ? { reveal, slot: resolveBigThreeSlotOwner(run, slot) } : null;
}

export function acknowledgeBigThreeReveal(run: RunState, revealId: string): RunState {
  return {
    ...run,
    bigThree: {
      ...run.bigThree,
      pendingReveals: run.bigThree.pendingReveals.filter((reveal) => reveal.id !== revealId),
    },
  };
}
'''
write("game_source/src/engine/bigThree.ts", big_three)

board = r'''import { Crown, Lock, Star } from "lucide-react";
import { castById, GENRES } from "../engine/data";
import { ipById } from "../engine/ip";
import { resolveBigThreeSlotOwner, type BigThreeSlot } from "../engine/bigThree";
import { rivalPosterById } from "../engine/rivalPosters";
import type { RunState } from "../engine/state";
import Poster, { PosterDecorationLayer, hofDesign, titleTextStyle } from "./Poster";

function FallbackPoster({ slot }: { slot: BigThreeSlot }) {
  const design = hofDesign({
    title: slot.title,
    genres: slot.genres,
    animeType: slot.animeType,
    protag: slot.protag ?? slot.title,
    score: slot.score,
  });
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl">
      <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 30%, ${design.primary.color}bb 0%, #151021 54%, #08060f 100%)` }} />
      <PosterDecorationLayer design={design} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05030a] via-[#05030acc] to-transparent px-3 pb-4 pt-14 text-center">
        <div style={titleTextStyle(design, 22)}>{slot.title}</div>
      </div>
    </div>
  );
}

export function BigThreePoster({ slot, studio }: { slot: BigThreeSlot; studio: string }) {
  const licensed = slot.licensedIpId ? ipById(slot.licensedIpId) : null;
  if (licensed?.posterAsset) {
    return <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl"><img src={licensed.posterAsset} alt={`${slot.title} poster`} className="absolute inset-0 h-full w-full object-cover" /></div>;
  }
  if (slot.player && slot.draft) {
    const lead = castById(slot.draft.protag);
    return <Poster draft={slot.draft} studio={studio} score={slot.score} portrait={{ img: lead.img, name: slot.draft.protagName || lead.name }} className="w-full shadow-xl" />;
  }
  const rival = slot.posterId ? rivalPosterById(slot.posterId) : null;
  if (rival) {
    return <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-xl"><img src={rival.img} alt={`${slot.title} poster`} className="absolute inset-0 h-full w-full object-cover" /></div>;
  }
  return <FallbackPoster slot={slot} />;
}

export default function BigThreeBoard({ run }: { run: RunState }) {
  const slots = Array.from({ length: 3 }, (_, index) => run.bigThree.slots[index] ? resolveBigThreeSlotOwner(run, run.bigThree.slots[index]) : null);
  return (
    <section className="mb-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-panel2/80 to-viol/10 p-3">
      <div className="flex items-center gap-2">
        <Crown size={16} className="text-gold" />
        <div>
          <div className="font-display text-sm font-black tracking-wider text-gold">THE BIG THREE</div>
          <div className="text-[9px] text-paper/50">Fan-decided cultural canon · three permanent names for this era</div>
        </div>
      </div>
      {!run.bigThree.introduced && <div className="mt-3 rounded-xl border border-dashed border-line p-3 text-center text-[10px] text-paper/45"><Lock size={14} className="mx-auto mb-1"/>The cultural conversation changes in Year 6.</div>}
      {run.bigThree.introduced && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {slots.map((slot, index) => slot ? (
            <div key={slot.id} className="rounded-xl border border-gold/30 bg-abyss/55 p-2">
              <div className="mx-auto max-w-[180px]"><BigThreePoster slot={slot} studio={slot.originalStudio} /></div>
              <div className="mt-2 flex items-start gap-1.5"><Star size={11} className="mt-0.5 shrink-0 text-gold"/><div className="min-w-0"><div className="truncate text-xs font-black text-paper">{slot.title}</div><div className="text-[9px] text-paper/50">Creator: {slot.originalStudio} · Year {slot.recognisedYear}</div></div></div>
              <div className="mt-1 text-[8px] text-paper/45">{slot.genres.map((genre) => GENRES.find((g) => g.id === genre)?.label ?? genre).join(" × ")} · {slot.score}/40 · {Math.round(slot.reach).toLocaleString("en-GB")} reach</div>
              {slot.currentOwner !== slot.originalStudio && <div className="mt-1 rounded border border-cyanx/25 bg-cyanx/5 px-1.5 py-1 text-[8px] text-cyanx">Current rights: {slot.currentOwner} · creator credit remains {slot.originalStudio}</div>}
            </div>
          ) : (
            <div key={`open-${index}`} className="flex min-h-48 items-center justify-center rounded-xl border border-dashed border-gold/25 bg-abyss/30 p-3 text-center"><div><div className="font-display text-lg font-black text-gold/35">SLOT {index + 1}</div><div className="mt-1 text-[9px] text-paper/35">UNCLAIMED<br/>FANDOM IS WATCHING</div></div></div>
          ))}
        </div>
      )}
    </section>
  );
}
'''
write("game_source/src/components/BigThreeBoard.tsx", board)

reveal_component = r'''import { Crown, Sparkles } from "lucide-react";
import { acknowledgeBigThreeReveal, type BigThreeReveal as BigThreeRevealData, type BigThreeSlot } from "../engine/bigThree";
import type { RunState } from "../engine/state";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { BigThreePoster } from "./BigThreeBoard";

export default function BigThreeReveal({
  run,
  presentation,
  setRun,
}: {
  run: RunState;
  presentation: { reveal: BigThreeRevealData; slot: BigThreeSlot };
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const { reveal, slot } = presentation;
  const intro = reveal.kind === "era";
  const remaining = Math.max(0, 3 - run.bigThree.slots.length);
  return (
    <div className="fixed inset-0 z-[112] overflow-y-auto bg-[#05030a]/95 px-3 pb-[max(18px,env(safe-area-inset-bottom))] pt-[max(18px,env(safe-area-inset-top))] backdrop-blur-md">
      <div className="mx-auto flex min-h-full w-full max-w-3xl items-center justify-center py-3">
        <div className="anim-pop w-full overflow-hidden rounded-3xl border border-gold/55 bg-gradient-to-b from-[#211328] via-[#100b18] to-[#08060d] p-4 shadow-[0_30px_120px_rgba(0,0,0,.85)] sm:p-6">
          <div className="text-center">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-[9px] font-black tracking-[0.24em] text-gold"><Crown size={12}/> FAN CONSENSUS</div>
            <div className="mt-3 font-jp text-[10px] tracking-[0.45em] text-paper/45">CULTURAL RECOGNITION · NOT AN AWARD</div>
            <h2 className="mt-1 font-display text-2xl font-black leading-tight text-paper sm:text-4xl">{intro ? "THE BIG THREE ERA BEGINS" : "THE BIG THREE HAS A NEW NAME"}</h2>
            <p className="mx-auto mt-2 max-w-xl text-[10px] leading-relaxed text-paper/55 sm:text-xs">{intro ? "After years of releases, fandom has begun talking about three defining anime of this generation. Sunnyrise's flagship is the first name to stick. Two places are still unwritten." : `This did not come from judges or a committee. Audience reach, craft and sustained cultural momentum pushed “${slot.title}” into the conversation until the name became unavoidable.`}</p>
          </div>

          <div className="mx-auto mt-5 grid max-w-2xl gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="mx-auto w-full max-w-[220px]"><BigThreePoster slot={slot} studio={slot.originalStudio} /></div>
            <div className="space-y-2 text-center sm:text-left">
              <div className="font-display text-2xl font-black text-gold">{slot.title}</div>
              <div className="text-xs font-bold text-paper/75">{slot.originalStudio}</div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Metric label="CRITICS" value={`${slot.score}/40`} />
                <Metric label="AUDIENCE REACH" value={Math.round(slot.reach).toLocaleString("en-GB")} />
                <Metric label="CRAFT FLOOR" value={slot.craftFloor.toFixed(1)} />
                <Metric label="CULTURAL MOMENTUM" value={`${Math.round(slot.momentum)}/100`} />
              </div>
              {slot.player && <div className="rounded-xl border border-mint/35 bg-mint/8 p-2 text-[9px] text-mint"><Sparkles size={12} className="mr-1 inline"/>Your studio gains +75,000 fans, +60 RD, permanent franchise prestige and stronger renewal leverage for a licensed property.</div>}
              {!intro && <div className="text-[9px] font-bold tracking-wider text-paper/45">{remaining ? `${remaining} BIG THREE PLACE${remaining === 1 ? "" : "S"} REMAIN` : "THE ERA'S BIG THREE IS COMPLETE"}</div>}
            </div>
          </div>

          <Btn big variant="gold" className="mx-auto mt-5 w-full max-w-sm" onClick={() => { sfx.fanfare(); setRun((current) => acknowledgeBigThreeReveal(current, reveal.id)); }}>CONTINUE</Btn>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line/60 bg-black/20 p-2"><div className="text-[8px] font-black tracking-widest text-paper/35">{label}</div><div className="mt-0.5 font-display text-sm font-black text-paper">{value}</div></div>;
}
'''
write("game_source/src/components/BigThreeReveal.tsx", reveal_component)

# ---------------------------------------------------------------- state.ts
state = "game_source/src/engine/state.ts"
replace(
    state,
    'import { trailblazerProductionMult } from "./showrunnerPerks";\nimport { alignRecruitmentPool, specialisationProjectEffects } from "./specialisation";\n',
    'import { trailblazerProductionMult } from "./showrunnerPerks";\nimport { alignRecruitmentPool, specialisationProjectEffects } from "./specialisation";\nimport { initialBigThreeState, migrateBigThreeState, recognisePlayerBigThreeRelease, type BigThreeState } from "./bigThree";\n',
)
replace(
    state,
    '  /** one-off strategic spending is recorded for finance/history UI */\n  strategicSpend: { id: string; label: string; amount: number; week: number; projectId?: string }[];\n',
    '  /** Year-6+ fan-decided cultural canon. Exactly three slots can ever be filled. */\n  bigThree: BigThreeState;\n  /** one-off strategic spending is recorded for finance/history UI */\n  strategicSpend: { id: string; label: string; amount: number; week: number; projectId?: string }[];\n',
)
replace(
    state,
    '    ipMarket: initIPMarket(0),\n    strategicSpend: [],\n',
    '    ipMarket: initIPMarket(0),\n    bigThree: initialBigThreeState(),\n    strategicSpend: [],\n',
)
replace(
    state,
    '    ipMarket: migrateIPMarket((r as { ipMarket?: unknown }).ipMarket, r.week ?? 0),\n    strategicSpend: Array.isArray(r.strategicSpend) ? r.strategicSpend : [],\n',
    '    ipMarket: migrateIPMarket((r as { ipMarket?: unknown }).ipMarket, r.week ?? 0),\n    bigThree: migrateBigThreeState((r as { bigThree?: unknown }).bigThree),\n    strategicSpend: Array.isArray(r.strategicSpend) ? r.strategicSpend : [],\n',
)
replace(
    state,
    '  const run: RunState = {\n',
    '  const baseRun: RunState = {\n',
    1,
)
replace(
    state,
    '  return { run, result };\n}\n\nexport interface ShowSaleOffer {\n',
    '''  const run = recognisePlayerBigThreeRelease(baseRun, {\n    projectId,\n    draft,\n    score: result.total,\n    points: result.points,\n    reach: Math.round(result.fans),\n    franchiseKey: fkey,\n  });\n\n  return { run, result };\n}\n\nexport interface ShowSaleOffer {\n''',
)

# ---------------------------------------------------------------- App.tsx
app = "game_source/src/App.tsx"
replace(
    app,
    'import { advanceAwardsWeek, pendingNominationAnnouncement, restoreAwardNominationMetadata } from "./engine/awardCycle";\n',
    'import { advanceAwardsWeek, pendingNominationAnnouncement, restoreAwardNominationMetadata } from "./engine/awardCycle";\nimport { advanceBigThreeWeek, pendingBigThreeReveal, syncBigThreeEra } from "./engine/bigThree";\n',
)
replace(
    app,
    'import ShowrunnerLevelUpModal from "./components/ShowrunnerLevelUpModal";\n',
    'import ShowrunnerLevelUpModal from "./components/ShowrunnerLevelUpModal";\nimport BigThreeReveal from "./components/BigThreeReveal";\n',
)
replace(
    app,
    '            n = advanceAwardsWeek(n, { liveDaysAlreadyApplied: true });\n',
    '            n = advanceBigThreeWeek(advanceAwardsWeek(n, { liveDaysAlreadyApplied: true }));\n',
)
replace(
    app,
    '    const migrated = migrateRun(save.run);\n    const resumed = restoreAwardNominationMetadata(migrated, save.run.yearShows);\n',
    '    const migrated = migrateRun(save.run);\n    const restored = restoreAwardNominationMetadata(migrated, save.run.yearShows);\n    const resumed = syncBigThreeEra(restored);\n',
)
old_gate = '''  const pendingShowrunnerLevelUp = (run?.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0;\n  const pendingLevelUp = pendingShowrunnerLevelUp || !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);\n  const sellerAuctionOpen = !!run?.sellerAuction;\n  const nominationAnnouncement = run ? pendingNominationAnnouncement(run) : null;\n  const nominationAnnouncementOpen = !!nominationAnnouncement && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId;\n  const levelUpPresentationAllowed = canPresentDeferredLevelUp({\n    screen,\n    paused,\n    sellerAuctionOpen,\n    decisionEventOpen: (run?.studioEvents.length ?? 0) > 0,\n    auctionForecastOpen: !!run?.ipMarket.pendingPromptId,\n  }) && !nominationAnnouncementOpen;\n'''
new_gate = '''  const pendingShowrunnerLevelUp = (run?.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0;\n  const pendingLevelUp = pendingShowrunnerLevelUp || !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);\n  const sellerAuctionOpen = !!run?.sellerAuction;\n  const bigThreePresentation = run ? pendingBigThreeReveal(run) : null;\n  const bigThreeRevealOpen = !!bigThreePresentation && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId;\n  const nominationAnnouncement = run ? pendingNominationAnnouncement(run) : null;\n  const nominationAnnouncementOpen = !!nominationAnnouncement && screen === "office" && !paused && !sellerAuctionOpen && (run?.studioEvents.length ?? 0) === 0 && !run?.ipMarket.pendingPromptId && !bigThreeRevealOpen;\n  const levelUpPresentationAllowed = canPresentDeferredLevelUp({\n    screen,\n    paused,\n    sellerAuctionOpen,\n    decisionEventOpen: (run?.studioEvents.length ?? 0) > 0,\n    auctionForecastOpen: !!run?.ipMarket.pendingPromptId,\n  }) && !nominationAnnouncementOpen && !bigThreeRevealOpen;\n'''
replace(app, old_gate, new_gate)
replace(
    app,
    '  useEffect(() => {\n    if (nominationAnnouncementOpen) setTimeSpeed(0);\n  }, [nominationAnnouncementOpen]);\n',
    '  useEffect(() => {\n    if (nominationAnnouncementOpen) setTimeSpeed(0);\n  }, [nominationAnnouncementOpen]);\n  useEffect(() => {\n    if (bigThreeRevealOpen) setTimeSpeed(0);\n  }, [bigThreeRevealOpen]);\n',
)
replace(
    app,
    '        {run && nominationAnnouncementOpen && (\n          <AwardsNominationAnnouncement run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n',
    '        {run && bigThreeRevealOpen && bigThreePresentation && (\n          <BigThreeReveal run={run} presentation={bigThreePresentation} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n        {run && nominationAnnouncementOpen && (\n          <AwardsNominationAnnouncement run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />\n        )}\n\n',
)

# ---------------------------------------------------------------- Office.tsx
_ = Path("game_source/src/components/Office.tsx")
replace(
    "game_source/src/components/Office.tsx",
    'import { AWARD_CATEGORIES, awardQualificationText } from "../engine/awards";\n',
    'import { AWARD_CATEGORIES, awardQualificationText } from "../engine/awards";\nimport BigThreeBoard from "./BigThreeBoard";\n',
)
replace(
    "game_source/src/components/Office.tsx",
    '        <Modal title="STUDIO RECORDS" onClose={() => setModal(null)}>\n          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">\n',
    '        <Modal title="STUDIO RECORDS" onClose={() => setModal(null)}>\n          <BigThreeBoard run={run} />\n          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">\n',
)

# ---------------------------------------------------------------- franchise.ts
replace(
    "game_source/src/engine/franchise.ts",
    '  /** irreversible sale of the original IP to an outside buyer */\n  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };\n',
    '  /** irreversible sale of the original IP to an outside buyer */\n  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };\n  /** permanent cultural prestige once an entry is named to the era\'s Big Three */\n  bigThree?: boolean;\n',
)
replace(
    "game_source/src/engine/franchise.ts",
    '  const cultF = fr.cult ? 1.35 : 1;\n  return Math.round((base * popF * charF * cultF) / 1_000) * 1_000;\n',
    '  const cultF = fr.cult ? 1.35 : 1;\n  const bigThreeF = fr.bigThree ? 1.25 : 1;\n  return Math.round((base * popF * charF * cultF * bigThreeF) / 1_000) * 1_000;\n',
)

# ---------------------------------------------------------------- ip.ts / renewal leverage
replace(
    "game_source/src/engine/ip.ts",
    'export interface IPContract { ipId:string; acquiredWeek:number; expiresWeek:number; purchasePrice:number; royaltyRate:number; ownershipShare:number; sequelRights:boolean; merchRights:boolean; internationalRights:boolean; adaptations:number; bestScore:number; discoveredArcs:string[]; /** AUCTION_AWARD_PROVENANCE_V1 */ acquisition?: "auction"; auctionId?: string; ownerStudioId?: string; }\n',
    'export interface IPContract { ipId:string; acquiredWeek:number; expiresWeek:number; purchasePrice:number; royaltyRate:number; ownershipShare:number; sequelRights:boolean; merchRights:boolean; internationalRights:boolean; adaptations:number; bestScore:number; discoveredArcs:string[]; /** permanent negotiating leverage earned by a Big Three adaptation */ bigThreePrestige?: boolean; /** AUCTION_AWARD_PROVENANCE_V1 */ acquisition?: "auction"; auctionId?: string; ownerStudioId?: string; }\n',
)
replace(
    "game_source/src/engine/ipRenewal.ts",
    '  const legalDiscount = Math.min(0.24, Math.max(0, legalTier) * 0.045 + Math.max(0, market.legalReputation) * 0.004);\n',
    '  const prestigeLeverage = contract.bigThreePrestige ? 0.12 : 0;\n  const legalDiscount = Math.min(0.34, Math.max(0, legalTier) * 0.045 + Math.max(0, market.legalReputation) * 0.004 + prestigeLeverage);\n',
)

# ---------------------------------------------------------------- reserve seed poster from ordinary rival rolls
replace(
    "game_source/src/engine/rivalPosters.ts",
    'const BY_ID = new Map(RIVAL_POSTERS.map((p) => [p.id, p]));\n',
    'const BY_ID = new Map(RIVAL_POSTERS.map((p) => [p.id, p]));\n\n/** Dedicated Year-6 Big Three flagship art; never consumed by routine rival slates. */\nexport const BIG_THREE_RESERVED_POSTER_IDS = new Set(["sunrise_p003"]);\n',
)
replace(
    "game_source/src/engine/rivalPosters.ts",
    '  const pool = studioPool.filter((p) => p.animeTypes.includes(ctx.animeType));\n',
    '  const pool = studioPool.filter((p) => p.animeTypes.includes(ctx.animeType) && !BIG_THREE_RESERVED_POSTER_IDS.has(p.id));\n',
)

# ---------------------------------------------------------------- presentation priority
replace(
    "game_source/src/engine/presentation.ts",
    '  playerDecision: 80,\n  productionReveal: 60,\n',
    '  playerDecision: 80,\n  culturalReveal: 70,\n  productionReveal: 60,\n',
)

# ---------------------------------------------------------------- focused tests
test = r'''import { describe, expect, it } from "vitest";
import { AUCTION_IPS, initIPMarket } from "../ip";
import { ipRenewalCost } from "../ipRenewal";
import { createFranchise } from "../franchise";
import { makeProject } from "../projects";
import { pickRivalPoster } from "../rivalPosters";
import { initialRun, migrateRun } from "../state";
import {
  BIG_THREE_MAX_SLOTS,
  BIG_THREE_SEED_POSTER_ID,
  BIG_THREE_START_WEEK,
  advanceBigThreeWeek,
  bigThreeQualifies,
  pendingBigThreeReveal,
  recognisePlayerBigThreeRelease,
  resolveBigThreeSlotOwner,
  syncBigThreeEra,
} from "../bigThree";
import { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft, type GenreId } from "../data";

const draft = (title = "Crown of Tomorrow", genres: GenreId[] = ["fantasy", "mecha"], licensedIpId?: string): Draft => ({
  title,
  medium: "tv",
  budget: "blockbuster",
  scope: "standard",
  slot: "prime",
  animeType: "shonen",
  genres,
  audience: "teens",
  protag: PROTAGONISTS[0].id,
  protagName: PROTAGONISTS[0].name,
  secondary: SECONDARY[0].id,
  pet: PETS[0].id,
  villain: VILLAINS[0].id,
  arcs: ["hook", "lore", "finale"],
  sliders: [50, 50, 50],
  season: 1,
  ...(licensedIpId ? { licensedIpId, licensedArcId: `${licensedIpId}_opening`, licensedCharacters: ["Hero"] } : {}),
});

function playerCandidate(title = "Crown of Tomorrow", licensedIpId?: string) {
  let run = initialRun("Player House", "steady");
  run.week = BIG_THREE_START_WEEK;
  run = syncBigThreeEra(run);
  const d = draft(title, ["fantasy", "mecha"], licensedIpId);
  const fr = createFranchise(title, d, {
    protag: d.protag, protagName: d.protagName, secondary: d.secondary, secondaryName: "S", pet: d.pet, petName: "P", villain: d.villain, villainName: "V",
  }, { total: 36, revenue: 4_000_000, fans: 150_000, hallOfFame: true }, run.week);
  fr.popularity = 88;
  fr.lifetimeFans = 160_000;
  fr.entries.push({ kind: "season", title: `${title} II`, score: 35, revenue: 2_000_000, fans: 80_000, week: run.week, animeType: "shonen" });
  fr.lastScore = 35;
  fr.bestScore = 36;
  run.franchises = { [title]: fr };
  return { run, d };
}

function recognise(run: ReturnType<typeof initialRun>, d: Draft, projectId = "p1") {
  return recognisePlayerBigThreeRelease(run, {
    projectId,
    draft: d,
    score: 36,
    points: { story: 360, art: 390, sound: 350 },
    reach: 150_000,
    franchiseKey: d.title,
  });
}

describe("Year 6 Big Three endgame", () => {
  it("stays dormant before Year 6", () => {
    const run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK - 1;
    const next = syncBigThreeEra(run);
    expect(next.bigThree.introduced).toBe(false);
    expect(next.bigThree.slots).toHaveLength(0);
  });

  it("seeds Sunnyrise exactly once at the start of Year 6 with a persistent reveal", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    expect(run.bigThree.introduced).toBe(true);
    expect(run.bigThree.slots).toHaveLength(1);
    expect(run.bigThree.slots[0]).toMatchObject({ title: "Astra Breaker: Eclipse", originalStudio: "Sunnyrise", recognisedYear: 6, posterId: BIG_THREE_SEED_POSTER_ID });
    expect(pendingBigThreeReveal(run)?.reveal.kind).toBe("era");
    const twice = syncBigThreeEra(run);
    expect(twice.bigThree.slots).toHaveLength(1);
    expect(twice.rivalWorld.studios.find((s) => s.id === "Sunnyrise")?.releases.filter((r) => r.title === "Astra Breaker: Eclipse")).toHaveLength(1);
  });

  it("requires critics, reach, craft and cultural momentum together", () => {
    expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(true);
    expect(bigThreeQualifies({ score: 33, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 36, reach: 20_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);
    expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 20, momentum: 80, culturalScore: 400 })).toBe(false);
  });

  it("lets a qualifying player production claim an open slot and grants prestige rewards once", () => {
    const { run: base, d } = playerCandidate();
    const fans = base.fans;
    const rd = base.rd;
    const next = recognise(base, d);
    expect(next.bigThree.slots).toHaveLength(2);
    expect(next.bigThree.slots[1]).toMatchObject({ player: true, originalStudio: "Player House", title: d.title });
    expect(next.fans).toBe(fans + 75_000);
    expect(next.rd).toBe(rd + 60);
    expect(next.franchises[d.title].bigThree).toBe(true);
    const twice = recognise(next, d);
    expect(twice.bigThree.slots).toHaveLength(2);
    expect(twice.fans).toBe(next.fans);
  });

  it("does not reserve a player slot: qualifying rivals can complete the three first", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const studio = run.rivalWorld.studios.find((s) => s.id !== "Sunnyrise")!;
    const release = (title: string, week: number) => ({
      title, studioId: studio.id, studio: studio.name, score: 37, week, year: 6,
      genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 150_000,
      kind: "original" as const, hallOfFame: true, craft: { story: 52, art: 54, sound: 50 }, posterId: null, franchiseKey: title,
    });
    run = { ...run, week: BIG_THREE_START_WEEK + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Crown", BIG_THREE_START_WEEK + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    run = { ...run, week: BIG_THREE_START_WEEK + 2, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Throne", BIG_THREE_START_WEEK + 2)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(BIG_THREE_MAX_SLOTS);
    const { run: player, d } = playerCandidate("Too Late");
    const filled = { ...player, bigThree: run.bigThree };
    expect(recognise(filled, d, "late").bigThree.slots).toHaveLength(3);
  });

  it("migrates a post-Year-6 old save neutrally, then initialises once and survives JSON reload", () => {
    const old = initialRun("Legacy", "steady") as Partial<ReturnType<typeof initialRun>>;
    old.week = BIG_THREE_START_WEEK + 70;
    delete old.bigThree;
    let migrated = migrateRun(JSON.parse(JSON.stringify(old)));
    expect(migrated.bigThree.introduced).toBe(false);
    migrated = syncBigThreeEra(migrated);
    expect(migrated.bigThree.slots).toHaveLength(1);
    const reloaded = migrateRun(JSON.parse(JSON.stringify(migrated)));
    const synced = syncBigThreeEra(reloaded);
    expect(synced.bigThree.slots).toHaveLength(1);
    expect(synced.bigThree.pendingReveals).toHaveLength(1);
  });

  it("preserves creator credit while showing live ownership after an original IP sale", () => {
    const { run: base, d } = playerCandidate();
    let run = recognise(base, d);
    const slot = run.bigThree.slots[1];
    run = { ...run, franchises: { ...run.franchises, [d.title]: { ...run.franchises[d.title], soldTo: { id: "Toe-i Animation", name: "Toe-i Animation", kind: "rival", week: run.week + 1, price: 5_000_000 } } } };
    const resolved = resolveBigThreeSlotOwner(run, slot);
    expect(resolved.originalStudio).toBe("Player House");
    expect(resolved.currentOwner).toBe("Toe-i Animation");
  });

  it("gives a Big Three licensed adaptation lasting renewal leverage", () => {
    const ip = AUCTION_IPS[0];
    const { run: base, d } = playerCandidate(ip.title, ip.id);
    const contract = { ipId: ip.id, acquiredWeek: 200, expiresWeek: 300, purchasePrice: ip.rightsBaseValue, royaltyRate: ip.royaltyRate, ownershipShare: .7, sequelRights: true, merchRights: true, internationalRights: true, adaptations: 1, bestScore: 36, discoveredArcs: [] };
    let run = { ...base, ipMarket: { ...initIPMarket(base.week), owned: { [ip.id]: contract } } };
    const before = ipRenewalCost(run.ipMarket, ip.id, 0)!;
    run = recognise(run, d);
    const after = ipRenewalCost(run.ipMarket, ip.id, 0)!;
    expect(run.ipMarket.owned[ip.id].bigThreePrestige).toBe(true);
    expect(after).toBeLessThan(before);
  });

  it("keeps the seeded flagship poster out of routine rival poster rolls", () => {
    const picks = Array.from({ length: 30 }, () => pickRivalPoster({ studio: "Sunnyrise", animeType: "shonen", genres: ["mecha", "space"], rand: () => .3 })?.id);
    expect(picks).not.toContain(BIG_THREE_SEED_POSTER_ID);
  });
});
'''
write("game_source/src/engine/__tests__/big-three.test.ts", test)

print("Stage 7 patches applied")
