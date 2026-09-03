from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def read(rel: str) -> str:
    return (ROOT / rel).read_text()

def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text)

def replace(rel: str, old: str, new: str, count: int = 1) -> None:
    s = read(rel)
    if old not in s:
        raise SystemExit(f"follow-up missing anchor in {rel}: {old[:140]!r}")
    write(rel, s.replace(old, new, count))

# ---------------------------------------------------------------- live contribution integration
state = "game_source/src/engine/state.ts"
replace(state,
'''function contributionEffectiveSkill(r: RunState, st: Staff, type: PointType, editing = false): number {
  const fx = facilityFX(r.facilities);
  let effective = staffPoint(st, type) * (0.72 + Math.max(0, st.stamina) / 220);
  effective *= fx.pointMult[type];''',
'''export function contributionEffectiveSkill(r: RunState, st: Staff, type: PointType, editing = false): number {
  const fx = facilityFX(r.facilities);
  const project = projectOfStaff(r.projects, st.id);
  let effective = staffPoint(st, type);
  if (project) {
    const team = r.staff.filter((mate) => project.staffIds.includes(mate.id));
    /* Existing morale, traits, specialisations and bonds now modify the live
       percentile check instead of a removed weekly quality calculation. */
    effective *= personMod(st, project, team, { bonds: r.bonds ?? {} }).out;
  } else {
    effective *= 0.72 + Math.max(0, st.stamina) / 220;
  }
  effective *= fx.pointMult[type];
  effective *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];''')
replace(state,
'''  skill *= facilityFX(r.facilities).pointMult[type];
  if (r.research.includes("pipeline"))''',
'''  skill *= facilityFX(r.facilities).pointMult[type];
  skill *= studioPointMult(r.heads ?? {}, r.staff, r.legends ?? [])[type];
  if (r.research.includes("pipeline"))''')

# ---------------------------------------------------------------- cast gaps actually reported in playtest
# Mochi is already Shojo; extending to Romance gives the mascot slot a genuine dual fit.
# Lovelace is literally "The Serial Romantic"; adding Shojo is thematically direct.
data = "game_source/src/engine/data.ts"
replace(data,
'''reg({ id: "p_mochi", name: "Mochi", archetype: "Round Cream Cat", img: "img/cast-ready/pet/p_mochi__mochi.webp", tag: "Purrs in stereo.", aff: ["slice", "shojo"], role: "pet" })''',
'''reg({ id: "p_mochi", name: "Mochi", archetype: "Round Cream Cat", img: "img/cast-ready/pet/p_mochi__mochi.webp", tag: "Purrs in stereo.", aff: ["slice", "shojo", "romance"], role: "pet" })''')
replace(data,
'''reg({ id: "v_lovelace", name: "Lovelace", archetype: "The Serial Romantic", img: "img/cast-ready/villain/v_lovelace__lovelace.webp", tag: "Breaks hearts by contract.", aff: ["romance", "noir", "comedy"], role: "villain" })''',
'''reg({ id: "v_lovelace", name: "Lovelace", archetype: "The Serial Romantic", img: "img/cast-ready/villain/v_lovelace__lovelace.webp", tag: "Breaks hearts by contract.", aff: ["romance", "shojo", "noir", "comedy"], role: "villain" })''')

# ---------------------------------------------------------------- legacy tests now assert the visible system, not removed hidden quality
careers = "game_source/src/engine/__tests__/careers.test.ts"
replace(careers,
'''  initialRun,
  migrateRun,''',
'''  initialRun,
  contributionEffectiveSkill,
  migrateRun,''')
replace(careers,
'''  it("spec bonuses flow into weekly production", () => {
    const s = worker("s", { spec: "w_action" });
    const p = { ...proj({ genres: ["shonen"] }), staffIds: ["s"] };
    const mods: StaffModFn = (st, pr, team) => personMod(st, pr, team, noBonds);
    const withSpec = tickProjectsWeek([p], [s], 1, undefined, mods).projects[0];
    const noSpec = tickProjectsWeek([p], [{ ...s, spec: "w_comedy" }], 1, undefined, mods).projects[0];
    expect(withSpec.points.story).toBeGreaterThan(noSpec.points.story);
  });''',
'''  it("spec bonuses flow into live percentile production", () => {
    const s = worker("s", { spec: "w_action", stamina: 100 });
    const p = { ...proj({ genres: ["shonen"] }), staffIds: ["s"] };
    const run = { ...initialRun("Spec", "producer"), staff: [s], projects: [p] };
    const withSpec = contributionEffectiveSkill(run, s, "story");
    const off = { ...s, spec: "w_comedy" };
    const noSpec = contributionEffectiveSkill({ ...run, staff: [off] }, off, "story");
    expect(withSpec).toBeGreaterThan(noSpec);
  });''')

