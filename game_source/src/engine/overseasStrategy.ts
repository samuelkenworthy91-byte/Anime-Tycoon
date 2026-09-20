import type { RunState } from "./state";
import {
  TERRITORIES,
  SEGMENTS,
  DISTRIBUTORS,
  EDITIONS,
  overseasOf,
  quoteOverseas,
  signOverseas,
  type OverseasRequest,
  type RegionalRelease,
  type TerritoryId,
  type SegmentId,
} from "./overseas";
import { expansionOf } from "./studioExpansion";
export interface RegionalStudy {
  key: string;
  week: number;
  expiresWeek: number;
  tier: number;
  bias: number;
}
export interface Negotiation {
  key: string;
  expiresWeek: number;
  shareReduction: number;
  reachBonus: number;
  cost: number;
}
export interface CatalogueCase {
  projectId: string;
  openedWeek: number;
  dueWeek: number;
  status: "searching" | "cleared" | "unresolved";
  evidence: string[];
}
export interface OverseasStrategy {
  version: 1;
  studies: Record<string, RegionalStudy>;
  relationships: Record<string, number>;
  negotiations: Record<string, Negotiation>;
  sponsorships: string[];
  settledReleases: string[];
  catalogueCases: CatalogueCase[];
  history: { id: string; week: number; text: string }[];
}
export const initialStrategy = (): OverseasStrategy => ({
  version: 1,
  studies: {},
  relationships: {},
  negotiations: {},
  sponsorships: [],
  settledReleases: [],
  catalogueCases: [],
  history: [],
});
export const strategyOf = (r: RunState): OverseasStrategy => ({
  ...initialStrategy(),
  ...r.overseas?.strategy,
});
export function migrateStrategy(
  raw: OverseasStrategy | undefined,
): OverseasStrategy {
  const x = { ...initialStrategy(), ...raw };
  return {
    ...x,
    studies: { ...(x.studies ?? {}) },
    relationships: { ...(x.relationships ?? {}) },
    negotiations: { ...(x.negotiations ?? {}) },
    sponsorships: Array.isArray(x.sponsorships) ? x.sponsorships : [],
    settledReleases: Array.isArray(x.settledReleases) ? x.settledReleases : [],
    catalogueCases: Array.isArray(x.catalogueCases) ? x.catalogueCases : [],
    history: Array.isArray(x.history) ? x.history : [],
  };
}
function write(r: RunState, x: OverseasStrategy): RunState {
  return { ...r, overseas: { ...overseasOf(r), strategy: x } };
}
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
export const regionalKey = (territory: string, distributor: string) =>
  territory + ":" + distributor;
export const studyKey = (
  q: Pick<OverseasRequest, "territory" | "segment">,
  week: number,
) => q.territory + ":" + q.segment + ":" + Math.floor(week / 12);
export const negotiationKey = (q: OverseasRequest) =>
  q.projectId + ":" + regionalKey(q.territory, q.distributor);
export const regionalBias = (q: OverseasRequest, week: number) =>
  (hash(studyKey(q, week)) % 11) - 5;
