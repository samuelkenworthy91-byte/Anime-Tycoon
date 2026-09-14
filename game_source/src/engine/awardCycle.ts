import { advanceWeeks, type RunState } from "./state";
import { tickIPRenewals } from "./ipRenewal";
import {
  awardNomineeKey,
  freezeNominationEntries,
  frozenNominationEntries,
  nominationSlateFromFrozen,
  rivalNominee,
  type AwardCategoryId,
  type AwardNominationSlate,
  type AwardNominee,
} from "./awards";

/** A 48-week game year puts the nomination cut five weeks before year end —
 * the in-game equivalent of a November nominations announcement. */
export const AWARD_NOMINATION_CUTOFF_WEEK = 43;

/** Craft awards also have a raw discipline-output expectation that rises every
 * industry year. Audiences acclimatise to better production values, so a level
 * of Story/Animation/Sound that was award-worthy in Year 1 cannot coast to a
 * nomination forever. The existing overall-review/craft qualification remains
 * in place as a second gate. */
export const AWARD_CRAFT_OUTPUT_BASE = 160;
export const AWARD_CRAFT_OUTPUT_YEAR_STEP = 20;
export const awardCraftOutputFloor = (year: number) =>
  AWARD_CRAFT_OUTPUT_BASE + Math.max(0, Math.floor(year) - 1) * AWARD_CRAFT_OUTPUT_YEAR_STEP;

export const awardYearAtWeek = (week: number) => Math.floor(Math.max(0, week) / 48) + 1;
export const awardWeekInYear = (week: number) => ((Math.max(0, week) % 48) + 48) % 48;
export const awardCutoffAbsoluteWeek = (year: number) => (Math.max(1, year) - 1) * 48 + AWARD_NOMINATION_CUTOFF_WEEK;
export const awardCycleStartWeek = (year: number) => year <= 1 ? 1 : (year - 2) * 48 + AWARD_NOMINATION_CUTOFF_WEEK + 1;

const CATEGORY_IDS = new Set<AwardCategoryId>(["aoty", "shonen", "shojo", "writing", "animation", "score", "fanfav"]);
const CRAFT_CATEGORY_IDS = ["writing", "animation", "score"] as const;
type CraftCategoryId = typeof CRAFT_CATEGORY_IDS[number];
const CRAFT_CATEGORY_SET = new Set<AwardCategoryId>(CRAFT_CATEGORY_IDS);

function rivalCycleEntries(run: RunState, year: number): AwardNominee[] {
  const start = awardCycleStartWeek(year);
  const end = awardCutoffAbsoluteWeek(year);
  return run.rivalWorld.studios.flatMap((studio) =>
    studio.releases
      .filter((release) => release.week >= start && release.week <= end)
      .map(rivalNominee)
  );
}

function emptyNominationMarker(year: number): AwardNominee {
  return {
    title: `Awards nominations marker Y${year}`,
    studio: "London Anime Awards",
    studioId: "awards-committee",
    player: false,
    animeType: "shonen",
    genres: [],
    score: 0,
    story: 0,
    art: 0,
    sound: 0,
    audience: 0,
    sourceId: `__award_nominations_${year}`,
    posterId: null,
    draft: null,
    protag: null,
    nominationYear: year,
    nominationCategories: [],
    nominationAnnouncementSeen: false,
  };
}

export function nominationFrozenForYear(run: RunState, year: number): boolean {
  return run.yearShows.some((entry) => entry.nominationYear === year && Array.isArray(entry.nominationCategories));
}

function validLicensedProof(raw: unknown): AwardNominee["licensedIpAward"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const proof = raw as { ipId?: unknown; auctionId?: unknown; ownerStudioId?: unknown };
  return typeof proof.ipId === "string" && typeof proof.auctionId === "string" && typeof proof.ownerStudioId === "string"
    ? { ipId: proof.ipId, auctionId: proof.auctionId, ownerStudioId: proof.ownerStudioId }
    : undefined;
}

/** `migrateRun()` intentionally rebuilds award rows field-by-field for old
 * saves. Keep that defensive migration untouched, then merge the optional
 * Stage-2 nomination metadata back from the raw save. That migration preserves
 * yearShows length and order, which matters because a nominated player release
 * exists once as its original annual row and once as the frozen shortlist row.
 * Index restoration keeps those two rows distinct instead of tagging both.
 * We also restore the pre-existing licensed-IP ownership proof/studio identity
 * that the defensive mapper omits, so a licensed nominee cannot disappear
 * merely because the player saved after nominations and reloaded. */
