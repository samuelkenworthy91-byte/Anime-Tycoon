import { describe, expect, it } from "vitest";
import { studioKnowledgeEmphasis } from "../studioOps";

describe("studio knowledge emphasis (pure helper)", () => {
  it("blended ideal >= 50 emphasises side A", () => {
    expect(studioKnowledgeEmphasis(62, "Plot", "Characters")).toBe("Plot");
    expect(studioKnowledgeEmphasis(50, "Sakuga", "Consistency")).toBe("Sakuga");
    expect(studioKnowledgeEmphasis(75, "Soundtrack", "Voice Cast")).toBe("Soundtrack");
  });

  it("blended ideal < 50 emphasises side B", () => {
    expect(studioKnowledgeEmphasis(38, "Plot", "Characters")).toBe("Characters");
    expect(studioKnowledgeEmphasis(24, "Sakuga", "Consistency")).toBe("Consistency");
    expect(studioKnowledgeEmphasis(49, "Soundtrack", "Voice Cast")).toBe("Voice Cast");
  });

  it("matches the direction a real blended idea points to (dual-genre average)", () => {
    /* story phase: mecha ideal 60 + slice ideal 30 -> blended 45 -> B side */
    expect(studioKnowledgeEmphasis(Math.round((60 + 30) / 2), "Plot", "Characters")).toBe("Characters");
    /* sports 72 + martial 62 -> blended 67 -> A side */
    expect(studioKnowledgeEmphasis(Math.round((72 + 62) / 2), "Plot", "Characters")).toBe("Plot");
  });
});
