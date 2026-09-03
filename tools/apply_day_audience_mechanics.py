from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel: str) -> str:
    return (ROOT / rel).read_text()

def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text)

def rep(rel: str, old: str, new: str, count: int = 1) -> None:
    s = read(rel)
    if old not in s:
        raise SystemExit(f"missing anchor in {rel}: {old[:180]!r}")
    write(rel, s.replace(old, new, count))

# ---------------------------------------------------------------- studio operation job clocks
ops = "game_source/src/engine/studioOps.ts"
rep(ops,
'''export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  /** Founding showrunner can personally take one of the three seats. */
  showrunner?: boolean;
  startWeek: number;
  dueWeek: number;
  progress: number;''',
'''export interface ContractAssignment {
  id: string;
  contract: Contract;
  staffIds: string[];
  /** Founding showrunner can personally take one of the three seats. */
  showrunner?: boolean;
  startWeek: number;
  dueWeek: number;
  /** day-accurate deadline used by the live studio clock */
  startDay?: number;
  dueDay?: number;
  progress: number;''')
rep(ops,
'''export interface TrainingJob {
  id: string;
  staffId: string;
  staffName: string;
  focus: PointType;
  tier: number;
  startWeek: number;
  completesWeek: number;
}''',
'''export interface TrainingJob {
  id: string;
  staffId: string;
  staffName: string;
  focus: PointType;
  tier: number;
  startWeek: number;
  completesWeek: number;
  startDay?: number;
  completesDay?: number;
}''')
rep(ops,
'''export interface ResearchJob {
  id: string;
  researchId: string;
  name: string;
  startWeek: number;
  completesWeek: number;
  rdCost: number;
}''',
'''export interface ResearchJob {
  id: string;
  researchId: string;
  name: string;
  startWeek: number;
  completesWeek: number;
  startDay?: number;
  completesDay?: number;
  rdCost: number;
}''')

# ---------------------------------------------------------------- projects: day clocks + true daily stage movement
proj = "game_source/src/engine/projects.ts"
rep(proj,
'''  createdWeek: number;
  /** the broadcaster's target release week */
  deadlineWeek: number;
  /** weeks past the deadline already suffered */
  lateWeeks: number;''',
'''  createdWeek: number;
  /** exact live-clock day the project was greenlit (legacy saves fall back to week × 7) */
  createdDay?: number;
  /** the broadcaster's target release week — retained for finance/calendar compatibility */
  deadlineWeek: number;
  /** exact live-clock deadline */
  deadlineDay?: number;
  /** weeks past the deadline already suffered (release penalty compatibility) */
  lateWeeks: number;
  /** exact number of live calendar days late */
  lateDays?: number;''')
rep(proj,
'''  bonus: number;
  deadlineWeek: number;
}''',
'''  bonus: number;
  deadlineWeek: number;
  deadlineDay?: number;
}''')
rep(proj,
'''export function makeProject(draft: Draft, week: number): Project {
  const plan = stagePlan(draft);''',
'''export function makeProject(draft: Draft, week: number, day = week * 7): Project {
  const plan = stagePlan(draft);''')
rep(proj,
'''    plan,
    createdWeek: week,
    deadlineWeek: week + totalPlan + DEADLINE_SLACK,
    lateWeeks: 0,''',
'''    plan,
    createdWeek: week,
    createdDay: day,
    deadlineWeek: week + totalPlan + DEADLINE_SLACK,
    deadlineDay: day + (totalPlan + DEADLINE_SLACK) * 7,
    lateWeeks: 0,
    lateDays: 0,''')
rep(proj,
'''/** weeks left until the deadline (negative = already late) */
export const weeksToDeadline = (p: Project, week: number) => p.deadlineWeek - week;
''',
'''/** weeks left until the deadline (legacy / high-level calendar view) */
export const weeksToDeadline = (p: Project, week: number) => p.deadlineWeek - week;
/** live production uses exact days; old saves derive the equivalent day from their week deadline. */
export const daysToDeadline = (p: Project, day: number) => (p.deadlineDay ?? p.deadlineWeek * 7) - day;
''')
# No more invisible editor-note removal in weekly fallback / headless simulations.
rep(proj,
'''      const qualityMult = teamQualityMultiplier(p, team, fx, mods, studio);
      if (p.stage === "post") {
        const surplusFix = Math.max(0, Math.floor((qualityMult - 1) * 8));
        p.issues = Math.max(0, p.issues - Math.round(team.length * 0.6 + 0.4) - fx.issueFix - surplusFix);
      }
      if (p.stage === "marketing") {''',
'''      if (p.stage === "marketing") {''')
rep(proj,
'''      if (p.stage === "ready") {
        /* deliberate delay: polish the master, but hype cools */
        p.issues = Math.max(0, p.issues - Math.max(1, Math.round(team.length * 0.5)));
        p.hype = Math.max(0, p.hype - 1);
      } else {''',
'''      if (p.stage === "ready") {
        /* waiting never fixes editing notes for free; it only lets launch heat cool. */
        p.hype = Math.max(0, p.hype - 1);
      } else {''')
