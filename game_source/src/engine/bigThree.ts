import type { AnimeType, Draft, GenreId } from "./data";
import { playerCraftFor } from "./awards";
import { merchValueOf, zeitgeistOf } from "./franchise";
import type { RivalRelease, RivalStudio } from "./rivals";
import type { RunState } from "./state";

/** The Big Three can first be awarded in March of Year 3. */
export const BIG_THREE_START_YEAR = 3;
export const BIG_THREE_MARCH_WEEK = 8; // March W1 in the 48-week calendar
export const BIG_THREE_START_WEEK = (BIG_THREE_START_YEAR - 1) * 48 + BIG_THREE_MARCH_WEEK;
export const BIG_THREE_MAX_SLOTS = 3;
export const BIG_THREE_MIN_SCORE = 38;
export const BIG_THREE_MIN_REACH = 150_000;
export const BIG_THREE_MIN_CRAFT_FLOOR = 32;
export const BIG_THREE_MIN_MOMENTUM = 68;
export const BIG_THREE_BREAKOUT_REACH = 300_000;
export const BIG_THREE_PLAYER_FAN_REWARD = 75_000;
export const BIG_THREE_PLAYER_RD_REWARD = 60;
export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;
export const BIG_THREE_LOOKBACK_WEEKS = 48;
/** Hidden tie-break only for the third monument; it never bypasses qualification. */
export const BIG_THREE_PLAYER_SLOT_THREE_WEIGHT = 1.025;

/* Deprecated names kept only so old imports fail softly while the feature is
 * rebuilt around one annual March assessment rather than staggered cooldowns. */
export const BIG_THREE_RIVAL_GRACE_WEEKS = 0;
export const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 0;
export const BIG_THREE_SEED_POSTER_ID = "";

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
  /** Week of the last March assessment. Name retained to minimise state churn. */
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
const weekInYear = (week: number) => ((Math.max(0, week) % 48) + 48) % 48;
const clamp = (value: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, value));

export const initialBigThreeState = (): BigThreeState => ({
  introduced: false,
  slots: [],
  candidates: [],
  pendingReveals: [],
  lastRivalScanWeek: -1,
});

function isOwnerType(value: unknown): value is BigThreeOwnerType {
  return value === "player" || value === "rival" || value === "network" || value === "rights_holder";
}

/** Defensive shape normalisation only; QoL pass 2 does not promise old-save compatibility. */
function normaliseSlot(raw: unknown): BigThreeSlot | null {
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
  const slots = (Array.isArray(b.slots) ? b.slots : [])
    .map(normaliseSlot)
    .filter((x): x is BigThreeSlot => !!x)
    .slice(0, BIG_THREE_MAX_SLOTS);
  const candidates = (Array.isArray(b.candidates) ? b.candidates : [])
    .map(normaliseSlot)
    .filter((x): x is BigThreeSlot => !!x)
    .filter((candidate) => !slots.some((slot) => slot.sourceId === candidate.sourceId))
    .slice(0, 24);
  const slotIds = new Set(slots.map((slot) => slot.id));
  const pendingReveals = (Array.isArray(b.pendingReveals) ? b.pendingReveals : []).flatMap((rawReveal) => {
    if (!rawReveal || typeof rawReveal !== "object") return [];
    const reveal = rawReveal as Partial<BigThreeReveal>;
    if (!reveal.id || !reveal.slotId || !slotIds.has(String(reveal.slotId))) return [];
    return [{
      id: String(reveal.id),
      kind: reveal.kind === "era" ? "era" as const : "new_name" as const,
      slotId: String(reveal.slotId),
    }];
  });
  return {
    introduced: b.introduced === true || slots.length > 0,
    slots,
    candidates,
    pendingReveals,
    lastRivalScanWeek: typeof b.lastRivalScanWeek === "number" ? b.lastRivalScanWeek : -1,
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
    if (slot.player) {
      return { ...slot, currentOwnerId: "rights-holder", currentOwner: "Rights holder", currentOwnerType: "rights_holder" };
    }
  }
  return slot;
}

export function refreshBigThreeOwnership(run: RunState): RunState {
  if (!(run.bigThree?.slots?.length)) return run;
  const slots = run.bigThree.slots.map((slot) => resolveBigThreeSlotOwner(run, slot));
  const changed = slots.some((slot, index) => {
    const before = run.bigThree.slots[index];
    return slot.currentOwnerId !== before.currentOwnerId ||
      slot.currentOwner !== before.currentOwner ||
      slot.currentOwnerType !== before.currentOwnerType;
  });
  return changed ? { ...run, bigThree: { ...run.bigThree, slots } } : run;
}

