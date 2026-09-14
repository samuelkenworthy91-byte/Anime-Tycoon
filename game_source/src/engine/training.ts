import { GENRES, STAFF_STAT_CAP, type GenreId, type PointType, type Staff } from "./data";
import {
  GENRE_SPEC_GROUPS,
  genreExperienceLabel,
  genreExperienceMultiplier,
  genreFamiliarity,
  specDef,
} from "./careers";
import { projectOfStaff } from "./projects";
import type { RunState } from "./state";

export type SkillCourseId = "foundation" | "advanced" | "masterclass";
export type GenreCourseId = "familiarity" | "competence" | "specialist";

export interface SkillCourseDef {
  id: SkillCourseId;
  name: string;
  minTier: 1 | 2 | 3;
  gain: number;
  cashBase: number;
  rdBase: number;
  description: string;
}

export interface GenreCourseDef {
  id: GenreCourseId;
  name: string;
  minTier: 1 | 2 | 3;
  targetExperience: number;
  cashBase: number;
  rdBase: number;
  description: string;
}

export const SKILL_COURSES: readonly SkillCourseDef[] = [
  { id: "foundation", name: "Foundation Clinic", minTier: 1, gain: 2, cashBase: 12_000, rdBase: 3, description: "Instant focused coaching. A useful early-career correction." },
  { id: "advanced", name: "Advanced Workshop", minTier: 2, gain: 5, cashBase: 45_000, rdBase: 12, description: "Serious specialist development for established staff." },
  { id: "masterclass", name: "Masterclass", minTier: 3, gain: 10, cashBase: 160_000, rdBase: 35, description: "Elite one-to-one development: expensive, immediate and deliberately R&D-hungry." },
] as const;

export const GENRE_COURSES: readonly GenreCourseDef[] = [
  { id: "familiarity", name: "Genre Familiarity", minTier: 1, targetExperience: 2, cashBase: 20_000, rdBase: 6, description: "Removes the harshest novice penalty before production begins." },
  { id: "competence", name: "Genre Competence", minTier: 2, targetExperience: 4, cashBase: 75_000, rdBase: 18, description: "Builds reliable positive contribution in the genre." },
  { id: "specialist", name: "Genre Specialist", minTier: 3, targetExperience: 8, cashBase: 250_000, rdBase: 45, description: "Late-game specialist preparation with a strong personal output bonus." },
] as const;

export interface TrainingQuote {
  cash: number;
  rd: number;
}

export interface SkillTrainingQuote extends TrainingQuote {
  course: SkillCourseDef;
  focus: PointType;
  current: number;
  gain: number;
  after: number;
}

export interface GenreTrainingQuote extends TrainingQuote {
  course: GenreCourseDef;
  genre: GenreId;
  currentExperience: number;
  targetExperience: number;
  currentFamiliarity: number;
  afterFamiliarity: number;
  currentMultiplier: number;
  afterMultiplier: number;
  adjacencyMult: number;
}

const round5k = (v: number) => Math.max(5_000, Math.round(v / 5_000) * 5_000);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const skillCourseById = (id: SkillCourseId) => SKILL_COURSES.find((x) => x.id === id)!;
export const genreCourseById = (id: GenreCourseId) => GENRE_COURSES.find((x) => x.id === id)!;

/** Instant training is intentionally repeatable as a late-game sink, but not
 * spammable dozens of times without the calendar moving: each employee may
 * complete one paid course per industry week. */
export function trainingBlockReason(run: RunState, staffId: string, minTier = 1): string | null {
  const tier = run.facilities.training ?? 0;
  if (tier < minTier) return `Training Room tier ${minTier} required`;
  const staff = run.staff.find((s) => s.id === staffId);
  if (!staff) return "No such staff member";
  if (run.audienceTest) return `Test audience study: ${run.audienceTest.title}`;
  const project = projectOfStaff(run.projects, staffId);
  if (project) return `On “${project.draft.title}”`;
  const contract = (run.contractJobs ?? []).find((j) => j.staffIds.includes(staffId));
  if (contract) return `Contract: ${contract.contract.name}`;
  const legacyCourse = (run.trainingJobs ?? []).find((j) => j.staffId === staffId);
  if (legacyCourse) return "Finishing a legacy training course";
  if (staff.lastTrainedWeek === run.week) return "Already completed a course this week";
  return null;
}

