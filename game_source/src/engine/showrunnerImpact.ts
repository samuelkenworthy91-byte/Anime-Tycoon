import { SHOWRUNNERS } from "./data";

export interface ShowrunnerImpactSummary {
  name: string;
  title: string;
  numbers: string;
}

const IMPACT: Record<string, string> = {
  steady: "Staff contribution output ×1.50 · pre-edit production note chance ×0.75",
  vision: "Synergistic Twist/Lore arcs +2 story quality each · every critic score has a 3/10 floor",
  producer: "Contract pay ×1.40 · commission advance and completion bonus ×1.30",
  marketer: "Every production starts +10 hype · production marketing hype ×1.50 · GOOD/EXCELLENT strategic campaigns ×1.20",
  operations: "Production scheduling +10 percentage points · production burn ×0.90 · Slate Readiness builds ×1.25",
  franchise: "New sequel/continuation fatigue ×0.75 · franchise Slate Readiness builds ×1.25",
  mentor: "Weekly staff work XP ×1.25 · resting stamina recovery ×1.25 · formal mentee XP ×1.20 (instead of ×1.12)",
  research: "R&D project duration ×0.75 · RD prices ×0.90",
  casting: "Positive story structures ×1.15 · release fans ×1.25, or ×1.50 when Story leads a coherent release",
  festival: "Experimental genre-pair synergy above neutral ×1.60",
  dealmaker: "Unknown direction targets are revealed as a ±10 range (20 points wide)",
  genre: "First production of an untried two-genre pairing: staff output and pace ×1.35",
  planner: "Slate Readiness ×1.50 · release moves within ±3 weeks preserve banked planning · earlier cash/capacity warnings",
  auteur: "Signature review multiplier +2 percentage points · outside-speciality penalty ×0.50 · House rank requirements advance faster",
  audience: "Pre-release audience forecast · well-matched publicity ×1.15 · well-matched merch ×1.15 · weak targeting visible earlier",
};

export function showrunnerImpactSummary(id: string): ShowrunnerImpactSummary {
  const runner = SHOWRUNNERS.find((x) => x.id === id) ?? SHOWRUNNERS[0];
  return {
    name: runner.name,
    title: runner.title,
    numbers: IMPACT[id] ?? runner.perk,
  };
}
