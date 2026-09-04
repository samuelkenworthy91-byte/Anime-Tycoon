from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def rep(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    actual = text.count(old)
    if actual != count:
        raise RuntimeError(f"{path}: expected {count} occurrence(s), found {actual}: {old[:120]!r}")
    write(path, text.replace(old, new, count))


# ------------------------------------------------ App.tsx
path = "game_source/src/App.tsx"
text = read(path)
if "0 | 1 | 4 | 12" not in text:
    raise RuntimeError("App speed union anchor missing")
text = text.replace("0 | 1 | 4 | 12", "0 | 1 | 4 | 8 | 12")
if 'import { liveWorkPulseGapMs } from "./engine/studioOps";' not in text:
    anchor = 'import { beginDynastyMode } from "./engine/legacy";'
    if text.count(anchor) != 1:
        raise RuntimeError("App studioOps import anchor missing")
    text = text.replace(anchor, anchor + '\nimport { liveWorkPulseGapMs } from "./engine/studioOps";', 1)
old_gap = "    const gap = Math.max(180, Math.round(1750 / Math.max(1, timeSpeed)));"
if text.count(old_gap) != 1:
    raise RuntimeError("App work gap anchor missing")
text = text.replace(old_gap, "    const gap = liveWorkPulseGapMs(timeSpeed);", 1)
text, n = re.subn(r"\[\s*0\s*,\s*1\s*,\s*4\s*,\s*12\s*\]", "[0, 1, 4, 8, 12]", text, count=1)
if n != 1:
    raise RuntimeError("App speed button array anchor missing")
write(path, text)

# --------------------------------------------- studioOps.ts
path = "game_source/src/engine/studioOps.ts"
marker = "export const trainingWeeks = (tier: number) => Math.max(2, 5 - Math.max(1, tier));"
constants = '''/** Live-clock constants shared by playback, ETA maths and tests. */
export const LIVE_DAY_MS = 10_000;
export const LIVE_WORK_PULSE_BASE_MS = 1_750;
export const LIVE_WORK_PULSES_PER_DAY = LIVE_DAY_MS / LIVE_WORK_PULSE_BASE_MS;
export const SHOWRUNNER_CONTRACT_PULSE_CHANCE = 0.34;

/** Playback speed changes real time only. Every speed therefore gets the same
 * expected number of contribution checks per in-game day. */
export function liveWorkPulseGapMs(speed: number): number {
  if (speed <= 0) return LIVE_WORK_PULSE_BASE_MS;
  return Math.max(80, Math.round(LIVE_WORK_PULSE_BASE_MS / speed));
}

''' + marker
rep(path, marker, constants)

text = read(path)
pattern = r'''export function contractDailyOutputEstimate\(contract: Contract, crew: Staff\[\], research: string\[\] = \[\], showrunnerSkill = 0\): number \{.*?\n\}\n\nexport const projectedContractTotal'''
replacement = '''export function contractDailyOutputEstimate(contract: Contract, crew: Staff[], research: string[] = [], showrunnerSkill = 0): number {
  const pipeline = research.includes("pipeline") ? 1.12 : 1;
  const staffPerPulse = crew.reduce((a, s) => a + (staffPoint(s, contract.type) * pipeline) / 100, 0);
  const runnerEffective = showrunnerSkill * pipeline;
  const runnerPerPulse = showrunnerSkill > 0
    ? SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + runnerEffective / 100)
    : 0;
  return Math.max(0.1, Math.round((staffPerPulse + runnerPerPulse) * LIVE_WORK_PULSES_PER_DAY * 10) / 10);
}

export const projectedContractTotal'''
out, n = re.subn(pattern, replacement, text, count=1, flags=re.S)
if n != 1:
    raise RuntimeError("studioOps contractDailyOutputEstimate block missing")
out = out.replace(
    'contractDailyOutputEstimate(contract, crew, research, showrunnerSkill) * contract.weeks * 7;',
    'Math.round(contractDailyOutputEstimate(contract, crew, research, showrunnerSkill) * contract.weeks * 7);',
    1,
)
write(path, out)

# ------------------------------------------------ state.ts
path = "game_source/src/engine/state.ts"
rep(
    path,
    '''  contractWeeklyOutput,\n  showrunnerBubbleOutput,''',
    '''  contractWeeklyOutput,\n  showrunnerBubbleOutput,\n  LIVE_WORK_PULSES_PER_DAY,\n  SHOWRUNNER_CONTRACT_PULSE_CHANCE,''',
)
rep(
    path,
    '''  /* Genji's Steady Hand now has a mechanical purpose: expected contribution\n     output is 25% higher everywhere, including contract and edit work. */\n  if (r.showrunner === "steady") effective *= 1.25;''',
    '''  /* Genji's Steady Hand is deliberately obvious: all staff contribution\n     output is 50% stronger everywhere, including contract and edit work. */\n  if (r.showrunner === "steady") effective *= 1.5;''',
)
rep(path, '  if (r.showrunner === "steady") skill *= 1.25;', '  if (r.showrunner === "steady") skill *= 1.5;')
rep(path, '  if (runnerJob && Math.random() < 0.34) {', '  if (runnerJob && Math.random() < SHOWRUNNER_CONTRACT_PULSE_CHANCE) {')

helper_marker = '''/** One visible production-check cycle. At most two hired staff are sampled per\n *  cycle so a full office stays readable; skill determines whether their check'''
helper = '''function liveWorkEligible(r: RunState, st: Staff, pendingIds: Set<string> = new Set()): boolean {
  if ((r.staffResting ?? {})[st.id] || st.stamina <= 0) return false;
  if (pendingIds.has(st.id)) return true;
  const contract = (r.contractJobs ?? []).some((j) => j.staffIds.includes(st.id));
  const project = projectOfStaff(r.projects, st.id);
  const production = !!project && !project.milestone && ["concept", "preprod", "animation", "sound", "post"].includes(project.stage);
  return contract || production;
}

function expectedContractDailyRate(
  r: RunState,
  contract: Contract,
  staffIds: string[],
  hasShowrunner: boolean,
  pendingSelection = false,
): number {
  const pendingIds = pendingSelection ? new Set(staffIds) : new Set<string>();
  const eligible = r.staff.filter((st) => liveWorkEligible(r, st, pendingIds));
  const sampleChance = eligible.length <= 2 ? 1 : 2 / eligible.length;
  const assigned = new Set(staffIds);
  const staffPerPulse = eligible.reduce((sum, st) => {
    if (!assigned.has(st.id)) return sum;
    return sum + sampleChance * (contributionEffectiveSkill(r, st, contract.type) / 100);
  }, 0);
  const runnerPerPulse = hasShowrunner
    ? SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + showrunnerEffectiveSkill(r, contract.type) / 100)
    : 0;
  return Math.max(0, (staffPerPulse + runnerPerPulse) * LIVE_WORK_PULSES_PER_DAY);
}

/** Exact expectation for an ACTIVE live contract. This mirrors the same sampling,
 * percentile output and showrunner activation used by rollStudioWorkPulses. */
export function contractDailyOutputEstimateForRun(r: RunState, job: ContractAssignment): number {
  return expectedContractDailyRate(r, job.contract, job.staffIds, !!job.showrunner, false);
}

/** Preview expectation before a contract is assigned. Selected idle workers are
 * treated as live contributors so the assignment screen uses the same maths. */
export function contractSelectionDailyOutputEstimate(
  r: RunState,
  contract: Contract,
  staffIds: string[],
  hasShowrunner: boolean,
): number {
  return expectedContractDailyRate(r, contract, staffIds, hasShowrunner, true);
}

''' + helper_marker
rep(path, helper_marker, helper)

# ------------------------------------------------ data.ts
path = "game_source/src/engine/data.ts"
rep(
    path,
    'perk: "Steady Hand — all contribution checks are 25% stronger and pre-edit production creates 25% fewer editing notes."',
    'perk: "Steady Hand — all contribution checks are 50% stronger and pre-edit production creates 25% fewer editing notes."',
)

# ----------------------------------------------- Office.tsx
path = "game_source/src/components/Office.tsx"
text = read(path)
state_anchor = '  studioScore,\n  type RunState,'
if text.count(state_anchor) != 1:
    raise RuntimeError("Office state import anchor missing")
text = text.replace(state_anchor, '  studioScore,\n  contractDailyOutputEstimateForRun,\n  type RunState,', 1)
old_import = 'import { contractDailyOutputEstimate, showrunnerContractSkill } from "../engine/studioOps";\n'
if text.count(old_import) != 1:
    raise RuntimeError("Office studioOps import anchor missing")
text = text.replace(old_import, '', 1)
old_block = '''                  const crew = run.staff.filter((st) => job.staffIds.includes(st.id));
                  const runnerSkill = job.showrunner ? showrunnerContractSkill(run.showrunner, run.showsMade, job.contract.type) : 0;
                  const rate = contractDailyOutputEstimate(job.contract, crew.filter((st) => !run.staffResting?.[st.id]), run.research, runnerSkill);
                  const daysLeft = Math.max(0, (job.dueDay ?? job.dueWeek * 7) - (run.day ?? run.week * 7));
                  const projected = job.progress + rate * daysLeft;
                  const eta = Math.max(1, Math.ceil(Math.max(0, job.contract.target - job.progress) / Math.max(1, rate)));'''
new_block = '''                  const crew = run.staff.filter((st) => job.staffIds.includes(st.id));
                  const rate = contractDailyOutputEstimateForRun(run, job);
                  const rateLabel = rate >= 10 ? Math.round(rate).toString() : rate.toFixed(1);
                  const daysLeft = Math.max(0, (job.dueDay ?? job.dueWeek * 7) - (run.day ?? run.week * 7));
                  const projected = Math.round(job.progress + rate * daysLeft);
                  const eta = Math.max(1, Math.ceil(Math.max(0, job.contract.target - job.progress) / Math.max(0.1, rate)));'''
if text.count(old_block) != 1:
    raise RuntimeError("Office active job rate block missing")
text = text.replace(old_block, new_block, 1)
if text.count('≈ +{rate}/day · LIVE') != 1:
    raise RuntimeError("Office rate label anchor missing")
text = text.replace('≈ +{rate}/day · LIVE', '≈ +{rateLabel}/day · LIVE', 1)
old_phrase = '`On pace · roughly ${eta} workday${eta === 1 ? "" : "s"} at this crew strength. Every bubble moves this bar.`'
new_phrase = '`On pace · ≈${eta} average workday${eta === 1 ? "" : "s"} at this crew strength. Every bubble moves this bar.`'
if text.count(old_phrase) != 1:
    raise RuntimeError("Office ETA phrase anchor missing")
text = text.replace(old_phrase, new_phrase, 1)
write(path, text)

# ------------------------------------------ ContractJob.tsx
path = "game_source/src/components/ContractJob.tsx"
text = read(path)
old_state = 'import { staffBusyReason, type RunState } from "../engine/state";'
new_state = 'import { contractSelectionDailyOutputEstimate, staffBusyReason, type RunState } from "../engine/state";'
if text.count(old_state) != 1:
    raise RuntimeError("ContractJob state import anchor missing")
text = text.replace(old_state, new_state, 1)
old_ops = 'import { projectedContractTotal, showrunnerContractSkill } from "../engine/studioOps";'
new_ops = 'import { showrunnerContractSkill } from "../engine/studioOps";'
if text.count(old_ops) != 1:
    raise RuntimeError("ContractJob studioOps import anchor missing")
text = text.replace(old_ops, new_ops, 1)
old_calc = '''  const projected = projectedContractTotal(contract, crew, run.research, showrunnerSelected ? runnerSkill : 0);
  const likely = projected >= contract.target;'''
new_calc = '''  const dailyRate = seats > 0 ? contractSelectionDailyOutputEstimate(run, contract, selected, showrunnerSelected) : 0;
  const dailyRateLabel = dailyRate >= 10 ? Math.round(dailyRate).toString() : dailyRate.toFixed(1);
  const projected = Math.round(dailyRate * contract.weeks * 7);
  const eta = seats > 0 ? Math.max(1, Math.ceil(contract.target / Math.max(0.1, dailyRate))) : 0;
  const likely = projected >= contract.target;'''
if text.count(old_calc) != 1:
    raise RuntimeError("ContractJob projection calc anchor missing")
text = text.replace(old_calc, new_calc, 1)
if text.count('watch the contract fill as weeks pass.') != 1:
    raise RuntimeError("ContractJob weeks copy anchor missing")
text = text.replace('watch the contract fill as weeks pass.', 'watch the contract fill as days pass.', 1)
if text.count('{contract.weeks} wk deadline') != 1:
    raise RuntimeError("ContractJob deadline label anchor missing")
text = text.replace('{contract.weeks} wk deadline', '{contract.weeks * 7} day deadline', 1)
old_runner = '{runner.title} · {POINT_LABEL[contract.type]} {runnerSkill}{runnerBusy ? " · already on a contract" : ""}'
new_runner = '{runner.title} · {POINT_LABEL[contract.type]} {runnerSkill}{run.showrunner === "steady" ? " · Steady Hand ×1.5 live" : ""}{runnerBusy ? " · already on a contract" : ""}'
if text.count(old_runner) != 1:
    raise RuntimeError("ContractJob runner subtitle anchor missing")
text = text.replace(old_runner, new_runner, 1)
old_copy = 'Each in-game week, selected contributors turn their relevant skill + current energy into progress. Digital Pipeline improves output. Reach the target early and the job pays immediately; miss the deadline and you only recover a little learning RD.'
new_copy = 'Live work rolls continuously. Current team estimate: ≈{dailyRateLabel}/day, around {eta || "—"} workdays on average. Speed controls only make game days pass faster; expected work per in-game day stays the same. Reach the target early and the job pays immediately.'
if text.count(old_copy) != 1:
    raise RuntimeError("ContractJob projection copy anchor missing")
text = text.replace(old_copy, new_copy, 1)
write(path, text)

# ------------------------------------------------ new tests
Path("game_source/src/engine/__tests__/speed-eta.test.ts").write_text('''import { describe, expect, it } from "vitest";
import { contributionEffectiveSkill, contractSelectionDailyOutputEstimate, initialRun } from "../state";
import {
  LIVE_DAY_MS,
  LIVE_WORK_PULSES_PER_DAY,
  SHOWRUNNER_CONTRACT_PULSE_CHANCE,
  liveWorkPulseGapMs,
  showrunnerContractSkill,
} from "../studioOps";

describe("live speed and contract ETA", () => {
  it("keeps expected contribution checks per in-game day stable at 1x, 4x, 8x and 12x", () => {
    const baseline = (LIVE_DAY_MS / 1) / liveWorkPulseGapMs(1);
    for (const speed of [1, 4, 8, 12]) {
      const checks = (LIVE_DAY_MS / speed) / liveWorkPulseGapMs(speed);
      expect(checks).toBeCloseTo(baseline, 2);
    }
  });

  it("uses the real 34% showrunner activation rate in a solo contract ETA", () => {
    const r = initialRun("ETA Studio", "steady");
    const contract = r.contracts[0];
    const rawSkill = showrunnerContractSkill(r.showrunner, r.showsMade, contract.type);
    const effectiveSkill = rawSkill * 1.5;
    const expected = LIVE_WORK_PULSES_PER_DAY * SHOWRUNNER_CONTRACT_PULSE_CHANCE * (1 + effectiveSkill / 100);
    const actual = contractSelectionDailyOutputEstimate(r, contract, [], true);
    expect(actual).toBeCloseTo(expected, 5);
  });

  it("makes Steady Hand contributions 50% stronger than the same worker under another showrunner", () => {
    const seed = initialRun("Seed", "vision");
    const worker = { ...seed.candidates[0], stamina: 100 };
    const normal = { ...initialRun("Normal", "vision"), staff: [worker] };
    const steady = { ...initialRun("Steady", "steady"), staff: [worker] };
    const base = contributionEffectiveSkill(normal, worker, "story");
    const boosted = contributionEffectiveSkill(steady, worker, "story");
    expect(boosted).toBeCloseTo(base * 1.5, 5);
  });
});
''')

print("speed, ETA and Steady Hand patch staged")
