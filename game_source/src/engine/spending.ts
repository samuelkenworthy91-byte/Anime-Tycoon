import type { PointType } from "./data";
import { draftCost, type Project, type ProjectStage } from "./projects";
import type { RunState } from "./state";
import { specialisationProjectEffects } from "./specialisation";

export type InvestmentTierId = "standard" | "extended" | "prestige" | "obsessive";
export type ProductionCapabilityId = "writing" | "animation" | "sound" | "post" | "marketing";

export interface InvestmentTierDef {
  id: InvestmentTierId;
  name: string;
  minOffice: number;
  costMult: number;
  pointMult: number;
  repairMult: number;
  hypeMult: number;
  scheduleMult: number;
  riskMult: number;
  description: string;
}

/** Spend rises much faster than output. These are deliberately not tied to
 * current bank balance: a rich studio can buy certainty, but never efficiently. */
export const INVESTMENT_TIERS: readonly InvestmentTierDef[] = [
  { id: "standard", name: "Standard", minOffice: 0, costMult: 1, pointMult: 1, repairMult: 1, hypeMult: 1, scheduleMult: 1, riskMult: 1, description: "Normal targeted intervention." },
  { id: "extended", name: "Extended", minOffice: 1, costMult: 2.75, pointMult: 1.55, repairMult: 1.35, hypeMult: 1.45, scheduleMult: 1.25, riskMult: .9, description: "More people and passes; clearly stronger, much less efficient." },
  { id: "prestige", name: "Prestige", minOffice: 2, costMult: 7.5, pointMult: 2.15, repairMult: 1.7, hypeMult: 1.85, scheduleMult: 1.45, riskMult: .78, description: "Top-tier external talent and extensive rework." },
  { id: "obsessive", name: "Obsessive", minOffice: 2, costMult: 18, pointMult: 2.7, repairMult: 2, hypeMult: 2.15, scheduleMult: 1.6, riskMult: .68, description: "Blank-cheque craft obsession. Huge spend for diminishing returns." },
] as const;

export interface CapabilityDef {
  id: ProductionCapabilityId;
  name: string;
  description: string;
}

export const CAPABILITY_DEFS: readonly CapabilityDef[] = [
  { id: "writing", name: "Writing Development", description: "Permanent experience from repeated script-room and story consultancy investment." },
  { id: "animation", name: "Animation Pipeline", description: "Permanent know-how from repeated animation rescue and finishing investment." },
  { id: "sound", name: "Sound & Music", description: "Permanent recording, scoring and audio-production know-how." },
  { id: "post", name: "Post-Production", description: "Permanent retake, continuity and finishing capability." },
  { id: "marketing", name: "Marketing / Launch", description: "Permanent launch-material and campaign execution capability." },
] as const;

export const CAPABILITY_THRESHOLDS = [150_000, 500_000, 1_250_000, 2_500_000, 4_500_000, 7_500_000, 12_000_000, 18_000_000] as const;
export const MAX_CAPABILITY_LEVEL = CAPABILITY_THRESHOLDS.length;

export interface InterventionDef {
  id: string;
  name: string;
  cost: number;
  stages: ProjectStage[];
  description: string;
  point?: PointType;
  points?: number;
  issueDelta?: number;
  hype?: number;
  days?: number;
  risk: number;
  scalable?: boolean;
  capability?: ProductionCapabilityId;
  /** UI-only tier marker. Canonical project history always stores baseId. */
  investmentTier?: InvestmentTierId;
  baseId?: string;
}

