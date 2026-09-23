import { GENRES, type Draft, type GenreId, type Staff } from "./data";
import type { RunState } from "./state";

export type StudioSpecialisationRank = "none" | "studio" | "authority" | "institution";
export type ForecastAccess = "hidden" | "band" | "exact";

export const PRIMARY_SPECIALISATION_MIN_OFFICE = 0;
export const SECONDARY_SPECIALISATION_MIN_OFFICE = 3;
export const SECONDARY_SPECIALISATION_CASH = 2_500_000;
export const SECONDARY_SPECIALISATION_RD = 450;

export const AUTHORITY_RELEASES = 4;
export const AUTHORITY_HITS = 2;
export const INSTITUTION_RELEASES = 8;
export const INSTITUTION_HITS = 4;
export const INSTITUTION_MASTERPIECES = 1;

const PRIMARY_PREFIX = "studio_specialisation:primary:";
const SECONDARY_PREFIX = "studio_specialisation:secondary:";

const genreLabel = (id: GenreId) => GENRES.find((g) => g.id === id)?.label ?? id;
const validGenre = (value: string | undefined): value is GenreId => !!value && GENRES.some((g) => g.id === value);

interface ReleaseStat {
  week: number;
  title: string;
  score: number;
  hallOfFame: boolean;
}

type SpecialisationRun = Pick<RunState, "strategicSpend" | "franchises"> & Partial<Pick<RunState, "showrunner">>;

export interface StudioSpecialisationProfile {
  primary: GenreId | null;
  secondary: GenreId | null;
  selectedWeek: number | null;
  secondarySelectedWeek: number | null;
  releases: number;
  hits: number;
  masterpieces: number;
  rank: StudioSpecialisationRank;
  rankLevel: 0 | 1 | 2 | 3;
  nextRank: StudioSpecialisationRank | null;
  nextRequirements: string[];
}

function selectionEntry(run: Pick<RunState, "strategicSpend">, prefix: string) {
  return [...(run.strategicSpend ?? [])]
    .filter((entry) => typeof entry.id === "string" && entry.id.startsWith(prefix))
    .sort((a, b) => a.week - b.week)[0] ?? null;
}

function genreFromEntry(entry: { id: string } | null, prefix: string): GenreId | null {
  if (!entry) return null;
  const raw = entry.id.slice(prefix.length);
  return validGenre(raw) ? raw : null;
}

function releaseStats(run: Pick<RunState, "franchises">, genre: GenreId, fromWeek: number): ReleaseStat[] {
  const releases = new Map<string, ReleaseStat>();
  for (const franchise of Object.values(run.franchises ?? {})) {
    if (!franchise.genres?.includes(genre)) continue;
    for (const entry of franchise.entries ?? []) {
      if (entry.week < fromWeek) continue;
      const key = `${entry.week}|${entry.title}`;
      const next: ReleaseStat = {
        week: entry.week,
        title: entry.title,
        score: entry.score,
        hallOfFame: !!entry.hallOfFame || entry.score >= 32,
      };
      const previous = releases.get(key);
      if (!previous || next.score > previous.score) releases.set(key, next);
    }
  }
  return [...releases.values()].sort((a, b) => a.week - b.week || a.title.localeCompare(b.title));
}

export function studioSpecialisationProfile(
  run: SpecialisationRun,
): StudioSpecialisationProfile {
  const primaryEntry = selectionEntry(run, PRIMARY_PREFIX);
  const secondaryEntry = selectionEntry(run, SECONDARY_PREFIX);
  const primary = genreFromEntry(primaryEntry, PRIMARY_PREFIX);
  const secondary = genreFromEntry(secondaryEntry, SECONDARY_PREFIX);
  const selectedWeek = primaryEntry?.week ?? null;
  const history = primary && selectedWeek !== null ? releaseStats(run, primary, selectedWeek) : [];
  const releases = history.length;
  const hits = history.filter((entry) => entry.score >= 27).length;
  const masterpieces = history.filter((entry) => entry.hallOfFame).length;

  const auteur = run.showrunner === "auteur";
  const authorityReleases = auteur ? 3 : AUTHORITY_RELEASES;
  const authorityHits = AUTHORITY_HITS;
  const institutionReleases = auteur ? 6 : INSTITUTION_RELEASES;
  const institutionHits = auteur ? 3 : INSTITUTION_HITS;

  let rank: StudioSpecialisationRank = primary ? "studio" : "none";
  let rankLevel: 0 | 1 | 2 | 3 = primary ? 1 : 0;
  if (primary && releases >= authorityReleases && hits >= authorityHits) {
    rank = "authority";
    rankLevel = 2;
  }
  if (
    primary &&
    releases >= institutionReleases &&
    hits >= institutionHits &&
    masterpieces >= INSTITUTION_MASTERPIECES
  ) {
    rank = "institution";
    rankLevel = 3;
  }

  const nextRank = rankLevel === 0 ? "studio" : rankLevel === 1 ? "authority" : rankLevel === 2 ? "institution" : null;
  const nextRequirements = rankLevel === 1
    ? [
        `${Math.min(releases, authorityReleases)}/${authorityReleases} signature releases`,
        `${Math.min(hits, authorityHits)}/${authorityHits} hits (27+/40)`,
      ]
    : rankLevel === 2
      ? [
          `${Math.min(releases, institutionReleases)}/${institutionReleases} signature releases`,
          `${Math.min(hits, institutionHits)}/${institutionHits} hits (27+/40)`,
          `${Math.min(masterpieces, INSTITUTION_MASTERPIECES)}/${INSTITUTION_MASTERPIECES} Hall of Fame release (32+/40)`,
        ]
      : [];

  return {
    primary,
    secondary,
    selectedWeek,
    secondarySelectedWeek: secondaryEntry?.week ?? null,
    releases,
    hits,
    masterpieces,
    rank,
    rankLevel,
    nextRank,
    nextRequirements,
  };
}

