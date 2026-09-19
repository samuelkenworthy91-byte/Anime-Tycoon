import type { AnimeType, Draft, GenreId } from "./data";
import { playerCraftFor } from "./awards";
import { merchValueOf, zeitgeistOf } from "./franchise";
import type { RivalRelease, RivalStudio } from "./rivals";
import type { RunState } from "./state";

export const BIG_THREE_START_WEEK = 2 * 48 + 8; // Year 3, March W1
export const BIG_THREE_MAX_SLOTS = 3;
export const BIG_THREE_MIN_SCORE = 38;
export const BIG_THREE_MIN_REACH = 150_000;
export const BIG_THREE_MIN_CRAFT_FLOOR = 32;
export const BIG_THREE_MIN_MOMENTUM = 68;
export const BIG_THREE_BREAKOUT_REACH = 300_000;
export const BIG_THREE_PLAYER_FAN_REWARD = 75_000;
export const BIG_THREE_PLAYER_RD_REWARD = 60;
export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;
/** Big Three recognition is reviewed once per year in March. */
export const BIG_THREE_CHECK_MONTH_OFFSET = 8; // Jan 0-3, Feb 4-7, Mar begins at 8
export const BIG_THREE_PLAYER_SLOT3_TIEBREAK = 1.025;

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
  candidates: BigThreeSlot[];
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
  candidates: [],
  pendingReveals: [],
  lastRivalScanWeek: BIG_THREE_START_WEEK - 48,
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
  const candidates = (Array.isArray(b.candidates) ? b.candidates : []).map(migrateSlot).filter((x): x is BigThreeSlot => !!x).filter((candidate) => !slots.some((slot) => slot.sourceId === candidate.sourceId)).slice(0, 12);
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
    candidates,
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
    zeitgeistOf(fr) * 0.60 +
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
  const run = refreshBigThreeOwnership(input);
  if (run.week < BIG_THREE_START_WEEK || run.bigThree.introduced) return run;
  return {
    ...run,
    bigThree: {
      ...run.bigThree,
      introduced: true,
      slots: [],
      candidates: [],
      lastRivalScanWeek: BIG_THREE_START_WEEK - 48,
    },
    notices: [...run.notices, "🌠 YEAR 3 — the industry starts talking about a new BIG THREE. Every March, one exceptional title can be recognised. No studio can hold more than one place."].slice(-40),
  };
}

export function recognisePlayerBigThreeRelease(inputRun: RunState, release: BigThreePlayerReleaseInput): RunState {
  const run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced || run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return run;
  if (run.bigThree.slots.some((slot) => slot.originalStudioId === "player")) return run;
  const sourceId = `player:${release.projectId}`;
  if (run.bigThree.slots.some((slot) => slot.sourceId === sourceId) || run.bigThree.candidates.some((slot) => slot.sourceId === sourceId)) return run;
  const craft = playerCraftFor(release.score, release.points);
  const craftFloor = Math.min(craft.story, craft.art, craft.sound);
  const franchiseFollowing = Math.max(release.reach, run.franchises[release.franchiseKey]?.lifetimeFans ?? 0);
  const momentum = playerMomentum(run, release.franchiseKey, franchiseFollowing);
  const metrics: BigThreeMetrics = { score: release.score, reach: franchiseFollowing, craftFloor, momentum, culturalScore: culturalScore(release.score, franchiseFollowing, craftFloor, momentum) };
  if (!bigThreeQualifies(metrics)) return run;
  const candidate: BigThreeSlot = {
    id: `big-three-candidate-${release.projectId}`, sourceId, title: release.draft.title,
    originalStudioId: "player", originalStudio: run.studio, currentOwnerId: "player", currentOwner: run.studio, currentOwnerType: "player", player: true,
    recognisedWeek: run.week, recognisedYear: yearOf(run.week), genres: [...release.draft.genres], animeType: release.draft.animeType,
    score: release.score, reach: metrics.reach, craftFloor, momentum, culturalScore: metrics.culturalScore, posterId: null,
    franchiseKey: release.franchiseKey, licensedIpId: release.draft.licensedIpId ?? null,
    draft: { ...release.draft, genres: [...release.draft.genres], arcs: [...release.draft.arcs], sliders: [...release.draft.sliders] as [number, number, number] },
    protag: release.draft.protag,
  };
  return { ...run, bigThree: { ...run.bigThree, candidates: [...run.bigThree.candidates, candidate].sort((a,b)=>b.culturalScore-a.culturalScore||b.score-a.score).slice(0,12) }, notices: [...run.notices, `🌠 CULTURAL PHENOMENON — “${candidate.title}” has entered Big Three speculation. A place can only be named after the current 48-week consensus window settles.`].slice(-40) };
}