# Add daily equivalent before assignedStaffIds.
anchor = '''  return { projects: next, cashDelta, notices };
}

/** staff ids currently committed to an in-production project */'''
if anchor not in read(proj):
    raise SystemExit('daily project insertion anchor missing')
daily = r'''  return { projects: next, cashDelta, notices };
}

export interface DayTickResult extends WeekTickResult {
  attention: boolean;
}

/** Live-clock project schedule. Plans stay expressed in week-equivalents for save
 * compatibility, but one in-game day banks exactly one seventh of normal schedule
 * work and one seventh of production burn. Milestones can therefore arrive on any
 * day rather than only at an arbitrary Sunday boundary. */
export function tickProjectsDay(
  projects: Project[],
  staff: Staff[],
  day: number,
  fx: FacilityFX = NO_FX,
  mods?: StaffModFn,
  studio: StudioMod = NO_STUDIO,
  departmentLoad: Record<string, number> = {}
): DayTickResult {
  let cashDelta = 0;
  let attention = false;
  const notices: string[] = [];

  const next = projects.map((p0) => {
    if (p0.stage === "done" || p0.stage === "airing") return p0;
    const p = { ...p0, points: { ...p0.points } };
    const team = staff.filter((s) => p.staffIds.includes(s.id));

    const burn = Math.max(1, Math.round((p.weeklyBurn * studio.burnMult) / 7));
    cashDelta -= burn;
    p.spent += burn;

    if (!p.milestone) {
      const plan = p.plan[p.stage] ?? 1;
      if (p.stage === "marketing") {
        p.hype = Math.min(100, p.hype + ((3 + team.length * 2) * fx.hypeMult) / 7);
      }
      if (p.stage === "ready") {
        p.hype = Math.max(0, p.hype - 1 / 7);
      } else {
        const load = departmentLoad[p.id] ?? 1;
        p.progress += (teamSpeed(p, team, fx, mods, studio) * load) / 7;
        if (load < 0.72 && day % 14 === 0 && (p.stage === "animation" || p.stage === "post")) p.issues += 1;
        if (p.progress >= plan) {
          const gate = STAGE_GATE[p.stage];
          if (gate && !p.milestonesDone.includes(gate)) {
            p.progress = plan;
            p.milestone = gate;
            attention = true;
            notices.push(`“${p.draft.title}”: ${MILESTONE_LABEL[gate]} is ready — the team needs you on the floor.`);
          } else {
            const nx = NEXT_STAGE[p.stage];
            if (nx) {
              p.stage = nx;
              p.progress = 0;
              if (nx === "ready") {
                attention = true;
                notices.push(`“${p.draft.title}” is ready for broadcast. Release it — or keep it back deliberately.`);
              }
            }
          }
        }
      }
    }

    const dueDay = p.deadlineDay ?? p.deadlineWeek * 7;
    if (day > dueDay) {
      const lateDays = (p.lateDays ?? p.lateWeeks * 7) + 1;
      p.lateDays = lateDays;
      p.lateWeeks = Math.ceil(lateDays / 7);
      const weeklyFee = 1_500 + Math.round(draftCost(p.draft) * 0.015);
      const fee = Math.max(1, Math.round(weeklyFee / 7));
      cashDelta -= fee;
      p.spent += fee;
      p.hype = Math.max(0, p.hype - 2 / 7);
      if (lateDays % 14 === 0) p.issues += 1;
      if (lateDays === 1) notices.push(`“${p.draft.title}” misses its broadcast deadline — late fees now accrue every day.`);
      else if (lateDays % 7 === 0) notices.push(`“${p.draft.title}” is ${lateDays} days late. Hype and cash are bleeding.`);
    }
    return p;
  });

  return { projects: next, cashDelta, notices, attention };
}

/** staff ids currently committed to an in-production project */'''
write(proj, read(proj).replace(anchor, daily, 1))

# ---------------------------------------------------------------- state model and imports
state = "game_source/src/engine/state.ts"
rep(state,
'''  GENRES,
  ARC_COMBOS,''',
'''  GENRES,
  ARCS,
  ARC_COMBOS,''')
rep(state,
'''  castById,
  comboKey,''',
'''  castById,
  arcGenreFit,
  comboKey,''')
rep(state,
'''  tickProjectsWeek,
  toggleAssign,''',
'''  tickProjectsWeek,
  tickProjectsDay,
  toggleAssign,''')