export const BASE_INTERVENTIONS: InterventionDef[] = [
  { id: "writing_overhaul", name: "Writing Room Overhaul", cost: 38_000, stages: ["concept", "preprod"], description: "Rebuild weak structure; may create continuity notes.", point: "story", points: 34, issueDelta: 1, risk: .2, scalable: true, capability: "writing" },
  { id: "animation_pass", name: "Extra Animation Pass", cost: 65_000, stages: ["animation", "post"], description: "Target key sequences, not the whole show.", point: "art", points: 38, issueDelta: -1, risk: .12, scalable: true, capability: "animation" },
  { id: "retakes", name: "Retakes / Reshoots", cost: 52_000, stages: ["sound", "post"], description: "Repair performances at schedule cost.", point: "sound", points: 28, issueDelta: -1, days: 7, risk: .1, scalable: true, capability: "post" },
  { id: "soundtrack", name: "Soundtrack Enhancement", cost: 45_000, stages: ["sound", "post"], description: "Commission a specialist suite.", point: "sound", points: 32, risk: .08, scalable: true, capability: "sound" },
  { id: "schedule", name: "Schedule Extension", cost: 22_000, stages: ["concept", "preprod", "animation", "sound", "post"], description: "Buy two weeks; hype cools while rivals keep moving.", days: 14, hype: -6, risk: 0 },
  { id: "consultant", name: "Specialist Consultant", cost: 30_000, stages: ["concept", "preprod", "animation"], description: "Reduce adaptation/technical mistakes; imperfect advice.", points: 18, issueDelta: -2, risk: .18, scalable: true, capability: "writing" },
  { id: "continuity", name: "Continuity Repair", cost: 48_000, stages: ["post", "marketing"], description: "Repairs accumulated notes, then turns up to six new mistakes into R&D over the next 21 days.", point: "story", points: 15, issueDelta: -4, risk: .08, scalable: true, capability: "post" },
  { id: "crunch", name: "Executive Rush", cost: 18_000, stages: ["animation", "sound", "post"], description: "For 14 days normal production bubbles fire twice, but new editor-note risk also doubles.", risk: 0 },
  { id: "final_polish", name: "Final Polish Pass", cost: 72_000, stages: ["post", "marketing", "ready"], description: "Diminishing returns; cannot fix a broken foundation.", points: 22, issueDelta: -2, risk: .1, scalable: true, capability: "post" },
  { id: "launch_upgrade", name: "Launch Materials Upgrade", cost: 55_000, stages: ["marketing", "ready"], description: "Premium trailers, key art and launch assets. Raises awareness, not review quality.", hype: 12, risk: 0, scalable: true, capability: "marketing" },
];

const tierById = (id: InvestmentTierId) => INVESTMENT_TIERS.find((x) => x.id === id)!;
const round5k = (v: number) => Math.max(5_000, Math.round(v / 5_000) * 5_000);
const scaleSigned = (v: number, mult: number) => v === 0 ? 0 : Math.sign(v) * Math.max(1, Math.round(Math.abs(v) * mult));

export const interventionInvestmentKey = (id: string, tier: InvestmentTierId) => tier === "standard" ? id : `${id}::${tier}`;
export function parseInterventionInvestmentKey(key: string): { id: string; tier: InvestmentTierId } {
  const [id, tierRaw] = key.split("::");
  const tier = INVESTMENT_TIERS.some((x) => x.id === tierRaw) ? tierRaw as InvestmentTierId : "standard";
  return { id, tier };
}

/** Existing Project Board code consumes INTERVENTIONS directly. Stage 5 keeps
 * that contract stable by exposing each scalable tier as a catalogue row while
 * the engine below normalises every row back to its canonical base action. */
export const INTERVENTIONS: InterventionDef[] = BASE_INTERVENTIONS.flatMap((base) => {
  const tiers = base.scalable ? INVESTMENT_TIERS : INVESTMENT_TIERS.slice(0, 1);
  return tiers.map((tier) => ({
    ...base,
    id: interventionInvestmentKey(base.id, tier.id),
    baseId: base.id,
    investmentTier: tier.id,
    name: base.scalable ? `${base.name} · ${tier.name}` : base.name,
    cost: tier.id === "standard" ? base.cost : round5k(base.cost * tier.costMult),
    description: tier.id === "standard" ? base.description : `${tier.description} ${Math.round(tier.pointMult * 100)}% craft-scale effect for ${Math.round(tier.costMult * 100)}% base cost.`,
  }));
});

