import type { AudienceProfile, AudienceSegmentId } from "./audienceSegments";
import { audienceSegmentDemand } from "./audienceSegments";

export type PublicityContext = "launch" | "franchise" | "international";

const campaignSegments: Record<string, AudienceSegmentId[]> = {
  teaser: ["casual", "online"],
  character: ["online", "collectors"],
  social: ["online"],
  convention: ["core", "collectors", "online"],
  premiere: ["prestige", "casual"],
  broadcast: ["casual"],
  international: ["casual", "online"],
  awards: ["prestige"],
  streaming_push: ["core", "online"],
  convention_circuit: ["core", "collectors", "online"],
  brand_blitz: ["casual", "collectors"],
};

const productSegments: Record<string, AudienceSegmentId[]> = {
  ost: ["core", "prestige"],
  acrylic: ["online", "collectors"],
  plush: ["collectors", "casual"],
  apparel: ["online", "casual"],
  artbook: ["prestige", "core", "collectors"],
  figures: ["collectors", "core"],
  collectors: ["collectors", "core", "prestige"],
  popup: ["online", "collectors", "casual"],
  tcg: ["collectors", "core", "online"],
  global_collection: ["collectors", "casual"],
  mobile: ["casual", "online"],
};

function fit(profile: AudienceProfile | undefined, segments: readonly AudienceSegmentId[]): number {
  if (!profile || !segments.length) return 1;
  const avg = segments.reduce((sum, segment) => sum + audienceSegmentDemand(profile, segment), 0) / segments.length;
  return Math.max(0.82, Math.min(1.28, avg));
}

export function publicityAudienceFit(profile: AudienceProfile | undefined, campaignId: string): number {
  return fit(profile, campaignSegments[campaignId] ?? ["casual"]);
}

export function merchAudienceFit(profile: AudienceProfile | undefined, productId: string): number {
  return fit(profile, productSegments[productId] ?? ["core"]);
}

export function publicityFitLabel(value: number): "EXCELLENT" | "GOOD" | "NEUTRAL" | "WEAK" {
  if (value >= 1.16) return "EXCELLENT";
  if (value >= 1.04) return "GOOD";
  if (value >= 0.92) return "NEUTRAL";
  return "WEAK";
}

export function combinedPublicityFit(baseFit: number, audienceFit: number): number {
  return Math.max(0.72, Math.min(1.42, baseFit * (0.82 + audienceFit * 0.18)));
}

export const PUBLICITY_CONTEXT_LABEL: Record<PublicityContext, string> = {
  launch: "LAUNCH",
  franchise: "FRANCHISE",
  international: "INTERNATIONAL",
};
