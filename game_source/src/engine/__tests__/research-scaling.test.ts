import { describe, expect, it } from "vitest";
import { ARC_RESEARCH_ALL_COMBO_IDS, ARC_RESEARCH_ALL_GENRE_KEYS } from "../data";
import {
  GENRE_STUDY_FIRST_BATCH,
  NARRATIVE_STUDY_FIRST_BATCH,
  applyResearchCompletion,
  initialRun,
  researchProjectCost,
  startResearchProject,
} from "../state";

describe("repeat research economics", () => {
  it("starts Genre Studies at 2, 4, 8, 12 RD", () => {
    const start = initialRun("Genre Lab", "steady");
    const first = applyResearchCompletion(start, "genre_studies", "Genre Studies");
    const second = applyResearchCompletion(first, "genre_studies", "Genre Studies");
    const third = applyResearchCompletion(second, "genre_studies", "Genre Studies");

    expect(Object.keys(first.arcGenreKnowledge)).toHaveLength(GENRE_STUDY_FIRST_BATCH);
    expect(Object.keys(second.arcGenreKnowledge).length - Object.keys(first.arcGenreKnowledge).length).toBe(GENRE_STUDY_FIRST_BATCH);
    expect(researchProjectCost(start, "genre_studies", 32)).toBe(2);
    expect(researchProjectCost(first, "genre_studies", 32)).toBe(4);
    expect(researchProjectCost(second, "genre_studies", 32)).toBe(8);
    expect(researchProjectCost(third, "genre_studies", 32)).toBe(12);
  });

  it("starts Narrative Analytics at 2, 4, 8, 12 RD", () => {
    const start = initialRun("Story Lab", "steady");
    const first = applyResearchCompletion(start, "narrative_analytics", "Narrative Analytics");
    const second = applyResearchCompletion(first, "narrative_analytics", "Narrative Analytics");
    const third = applyResearchCompletion(second, "narrative_analytics", "Narrative Analytics");

    expect(first.arcCombos).toHaveLength(NARRATIVE_STUDY_FIRST_BATCH);
    expect(second.arcCombos.length - first.arcCombos.length).toBe(NARRATIVE_STUDY_FIRST_BATCH);
    expect(researchProjectCost(start, "narrative_analytics", 38)).toBe(2);
    expect(researchProjectCost(first, "narrative_analytics", 38)).toBe(4);
    expect(researchProjectCost(second, "narrative_analytics", 38)).toBe(8);
    expect(researchProjectCost(third, "narrative_analytics", 38)).toBe(12);
  });

  it("tops out at 200 RD for the final genre-fit batch and 300 RD for final arc-combo batch", () => {
    const start = initialRun("Late Lab", "steady");
    const genreKnown = Object.fromEntries(
      ARC_RESEARCH_ALL_GENRE_KEYS.slice(0, Math.max(0, ARC_RESEARCH_ALL_GENRE_KEYS.length - GENRE_STUDY_FIRST_BATCH)).map((key) => [key, 1]),
    );
    const genreLate = { ...start, research: [...start.research, "genre_studies"], arcGenreKnowledge: genreKnown };
    expect(researchProjectCost(genreLate, "genre_studies", 32)).toBe(200);

    const arcLate = {
      ...start,
      research: [...start.research, "narrative_analytics"],
      arcCombos: ARC_RESEARCH_ALL_COMBO_IDS.slice(0, Math.max(0, ARC_RESEARCH_ALL_COMBO_IDS.length - NARRATIVE_STUDY_FIRST_BATCH)),
    };
    expect(researchProjectCost(arcLate, "narrative_analytics", 38)).toBe(300);
  });

  it("does not make later repeat studies take longer just because they cost more RD", () => {
    const start = { ...initialRun("Timing Lab", "steady"), rd: 9999 };
    const firstJob = startResearchProject(start, "genre_studies", 32);
    expect(firstJob).not.toBeNull();
    const firstDuration = firstJob!.researchJobs[0].completesDay! - firstJob!.researchJobs[0].startDay!;

    const completed = { ...applyResearchCompletion(start, "genre_studies", "Genre Studies"), rd: 9999 };
    const secondJob = startResearchProject(completed, "genre_studies", 32);
    expect(secondJob).not.toBeNull();
    const secondDuration = secondJob!.researchJobs[0].completesDay! - secondJob!.researchJobs[0].startDay!;

    expect(secondDuration).toBe(firstDuration);
    expect(secondJob!.researchJobs[0].rdCost).toBeGreaterThan(firstJob!.researchJobs[0].rdCost);
  });
});
