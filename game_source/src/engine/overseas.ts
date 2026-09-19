import { migrateStrategy, uncertainReception, regionalMarketFactor, distributorTerms, advanceOverseasStrategy, type OverseasStrategy } from "./overseasStrategy";
import type { RunState } from "./state";
import type { AudienceId, GenreId } from "./data";
import type { Project } from "./projects";
import { expansionOf } from "./studioExpansion";
import { merchValueOf } from "./franchise";

export const SEGMENTS = [
  {
    id: "source",
    name: "Source enthusiasts",
    interest: "Faithfulness and continuity",
  },
  {
    id: "animation",
    name: "Animation enthusiasts",
    interest: "Movement and visual ambition",
  },
  {
    id: "characters",
    name: "Character fans",
    interest: "Emotional development",
  },
  {
    id: "mainstream",
    name: "Mainstream entertainment",
    interest: "Accessibility and momentum",
  },
  {
    id: "family",
    name: "Family co-viewers",
    interest: "Accessible stories and suitable intensity",
  },
  {
    id: "experimental",
    name: "Experimental viewers",
    interest: "Complexity and originality",
  },
] as const;
export type SegmentId = (typeof SEGMENTS)[number]["id"];
export type TerritoryId = "aurora" | "meridian" | "pelagic";

export type OverseasTier = 1 | 2 | 3 | 4;
export interface OverseasTierDef {
  tier: OverseasTier;
  id: string;
  name: string;
  cost: number;
  upkeep: number;
  maxConcurrent: number;
  description: string;
}
export const OVERSEAS_TIERS: OverseasTierDef[] = [
  { tier: 1, id: "overseas_tier_1", name: "Export Desk", cost: 400_000, upkeep: 6_000, maxConcurrent: 1, description: "Basic subtitled exports and one live territorial campaign." },
  { tier: 2, id: "overseas_tier_2", name: "International Division", cost: 2_500_000, upkeep: 22_000, maxConcurrent: 2, description: "Full dubbing, regional marketing and two simultaneous campaigns." },
  { tier: 3, id: "overseas_tier_3", name: "Regional Offices", cost: 12_000_000, upkeep: 65_000, maxConcurrent: 3, description: "Premium localisation, broadcast recuts and major regional launches." },
  { tier: 4, id: "overseas_tier_4", name: "Global Distribution Arm", cost: 50_000_000, upkeep: 160_000, maxConcurrent: 6, description: "Worldwide exploitation, stronger distribution economics and a true global slate." },
];

