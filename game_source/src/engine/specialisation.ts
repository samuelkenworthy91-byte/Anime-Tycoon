import { GENRES, type Draft, type GenreId, type Staff } from "./data";
import type { RunState } from "./state";

export type StudioSpecialisationRank = "none" | "studio" | "authority" | "institution";
export type ForecastAccess = "hidden" | "band" | "exact";

export const PRIMARY_SPECIALISATION_MIN_OFFICE = 1;
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
  run: Pick<RunState, "strategicSpend" | "franchises">,
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

  let rank: StudioSpecialisationRank = primary ? "studio" : "none";
  let rankLevel: 0 | 1 | 2 | 3 = primary ? 1 : 0;
  if (primary && releases >= AUTHORITY_RELEASES && hits >= AUTHORITY_HITS) {
    rank = "authority";
    rankLevel = 2;
  }
  if (
    primary &&
    releases >= INSTITUTION_RELEASES &&
    hits >= INSTITUTION_HITS &&
    masterpieces >= INSTITUTION_MASTERPIECES
  ) {
    rank = "institution";
    rankLevel = 3;
  }

  const nextRank = rankLevel === 0 ? "studio" : rankLevel === 1 ? "authority" : rankLevel === 2 ? "institution" : null;
  const nextRequirements = rankLevel === 1
    ? [
        `${Math.min(releases, AUTHORITY_RELEASES)}/${AUTHORITY_RELEASES} signature releases`,
        `${Math.min(hits, AUTHORITY_HITS)}/${AUTHORITY_HITS} hits (27+/40)`,
      ]
    : rankLevel === 2
      ? [
          `${Math.min(releases, INSTITUTION_RELEASES)}/${INSTITUTION_RELEASES} signature releases`,
          `${Math.min(hits, INSTITUTION_HITS)}/${INSTITUTION_HITS} hits (27+/40)`,
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
  outsideOutput: number;
  outsidePace: number;
  outsideInterventionCost: number;
  outsideRisk: number;
  outsideIssueChance: number;
}

const RANK_EFFECTS: Record<1 | 2 | 3, RankEffects> = {
  1: {
    signatureOutput: 1.04,
    signaturePace: 1.03,
    signatureInterventionCost: 0.95,
    signatureInterventionEffect: 1.04,
    signatureRisk: 0.95,
    signatureIssueChance: 0.95,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  2: {
    signatureOutput: 1.07,
    signaturePace: 1.05,
    signatureInterventionCost: 0.90,
    signatureInterventionEffect: 1.08,
    signatureRisk: 0.90,
    signatureIssueChance: 0.90,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  3: {
    signatureOutput: 1.10,
    signaturePace: 1.07,
    signatureInterventionCost: 0.85,
    signatureInterventionEffect: 1.12,
    signatureRisk: 0.85,
    signatureIssueChance: 0.85,
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
}

export function specialisationProjectEffects(
  run: Pick<RunState, "strategicSpend" | "franchises">,
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
    };
  }
  const signature = draft.genres.includes(profile.primary) || (!!profile.secondary && draft.genres.includes(profile.secondary));
  const fx = RANK_EFFECTS[profile.rankLevel];
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
      };
}

export function specialisationBenefits(run: Pick<RunState, "strategicSpend" | "franchises">) {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary || profile.rankLevel === 0) return null;
  const fx = RANK_EFFECTS[profile.rankLevel];
  return {
    profile,
    signatureOutputPct: Math.round((fx.signatureOutput - 1) * 100),
    signaturePacePct: Math.round((fx.signaturePace - 1) * 100),
    signatureInterventionDiscountPct: Math.round((1 - fx.signatureInterventionCost) * 100),
    signatureInterventionEffectPct: Math.round((fx.signatureInterventionEffect - 1) * 100),
    outsideOutputPenaltyPct: Math.round((1 - fx.outsideOutput) * 100),
    outsidePacePenaltyPct: Math.round((1 - fx.outsidePace) * 100),
    outsideInterventionPremiumPct: Math.round((fx.outsideInterventionCost - 1) * 100),
  };
}

export function campaignForecastAccess(
  run: Pick<RunState, "strategicSpend" | "franchises">,
  draft: Pick<Draft, "genres">,
  dataLabTier: number,
): ForecastAccess {
  const profile = studioSpecialisationProfile(run);
  if (!profile.primary) return dataLabTier > 0 ? "exact" : "hidden";
  const effect = specialisationProjectEffects(run, draft);
  if (effect.signature) {
    if (profile.rankLevel >= 2) return "exact";
    return dataLabTier > 0 ? "exact" : "band";
  }
  if (dataLabTier >= 2) return "exact";
  if (dataLabTier >= 1) return "band";
  return "hidden";
}

/** Authority studios attract at least one creator who already loves the house
 * genre. Institutions attract two; the second follows the secondary genre when
 * one has been established. Appearance uniqueness is untouched. */
export function alignRecruitmentPool(
  run: Pick<RunState, "strategicSpend" | "franchises">,
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
      `🎯 STUDIO IDENTITY LOCKED: ${genreLabel(genre)} is now your Signature Genre. Productions containing it gain house expertise; work outside it becomes less predictable.`,
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
