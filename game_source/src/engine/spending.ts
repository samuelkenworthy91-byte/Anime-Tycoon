import type { PointType } from "./data";
import { draftCost, type Project, type ProjectStage } from "./projects";
import type { RunState } from "./state";

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
}

export const INTERVENTIONS: InterventionDef[] = [
  { id: "writing_overhaul", name: "Writing Room Overhaul", cost: 38_000, stages: ["concept", "preprod"], description: "Rebuild weak structure; may create continuity notes.", point: "story", points: 34, issueDelta: 1, risk: .2 },
  { id: "animation_pass", name: "Extra Animation Pass", cost: 65_000, stages: ["animation", "post"], description: "Target key sequences, not the whole show.", point: "art", points: 38, issueDelta: -1, risk: .12 },
  { id: "retakes", name: "Retakes / Reshoots", cost: 52_000, stages: ["sound", "post"], description: "Repair performances at schedule cost.", point: "sound", points: 28, issueDelta: -1, days: 7, risk: .1 },
  { id: "soundtrack", name: "Soundtrack Enhancement", cost: 45_000, stages: ["sound", "post"], description: "Commission a specialist suite.", point: "sound", points: 32, risk: .08 },
  { id: "schedule", name: "Schedule Extension", cost: 22_000, stages: ["concept", "preprod", "animation", "sound", "post"], description: "Buy two weeks; hype cools while rivals keep moving.", days: 14, hype: -6, risk: 0 },
  { id: "consultant", name: "Specialist Consultant", cost: 30_000, stages: ["concept", "preprod", "animation"], description: "Reduce adaptation/technical mistakes; imperfect advice.", points: 18, issueDelta: -2, risk: .18 },
  { id: "continuity", name: "Continuity Repair", cost: 48_000, stages: ["post", "marketing"], description: "Expensive surgery for accumulated notes.", point: "story", points: 15, issueDelta: -4, risk: .08 },
  { id: "crunch", name: "Executive Crunch", cost: 18_000, stages: ["animation", "sound", "post"], description: "Fast output with a real chance of more errors.", points: 26, issueDelta: 2, risk: .4 },
  { id: "final_polish", name: "Final Polish Pass", cost: 72_000, stages: ["post", "marketing", "ready"], description: "Diminishing returns; cannot fix a broken foundation.", points: 22, issueDelta: -2, risk: .1 },
];

export function interventionBlock(run: RunState, p: Project, d: InterventionDef): string | null {
  if (p.stage === "airing" || p.stage === "done") return "Already released";
  if (!d.stages.includes(p.stage)) return `Only during ${d.stages.join("/")}`;
  if (run.cash < d.cost) return "Not enough cash";
  if ((p.interventions ?? []).includes(d.id)) return "Already used";
  return null;
}

function tunedIntervention(run: RunState, d: InterventionDef) {
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
  return { points, risk, issueDelta, boosts };
}

export function applyIntervention(run: RunState, projectId: string, id: string, rng = Math.random): RunState | null {
  const d = INTERVENTIONS.find((x) => x.id === id);
  const p = run.projects.find((x) => x.id === projectId);
  if (!d || !p || interventionBlock(run, p, d)) return null;
  const tuned = tunedIntervention(run, d);
  const success = rng() >= tuned.risk;
  const point = d.point ?? (["story", "art", "sound"] as PointType[])[Math.floor(rng() * 3)];
  const gain = success ? tuned.points : Math.round(tuned.points * .25);
  const updated: Project = {
    ...p,
    points: { ...p.points, [point]: p.points[point] + gain },
    issues: Math.max(0, p.issues + tuned.issueDelta + (success ? 0 : 1)),
    hype: Math.max(0, p.hype + (d.hype ?? 0)),
    deadlineDay: (p.deadlineDay ?? p.deadlineWeek * 7) + (d.days ?? 0),
    deadlineWeek: p.deadlineWeek + Math.ceil((d.days ?? 0) / 7),
    spent: p.spent + d.cost,
    interventions: [...(p.interventions ?? []), d.id],
  };
  const capital = tuned.boosts.length ? ` · ${tuned.boosts.join(" + ")} enhanced the pass` : "";
  return {
    ...run,
    cash: run.cash - d.cost,
    projects: run.projects.map((x) => x.id === projectId ? updated : x),
    strategicSpend: [...run.strategicSpend, { id: `int_${run.week}_${projectId}_${id}`, label: d.name, amount: d.cost, week: run.week, projectId }],
    notices: [...run.notices, `${success ? "✅" : "⚠️"} ${d.name} on “${p.draft.title}”: ${success ? `+${gain} ${point}` : "limited improvement and an extra note"}${capital} (−£${d.cost.toLocaleString("en-GB")}).`],
  };
}

export interface CapitalDef { id: string; name: string; cost: number; minOffice: number; description: string; }
export const CAPITAL_PROJECTS: CapitalDef[] = [
  { id: "screening_theatre", name: "Private Screening Theatre", cost: 1_500_000, minOffice: 2, description: "Improves consultant/final-polish work and prestige launch campaigns." },
  { id: "mocap_stage", name: "Performance Capture Stage", cost: 18_000_000, minOffice: 3, description: "Strengthens animation passes and retakes while cutting failure risk." },
  { id: "orchestra_hall", name: "Orchestral Recording Hall", cost: 42_000_000, minOffice: 4, description: "Greatly strengthens soundtrack enhancement work." },
  { id: "global_merch", name: "Global Merch Centre", cost: 120_000_000, minOffice: 4, description: "Boosts character-led and international launch campaigns." },
  { id: "distribution_network", name: "Worldwide Distribution Network", cost: 260_000_000, minOffice: 4, description: "Boosts mass-media and international campaigns across territories." },
  { id: "convention_venue", name: "Exhibition & Convention Venue", cost: 480_000_000, minOffice: 4, description: "Supercharges convention panels and owned fan events." },
  { id: "flagship_hq", name: "Global Flagship Headquarters", cost: 1_100_000_000, minOffice: 4, description: "Improves every strategic campaign and gives stronger co-production terms." },
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

/**
 * Rival co-productions deliberately reuse ProjectCommission. That makes the
 * cash injection + back-end share save-stable and lets the authoritative
 * release reducer settle the partner share without a parallel finance path.
 */
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