interface RankEffects {
  signatureOutput: number;
  signaturePace: number;
  signatureInterventionCost: number;
  signatureInterventionEffect: number;
  signatureRisk: number;
  signatureIssueChance: number;
  signatureScore: number;
  outsideScore: number;
  outsideOutput: number;
  outsidePace: number;
  outsideInterventionCost: number;
  outsideRisk: number;
  outsideIssueChance: number;
}

const RANK_EFFECTS: Record<1 | 2 | 3, RankEffects> = {
  1: {
    signatureOutput: 1.02,
    signaturePace: 1.02,
    signatureInterventionCost: 0.97,
    signatureInterventionEffect: 1.03,
    signatureRisk: 0.98,
    signatureIssueChance: 0.98,
    signatureScore: 1.08,
    outsideScore: 0.97,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  2: {
    signatureOutput: 1.03,
    signaturePace: 1.03,
    signatureInterventionCost: 0.95,
    signatureInterventionEffect: 1.05,
    signatureRisk: 0.96,
    signatureIssueChance: 0.96,
    signatureScore: 1.15,
    outsideScore: 0.94,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  3: {
    signatureOutput: 1.04,
    signaturePace: 1.04,
    signatureInterventionCost: 0.92,
    signatureInterventionEffect: 1.08,
    signatureRisk: 0.94,
    signatureIssueChance: 0.94,
    signatureScore: 1.25,
    outsideScore: 0.90,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
};

export interface SpecialisationProjectEffects {
  active: boolean;
  signature: boolean;
  rank: StudioSpecialisationRank;
  rankLevel: 0 | 1 | 2 | 3;
  outputMult: number;
  paceMult: number;
  interventionCostMult: number;
  interventionEffectMult: number;
  interventionRiskMult: number;
  issueChanceMult: number;
  /** direct multiplier applied equally to Story / Art / Sound at review scoring */
  scoreMult: number;
}

export function specialisationProjectEffects(
  run: SpecialisationRun,
  draft: Pick<Draft, "genres">,
): SpecialisationProjectEffects {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary || profile.rankLevel === 0) {
    return {
      active: false,
      signature: false,
      rank: "none",
      rankLevel: 0,
      outputMult: 1,
      paceMult: 1,
      interventionCostMult: 1,
      interventionEffectMult: 1,
      interventionRiskMult: 1,
      issueChanceMult: 1,
      scoreMult: 1,
    };
  }
  const signature = draft.genres.includes(profile.primary) || (!!profile.secondary && draft.genres.includes(profile.secondary));
  const fx = RANK_EFFECTS[profile.rankLevel];
  const auteur = run.showrunner === "auteur";
  const signatureScore = fx.signatureScore + (auteur ? 0.02 : 0);
  const outsideScore = auteur ? 1 - (1 - fx.outsideScore) / 2 : fx.outsideScore;
  return signature
    ? {
        active: true,
        signature: true,
        rank: profile.rank,
        rankLevel: profile.rankLevel,
        outputMult: fx.signatureOutput,
        paceMult: fx.signaturePace,
        interventionCostMult: fx.signatureInterventionCost,
        interventionEffectMult: fx.signatureInterventionEffect,
        interventionRiskMult: fx.signatureRisk,
        issueChanceMult: fx.signatureIssueChance,
        scoreMult: signatureScore,
      }
    : {
        active: true,
        signature: false,
        rank: profile.rank,
        rankLevel: profile.rankLevel,
        outputMult: fx.outsideOutput,
        paceMult: fx.outsidePace,
        interventionCostMult: fx.outsideInterventionCost,
        interventionEffectMult: 1,
        interventionRiskMult: fx.outsideRisk,
        issueChanceMult: fx.outsideIssueChance,
        scoreMult: outsideScore,
      };
}

export function specialisationBenefits(run: SpecialisationRun) {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary || profile.rankLevel === 0) return null;
  const fx = RANK_EFFECTS[profile.rankLevel];
  return {
    profile,
    signatureOutputPct: Math.round((fx.signatureOutput - 1) * 100),
    signaturePacePct: Math.round((fx.signaturePace - 1) * 100),
    signatureInterventionDiscountPct: Math.round((1 - fx.signatureInterventionCost) * 100),
    signatureInterventionEffectPct: Math.round((fx.signatureInterventionEffect - 1) * 100),
    signatureScorePct: Math.round(((fx.signatureScore + (run.showrunner === "auteur" ? 0.02 : 0)) - 1) * 100),
    outsideScorePenaltyPct: Math.round((1 - (run.showrunner === "auteur" ? 1 - (1 - fx.outsideScore) / 2 : fx.outsideScore)) * 1000) / 10,
    outsideOutputPenaltyPct: Math.round((1 - fx.outsideOutput) * 100),
    outsidePacePenaltyPct: Math.round((1 - fx.outsidePace) * 100),
    outsideInterventionPremiumPct: Math.round((fx.outsideInterventionCost - 1) * 100),
  };
}

export function campaignForecastAccess(
  run: SpecialisationRun,
  draft: Pick<Draft, "genres">,
  dataLabTier: number,
): ForecastAccess {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary) {
    if (dataLabTier > 0) return "exact";
    return run.showrunner === "audience" ? "band" : "hidden";
  }
  const effect = specialisationProjectEffects(run, draft);
  if (effect.signature) {
    if (profile.rankLevel >= 2) return "exact";
    return dataLabTier > 0 ? "exact" : "band";
  }
  if (dataLabTier >= 2) return "exact";
  if (dataLabTier >= 1) return "band";
  return run.showrunner === "audience" ? "band" : "hidden";
}

