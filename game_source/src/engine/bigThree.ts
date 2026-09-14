import type { AnimeType, Draft, GenreId } from "./data";
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
export const BIG_THREE_RIVAL_GRACE_WEEKS = 48;
export const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 72;

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
      score: seeded.score,
      week: seeded.recognisedWeek,
      year: seeded.recognisedYear,
      genres: seeded.genres,
      animeType: seeded.animeType,
      revenue: 12_000_000,
      fans: 180_000,
      kind: "original",
      hallOfFame: true,
      craft: { story: 50, art: 54, sound: 48 },
      posterId: seeded.posterId,
      franchiseKey: seeded.franchiseKey ?? seeded.title,
      bigThree: true,
    };
    const franchiseKey = seeded.franchiseKey ?? seeded.title;
    const existingFranchise = studio.franchises.find((franchise) => franchise.key === franchiseKey);
    const franchises: RivalFranchise[] = existingFranchise
      ? studio.franchises.map((franchise) => franchise.key === franchiseKey ? { ...franchise, popularity: Math.max(franchise.popularity, 96), bestScore: Math.max(franchise.bestScore, seeded.score), lifetimeRevenue: franchise.lifetimeRevenue + release.revenue, entries: franchise.entries + 1, bigThree: true } : franchise)
      : [...studio.franchises, { key: franchiseKey, baseTitle: seeded.title, popularity: 96, bestScore: seeded.score, lifetimeRevenue: release.revenue, entries: 1, bigThree: true }];
    return { ...studio, releases: [...studio.releases, release], franchises };
  });
  return { ...run, rivalWorld: { ...run.rivalWorld, studios } };
}

export function syncBigThreeEra(run: RunState): RunState {
  if (run.week < BIG_THREE_START_WEEK) return run;
  if (run.bigThree.introduced) return refreshBigThreeOwnership(run);
  const slot = seedSlot();
  const introduced: BigThreeState = {
    introduced: true,
    slots: [slot],
    pendingReveals: [{ id: `big-three-reveal-${slot.id}`, kind: "era", slotId: slot.id }],
    lastRivalScanWeek: BIG_THREE_START_WEEK,
  };
  const seeded = seedRivalRelease({ ...run, bigThree: introduced });
  return {
    ...seeded,
    notices: [...seeded.notices, "🌠 THE BIG THREE ERA BEGINS — Sunnyrise's Astra Breaker: Eclipse is the first title named by fandom. Two places remain."],
  };
}

function resolvePlayerCurrentOwner(run: RunState, slot: BigThreeSlot): Pick<BigThreeSlot, "currentOwnerId" | "currentOwner" | "currentOwnerType"> {
  if (!slot.franchiseKey) return { currentOwnerId: slot.currentOwnerId, currentOwner: slot.currentOwner, currentOwnerType: slot.currentOwnerType };
  const fr = run.franchises[slot.franchiseKey];
  if (fr?.soldTo) return { currentOwnerId: fr.soldTo.id, currentOwner: fr.soldTo.name, currentOwnerType: fr.soldTo.kind === "rival" ? "rival" : "network" };
  return { currentOwnerId: run.studio, currentOwner: run.studio, currentOwnerType: "player" };
}

function resolveLicensedCurrentOwner(run: RunState, slot: BigThreeSlot): Pick<BigThreeSlot, "currentOwnerId" | "currentOwner" | "currentOwnerType"> | null {
  if (!slot.licensedIpId) return null;
  const owned = run.ipMarket.owned[slot.licensedIpId];
  if (owned && !owned.soldWeek) return { currentOwnerId: run.studio, currentOwner: run.studio, currentOwnerType: "player" };
  if (owned?.soldTo) return { currentOwnerId: owned.soldTo.id, currentOwner: owned.soldTo.name, currentOwnerType: owned.soldTo.kind === "rival" ? "rival" : "network" };
  return { currentOwnerId: "rights-holder", currentOwner: "Rights holder", currentOwnerType: "rights_holder" };
}

export function resolveBigThreeSlotOwner(run: RunState, slot: BigThreeSlot): BigThreeSlot {
  if (!slot.player) return slot;
  const licensed = resolveLicensedCurrentOwner(run, slot);
  const owner = licensed ?? resolvePlayerCurrentOwner(run, slot);
  return { ...slot, ...owner };
}