export function restoreAwardNominationMetadata(run: RunState, rawYearShows: unknown): RunState {
  if (!Array.isArray(rawYearShows) || rawYearShows.length === 0 || run.yearShows.length === 0) return run;
  let changed = false;
  const yearShows = run.yearShows.map((entry, index) => {
    const raw0 = rawYearShows[index];
    if (!raw0 || typeof raw0 !== "object") return entry;
    const raw = raw0 as Partial<AwardNominee>;
    const nominationYear = typeof raw.nominationYear === "number" ? Math.max(1, Math.floor(raw.nominationYear)) : undefined;
    const nominationCategories = Array.isArray(raw.nominationCategories)
      ? raw.nominationCategories.filter((id): id is AwardCategoryId => typeof id === "string" && CATEGORY_IDS.has(id as AwardCategoryId))
      : undefined;
    const nominationAnnouncementSeen = typeof raw.nominationAnnouncementSeen === "boolean" ? raw.nominationAnnouncementSeen : undefined;
    const nominationConsideredYear = typeof raw.nominationConsideredYear === "number" ? Math.max(1, Math.floor(raw.nominationConsideredYear)) : undefined;
    const studioId = typeof raw.studioId === "string" ? raw.studioId : entry.studioId;
    const licensedIpAward = validLicensedProof(raw.licensedIpAward) ?? entry.licensedIpAward;
    if (
      nominationYear === undefined &&
      nominationCategories === undefined &&
      nominationAnnouncementSeen === undefined &&
      nominationConsideredYear === undefined &&
      studioId === entry.studioId &&
      licensedIpAward === entry.licensedIpAward
    ) return entry;
    changed = true;
    return {
      ...entry,
      studioId,
      licensedIpAward,
      nominationYear,
      nominationCategories,
      nominationAnnouncementSeen,
      nominationConsideredYear,
    };
  });
  return changed ? { ...run, yearShows } : run;
}

const craftMetric = (entry: AwardNominee, category: CraftCategoryId) =>
  category === "writing" ? entry.story : category === "animation" ? entry.art : entry.sound;

/** The player has literal production points retained on the released project,
 * so award craft floors use those exact numbers. Rival shows do not run the
 * desk-bubble simulation; their frozen craft score is converted onto the same
 * visible hundreds-scale (x6). Old/legacy player rows use the same fallback so
 * loading an old career never makes an otherwise valid awards year disappear. */
export function awardDisciplineOutput(run: RunState, entry: AwardNominee, category: CraftCategoryId): number {
  if (entry.player && entry.sourceId) {
    const project = run.projects.find((p) => p.id === entry.sourceId);
    if (project) {
      if (category === "writing") return Math.round(project.points.story);
      if (category === "animation") return Math.round(project.points.art);
      return Math.round(project.points.sound);
    }
  }
  return Math.round(craftMetric(entry, category) * 6);
}

/** Keep all normal nominations, then replace only the three craft categories
 * with category-specific selections made from shows that also clear the rising
 * raw-output floor. Re-running freezeNominationEntries for each category keeps
 * the Stage-2 studio-diversity rules intact. */
function freezeWithRisingCraftFloor(run: RunState, year: number, candidateSlate: AwardNominee[]): AwardNominee[] {
  const standard = freezeNominationEntries(year, candidateSlate);
  const byKey = new Map<string, { nominee: AwardNominee; categories: AwardCategoryId[] }>();

  const add = (nominee: AwardNominee, category: AwardCategoryId) => {
    const key = awardNomineeKey(nominee);
    const row = byKey.get(key) ?? { nominee, categories: [] };
    if (!row.categories.includes(category)) row.categories.push(category);
    byKey.set(key, row);
  };

  for (const entry of standard) {
    for (const category of entry.nominationCategories ?? []) {
      if (!CRAFT_CATEGORY_SET.has(category)) add(entry, category);
    }
  }

  const floor = awardCraftOutputFloor(year);
  for (const category of CRAFT_CATEGORY_IDS) {
    const eligible = candidateSlate.filter((entry) => awardDisciplineOutput(run, entry, category) >= floor);
    const categoryFrozen = freezeNominationEntries(year, eligible);
    for (const entry of categoryFrozen) {
      if (entry.nominationCategories?.includes(category)) add(entry, category);
    }
  }

  return [...byKey.values()].map(({ nominee, categories }) => ({
    ...nominee,
    nominationYear: year,
    nominationCategories: categories,
    nominationAnnouncementSeen: false,
  }));
}