# State-side test-audience structures.
rep(state,
'''export interface AwardCeremony {
  year: number;
  categories: AwardCategory[];
  playerAwards: number;
}

export interface RunState {''',
'''export interface AwardCeremony {
  year: number;
  categories: AwardCategory[];
  playerAwards: number;
}

export interface AudienceInsight {
  showKey: string;
  title: string;
  text: string;
  day: number;
}

export interface AudienceTestJob {
  showKey: string;
  title: string;
  startDay: number;
  completesDay: number;
  round: number;
  draft: Draft;
  result: ShowResult;
}

export interface RunState {''')
rep(state,
'''  rd: number; // research data
  week: number;
  officeLevel: number;''',
'''  rd: number; // research data
  /** exact live-clock day; week remains the seven-day finance/industry cadence */
  day: number;
  week: number;
  officeLevel: number;''')
rep(state,
'''  /** studio technologies unlock after a timed research project */
  researchJobs: ResearchJob[];
  /** employees who have exhausted their energy and are actively recuperating */''',
'''  /** studio technologies unlock after a timed research project */
  researchJobs: ResearchJob[];
  /** optional repeatable focus-group study of the most recently released show */
  audienceTest: AudienceTestJob | null;
  /** how many distinct findings have been extracted from each release */
  audienceTestCounts: Record<string, number>;
  /** persistent findings that can be consulted later in R&D / Records */
  audienceInsights: AudienceInsight[];
  /** employees who have exhausted their energy and are actively recuperating */''')
rep(state,
'''    rd: 12,
    week: 0,''',
'''    rd: 12,
    day: 0,
    week: 0,''')
rep(state,
'''    researchJobs: [],
    staffResting: {},''',
'''    researchJobs: [],
    audienceTest: null,
    audienceTestCounts: {},
    audienceInsights: [],
    staffResting: {},''')
rep(state,
'''    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],
    staffResting: r.staffResting && typeof r.staffResting === "object" ? r.staffResting : {},''',
'''    researchJobs: Array.isArray(r.researchJobs) ? r.researchJobs : [],
    audienceTest: r.audienceTest && typeof r.audienceTest === "object" ? r.audienceTest : null,
    audienceTestCounts: r.audienceTestCounts && typeof r.audienceTestCounts === "object" ? r.audienceTestCounts : {},
    audienceInsights: Array.isArray(r.audienceInsights) ? r.audienceInsights : [],
    day: typeof r.day === "number" ? r.day : (r.week ?? 0) * 7,
    staffResting: r.staffResting && typeof r.staffResting === "object" ? r.staffResting : {},''')
# advanceWeeks gets a live-day mode so the app doesn't double charge / double progress.
rep(state,
'''export function advanceWeeks(r: RunState, n: number): RunState {''',
'''export function advanceWeeks(r: RunState, n: number, opts: { liveDaysAlreadyApplied?: boolean } = {}): RunState {''')
rep(state,
'''    /* every project in the pipeline gets a week of work. Multiple shows in
       the same department now contend for finite studio capacity. */
    const loadMap = projectLoadMap(projects, staffArr, r.facilities, research);
    const tick = tickProjectsWeek(projects, staffArr, w, fx, mods, studio, loadMap);
    projects = tick.projects;
    cash += tick.cashDelta;
    notices.push(...tick.notices);''',
'''    /* Headless/legacy callers can still advance a whole week at once. The live
       app has already banked seven daily project ticks, so it skips this fallback. */
    if (!opts.liveDaysAlreadyApplied) {
      const loadMap = projectLoadMap(projects, staffArr, r.facilities, research);
      const tick = tickProjectsWeek(projects, staffArr, w, fx, mods, studio, loadMap);
      projects = tick.projects;
      cash += tick.cashDelta;
      notices.push(...tick.notices);
    }''')
# Wrap contract weekly fallback.
rep(state,
'''    /* ------- background contract work: live bubbles first, weekly fallback ------- */
    {
      const keep: ContractAssignment[] = [];''',
'''    /* ------- background contract work: live bubbles are authoritative in the app;
       weekly fallback remains only for headless/legacy week jumps ------- */
    if (!opts.liveDaysAlreadyApplied) {
      const keep: ContractAssignment[] = [];''')
# close already-existing block and keep same indentation by replacing trailing sequence uniquely
rep(state,
'''      contractJobs = keep;
    }

    /* ------- courses complete after occupying the employee for weeks ------- */
    {''',
'''      contractJobs = keep;
    }

    /* ------- courses complete after occupying the employee for weeks ------- */
    if (!opts.liveDaysAlreadyApplied) {''')
rep(state,
'''      trainingJobs = keep;
    }

    /* ------- research projects mature over calendar time ------- */
    {''',
'''      trainingJobs = keep;
    }

    /* ------- research projects mature over calendar time ------- */
    if (!opts.liveDaysAlreadyApplied) {''')
