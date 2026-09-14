import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const write = (path, text) => fs.writeFileSync(path, text);
const replaceOnce = (text, oldText, newText, label) => {
  const first = text.indexOf(oldText);
  if (first < 0) throw new Error(`Stage 4 rewrite failed: ${label} source block not found`);
  if (text.indexOf(oldText, first + oldText.length) >= 0) throw new Error(`Stage 4 rewrite failed: ${label} source block is not unique`);
  return text.slice(0, first) + newText + text.slice(first + oldText.length);
};

// ---------------------------------------------------------------- awards
{
  const path = "src/engine/awardCycle.ts";
  let text = read(path);
  text = replaceOnce(text,
`export const AWARD_CRAFT_OUTPUT_BASE = 160;
export const AWARD_CRAFT_OUTPUT_YEAR_STEP = 20;
export const awardCraftOutputFloor = (year: number) =>
  AWARD_CRAFT_OUTPUT_BASE + Math.max(0, Math.floor(year) - 1) * AWARD_CRAFT_OUTPUT_YEAR_STEP;`,
`export type AwardCraftCategory = "writing" | "animation" | "score";

/** Sim-calibrated discipline floors. Each value is approximately 96% of the
 * median raw output produced by a fully staffed, fully funded studio using the
 * likely office/facility progression for that year. Because the live engine
 * naturally produces much more Animation than Sound, each discipline needs its
 * own curve rather than one shared number. */
export const AWARD_CRAFT_OUTPUT_FLOORS: Record<AwardCraftCategory, readonly number[]> = {
  writing:   [150, 325, 575, 725, 1000, 1200, 1325, 1375, 1475, 1575, 1650, 1700],
  animation: [300, 550, 825, 1025, 1350, 1500, 1625, 1750, 1875, 1925, 2000, 2150],
  score:     [150, 300, 475, 625, 900, 975, 1125, 1175, 1300, 1350, 1400, 1475],
};

export function awardCraftOutputFloor(year: number, category: AwardCraftCategory = "writing"): number {
  const y = Math.max(1, Math.floor(year));
  const curve = AWARD_CRAFT_OUTPUT_FLOORS[category];
  if (y <= curve.length) return curve[y - 1];
  // Dynasty saves keep escalating beyond the calibrated 12-year campaign at
  // the final observed annual rate instead of freezing expectations forever.
  const last = curve[curve.length - 1];
  const prior = curve[curve.length - 2];
  return last + (y - curve.length) * Math.max(25, last - prior);
}

export const awardCraftOutputFloors = (year: number) => ({
  writing: awardCraftOutputFloor(year, "writing"),
  animation: awardCraftOutputFloor(year, "animation"),
  score: awardCraftOutputFloor(year, "score"),
});`, "award threshold constants");

  text = replaceOnce(text,
`const CRAFT_CATEGORY_IDS = ["writing", "animation", "score"] as const;
type CraftCategoryId = typeof CRAFT_CATEGORY_IDS[number];`,
`const CRAFT_CATEGORY_IDS = ["writing", "animation", "score"] as const;
type CraftCategoryId = AwardCraftCategory;`, "award craft category type");

  text = replaceOnce(text,
`export function awardDisciplineOutput(run: RunState, entry: AwardNominee, category: CraftCategoryId): number {
  if (entry.player && entry.sourceId) {
    const project = run.projects.find((p) => p.id === entry.sourceId);
    if (project) {
      if (category === "writing") return Math.round(project.points.story);
      if (category === "animation") return Math.round(project.points.art);
      return Math.round(project.points.sound);
    }
  }
  return Math.round(craftMetric(entry, category) * 6);
}`,
`export function awardDisciplineOutput(run: RunState, entry: AwardNominee, category: CraftCategoryId, year = awardYearAtWeek(run.week)): number {
  if (entry.player && entry.sourceId) {
    const project = run.projects.find((p) => p.id === entry.sourceId);
    if (project) {
      if (category === "writing") return Math.round(project.points.story);
      if (category === "animation") return Math.round(project.points.art);
      return Math.round(project.points.sound);
    }
  }
  /** Rival releases and legacy player rows predate literal production-point
   * storage. Their bounded craft metric is projected onto the current year's
   * simulated raw-output scale. A rival that merely clears the normal craft
   * quality gate sits on the raw floor; exceptional craft rises above it. */
  const era = year <= 2 ? 0 : year <= 5 ? 1 : year <= 8 ? 2 : 3;
  const metricFloor = 28 + era * 2;
  const rawFloor = awardCraftOutputFloor(year, category);
  return Math.round(rawFloor * Math.max(0, craftMetric(entry, category)) / metricFloor);
}`, "award raw-output proxy");

  text = replaceOnce(text,
`  const floor = awardCraftOutputFloor(year);
  for (const category of CRAFT_CATEGORY_IDS) {
    const eligible = candidateSlate.filter((entry) => awardDisciplineOutput(run, entry, category) >= floor);`,
`  for (const category of CRAFT_CATEGORY_IDS) {
    const floor = awardCraftOutputFloor(year, category);
    const eligible = candidateSlate.filter((entry) => awardDisciplineOutput(run, entry, category, year) >= floor);`, "award category-specific filter");

  text = replaceOnce(text,
`  const craftFloor = awardCraftOutputFloor(year);
  const notice = playerNominations.length
    ? \`🏆 London Anime Awards nominations announced: \${playerNominations.join(" · ")} · Craft floor \${craftFloor}+.\`
    : \`🏆 London Anime Awards nominations announced. Your studio did not make this year's shortlist. Craft floor: \${craftFloor}+ Story/Animation/Sound output.\`;`,
`  const craftFloors = awardCraftOutputFloors(year);
  const craftStandard = \`Writing \${craftFloors.writing}+ · Animation \${craftFloors.animation}+ · Score \${craftFloors.score}+\`;
  const notice = playerNominations.length
    ? \`🏆 London Anime Awards nominations announced: \${playerNominations.join(" · ")} · Craft standards: \${craftStandard}.\`
    : \`🏆 London Anime Awards nominations announced. Your studio did not make this year's shortlist. Craft standards: \${craftStandard}.\`;`, "award notice");
  write(path, text);
}