export function overseasTierOf(r: Pick<RunState, "capitalProjects">): number {
  let tier = 0;
  for (const def of OVERSEAS_TIERS) if (r.capitalProjects.includes(def.id)) tier = Math.max(tier, def.tier);
  return tier;
}
export function overseasUpkeep(r: Pick<RunState, "capitalProjects">): number {
  const tier = overseasTierOf(r);
  return tier ? OVERSEAS_TIERS[tier - 1].upkeep : 0;
}
export function buyOverseasInfrastructure(r: RunState): RunState | null {
  if (r.officeLevel < 1) return null;
  const tier = overseasTierOf(r);
  const next = OVERSEAS_TIERS[tier];
  if (!next || r.cash < next.cost) return null;
  return {
    ...r,
    cash: r.cash - next.cost,
    capitalProjects: [...r.capitalProjects, next.id],
    strategicSpend: [...r.strategicSpend, { id: `overseas_infra_${r.week}_${next.tier}`, label: next.name, amount: next.cost, week: r.week }],
    notices: [...r.notices, `🌍 ${next.name} opened (−£${next.cost.toLocaleString("en-GB")}). Weekly overhead £${next.upkeep.toLocaleString("en-GB")}.`].slice(-40),
  };
}
export const TERRITORIES: {
  id: TerritoryId;
  name: string;
  language: string;
  population: number;
  mix: Record<SegmentId, number>;
  genres: GenreId[];
}[] = [
  {
    id: "aurora",
    name: "Aurora Union",
    language: "Auroran",
    population: 2_400_000,
    mix: {
      source: 0.15,
      animation: 0.25,
      characters: 0.2,
      mainstream: 0.2,
      family: 0.1,
      experimental: 0.1,
    },
    genres: ["mecha", "sports", "space"],
  },
  {
    id: "meridian",
    name: "Meridian Republics",
    language: "Meridian",
    population: 3_200_000,
    mix: {
      source: 0.1,
      animation: 0.1,
      characters: 0.25,
      mainstream: 0.25,
      family: 0.2,
      experimental: 0.1,
    },
    genres: ["romance", "comedy", "idol"],
  },
  {
    id: "pelagic",
    name: "Pelagic Federation",
    language: "Auroran",
    population: 1_800_000,
    mix: {
      source: 0.2,
      animation: 0.15,
      characters: 0.15,
      mainstream: 0.15,
      family: 0.1,
      experimental: 0.25,
    },
    genres: ["mystery", "cosmic_horror", "fantasy"],
  },
];
export const DISTRIBUTORS = [
  {
    id: "specialist",
    name: "Festival & Specialist Network",
    share: 0.25,
    reach: 0.50,
    fee: 35_000,
    weeks: 8,
    maxIntensity: 3,
    perViewer: 7,
    catalogueRate: 0.12,
    catalogueWeeks: 24,
  },
  {
    id: "broadcast",
    name: "National Family Network",
    share: 0.40,
    reach: 0.80,
    fee: 90_000,
    weeks: 12,
    maxIntensity: 1,
    perViewer: 5,
    catalogueRate: 0.10,
    catalogueWeeks: 24,
  },
  {
    id: "streamer",
    name: "Global Streaming Platform",
    share: 0.32,
    reach: 0.72,
    fee: 140_000,
    weeks: 16,
    maxIntensity: 3,
    perViewer: 8,
    catalogueRate: 0.22,
    catalogueWeeks: 48,
  },
  {
    id: "collector",
    name: "Prestige Home Media",
    share: 0.20,
    reach: 0.38,
    fee: 120_000,
    weeks: 10,
    maxIntensity: 3,
    perViewer: 11,
    catalogueRate: 0.30,
    catalogueWeeks: 48,
  },
] as const;
export type DistributorId = (typeof DISTRIBUTORS)[number]["id"];
export type EditionKind = "subtitles" | "dub" | "premium" | "edited";
export interface ContentProfile {
  violence: number;
  horror: number;
  sexual: number;
  language: number;
  complexity: number;
  context: number;
}
export const PROFILE_KEYS: (keyof ContentProfile)[] = [
  "violence",
  "horror",
  "sexual",
  "language",
  "complexity",
  "context",
];
export const EDITIONS: {
  id: EditionKind;
  name: string;
  cost: number;
  days: number;
  quality: number;
}[] = [
  {
    id: "subtitles",
    name: "Subtitled original",
    cost: 35_000,
    days: 14,
    quality: 0,
  },
  { id: "dub", name: "Standard dub", cost: 120_000, days: 28, quality: 5 },
  { id: "premium", name: "Premium dub", cost: 350_000, days: 42, quality: 9 },
  {
    id: "edited",
    name: "Edited broadcast dub",
    cost: 180_000,
    days: 35,
    quality: 2,
  },
];
export interface OverseasRequest {
  projectId: string;
  territory: TerritoryId;
  distributor: DistributorId;
  segment: SegmentId;
  audience: AudienceId;
  edition: EditionKind;
  campaign: 0 | 75000 | 250000;
}
export interface RegionalRelease extends OverseasRequest {
  modelReception?: number;
  packageId?: string;
  id: string;
  signedWeek: number;
  opensWeek: number;
  endsWeek: number;
  gross: number;
  distributorCut: number;
  royalty: number;
  receipts: number;
  /** declining post-window catalogue money, paid monthly after the main run */
  catalogueReceipts: number;
  catalogueWeeks: number;
  cost: number;
  viewers: number;
  fans: number;
  reception: number;
  reasons: string[];
  language: string;
  editionKey: string;
  audienceKey: string;
  recognised: boolean;
  status: "localising" | "airing" | "completed";
  royaltyRate: number;
}
export interface OverseasState {
  strategy?: OverseasStrategy;
  version: 1;
  introducedWeek: number;
  profiles: Record<string, ContentProfile>;
  releases: RegionalRelease[];
  exposure: Record<string, number>;
  recognition: Partial<Record<TerritoryId, number>>;
  reviews: Record<string, boolean>;
}
export const initialOverseas = (week = 0): OverseasState => ({
  version: 1,
  introducedWeek: week,
  profiles: {},
  releases: [],
  exposure: {},
  recognition: {},
  reviews: {},
});
export const overseasOf = (r: RunState) =>
  r.overseas ?? initialOverseas(r.week);
