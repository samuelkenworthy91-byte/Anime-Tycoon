import { advanceWeeks, type RunState } from "./state";
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

export const awardYearAtWeek = (week: number) => Math.floor(Math.max(0, week) / 48) + 1;
export const awardWeekInYear = (week: number) => ((Math.max(0, week) % 48) + 48) % 48;
export const awardCutoffAbsoluteWeek = (year: number) => (Math.max(1, year) - 1) * 48 + AWARD_NOMINATION_CUTOFF_WEEK;
export const awardCycleStartWeek = (year: number) => year <= 1 ? 1 : (year - 2) * 48 + AWARD_NOMINATION_CUTOFF_WEEK + 1;

const CATEGORY_IDS = new Set<AwardCategoryId>(["aoty", "shonen", "shojo", "writing", "animation", "score", "fanfav"]);

function rivalCycleEntries(run: RunState, year: number): AwardNominee[] {
  const start = awardCycleStartWeek(year);
  const end = awardCutoffAbsoluteWeek(year);
  return run.rivalWorld.studios.flatMap((studio) =>
    studio.releases
      .filter((release) => release.week >= start && release.week <= end)
      .map(rivalNominee)
  );
}

export function nominationFrozenForYear(run: RunState, year: number): boolean {
  return run.yearShows.some((entry) => entry.nominationYear === year && Array.isArray(entry.nominationCategories));
}

/** `migrateRun()` intentionally rebuilds award rows field-by-field for old
 * saves. Keep that defensive migration untouched, then merge the optional
 * Stage-2 nomination metadata back from the raw save using stable production
 * identity. This makes frozen November slates survive save/reload without a
 * save-envelope bump or risky changes to the large central migration. */
export function restoreAwardNominationMetadata(run: RunState, rawYearShows: unknown): RunState {
  if (!Array.isArray(rawYearShows) || rawYearShows.length === 0 || run.yearShows.length === 0) return run;
  const rawByKey = new Map<string, Partial<AwardNominee>>();
  for (const raw of rawYearShows) {
    if (!raw || typeof raw !== "object") continue;
    const n = raw as Partial<AwardNominee>;
    if (typeof n.title !== "string" || typeof n.studio !== "string") continue;
    rawByKey.set(awardNomineeKey({
      title: n.title,
      studio: n.studio,
      player: !!n.player,
      animeType: n.animeType ?? "shonen",
      genres: n.genres ?? [],
      score: typeof n.score === "number" ? n.score : 0,
      story: typeof n.story === "number" ? n.story : 0,
      art: typeof n.art === "number" ? n.art : 0,
      sound: typeof n.sound === "number" ? n.sound : 0,
      audience: typeof n.audience === "number" ? n.audience : 0,
      sourceId: typeof n.sourceId === "string" ? n.sourceId : null,
    }), n);
  }

  let changed = false;
  const yearShows = run.yearShows.map((entry) => {
    const raw = rawByKey.get(awardNomineeKey(entry));
    if (!raw) return entry;
    const nominationYear = typeof raw.nominationYear === "number" ? Math.max(1, Math.floor(raw.nominationYear)) : undefined;
    const nominationCategories = Array.isArray(raw.nominationCategories)
      ? raw.nominationCategories.filter((id): id is AwardCategoryId => typeof id === "string" && CATEGORY_IDS.has(id as AwardCategoryId))
      : undefined;
    const nominationAnnouncementSeen = typeof raw.nominationAnnouncementSeen === "boolean" ? raw.nominationAnnouncementSeen : undefined;
    const nominationConsideredYear = typeof raw.nominationConsideredYear === "number" ? Math.max(1, Math.floor(raw.nominationConsideredYear)) : undefined;
    if (nominationYear === undefined && nominationCategories === undefined && nominationAnnouncementSeen === undefined && nominationConsideredYear === undefined) return entry;
    changed = true;
    return {
      ...entry,
      nominationYear,
      nominationCategories,
      nominationAnnouncementSeen,
      nominationConsideredYear,
    };
  });
  return changed ? { ...run, yearShows } : run;
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
  const frozen = freezeNominationEntries(year, candidateSlate);

  const playerNominations = frozen
    .filter((entry) => entry.player && (entry.nominationCategories?.length ?? 0) > 0)
    .flatMap((entry) => (entry.nominationCategories ?? []).map((category) => `${entry.title} — ${category}`));
  const notice = playerNominations.length
    ? `🏆 London Anime Awards nominations announced: ${playerNominations.join(" · ")}`
    : "🏆 London Anime Awards nominations announced. Your studio did not make this year's shortlist.";

  return {
    ...run,
    yearShows: [...considered, ...frozen],
    notices: [...run.notices, notice],
  };
}

/** Weekly App wrapper. The core simulation still owns the year-end ceremony;
 * we only freeze the slate before it and preserve post-cutoff player releases
 * for the following award cycle. */
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

  const advanced = advanceWeeks(prepared, 1, opts);
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