facilities = "game_source/src/engine/__tests__/facilities.test.ts"
replace(facilities,
'''  initialRun,
  migrateRun,''',
'''  initialRun,
  contributionEffectiveSkill,
  migrateRun,''')
replace(facilities,
'''    const team = [worker("a", { story: 80 })];
    const base = makeProject(draft(), 0); // concept stage focuses story
    const p = { ...base, staffIds: ["a"] };
    const plain = tickProjectsWeek([p], team, 1).projects[0];
    const boosted = tickProjectsWeek([p], team, 1, fx).projects[0];
    expect(boosted.points.story).toBeGreaterThan(plain.points.story);''',
'''    const team = [worker("a", { story: 80, stamina: 100 })];
    const base = makeProject(draft(), 0);
    const p = { ...base, staffIds: ["a"] };
    const run = { ...richRun(), staff: team, projects: [p], facilities: {} };
    const plain = contributionEffectiveSkill(run, team[0], "story");
    const boosted = contributionEffectiveSkill({ ...run, facilities: { writers: 2 } }, team[0], "story");
    expect(boosted).toBeGreaterThan(plain);''')
replace(facilities,
'''    const boosted = buyFacility(r, "writers")!;
    const plainTick = tickProjectsWeek(r.projects, r.staff, 1);
    const richTick = tickProjectsWeek(boosted.projects, boosted.staff, 1, facilityFX(boosted.facilities));
    for (let i = 0; i < 2; i++) {
      expect(richTick.projects[i].points.story).toBeGreaterThan(plainTick.projects[i].points.story);
    }''',
'''    const boosted = buyFacility(r, "writers")!;
    for (let i = 0; i < 2; i++) {
      const id = r.projects[i].staffIds[0];
      const plainStaff = r.staff.find((s) => s.id === id)!;
      const boostedStaff = boosted.staff.find((s) => s.id === id)!;
      expect(contributionEffectiveSkill(boosted, boostedStaff, "story")).toBeGreaterThan(
        contributionEffectiveSkill(r, plainStaff, "story")
      );
    }''')

# GDS-era test: day tick is energy; work pulse is now the visible multi-discipline output.
gds = "game_source/src/engine/__tests__/gds-production.test.ts"
replace(gds,
'''    const before = r.projects[0].points.story;
    const out = tickStudioDay(r);
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(out.pulses[0].type).toBe("story");
    expect(out.pulses[0].points).toBeGreaterThan(0);
    expect(out.run.projects[0].points.story).toBeGreaterThan(before);
    expect(out.run.projects[0].liveQuality?.story ?? 0).toBeGreaterThan(0);''',
'''    const before = r.projects[0].points.story + r.projects[0].points.art + r.projects[0].points.sound;
    const out = tickStudioWorkPulse(r);
    expect(out.pulses.length).toBeGreaterThan(0);
    expect(["story", "art", "sound"]).toContain(out.pulses[0].type);
    expect(out.pulses[0].points).toBeGreaterThan(0);
    const after = out.run.projects[0].points.story + out.run.projects[0].points.art + out.run.projects[0].points.sound;
    expect(after).toBeGreaterThan(before);''')

edit_test = "game_source/src/engine/__tests__/rush-edit-tuning.test.ts"
replace(edit_test,
'''import { initialRun, tickEditDay, tickStudioDay } from "../state";''',
'''import { initialRun, tickEditWorkPulse, tickStudioDay } from "../state";''')
replace(edit_test,
'''    const st = { ...r.candidates[0], stamina: 100 };''',
'''    const st = { ...r.candidates[0], story: 99, art: 99, sound: 99, stamina: 100 };''')
replace(edit_test,
'''    const out = tickEditDay(r, project.id).run;''',
'''    const out = tickEditWorkPulse(r, project.id).run;''')

# Headless career simulation must perform the same visible work checks a player gets.
longrun = "game_source/src/engine/__tests__/longrun.test.ts"
replace(longrun,
'''  startProject,
  type RunState,''',
'''  startProject,
  tickStudioWorkPulse,
  type RunState,''')
replace(longrun,
'''    /* advance one week */
    r = advanceWeeks(r, 1);''',
'''    /* A real player sees ~40 work-check cycles in a seven-day week at 1x.
       Simulate those visible contributions explicitly before the calendar tick. */
    for (let pulse = 0; pulse < 40; pulse++) r = tickStudioWorkPulse(r).run;
    /* advance one week */
    r = advanceWeeks(r, 1);''')

# New system test names should describe the actual player-facing behaviour.
replace("game_source/src/engine/__tests__/gds-production.test.ts",
'''it("ordinary desk work emits a visible contribution bubble of the correct type"''',
'''it("ordinary desk work emits a visible multi-discipline contribution bubble"''')

print("Kairosoft follow-up integration applied")