// -------------------------------------------------- nominations announcement
{
  const path = "src/components/AwardsNominationAnnouncement.tsx";
  let text = read(path);
  text = replaceOnce(text,
`import { acknowledgeNominationAnnouncement, awardCraftOutputFloor, pendingNominationAnnouncement } from "../engine/awardCycle";`,
`import { acknowledgeNominationAnnouncement, awardCraftOutputFloors, pendingNominationAnnouncement } from "../engine/awardCycle";`, "nomination import");
  text = replaceOnce(text,
`  const craftFloor = awardCraftOutputFloor(pending.year);`,
`  const craftFloors = awardCraftOutputFloors(pending.year);`, "nomination floor variable");
  text = replaceOnce(text,
`            Industry expectations rise every year. Best Writing, Best Animation and Best Original Score require at least <b>{craftFloor}</b> raw output in their discipline this year, alongside the normal review-quality standard.`,
`            Industry expectations rise with the studios of the era. This year the raw production floors are <b>Writing {craftFloors.writing}</b> · <b>Animation {craftFloors.animation}</b> · <b>Score {craftFloors.score}</b>, alongside the normal review-quality standard.`, "nomination floor copy");
  write(path, text);
}

// --------------------------------------------------------------- Crew UI
{
  const path = "src/components/Crew.tsx";
  let text = read(path);
  text = replaceOnce(text,
`import Portrait from "./Portrait";`,
`import Portrait from "./Portrait";
import StaffTrainingPanel from "./StaffTrainingPanel";`, "Crew training component import");

  text = replaceOnce(text,
`  const trainTier = run.facilities.training ?? 0;
  const trainBlock = trainBlockReason(run, s.id);
  const cost = trainCost(trainTier);
`, "", "Crew old training locals");

  const startNeedle = `          {/* training */}
          {trainTier > 0 && (`;
  const start = text.indexOf(startNeedle);
  if (start < 0) throw new Error("Stage 4 rewrite failed: Crew timed training section not found");
  const endNeedle = `          <div className="flex justify-end">`;
  const end = text.indexOf(endNeedle, start);
  if (end < 0) throw new Error("Stage 4 rewrite failed: Crew training section end not found");
  text = text.slice(0, start) + `          <StaffTrainingPanel staff={s} run={run} setRun={setRun} />

` + text.slice(end);
  write(path, text);
}

console.log("Applied sim-calibrated award floors and Stage 4 Training Room UI wiring.");
