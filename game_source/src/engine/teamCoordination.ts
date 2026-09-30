import { ROLE_POINT, staffPoint, type Staff } from "./data";

/** The first six people are the production's core crew. Beyond that, adding
 * bodies still helps but communication/management overhead starts to bite. */
export const TEAM_COORDINATION_START = 6;
export const TEAM_COORDINATION_FLOOR = 0.55;

/** A deliberately readable curve: 7 people are barely affected; giant late-game
 * crews need either a strong Production Manager or a dedicated coordinator. */
export function baseTeamCoordinationEfficiency(teamSize: number): number {
  const extra = Math.max(0, Math.floor(teamSize) - TEAM_COORDINATION_START);
  if (extra <= 0) return 1;
  return Math.max(TEAM_COORDINATION_FLOOR, 1 - extra * 0.07);
}

/** Production Manager craft turns into relief from the large-team penalty.
 * A strong head meaningfully helps without fully replacing the coordinator perk. */
export function productionHeadCoordinationRelief(head?: Staff | null): number {
  if (!head) return 0;
  const main = staffPoint(head, ROLE_POINT[head.role]);
  const average = (head.story + head.art + head.sound) / 3;
  const craft = main * 0.68 + average * 0.32;
  return Math.max(0.12, Math.min(0.82, 0.12 + craft / 145));
}

export function hasProductionCoordinator(team: Staff[]): boolean {
  return team.some((staff) => (staff.traits ?? []).includes("coordinator"));
}

/** 1 = no coordination loss. A Production Coordinator on the project completely
 * negates diminishing returns. Otherwise the Production Manager recovers a
 * percentage of the lost efficiency based on their real skill. */
export function teamCoordinationEfficiency(team: Staff[], headRelief = 0): number {
  if (team.length <= TEAM_COORDINATION_START || hasProductionCoordinator(team)) return 1;
  const base = baseTeamCoordinationEfficiency(team.length);
  const relief = Math.max(0, Math.min(0.9, headRelief));
  return Math.min(1, base + (1 - base) * relief);
}

export function effectiveCoordinatedTeamSize(team: Staff[], headRelief = 0): number {
  return team.length * teamCoordinationEfficiency(team, headRelief);
}