# Weekly stamina is only a fallback when days weren't simulated; morale/XP still update weekly.
rep(state,
'''        if (proj) {
          nx.stamina = Math.max(12, nx.stamina - drain);''',
'''        if (proj) {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.max(12, nx.stamina - drain);''')
rep(state,
'''        } else if (opBusy.has(st.id)) {
          nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));''',
'''        } else if (opBusy.has(st.id)) {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.max(12, nx.stamina - Math.max(1, drain - 1));''')
rep(state,
'''        } else {
          nx.stamina = Math.min(100, nx.stamina + rest);''',
'''        } else {
          if (!opts.liveDaysAlreadyApplied) nx.stamina = Math.min(100, nx.stamina + rest);''')
# New project / contract day fields.
rep(state,
'''  let p = makeProject(d, r.week);''',
'''  let p = makeProject(d, r.week, r.day ?? r.week * 7);''')
rep(state,
'''      ...p,
      deadlineWeek: r.week + commission.maxWeeks,
      hype: p.hype + (commission.hypeBonus ?? 0),''',
'''      ...p,
      deadlineWeek: r.week + commission.maxWeeks,
      deadlineDay: (r.day ?? r.week * 7) + commission.maxWeeks * 7,
      hype: p.hype + (commission.hypeBonus ?? 0),''')
rep(state,
'''        bonus: commission.bonus,
        deadlineWeek: r.week + commission.maxWeeks,
      },''',
'''        bonus: commission.bonus,
        deadlineWeek: r.week + commission.maxWeeks,
        deadlineDay: (r.day ?? r.week * 7) + commission.maxWeeks * 7,
      },''')
rep(state,
'''        ? `“${d.title}” commissioned by ${partner.name}: +£${commission.advance.toLocaleString("en-GB")} advance, they take ${Math.round(commission.share * 100)}% · deliver ${commission.minQuality}/40 by ${dateLabel(r.week + commission.maxWeeks)}.`
        : `“${d.title}” greenlit — target release ${dateLabel(p.deadlineWeek)}. Total budget ≈ £${draftCost(d).toLocaleString("en-GB")}.`,''',
'''        ? `“${d.title}” commissioned by ${partner.name}: +£${commission.advance.toLocaleString("en-GB")} advance, they take ${Math.round(commission.share * 100)}% · deliver ${commission.minQuality}/40 within ${commission.maxWeeks * 7} days.`
        : `“${d.title}” greenlit — target release in ${Math.max(0, (p.deadlineDay ?? p.deadlineWeek * 7) - (r.day ?? r.week * 7))} days. Total budget ≈ £${draftCost(d).toLocaleString("en-GB")}.`,''')
rep(state,
'''export function staffOperationReason(r: RunState, staffId: string): string | null {
  const c = (r.contractJobs ?? []).find((j) => j.staffIds.includes(staffId));''',
'''export function staffOperationReason(r: RunState, staffId: string): string | null {
  if (r.audienceTest) return `Test audience study: ${r.audienceTest.title}`;
  const c = (r.contractJobs ?? []).find((j) => j.staffIds.includes(staffId));''')
rep(state,
'''    startWeek: r.week,
    dueWeek: r.week + contract.weeks,
    progress: 0,''',
'''    startWeek: r.week,
    dueWeek: r.week + contract.weeks,
    startDay: r.day ?? r.week * 7,
    dueDay: (r.day ?? r.week * 7) + contract.weeks * 7,
    progress: 0,''')
rep(state,
'''    notices: [...r.notices, `📋 ${contract.name} assigned to ${seats} contributor${seats === 1 ? "" : "s"}${showrunner ? " including the showrunner" : ""} — due ${dateLabel(job.dueWeek)}.`],''',
'''    notices: [...r.notices, `📋 ${contract.name} assigned to ${seats} contributor${seats === 1 ? "" : "s"}${showrunner ? " including the showrunner" : ""} — ${contract.weeks * 7} days to deliver.`],''')
# Training and tech research become day-accurate in gameplay, with week fields retained for tests/saves.
rep(state,
'''  const job: TrainingJob = {
    id: `train_${staffId}_${r.week}`, staffId, staffName: s.name, focus, tier, startWeek: r.week, completesWeek: r.week + weeks,
  };''',
'''  const job: TrainingJob = {
    id: `train_${staffId}_${r.week}`, staffId, staffName: s.name, focus, tier,
    startWeek: r.week, completesWeek: r.week + weeks,
    startDay: r.day ?? r.week * 7, completesDay: (r.day ?? r.week * 7) + weeks * 7,
  };''')
