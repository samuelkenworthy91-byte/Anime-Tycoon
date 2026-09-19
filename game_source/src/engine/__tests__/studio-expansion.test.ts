import { describe, expect, it } from "vitest";
import type { Draft, Staff } from "../data";
import type { ShowResult } from "../scoring";
import { makeProject } from "../projects";
import {
  initialRun,
  migrateRun,
  advanceWeeks,
  tickStudioDay,
  tickStudioWorkPulse,
  releaseProject,
  sellReadyProject,
  showSaleOffers,
  type RunState,
} from "../state";
import {
  initialExpansion,
  expansionOf,
  snapshotProduction,
  schedulePolicies,
  advanceExpansionDay,
  promiseLeadership,
  appointCreativeLead,
  finishExpansionProduction,
  renegotiatePromise,
  recallStaff,
  settleProjectReceipt,
  pitchAction,
  expansionBusyReason,
  approveCreatorEdit,
} from "../studioExpansion";
import {
  initialOverseas,
  overseasOf,
  quoteOverseas,
  signOverseas,
  advanceOverseasWeek,
  defaultContent,
  setContentProfile,
  distributionBlock,
  regionalReception,
  reviewLegacyRights,
  type OverseasRequest,
} from "../overseas";
import { toLegend } from "../careers";

