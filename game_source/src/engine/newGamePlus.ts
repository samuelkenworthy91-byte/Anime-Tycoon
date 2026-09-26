import { initialRun, type RunState } from "./state";
import type { Showrunner } from "./data";

declare module "./state" {
  interface RunState {
    /** 0/undefined = ordinary career, 1+ = knowledge-legacy generation. */
    newGamePlusGeneration?: number;
    newGamePlusSource?: { studio: string; endedWeek: number };
  }
}

const KNOWLEDGE_RESEARCH = new Set(["staff_appraisal", "talent_scouting"]);
const isKnowledgeResearch = (id: string) =>
  KNOWLEDGE_RESEARCH.has(id) || id.startsWith("experimental_combo_");

/** New Game+ deliberately carries INFORMATION, not the old studio's economy.
 * Known genre pairs come across at Lv1: their fit stays revealed/quick-pickable
 * without importing a 25-year +17.5% combo-mastery bonus into a fresh career. */
export function createNewGamePlusRun(
  completed: RunState,
  studio: string,
  showrunner: Showrunner["id"],
): RunState {
  const fresh = initialRun(studio, showrunner);
  const knownPairs = Object.fromEntries(
    Object.entries(completed.comboLevels ?? {})
      .filter(([, level]) => level > 0)
      .map(([key]) => [key, 1]),
  );
  const inheritedResearch = (completed.research ?? []).filter(isKnowledgeResearch);
  return {
    ...fresh,
    genresUnlocked: [...completed.genresUnlocked],
    comboLevels: knownPairs,
    legacyComboLevels: { ...(completed.legacyComboLevels ?? {}) },
    genreKnowledge: { ...(completed.genreKnowledge ?? {}) },
    castCombos: [...new Set(completed.castCombos ?? [])],
    castAffinityDiscovered: [...new Set(completed.castAffinityDiscovered ?? [])],
    arcCombos: [...new Set(completed.arcCombos ?? [])],
    arcUnlocked: [...new Set(completed.arcUnlocked ?? [])],
    arcKnowledge: { ...(completed.arcKnowledge ?? {}) },
    arcGenreKnowledge: { ...(completed.arcGenreKnowledge ?? {}) },
    research: [...new Set(inheritedResearch)],
    audienceInsights: [...(completed.audienceInsights ?? [])],
    newGamePlusGeneration: Math.max(1, (completed.newGamePlusGeneration ?? 0) + 1),
    newGamePlusSource: { studio: completed.studio, endedWeek: completed.week },
    notices: [
      ...fresh.notices,
      `⭐ NEW GAME+ ${Math.max(1, (completed.newGamePlusGeneration ?? 0) + 1)} — a fresh studio begins with ${completed.studio}'s research notebooks. Money, staff, facilities, IP and production power start from zero.`,
    ].slice(-40),
  };
}