function refreshBigThreeOwnership(run: RunState): RunState {
  if (!run.bigThree.slots.some((slot) => slot.player)) return run;
  const slots = run.bigThree.slots.map((slot) => resolveBigThreeSlotOwner(run, slot));
  return { ...run, bigThree: { ...run.bigThree, slots } };
}

export function recognisePlayerBigThreeRelease(run: RunState, input: BigThreePlayerReleaseInput): RunState {
  let next = syncBigThreeEra(run);
  if (!next.bigThree.introduced || next.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return next;
  if (next.bigThree.slots.some((slot) => slot.sourceId === `player:${input.projectId}` || (slot.player && slot.title === input.draft.title && slot.recognisedWeek === next.week))) return next;
  const craft = playerCraftFor(input.points);
  const craftFloor = Math.min(craft.story, craft.art, craft.score);
  const momentum = playerMomentum(next, input.franchiseKey, input.reach);
  const metrics: BigThreeMetrics = {
    score: input.score,
    reach: input.reach,
    craftFloor,
    momentum,
    culturalScore: culturalScore(input.score, input.reach, craftFloor, momentum),
  };
  if (!bigThreeQualifies(metrics)) return next;
  const licensedIpId = input.draft.licensedIpId ?? null;
  const slot: BigThreeSlot = {
    id: `big-three-slot-${next.bigThree.slots.length + 1}`,
    sourceId: `player:${input.projectId}`,
    title: input.draft.title,
    originalStudioId: next.studio,
    originalStudio: next.studio,
    currentOwnerId: next.studio,
    currentOwner: next.studio,
    currentOwnerType: "player",
    player: true,
    recognisedWeek: next.week,
    recognisedYear: yearOf(next.week),
    genres: input.draft.genres,
    animeType: input.draft.animeType,
    score: metrics.score,
    reach: metrics.reach,
    craftFloor: metrics.craftFloor,
    momentum: metrics.momentum,
    culturalScore: metrics.culturalScore,
    posterId: null,
    franchiseKey: input.franchiseKey,
    licensedIpId,
    draft: input.draft,
    protag: input.draft.protag,
  };
  const franchises = next.franchises[input.franchiseKey]
    ? { ...next.franchises, [input.franchiseKey]: { ...next.franchises[input.franchiseKey], bigThree: true, bigThreeWeek: next.week } }
    : next.franchises;
  const ipMarket = licensedIpId && next.ipMarket.owned[licensedIpId]
    ? { ...next.ipMarket, owned: { ...next.ipMarket.owned, [licensedIpId]: { ...next.ipMarket.owned[licensedIpId], bigThreePrestige: true, bigThreeWeek: next.week } } }
    : next.ipMarket;
  return {
    ...next,
    fans: next.fans + BIG_THREE_PLAYER_FAN_REWARD,
    rd: next.rd + BIG_THREE_PLAYER_RD_REWARD,
    reputation: clamp(next.reputation + 4, 0, 100),
    franchises,
    ipMarket,
    bigThree: {
      ...next.bigThree,
      slots: [...next.bigThree.slots, slot],
      pendingReveals: [...next.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }],
    },
    notices: [...next.notices, `🌠 THE BIG THREE HAS A NEW NAME — “${slot.title}” becomes one of the era's defining anime. +${BIG_THREE_PLAYER_FAN_REWARD.toLocaleString("en-GB")} fans · +${BIG_THREE_PLAYER_RD_REWARD} RD.`],
  };
}

function rivalCandidate(studio: RivalStudio, release: RivalRelease): { metrics: BigThreeMetrics; studio: RivalStudio; release: RivalRelease } | null {
  const craftFloor = Math.min(release.craft.story, release.craft.art, release.craft.sound);
  const momentum = rivalMomentum(studio, release);
  const metrics: BigThreeMetrics = {
    score: release.score,
    reach: release.fans,
    craftFloor,
    momentum,
    culturalScore: culturalScore(release.score, release.fans, craftFloor, momentum),
  };
  return bigThreeQualifies(metrics) ? { metrics, studio, release } : null;
}

function markRivalBigThree(studio: RivalStudio, release: RivalRelease): RivalStudio {
  const releases = studio.releases.map((item) => item === release || (item.title === release.title && item.week === release.week) ? { ...item, bigThree: true } : item);
  const franchises = studio.franchises.map((franchise) => franchise.key === release.franchiseKey ? { ...franchise, bigThree: true } : franchise);
  return { ...studio, releases, franchises };
}