const draft = (): Draft => ({
  title: "A Creator's Journey",
  medium: "tv",
  budget: "standard",
  scope: "standard",
  slot: "midnight",
  animeType: "shonen",
  genres: ["romance", "slice"],
  audience: "teens",
  protag: "hana",
  protagName: "Hana",
  secondary: "s_ice",
  pet: "p_mochi",
  villain: "v_lovelace",
  arcs: ["festival", "confession"],
  sliders: [50, 50, 50],
  season: 1,
});
const worker = (id = "writer"): Staff => ({
  id,
  name: "Creator",
  role: "writer",
  story: 80,
  art: 50,
  sound: 40,
  level: 1,
  stamina: 100,
  salary: 500,
  cost: 5000,
  portrait: 0,
  joinedWeek: 0,
  morale: 60,
  shows: [
    { title: "One", score: 24, week: 1 },
    { title: "Two", score: 25, week: 2 },
  ],
});
const result = (): ShowResult => ({
  reviews: [],
  total: 28,
  tier: "hit",
  hallOfFame: false,
  points: { story: 80, art: 60, sound: 30 },
  issues: 0,
  revenue: 50000,
  fans: 500,
  costs: 10000,
  rd: 0,
  sales: [1],
  commercial: { id: "niche", label: "NICHE FOLLOWING", index: 1 },
  breakdown: [],
  comboLevel: 1,
  newCombo: false,
  chemMult: 1,
  chemDiscovered: [],
  secretDiscovered: false,
  quality: 28,
  arcCombosDiscovered: [],
});
function studio(): RunState {
  const p = {
    ...makeProject(draft(), 0, 0),
    id: "project",
    staffIds: ["writer"],
    distributionOwner: "player",
    spent: 10000,
  };
  const r = {
    ...initialRun("Culture", "producer"),
    week: 0,
    day: 0,
    cash: 1000000,
    capitalProjects: ["overseas_tier_4"],
    staff: [worker()],
    projects: [p],
    genresUnlocked: ["romance", "slice"] as Draft["genres"],
    expansion: initialExpansion(),
    overseas: initialOverseas(),
  };
  return snapshotProduction(r, p);
}
function released(): RunState {
  const r = studio(),
    p = { ...r.projects[0], stage: "done" as const, result: result() };
  return finishExpansionProduction({ ...r, projects: [p] }, p);
}
const request = (
  r: RunState,
  extra: Partial<OverseasRequest> = {},
): OverseasRequest => ({
  projectId: r.projects[0].id,
  territory: "aurora",
  distributor: "specialist",
  segment: "characters",
  audience: "teens",
  edition: "subtitles",
  campaign: 0,
  ...extra,
});
function leadRun(): RunState {
  const r = promiseLeadership(studio(), "writer", "romance")!;
  return appointCreativeLead(r, "project", expansionOf(r).promises[0].id)!;
}
function credit(
  r: RunState,
  participation = 6,
  profit: 0 | 5 | 10 = 0,
): RunState {
  const x = expansionOf(r),
    c = x.credits.project;
  return {
    ...r,
    expansion: {
      ...x,
      credits: {
        project: {
          ...c,
          days: 10,
          byStaff: { writer: participation },
          byRole: { writer: 10 },
          roleStaff: { writer: participation },
          policy: { ...c.policy, profit },
        },
      },
    },
  };
}
describe("staff ambitions and working agreements", () => {
  it("migrates old saves neutrally and preserves new state on repeated loads", () => {
    const r = studio(),
      next = migrateRun({
        ...r,
        week: 20,
        day: 140,
        expansion: undefined,
        overseas: undefined,
      });
    expect(next.cash).toBe(r.cash);
    expect(expansionOf(next).policies.profit).toBe(0);
    expect(expansionOf(next).credits).toEqual({});
    expect(overseasOf(next).releases).toEqual([]);
    expect(migrateRun(next).expansion).toEqual(next.expansion);
  });
  it("applies policies at the boundary and preserves existing project terms", () => {
    let r = schedulePolicies(studio(), {
      recovery: 14,
      profit: 10,
      development: 4,
    })!;
    expect(
      schedulePolicies(r, { recovery: 0, profit: 0, development: 0 }),
    ).toBeNull();
    r = advanceExpansionDay({ ...r, day: 27 });
    expect(expansionOf(r).policies.profit).toBe(0);
    r = advanceExpansionDay({ ...r, day: 28 });
    expect(expansionOf(r).policies.profit).toBe(10);
    expect(expansionOf(r).credits.project.policy.profit).toBe(0);
    expect(advanceExpansionDay(r)).toBe(r);
  });
  it("counts participation once per day and excludes unavailable employees", () => {
    let r = advanceExpansionDay(studio());
    expect(expansionOf(r).credits.project.roleStaff.writer).toBe(1);
    r = advanceExpansionDay(r);
    expect(expansionOf(r).credits.project.roleStaff.writer).toBe(1);
    r = advanceExpansionDay({
      ...r,
      day: 1,
      expansion: { ...expansionOf(r), leave: { writer: 10 } },
    });
    expect(expansionOf(r).credits.project.byRole.writer).toBe(2);
    expect(expansionOf(r).credits.project.roleStaff.writer).toBe(1);
  });
  it("does not earn department participation while waiting at a milestone", () => {
    const r = studio();
    r.projects[0] = { ...r.projects[0], milestone: "story" };
    expect(expansionOf(advanceExpansionDay(r)).credits.project.days).toBe(0);
  });
  it("requires named leadership and at least 60% participation", () => {
    const r = credit(leadRun()),
      next = finishExpansionProduction(r, r.projects[0]);
    expect(expansionOf(next).promises[0].status).toBe("fulfilled");
    expect(
      expansionOf(
        finishExpansionProduction(credit(leadRun(), 5), r.projects[0]),
      ).promises[0].status,
    ).toBe("active");
    expect(finishExpansionProduction(next, next.projects[0]).staff).toEqual(
      next.staff,
    );
  });
  it("allows a late lead appointment once the creator has earned at least 60% department participation", () => {
    let r = promiseLeadership(studio(), "writer", "romance")!;
    r = credit(r, 6);
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "post" as const })) };
    const next = appointCreativeLead(r, "project", expansionOf(r).promises[0].id);
    expect(next).not.toBeNull();
    expect(expansionOf(next!).credits.project.leads.writer).toBe("writer");
  });
  it("still rejects a late lead appointment below 60% participation", () => {
    let r = promiseLeadership(studio(), "writer", "romance")!;
    r = credit(r, 5);
    r = { ...r, projects: r.projects.map((p) => ({ ...p, stage: "post" as const })) };
    expect(appointCreativeLead(r, "project", expansionOf(r).promises[0].id)).toBeNull();
  });
  it("offers one extension and fails only after the deadline", () => {
    let r = leadRun();
    const id = expansionOf(r).promises[0].id;
    r = renegotiatePromise(r, id)!;
    expect(renegotiatePromise(r, id)).toBeNull();
    const day = expansionOf(r).promises[0].deadlineDay;
    expect(
      expansionOf(advanceExpansionDay({ ...r, day })).promises[0].status,
    ).toBe("active");
    const failed = advanceExpansionDay({ ...r, day: day + 1 });
    expect(expansionOf(failed).promises[0].status).toBe("broken");
    expect(advanceExpansionDay(failed)).toBe(failed);
  });
  it("voids retirement by stable employee identity rather than name", () => {
    let r = leadRun();
    r = { ...r, staff: [], legends: [toLegend(r.staff[0], 1)], day: 7 };
    expect(expansionOf(advanceExpansionDay(r)).promises[0].status).toBe("void");
    r = { ...r, legends: [{ ...r.legends[0], staffId: "someone-else" }] };
    expect(expansionOf(advanceExpansionDay(r)).promises[0].status).toBe(
      "broken",
    );
  });
  it("grants recovery once and makes recall explicit", () => {
    let r = credit(studio()),
      x = expansionOf(r);
    r = {
      ...r,
      projects: r.projects.map((p) => ({ ...p, stage: "ready" })),
      expansion: {
        ...x,
        credits: {
          project: {
            ...x.credits.project,
            policy: { recovery: 7, profit: 0, development: 0 },
          },
        },
      },
    };
    r = advanceExpansionDay(r);
    expect(expansionBusyReason(r, "writer")).toContain("Protected recovery");
    const until = expansionOf(r).leave.writer;
    r = advanceExpansionDay({ ...r, day: 1 });
    expect(expansionOf(r).leave.writer).toBe(until);
    r = recallStaff(r, "writer")!;
    expect(expansionBusyReason(r, "writer")).toBeNull();
    expect(recallStaff(r, "writer")).toBeNull();
  });
  it("recovery excludes live production bubbles and restores energy", () => {
    let r = studio();
    r = {
      ...r,
      staff: r.staff.map((s) => ({ ...s, stamina: 40 })),
      expansion: { ...expansionOf(r), leave: { writer: 20 } },
    };
    expect(
      tickStudioWorkPulse(r).pulses.some((p) => p.actorId === "writer"),
    ).toBe(false);
    expect(tickStudioDay(r).run.staff[0].stamina).toBeGreaterThan(40);
  });
  it("offers eligible pitches deterministically without a reload reroll", () => {
    const r = advanceExpansionDay({ ...studio(), week: 24, day: 168 });
    expect(expansionOf(r).pitches).toHaveLength(1);
    expect(advanceExpansionDay(r)).toBe(r);
  });
  it("paid development reserves real time and snapshots its schedule", () => {
    let r = advanceExpansionDay({
      ...studio(),
      week: 24,
      day: 168,
      projects: [],
    });
    r = pitchAction(r, expansionOf(r).pitches[0].id, "develop")!;
    expect(expansionBusyReason(r, "writer")).toBe("Paid creative development");
    r = {
      ...r,
      expansion: {
        ...expansionOf(r),
        policies: { recovery: 0, profit: 0, development: 2 },
      },
    };
    expect(expansionBusyReason(r, "writer", 171)).toBe(
      "Paid creative development",
    );
    for (let day = 169; day <= 196; day++)
      r = advanceExpansionDay({ ...r, day });
    expect(expansionOf(r).pitches[0].status).toBe("developed");
    expect(expansionOf(r).pitches[0].report).toContain("story / art / sound");
  });
  it("settles cash-based profit once, including departed contributors", () => {
    let r = credit(studio(), 6, 10);
    r = finishExpansionProduction({ ...r, staff: [] }, r.projects[0]);
    const cash = r.cash;
    const receipt = {
      week: 1,
      amount: 20000,
      fans: 0,
      label: "Release",
      sourceProjectId: "project",
      instalment: 0,
    };
    r = settleProjectReceipt(r, receipt);
    expect(r.cash).toBe(cash - 1000);
    expect(expansionOf(r).accounts.project.entitlements.writer).toBe(1000);
    expect(settleProjectReceipt(r, receipt)).toBe(r);
    expect(settleProjectReceipt(migrateRun(r), receipt).cash).toBe(r.cash);
  });
  it("does not pay a bonus on a loss", () => {
    let r = credit(studio(), 6, 10);
    r = finishExpansionProduction(r, r.projects[0]);
    r = settleProjectReceipt(r, {
      week: 1,
      amount: 5000,
      fans: 0,
      label: "Loss",
      sourceProjectId: "project",
      instalment: 0,
    });
    expect(expansionOf(r).accounts.project.paid).toBe(0);
  });
  it("tags domestic payouts and charges staff pool on completed-show sales", () => {
    let r = credit(studio(), 6, 10);
    r = {
      ...r,
      projects: r.projects.map((p) => ({
        ...p,
        stage: "ready",
        points: { story: 300, art: 300, sound: 300 },
      })),
    };
    const domestic = releaseProject(r, "project", {
      spent: 1000,
      hype: 0,
    })!.run;
    expect(domestic.payouts.every((p) => p.sourceProjectId === "project")).toBe(
      true,
    );
    expect(expansionOf(domestic).accounts.project.cost).toBe(11000);
    const offer = showSaleOffers(r, "project")[0],
      sale = sellReadyProject(r, "project", offer.id)!.run;
    expect(sale.projects[0].distributionOwner).toBe(offer.buyerId);
    expect(expansionOf(sale).accounts.project.receipts).toBe(offer.cash);
    expect(sale.cash).toBe(
      r.cash + offer.cash - expansionOf(sale).accounts.project.paid,
    );
  });
});

