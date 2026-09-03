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

# ---------------------------------------------------------------- Project Tracker: days are the player-facing production clock
tracker = "game_source/src/components/ProjectTracker.tsx"
rep(tracker,
'''import { activeProjects, STAGE_LABEL, weeksToDeadline } from "../engine/projects";''',
'''import { activeProjects, daysToDeadline, STAGE_LABEL } from "../engine/projects";''')
rep(tracker,
'''          const due = weeksToDeadline(p, run.week);
          const elapsedWeeks = Math.max(0, run.week - p.createdWeek);''',
'''          const now = run.day ?? run.week * 7;
          const due = daysToDeadline(p, now);
          const elapsedDays = Math.max(0, now - (p.createdDay ?? p.createdWeek * 7));''')
rep(tracker,
'''                <span className={due < 0 ? "text-neon" : due <= 2 ? "text-gold" : "text-paper/45"}>{due < 0 ? <AlertTriangle size={10}/> : <Clock3 size={10}/>}</span>''',
'''                <span className={due < 0 ? "text-neon" : due <= 14 ? "text-gold" : "text-paper/45"}>{due < 0 ? <AlertTriangle size={10}/> : <Clock3 size={10}/>}</span>''')
rep(tracker,
'''                <span className="ml-auto text-paper/45">{elapsedWeeks}W {clockDay + 1}D · {due < 0 ? `${Math.abs(due)}W LATE` : `${due}W LEFT`}</span>''',
'''                <span className="ml-auto text-paper/45">DAY {elapsedDays + 1} · {due < 0 ? `${Math.abs(due)}D LATE` : `${due}D LEFT`}</span>''')
# clockDay no longer needed in tracker API, keep optional ignored? remove to satisfy TS.
rep(tracker,
'''export default function ProjectTracker({ run, clockDay, onOpen }: { run: RunState; clockDay: number; onOpen: () => void }) {''',
'''export default function ProjectTracker({ run, onOpen }: { run: RunState; clockDay: number; onOpen: () => void }) {''')

# ---------------------------------------------------------------- Project Board: stage/deadline display in days
projects = "game_source/src/components/Projects.tsx"
rep(projects,
'''  projectOfStaff,
  weeksToDeadline,
  type Project,''',
'''  projectOfStaff,
  daysToDeadline,
  type Project,''')
rep(projects,
'''  const late = weeksToDeadline(p, run.week);''',
'''  const late = daysToDeadline(p, run.day ?? run.week * 7);''')
rep(projects,
'''              <AlertTriangle size={10} /> {-late} WK LATE''',
'''              <AlertTriangle size={10} /> {-late}D LATE''')
rep(projects,
'''              : `${STAGE_LABEL[p.stage]} ${Math.min(Math.floor(p.progress), plan)}/${plan} wk`}''',
'''              : `${STAGE_LABEL[p.stage]} ${Math.min(Math.floor(p.progress * 7), Math.round(plan * 7))}/${Math.round(plan * 7)} days`}''')
rep(projects,
'''          <span className={cn("flex items-center gap-1 font-bold", late < 0 ? "text-neon" : late <= 2 ? "text-gold" : "text-paper/55")}>
            <Calendar size={10} /> {dateLabel(p.deadlineWeek)}
            {late >= 0 ? ` · ${late} wk left` : ""}
          </span>''',
'''          <span className={cn("flex items-center gap-1 font-bold", late < 0 ? "text-neon" : late <= 14 ? "text-gold" : "text-paper/55")}>
            <Calendar size={10} /> {late >= 0 ? `${late} days left` : `${-late} days late`}
          </span>''')

# ---------------------------------------------------------------- Knowledge Dossier: familiarity progressively reveals exact guidance
know = "game_source/src/components/KnowledgeDossier.tsx"
s = read(know)
old = '''      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>PRODUCTION LEAN</b><br/><span className="text-paper/60">{emphasis.map(([n,v]) => `${n} ${Math.round(Number(v)*100)}%`).join(" · ")}</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>STORY KNOWLEDGE</b><br/><span className="text-paper/60">{learnedArcs} arc relationship{learnedArcs===1?"":"s"} learned for this genre.</span></div>
      </div>'''