/** Existing expertise makes each extra raw point more expensive. This is the
 * key soft cap: a +10 Masterclass remains available to elite staff, but buying
 * ten raw points for a 250-skill veteran costs dramatically more than doing so
 * for a 50-skill junior. Higher Training Room tiers shave a little waste from
 * lower-tier courses rather than making mastery cheap. */
export function skillTrainingQuote(staff: Staff, focus: PointType, courseId: SkillCourseId, trainingTier: number): SkillTrainingQuote | null {
  const course = skillCourseById(courseId);
  if (trainingTier < course.minTier) return null;
  const current = clamp(Math.round(staff[focus]), 0, STAFF_STAT_CAP);
  if (current >= STAFF_STAT_CAP) return null;
  const gain = Math.min(course.gain, STAFF_STAT_CAP - current);
  const masteryMult = 1 + Math.max(0, current - 35) / 110 + Math.max(0, (staff.level ?? 1) - 4) * 0.055;
  const roomEfficiency = 1 - Math.max(0, trainingTier - course.minTier) * 0.05;
  const cash = round5k(course.cashBase * masteryMult * roomEfficiency);
  const rd = Math.max(1, Math.ceil(course.rdBase * (0.9 + current / 260 + Math.max(0, (staff.level ?? 1) - 5) * 0.025) * roomEfficiency));
  return { course, focus, current, gain, after: current + gain, cash, rd };
}

function genreGroupOf(genre: GenreId) {
  return GENRE_SPEC_GROUPS.find((group) => group.genres.includes(genre));
}

/** Thematic adjacency comes from the same canonical three-genre specialisation
 * groups staff already use. Existing experience, a favourite genre or a
 * specialisation in the same group makes retraining cheaper; an unrelated genre
 * pays full price. */
export function genreTrainingAdjacencyMult(staff: Staff, genre: GenreId): number {
  const targetGroup = genreGroupOf(genre);
  const spec = specDef(staff.spec);
  if (staff.favGenre === genre || spec?.genres?.includes(genre)) return 0.65;
  if (!targetGroup) return 1;
  const sameGroupGenres = targetGroup.genres.filter((g) => g !== genre);
  const adjacentPreferred = !!staff.favGenre && sameGroupGenres.includes(staff.favGenre);
  const adjacentSpec = !!spec?.genres?.some((g) => sameGroupGenres.includes(g));
  const adjacentExperience = sameGroupGenres.some((g) => (staff.genreExperience?.[g] ?? 0) >= 2);
  return adjacentPreferred || adjacentSpec || adjacentExperience ? 0.8 : 1;
}

export function genreTrainingQuote(staff: Staff, genre: GenreId, courseId: GenreCourseId, trainingTier: number): GenreTrainingQuote | null {
  const course = genreCourseById(courseId);
  if (trainingTier < course.minTier) return null;
  if (!GENRES.some((g) => g.id === genre)) return null;
  const currentExperience = Math.max(0, Math.floor(staff.genreExperience?.[genre] ?? 0));
  if (currentExperience >= course.targetExperience) return null;
  const currentFamiliarity = genreFamiliarity(staff, genre);
  const synthetic: Staff = {
    ...staff,
    genreExperience: { ...(staff.genreExperience ?? {}), [genre]: course.targetExperience },
  };
  const afterFamiliarity = genreFamiliarity(synthetic, genre);
  const adjacencyMult = genreTrainingAdjacencyMult(staff, genre);
  const gap = course.targetExperience - currentExperience;
  const careerMult = 1 + Math.max(0, (staff.level ?? 1) - 4) * 0.045;
  const roomEfficiency = 1 - Math.max(0, trainingTier - course.minTier) * 0.05;
  const gapMult = 0.8 + gap / course.targetExperience * 0.35;
  const cash = round5k(course.cashBase * gapMult * careerMult * adjacencyMult * roomEfficiency);
  const rd = Math.max(1, Math.ceil(course.rdBase * gapMult * Math.sqrt(careerMult) * adjacencyMult * roomEfficiency));
  return {
    course,
    genre,
    currentExperience,
    targetExperience: course.targetExperience,
    currentFamiliarity,
    afterFamiliarity,
    currentMultiplier: genreExperienceMultiplier(currentFamiliarity),
    afterMultiplier: genreExperienceMultiplier(afterFamiliarity),
    adjacencyMult,
    cash,
    rd,
  };
}