/** Freeze the November slate once. The existing player award rows are marked
 * as considered so any production released after this point can be carried
 * into the following award cycle instead of disappearing at year end. */
export function freezeNominationsIfDue(run: RunState): RunState {
  const weekInYear = awardWeekInYear(run.week);
  if (weekInYear < AWARD_NOMINATION_CUTOFF_WEEK) return run;
  const year = awardYearAtWeek(run.week);
  if (nominationFrozenForYear(run, year)) return run;

  const playerRows = run.yearShows.filter((entry) => entry.player && !entry.nominationYear);
  const considered = run.yearShows.map((entry) =>
    entry.player && !entry.nominationYear
      ? { ...entry, nominationConsideredYear: year }
      : entry
  );
  const candidateSlate = [...playerRows, ...rivalCycleEntries(run, year)];
  const selected = freezeWithRisingCraftFloor(run, year, candidateSlate);
  const frozen = selected.length ? selected : [emptyNominationMarker(year)];

  const playerNominations = frozen
    .filter((entry) => entry.player && (entry.nominationCategories?.length ?? 0) > 0)
    .flatMap((entry) => (entry.nominationCategories ?? []).map((category) => `${entry.title} — ${category}`));
  const craftFloor = awardCraftOutputFloor(year);
  const notice = playerNominations.length
    ? `🏆 London Anime Awards nominations announced: ${playerNominations.join(" · ")} · Craft floor ${craftFloor}+.`
    : `🏆 London Anime Awards nominations announced. Your studio did not make this year's shortlist. Craft floor: ${craftFloor}+ Story/Animation/Sound output.`;

  return {
    ...run,
    yearShows: [...considered, ...frozen],
    notices: [...run.notices, notice],
  };
}

/** Weekly App wrapper. The core simulation still owns the year-end ceremony;
 * we freeze nominations before it, preserve post-cutoff releases, and run the
 * independent-IP renewal lifecycle immediately after the core weekly tick. */
export function advanceAwardsWeek(
  run: RunState,
  opts: { liveDaysAlreadyApplied?: boolean } = {}
): RunState {
  const prepared = freezeNominationsIfDue(run);
  const currentYear = awardYearAtWeek(prepared.week);
  const crossesYearEnd = (prepared.week + 1) % 48 === 0;
  const carry = crossesYearEnd
    ? prepared.yearShows.filter((entry) =>
        entry.player &&
        !entry.nominationYear &&
        entry.nominationConsideredYear !== currentYear
      ).map((entry) => ({
        ...entry,
        nominationConsideredYear: undefined,
        nominationCategories: undefined,
        nominationYear: undefined,
        nominationAnnouncementSeen: undefined,
      }))
    : [];

  let advanced = advanceWeeks(prepared, 1, opts);
  const renewal = tickIPRenewals(advanced.ipMarket, advanced.week, advanced.cash, advanced.facilities.legal ?? 0);
  if (renewal.cashDelta !== 0 || renewal.notices.length > 0 || renewal.market !== advanced.ipMarket) {
    advanced = {
      ...advanced,
      cash: advanced.cash + renewal.cashDelta,
      ipMarket: renewal.market,
      notices: [...advanced.notices, ...renewal.notices],
      strategicSpend: renewal.cashDelta < 0
        ? [...advanced.strategicSpend, { id: `ip_renew_${advanced.week}`, label: "Automatic IP rights renewal", amount: -renewal.cashDelta, week: advanced.week }]
        : advanced.strategicSpend,
    };
  }
  return carry.length ? { ...advanced, yearShows: [...advanced.yearShows, ...carry] } : advanced;
}

export function pendingNominationAnnouncement(run: RunState): { year: number; slate: AwardNominationSlate } | null {
  const years = [...new Set(run.yearShows
    .filter((entry) => entry.nominationYear && entry.nominationAnnouncementSeen !== true)
    .map((entry) => entry.nominationYear as number))]
    .sort((a, b) => a - b);
  const year = years[0];
  if (!year) return null;
  const slate = nominationSlateFromFrozen(run.yearShows, year);
  return slate ? { year, slate } : null;
}

export function acknowledgeNominationAnnouncement(run: RunState, year: number): RunState {
  return {
    ...run,
    yearShows: run.yearShows.map((entry) => entry.nominationYear === year
      ? { ...entry, nominationAnnouncementSeen: true }
      : entry),
  };
}

export function frozenNominationsForYear(run: RunState, year: number): AwardNominee[] {
  return frozenNominationEntries(run.yearShows, year);
}