rep(state,
'''    notices: [...r.notices, `🎓 ${s.name} starts ${focus} training for ${weeks} weeks — unavailable until ${dateLabel(job.completesWeek)}.`],''',
'''    notices: [...r.notices, `🎓 ${s.name} starts ${focus} training — ${weeks * 7} days of studio time.`],''')
rep(state,
'''  const job: ResearchJob = { id: `research_${id}_${r.week}`, researchId: id, name: def.name, startWeek: r.week, completesWeek: r.week + weeks, rdCost };''',
'''  const job: ResearchJob = {
    id: `research_${id}_${r.week}`, researchId: id, name: def.name,
    startWeek: r.week, completesWeek: r.week + weeks,
    startDay: r.day ?? r.week * 7, completesDay: (r.day ?? r.week * 7) + weeks * 7,
    rdCost,
  };''')
rep(state,
'''    notices: [...r.notices, `🔬 ${def.name} begins — ${weeks} weeks in R&D (cost ${rdCost} RD).`],''',
'''    notices: [...r.notices, `🔬 ${def.name} begins — ${weeks * 7} days in R&D (cost ${rdCost} RD).`],''')
# Commissioner lateness evaluates exact days when available.
rep(state,
'''    const late = r.week > deal.deadlineWeek;''',
'''    const late = (r.day ?? r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7);''')
rep(state,
'''    if (r.week > deal.deadlineWeek) notices.push(`${deal.partnerName} logs the late delivery. They will remember.`);''',
'''    if ((r.day ?? r.week * 7) > (deal.deadlineDay ?? deal.deadlineWeek * 7)) notices.push(`${deal.partnerName} logs the late delivery. They will remember.`);''')
rep(state,
'''  if (p.lateWeeks > 0)
    notices.push(`The network docks “${draft.title}” for delivering ${p.lateWeeks} week${p.lateWeeks > 1 ? "s" : ""} late.`);''',
'''  if ((p.lateDays ?? 0) > 0 || p.lateWeeks > 0) {
    const lateDays = p.lateDays ?? p.lateWeeks * 7;
    notices.push(`The network docks “${draft.title}” for delivering ${lateDays} day${lateDays === 1 ? "" : "s"} late.`);
  }''')

# ---------------------------------------------------------------- audience lab + daily background operations
insert_anchor = '''const POINT_TYPES: PointType[] = ["story", "art", "sound"];

/** Kairosoft-style percentile output.'''
if insert_anchor not in read(state):
    raise SystemExit('audience insertion anchor missing')
