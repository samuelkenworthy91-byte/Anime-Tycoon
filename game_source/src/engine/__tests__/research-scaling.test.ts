import { describe, expect, it } from "vitest";
import {
  GENRE_STUDY_FIRST_BATCH,
  NARRATIVE_STUDY_FIRST_BATCH,
  applyResearchCompletion,
  initialRun,
  researchProjectCost,
  startResearchProject,
} from "../state";

describe("repeat research economics", () => {
  it("keeps Genre Studies discovery batches fixed while the RD cost rises", () => {
    const start = initialRun("Genre Lab", "steady");
    const first = applyResearchCompletion(start, "genre_studies", "Genre Studies");
    const firstKnown = Object.keys(first.arcGenreKnowledge).length;
    const second = applyResearchCompletion(first, "genre_studies", "Genre Studies");
    const secondKnown = Object.keys(second.arcGenreKnowledge).length;

    expect(firstKnown).toBe(GENRE_STUDY_FIRST_BATCH);
    expect(secondKnown - firstKnown).toBe(GENRE_STUDY_FIRST_BATCH);
    expect(researchProjectCost(start, "genre_studies", 32)).toBe(32);
    expect(researchProjectCost(first, "genre_studies", 32)).toBe(48);
    expect(researchProjectCost(second, "genre_studies", 32)).toBe(64);
  });

  it("keeps Narrative Analytics batches fixed while the RD cost rises", () => {
    const start = initialRun("Story Lab", "steady");
    const first = applyResearchCompletion(start, "narrative_analytics", "Narrative Analytics");
    const firstKnown = first.arcCombos.length;
    const second = applyResearchCompletion(first, "narrative_analytics", "Narrative Analytics");
    const secondKnown = second.arcCombos.length;

    expect(firstKnown).toBe(NARRATIVE_STUDY_FIRST_BATCH);
    expect(secondKnown - firstKnown).toBe(NARRATIVE_STUDY_FIRST_BATCH);
    expect(researchProjectCost(start, "narrative_analytics", 38)).toBe(38);
    expect(researchProjectCost(first, "narrative_analytics", 38)).toBe(57);
    expect(researchProjectCost(second, "narrative_analytics", 38)).toBe(76);
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
