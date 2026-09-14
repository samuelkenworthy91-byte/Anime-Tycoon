from pathlib import Path
import subprocess

BASE = "46690972feb0b695d92e4a13803b8a5f43096ec5"
PATH = "game_source/src/engine/bigThree.ts"


def replace(text: str, old: str, new: str, count: int = 1) -> str:
    found = text.count(old)
    if found < count:
        raise SystemExit(f"expected {count} occurrence(s), found {found}: {old[:140]!r}")
    return text.replace(old, new, count)

# Restore the fully validated Stage-7 engine as the canonical base. Stage 8 is
# a hardening layer; it must not silently replace Stage-7 prestige/ownership
# effects while changing recognition cadence.
text = subprocess.check_output(["git", "show", f"{BASE}:{PATH}"], text=True)

text = replace(
    text,
    'export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;\n',
    'export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;\n'
    'export const BIG_THREE_RIVAL_GRACE_WEEKS = 48;\n'
    'export const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 72;\n',
)

text = replace(
    text,
    '''export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced) return run;
  const lastScan = run.bigThree.lastRivalScanWeek;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } });
  }

''',
    '''export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced) return run;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) {
    return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } });
  }

  const latestRecognitionWeek = Math.max(BIG_THREE_START_WEEK, ...run.bigThree.slots.map((slot) => slot.recognisedWeek));
  const rivalConsensusDelay = run.bigThree.slots.length <= 1 ? BIG_THREE_RIVAL_GRACE_WEEKS : BIG_THREE_RIVAL_COOLDOWN_WEEKS;
  /* Fandom consensus should feel historical, not like another weekly ranking.
     Rival releases accumulate during the quiet period and compete once the
     culture has had time to settle. Player releases are deliberately not
     blocked here: no slot is reserved, but the player gets a real window to
     answer the Year-6 shock before rivals can consume both open places. */
  if (run.week < latestRecognitionWeek + rivalConsensusDelay) return refreshBigThreeOwnership(run);

  const lastScan = run.bigThree.lastRivalScanWeek;

''',
)

text = replace(
    text,
    '''    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);
  }
''',
    '''    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);
    /* At most one rival can crystallise into cultural canon in a single
       recognition window. Another name must survive a fresh consensus cycle. */
    break;
  }
''',
)

Path(PATH).write_text(text)

# Strengthen Stage-7 side-effect coverage so a future cadence refactor cannot
# remain green while dropping established rewards/history behaviour.
test_path = Path("game_source/src/engine/__tests__/big-three.test.ts")
test = test_path.read_text()

test = replace(
    test,
    '''    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    expect(run.bigThree.introduced).toBe(true);
''',
    '''    let run = initialRun("House", "steady");
    const sunnyBefore = run.rivalWorld.studios.find((s) => s.id === "Sunnyrise")!;
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const sunnyAfter = run.rivalWorld.studios.find((s) => s.id === "Sunnyrise")!;
    expect(run.bigThree.introduced).toBe(true);
''',
)

test = replace(
    test,
    '''    expect(pendingBigThreeReveal(run)?.reveal.kind).toBe("era");
    const twice = syncBigThreeEra(run);
''',
    '''    expect(pendingBigThreeReveal(run)?.reveal.kind).toBe("era");
    expect(sunnyAfter.fans).toBe(sunnyBefore.fans + 180_000);
    expect(sunnyAfter.revenue).toBe(sunnyBefore.revenue + 4_200_000);
    expect(sunnyAfter.releasesCount).toBe(sunnyBefore.releasesCount + 1);
    expect(sunnyAfter.masterpieces).toBe(sunnyBefore.masterpieces + 1);
    const twice = syncBigThreeEra(run);
''',
)

test = replace(
    test,
    '''    const next = recognise(base, d);
    expect(next.bigThree.slots).toHaveLength(2);
''',
    '''    const popularityBefore = base.franchises[d.title].popularity;
    const rivalriesBefore = base.rivalWorld.studios.map((studio) => [studio.id, studio.rivalry] as const);
    const next = recognise(base, d);
    expect(next.bigThree.slots).toHaveLength(2);
''',
)

test = replace(
    test,
    '''    expect(next.franchises[d.title].bigThree).toBe(true);
    const twice = recognise(next, d);
''',
    '''    expect(next.franchises[d.title].bigThree).toBe(true);
    expect(next.franchises[d.title].popularity).toBe(Math.min(100, popularityBefore + 12));
    for (const [id, rivalry] of rivalriesBefore) {
      const rival = next.rivalWorld.studios.find((studio) => studio.id === id)!;
      if (rival.status !== "collapsed") expect(rival.rivalry).toBe(Math.min(100, rivalry + 8));
    }
    const twice = recognise(next, d);
''',
)

test = replace(
    test,
    '''    run = { ...run, week: BIG_THREE_START_WEEK + BIG_THREE_RIVAL_GRACE_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);

    const firstRivalRecognition = run.bigThree.slots[1].recognisedWeek;
''',
    '''    const rivalBeforeRecognition = run.rivalWorld.studios.find((s) => s.id === studio.id)!;
    run = { ...run, week: BIG_THREE_START_WEEK + BIG_THREE_RIVAL_GRACE_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);
    const rivalAfterRecognition = run.rivalWorld.studios.find((s) => s.id === studio.id)!;
    expect(rivalAfterRecognition.fans).toBe(rivalBeforeRecognition.fans + 50_000);
    expect(rivalAfterRecognition.reputation).toBe(Math.min(100, rivalBeforeRecognition.reputation + 8));
    expect(rivalAfterRecognition.momentum).toBe(Math.min(30, rivalBeforeRecognition.momentum + 8));

    const firstRivalRecognition = run.bigThree.slots[1].recognisedWeek;
''',
)

test_path.write_text(test)