audience_code = r'''const POINT_TYPES: PointType[] = ["story", "art", "sound"];

export const AUDIENCE_TEST_DAYS = 2;
export const AUDIENCE_TEST_RD = 4;
export const AUDIENCE_TEST_MAX_FINDINGS = 6;

export const audienceShowKey = (r: Pick<RunState, "showsMade" | "lastDraft">) =>
  r.lastDraft ? `${r.showsMade}:${r.lastDraft.title}` : "";

const blendedGenreMemo = (draft: Draft) => {
  const defs = draft.genres.map((id) => GENRES.find((g) => g.id === id)).filter(Boolean) as typeof GENRES;
  const n = Math.max(1, defs.length);
  const ideal: [number, number, number] = [0, 1, 2].map((i) => Math.round(defs.reduce((a, g) => a + g.ideal[i], 0) / n)) as [number, number, number];
  const ratio: [number, number, number] = [0, 1, 2].map((i) => defs.reduce((a, g) => a + g.ratio[i], 0) / n) as [number, number, number];
  return { ideal, ratio };
};

function audienceFinding(job: AudienceTestJob): { text: string; learnArcGenre?: string } {
  const { draft } = job;
  const memo = blendedGenreMemo(draft);
  const genres = draft.genres.map((id) => GENRES.find((g) => g.id === id)?.label ?? id).join(" × ");
  const dirs = [
    ["Story direction", "Plot", "Characters"],
    ["Animation direction", "Sakuga", "Consistency"],
    ["Sound direction", "Music", "Voice acting"],
  ] as const;
  if (job.round <= 2) {
    const i = job.round as 0 | 1 | 2;
    const target = memo.ideal[i];
    return { text: `${dirs[i][0]}: ${genres} viewers preferred about ${target}% ${dirs[i][1]} / ${100 - target}% ${dirs[i][2]}. Your last cut used ${draft.sliders[i]}%.` };
  }
  if (job.round === 3) {
    const pct = memo.ratio.map((v) => Math.round(v * 100));
    return { text: `Quality mix: this genre blend responds best around ${pct[0]}% Story · ${pct[1]}% Art · ${pct[2]}% Sound. Staff can contribute across all three, so shape the team rather than hard-locking roles.` };
  }
  if (job.round === 4) {
    const cast = [
      ["lead", draft.protag], ["support", draft.secondary], ["mascot", draft.pet], ["villain", draft.villain],
    ] as const;
    const ranked = cast.map(([role, id]) => {
      const m = castById(id);
      const fit = m.aff.filter((g) => draft.genres.includes(g as GenreId)).length;
      return { role, m, fit };
    }).sort((a, b) => a.fit - b.fit);
    const weak = ranked[0];
    return { text: `Cast response: ${weak.m.name} (${weak.role}) was the weakest genre fit in this version — ${weak.fit}/${draft.genres.length} selected genre affinities matched. A better-matched ${weak.role} should review more consistently.` };
  }
  const arc = draft.arcs.map((id) => ARCS.find((a) => a.id === id)).find(Boolean);
  if (arc && draft.genres.length) {
    const genre = draft.genres[0];
    const fit = arcGenreFit(arc, genre);
    const gl = GENRES.find((g) => g.id === genre)?.label ?? genre;
    return { text: `Arc test: ${arc.name} measured as ${fit.label} with ${gl}${fit.score ? ` (${fit.score > 0 ? "+" : ""}${fit.score} quality-side synergy)` : ""}.`, learnArcGenre: `${arc.id}|${genre}` };
  }
  return { text: `Editing response: every unresolved editor note costs roughly 0.9 raw quality before critic scoring. A clean master is measurably safer if the deadline allows it.` };
}

export function startTestAudience(r: RunState): RunState | null {
  if (!r.lastDraft || !r.lastResult || r.audienceTest || r.staff.length === 0) return null;
  if ((r.trainingJobs ?? []).length > 0) return null; // all employees must be available for the study
  const showKey = audienceShowKey(r);
  const round = r.audienceTestCounts?.[showKey] ?? 0;
  if (!showKey || round >= AUDIENCE_TEST_MAX_FINDINGS) return null;
  const startDay = r.day ?? r.week * 7;
  return {
    ...r,
    audienceTest: { showKey, title: r.lastDraft.title, startDay, completesDay: startDay + AUDIENCE_TEST_DAYS, round, draft: r.lastDraft, result: r.lastResult },
    notices: [...r.notices, `👥 Test audience booked for “${r.lastDraft.title}” — the whole studio is tied up for ${AUDIENCE_TEST_DAYS} days.`],
  };
}

function finishResearchJob(r: RunState, job: ResearchJob): RunState {
  let research = [...r.research];
  let arcCombos = [...r.arcCombos];
  const arcKnowledge = { ...r.arcKnowledge };
  const arcGenreKnowledge = { ...r.arcGenreKnowledge };
  const notices = [...r.notices];
  if (!research.includes(job.researchId)) research.push(job.researchId);
  if (job.researchId === "narrative_analytics") {
    arcCombos = [...new Set([...arcCombos, ...ARC_RESEARCH_COMBOS])];
    for (const id of ARC_RESEARCH_COMBOS) {
      const combo = ARC_COMBOS.find((c) => c.id === id);
      for (const arcId of combo?.arcs ?? []) arcKnowledge[arcId] = Math.max(1, arcKnowledge[arcId] ?? 0);
    }
    notices.push("📚 Narrative Analytics adds several proven structures to the Studio Bible.");
  }
  if (job.researchId === "genre_studies") {
    for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);
    notices.push("📚 Genre Studies reveals a starter set of arc-to-genre relationships.");
  }
  notices.push(`🔬 Research complete: ${job.name}!`);
  return { ...r, research, arcCombos, arcKnowledge, arcGenreKnowledge, notices };
}

function tickDailyBackground(r: RunState): { run: RunState; attention: boolean; studioLocked: boolean } {
  let nx = r;
  let attention = false;
  const studioLocked = !!r.audienceTest;

  /* contract deadlines are exact days now; testing the audience does not stop the clock. */
  if ((nx.contractJobs ?? []).length) {
    const keep: ContractAssignment[] = [];
    let rd = nx.rd;
    const notices = [...nx.notices];
    for (const job of nx.contractJobs) {
      const dueDay = job.dueDay ?? job.dueWeek * 7;
      if ((nx.day ?? nx.week * 7) >= dueDay && job.progress < job.contract.target) {
        const consolation = Math.max(1, Math.round(job.contract.rd / 3));
        rd += consolation;
        attention = true;
        notices.push(`❌ Contract missed: ${job.contract.name} — ${job.progress}/${job.contract.target} progress (+${consolation} RD learned).`);
      } else keep.push(job);
    }
    nx = { ...nx, contractJobs: keep, rd, notices };
  }

  /* courses and technology can finish on any day instead of waiting for Sunday. */
  if ((nx.trainingJobs ?? []).length) {
    const keep: TrainingJob[] = [];
    let staff = nx.staff;
    const notices = [...nx.notices];
    for (const job of nx.trainingJobs) {
      if (!staff.some((s) => s.id === job.staffId)) continue;
      const due = job.completesDay ?? job.completesWeek * 7;
      if ((nx.day ?? nx.week * 7) < due) { keep.push(job); continue; }
      staff = staff.map((s) => {
        if (s.id !== job.staffId) return s;
        let out = ensureCareer({ ...s, [job.focus]: Math.min(99, s[job.focus] + 1), lastTrainedWeek: nx.week }, nx.week);
        out = moraleDelta(out, 3);
        return gainXp(out, trainXp(job.tier)).staff;
      });
      attention = true;
      notices.push(`🎓 ${job.staffName} completes ${job.focus} training (+1 ${job.focus}, +${trainXp(job.tier)} XP).`);
    }
    nx = { ...nx, staff, trainingJobs: keep, notices };
  }

  if ((nx.researchJobs ?? []).length) {
    const keep: ResearchJob[] = [];
    for (const job of nx.researchJobs) {
      const due = job.completesDay ?? job.completesWeek * 7;
      if ((nx.day ?? nx.week * 7) < due) { keep.push(job); continue; }
      nx = finishResearchJob(nx, job);
      attention = true;
    }
    nx = { ...nx, researchJobs: keep };
  }

  if (r.audienceTest && (nx.day ?? nx.week * 7) >= r.audienceTest.completesDay) {
    const found = audienceFinding(r.audienceTest);
    const counts = { ...(nx.audienceTestCounts ?? {}), [r.audienceTest.showKey]: r.audienceTest.round + 1 };
    const insight: AudienceInsight = { showKey: r.audienceTest.showKey, title: r.audienceTest.title, text: found.text, day: nx.day ?? nx.week * 7 };
    const genreKnowledge = r.audienceTest.draft.genres.reduce((acc, genre) => {
      acc[genre] = Math.min(12, (acc[genre] ?? 0) + 1);
      return acc;
    }, { ...(nx.genreKnowledge ?? {}) });
    const arcGenreKnowledge = { ...(nx.arcGenreKnowledge ?? {}) };
    if (found.learnArcGenre) arcGenreKnowledge[found.learnArcGenre] = Math.max(1, arcGenreKnowledge[found.learnArcGenre] ?? 0);
    nx = {
      ...nx,
      rd: nx.rd + AUDIENCE_TEST_RD,
      genreKnowledge,
      arcGenreKnowledge,
      audienceTestCounts: counts,
      audienceInsights: [...(nx.audienceInsights ?? []), insight].slice(-30),
      audienceTest: null,
      notices: [...nx.notices, `👥 TEST AUDIENCE: ${found.text} (+${AUDIENCE_TEST_RD} RD)`].slice(-40),
    };
    attention = true;
  }

  return { run: nx, attention, studioLocked };
}

/** Kairosoft-style percentile output.'''
write(state, read(state).replace(insert_anchor, audience_code, 1))
# No bubbles while everyone is in the audience lab.
rep(state,
'''export function rollStudioWorkPulses(r: RunState): DeskPulse[] {
  const pulses: DeskPulse[] = [];''',
'''export function rollStudioWorkPulses(r: RunState): DeskPulse[] {
  if (r.audienceTest) return [];
  const pulses: DeskPulse[] = [];''')
