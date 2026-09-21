import type { Draft, GenreId, PointType } from "./data";
import type { ShowResult } from "./scoring";
import { genreTargetFor } from "./genreTargets";

export type KnowledgeBand = "UNKNOWN" | "EARLY" | "UNDERSTOOD" | "MASTERED";
export type DiagnosticTone = "strength" | "concern" | "lesson";
export type DiagnosticArea = "story" | "art" | "sound" | "direction" | "editing" | "arcs" | "casting" | "hype" | "commercial";

export interface ReleaseDiagnostic {
  id: string;
  tone: DiagnosticTone;
  area: DiagnosticArea;
  headline: string;
  detail: string;
  weight: number;
}

export interface ReleaseDiagnosis {
  knowledge: KnowledgeBand;
  strengths: ReleaseDiagnostic[];
  concerns: ReleaseDiagnostic[];
  lessons: ReleaseDiagnostic[];
}

const pointLabel: Record<PointType, string> = { story: "Story", art: "Animation", sound: "Sound" };
const phaseLabels = ["development direction", "visual direction", "sound direction"] as const;

export function knowledgeForGenres(genres: readonly GenreId[], ledger: Partial<Record<GenreId, number>> = {}): number {
  if (!genres.length) return 0;
  return Math.min(...genres.map((genre) => ledger[genre] ?? 0));
}

export function knowledgeBand(value: number): KnowledgeBand {
  if (value >= 9) return "MASTERED";
  if (value >= 6) return "UNDERSTOOD";
  if (value >= 3) return "EARLY";
  return "UNKNOWN";
}

const pct = (value: number) => Math.round(value * 100);

function directionDetail(index: number, actual: number, ideal: number, knowledge: KnowledgeBand): string {
  const delta = actual - ideal;
  const direction = delta > 0 ? "high" : "low";
  if (Math.abs(delta) <= 8) return `The ${phaseLabels[index]} landed close to what this genre mix rewards.`;
  if (knowledge === "MASTERED") {
    return `The ${phaseLabels[index]} was ${Math.abs(Math.round(delta))} points too ${direction}; studio knowledge now puts the useful range around ${Math.max(0, Math.round(ideal - 6))}–${Math.min(100, Math.round(ideal + 6))}.`;
  }
  if (knowledge === "UNDERSTOOD") return `The ${phaseLabels[index]} was noticeably too ${direction} for this genre mix.`;
  return `Audience response suggests the ${phaseLabels[index]} was pushed in the wrong direction.`;
}