export function syncBigThreeEra(input: RunState): RunState {
  const run = refreshBigThreeOwnership(input);
  if (run.week < BIG_THREE_START_WEEK || run.bigThree.introduced) return run;
  /* Activate the system silently. The player only gets an event when a title
     actually qualifies, so empty March assessments never become annual pop-ups. */
  return {
    ...run,
    bigThree: {
      ...run.bigThree,
      introduced: true,
      lastRivalScanWeek: -1,
    },
  };
}

/**
 * Player releases enter the watchlist for the year leading into the first
 * March assessment. Qualification itself is re-checked in March, so a
 * franchise can grow into the required following after its broadcast.
 */
export function recognisePlayerBigThreeRelease(inputRun: RunState, release: BigThreePlayerReleaseInput): RunState {
  const run = syncBigThreeEra(inputRun);
  if (run.week < BIG_THREE_START_WEEK - BIG_THREE_LOOKBACK_WEEKS || run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return run;
  const sourceId = `player:${release.projectId}`;
  if (run.bigThree.slots.some((slot) => slot.sourceId === sourceId) ||
      run.bigThree.candidates.some((slot) => slot.sourceId === sourceId)) return run;

  const craft = playerCraftFor(release.score, release.points);
  const craftFloor = Math.min(craft.story, craft.art, craft.sound);
  if (release.score < BIG_THREE_MIN_SCORE || craftFloor < BIG_THREE_MIN_CRAFT_FLOOR) return run;

  const franchiseFollowing = Math.max(release.reach, run.franchises[release.franchiseKey]?.lifetimeFans ?? 0);
  const momentum = playerMomentum(run, release.franchiseKey, franchiseFollowing);
  const candidate: BigThreeSlot = {
    id: `big-three-candidate-${release.projectId}`,
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
    reach: franchiseFollowing,
    craftFloor,
    momentum,
    culturalScore: culturalScore(release.score, franchiseFollowing, craftFloor, momentum),
    posterId: null,
    franchiseKey: release.franchiseKey,
    licensedIpId: release.draft.licensedIpId ?? null,
    draft: {
      ...release.draft,
      genres: [...release.draft.genres],
      arcs: [...release.draft.arcs],
      sliders: [...release.draft.sliders] as [number, number, number],
    },
    protag: release.draft.protag,
  };

  return {
    ...run,
    bigThree: {
      ...run.bigThree,
      candidates: [...run.bigThree.candidates, candidate]
        .sort((a, b) => b.culturalScore - a.culturalScore || b.score - a.score)
        .slice(0, 24),
    },
    notices: run.bigThree.introduced
      ? [...run.notices, `🌠 BIG THREE WATCH — “${candidate.title}” has entered the March conversation.`].slice(-40)
      : run.notices,
  };
}

function refreshPlayerCandidate(run: RunState, candidate: BigThreeSlot): BigThreeSlot {
  if (!candidate.player || !candidate.franchiseKey) return candidate;
  const reach = Math.max(candidate.reach, run.franchises[candidate.franchiseKey]?.lifetimeFans ?? 0);
  const momentum = playerMomentum(run, candidate.franchiseKey, reach);
  return {
    ...candidate,
    reach,
    momentum,
    culturalScore: culturalScore(candidate.score, reach, candidate.craftFloor, momentum),
  };
}

function rivalMetrics(studio: RivalStudio, release: RivalRelease): BigThreeMetrics {
  const craftFloor = Math.min(release.craft.story, release.craft.art, release.craft.sound);
  const momentum = rivalMomentum(studio, release);
  const priorFranchiseFans = release.franchiseKey
    ? studio.releases
        .filter((other) => other.franchiseKey === release.franchiseKey && !(other.week === release.week && other.title === release.title))
        .reduce((sum, other) => sum + other.fans, 0)
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

function rivalCandidate(studio: RivalStudio, release: RivalRelease, metrics: BigThreeMetrics): BigThreeSlot {
  return {
    id: `big-three-candidate-rival-${studio.id}-${release.week}-${release.title}`,
    sourceId: `rival:${studio.id}:${release.week}:${release.title}`,
    title: release.title,
    originalStudioId: studio.id,
    originalStudio: studio.name,
    currentOwnerId: studio.id,
    currentOwner: studio.name,
    currentOwnerType: "rival",
    player: false,
    recognisedWeek: release.week,
    recognisedYear: yearOf(release.week),
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

function sameAwardShow(candidate: BigThreeSlot, entry: {
  title: string;
  studio: string;
  sourceId?: string | null;
  studioId?: string | null;
}): boolean {
  if (candidate.sourceId && entry.sourceId && candidate.sourceId === entry.sourceId) return true;
  const studioMatches = candidate.player
    ? entry.studio === candidate.originalStudio || entry.studioId === "player"
    : entry.studio === candidate.originalStudio || entry.studioId === candidate.originalStudioId;
  return studioMatches && entry.title === candidate.title;
}

/** Recent awards are strongest when choosing the first monument of the era. */
function recentAwardPrestige(run: RunState, candidate: BigThreeSlot): number {
  const ceremony = run.awardsCeremony;
  if (!ceremony) return 0;
  let prestige = 0;
  for (const category of ceremony.categories) {
    if (category.nominees.some((entry) => sameAwardShow(candidate, entry))) prestige += category.tier * 3;
    if (sameAwardShow(candidate, category.winner)) prestige += category.tier * 7;
  }
  return prestige;
}

function rankingScore(run: RunState, candidate: BigThreeSlot, slotIndex: number): number {
  let value = candidate.culturalScore;
  const awardPrestige = recentAwardPrestige(run, candidate);
  value += awardPrestige * (slotIndex === 0 ? 2.25 : 0.35);
  if (slotIndex === 2 && candidate.player) value *= BIG_THREE_PLAYER_SLOT_THREE_WEIGHT;
  return value;
}

function promoteCandidate(run: RunState, candidate0: BigThreeSlot): RunState {
  const first = run.bigThree.slots.length === 0;
  const slot: BigThreeSlot = {
    ...candidate0,
    id: `big-three-slot-${run.bigThree.slots.length + 1}`,
    recognisedWeek: run.week,
    recognisedYear: yearOf(run.week),
  };

  let next: RunState = {
    ...run,
    bigThree: {
      ...run.bigThree,
      slots: [...run.bigThree.slots, slot],
      candidates: run.bigThree.candidates.filter((candidate) => candidate.sourceId !== slot.sourceId),
      pendingReveals: [
        ...run.bigThree.pendingReveals,
        {
          id: `big-three-reveal-${slot.id}`,
          kind: first ? "era" : "new_name",
          slotId: slot.id,
        },
      ],
    },
  };

  if (slot.player) {
    let franchises = next.franchises;
    if (slot.franchiseKey) {
      const fr = franchises[slot.franchiseKey];
      if (fr) {
        const boosted = { ...fr, bigThree: true, popularity: Math.min(100, fr.popularity + 12) };
        boosted.merchValue = merchValueOf(boosted);
        franchises = { ...franchises, [slot.franchiseKey]: boosted };
      }
    }
    let ipMarket = next.ipMarket;
    if (slot.licensedIpId && ipMarket.owned[slot.licensedIpId]) {
      ipMarket = {
        ...ipMarket,
        owned: {
          ...ipMarket.owned,
          [slot.licensedIpId]: { ...ipMarket.owned[slot.licensedIpId], bigThreePrestige: true },
        },
        history: [...ipMarket.history, `Big Three cultural recognition: ${slot.title}. Renewal leverage improved.`].slice(-100),
      };
    }
    next = {
      ...next,
      fans: next.fans + BIG_THREE_PLAYER_FAN_REWARD,
      rd: next.rd + BIG_THREE_PLAYER_RD_REWARD,
      franchises,
      ipMarket,
      rivalWorld: {
        ...next.rivalWorld,
        studios: next.rivalWorld.studios.map((studio) =>
          studio.status === "collapsed"
            ? studio
            : { ...studio, rivalry: Math.min(100, studio.rivalry + 8) }
        ),
      },
      notices: [
        ...next.notices,
        `🌠 MARCH CONSENSUS — “${slot.title}” enters THE BIG THREE (+${BIG_THREE_PLAYER_FAN_REWARD.toLocaleString("en-GB")} fans, +${BIG_THREE_PLAYER_RD_REWARD} RD).`,
      ].slice(-40),
    };
  } else {
    next = {
      ...next,
      rivalWorld: {
        ...next.rivalWorld,
        studios: next.rivalWorld.studios.map((studio) =>
          studio.id === slot.originalStudioId
            ? {
                ...studio,
                fans: studio.fans + 50_000,
                reputation: Math.min(100, studio.reputation + 8),
                momentum: Math.min(30, studio.momentum + 8),
              }
            : studio
        ),
      },
      notices: [
        ...next.notices,
        `🌠 MARCH CONSENSUS — “${slot.title}” (${slot.originalStudio}) enters THE BIG THREE.`,
      ].slice(-40),
    };
  }

  return next;
}

function annualCandidatePool(run: RunState): BigThreeSlot[] {
  const lowerBound = run.week - BIG_THREE_LOOKBACK_WEEKS;
  const playerCandidates = run.bigThree.candidates
    .filter((candidate) => candidate.recognisedWeek > lowerBound && candidate.recognisedWeek <= run.week)
    .map((candidate) => refreshPlayerCandidate(run, candidate))
    .filter((candidate) => bigThreeQualifies(candidate));

  const rivalCandidates = run.rivalWorld.studios.flatMap((studio) =>
    studio.releases
      .filter((release) => release.week > lowerBound && release.week <= run.week)
      .map((release) => ({ release, metrics: rivalMetrics(studio, release) }))
      .filter(({ metrics }) => bigThreeQualifies(metrics))
      .map(({ release, metrics }) => rivalCandidate(studio, release, metrics))
  );

  const seen = new Set<string>();
  return [...playerCandidates, ...rivalCandidates].filter((candidate) => {
    if (seen.has(candidate.sourceId)) return false;
    seen.add(candidate.sourceId);
    return !run.bigThree.slots.some((slot) => slot.sourceId === candidate.sourceId);
  });
}

function selectMarchCandidates(run: RunState, pool0: BigThreeSlot[]): BigThreeSlot[] {
  const selected: BigThreeSlot[] = [];
  const usedStudios = new Set(run.bigThree.slots.map((slot) => slot.originalStudioId));
  const pool = [...pool0];

  while (run.bigThree.slots.length + selected.length < BIG_THREE_MAX_SLOTS) {
    const slotIndex = run.bigThree.slots.length + selected.length;
    const eligible = pool.filter((candidate) =>
      !usedStudios.has(candidate.originalStudioId) &&
      !selected.some((pick) => pick.sourceId === candidate.sourceId)
    );
    if (!eligible.length) break;

    eligible.sort((a, b) =>
      rankingScore(run, b, slotIndex) - rankingScore(run, a, slotIndex) ||
      b.culturalScore - a.culturalScore ||
      b.score - a.score ||
      a.title.localeCompare(b.title)
    );
    const pick = eligible[0];
    selected.push(pick);
    usedStudios.add(pick.originalStudioId);
  }

  return selected;
}

/** One industry check per year: March W1. All remaining monuments can be named
 * in the same assessment, but never more than one title from any studio. */
export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced) return run;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, candidates: [] } });
  }
  if (weekInYear(run.week) !== BIG_THREE_MARCH_WEEK || run.week < BIG_THREE_START_WEEK) return refreshBigThreeOwnership(run);
  if (run.bigThree.lastRivalScanWeek === run.week) return refreshBigThreeOwnership(run);

  const pool = annualCandidatePool(run);
  const selected = selectMarchCandidates(run, pool);
  run = { ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } };

  if (!selected.length) {
    /* A March with no qualifying work is intentionally silent. Keep the
       internal annual assessment cadence, but do not create an event/notice. */
    return refreshBigThreeOwnership({
      ...run,
      bigThree: {
        ...run.bigThree,
        candidates: run.bigThree.candidates.filter((candidate) => candidate.recognisedWeek > run.week - BIG_THREE_LOOKBACK_WEEKS),
      },
    });
  }

  for (const candidate of selected) run = promoteCandidate(run, candidate);
  return refreshBigThreeOwnership({
    ...run,
    bigThree: {
      ...run.bigThree,
      candidates: run.bigThree.candidates.filter((candidate) =>
        candidate.recognisedWeek > run.week - BIG_THREE_LOOKBACK_WEEKS &&
        !run.bigThree.slots.some((slot) => slot.sourceId === candidate.sourceId)
      ),
    },
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