export function advanceBigThreeWeek(run: RunState): RunState {
  let next = syncBigThreeEra(run);
  if (!next.bigThree.introduced || next.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return refreshBigThreeOwnership(next);
  const latestRecognitionWeek = Math.max(BIG_THREE_START_WEEK, ...next.bigThree.slots.map((slot) => slot.recognisedWeek));
  const rivalConsensusDelay = next.bigThree.slots.length <= 1 ? BIG_THREE_RIVAL_GRACE_WEEKS : BIG_THREE_RIVAL_COOLDOWN_WEEKS;
  /* Fandom consensus should feel historical, not like another weekly ranking.
     Rival releases accumulate during the quiet period and compete once the
     culture has had time to settle. Player releases are deliberately not
     blocked here: no slot is reserved, but the player gets a real window to
     answer the Year-6 shock before rivals can consume both open places. */
  if (next.week < latestRecognitionWeek + rivalConsensusDelay) return refreshBigThreeOwnership(next);
  const lastScan = next.bigThree.lastRivalScanWeek;
  const existingSources = new Set(next.bigThree.slots.map((slot) => slot.sourceId));
  const candidates = next.rivalWorld.studios.flatMap((studio) => studio.releases
    .filter((release) => release.week > lastScan && release.week <= next.week && !release.bigThree)
    .flatMap((release) => {
      const sourceId = `rival:${studio.id}:${release.week}:${release.title}`;
      if (existingSources.has(sourceId)) return [];
      const candidate = rivalCandidate(studio, release);
      return candidate ? [{ ...candidate, sourceId }] : [];
    }))
    .sort((a, b) => b.metrics.culturalScore - a.metrics.culturalScore || b.release.score - a.release.score || a.release.week - b.release.week);

  let studios = next.rivalWorld.studios;
  let state: BigThreeState = { ...next.bigThree, lastRivalScanWeek: next.week };
  const notices = [...next.notices];
  for (const candidate of candidates) {
    if (state.slots.length >= BIG_THREE_MAX_SLOTS) break;
    const slot: BigThreeSlot = {
      id: `big-three-slot-${state.slots.length + 1}`,
      sourceId: candidate.sourceId,
      title: candidate.release.title,
      originalStudioId: candidate.studio.id,
      originalStudio: candidate.studio.name,
      currentOwnerId: candidate.studio.id,
      currentOwner: candidate.studio.name,
      currentOwnerType: "rival",
      player: false,
      recognisedWeek: next.week,
      recognisedYear: yearOf(next.week),
      genres: candidate.release.genres,
      animeType: candidate.release.animeType,
      score: candidate.release.score,
      reach: candidate.release.fans,
      craftFloor: candidate.metrics.craftFloor,
      momentum: candidate.metrics.momentum,
      culturalScore: candidate.metrics.culturalScore,
      posterId: candidate.release.posterId ?? null,
      franchiseKey: candidate.release.franchiseKey ?? null,
      licensedIpId: null,
      draft: null,
      protag: null,
    };
    state = {
      ...state,
      slots: [...state.slots, slot],
      pendingReveals: [...state.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }],
    };
    studios = studios.map((studio) => studio.id === candidate.studio.id ? markRivalBigThree(studio, candidate.release) : studio);
    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);
    /* At most one rival can crystallise into cultural canon in a single
       recognition window. Another name must survive a fresh consensus cycle. */
    break;
  }
  return refreshBigThreeOwnership({ ...next, bigThree: state, rivalWorld: { ...next.rivalWorld, studios }, notices });
}

export function pendingBigThreeReveal(run: RunState): { reveal: BigThreeReveal; slot: BigThreeSlot } | null {
  const reveal = run.bigThree.pendingReveals[0];
  if (!reveal) return null;
  const slot = run.bigThree.slots.find((item) => item.id === reveal.slotId);
  return slot ? { reveal, slot: resolveBigThreeSlotOwner(run, slot) } : null;
}

export function acknowledgeBigThreeReveal(run: RunState, revealId: string): RunState {
  return { ...run, bigThree: { ...run.bigThree, pendingReveals: run.bigThree.pendingReveals.filter((reveal) => reveal.id !== revealId) } };
}
