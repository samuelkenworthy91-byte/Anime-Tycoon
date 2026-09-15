import { useState } from "react";
import type { RunState } from "../engine/state";
import { formatGBP } from "../engine/data";
import {
  TERRITORIES,
  SEGMENTS,
  type OverseasRequest,
  type TerritoryId,
} from "../engine/overseas";
import {
  strategyOf,
  studyKey,
  negotiationKey,
  researchRegionalAudience,
  negotiateDistribution,
  distributorTerms,
  regionalEvents,
  sponsorRegionalEvent,
  rivalRegionalWindows,
  regionalPackage,
  openCatalogueCase,
} from "../engine/overseasStrategy";
type Props = {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  request: OverseasRequest;
};
const button =
  "min-h-11 rounded-lg border border-line px-3 py-2 text-xs font-bold disabled:opacity-40";
export default function OverseasStrategyPanel({
  run,
  setRun,
  request: q,
}: Props) {
  const [selected, setSelected] = useState<TerritoryId[]>([]),
    x = strategyOf(run),
    study = x.studies[studyKey(q, run.week)],
    n = x.negotiations[negotiationKey(q)],
    terms = distributorTerms(run, q),
    p = run.projects.find((p) => p.id === q.projectId);
  const requests = selected.map((territory) => ({ ...q, territory })),
    pack = selected.length >= 2 ? regionalPackage(run, requests) : null;
  const act = (fn: (r: RunState) => RunState | null) =>
    setRun(
      (r) =>
        fn(r) ?? {
          ...r,
          notices: [
            ...r.notices,
            "Regional action unavailable. Check the displayed requirements and cash.",
          ].slice(-40),
        },
    );
  const cases = x.catalogueCases.filter((c) => c.projectId === q.projectId);
  return (
    <div className="space-y-3">
      <details className="ink-card p-3">
        <summary className="font-bold">
          Research &amp; distributor negotiations
        </summary>
        <p className="my-2 text-xs">
          Data Lab studies last for the current 12-week market season. Release
          response remains uncertain even after research.
        </p>
        <button
          className={button}
          disabled={
            !run.facilities.data ||
            !!study ||
            run.rd < Math.max(3, 8 - (run.facilities.data ?? 0))
          }
          onClick={() => act((r) => researchRegionalAudience(r, q))}
        >
          STUDY THIS AUDIENCE · {Math.max(3, 8 - (run.facilities.data ?? 0))} RD
        </button>
        <p className="text-xs">
          {study
            ? "Study valid until week " + study.expiresWeek
            : run.facilities.data
              ? "No current regional study"
              : "Requires Audience Data Lab"}
        </p>
        <p className="my-2 text-xs">
          Distributor relationship: {terms.reputation}/100. Current share:{" "}
          {Math.round(terms.share * 100)}%. Completed profitable, well-received
          releases improve future terms; weaker results reduce trust.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["share", "reach"] as const).map((f) => (
            <button
              className={button}
              key={f}
              disabled={
                !run.facilities.legal ||
                !p?.result ||
                (!!n && n.expiresWeek > run.week)
              }
              onClick={() => act((r) => negotiateDistribution(r, q, f))}
            >
              NEGOTIATE {f.toUpperCase()} ·{" "}
              {formatGBP(
                Math.max(2000, 6000 - (run.facilities.legal ?? 0) * 1000),
              )}
            </button>
          ))}
        </div>
        <p className="text-xs">
          {!run.facilities.legal
            ? "Requires Legal Desk"
            : n && n.expiresWeek > run.week
              ? "Negotiated terms held until week " + n.expiresWeek
              : "Choose lower revenue share or wider reach. One negotiation per production, territory and distributor every 12 weeks."}
        </p>
      </details>
      <details className="ink-card p-3">
        <summary className="font-bold">
          Regional events &amp; competing releases
        </summary>
        {regionalEvents(run.week).map((e) => (
          <div className="my-3 space-y-1 text-xs" key={e.id}>
            <b>
              {TERRITORIES.find((t) => t.id === e.territory)?.name}: {e.title}
            </b>
            <p>
              {SEGMENTS.find((s) => s.id === e.segment)?.name} · ends week{" "}
              {e.endsWeek}. A release must open during the event to benefit.
            </p>
            <button
              className={button}
              disabled={x.sponsorships.includes(e.id) || run.cash < 12000}
              onClick={() => act((r) => sponsorRegionalEvent(r, e.territory))}
            >
              {x.sponsorships.includes(e.id)
                ? "SPONSORED"
                : "SPONSOR EVENT · £12,000"}
            </button>
          </div>
        ))}
        {rivalRegionalWindows(run)
          .filter((w) => w.endsWeek > run.week)
          .slice(0, 12)
          .map((w) => (
            <p className="my-2 text-xs" key={w.id}>
              {w.studio}: {w.title} ·{" "}
              {TERRITORIES.find((t) => t.id === w.territory)?.name} ·{" "}
              {SEGMENTS.find((s) => s.id === w.segment)?.name} · weeks{" "}
              {w.opensWeek}–{w.endsWeek - 1}
            </p>
          ))}
      </details>
      <details className="ink-card p-3">
        <summary className="font-bold">Multi-territory release package</summary>
        <p className="my-2 text-xs">
          Use the selected production, distributor, edition, audience and
          campaign in each checked territory. Packages save 10% of distributor
          fees and share matching localisation work. Every territory's rights
          must clear together.
        </p>
        {TERRITORIES.map((t) => (
          <label className="flex min-h-11 items-center gap-2" key={t.id}>
            <input
              type="checkbox"
              checked={selected.includes(t.id)}
              onChange={(e) =>
                setSelected(
                  e.target.checked
                    ? [...selected, t.id]
                    : selected.filter((id) => id !== t.id),
                )
              }
            />
            {t.name}
          </label>
        ))}
        <p className="text-xs">
          {pack
            ? (pack.block ?? "Package upfront: " + formatGBP(pack.cost))
            : "Choose at least two territories. Legal Desk required."}
        </p>
        <button
          className={button}
          disabled={!pack || !!pack.block}
          onClick={() => act((r) => regionalPackage(r, requests).run)}
        >
          SIGN ENTIRE PACKAGE
        </button>
      </details>
      {p?.result && !p.distributionOwner && (
        <details className="ink-card p-3">
          <summary className="font-bold">Historical catalogue rights</summary>
          <p className="my-2 text-xs">
            The Legal Desk searches identified receipts and retained awards
            evidence over two weeks. Missing proof stays unresolved; this does
            not buy rights or assume ownership.
          </p>
          <button
            className={button}
            disabled={
              !run.facilities.legal ||
              cases.length > 0 ||
              p.commission != null ||
              !!p.draft.licensedIpId ||
              run.cash < 5000
            }
            onClick={() => act((r) => openCatalogueCase(r, p.id))}
          >
            OPEN RIGHTS SEARCH · £5,000
          </button>
          {cases.map((c) => (
            <p className="my-2 text-xs" key={c.projectId}>
              {c.status.toUpperCase()} · due week {c.dueWeek} ·{" "}
              {c.evidence.join("; ") || "No exact ownership evidence found."}
            </p>
          ))}
        </details>
      )}
      {x.history.length > 0 && (
        <details>
          <summary>Distributor history</summary>
          {x.history
            .slice()
            .reverse()
            .map((h) => (
              <p className="my-2 text-xs" key={h.id}>
                Week {h.week}: {h.text}
              </p>
            ))}
        </details>
      )}
    </div>
  );
}