function promotePlayerCandidate(run: RunState, candidate: BigThreeSlot): RunState {
  const slot: BigThreeSlot = { ...candidate, id: `big-three-slot-${run.bigThree.slots.length + 1}`, recognisedWeek: run.week, recognisedYear: yearOf(run.week) };
  let franchises = run.franchises;
  if (slot.franchiseKey) {
    const fr = franchises[slot.franchiseKey];
    if (fr) { const boosted = { ...fr, bigThree: true, popularity: Math.min(100, fr.popularity + 12) }; boosted.merchValue = merchValueOf(boosted); franchises = { ...franchises, [slot.franchiseKey]: boosted }; }
  }
  let ipMarket = run.ipMarket;
  if (slot.licensedIpId && ipMarket.owned[slot.licensedIpId]) ipMarket = { ...ipMarket, owned: { ...ipMarket.owned, [slot.licensedIpId]: { ...ipMarket.owned[slot.licensedIpId], bigThreePrestige: true } }, history: [...ipMarket.history, `Big Three cultural recognition: ${slot.title}. Renewal leverage improved.`].slice(-100) };
  const rivalWorld = { ...run.rivalWorld, studios: run.rivalWorld.studios.map((studio) => studio.status === "collapsed" ? studio : { ...studio, rivalry: Math.min(100, studio.rivalry + 8) }) };
  return { ...run, fans: run.fans + BIG_THREE_PLAYER_FAN_REWARD, rd: run.rd + BIG_THREE_PLAYER_RD_REWARD, franchises, ipMarket, rivalWorld,
    bigThree: { ...run.bigThree, slots: [...run.bigThree.slots, slot], candidates: [], pendingReveals: [...run.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }] },
    notices: [...run.notices, `🌠 FANDOM CONSENSUS — “${slot.title}” enters THE BIG THREE (+${BIG_THREE_PLAYER_FAN_REWARD.toLocaleString("en-GB")} fans, +${BIG_THREE_PLAYER_RD_REWARD} RD). BIG THREE HALO: direct franchise releases +40%, related spin-offs/crossovers +20%, merchandise demand +60%.`].slice(-40) };
}