export function diagnoseRelease(
  draft: Draft,
  result: Pick<ShowResult, "points" | "issues" | "chemMult" | "arcClashes" | "genreSalesMult" | "total" | "tier">,
  genreKnowledge: Partial<Record<GenreId, number>> = {},
): ReleaseDiagnosis {
  const target = genreTargetFor(draft.genres);
  const knowledge = knowledgeBand(knowledgeForGenres(draft.genres, genreKnowledge));
  const out: ReleaseDiagnostic[] = [];
  const pointTypes: PointType[] = ["story", "art", "sound"];
  const totalPoints = Math.max(1, result.points.story + result.points.art + result.points.sound);
  const mixes = pointTypes.map((type) => result.points[type] / totalPoints);

  pointTypes.forEach((type, index) => {
    const delta = mixes[index] - target.ratio[index];
    if (Math.abs(delta) < 0.055) {
      out.push({
        id: `mix-${type}`, tone: "strength", area: type,
        headline: `${pointLabel[type]} emphasis was well judged`,
        detail: `${pointLabel[type]} occupied ${pct(mixes[index])}% of production output and stayed close to the audience's preferred balance.`,
        weight: 2 + Math.abs(delta),
      });
    } else if (delta < -0.08) {
      out.push({
        id: `mix-${type}`, tone: "concern", area: type,
        headline: `${pointLabel[type]} was under-supported`,
        detail: knowledge === "MASTERED"
          ? `${pointLabel[type]} landed at ${pct(mixes[index])}% against a learned target near ${pct(target.ratio[index])}%.`
          : `${pointLabel[type]} received less production attention than this genre mix appears to reward.`,
        weight: 4 + Math.abs(delta) * 10,
      });
    } else if (delta > 0.10) {
      out.push({
        id: `mix-${type}`, tone: "lesson", area: type,
        headline: `${pointLabel[type]} may have been over-invested`,
        detail: `A large share of production output went into ${pointLabel[type].toLowerCase()}, creating diminishing returns elsewhere.`,
        weight: 2 + Math.abs(delta) * 8,
      });
    }
  });

  draft.sliders.forEach((actual, index) => {
    const ideal = target.ideal[index];
    const delta = Math.abs(actual - ideal);
    if (delta <= 8) {
      out.push({ id: `direction-${index}`, tone: "strength", area: "direction", headline: `${phaseLabels[index][0].toUpperCase() + phaseLabels[index].slice(1)} was convincing`, detail: directionDetail(index, actual, ideal, knowledge), weight: 2.5 });
    } else if (delta >= 20) {
      out.push({ id: `direction-${index}`, tone: "concern", area: "direction", headline: `${phaseLabels[index][0].toUpperCase() + phaseLabels[index].slice(1)} fought the material`, detail: directionDetail(index, actual, ideal, knowledge), weight: 3 + delta / 12 });
    } else {
      out.push({ id: `direction-${index}`, tone: "lesson", area: "direction", headline: `${phaseLabels[index][0].toUpperCase() + phaseLabels[index].slice(1)} could be refined`, detail: directionDetail(index, actual, ideal, knowledge), weight: 1.8 + delta / 20 });
    }
  });

  if (result.issues >= 5) {
    out.push({ id: "editing", tone: "concern", area: "editing", headline: "Editing notes materially hurt the finish", detail: `${result.issues} unresolved notes reached release. More QA, time or targeted repair would have made the master cleaner.`, weight: 5 + result.issues / 3 });
  } else if (result.issues === 0) {
    out.push({ id: "editing", tone: "strength", area: "editing", headline: "The master shipped clean", detail: "No unresolved editing notes reached reviewers.", weight: 3 });
  }

  if ((result.arcClashes?.length ?? 0) > 0) out.push({ id: "arcs-clash", tone: "concern", area: "arcs", headline: "The story structure pulled against itself", detail: "At least one ordered arc combination created a known structural clash.", weight: 5 });
  if (result.chemMult >= 1.08) out.push({ id: "chemistry", tone: "strength", area: "casting", headline: "The cast clicked", detail: `The ensemble produced a meaningful chemistry lift (×${result.chemMult.toFixed(2)}).`, weight: 3.5 });
  if ((result.genreSalesMult ?? 1) >= 1.08) out.push({ id: "word-mouth", tone: "strength", area: "commercial", headline: "The premise generated strong word of mouth", detail: `The genre pairing increased commercial momentum to ×${(result.genreSalesMult ?? 1).toFixed(2)}.`, weight: 3 });
  if ((result.genreSalesMult ?? 1) <= 0.92) out.push({ id: "word-mouth", tone: "lesson", area: "commercial", headline: "The premise limited word of mouth", detail: `The genre pairing reduced commercial momentum to ×${(result.genreSalesMult ?? 1).toFixed(2)}, even if craft remained respectable.`, weight: 3 });
  if (result.total >= 32) out.push({ id: "overall", tone: "strength", area: "commercial", headline: "The complete package broke through", detail: "Multiple systems aligned strongly enough to clear the Hall of Fame threshold.", weight: 4 });

  const rank = (tone: DiagnosticTone) => out.filter((d) => d.tone === tone).sort((a, b) => b.weight - a.weight).slice(0, 3);
  return { knowledge, strengths: rank("strength"), concerns: rank("concern"), lessons: rank("lesson") };
}

export function reviewEvidenceFor(criteria: string | undefined, diagnosis: ReleaseDiagnosis): ReleaseDiagnostic | null {
  const all = [...diagnosis.concerns, ...diagnosis.strengths, ...diagnosis.lessons];
  const c = (criteria ?? "").toLowerCase();
  const preferred: DiagnosticArea[] = c.includes("writing") ? ["story", "arcs", "direction"]
    : c.includes("animation") || c.includes("sound") ? ["art", "sound", "editing", "direction"]
    : c.includes("fan") || c.includes("hype") ? ["commercial", "casting", "arcs"]
    : ["editing", "direction", "story", "art", "sound"];
  for (const area of preferred) {
    const hit = all.find((d) => d.area === area);
    if (hit) return hit;
  }
  return all[0] ?? null;
}

export function creationKnowledgeSummary(genres: readonly GenreId[], ledger: Partial<Record<GenreId, number>> = {}) {
  const value = knowledgeForGenres(genres, ledger);
  const band = knowledgeBand(value);
  if (!genres.length) return { value, band, label: "Pick a genre to use studio knowledge", detail: "" };
  if (band === "MASTERED") return { value, band, label: "MASTERED", detail: "Exact direction ranges and production lessons are available." };
  if (band === "UNDERSTOOD") return { value, band, label: "UNDERSTOOD", detail: "The studio can identify strong and weak emphasis choices." };
  if (band === "EARLY") return { value, band, label: "EARLY KNOWLEDGE", detail: "Broad tendencies are visible, but exact answers remain uncertain." };
  return { value, band, label: "UNPROVEN", detail: "Ship work, run audience tests or research the genre to build institutional knowledge." };
}
