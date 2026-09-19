import { describe, it, expect, vi, afterEach } from "vitest";
import {
  initialRun,
  releaseProject,
  advanceWeeks,
  migrateRun,
  type RunState,
} from "../state";
import { makeProject } from "../projects";
import type { Draft } from "../data";
import { snapshotProduction, expansionOf } from "../studioExpansion";
import {
  quoteOverseas,
  signOverseas,
  DISTRIBUTORS,
  overseasOf,
  type OverseasRequest,
} from "../overseas";
import {
  initialStrategy,
  strategyOf,
  researchRegionalAudience,
  regionalForecast,
  negotiateDistribution,
  distributorTerms,
  regionalPackage,
  regionalEvents,
  sponsorRegionalEvent,
  regionalMarketFactor,
  advanceOverseasStrategy,
  openCatalogueCase,
  rivalRegionalWindows,
} from "../overseasStrategy";
const draft: Draft = {
  title: "Regional Test",
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
};
function run(): RunState {
  let r = initialRun("Overseas", "producer");
  const p = {
    ...makeProject(draft, 0, 0),
    id: "project",
    stage: "ready" as const,
    distributionOwner: "player",
    points: { story: 250, art: 200, sound: 150 },
  };
  r = snapshotProduction(
    {
      ...r,
      cash: 1000000,
      rd: 100,
      capitalProjects: ["overseas_tier_4"],
      facilities: { legal: 1, data: 1 },
      projects: [p],
    },
    p,
  );
  return releaseProject(r, p.id, { spent: 0, hype: 0 })!.run;
}
const request = (
  r: RunState,
  territory: OverseasRequest["territory"] = "aurora",
): OverseasRequest => ({
  projectId: r.projects[0].id,
  territory,
  segment: "characters",
  audience: "adults",
  distributor: "specialist",
  edition: "subtitles",
  campaign: 0,
});
afterEach(() => vi.restoreAllMocks());
describe("overseas strategy", () => {
  it("loads old saves with neutral strategy defaults", () => {
    const r = run();
    expect(strategyOf(r)).toEqual(initialStrategy());
    expect(strategyOf(migrateRun(r)).relationships).toEqual({});
  });
  it("narrows forecasts through a paid, non-repeatable Data Lab study", () => {
    let r = run();
    const q = request(r),
      a = quoteOverseas(r, q).release!,
      broad = regionalForecast(r, a);
    r = researchRegionalAudience(r, q)!;
    const narrow = regionalForecast(r, a);
    expect(narrow.researched).toBe(true);
    expect(narrow.reception[1] - narrow.reception[0]).toBeLessThan(
      broad.reception[1] - broad.reception[0],
    );
    expect(a.reception).toBeGreaterThanOrEqual(narrow.reception[0]);
    expect(a.reception).toBeLessThanOrEqual(narrow.reception[1]);
    expect(researchRegionalAudience(r, q)).toBeNull();
    expect(r.rd).toBe(93);
  });
  it("preserves unknown release response through repeated forecasts and reloads", () => {
    const r = run(),
      q = request(r);
    expect(quoteOverseas(migrateRun(r), q).release).toEqual(
      quoteOverseas(r, q).release,
    );
  });
  it("offers distinct distributor models and meaningful catalogue-tail income", () => {
    const r = run();
    expect(DISTRIBUTORS.length).toBeGreaterThanOrEqual(4);
    const q = request(r);
    const base = quoteOverseas(r, q).release!;
    const streaming = quoteOverseas(r, { ...q, distributor: "streamer" }).release!;
    expect(base.catalogueReceipts).toBeGreaterThan(0);
    expect(streaming.catalogueReceipts).toBeGreaterThan(base.catalogueReceipts);
    expect(streaming.catalogueWeeks).toBeGreaterThanOrEqual(base.catalogueWeeks);
  });

  it("charges negotiations once and snapshots concessions when signing", () => {
    let r = run();
    const q = request(r),
      old = distributorTerms(r, q);
    r = negotiateDistribution(r, q, "share")!;
    expect(distributorTerms(r, q).share).toBeLessThan(old.share);
    expect(negotiateDistribution(r, q, "reach")).toBeNull();
    r = signOverseas(r, q)!;
    const a = overseasOf(r).releases[0];
    r = { ...r, week: 20 };
    expect(overseasOf(r).releases[0]).toEqual(a);
  });
  it("signs a package atomically and pays shared localisation only once", () => {
    const r = run(),
      qs = [request(r), request(r, "pelagic")],
      single = qs.reduce((s, q) => s + quoteOverseas(r, q).release!.cost, 0),
      pack = regionalPackage(r, qs);
    expect(pack.block).toBeNull();
    expect(pack.cost).toBe(single - 35_000 - 7_000);
    expect(pack.run!.cash).toBe(r.cash - pack.cost);
    expect(overseasOf(pack.run!).releases).toHaveLength(2);
    expect(
      new Set(overseasOf(pack.run!).releases.map((a) => a.packageId)).size,
    ).toBe(1);
    expect(overseasOf(r).releases).toHaveLength(0);
  });
  it("rejects an unaffordable or duplicate-territory package without partial signing", () => {
    const r = run(),
      q = request(r);
    expect(
      regionalPackage({ ...r, cash: 1 }, [q, request(r, "pelagic")]).run,
    ).toBeNull();
    expect(regionalPackage(r, [q, q]).run).toBeNull();
    expect(overseasOf(r).releases).toHaveLength(0);
  });
  it("regional sponsorship is bounded and does not alter already signed outcomes", () => {
    let r = run();
    const e = regionalEvents(r.week)[0],
      q = { ...request(r), segment: e.segment };
    const before = regionalMarketFactor(r, q, 2).mult;
    r = sponsorRegionalEvent(r, e.territory)!;
    expect(regionalMarketFactor(r, q, 2).mult).toBeGreaterThan(before);
    expect(sponsorRegionalEvent(r, e.territory)).toBeNull();
    expect(
      regionalMarketFactor({ ...r, week: 12 }, q, 14).reasons,
    ).not.toContain("Your regional event sponsorship supports reach.");
  });
  it("changes distributor relationships once after completion", () => {
    let r = run(),
      q = request(r);
    r = signOverseas(r, q)!;
    const a = overseasOf(r).releases[0];
    r = {
      ...r,
      overseas: { ...overseasOf(r), releases: [{ ...a, status: "completed" }] },
    };
    r = advanceOverseasStrategy(r);
    const rep = strategyOf(r).relationships;
    expect(Object.keys(rep)).toHaveLength(1);
    expect(strategyOf(advanceOverseasStrategy(r)).relationships).toEqual(rep);
  });
  it("searches old catalogue evidence without inventing ownership", () => {
    let r = run();
    r = {
      ...r,
      projects: r.projects.map((p) => ({ ...p, distributionOwner: undefined })),
    };
    r = openCatalogueCase(r, "project")!;
    expect(strategyOf(r).catalogueCases[0].status).toBe("searching");
    r = advanceOverseasStrategy({ ...r, week: r.week + 2 });
    expect(strategyOf(r).catalogueCases[0].status).toBe("cleared");
    let unknown = run();
    unknown = {
      ...unknown,
      yearShows: [],
      payouts: [],
      awardsCeremony: null,
      projects: unknown.projects.map((p) => ({
        ...p,
        distributionOwner: undefined,
      })),
    };
    unknown = openCatalogueCase(unknown, "project")!;
    unknown = advanceOverseasStrategy({ ...unknown, week: 2 });
    expect(strategyOf(unknown).catalogueCases[0].status).toBe("unresolved");
    expect(overseasOf(unknown).reviews.project).not.toBe(true);
  });
  it("derives competing overseas windows from actual rival releases", () => {
    let r = run();
    r = advanceWeeks(r, 12);
    const windows = rivalRegionalWindows(r);
    for (const w of windows)
      expect(
        r.rivalWorld.studios.some(
          (s) =>
            s.name === w.studio && s.releases.some((p) => p.title === w.title),
        ),
      ).toBe(true);
  });
  it("survives a long career and a mid-release reload without duplicate regional receipts", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    let r = run();
    r = signOverseas(r, request(r))!;
    const a = overseasOf(r).releases[0];
    r = advanceWeeks(r, 4);
    r = migrateRun(JSON.parse(JSON.stringify(r)));
    r = advanceWeeks(r, 100);
    expect(overseasOf(r).releases[0].status).toBe("completed");
    expect(
      strategyOf(r).settledReleases.filter((id) => id === a.id),
    ).toHaveLength(1);
    expect(expansionOf(r).accounts.project.receipts).toBeGreaterThanOrEqual(
      a.receipts + a.catalogueReceipts,
    );
    expect(r.payouts.some((p) => p.sourceReleaseId === a.id)).toBe(false);
  });
});