function baseIntervention(d: InterventionDef): InterventionDef {
  const id = d.baseId ?? parseInterventionInvestmentKey(d.id).id;
  return BASE_INTERVENTIONS.find((x) => x.id === id) ?? d;
}

function resolvedTier(d: InterventionDef, tierId: InvestmentTierId): InvestmentTierId {
  return d.investmentTier && tierId === "standard" ? d.investmentTier : tierId;
}

function capabilityForSpendLabel(label: string): ProductionCapabilityId | null {
  const def = BASE_INTERVENTIONS.find((d) => d.capability && label.startsWith(d.name));
  return def?.capability ?? null;
}

export function capabilitySpend(run: Pick<RunState, "strategicSpend">, id: ProductionCapabilityId): number {
  return (run.strategicSpend ?? []).reduce((sum, spend) => capabilityForSpendLabel(spend.label) === id ? sum + Math.max(0, spend.amount) : sum, 0);
}

export function capabilityLevelFromSpend(spend: number): number {
  return CAPABILITY_THRESHOLDS.reduce((level, threshold) => spend >= threshold ? level + 1 : level, 0);
}

export interface ProductionCapabilityStatus extends CapabilityDef {
  spend: number;
  level: number;
  nextThreshold: number | null;
  toNext: number;
  effect: string;
}

export function productionCapabilities(run: Pick<RunState, "strategicSpend">): ProductionCapabilityStatus[] {
  return CAPABILITY_DEFS.map((def) => {
    const spend = capabilitySpend(run, def.id);
    const level = capabilityLevelFromSpend(spend);
    const nextThreshold = CAPABILITY_THRESHOLDS[level] ?? null;
    const effect = def.id === "post"
      ? `+${level * 2}% related rescue output · stronger repair/risk control`
      : def.id === "marketing"
        ? `+${level * 2}% related launch intervention effect`
        : `+${level * 2}% related intervention output`;
    return { ...def, spend, level, nextThreshold, toNext: nextThreshold === null ? 0 : Math.max(0, nextThreshold - spend), effect };
  });
}

export const productionCapability = (run: Pick<RunState, "strategicSpend">, id: ProductionCapabilityId) =>
  productionCapabilities(run).find((x) => x.id === id)!;

function tunedIntervention(run: RunState, d0: InterventionDef) {
  const d = baseIntervention(d0);
  let points = d.points ?? 0;
  let risk = d.risk;
  let issueDelta = d.issueDelta ?? 0;
  const boosts: string[] = [];
  if (run.capitalProjects.includes("mocap_stage") && (d.id === "animation_pass" || d.id === "retakes")) {
    points += d.id === "animation_pass" ? 14 : 9;
    risk *= .55;
    issueDelta -= 1;
    boosts.push("Performance Capture Stage");
  }
  if (run.capitalProjects.includes("orchestra_hall") && d.id === "soundtrack") {
    points += 15;
    risk *= .45;
    boosts.push("Orchestral Recording Hall");
  }
  if (run.capitalProjects.includes("screening_theatre") && (d.id === "consultant" || d.id === "final_polish")) {
    points += 6;
    risk *= .8;
    boosts.push("Private Screening Theatre");
  }
  if (run.capitalProjects.includes("distribution_network") && d.id === "launch_upgrade") boosts.push("Worldwide Distribution Network");
  return { points, risk, issueDelta, boosts };
}

export interface InterventionQuote {
  intervention: InterventionDef;
  tier: InvestmentTierDef;
  cost: number;
  points: number;
  issueDelta: number;
  hype: number;
  days: number;
  risk: number;
  capability: ProductionCapabilityStatus | null;
  boosts: string[];
}

