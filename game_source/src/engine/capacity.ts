import { PRODUCTION_SCOPES, type PointType, type Staff } from "./data";
import type { Facilities } from "./facilities";
import { activeProjects, type Project, type ProjectStage } from "./projects";

export type DepartmentId = "story" | "animation" | "sound" | "post" | "marketing";

export interface DepartmentStatus {
  id: DepartmentId;
  label: string;
  capacity: number;
  demand: number;
  utilization: number;
  overloaded: boolean;
}

export const DEPARTMENT_LABEL: Record<DepartmentId, string> = {
  story: "Writing",
  animation: "Animation",
  sound: "Sound / Voice",
  post: "Post / QA",
  marketing: "Marketing",
};

export function departmentForStage(stage: ProjectStage): DepartmentId | null {
  if (stage === "concept" || stage === "preprod") return "story";
  if (stage === "animation") return "animation";
  if (stage === "sound") return "sound";
  if (stage === "post") return "post";
  if (stage === "marketing") return "marketing";
  return null;
}

const roleContribution = (s: Staff, point: PointType, preferred: Staff["role"]) => {
  const skill = s[point];
  const roleF = s.role === preferred ? 1 : 0.38;
  const staminaF = 0.72 + s.stamina / 360;
  return skill * roleF * staminaF;
};

export function departmentCapacities(staff: Staff[], facilities: Facilities, research: string[]): Record<DepartmentId, number> {
  const writers = facilities.writers ?? 0;
  const anim = facilities.animation ?? 0;
  const rec = facilities.recording ?? 0;
  const edit = facilities.editing ?? 0;
  const market = facilities.marketing ?? 0;
  const cg = research.includes("cg") ? 1.2 : 1;
  const qa = research.includes("qa") ? 1.15 : 1;
  return {
    story: Math.round(65 + staff.reduce((a, s) => a + roleContribution(s, "story", "writer"), 0) + writers * 55),
    animation: Math.round((65 + staff.reduce((a, s) => a + roleContribution(s, "art", "animator"), 0) + anim * 65) * cg),
    sound: Math.round(60 + staff.reduce((a, s) => a + roleContribution(s, "sound", "composer"), 0) + rec * 58),
    post: Math.round((58 + staff.reduce((a, s) => a + ((s.art + s.sound) / 2) * 0.42, 0) + edit * 70) * qa),
    marketing: Math.round(55 + staff.reduce((a, s) => a + ((s.story + s.art + s.sound) / 3) * 0.28, 0) + market * 72),
  };
}

export function projectDepartmentDemand(p: Project, research: string[]): number {
  const dept = departmentForStage(p.stage);
  if (!dept || p.milestone) return 0;
  const scope = PRODUCTION_SCOPES[p.draft.scope ?? "standard"];
  const budget = p.draft.budget === "blockbuster" ? 1.38 : p.draft.budget === "indie" ? 0.78 : 1;
  const stage = dept === "animation" ? 1.15 : dept === "post" ? 0.82 : dept === "marketing" ? 0.7 : 1;
  const cgRelief = dept === "animation" && p.draft.budget === "blockbuster" && research.includes("cg") ? 0.9 : 1;
  return Math.round(105 * scope.workMult * budget * stage * cgRelief);
}

export function departmentStatuses(projects: Project[], staff: Staff[], facilities: Facilities, research: string[]): DepartmentStatus[] {
  const capacities = departmentCapacities(staff, facilities, research);
  const demand = { story: 0, animation: 0, sound: 0, post: 0, marketing: 0 } as Record<DepartmentId, number>;
  for (const p of activeProjects(projects)) {
    const d = departmentForStage(p.stage);
    if (d) demand[d] += projectDepartmentDemand(p, research);
  }
  return (Object.keys(demand) as DepartmentId[]).map((id) => {
    const capacity = capacities[id];
    const d = demand[id];
    const utilization = capacity > 0 ? d / capacity : d > 0 ? 9 : 0;
    return { id, label: DEPARTMENT_LABEL[id], capacity, demand: d, utilization, overloaded: utilization > 1 };
  });
}

/** per-project schedule multiplier from studio-wide department contention. */
export function projectLoadMap(projects: Project[], staff: Staff[], facilities: Facilities, research: string[]): Record<string, number> {
  const statuses = departmentStatuses(projects, staff, facilities, research);
  const byId = Object.fromEntries(statuses.map((s) => [s.id, s])) as Record<DepartmentId, DepartmentStatus>;
  const out: Record<string, number> = {};
  for (const p of activeProjects(projects)) {
    const d = departmentForStage(p.stage);
    if (!d || p.milestone) continue;
    const s = byId[d];
    out[p.id] = s.demand <= s.capacity ? 1 : Math.max(0.52, s.capacity / Math.max(1, s.demand));
  }
  return out;
}