new = '''      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>PRODUCTION LEAN</b><br/><span className="text-paper/60">{
          k <= 0 ? "Untested — ship a show or run a test audience to learn what matters." :
          k <= 2 ? `Early read: ${emphasis[0][0]} appears most important.` :
          k <= 5 ? emphasis.map(([n,v]) => `${n} ≈${Math.round(Number(v)*100/5)*5}%`).join(" · ") :
          emphasis.map(([n,v]) => `${n} ${Math.round(Number(v)*100)}%`).join(" · ")
        }</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px]"><b>DIRECTION MEMO</b><br/><span className="text-paper/60">{
          k < 3 ? "Audience direction preferences are still fuzzy." :
          k < 6 ? `The studio has a working read on this genre. More releases narrow the slider targets.` :
          `Plot ${g.ideal[0]}% · Sakuga ${g.ideal[1]}% · Music ${g.ideal[2]}%`
        }</span></div>
        <div className="rounded-lg border border-line bg-panel2/70 p-2 text-[10px] sm:col-span-2"><b>STORY KNOWLEDGE</b><br/><span className="text-paper/60">{learnedArcs} arc relationship{learnedArcs===1?"":"s"} learned for this genre. Test audiences and repeated releases add more evidence.</span></div>
      </div>'''
if old not in s:
    raise SystemExit('knowledge progressive anchor missing')
write(know, s.replace(old, new, 1))

# ---------------------------------------------------------------- Office: imports and day-aware cards / richer Records / Test Audience
office = "game_source/src/components/Office.tsx"
rep(office,
'''  ARC_COMBOS,
  CAST_CHEMS,''',
'''  ARCS,
  ARC_COMBOS,
  arcComboRating,
  CAST_CHEMS,''')
rep(office,
'''  startResearchProject,
  studioScore,
  type RunState,''',
'''  startResearchProject,
  startTestAudience,
  AUDIENCE_TEST_DAYS,
  AUDIENCE_TEST_RD,
  AUDIENCE_TEST_MAX_FINDINGS,
  audienceShowKey,
  studioScore,
  type RunState,''')
# ProjectTracker keeps clockDay prop for signature compatibility but uses persistent run.day.
# Contract active days left and due copy.
rep(office,
'''                  const daysLeft = Math.max(0, (job.dueWeek - run.week) * 7 - clockDay);''',
'''                  const daysLeft = Math.max(0, (job.dueDay ?? job.dueWeek * 7) - (run.day ?? run.week * 7));''')
rep(office,
'''<div className="text-[9px] text-paper/45">{[...crew.map((st) => st.name), ...(job.showrunner ? [runner.name] : [])].join(", ")} · due {dateLabel(job.dueWeek)}</div>''',
'''<div className="text-[9px] text-paper/45">{[...crew.map((st) => st.name), ...(job.showrunner ? [runner.name] : [])].join(", ")} · {daysLeft} day{daysLeft===1?"":"s"} left</div>''')
rep(office,
'''                    Needs <b style={{ color: POINT_COLOR[c.type] }}>{c.target} {c.type}</b> points · {c.weeks} weeks''',
'''                    Needs <b style={{ color: POINT_COLOR[c.type] }}>{c.target} {c.type}</b> points · {c.weeks * 7} days''')
# R&D test audience card before studio tech.
anchor = '''          <KnowledgeDossier run={run} selection={knowledge} onSelect={setKnowledge} />
          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">STUDIO TECH</div>'''
if anchor not in read(office):
    raise SystemExit('R&D audience card anchor missing')