/** Authority studios attract at least one creator who already loves the house
 * genre. Institutions attract two; the second follows the secondary genre when
 * one has been established. Appearance uniqueness is untouched. */
export function alignRecruitmentPool(
  run: SpecialisationRun,
  candidates: Staff[],
): Staff[] {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary || profile.rankLevel < 2 || candidates.length === 0) return candidates;
  const next = candidates.map((candidate) => ({ ...candidate }));
  next[0] = { ...next[0], favGenre: profile.primary };
  if (profile.rankLevel >= 3 && next.length > 1) {
    next[1] = { ...next[1], favGenre: profile.secondary ?? profile.primary };
  }
  return next;
}

export function choosePrimarySpecialisation(run: RunState, genre: GenreId): RunState | null {
  const profile = studioSpecialisationProfile(run);
  if (profile.primary || run.officeLevel < PRIMARY_SPECIALISATION_MIN_OFFICE) return null;
  if (!run.genresUnlocked.includes(genre) || !validGenre(genre)) return null;
  return {
    ...run,
    strategicSpend: [
      ...(run.strategicSpend ?? []),
      { id: `${PRIMARY_PREFIX}${genre}`, label: `Signature Genre · ${genreLabel(genre)}`, amount: 0, week: run.week },
    ],
    notices: [
      ...run.notices,
      `🎯 HOUSE SPECIALTY LOCKED: ${genreLabel(genre)} shows gain Story, Art and Sound scoring expertise. As your House rank grows this reaches +25%; work outside your specialty can fall to −10%.`,
    ].slice(-40),
  };
}

export function secondarySpecialisationBlock(run: RunState, genre: GenreId): string | null {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary) return "Choose a primary Signature Genre first";
  if (profile.secondary) return "Secondary specialisation already chosen";
  if (profile.rankLevel < 3) return "Requires Genre Institution status";
  if (run.officeLevel < SECONDARY_SPECIALISATION_MIN_OFFICE) return "Requires Neo District HQ or larger";
  if (!run.genresUnlocked.includes(genre)) return "Genre licence not unlocked";
  if (genre === profile.primary) return "Already your primary Signature Genre";
  if (run.cash < SECONDARY_SPECIALISATION_CASH) return `Needs £${SECONDARY_SPECIALISATION_CASH.toLocaleString("en-GB")}`;
  if (run.rd < SECONDARY_SPECIALISATION_RD) return `Needs ${SECONDARY_SPECIALISATION_RD} RD`;
  return null;
}

export function chooseSecondarySpecialisation(run: RunState, genre: GenreId): RunState | null {
  const block = secondarySpecialisationBlock(run, genre);
  if (block) return null;
  return {
    ...run,
    cash: run.cash - SECONDARY_SPECIALISATION_CASH,
    rd: run.rd - SECONDARY_SPECIALISATION_RD,
    strategicSpend: [
      ...(run.strategicSpend ?? []),
      {
        id: `${SECONDARY_PREFIX}${genre}`,
        label: `Secondary Signature Genre · ${genreLabel(genre)}`,
        amount: SECONDARY_SPECIALISATION_CASH,
        week: run.week,
      },
    ],
    notices: [
      ...run.notices,
      `🏛 GENRE INSTITUTION EXPANDS: ${genreLabel(genre)} becomes your second Signature Genre (−£${SECONDARY_SPECIALISATION_CASH.toLocaleString("en-GB")}, −${SECONDARY_SPECIALISATION_RD} RD).`,
    ].slice(-40),
  };
}
