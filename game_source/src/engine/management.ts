import type { Project } from "./projects";
import type { RunState } from "./state";

export type ProjectManagementMode = "manual" | "routine-auto" | "auto-except-prestige";
export type ContractManagementMode = "ask" | "minimum" | "fastest";
export type AlertManagementMode = "all" | "exceptions";

export interface StudioManagementPolicy {
  projectMode: ProjectManagementMode;
  contractMode: ContractManagementMode;
  alertMode: AlertManagementMode;
}

export const DEFAULT_MANAGEMENT_POLICY: StudioManagementPolicy = {
  projectMode: "manual",
  contractMode: "ask",
  alertMode: "all",
};

export function managementPolicyOf(run: Pick<RunState, "managementPolicy" | "executiveDelegation">): StudioManagementPolicy {
  const raw = run.managementPolicy;
  return {
    projectMode: raw?.projectMode === "routine-auto" || raw?.projectMode === "auto-except-prestige"
      ? raw.projectMode
      : run.executiveDelegation ? "routine-auto" : "manual",
    contractMode: raw?.contractMode === "minimum" || raw?.contractMode === "fastest" ? raw.contractMode : "ask",
    alertMode: raw?.alertMode === "exceptions" ? "exceptions" : "all",
  };
}

export function setManagementPolicy(run: RunState, patch: Partial<StudioManagementPolicy>): RunState {
  const current = managementPolicyOf(run);
  const next = { ...current, ...patch };
  return {
    ...run,
    managementPolicy: next,
    /* keep the old boolean in sync for compatibility with old components/saves */
    executiveDelegation: next.projectMode !== "manual",
    notices: [...run.notices, `🧭 MANAGEMENT POLICY UPDATED · projects ${next.projectMode.replaceAll("-", " ")} · jobs ${next.contractMode} · alerts ${next.alertMode}.`].slice(-40),
  };
}

export function shouldAutoDelegateProject(
  run: Pick<RunState, "managementPolicy" | "executiveDelegation">,
  project: Pick<Project, "draft">,
): boolean {
  const mode = managementPolicyOf(run).projectMode;
  if (mode === "manual") return false;
  if (mode === "auto-except-prestige") {
    return project.draft.scope !== "prestige" && project.draft.budget !== "blockbuster";
  }
  return true;
}

export function shouldPauseForRoutineCompletions(
  run: Pick<RunState, "managementPolicy" | "executiveDelegation">,
): boolean {
  return managementPolicyOf(run).alertMode === "all";
}

export type ActionCentreTarget =
  | "projects"
  | "contracts"
  | "staff"
  | "ambitions"
  | "overseas"
  | "research"
  | "facilities"
  | "dynasty"
  | "rivals"
  | "management"
  | "dna";

export interface ActionCentreItem {
  id: string;
  target: ActionCentreTarget;
  priority: number;
  label: string;
  detail: string;
  tone: "critical" | "attention" | "opportunity" | "info";
}

export function actionCentreItems(run: RunState): ActionCentreItem[] {
  const items: ActionCentreItem[] = [];
  const projects = run.projects ?? [];
  const ready = projects.filter((p) => p.stage === "ready").length;
  const milestones = projects.filter((p) => !!p.milestone && !p.rush).length;
  if (ready || milestones) items.push({
    id: "project-attention",
    target: "projects",
    priority: 100,
    label: "Production needs you",
    detail: [milestones ? `${milestones} milestone${milestones === 1 ? "" : "s"}` : "", ready ? `${ready} release decision${ready === 1 ? "" : "s"}` : ""].filter(Boolean).join(" · "),
    tone: "critical",
  });

  if (run.cash < 0) items.push({
    id: "cash-pressure",
    target: "contracts",
    priority: 95,
    label: "Cash pressure",
    detail: `Studio is ${Math.abs(run.cash).toLocaleString("en-GB")} below £0 · contract work can stabilise the runway.`,
    tone: "critical",
  });

  const activePitches = (run.expansion?.pitches ?? []).filter((p) => !["declined", "accepted"].includes(p.status)).length;
  const activePromises = (run.expansion?.promises ?? []).filter((p) => p.status === "active").length;
  if (activePitches || activePromises) items.push({
    id: "creator-ambitions",
    target: "ambitions",
    priority: 80,
    label: "Creator commitments",
    detail: `${activePitches} active pitch${activePitches === 1 ? "" : "es"} · ${activePromises} promise${activePromises === 1 ? "" : "s"} to manage.`,
    tone: "attention",
  });

  const exportable = projects.filter((p) => !!p.result && !p.distributionOwner);
  if (run.officeLevel >= 1 && exportable.length > 0) items.push({
    id: "overseas-opportunity",
    target: "overseas",
    priority: 55,
    label: "Overseas opportunity",
    detail: `${exportable.length} completed production${exportable.length === 1 ? "" : "s"} can be evaluated for regional release.`,
    tone: "opportunity",
  });

  const lowStaff = (run.staff ?? []).filter((s) => s.stamina < 25).length;
  if (lowStaff >= 2) items.push({
    id: "staff-fatigue",
    target: "staff",
    priority: 65,
    label: "Team fatigue",
    detail: `${lowStaff} staff are below 25 stamina. Reassign or rest them before output collapses.`,
    tone: "attention",
  });

  if (run.dynasty && !(run.dynasty as { path?: string }).path) items.push({
    id: "dynasty-path",
    target: "dynasty",
    priority: 70,
    label: "Choose a legacy strategy",
    detail: "Post-career growth now branches by studio identity instead of letting every empire buy every bonus.",
    tone: "opportunity",
  });

  if (run.week >= 8 * 48 && managementPolicyOf(run).projectMode === "manual") items.push({
    id: "management-policy",
    target: "management",
    priority: 45,
    label: "Delegate routine work",
    detail: "Your studio is mature enough to manage by exception. Set project, job and alert defaults.",
    tone: "info",
  });

  const topRival = [...(run.rivalWorld?.studios ?? [])]
    .filter((studio) => studio.status !== "collapsed")
    .sort((a, b) => b.rivalry - a.rivalry)[0];
  if (topRival && topRival.rivalry >= 55) items.push({
    id: "rival-intent",
    target: "rivals",
    priority: 40,
    label: `${topRival.name} is watching you`,
    detail: `Rivalry ${Math.round(topRival.rivalry)}/100 · check their upcoming slate and strategic intent.`,
    tone: "info",
  });

  return items.sort((a, b) => b.priority - a.priority || a.label.localeCompare(b.label));
}
