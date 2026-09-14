from pathlib import Path


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    p = Path(path)
    text = p.read_text()
    found = text.count(old)
    if found < count:
        raise SystemExit(f"{path}: expected {count} occurrence(s), found {found}: {old[:120]!r}")
    p.write_text(text.replace(old, new, count))


replace(
    "game_source/src/engine/bigThree.ts",
    'export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;\n',
    'export const BIG_THREE_RENEWAL_LEVERAGE = 0.12;\n'
    'export const BIG_THREE_RIVAL_GRACE_WEEKS = 24;\n'
    'export const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 48;\n'
)

replace(
    "game_source/src/engine/bigThree.ts",
    '  if (!run.bigThree.introduced) return run;\n  const lastScan = run.bigThree.lastRivalScanWeek;\n',
    '  if (!run.bigThree.introduced) return run;\n'
    '  const latestRecognitionWeek = Math.max(BIG_THREE_START_WEEK, ...run.bigThree.slots.map((slot) => slot.recognisedWeek));\n'
    '  const rivalConsensusDelay = run.bigThree.slots.length <= 1 ? BIG_THREE_RIVAL_GRACE_WEEKS : BIG_THREE_RIVAL_COOLDOWN_WEEKS;\n'
    '  /* Fandom consensus should feel historical, not like another weekly ranking.\n'
    '     Rival releases accumulate during the quiet period and compete once the\n'
    '     culture has had time to settle. Player releases are deliberately not\n'
    '     blocked here: no slot is reserved, but the player gets a real window to\n'
    '     answer the Year-6 shock before rivals can consume both open places. */\n'
    '  if (run.week < latestRecognitionWeek + rivalConsensusDelay) return refreshBigThreeOwnership(run);\n'
    '  const lastScan = run.bigThree.lastRivalScanWeek;\n'
)

replace(
    "game_source/src/engine/bigThree.ts",
    '    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);\n  }\n',
    '    notices.push(`🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${BIG_THREE_MAX_SLOTS - state.slots.length} place${BIG_THREE_MAX_SLOTS - state.slots.length === 1 ? "" : "s"} remain.`);\n'
    '    /* At most one rival can crystallise into cultural canon in a single\n'
    '       recognition window. Another name must survive a fresh consensus cycle. */\n'
    '    break;\n'
    '  }\n'
)

replace(
    "game_source/src/engine/__tests__/big-three.test.ts",
    '  BIG_THREE_MAX_SLOTS,\n  BIG_THREE_SEED_POSTER_ID,\n  BIG_THREE_START_WEEK,\n',
    '  BIG_THREE_MAX_SLOTS,\n  BIG_THREE_RIVAL_COOLDOWN_WEEKS,\n  BIG_THREE_RIVAL_GRACE_WEEKS,\n  BIG_THREE_SEED_POSTER_ID,\n  BIG_THREE_START_WEEK,\n'
)

old_test = '''  it("does not reserve a player slot: qualifying rivals can complete the three first", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const studio = run.rivalWorld.studios.find((s) => s.id !== "Sunnyrise")!;
    const release = (title: string, week: number) => ({
      title, studioId: studio.id, studio: studio.name, score: 37, week, year: 6,
      genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 150_000,
      kind: "original" as const, hallOfFame: true, craft: { story: 52, art: 54, sound: 50 }, posterId: null, franchiseKey: title,
    });
    run = { ...run, week: BIG_THREE_START_WEEK + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Crown", BIG_THREE_START_WEEK + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    run = { ...run, week: BIG_THREE_START_WEEK + 2, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Throne", BIG_THREE_START_WEEK + 2)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(BIG_THREE_MAX_SLOTS);
    const { run: player, d } = playerCandidate("Too Late");
    const filled = { ...player, bigThree: run.bigThree };
    expect(recognise(filled, d, "late").bigThree.slots).toHaveLength(3);
  });
'''
new_test = '''  it("does not reserve a player slot, but rival cultural consensus cannot consume both open places instantly", () => {
    let run = initialRun("House", "steady");
    run.week = BIG_THREE_START_WEEK;
    run = syncBigThreeEra(run);
    const studio = run.rivalWorld.studios.find((s) => s.id !== "Sunnyrise")!;
    const release = (title: string, week: number) => ({
      title, studioId: studio.id, studio: studio.name, score: 37, week, year: Math.floor(week / 48) + 1,
      genres: ["fantasy"] as GenreId[], animeType: "shonen" as const, revenue: 4_000_000, fans: 150_000,
      kind: "original" as const, hallOfFame: true, craft: { story: 52, art: 54, sound: 50 }, posterId: null, franchiseKey: title,
    });

    run = { ...run, week: BIG_THREE_START_WEEK + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Crown", BIG_THREE_START_WEEK + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(1); // Year-6 shock gets breathing room.

    run = { ...run, week: BIG_THREE_START_WEEK + BIG_THREE_RIVAL_GRACE_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);

    const firstRivalRecognition = run.bigThree.slots[1].recognisedWeek;
    run = { ...run, week: firstRivalRecognition + 1, rivalWorld: { ...run.rivalWorld, studios: run.rivalWorld.studios.map((s) => s.id === studio.id ? { ...s, releases: [...s.releases, release("Rival Throne", firstRivalRecognition + 1)] } : s) } };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(2);

    run = { ...run, week: firstRivalRecognition + BIG_THREE_RIVAL_COOLDOWN_WEEKS };
    run = advanceBigThreeWeek(run);
    expect(run.bigThree.slots).toHaveLength(BIG_THREE_MAX_SLOTS);

    const { run: player, d } = playerCandidate("Too Late");
    const filled = { ...player, bigThree: run.bigThree };
    expect(recognise(filled, d, "late").bigThree.slots).toHaveLength(3);
  });
'''
replace("game_source/src/engine/__tests__/big-three.test.ts", old_test, new_test)

replace(
    "game_source/scripts/stage8-progression-audit.test.ts",
    '    expect(careers.every((career) => career.years[0] === 6)).toBe(true);\n',
    '    expect(careers.every((career) => career.years[0] === 6)).toBe(true);\n'
    '    /* The seeded title begins Year 6, but rival-only careers must not be able\n'
    '       to crystallise all three names in the same cultural moment. */\n'
    '    expect(thirdSlotYears.every((year) => year >= 7)).toBe(true);\n'
)