export function uncertainReception(
  r: RunState,
  q: OverseasRequest,
  model: number,
): number {
  return clamp(
    model +
      regionalBias(q, r.week) +
      ((hash(q.projectId + ":" + q.territory) % 7) - 3),
    5,
    95,
  );
}
export function regionalEvents(week: number) {
  const period = Math.floor(week / 12);
  return TERRITORIES.map((t) => {
    const kind = hash(t.id + ":" + period) % 3,
      segment =
        SEGMENTS[hash(t.id + ":segment:" + period) % SEGMENTS.length].id;
    return {
      id: t.id + ":" + period,
      territory: t.id,
      segment,
      startsWeek: period * 12,
      endsWeek: (period + 1) * 12,
      title:
        kind === 0
          ? "Regional animation festival"
          : kind === 1
            ? "Distributor programming season"
            : "Growing audience conversation",
      effect: kind === 0 ? 0.15 : kind === 1 ? 0.1 : 0.08,
    };
  });
}
export function rivalRegionalWindows(r: RunState) {
  return r.rivalWorld.studios.flatMap((st) =>
    st.releases
      .filter((p) => p.week <= r.week && p.week + 16 > r.week)
      .map((p) => {
        const id = st.id + ":" + p.week + ":" + p.title,
          t = TERRITORIES[(hash(id) + st.tier) % TERRITORIES.length];
        const segment: SegmentId =
          p.score >= 30
            ? "animation"
            : p.genres.some((g) => t.genres.includes(g))
              ? "mainstream"
              : "characters";
        return {
          id,
          studio: st.name,
          title: p.title,
          territory: t.id,
          segment,
          opensWeek: p.week + 2,
          endsWeek: p.week + 14,
          strength: clamp(st.tier * 0.025, 0.025, 0.125),
        };
      }),
  );
}
export function regionalMarketFactor(
  r: RunState,
  q: OverseasRequest,
  opensWeek: number,
): { mult: number; reasons: string[] } {
  const event = regionalEvents(r.week).find(
      (e) => e.territory === q.territory,
    )!,
    active = opensWeek < event.endsWeek && event.segment === q.segment;
  const rivals = rivalRegionalWindows(r).filter(
    (p) =>
      p.territory === q.territory &&
      p.segment === q.segment &&
      p.opensWeek <= opensWeek &&
      p.endsWeek > opensWeek,
  );
  const pressure = Math.min(
    0.35,
    rivals.reduce((s, p) => s + p.strength, 0),
  );
  const sponsored = active && strategyOf(r).sponsorships.includes(event.id);
  return {
    mult:
      (1 + (active ? event.effect : 0) + (sponsored ? 0.12 : 0)) *
      (1 - pressure),
    reasons: [
      ...(active ? [event.title + " supports this audience."] : []),
      ...(sponsored ? ["Your regional event sponsorship supports reach."] : []),
      ...(rivals.length
        ? [
            rivals.length +
              " rival overseas release(s) compete for this audience.",
          ]
        : []),
    ],
  };
}
export function distributorTerms(r: RunState, q: OverseasRequest) {
  const d = DISTRIBUTORS.find((d) => d.id === q.distributor)!,
    x = strategyOf(r),
    rep = x.relationships[regionalKey(q.territory, q.distributor)] ?? 50;
  const n = x.negotiations[negotiationKey(q)],
    active = n && n.expiresWeek > r.week ? n : null;
  return {
    share: clamp(
      d.share - Math.max(0, rep - 50) / 1000 - (active?.shareReduction ?? 0),
      0.12,
      0.5,
    ),
    reach: Math.min(0.95, d.reach + (active?.reachBonus ?? 0)),
    reputation: rep,
  };
}
export function researchRegionalAudience(
  r: RunState,
  q: OverseasRequest,
): RunState | null {
  const tier = r.facilities.data ?? 0,
    key = studyKey(q, r.week),
    x = strategyOf(r),
    cost = Math.max(3, 8 - tier);
  if (
    !tier ||
    !TERRITORIES.some((t) => t.id === q.territory) ||
    !SEGMENTS.some((s) => s.id === q.segment) ||
    r.rd < cost ||
    x.studies[key]
  )
    return null;
  const study = {
    key,
    week: r.week,
    expiresWeek: (Math.floor(r.week / 12) + 1) * 12,
    tier,
    bias: regionalBias(q, r.week),
  };
  return {
    ...write(r, { ...x, studies: { ...x.studies, [key]: study } }),
    rd: r.rd - cost,
  };
}
export function negotiateDistribution(
  r: RunState,
  q: OverseasRequest,
  focus: "share" | "reach",
): RunState | null {
  const tier = r.facilities.legal ?? 0,
    key = negotiationKey(q),
    x = strategyOf(r),
    cost = Math.max(2000, 6000 - tier * 1000);
  if (
    !tier ||
    r.cash < cost ||
    !r.projects.some((p) => p.id === q.projectId && p.result) ||
    !TERRITORIES.some((t) => t.id === q.territory) ||
    !DISTRIBUTORS.some((d) => d.id === q.distributor) ||
    !["share", "reach"].includes(focus) ||
    (x.negotiations[key]?.expiresWeek ?? 0) > r.week
  )
    return null;
  const n = {
    key,
    expiresWeek: r.week + 12,
    shareReduction: focus === "share" ? 0.02 + tier * 0.01 : 0,
    reachBonus: focus === "reach" ? 0.04 + tier * 0.02 : 0,
    cost,
  };
  const account = expansionOf(r).accounts[q.projectId];
  return {
    ...write(r, { ...x, negotiations: { ...x.negotiations, [key]: n } }),
    cash: r.cash - cost,
    expansion: {
      ...expansionOf(r),
      accounts: account
        ? {
            ...expansionOf(r).accounts,
            [q.projectId]: { ...account, cost: account.cost + cost },
          }
        : expansionOf(r).accounts,
    },
    strategicSpend: [
      ...r.strategicSpend,
      {
        id: "negotiation:" + key + ":" + r.week,
        label: "Overseas deal negotiation",
        amount: cost,
        week: r.week,
        projectId: q.projectId,
      },
    ],
  };
}
export function sponsorRegionalEvent(
  r: RunState,
  territory: TerritoryId,
): RunState | null {
  const e = regionalEvents(r.week).find((e) => e.territory === territory),
    x = strategyOf(r);
  if (!e || x.sponsorships.includes(e.id) || r.cash < 12000) return null;
  return {
    ...write(r, { ...x, sponsorships: [...x.sponsorships, e.id] }),
    cash: r.cash - 12000,
    strategicSpend: [
      ...r.strategicSpend,
      {
        id: "regional-event:" + e.id,
        label: e.title,
        amount: 12000,
        week: r.week,
      },
    ],
  };
}
/** UI receives ranges; committed outcome remains hidden until the local release opens. */
export function regionalForecast(r: RunState, a: RegionalRelease) {
  const x = strategyOf(r),
    study = x.studies[studyKey(a, r.week)],
    researched = !!study && study.expiresWeek > r.week;
  const center =
      (a.modelReception ?? a.reception) + (researched ? study.bias : 0),
    radius = researched ? 3 : 8;
  const low = clamp(center - radius, 5, 95),
    high = clamp(center + radius, 5, 95);
  const committedReceipts = a.receipts + a.catalogueReceipts;
  const receiptAt = (score: number) =>
    (committedReceipts * (0.2 + score / 125)) / (0.2 + a.reception / 125);
  return {
    reception: [low, high],
    receipts: [
      Math.max(0, Math.floor(receiptAt(low) / 1000) * 1000),
      Math.ceil(receiptAt(high) / 1000) * 1000,
    ],
    researched,
    confidence: researched
      ? "Researched range; release response remains uncertain"
      : "Broad estimate; Data Lab research can narrow it",
  };
}
export function catalogueEvidence(r: RunState, id: string): string[] {
  const proof: string[] = [];
  if (r.yearShows.some((n) => n.sourceId === id && n.player))
    proof.push("Retained player release entry");
  if (
    r.awardsCeremony?.categories.some((c) =>
      c.nominees.some((n) => n.sourceId === id && n.player),
    )
  )
    proof.push("Archived award nominee with exact production ID");
  if (r.payouts.some((p) => p.sourceProjectId === id && !p.sourceReleaseId))
    proof.push("Identified domestic distribution receipts");
  return proof;
}
export function openCatalogueCase(r: RunState, id: string): RunState | null {
  const p = r.projects.find((p) => p.id === id),
    x = strategyOf(r),
    cost = 5000;
  if (
    !p?.result ||
    p.distributionOwner ||
    p.commission ||
    p.draft.licensedIpId ||
    !r.facilities.legal ||
    r.cash < cost ||
    x.catalogueCases.some((c) => c.projectId === id)
  )
    return null;
  return {
    ...write(r, {
      ...x,
      catalogueCases: [
        ...x.catalogueCases,
        {
          projectId: id,
          openedWeek: r.week,
          dueWeek: r.week + 2,
          status: "searching",
          evidence: catalogueEvidence(r, id),
        },
      ],
    }),
    cash: r.cash - cost,
    strategicSpend: [
      ...r.strategicSpend,
      {
        id: "catalogue-case:" + id,
        label: "Historical distribution rights search",
        amount: cost,
        week: r.week,
        projectId: id,
      },
    ],
  };
}
export function advanceOverseasStrategy(r: RunState): RunState {
  let x = strategyOf(r),
    o = overseasOf(r),
    history = x.history,
    relationships = { ...x.relationships },
    settled = [...x.settledReleases],
    reviews = { ...o.reviews };
  for (const a of o.releases)
    if (a.status === "completed" && !settled.includes(a.id)) {
      const key = regionalKey(a.territory, a.distributor),
        change = a.receipts + a.catalogueReceipts >= a.cost && a.reception >= 50 ? 6 : -4;
      relationships[key] = clamp((relationships[key] ?? 50) + change, 0, 100);
      settled.push(a.id);
      history = [
        ...history,
        {
          id: a.id,
          week: r.week,
          text:
            a.territory +
            " / " +
            a.distributor +
            ": completed contract, relationship " +
            (change > 0 ? "+" : "") +
            change,
        },
      ].slice(-120);
    }
  const cases = x.catalogueCases.map((c) => {
    if (c.status !== "searching" || r.week < c.dueWeek) return c;
    const p = r.projects.find((p) => p.id === c.projectId),
      evidence = [
        ...new Set([...c.evidence, ...catalogueEvidence(r, c.projectId)]),
      ];
    const retained =
      !!p &&
      !p.commission &&
      !p.draft.licensedIpId &&
      !p.distributionOwner &&
      !r.franchises[p.draft.franchiseKey ?? p.draft.title]?.soldTo &&
      evidence.length > 0;
    if (retained) reviews[c.projectId] = true;
    return {
      ...c,
      evidence,
      status: retained ? ("cleared" as const) : ("unresolved" as const),
    };
  });
  x = {
    ...x,
    relationships,
    settledReleases: settled,
    history,
    catalogueCases: cases,
  };
  return { ...r, overseas: { ...o, reviews, strategy: x } };
}
export function regionalPackage(
  r: RunState,
  requests: OverseasRequest[],
): { block: string | null; cost: number; run: RunState | null } {
  const fail = (block: string) => ({ block, cost: 0, run: null });
  if (!r.facilities.legal)
    return fail("A Legal Desk is required for a territorial package");
  if (
    requests.length < 2 ||
    requests.length > 3 ||
    new Set(requests.map((q) => q.territory)).size !== requests.length ||
    new Set(requests.map((q) => q.projectId)).size !== 1
  )
    return fail("Choose two or three different territories for one production");
  const quotes = requests.map((q) =>
    quoteOverseas({ ...r, cash: Number.MAX_SAFE_INTEGER }, q),
  );
  const blocked = quotes.find((q) => q.block || !q.release);
  if (blocked) return fail(blocked.block ?? "Unavailable contract");
  const editions = new Set<string>();
  const discounts = quotes.map((q) => {
    const a = q.release!,
      d = DISTRIBUTORS.find((d) => d.id === a.distributor)!,
      e = EDITIONS.find((e) => e.id === a.edition)!;
    const discount =
      Math.round(d.fee * 0.1) +
      (editions.has(a.editionKey) && !q.reused ? e.cost : 0);
    editions.add(a.editionKey);
    return discount;
  });
  const cost = quotes.reduce(
    (sum, q, i) => sum + q.release!.cost - discounts[i],
    0,
  );
  if (r.cash < cost)
    return { block: "Insufficient cash for the full package", cost, run: null };
  let next = { ...r, cash: r.cash + discounts.reduce((a, b) => a + b, 0) };
  const packageId = "package:" + requests[0].projectId + ":" + r.week;
  for (let i = 0; i < requests.length; i++) {
    const signed = signOverseas(next, requests[i]);
    if (!signed) return fail("A package contract became unavailable");
    const release = overseasOf(signed).releases.slice(-1)[0],
      x = expansionOf(signed),
      account = x.accounts[release.projectId];
    next = {
      ...signed,
      overseas: {
        ...overseasOf(signed),
        releases: overseasOf(signed).releases.map((a) =>
          a.id === release.id
            ? { ...a, cost: a.cost - discounts[i], packageId }
            : a,
        ),
      },
      expansion: {
        ...x,
        accounts: account
          ? {
              ...x.accounts,
              [release.projectId]: {
                ...account,
                cost: account.cost - discounts[i],
              },
            }
          : x.accounts,
      },
      strategicSpend: signed.strategicSpend.map((s) =>
        s.id === release.id ? { ...s, amount: s.amount - discounts[i] } : s,
      ),
    };
  }
  return { block: null, cost, run: next };
}