aud_card = r'''          <KnowledgeDossier run={run} selection={knowledge} onSelect={setKnowledge} />
          <div className="mt-4 rounded-xl border border-cyanx/45 bg-cyanx/5 p-3">
            {(() => {
              const key = audienceShowKey(run);
              const tested = key ? (run.audienceTestCounts?.[key] ?? 0) : 0;
              const exhausted = tested >= AUDIENCE_TEST_MAX_FINDINGS;
              const blocked = !run.lastDraft || !run.lastResult || run.staff.length === 0 || !!run.audienceTest || run.trainingJobs.length > 0 || exhausted;
              return <>
                <div className="flex items-center gap-2"><Users size={15} className="text-cyanx"/><div className="font-display text-sm font-extrabold">TEST AUDIENCE LAB</div><span className="ml-auto rounded bg-panel3 px-2 py-0.5 text-[9px] font-bold text-mint">REPEATABLE</span></div>
                <div className="mt-1 text-[10px] text-paper/60">Study your latest release. The whole studio stops normal production for <b className="text-paper">{AUDIENCE_TEST_DAYS} days</b>; project and contract deadlines keep moving. Each completed panel gives <b className="text-viol">+{AUDIENCE_TEST_RD} RD</b> and one concrete finding about sliders, quality mix, cast or arcs.</div>
                {run.lastDraft && <div className="mt-2 rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-[10px]"><b>LATEST: “{run.lastDraft.title}”</b><span className="ml-2 text-paper/45">{tested}/{AUDIENCE_TEST_MAX_FINDINGS} findings extracted</span></div>}
                {run.audienceTest ? (
                  <div className="mt-2 text-xs font-bold text-cyanx">PANEL RUNNING · {Math.max(0, run.audienceTest.completesDay - (run.day ?? run.week*7))} DAYS LEFT · ALL STAFF OCCUPIED</div>
                ) : exhausted ? (
                  <div className="mt-2 text-xs font-bold text-mint">THIS RELEASE IS FULLY TESTED ✓ · Ship another show for a fresh panel.</div>
                ) : (
                  <Btn variant="cyan" className="mt-2 !px-3 !py-1.5 text-xs" disabled={blocked} onClick={() => setRun((r) => startTestAudience(r) ?? r)}>
                    <Users size={13}/> RUN PANEL · ALL STAFF · {AUDIENCE_TEST_DAYS} DAYS
                  </Btn>
                )}
                {run.trainingJobs.length > 0 && !run.audienceTest && <div className="mt-1 text-[9px] text-gold">Finish current staff training first — a panel needs the whole team available.</div>}
              </>;
            })()}
          </div>
          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">STUDIO TECH</div>'''
write(office, read(office).replace(anchor, aud_card, 1))
# R&D pending duration in days.
rep(office,
'''<span className="text-xs font-bold text-cyanx">IN RESEARCH · {Math.max(0, pending.completesWeek - run.week)} WK</span>''',
'''<span className="text-xs font-bold text-cyanx">IN RESEARCH · {Math.max(0, (pending.completesDay ?? pending.completesWeek*7) - (run.day ?? run.week*7))} DAYS</span>''')
# Records arc cards: recipe + rating + mechanical impact.
old_arc = '''                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg border border-cyanx/40 bg-cyanx/5 px-2.5 py-1.5">
                    <span className="truncate text-xs font-bold text-cyanx">{c.name}</span>
                    <span className="ml-auto text-[10px] font-extrabold text-gold">
                      {c.q >= 0 ? "+" : ""}
                      {c.q} Q{c.f ? ` · +${Math.round(c.f * 100)}% fans` : ""}
                    </span>
                  </div>
                );'''
