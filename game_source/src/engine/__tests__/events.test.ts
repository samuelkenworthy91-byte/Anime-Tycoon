import { describe, expect, it } from "vitest";
import type { Draft, Staff } from "../data";
import { makeProject } from "../projects";
import { rollStudioEvent, resolveStudioEvent, type StudioEvent } from "../events";
import { initialRun, type RunState } from "../state";

const draft = (over: Partial<Draft> = {}): Draft => ({
  title: "Event Show",
  medium: "tv",
  budget: "standard",
  slot: "evening", animeType:"shonen",
  genres: ["sports"],
  audience: "teens",
  protag: "hero",
  protagName: "Aki",
  secondary: "rival",
  pet: "none",
  villain: "warlord",
  arcs: [],
  sliders: [50, 50, 50],
  season: 1,
  ...over,
});

const worker = (id: string): Staff => ({
  id,
  name: `W-${id}`,
  role: "writer",
  story: 60,
  art: 40,
  sound: 40,
  level: 4,
  salary: 900,
  cost: 0,
  stamina: 80,
  portrait: 0,
  morale: 70,
});

const run = (): RunState => ({
  ...initialRun("Test Studio", "steady"),
  cash: 500_000,
  officeLevel: 2,
  staff: [worker("a"), worker("b")],
});

const active = [{ id: "p1", title: "Event Show", stage: "animation", hype: 20, issues: 1 }];

/* ------------------------------------------------------------ rolling */
describe("rollStudioEvent", () => {
  it("returns null with no crew or projects", () => {
    expect(rollStudioEvent(10, { crew: [], active: [], topFranchise: null })).toBeNull();
  });

  it("every event offers 2–3 concrete choices", () => {
    for (let i = 0; i < 200; i++) {
      const ev = rollStudioEvent(10, {
        crew: [{ id: "a", name: "A", role: "writer", level: 4, morale: 70 }, { id: "b", name: "B", role: "animator", level: 3, morale: 60 }],
        active,
        topFranchise: { key: "k", title: "Franchise", popularity: 70 },
      });
      if (!ev) continue;
      expect(ev.choices.length).toBeGreaterThanOrEqual(2);
      expect(ev.choices.length).toBeLessThanOrEqual(3);
      for (const c of ev.choices) expect(c.effect.length).toBeGreaterThan(0);
    }
  });
});

/* ---------------------------------------------------------- resolving */
describe("resolveStudioEvent", () => {
  const ev: StudioEvent = {
    id: "sev1",
    kind: "viral",
    week: 10,
    expiresWeek: 13,
    projectId: "p1",
    text: "The trailer blew up.",
    choices: [
      { id: "ads", label: "BUY ADS", effect: "−£25,000 · +16 hype" },
      { id: "organic", label: "ORGANIC", effect: "+8 hype · free" },
    ],
  };

  it("applies the cash cost and project effect", () => {
    const r = run();
    const p = { ...makeProject(draft(), 0), id: "p1", hype: 5 };
    const out = resolveStudioEvent({ ...r, projects: [p], studioEvents: [ev] }, "sev1", "ads")!;
    expect(out.cash).toBe(500_000 - 25_000);
    expect(out.projects[0].hype).toBe(21);
  });

  it("removes the event after answering", () => {
    const r = run();
    const out = resolveStudioEvent({ ...r, projects: [], studioEvents: [ev] }, "sev1", "organic")!;
    expect(out.studioEvents).toHaveLength(0);
  });

  it("returns null for an unknown choice", () => {
    const r = run();
    expect(resolveStudioEvent({ ...r, studioEvents: [ev] }, "sev1", "nope")).toBeNull();
  });

  it("backlash doubles down on the core fans at the cost of the rest", () => {
    const be: StudioEvent = {
      id: "sev2",
      kind: "backlash",
      week: 10,
      expiresWeek: 13,
      projectId: "p1",
      text: "A boycott looms.",
      choices: [{ id: "double", label: "DOUBLE DOWN", effect: "+3 hype · −6,000 fans" }],
    };
    const r = run();
    const p = { ...makeProject(draft(), 0), id: "p1", hype: 10 };
    const out = resolveStudioEvent({ ...r, projects: [p], fans: 20_000, studioEvents: [be] }, "sev2", "double")!;
    expect(out.fans).toBe(14_000);
    expect(out.projects[0].hype).toBe(13);
  });
});