export function interventionQuote(run: RunState, d0: InterventionDef, tierId: InvestmentTierId = "standard", draft?: Project["draft"]): InterventionQuote | null {
  const d = baseIntervention(d0);
  const useTier = resolvedTier(d0, tierId);
  const tier = tierById(useTier);
  if (!tier) return null;
  if (!d.scalable && useTier !== "standard") return null;
  const tuned = tunedIntervention(run, d);
  const capability = d.capability ? productionCapability(run, d.capability) : null;
  const signature = draft ? specialisationProjectEffects(run, draft) : null;
  const capabilityMult = 1 + (capability?.level ?? 0) * .02;
  const signatureEffectMult = signature?.interventionEffectMult ?? 1;
  const postRepairMult = d.capability === "post" ? 1 + (capability?.level ?? 0) * .025 : capabilityMult;
  const marketingCapitalMult = d.id === "launch_upgrade" && run.capitalProjects.includes("distribution_network") ? 1.12 : 1;
  const riskExperience = d.capability === "post" ? Math.max(.72, 1 - (capability?.level ?? 0) * .025) : Math.max(.82, 1 - (capability?.level ?? 0) * .015);
  return {
    intervention: d,
    tier,
    cost: (() => {
      const baseCost = useTier === "standard" ? d.cost : round5k(d.cost * tier.costMult);
      const mult = signature?.interventionCostMult ?? 1;
      return Math.abs(mult - 1) < .001 ? baseCost : round5k(baseCost * mult);
    })(),
    points: Math.max(0, Math.round(tuned.points * tier.pointMult * capabilityMult * signatureEffectMult)),
    issueDelta: scaleSigned(tuned.issueDelta, tier.repairMult * postRepairMult * (tuned.issueDelta < 0 ? signatureEffectMult : 1)),
    hype: scaleSigned(d.hype ?? 0, tier.hypeMult * (d.capability === "marketing" ? capabilityMult : 1) * marketingCapitalMult * signatureEffectMult),
    days: Math.max(0, Math.round((d.days ?? 0) * tier.scheduleMult)),
    risk: Math.max(0, Math.min(.9, tuned.risk * tier.riskMult * riskExperience * (signature?.interventionRiskMult ?? 1))),
    capability,
    boosts: tuned.boosts,
  };
}

export function interventionBlock(run: RunState, p: Project, d0: InterventionDef, tierId: InvestmentTierId = "standard"): string | null {
  const d = baseIntervention(d0);
  const useTier = resolvedTier(d0, tierId);
  const tier = tierById(useTier);
  const quote = interventionQuote(run, d, useTier, p.draft);
  if (!quote) return d.scalable ? "Unavailable investment tier" : "This is a single-scale emergency action";
  if (p.stage === "airing" || p.stage === "done") return "Already released";
  if (!d.stages.includes(p.stage)) return `Only during ${d.stages.join("/")}`;
  if (run.officeLevel < tier.minOffice) return `${tier.name} investment requires studio level ${tier.minOffice + 1}`;
  if (run.cash < quote.cost) return "Not enough cash";
  if ((p.interventions ?? []).includes(d.id)) return "Already used on this production";
  return null;
}