export function applySkillTraining(run: RunState, staffId: string, focus: PointType, courseId: SkillCourseId): RunState | null {
  const staff = run.staff.find((s) => s.id === staffId);
  const course = skillCourseById(courseId);
  const block = trainingBlockReason(run, staffId, course.minTier);
  if (!staff || block) return null;
  const quote = skillTrainingQuote(staff, focus, courseId, run.facilities.training ?? 0);
  if (!quote || run.cash < quote.cash || run.rd < quote.rd) return null;
  const nextStaff = run.staff.map((s) => s.id !== staffId ? s : {
    ...s,
    [focus]: quote.after,
    lastTrainedWeek: run.week,
    morale: Math.min(100, (s.morale ?? 70) + 2),
  });
  return {
    ...run,
    cash: run.cash - quote.cash,
    rd: run.rd - quote.rd,
    staff: nextStaff,
    strategicSpend: [...run.strategicSpend, { id: `train_${run.week}_${staffId}_${focus}_${courseId}`, label: `${course.name}: ${staff.name} ${focus}`, amount: quote.cash, week: run.week }],
    notices: [...run.notices, `🎓 ${staff.name} completes ${course.name} instantly: ${focus} ${quote.current} → ${quote.after} (−£${quote.cash.toLocaleString("en-GB")}, −${quote.rd} RD).`].slice(-40),
  };
}

export function applyGenreTraining(run: RunState, staffId: string, genre: GenreId, courseId: GenreCourseId): RunState | null {
  const staff = run.staff.find((s) => s.id === staffId);
  const course = genreCourseById(courseId);
  const block = trainingBlockReason(run, staffId, course.minTier);
  if (!staff || block || !run.genresUnlocked.includes(genre)) return null;
  const quote = genreTrainingQuote(staff, genre, courseId, run.facilities.training ?? 0);
  if (!quote || run.cash < quote.cash || run.rd < quote.rd) return null;
  const genreName = GENRES.find((g) => g.id === genre)?.label ?? genre;
  const nextStaff = run.staff.map((s) => s.id !== staffId ? s : {
    ...s,
    genreExperience: { ...(s.genreExperience ?? {}), [genre]: Math.max(s.genreExperience?.[genre] ?? 0, quote.targetExperience) },
    lastTrainedWeek: run.week,
    morale: Math.min(100, (s.morale ?? 70) + 2),
  });
  return {
    ...run,
    cash: run.cash - quote.cash,
    rd: run.rd - quote.rd,
    staff: nextStaff,
    strategicSpend: [...run.strategicSpend, { id: `genre_train_${run.week}_${staffId}_${genre}_${courseId}`, label: `${course.name}: ${staff.name} — ${genreName}`, amount: quote.cash, week: run.week }],
    notices: [...run.notices, `🎓 ${staff.name} completes ${course.name}: ${genreName} ${genreExperienceLabel(quote.currentFamiliarity)} ×${quote.currentMultiplier.toFixed(2)} → ${genreExperienceLabel(quote.afterFamiliarity)} ×${quote.afterMultiplier.toFixed(2)} (−£${quote.cash.toLocaleString("en-GB")}, −${quote.rd} RD).`].slice(-40),
  };
}