new_arc = '''                const rating = arcComboRating(c);
                const names = c.arcs.map((arcId) => ARCS.find((a) => a.id === arcId)?.name ?? arcId);
                return (
                  <div key={id} className="rounded-lg border border-cyanx/40 bg-cyanx/5 px-2.5 py-2">
                    <div className="flex items-center gap-2"><span className="truncate text-xs font-bold text-cyanx">{c.name}</span><span className={cn("ml-auto text-[9px] font-extrabold", rating.cls)}>{rating.label}</span></div>
                    <div className="mt-1 text-[10px] text-paper/65"><b className="text-paper/80">RECIPE:</b> {names.join(c.ordered ? " → " : " + ")}{c.ordered ? " · order matters" : ""}</div>
                    <div className="mt-1 text-[10px] font-bold text-gold"><b className="text-paper/70">IMPACT:</b> {c.q >= 0 ? "+" : ""}{c.q} arc quality{c.f ? ` · ${c.f >= 0 ? "+" : ""}${Math.round(c.f * 100)}% fan response` : ""}</div>
                  </div>
                );'''
rep(office, old_arc, new_arc)
# Records audience insights section before lifetime stats.
records_anchor = '''          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">'''
if records_anchor not in read(office):
    raise SystemExit('Records insight anchor missing')
records = r'''          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-viol">
            <Users size={14} /> TEST AUDIENCE FINDINGS
          </div>
          {(run.audienceInsights ?? []).length === 0 ? (
            <div className="text-sm text-paper/40">Run panels in R&amp;D after a release to turn audience reactions into permanent studio knowledge.</div>
          ) : (
            <div className="space-y-1.5">{[...(run.audienceInsights ?? [])].reverse().slice(0, 12).map((ins, i) => (
              <div key={`${ins.showKey}_${ins.day}_${i}`} className="rounded-lg border border-viol/30 bg-viol/5 px-2.5 py-2"><div className="text-[9px] font-extrabold tracking-wider text-viol">“{ins.title}” · DAY {ins.day}</div><div className="mt-0.5 text-[10px] text-paper/70">{ins.text}</div></div>
            ))}</div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">'''
write(office, read(office).replace(records_anchor, records, 1))

# ---------------------------------------------------------------- facility regression: editing room strengthens visible note bubbles, not hidden weekly deletion
fac_test = "game_source/src/engine/__tests__/facilities.test.ts"
rep(fac_test,
'''  it("editing suite fixes more issues in post and guards sprints", () => {
    const fx = facilityFX({ editing: 2 });
    const base = makeProject(draft(), 0);
    const p: Project = { ...base, stage: "post", issues: 8 };
    const plain = tickProjectsWeek([p], [], 1).projects[0];
    const suite = tickProjectsWeek([p], [], 1, fx).projects[0];
    expect(suite.issues).toBe(plain.issues - 2);

    // sprint issue guard''',
'''  it("editing suite strengthens live note-clearing checks and guards sprints", () => {
    const base = makeProject(draft(), 0);
    const editor = worker("edit", { story: 70, art: 70, sound: 70, stamina: 100 });
    const p: Project = { ...base, stage: "post", milestone: "edit", issues: 8, staffIds: [editor.id] };
    const plainRun = { ...richRun(), staff: [editor], projects: [p], facilities: {} };
    const suiteRun = { ...plainRun, facilities: { editing: 2 as const } };
    expect(contributionEffectiveSkill(suiteRun, editor, "art", true)).toBeGreaterThan(
      contributionEffectiveSkill(plainRun, editor, "art", true)
    );

    // sprint issue guard''')