export function applyIntervention(run: RunState, projectId: string, key: string, rng = Math.random): RunState | null {
  const parsed = parseInterventionInvestmentKey(key);
  const d = BASE_INTERVENTIONS.find((x) => x.id === parsed.id);
  const p = run.projects.find((x) => x.id === projectId);
  if (!d || !p || interventionBlock(run, p, d, parsed.tier)) return null;
  const quote = interventionQuote(run, d, parsed.tier, p.draft)!;
  const success = rng() >= quote.risk;
  const point = d.point ?? (["story", "art", "sound"] as PointType[])[Math.floor(rng() * 3)];
  const gain = success ? quote.points : Math.round(quote.points * .25);
  const issueDelta = quote.issueDelta + (success ? 0 : quote.points > 0 ? 1 : 0);
  const nowDay = run.day ?? run.week * 7;
  const updated: Project = {
    ...p,
    points: gain > 0 ? { ...p.points, [point]: p.points[point] + gain } : p.points,
    issues: Math.max(0, p.issues + issueDelta),
    hype: Math.max(0, p.hype + quote.hype),
    deadlineDay: (p.deadlineDay ?? p.deadlineWeek * 7) + quote.days,
    deadlineWeek: p.deadlineWeek + Math.ceil(quote.days / 7),
    spent: p.spent + quote.cost,
    interventions: [...(p.interventions ?? []), d.id],
    ...(d.id === "crunch" ? { executiveRushUntilDay: nowDay + 14 } : {}),
    ...(d.id === "continuity" && success ? { noteToRdUntilDay: nowDay + 21, noteToRdConverted: 0 } : {}),
  };
  const label = d.scalable ? `${d.name} · ${quote.tier.name}` : d.name;
  const strategicSpend = [...run.strategicSpend, { id: `int_${run.week}_${projectId}_${d.id}_${parsed.tier}`, label, amount: quote.cost, week: run.week, projectId }];
  const previousLevel = d.capability ? productionCapability(run, d.capability).level : 0;
  const nextCapability = d.capability ? productionCapability({ strategicSpend }, d.capability) : null;
  const capabilityNotice = nextCapability && nextCapability.level > previousLevel ? ` · ${nextCapability.name} rises to Lv${nextCapability.level}` : "";
  const capital = quote.boosts.length ? ` · ${quote.boosts.join(" + ")} enhanced the pass` : "";
  const effects = [
    gain > 0 ? `+${gain} ${point}` : null,
    quote.issueDelta < 0 ? `${Math.abs(quote.issueDelta)} note${Math.abs(quote.issueDelta) === 1 ? "" : "s"} repaired` : quote.issueDelta > 0 ? `+${quote.issueDelta} rework note${quote.issueDelta === 1 ? "" : "s"}` : null,
    quote.hype !== 0 ? `${quote.hype > 0 ? "+" : ""}${quote.hype} hype` : null,
    quote.days > 0 ? `+${quote.days} schedule days` : null,
    d.id === "crunch" ? "14 days ×2 production bubbles · ×2 note risk" : null,
    d.id === "continuity" && success ? "21 days: up to 6 new notes become R&D" : null,
  ].filter(Boolean).join(" · ");
  return {
    ...run,
    cash: run.cash - quote.cost,
    projects: run.projects.map((x) => x.id === projectId ? updated : x),
    strategicSpend,
    notices: [...run.notices, `${success ? "✅" : "⚠️"} ${quote.tier.name} ${d.name} on “${p.draft.title}”: ${success ? (effects || "completed") : `limited improvement${gain > 0 ? ` (+${gain} ${point})` : ""}`}${capital} (−£${quote.cost.toLocaleString("en-GB")})${capabilityNotice}.`].slice(-40),
  };
}

export interface CapitalDef { id: string; name: string; cost: number; minOffice: number; description: string; }
export const CAPITAL_PROJECTS: CapitalDef[] = [
  { id: "screening_theatre", name: "Private Screening Theatre", cost: 1_500_000, minOffice: 1, description: "Improves consultant/final-polish work and prestige launch campaigns." },
  { id: "mocap_stage", name: "Performance Capture Stage", cost: 18_000_000, minOffice: 1, description: "Strengthens animation passes and retakes while cutting failure risk." },
  { id: "orchestra_hall", name: "Orchestral Recording Hall", cost: 42_000_000, minOffice: 1, description: "Greatly strengthens soundtrack enhancement work." },
  { id: "global_merch", name: "Global Merch Centre", cost: 120_000_000, minOffice: 1, description: "Boosts character-led and international launch campaigns." },
  { id: "distribution_network", name: "Worldwide Distribution Network", cost: 260_000_000, minOffice: 1, description: "Boosts mass-media and international campaigns across territories." },
  { id: "convention_venue", name: "Exhibition & Convention Venue", cost: 480_000_000, minOffice: 1, description: "Supercharges convention panels and owned fan events." },
  { id: "flagship_hq", name: "Global Flagship Headquarters", cost: 1_100_000_000, minOffice: 1, description: "Improves every strategic campaign and gives stronger co-production terms." },
];