describe("overseas editions, audiences and rights", () => {
  it("locks creative choices after production begins", () => {
    let r = studio();
    r = setContentProfile(r, "project", {
      violence: 2,
      horror: 1,
      sexual: 0,
      language: 1,
      complexity: 2,
      context: 1,
    })!;
    expect(overseasOf(r).profiles.project.violence).toBe(2);
    r = advanceExpansionDay(r);
    expect(
      setContentProfile(r, "project", defaultContent(r.projects[0])),
    ).toBeNull();
  });
  it("distinguishes interests and demographics without changing domestic reviews", () => {
    const r = released(),
      p = r.projects[0],
      before = JSON.stringify(p.result),
      profile = { ...defaultContent(p), complexity: 3, context: 3 };
    expect(
      regionalReception(p, profile, request(r, { segment: "experimental" }))
        .score,
    ).toBeGreaterThan(
      regionalReception(p, profile, request(r, { segment: "mainstream" }))
        .score,
    );
    expect(
      regionalReception(p, profile, request(r, { audience: "adults" })).score,
    ).toBeGreaterThan(
      regionalReception(p, profile, request(r, { audience: "kids" })).score,
    );
    expect(JSON.stringify(p.result)).toBe(before);
  });
  it("blocks unsuitable family releases and edits", () => {
    let r = released();
    r = {
      ...r,
      overseas: {
        ...overseasOf(r),
        profiles: { project: { ...defaultContent(r.projects[0]), horror: 3 } },
      },
    };
    expect(
      quoteOverseas(
        r,
        request(r, { distributor: "broadcast", audience: "family" }),
      ).block,
    ).toContain("intensity");
    expect(quoteOverseas(r, request(r, { edition: "edited" })).block).toContain(
      "substantial new work",
    );
  });
  it("requires negotiated consent for a promised production's edited cut", () => {
    let r = credit(leadRun());
    const p = { ...r.projects[0], stage: "done" as const, result: result() };
    r = finishExpansionProduction({ ...r, projects: [p] }, p);
    expect(quoteOverseas(r, request(r, { edition: "edited" })).block).toContain(
      "Creator approval",
    );
    r = approveCreatorEdit(r, "project")!;
    expect(
      quoteOverseas(r, request(r, { edition: "edited" })).block,
    ).toBeNull();
    expect(approveCreatorEdit(r, "project")).toBeNull();
  });
  it("rejects sold or undocumented ownership", () => {
    let r = released();
    const p = r.projects[0];
    expect(
      distributionBlock(r, { ...p, distributionOwner: "rival" }, 20),
    ).toContain("sold");
    expect(
      distributionBlock(r, { ...p, distributionOwner: undefined }, 20),
    ).toContain("Legacy");
    r = {
      ...r,
      projects: [{ ...p, distributionOwner: undefined }],
      yearShows: [],
    };
    expect(reviewLegacyRights(r, "project")).toBeNull();
  });
  it("freezes signed terms and reserves a finite audience", () => {
    let r = released();
    const q = request(r),
      forecast = quoteOverseas(r, q).release!,
      original = r.projects[0].result;
    r = signOverseas(r, q)!;
    expect(r.cash).toBe(1000000 - forecast.cost);
    expect(overseasOf(r).releases[0]).toEqual(forecast);
    expect(overseasOf(r).exposure[forecast.audienceKey]).toBe(forecast.viewers);
    expect(signOverseas(r, q)).toBeNull();
    expect(r.projects[0].result).toBe(original);
    expect(
      quoteOverseas(migrateRun(JSON.parse(JSON.stringify(r))), q).block,
    ).toContain("active");
  });
  it("reuses localisation across territories with the same language", () => {
    let r = signOverseas(released(), request(released()))!;
    const a = overseasOf(r).releases[0];
    r = { ...r, week: a.opensWeek, day: a.opensWeek * 7 };
    const q = quoteOverseas(r, request(r, { territory: "pelagic" }));
    expect(q.reused).toBe(true);
    expect(q.release!.cost).toBe(35_000);
  });
  it("does not refresh audience capacity by changing demographics", () => {
    let r = signOverseas(released(), request(released()))!;
    const a = overseasOf(r).releases[0];
    r = { ...r, week: 60, day: 420 };
    const next = quoteOverseas(r, request(r, { audience: "adults" })).release!;
    expect(next.audienceKey).toBe(a.audienceKey);
    expect(next.viewers).toBeLessThan(a.viewers);
  });
  it("schedules exact instalment totals once without another award entry", () => {
    let r = signOverseas(released(), request(released()))!;
    const a = overseasOf(r).releases[0];
    r = advanceOverseasWeek({ ...r, week: a.opensWeek });
    expect(r.payouts.reduce((sum, p) => sum + p.amount, 0)).toBe(a.receipts);
    expect(r.payouts.reduce((sum, p) => sum + p.fans, 0)).toBe(a.fans);
    expect(advanceOverseasWeek(r).payouts).toEqual(r.payouts);
    expect(r.showsMade).toBe(0);
    expect(r.yearShows).toHaveLength(0);
  });
  it("charges royalty once after distributor share and checks licence expiry", () => {
    let r = released();
    r = {
      ...r,
      projects: r.projects.map((p) => ({
        ...p,
        draft: { ...p.draft, licensedIpId: "licensed" },
      })),
      ipMarket: {
        ...r.ipMarket,
        owned: {
          ...r.ipMarket.owned,
          licensed: {
            internationalRights: true,
            expiresWeek: 100,
            royaltyRate: 0.2,
          } as RunState["ipMarket"]["owned"][string],
        },
      },
    };
    const a = quoteOverseas(r, request(r)).release!;
    expect(a.royalty).toBe(Math.round((a.gross - a.distributorCut) * 0.2));
    expect(a.receipts).toBe(a.gross - a.distributorCut - a.royalty);
    r = {
      ...r,
      ipMarket: {
        ...r.ipMarket,
        owned: {
          ...r.ipMarket.owned,
          licensed: { ...r.ipMarket.owned.licensed, expiresWeek: 5 },
        },
      },
    };
    expect(quoteOverseas(r, request(r)).block).toContain("expire");
  });
  it("settles receipts through the existing calendar and completes the contract", () => {
    let r = signOverseas(released(), request(released()))!;
    const a = overseasOf(r).releases[0];
    r = advanceWeeks(r, a.endsWeek);
    expect(overseasOf(r).releases[0].status).toBe("completed");
    expect(expansionOf(r).accounts.project.receipts).toBe(a.receipts);
    expect(r.payouts.filter((p) => p.sourceReleaseId === a.id)).toHaveLength(0);
    expect(r.showsMade).toBe(0);
  });

  it("recruitment pools always cover writer, animator and composer without duplicate looks", () => {
    const pool = rollHirePool(12, 3, () => 0.42);
    expect(pool.map((s) => s.role)).toEqual(["writer", "animator", "composer"]);
    expect(new Set(pool.map((s) => s.look)).size).toBe(3);
  });
});
