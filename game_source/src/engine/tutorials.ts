import type { RunState } from "./state";

export type TutorialId =
  | "passion-projects"
  | "overseas-markets"
  | "rights-market"
  | "financial-distress"
  | "dynasty-mode"
  | "franchise-library"
  | "studio-knowledge"
  | "auto-manage"
  | "production-capability"
  | "slate-planning"
  | "review-diagnosis"
  | "research-disciplines"
  | "publicity-audience"
  | "merch-bets"
  | "industry-movements"
  | "staff-relationships"
  | "rival-memories"
  | "studio-reputation"
  | "career-era-delegation";

declare module "./state" {
  interface RunState {
    /** One-time contextual tutorials acknowledged in this save. Optional for old-save compatibility. */
    tutorialsSeen?: TutorialId[];
  }
}

export const tutorialSeen = (run: RunState, id: TutorialId) =>
  (run.tutorialsSeen ?? []).includes(id);

export const markTutorialSeen = (run: RunState, id: TutorialId): RunState =>
  tutorialSeen(run, id)
    ? run
    : { ...run, tutorialsSeen: [...(run.tutorialsSeen ?? []), id] };