export function migrateOverseas(
  raw: OverseasState | undefined,
  week: number,
): OverseasState {
  if (!raw || raw.version !== 1) return initialOverseas(week);
  return {
    ...initialOverseas(week),
    ...raw,
    strategy: migrateStrategy(raw.strategy),
    profiles: { ...(raw.profiles ?? {}) },
    releases: Array.isArray(raw.releases) ? raw.releases : [],
    exposure: { ...(raw.exposure ?? {}) },
    recognition: { ...(raw.recognition ?? {}) },
    reviews: { ...(raw.reviews ?? {}) },
  };
}
export function defaultContent(p: Project): ContentProfile {
  const g = p.draft.genres;
  return {
    violence: g.some((x) =>
      ["military", "martial", "kaiju", "crime"].includes(x),
    )
      ? 2
      : 1,
    horror: g.some((x) => ["horror", "cosmic_horror", "grimdark"].includes(x))
      ? 3
      : 0,
    sexual: 0,
    language: 0,
    complexity: g.some((x) => ["mystery", "cosmic_horror", "cyber"].includes(x))
      ? 2
      : 1,
    context: p.draft.continuation || p.draft.licensedIpId ? 2 : 0,
  };
}
export function setContentProfile(
  r: RunState,
  id: string,
  profile: ContentProfile,
): RunState | null {
  const p = r.projects.find((p) => p.id === id);
  if (
    !p ||
    p.stage !== "concept" ||
    (expansionOf(r).credits[id]?.days ?? 0) > 0 ||
    !PROFILE_KEYS.every(
      (k) => Number.isInteger(profile[k]) && profile[k] >= 0 && profile[k] <= 3,
    )
  )
    return null;
  const o = overseasOf(r);
  return {
    ...r,
    overseas: { ...o, profiles: { ...o.profiles, [id]: { ...profile } } },
  };
}
export function reviewLegacyRights(r: RunState, id: string): RunState | null {
  const p = r.projects.find((p) => p.id === id);
  if (!p?.result || p.distributionOwner || p.commission || p.draft.licensedIpId)
    return null;
  // Exact retained award source IDs provide evidence; a title match alone does not.
  if (!r.yearShows.some((n) => n.sourceId === id) || r.cash < 5000) return null;
  const o = overseasOf(r);
  if (o.reviews[id]) return null;
  return {
    ...r,
    cash: r.cash - 5000,
    overseas: { ...o, reviews: { ...o.reviews, [id]: true } },
    strategicSpend: [
      ...r.strategicSpend,
      {
        id: "rights-review:" + id,
        label: "Catalogue rights review",
        amount: 5000,
        week: r.week,
        projectId: id,
      },
    ],
  };
}
export function distributionBlock(
  r: RunState,
  p: Project,
  endWeek: number,
): string | null {
  if (!p.result || !["airing", "done"].includes(p.stage))
    return "Release the original production first";
  if (p.distributionOwner && p.distributionOwner !== "player")
    return "Completed production distribution rights were sold";
  if (!p.distributionOwner && !overseasOf(r).reviews[p.id])
    return "Legacy distribution rights need documented review";
  if (r.franchises[p.draft.franchiseKey ?? p.draft.title]?.soldTo)
    return "Underlying franchise rights were sold";
  if (p.commission)
    return "Commissioned production: territorial rights have not been granted";
  if (p.draft.licensedIpId) {
    const c = r.ipMarket.owned[p.draft.licensedIpId];
    if (!c?.internationalRights)
      return "International adaptation rights are required";
    if (c.expiresWeek <= endWeek)
      return "The international rights expire before this release finishes";
  }
  return null;
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function regionalReception(
  p: Project,
  profile: ContentProfile,
  q: OverseasRequest,
): { score: number; reasons: string[] } {
  const edition = EDITIONS.find((e) => e.id === q.edition)!;
  const edits =
    q.edition === "edited"
      ? [
          profile.violence,
          profile.horror,
          profile.sexual,
          profile.language,
        ].reduce((sum, n) => sum + Math.max(0, n - 1), 0)
      : 0;
  const content =
    q.edition === "edited"
      ? {
          ...profile,
          violence: Math.min(1, profile.violence),
          horror: Math.min(1, profile.horror),
          sexual: Math.min(1, profile.sexual),
          language: Math.min(1, profile.language),
        }
      : profile;
  let fit = 0;
  const reasons: string[] = [],
    points = p.result?.points ?? p.points,
    sum = Math.max(1, points.story + points.art + points.sound);
  switch (q.segment) {
    case "animation":
      fit = (points.art / sum - 0.33) * 40;
      reasons.push("Visual craft matters more to animation viewers.");
      break;
    case "characters":
      fit = (points.story / sum - 0.33) * 35;
      reasons.push("Story craft supports character engagement.");
      break;
    case "source":
      fit = (p.draft.licensedIpId || p.draft.continuation ? 8 : -3) - edits * 5;
      reasons.push(
        edits
          ? "Edits weaken continuity for established fans."
          : "Original continuity is preserved.",
      );
      break;
    case "mainstream":
      fit = 10 - content.context * 5 - content.complexity * 3;
      reasons.push("Accessibility affects newcomers.");
      break;
    case "family":
      fit =
        12 -
        (content.violence +
          content.horror +
          content.sexual +
          content.language) *
          5;
      reasons.push("Family viewers respond to the edition's intensity.");
      break;
    case "experimental":
      fit = content.complexity * 4 - 4 - edits * 3;
      reasons.push("Complexity can reward experimental viewers.");
      break;
  }
  const intensity =
    content.violence + content.horror + content.sexual + content.language;
  switch (q.audience) {
    case "kids":
      fit += 8 - intensity * 4 - content.complexity * 4 - content.context * 3;
      reasons.push(
        "Children benefit from simpler, lower-intensity storytelling.",
      );
      break;
    case "family":
      fit += 6 - intensity * 2 - content.complexity * 2 - content.context * 2;
      reasons.push("Co-viewing favours broadly accessible content.");
      break;
    case "teens":
      fit +=
        Math.min(2, content.complexity) * 2 -
        content.context * 2 -
        Math.max(0, content.sexual - 1) * 3;
      reasons.push(
        "Teen viewers reward some complexity but need accessible context.",
      );
      break;
    case "adults":
      fit += content.complexity * 3 - content.context;
      reasons.push("Adult targeting can support more complex storytelling.");
      break;
  }
  const territory = TERRITORIES.find((t) => t.id === q.territory)!,
    genre = territory.genres.some((g) => p.draft.genres.includes(g)) ? 5 : 0;
  reasons.push(
    genre
      ? "The genre has an established regional audience."
      : "This genre needs to establish a regional audience.",
  );
  if (q.edition === "subtitles" && ["mainstream", "family"].includes(q.segment))
    fit -= 7;
  return {
    score: Math.round(
      clamp(
        (p.result?.total ?? 16) * 2 + fit + edition.quality - edits * 2 + genre,
        5,
        95,
      ),
    ),
    reasons,
  };
}
export interface RegionalQuote {
  block: string | null;
  release: RegionalRelease | null;
  reused: boolean;
}
export function quoteOverseas(r: RunState, q: OverseasRequest): RegionalQuote {
  const fail = (block: string): RegionalQuote => ({
    block,
    release: null,
    reused: false,
  });
  const p = r.projects.find((p) => p.id === q.projectId),
    t = TERRITORIES.find((t) => t.id === q.territory),
    d = DISTRIBUTORS.find((d) => d.id === q.distributor),
    e = EDITIONS.find((e) => e.id === q.edition),
    o = overseasOf(r);
  if (
    !p ||
    !t ||
    !d ||
    !e ||
    !SEGMENTS.some((s) => s.id === q.segment) ||
    !["kids", "teens", "adults", "family"].includes(q.audience) ||
    ![0, 75000, 250000].includes(q.campaign)
  )
    return fail("Choose a production and release terms");
  const infrastructureTier = overseasTierOf(r);
  if (infrastructureTier <= 0) return fail("Build an Export Desk before signing overseas releases");
  const tierDef = OVERSEAS_TIERS[infrastructureTier - 1];
  const activeCount = o.releases.filter((release) => release.endsWeek > r.week).length;
  if (activeCount >= tierDef.maxConcurrent) return fail(`${tierDef.name} can manage ${tierDef.maxConcurrent} live overseas campaign${tierDef.maxConcurrent === 1 ? "" : "s"} at once`);
  if (infrastructureTier === 1 && q.edition !== "subtitles") return fail("Export Desk supports subtitled releases only");
  if (infrastructureTier === 2 && !["subtitles", "dub"].includes(q.edition)) return fail("Premium localisation requires Regional Offices");
  if (infrastructureTier === 1 && q.campaign !== 0) return fail("Regional campaigns require an International Division");
  if (infrastructureTier === 2 && q.campaign === 250000) return fail("Major regional campaigns require Regional Offices");

  const profile = o.profiles[p.id] ?? defaultContent(p),
    intensity = Math.max(
      profile.violence,
      profile.horror,
      profile.sexual,
      profile.language,
    );
  if (q.edition === "edited" && intensity === 3)
    return fail(
      "This production needs substantial new work; a light broadcast edit cannot make it suitable",
    );
  if (
    d.id === "broadcast" &&
    q.edition !== "edited" &&
    intensity > d.maxIntensity
  )
    return fail("Family broadcaster requires content intensity at most 1");
  if (d.id === "broadcast" && !["kids", "family"].includes(q.audience))
    return fail("This broadcaster serves children and family audiences");
  if (
    q.edition === "edited" &&
    expansionOf(r).promises.some(
      (a) =>
        a.projectId === p.id && a.status === "fulfilled" && !a.editApproved,
    )
  )
    return fail(
      "Creator approval required: this promised production retains its original cut",
    );
  const editionKey = [p.id, t.language, e.id].join(":"),
    reused = o.releases.some(
      (a) => a.editionKey === editionKey && a.opensWeek <= r.week,
    );
  const opensWeek = r.week + Math.max(1, Math.ceil((reused ? 7 : e.days) / 7)),
    endsWeek = opensWeek + d.weeks;
  const rights = distributionBlock(r, p, endsWeek);
  if (rights) return fail(rights);
  if (
    o.releases.some(
      (a) =>
        a.projectId === p.id && a.territory === t.id && a.endsWeek > r.week,
    )
  )
    return fail("A territorial release agreement is already active");
  if (
    o.releases.some(
      (a) =>
        a.editionKey === editionKey &&
        a.territory === t.id &&
        r.week - a.signedWeek < 48,
    )
  )
    return fail(
      "This edition needs a year between releases in the same territory",
    );
  const audienceKey = [p.id, t.id, q.segment].join(":"),
    addressable = Math.round(t.population * t.mix[q.segment]),
    remaining = Math.max(0, addressable - (o.exposure[audienceKey] ?? 0));
  if (remaining < 100) return fail("This audience has already been reached");
  const model = regionalReception(p, profile, q);
  const market = regionalMarketFactor(r,q,opensWeek), terms=distributorTerms(r,q);
  const reception = {score:uncertainReception(r,q,model.score),reasons:[...model.reasons,...market.reasons]},
    competition = o.releases.filter(
      (a) =>
        a.territory === t.id &&
        a.segment === q.segment &&
        a.endsWeek > opensWeek,
    ).length;
  const campaign = q.campaign === 250000 ? 1.35 : q.campaign === 75000 ? 1.15 : 1,
    recognition = 1 + Math.min(0.15, (o.recognition[t.id] ?? 0) / 100000);
  const viewers = Math.floor(
    Math.min(
      remaining,
      (remaining *
        terms.reach * market.mult *
        (0.2 + reception.score / 125) *
        campaign *
        recognition) /
        (1 + competition * 0.15),
    ),
  );
  const infrastructureRevenue = [0, 1, 1.08, 1.22, 1.40][infrastructureTier] ?? 1;
  const networkRevenue = r.capitalProjects.includes("distribution_network") ? 1.18 : 1;
  const gross = Math.round(viewers * d.perViewer * infrastructureRevenue * networkRevenue),
    distributorCut = Math.round(gross * terms.share);
  const royaltyRate = p.draft.licensedIpId
      ? (r.ipMarket.owned[p.draft.licensedIpId]?.royaltyRate ?? 0)
      : 0,
    royalty = Math.round((gross - distributorCut) * clamp(royaltyRate, 0, 1));
  const receipts = Math.max(0, gross - distributorCut - royalty),
    catalogueTierMult = [0, 0.75, 0.90, 1.05, 1.20][infrastructureTier] ?? 1,
    catalogueReceipts = Math.max(0, Math.round(receipts * d.catalogueRate * catalogueTierMult)),
    fans =
      reception.score >= 50
        ? Math.floor((viewers * (reception.score - 45)) / 1000)
        : -Math.min(o.recognition[t.id] ?? 0, Math.floor(viewers * 0.02));
  const cost = (reused ? 0 : e.cost) + d.fee + q.campaign;
  const release: RegionalRelease = {
    ...q,
    id: "regional:" + p.id + ":" + t.id + ":" + r.week,
    signedWeek: r.week,
    opensWeek,
    endsWeek,
    gross,
    distributorCut,
    royalty,
    receipts,
    catalogueReceipts,
    catalogueWeeks: d.catalogueWeeks,
    cost,
    viewers,
    fans,
    reception: reception.score,
    modelReception: model.score,
    reasons: reception.reasons,
    language: t.language,
    editionKey,
    audienceKey,
    recognised: false,
    status: "localising",
    royaltyRate,
  };
  return {
    block:
      r.cash < cost ? "Insufficient cash for localisation and launch" : null,
    release,
    reused,
  };
}
export function signOverseas(r: RunState, q: OverseasRequest): RunState | null {
  const quote = quoteOverseas(r, q),
    a = quote.release;
  if (quote.block || !a) return null;
  const o = overseasOf(r),
    x = expansionOf(r),
    account = x.accounts[a.projectId];
  return {
    ...r,
    cash: r.cash - a.cost,
    expansion: {
      ...x,
      accounts: account
        ? {
            ...x.accounts,
            [a.projectId]: { ...account, cost: account.cost + a.cost },
          }
        : x.accounts,
    },
    overseas: {
      ...o,
      releases: [...o.releases, a],
      exposure: {
        ...o.exposure,
        [a.audienceKey]: (o.exposure[a.audienceKey] ?? 0) + a.viewers,
      },
    },
    strategicSpend: [
      ...r.strategicSpend,
      {
        id: a.id,
        label: "Overseas localisation and launch",
        amount: a.cost,
        week: r.week,
        projectId: a.projectId,
      },
    ],
    notices: [
      ...r.notices,
      "Overseas release signed: " +
        (r.projects.find((p) => p.id === a.projectId)?.draft.title ?? "") +
        " — " +
        TERRITORIES.find((t) => t.id === a.territory)!.name,
    ].slice(-40),
  };
}
/** Terms are committed at signature; recognisation schedules cash instalments only once. */
export function advanceOverseasWeek(r: RunState): RunState {
  const o = overseasOf(r),
    payouts = [...r.payouts],
    recognition = { ...o.recognition },
    franchises = { ...r.franchises };
  let totalRevenue = r.totalRevenue;
  const releases = o.releases.map((a) => {
    if (!a.recognised && r.week >= a.opensWeek) {
      const count = a.endsWeek - a.opensWeek;
      let assigned = 0,
        assignedFans = 0;
      for (let i = 0; i < count; i++) {
        const amount =
            i === count - 1
              ? a.receipts - assigned
              : Math.floor(a.receipts / count),
          fans =
            i === count - 1
              ? a.fans - assignedFans
              : Math.trunc(a.fans / count);
        payouts.push({
          week: a.opensWeek + i,
          amount,
          fans,
          label:
            "Overseas · " +
            a.territory +
            " · " +
            (r.projects.find((p) => p.id === a.projectId)?.draft.title ??
              a.projectId),
          sourceProjectId: a.projectId,
          sourceReleaseId: a.id,
          instalment: i,
        });
        assigned += amount;
        assignedFans += fans;
      }
      const catalogueInstalments = Math.max(1, Math.ceil(a.catalogueWeeks / 4));
      let assignedCatalogue = 0;
      for (let i = 0; i < catalogueInstalments; i++) {
        const amount =
          i === catalogueInstalments - 1
            ? a.catalogueReceipts - assignedCatalogue
            : Math.floor(a.catalogueReceipts / catalogueInstalments);
        if (amount > 0) {
          payouts.push({
            week: a.endsWeek + (i + 1) * 4,
            amount,
            fans: 0,
            label:
              "Overseas catalogue · " +
              a.territory +
              " · " +
              (r.projects.find((p) => p.id === a.projectId)?.draft.title ?? a.projectId),
            sourceProjectId: a.projectId,
            sourceReleaseId: a.id,
            instalment: count + i,
          });
        }
        assignedCatalogue += amount;
      }
      totalRevenue += a.receipts + a.catalogueReceipts;
      recognition[a.territory] = Math.max(
        0,
        (recognition[a.territory] ?? 0) + a.fans,
      );
      const p = r.projects.find((p) => p.id === a.projectId),
        key = p?.draft.franchiseKey ?? p?.draft.title,
        fr = key ? franchises[key] : null;
      if (key && fr) {
        const popularityGain = a.reception >= 80 ? 5 : a.reception >= 65 ? 3 : a.reception >= 50 ? 1 : 0;
        const fatigueGain = a.reception >= 80 ? 2 : a.reception >= 65 ? 1 : 0;
        const updated = {
          ...fr,
          totalRevenue: fr.totalRevenue + a.receipts + a.catalogueReceipts,
          lifetimeFans: Math.max(0, fr.lifetimeFans + a.fans),
          popularity: Math.min(100, fr.popularity + popularityGain),
          fatigue: Math.min(100, fr.fatigue + fatigueGain),
        };
        updated.merchValue = merchValueOf(updated);
        franchises[key] = updated;
      }
      return {
        ...a,
        recognised: true,
        status: (r.week >= a.endsWeek
          ? "completed"
          : "airing") as RegionalRelease["status"],
      };
    }
    return r.week >= a.endsWeek ? { ...a, status: "completed" as const } : a;
  });
  return advanceOverseasStrategy({
    ...r,
    payouts,
    totalRevenue,
    franchises,
    overseas: { ...o, releases, recognition },
  });
}
