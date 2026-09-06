import { describe, expect, it } from "vitest";
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
  title:"Panel Show", medium:"tv", budget:"standard", scope:"standard", slot:"midnight", animeType:"shonen",
  genres:["romance","slice"], audience:"teens", protag:"hana", protagName:"Hana",
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
    expect(r.genreKnowledge.romance).toBe(1);
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
