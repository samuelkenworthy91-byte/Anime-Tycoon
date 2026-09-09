import type { AudienceId, Draft, GenreId, MediumId } from "./data";

export interface StrategicCampaign {
  id: string;
  name: string;
  cost: number;
  hype: number;
  description: string;
  /** Marketing Office tier required unless the Marketing research is complete. */
  minTier: number;
  genres?: GenreId[];
  audiences?: AudienceId[];
  mediums?: MediumId[];
  capitalSynergy?: string;
}

export const MAX_STRATEGIC_CAMPAIGNS = 3;

/**
 * These are reach/positioning choices, not production-quality purchases.
 * Their only release-facing output is fit-adjusted hype: the existing scoring
 * engine already converts hype into awareness, audience and opening revenue
 * without touching the review-quality calculation.
 */
export const STRATEGIC_CAMPAIGNS: StrategicCampaign[] = [
  {
    id: "teaser",
    name: "Teaser / Trailer Drop",
    cost: 12_000,
    hype: 10,
    description: "A sharp first-look campaign. Cheap, flexible and useful for almost anything.",
    minTier: 0,
  },
  {
    id: "character",
    name: "Character Spotlight",
    cost: 18_000,
    hype: 12,
    description: "Sell a face, relationship or mascot before selling the whole premise.",
    minTier: 0,
    genres: ["romance", "slice", "idol", "magical", "comedy"],
    audiences: ["teens", "family"],
    capitalSynergy: "global_merch",
  },
  {
    id: "social",
    name: "Influencer / Social Push",
    cost: 26_000,
    hype: 14,
    description: "Creator previews, clips and short-form buzz aimed at highly online audiences.",
    minTier: 1,
    genres: ["cyber", "idol", "sports", "comedy", "isekai"],
    audiences: ["teens"],
  },
  {
    id: "convention",
    name: "Convention Panel",
    cost: 42_000,
    hype: 18,
    description: "Cast reveals, footage and fan Q&A. Strongest for spectacle and established fandoms.",
    minTier: 1,
    genres: ["fantasy", "mecha", "martial", "shinobi", "samurai", "supernatural", "space"],
    capitalSynergy: "convention_venue",
  },
  {
    id: "premiere",
    name: "Red-Carpet Premiere",
    cost: 62_000,
    hype: 19,
    description: "Press, creators and tastemakers turn the launch into an event.",
    minTier: 2,
    audiences: ["adults", "family"],
    mediums: ["movie", "special", "ova"],
    capitalSynergy: "screening_theatre",
  },
  {
    id: "broadcast",
    name: "Outdoor / TV Blitz",
    cost: 85_000,
    hype: 24,
    description: "Expensive mass reach. Reliable when the property can justify the scale.",
    minTier: 2,
    audiences: ["family", "teens"],
    capitalSynergy: "distribution_network",
  },
  {
    id: "international",
    name: "International Launch",
    cost: 110_000,
    hype: 22,
    description: "Simultaneous overseas press, subtitled assets and regional launch partners.",
    minTier: 2,
    genres: ["fantasy", "space", "sports", "idol", "mecha", "romance"],
    capitalSynergy: "distribution_network",
  },
  {
    id: "awards",
    name: "Awards / Festival Campaign",
    cost: 135_000,
    hype: 15,
    description: "Prestige screenings, critic access and festival positioning: narrower reach, stronger high-end attention.",
    minTier: 3,
    genres: ["mystery", "historical" as GenreId, "nordic", "romance", "slice"],
    audiences: ["adults"],
    mediums: ["movie", "special"],
    capitalSynergy: "screening_theatre",
  },
];

const hasAny = <T,>(wanted: readonly T[] | undefined, actual: readonly T[]) =>
  !!wanted?.some((item) => actual.includes(item));

/** 0.78..1.38: deliberately bounded so marketing is a multiplier on reach, not a quality exploit. */
export function campaignFit(campaign: StrategicCampaign, draft: Draft): number {
  let fit = 0.94;
  let signals = 0;
  if (campaign.genres?.length) {
    signals += 1;
    fit += hasAny(campaign.genres, draft.genres) ? 0.2 : -0.08;
  }
  if (campaign.audiences?.length) {
    signals += 1;
    fit += campaign.audiences.includes(draft.audience) ? 0.14 : -0.05;
  }
  if (campaign.mediums?.length) {
    signals += 1;
    fit += campaign.mediums.includes(draft.medium) ? 0.12 : -0.04;
  }
  if (!signals) fit = 1;
  return Math.max(0.78, Math.min(1.38, fit));
}

export function campaignFitLabel(fit: number): "EXCELLENT" | "GOOD" | "NEUTRAL" | "WEAK" {
  if (fit >= 1.22) return "EXCELLENT";
  if (fit >= 1.05) return "GOOD";
  if (fit >= 0.9) return "NEUTRAL";
  return "WEAK";
}

export function capitalCampaignMultiplier(campaign: StrategicCampaign, capitalProjects: readonly string[]): number {
  let mult = 1;
  if (campaign.capitalSynergy && capitalProjects.includes(campaign.capitalSynergy)) mult *= 1.2;
  if (capitalProjects.includes("flagship_hq")) mult *= 1.1;
  if (campaign.id === "international" && capitalProjects.includes("global_merch")) mult *= 1.08;
  if (campaign.id === "character" && capitalProjects.includes("global_merch")) mult *= 1.1;
  return mult;
}

export function strategicCampaignHype(
  campaign: StrategicCampaign,
  draft: Draft,
  marketingHypeMult: number,
  capitalProjects: readonly string[] = []
): number {
  return Math.max(
    1,
    Math.round(campaign.hype * campaignFit(campaign, draft) * marketingHypeMult * capitalCampaignMultiplier(campaign, capitalProjects))
  );
}