# ---------------------------------------------------------------- new regression tests for day clock + Test Audience
newtest = "game_source/src/engine/__tests__/audience-time.test.ts"
write(newtest, r'''import { describe, expect, it, vi } from "vitest";
import type { Draft, Staff } from "../data";
import { makeProject, tickProjectsDay } from "../projects";
import {
  AUDIENCE_TEST_DAYS,
  AUDIENCE_TEST_RD,
  initialRun,
  migrateRun,
  startTestAudience,
  tickStudioDay,
  tickStudioWorkPulse,
  type RunState,
} from "../state";

const draft = (): Draft => ({
  title:"Panel Show", medium:"tv", budget:"standard", scope:"standard", slot:"midnight",
  genres:["shojo","romance"], audience:"teens", protag:"hana", protagName:"Hana",
  secondary:"s_ice", pet:"p_mochi", villain:"v_lovelace", arcs:["festival","confession"], sliders:[50,50,50], season:1,
});

const staff = (id="s"): Staff => ({
  id, name:"Test Worker", role:"writer", story:80, art:50, sound:40, level:1, stamina:100, salary:500, cost:5000, portrait:0,
});

describe("day-driven production", () => {
  it("moves project schedule on an ordinary day rather than waiting for week end", () => {
    const s = staff();
    const p = { ...makeProject(draft(), 0, 0), staffIds:[s.id] };
    const out = tickProjectsDay([p], [s], 1);
    expect(out.projects[0].progress).toBeGreaterThan(0);
    expect(out.projects[0].spent).toBeGreaterThan(p.spent);
  });

  it("legacy saves derive an absolute day from week", () => {
    const raw = initialRun("Legacy Day", "producer") as unknown as Record<string, unknown>;
    raw.week = 9;
    delete raw.day;
    expect(migrateRun(raw).day).toBe(63);
  });
});

describe("repeatable test audience", () => {
  const releaseReady = (): RunState => {
    const r = initialRun("Audience", "producer");
    return {
      ...r,
      staff:[staff()],
      lastDraft:draft(),
      lastResult:{ reviews:[], total:24, tier:"solid", hallOfFame:false, points:{story:20,art:20,sound:20}, issues:2, revenue:1000, fans:100, costs:1000, rd:0, sales:[1], breakdown:[], comboLevel:1, newCombo:false, chemMult:1, chemDiscovered:[], secretDiscovered:false, quality:22, arcCombosDiscovered:[] },
      showsMade:1,
    };
  };

  it("ties up the whole studio for two days, then pays RD and a concrete finding", () => {
    let r = startTestAudience(releaseReady())!;
    expect(r.audienceTest).not.toBeNull();
    const beforeRD = r.rd;
    expect(tickStudioWorkPulse(r).pulses).toHaveLength(0);
    for (let d=0; d<AUDIENCE_TEST_DAYS; d++) {
      r = { ...r, day:r.day+1 };
      r = tickStudioDay(r).run;
    }
    expect(r.audienceTest).toBeNull();
    expect(r.rd).toBe(beforeRD + AUDIENCE_TEST_RD);
    expect(r.audienceInsights.length).toBe(1);
    expect(r.audienceInsights[0].text).toContain("Plot");
    expect(r.genreKnowledge.shojo).toBe(1);
  });

  it("can be repeated on the same latest release for a different finding", () => {
    let r = releaseReady();
    for (let round=0; round<2; round++) {
      r = startTestAudience(r)!;
      for (let d=0; d<AUDIENCE_TEST_DAYS; d++) {
        r = { ...r, day:r.day+1 };
        r = tickStudioDay(r).run;
      }
    }
    expect(r.audienceInsights).toHaveLength(2);
    expect(r.audienceInsights[1].text).toContain("Sakuga");
  });

  it("keeps contract deadlines moving while the studio is in a panel", () => {
    let r = releaseReady();
    const contract = { id:"clock", name:"Deadline", type:"story" as const, target:99, weeks:1, pay:1000, rd:3 };
    r = { ...r, contractJobs:[{ id:"job", contract, staffIds:[r.staff[0].id], startWeek:0, dueWeek:1, startDay:0, dueDay:1, progress:0 }] };
    r = startTestAudience(r)!;
    r = { ...r, day:1 };
    r = tickStudioDay(r).run;
    expect(r.contractJobs).toHaveLength(0);
    expect(r.notices.some((n)=>n.includes("Contract missed"))).toBe(true);
  });
});
''')

print('Records, day-clock UI and Test Audience UI/tests staged')
