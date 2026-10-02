import { initialRun, type RunState } from "./state";
import type { Showrunner } from "./data";
import type { DynastyPathId } from "./legacy";

declare module "./state" {
  interface RunState {
    /** 0/undefined = ordinary career, 1+ = knowledge-legacy generation. */
    newGamePlusGeneration?: number;
    newGamePlusSource?: { studio: string; endedWeek: number };
    /** Optional replay identity: modest institutional bias, never inherited wealth. */
    newGamePlusLegacy?: DynastyPathId | "none";
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
  legacy: DynastyPathId | "none" = "none",
): RunState {
  const fresh = initialRun(studio, showrunner);
  const knownPairs = Object.fromEntries(
    Object.entries(completed.comboLevels ?? {})
      .filter(([, level]) => level > 0)
      .map(([key]) => [key, 1]),
  );
  const inheritedResearch = (completed.research ?? []).filter(isKnowledgeResearch);
  const legacyResearch =
    legacy === "talent" ? ["staff_appraisal", "talent_scouting"] :
    [];
  const legacyTracks =
    legacy === "creative" ? { writing: 1 } :
    legacy === "global" ? { business: 1 } :
    legacy === "production" ? { animation: 1 } :
    {};
  const legacyLabel =
    legacy === "creative" ? "Creative Institution · Writing Lv1" :
    legacy === "global" ? "Global Media Group · Business & Audience Lv1" :
    legacy === "talent" ? "Talent Dynasty · appraisal + scouting knowledge" :
    legacy === "production" ? "Production Empire · Animation Lv1" :
    "No inherited studio culture";
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
    research: [...new Set([...inheritedResearch, ...legacyResearch])],
    researchTrackLevels: { ...fresh.researchTrackLevels, ...legacyTracks },
    audienceInsights: [...(completed.audienceInsights ?? [])],
    newGamePlusGeneration: Math.max(1, (completed.newGamePlusGeneration ?? 0) + 1),
    newGamePlusSource: { studio: completed.studio, endedWeek: completed.week },
    newGamePlusLegacy: legacy,
    notices: [
      ...fresh.notices,
      `⭐ NEW GAME+ ${Math.max(1, (completed.newGamePlusGeneration ?? 0) + 1)} — a fresh studio begins with ${completed.studio}\'s research notebooks. Legacy: ${legacyLabel}. Money, staff, facilities, IP and production power start from zero.`,
    ].slice(-40),
  };
}