function rivalMetrics(studio: RivalStudio, release: RivalRelease): BigThreeMetrics {
  const craftFloor = Math.min(release.craft.story, release.craft.art, release.craft.sound);
  const momentum = rivalMomentum(studio, release);
  const priorFranchiseFans = release.franchiseKey
    ? studio.releases.filter((other) => other.franchiseKey === release.franchiseKey && !(other.week === release.week && other.title === release.title)).reduce((sum, other) => sum + other.fans, 0)
    : 0;
  const franchiseFollowing = release.fans + priorFranchiseFans;
  return {
    score: release.score,
    reach: franchiseFollowing,
    craftFloor,
    momentum,
    culturalScore: culturalScore(release.score, franchiseFollowing, craftFloor, momentum),
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
    reach: metrics.reach,
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

function recentAwardBonus(run: RunState, title: string, studioName: string, player: boolean): number {
  const ceremony = run.awardsCeremony;
  if (!ceremony?.categories?.length) return 0;
  return ceremony.categories.reduce((sum, category) => {
    const winner = category.winner;
    const sameTitle = winner.title === title;
    const sameStudio = player ? winner.player : (!winner.player && winner.studio === studioName);
    if (!sameTitle || !sameStudio) return sum;
    return sum + (category.id === "aoty" ? 38 : 12);
  }, 0);
}

const isMarchBigThreeCheck = (week: number) =>
  week >= BIG_THREE_START_WEEK && week % 48 === BIG_THREE_CHECK_MONTH_OFFSET;

export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced || !isMarchBigThreeCheck(run.week)) return run;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, candidates: [], lastRivalScanWeek: run.week } });
  }

  const usedStudios = new Set(run.bigThree.slots.map((slot) => slot.originalStudioId));
  const lastScan = run.bigThree.lastRivalScanWeek;
  const firstSlot = run.bigThree.slots.length === 0;

  const rivalCandidates = run.rivalWorld.studios
    .filter((studio) => !usedStudios.has(studio.id))
    .flatMap((studio) => studio.releases
      .filter((release) => release.week > lastScan && release.week <= run.week)
      .map((release) => {
        const metrics = rivalMetrics(studio, release);
        const awardBonus = firstSlot ? recentAwardBonus(run, release.title, studio.name, false) : 0;
        return { studio, release, metrics, selectionScore: metrics.culturalScore + awardBonus };
      })
      .filter((candidate) => bigThreeQualifies(candidate.metrics)))
    .sort((a,b)=>b.selectionScore-a.selectionScore||b.release.score-a.release.score);

  const playerCandidate = usedStudios.has("player")
    ? undefined
    : [...run.bigThree.candidates]
        .filter((candidate) => candidate.recognisedWeek > lastScan && candidate.recognisedWeek <= run.week)
        .filter((candidate) => !run.bigThree.slots.some((slot)=>slot.sourceId===candidate.sourceId))
        .map((candidate) => ({
          candidate,
          selectionScore: candidate.culturalScore + (firstSlot ? recentAwardBonus(run, candidate.title, run.studio, true) : 0),
        }))
        .sort((a,b)=>b.selectionScore-a.selectionScore||b.candidate.score-a.candidate.score)[0];

  const rivalCandidate = rivalCandidates[0];
  run = { ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } };

  if (!playerCandidate && !rivalCandidate) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, candidates: [] } });
  }

  const slotThreePlayerWeight = run.bigThree.slots.length === 2 ? BIG_THREE_PLAYER_SLOT3_TIEBREAK : 1;
  const playerSelectionScore = (playerCandidate?.selectionScore ?? -Infinity) * slotThreePlayerWeight;
  if (playerCandidate && (!rivalCandidate || playerSelectionScore >= rivalCandidate.selectionScore)) {
    return refreshBigThreeOwnership(promotePlayerCandidate(run, playerCandidate.candidate));
  }

  const candidate = rivalCandidate!;
  const slot = rivalSlot(run, candidate.studio, candidate.release, candidate.metrics);
  const rivalWorld = {
    ...run.rivalWorld,
    studios: run.rivalWorld.studios.map((studio) =>
      studio.id === candidate.studio.id
        ? { ...studio, fans: studio.fans + 50_000, reputation: Math.min(100, studio.reputation + 8), momentum: Math.min(30, studio.momentum + 8) }
        : studio
    ),
  };
  const remaining = BIG_THREE_MAX_SLOTS - run.bigThree.slots.length - 1;
  return refreshBigThreeOwnership({
    ...run,
    rivalWorld,
    bigThree: {
      ...run.bigThree,
      slots: [...run.bigThree.slots, slot],
      candidates: [],
      pendingReveals: [...run.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }],
    },
    notices: [...run.notices, `🌠 MARCH INDUSTRY CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${remaining} place${remaining === 1 ? "" : "s"} remain.`].slice(-40),
  });
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
