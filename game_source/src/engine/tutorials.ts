import type { RunState } from "./state";

export type TutorialId =
  | "passion-projects"
  | "working-policies"
  | "overseas-markets"
  | "rights-market"
  | "financial-distress"
  | "dynasty-mode"
  | "franchise-library"
  | "studio-knowledge"
  | "auto-manage"
  | "production-capability";

declare module "./state" {
  interface RunState {
    /** One-time contextual tutorials acknowledged in this save. */
    tutorialsSeen?: TutorialId[];
  }
}

export const tutorialSeen = (run: RunState, id: TutorialId) =>
  (run.tutorialsSeen ?? []).includes(id);

export const markTutorialSeen = (run: RunState, id: TutorialId): RunState =>
  tutorialSeen(run, id)
    ? run
    : { ...run, tutorialsSeen: [...(run.tutorialsSeen ?? []), id] };