rep(state,
'''export function tickEditWorkPulse(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const target = projectById(r, projectId);''',
'''export function tickEditWorkPulse(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  if (r.audienceTest) return { run: r, pulses: [], attention: false };
  const target = projectById(r, projectId);''')
# Replace tickStudioDay with daily project movement + background jobs.
old_start = '''export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const projects = r.projects.map((p) => ({ ...p, points: { ...p.points } }));
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);
  const staff = r.staff.map((st0) => {
    const st = { ...st0 };
    const project = projectOfStaff(projects, st.id);
    const contract = (r.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    const busy = production || !!contract;
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    if (!busy) {
      st.stamina = Math.min(100, st.stamina + 18 + fx.staminaRest);
      return st;
    }
    const drain = Math.max(5, 9 - fx.staminaSave);
    st.stamina = Math.max(0, st.stamina - drain);
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...r, projects, staff, staffResting: resting }, pulses: [], attention: false };
}'''
new_start = r'''export function tickStudioDay(r: RunState): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const bg = tickDailyBackground(r);
  let nx = bg.run;
  const resting = { ...(nx.staffResting ?? {}) };
  const baseFx = facilityFX(nx.facilities);
  const spm = studioPointMult(nx.heads ?? {}, nx.staff, nx.legends ?? []);
  const dynFx = dynastyFX(nx);
  const fx = {
    ...baseFx,
    pointMult: {
      story: baseFx.pointMult.story * spm.story * dynFx.pointMult,
      art: baseFx.pointMult.art * spm.art * dynFx.pointMult,
      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult,
    },
    speed: baseFx.speed + dynFx.speed,
  };

  if (bg.studioLocked) {
    const staff = nx.staff.map((s) => ({ ...s, stamina: Math.max(0, s.stamina - 3) }));
    return { run: { ...nx, staff }, pulses: [], attention: bg.attention };
  }

  const studio = studioProduction(nx.heads ?? {}, nx.staff);
  const mods: StaffModFn = (st, p, team) => personMod(st, p, team, { bonds: nx.bonds ?? {} });
  const loadMap = projectLoadMap(nx.projects, nx.staff, nx.facilities, nx.research);
  const dayTick = tickProjectsDay(nx.projects, nx.staff, nx.day ?? nx.week * 7, fx, mods, studio, loadMap);
  nx = { ...nx, projects: dayTick.projects, cash: nx.cash + dayTick.cashDelta, notices: [...nx.notices, ...dayTick.notices].slice(-40) };

  const staff = nx.staff.map((st0) => {
    const st = { ...st0 };
    const project = projectOfStaff(nx.projects, st.id);
    const contract = (nx.contractJobs ?? []).find((j) => j.staffIds.includes(st.id));
    const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
    const busy = production || !!contract;
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + baseFx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    if (!busy) {
      st.stamina = Math.min(100, st.stamina + 18 + baseFx.staminaRest);
      return st;
    }
    const drain = Math.max(5, 9 - baseFx.staminaSave);
    st.stamina = Math.max(0, st.stamina - drain);
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...nx, staff, staffResting: resting }, pulses: [], attention: bg.attention || dayTick.attention };
}'''
rep(state, old_start, new_start)
# Editing day should also process real-day deadlines/research and consume audience-lab days.
old_edit = '''export function tickEditDay(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const target = projectById(r, projectId);
  if (!target || target.milestone !== "edit") return { run: r, pulses: [], attention: false };
  const resting = { ...(r.staffResting ?? {}) };
  const fx = facilityFX(r.facilities);
  const staff = r.staff.map((st0) => {
    if (!target.staffIds.includes(st0.id)) return st0;
    const st = { ...st0 };
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    st.stamina = Math.max(0, st.stamina - Math.max(3, 6 - fx.staminaSave));
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...r, staff, staffResting: resting }, pulses: [], attention: target.issues <= 0 };
}'''
new_edit = '''export function tickEditDay(r: RunState, projectId: string): { run: RunState; pulses: DeskPulse[]; attention: boolean } {
  const bg = tickDailyBackground(r);
  const nx = bg.run;
  const target = projectById(nx, projectId);
  if (!target || target.milestone !== "edit") return { run: nx, pulses: [], attention: bg.attention };
  if (bg.studioLocked) return { run: nx, pulses: [], attention: bg.attention };
  const resting = { ...(nx.staffResting ?? {}) };
  const fx = facilityFX(nx.facilities);
  const staff = nx.staff.map((st0) => {
    if (!target.staffIds.includes(st0.id)) return st0;
    const st = { ...st0 };
    if (resting[st.id]) {
      st.stamina = Math.min(100, st.stamina + 50 + fx.staminaRest * 2);
      if (st.stamina >= 100) delete resting[st.id];
      return st;
    }
    st.stamina = Math.max(0, st.stamina - Math.max(3, 6 - fx.staminaSave));
    if (st.stamina <= 0) resting[st.id] = true;
    return st;
  });
  return { run: { ...nx, staff, staffResting: resting }, pulses: [], attention: bg.attention || target.issues <= 0 };
}'''
rep(state, old_edit, new_edit)

# ---------------------------------------------------------------- App: increment persistent day and don't double-run weekly work
app = "game_source/src/App.tsx"
rep(app,
'''        setRun((current) => {
          if (!current) return current;
          const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
          const daily = liveEditing && focus ? tickEditDay(current, focus.projectId) : tickStudioDay(current);''',
'''        setRun((current) => {
          if (!current) return current;
          const dayRun = { ...current, day: (current.day ?? current.week * 7) + 1 };
          const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
          const daily = liveEditing && focus ? tickEditDay(dayRun, focus.projectId) : tickStudioDay(dayRun);''')
rep(app,
'''            n = advanceWeeks(n, 1);''',
'''            n = advanceWeeks(n, 1, { liveDaysAlreadyApplied: true });''')

# ---------------------------------------------------------------- stale R&D wording
_data = "game_source/src/engine/data.ts"
rep(_data,
'''  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Animation sprint output gains +12% Art quality." },''',
'''  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Art contribution checks gain +12% effective skill." },''')

print('day-based project scheduling + test audience mechanics staged')