export function buyCapitalProject(run: RunState, id: string): RunState | null {
  const d = CAPITAL_PROJECTS.find((x) => x.id === id);
  if (!d || run.capitalProjects.includes(id) || run.cash < d.cost || run.officeLevel < d.minOffice) return null;
  return {
    ...run,
    cash: run.cash - d.cost,
    capitalProjects: [...run.capitalProjects, id],
    strategicSpend: [...run.strategicSpend, { id: `cap_${run.week}_${id}`, label: d.name, amount: d.cost, week: run.week }],
    notices: [...run.notices, `🏛 ${d.name} completed (−£${d.cost.toLocaleString("en-GB")}). ${d.description}`],
  };
}

export function signStaffContract(run: RunState, staffId: string, years = 2, exclusive = true): RunState | null {
  const s = run.staff.find((x) => x.id === staffId);
  if (!s) return null;
  const bonus = Math.round(s.salary * 48 * years * (exclusive ? .5 : .3) / 1000) * 1000;
  if (run.cash < bonus) return null;
  return {
    ...run,
    cash: run.cash - bonus,
    staffContracts: { ...run.staffContracts, [staffId]: { expiresWeek: run.week + 48 * years, bonus, exclusive } },
    strategicSpend: [...run.strategicSpend, { id: `staff_${run.week}_${staffId}`, label: `${s.name} retention contract`, amount: bonus, week: run.week }],
    notices: [...run.notices, `${s.name} signs a ${years}-year ${exclusive ? "exclusive " : ""}contract (−£${bonus.toLocaleString("en-GB")}).`],
  };
}

export interface CoProductionOffer {
  studioId: string;
  studioName: string;
  contribution: number;
  revenueShare: number;
  fit: boolean;
}

export function coProductionOffer(run: RunState, projectId: string): CoProductionOffer | null {
  const p = run.projects.find((x) => x.id === projectId);
  if (!p || p.commission || !["concept", "preprod", "animation", "sound"].includes(p.stage)) return null;
  const rivals = run.rivalWorld.studios
    .filter((s) => s.status !== "collapsed")
    .map((s) => {
      const fit = s.preferred.some((genre) => p.draft.genres.includes(genre));
      const score = s.reputation + s.tier * 12 + (fit ? 24 : 0);
      return { s, fit, score };
    })
    .sort((a, b) => b.score - a.score);
  const pick = rivals[0];
  if (!pick) return null;
  const total = Math.max(1, draftCost(p.draft));
  const remaining = Math.max(0, total - p.spent);
  if (remaining < 15_000) return null;
  const contribution = Math.max(15_000, Math.min(remaining, Math.round((total * (.22 + pick.s.tier * .035 + (pick.fit ? .06 : 0))) / 5_000) * 5_000));
  const legalReduction = (run.facilities.legal ?? 0) * .02;
  const flagshipReduction = run.capitalProjects.includes("flagship_hq") ? .03 : 0;
  const revenueShare = Math.max(.12, Math.min(.42, contribution / total * .72 + .08 - legalReduction - flagshipReduction));
  return { studioId: pick.s.id, studioName: pick.s.name, contribution, revenueShare, fit: pick.fit };
}

export function startCoProduction(run: RunState, projectId: string): RunState | null {
  const p = run.projects.find((x) => x.id === projectId);
  const offer = coProductionOffer(run, projectId);
  if (!p || !offer) return null;
  const updated: Project = {
    ...p,
    commission: {
      partnerId: `coprod:${offer.studioId}`,
      partnerName: offer.studioName,
      advance: offer.contribution,
      share: offer.revenueShare,
      minQuality: 0,
      bonus: 0,
      deadlineWeek: p.deadlineWeek,
      deadlineDay: p.deadlineDay,
    },
  };
  return {
    ...run,
    cash: run.cash + offer.contribution,
    projects: run.projects.map((x) => x.id === projectId ? updated : x),
    notices: [...run.notices, `🤝 Co-production signed: ${offer.studioName} contributes £${offer.contribution.toLocaleString("en-GB")} to “${p.draft.title}” for ${Math.round(offer.revenueShare * 100)}% of release revenue${offer.fit ? " · strong genre fit" : ""}.`],
  };
}
