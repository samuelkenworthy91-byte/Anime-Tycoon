import type { RunState } from "./state";

/**
 * Abandon any production that has not started airing. Money already spent is
 * sunk. Commissioned work is harsher: the advance is clawed back and the
 * commissioner relationship takes a substantial hit.
 */
export function scrapProject(run: RunState, projectId: string): RunState | null {
  const project = run.projects.find((p) => p.id === projectId);
  if (!project || project.stage === "airing" || project.stage === "done") return null;

  let cash = run.cash;
  let partners = { ...run.partners };
  const consequences: string[] = [];

  if (project.commission) {
    cash -= project.commission.advance;
    const id = project.commission.partnerId;
    partners[id] = Math.max(0, (partners[id] ?? 45) - 18);
    consequences.push(`commission advance £${project.commission.advance.toLocaleString("en-GB")} clawed back`, `${project.commission.partnerName} reputation −18`);
  }

  const writeOff = Math.max(0, Math.round(project.spent));
  consequences.unshift(`£${writeOff.toLocaleString("en-GB")} written off`);

  return {
    ...run,
    cash,
    partners,
    projects: run.projects.filter((p) => p.id !== projectId),
    notices: [...run.notices, `🗑 “${project.draft.title}” SCRAPPED — ${consequences.join(" · ")}.`],
  };
}
