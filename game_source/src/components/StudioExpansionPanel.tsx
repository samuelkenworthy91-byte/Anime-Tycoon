import OverseasStrategyPanel from "./OverseasStrategyPanel";
import { regionalForecast } from "../engine/overseasStrategy";
import { StaffStoryInbox } from "./StaffCultureProfile";
import FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";
import { markTutorialSeen, tutorialSeen, type TutorialId } from "../engine/tutorials";
import { useEffect, useState } from "react";
import { assignToProject, type RunState } from "../engine/state";
import { GENRES, formatGBP, type GenreId } from "../engine/data";
import {
  expansionOf,
  promiseLeadership,
  renegotiatePromise,
  appointCreativeLead,
  pitchAction,
  recallStaff,
  approveCreatorEdit,
  gameDay,
} from "../engine/studioExpansion";
import {
  overseasOf,
  TERRITORIES,
  DISTRIBUTORS,
  EDITIONS,
  SEGMENTS,
  PROFILE_KEYS,
  defaultContent,
  setContentProfile,
  quoteOverseas,
  signOverseas,
  reviewLegacyRights,
  OVERSEAS_TIERS,
  overseasTierOf,
  buyOverseasInfrastructure,
  type OverseasRequest,
  type ContentProfile,
} from "../engine/overseas";

type Props = { run: RunState; setRun: (fn: (r: RunState) => RunState) => void };
const button =
  "min-h-11 rounded-lg border border-line px-3 py-2 text-xs font-bold disabled:opacity-40";
const field =
  "min-h-11 w-full rounded-lg border border-line bg-panel2 p-2 text-sm";
const genreName = (id: GenreId) => GENRES.find((g) => g.id === id)?.label ?? id;
function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span>{label}</span>
      <select
        className={field}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function useRunAction({ run, setRun }: Props) {
  const [message, setMessage] = useState("");
  const act = (fn: (r: RunState) => RunState | null, success = "Saved.") => {
    if (!fn(run)) {
      setMessage(
        "That action is unavailable. Check staff availability, existing agreements and cash.",
      );
      return;
    }
    setMessage(success);
    setRun((r) => fn(r) ?? r);
  };
  return { message, act };
}
export default function StudioExpansionPanel(props: Props) {
  const { run, setRun } = props;
  const [tab, setTab] = useState<"staff" | "overseas">("staff");
  const [tutorial, setTutorial] = useState<TutorialId | null>(null);
  const expansion = expansionOf(run);
  const hasCreatorCommitment = expansion.pitches.some((p) => !["declined", "accepted"].includes(p.status)) || expansion.promises.some((p) => p.status === "active");
  const tabTutorial: TutorialId = tab === "staff" ? "passion-projects" : "overseas-markets";
  useEffect(() => {
    if (tab === "staff" && !hasCreatorCommitment) return;
    if (!tutorial && !tutorialSeen(run, tabTutorial)) setTutorial(tabTutorial);
  }, [tab, tabTutorial, hasCreatorCommitment, run.tutorialsSeen, tutorial]);
  const dismissTutorial = () => { if (tutorial) setRun((r) => markTutorialSeen(r, tutorial)); setTutorial(null); };
  return (
    <div className="space-y-4 text-sm">
      <div className="flex items-start justify-between gap-2"><div
        className="flex flex-1 flex-wrap gap-2"
        aria-label="Studio expansion sections"
      >
        {(["staff", "overseas"] as const).map((t) => (
          <button
            key={t}
            className={button + (t === tab ? " text-gold" : "")}
            aria-pressed={t === tab}
            onClick={() => setTab(t)}
          >
            {t === "staff" ? "AMBITIONS" : "OVERSEAS MARKETS"}
          </button>
        ))}
      </div><TutorialHelpButton onClick={() => setTutorial(tabTutorial)} /></div>
      {tab === "staff" ? <StaffAmbitions {...props} /> : <OverseasPanel {...props} />}
      <FirstSeenTutorial id={tutorial ?? tabTutorial} open={tutorial !== null} onDismiss={dismissTutorial} />
    </div>
  );
}
function StaffAmbitions(props: Props) {
  const { run } = props,
    x = expansionOf(run),
    { message, act } = useRunAction(props);
  const [staffId, setStaff] = useState(run.staff[0]?.id ?? ""),
    [genre, setGenre] = useState<GenreId>(run.genresUnlocked[0]);
  return (
    <div className="space-y-4">
      <p>
        Commit to a creator's next step. The quickest route is now the Project Board:
        name them before their department starts, or later once they have personally earned
        at least 60% of that department's recorded production days. Then release within the deadline.
      </p>
      <StaffStoryInbox {...props} />
      <div className="ink-card space-y-2 p-3">
        <b>Agree a leadership opportunity</b>
        <Select
          label="Employee"
          value={staffId}
          onChange={setStaff}
          options={run.staff.map((s) => ({
            value: s.id,
            label: s.name + " · " + s.role,
          }))}
        />
        <Select
          label="Genre"
          value={genre}
          onChange={(v) => setGenre(v as GenreId)}
          options={run.genresUnlocked.map((g) => ({
            value: g,
            label: genreName(g),
          }))}
        />
        <button
          className={button}
          disabled={!staffId}
          onClick={() => act((r) => promiseLeadership(r, staffId, genre))}
        >
          PROMISE RELEASE WITHIN 48 WEEKS
        </button>
      </div>
      <p role="status" className="text-gold">
        {message}
      </p>
      {x.pitches
        .filter((p) => !["declined", "accepted"].includes(p.status))
        .map((p) => (
          <div className="ink-card space-y-2 p-3" key={p.id}>
            <b>
              {run.staff.find((s) => s.id === p.staffId)?.name ??
                "Former employee"}
              : original {genreName(p.genre)}
            </b>
            {p.vision && (
              <div className="rounded-lg border border-viol/40 bg-viol/10 p-2 text-xs">
                <b className="text-viol">“{p.vision.title}”</b>
                <p>{genreName(p.vision.primaryGenre)}{p.vision.secondaryGenre ? " + " + genreName(p.vision.secondaryGenre) : ""} · {p.vision.audience} audience</p>
                <p>Creator requests {p.vision.arcs.length} specific story beats and has preferred character designs for the four main cast roles.</p>
              </div>
            )}
            <p>
              {p.status === "developing"
                ? "Development: " + p.progress + "/28 paid working days"
                : (p.report ??
                  "A personal pitch. Funding a prototype reserves the creator's working time and reveals a single-genre direction report.")}
            </p>
            <div className="flex flex-wrap gap-2">
              {p.status === "offered" && (
                <button
                  className={button}
                  onClick={() => act((r) => pitchAction(r, p.id, "develop"))}
                >
                  FUND DEVELOPMENT · {formatGBP(p.cost)}
                </button>
              )}
              {p.status !== "developing" && (
                <>
                  <button
                    className={button}
                    onClick={() => act((r) => pitchAction(r, p.id, "accept"))}
                  >
                    ACCEPT LEADERSHIP BRIEF
                  </button>
                  <button
                    className={button}
                    onClick={() => act((r) => pitchAction(r, p.id, "decline"))}
                  >
                    DECLINE
                  </button>
                </>
              )}
              {p.status === "developing" && (
                <button
                  className={button}
                  onClick={() => act((r) => pitchAction(r, p.id, "cancel"))}
                >
                  CANCEL · NO REFUND
                </button>
              )}
            </div>
          </div>
        ))}
      {x.promises
        .slice()
        .reverse()
        .map((p) => {
          const c = p.projectId ? x.credits[p.projectId] : null,
            total = c?.byRole[p.role] ?? 0,
            days = c?.roleStaff[p.staffId] ?? 0;
          return (
            <div className="ink-card space-y-2 p-3" key={p.id}>
              <b>
                {run.staff.find((s) => s.id === p.staffId)?.name ??
                  "Former employee"}{" "}
                · {p.status.toUpperCase()}
              </b>
              <p>
                {genreName(p.genre)} · {p.role} lead · deadline day{" "}
                {p.deadlineDay} ({Math.max(0, p.deadlineDay - gameDay(run))}{" "}
                days remaining)
              </p>
              <p>
                {total
                  ? Math.round((days / total) * 100) +
                    "% participation (" +
                    days +
                    "/" +
                    total +
                    " days)"
                  : "No department participation recorded yet."}
              </p>
              {p.status === "active" && (
                <>
                  <Select
                    label="Assign to a newly greenlit original project"
                    value={p.projectId ?? ""}
                    options={[
                      { value: "", label: "Choose project" },
                      ...run.projects
                        .filter(
                          (pr) =>
                            pr.stage === "concept" &&
                            !pr.commission &&
                            !pr.draft.continuation &&
                            !pr.draft.licensedIpId &&
                            pr.draft.genres.includes(p.genre),
                        )
                        .map((pr) => ({ value: pr.id, label: pr.draft.title })),
                    ]}
                    onChange={(id) =>
                      act((r) =>
                        appointCreativeLead(
                          r.projects
                            .find((pr) => pr.id === id)
                            ?.staffIds.includes(p.staffId)
                            ? r
                            : assignToProject(r, id, p.staffId),
                          id,
                          p.id,
                        ),
                      )
                    }
                  />
                  <button
                    className={button}
                    disabled={p.extended}
                    onClick={() => act((r) => renegotiatePromise(r, p.id))}
                  >
                    AGREE 12-WEEK EXTENSION · −3 MORALE
                  </button>
                </>
              )}
              <details>
                <summary>Agreement history</summary>
                {p.history.map((h, i) => (
                  <p key={i}>{h}</p>
                ))}
              </details>
            </div>
          );
        })}
      <details>
        <summary>Studio stories and decisions</summary>
        {x.history
          .slice()
          .reverse()
          .map((h) => (
            <p className="my-2" key={h.id}>
              Day {h.day}: {h.text}
            </p>
          ))}
      </details>
    </div>
  );
}
function OverseasPanel(props: Props) {
  const { run } = props,
    o = overseasOf(run),
    { message, act } = useRunAction(props);
  const [q, setQ] = useState<OverseasRequest>({
    projectId:
      run.projects.find((p) => p.result)?.id ?? run.projects[0]?.id ?? "",
    territory: "aurora",
    distributor: "specialist",
    segment: "characters",
    audience: "teens",
    edition: "subtitles",
    campaign: 0,
  });
  const p = run.projects.find((p) => p.id === q.projectId),
    quote = quoteOverseas(run, q),
    a = quote.release,
    profile = p ? (o.profiles[p.id] ?? defaultContent(p)) : null;
  const forecast = a ? regionalForecast(run, a) : null;
  const locked =
    !!p &&
    (p.stage !== "concept" || (expansionOf(run).credits[p.id]?.days ?? 0) > 0);
  const editProfile = (key: keyof ContentProfile, value: number) => {
    if (p && profile)
      act((r) => setContentProfile(r, p.id, { ...profile, [key]: value }));
  };
  const infrastructureTier = overseasTierOf(run);
  const nextInfrastructure = OVERSEAS_TIERS[infrastructureTier] ?? null;
  const currentInfrastructure = infrastructureTier ? OVERSEAS_TIERS[infrastructureTier - 1] : null;
  return (
    <div className="space-y-3">
      <div className="ink-card space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          <b className="text-gold">INTERNATIONAL INFRASTRUCTURE</b>
          <span className="text-xs text-paper/55">Tier {infrastructureTier}/4</span>
        </div>
        <p className="text-xs text-paper/60">
          {currentInfrastructure
            ? `${currentInfrastructure.name} · £${currentInfrastructure.upkeep.toLocaleString("en-GB")}/week upkeep · up to ${currentInfrastructure.maxConcurrent} live campaign${currentInfrastructure.maxConcurrent === 1 ? "" : "s"}`
            : "Build an Export Desk to start selling completed productions overseas."}
        </p>
        {nextInfrastructure && (
          <button
            className={button}
            disabled={run.officeLevel < 1 || run.cash < nextInfrastructure.cost}
            onClick={() => act((r) => buyOverseasInfrastructure(r), `${nextInfrastructure.name} opened.`)}
          >
            INVEST {formatGBP(nextInfrastructure.cost)} · {nextInfrastructure.name.toUpperCase()}
          </button>
        )}
        {run.officeLevel < 1 && <p className="text-xs text-paper/45">Requires the Anime Runner Building (Studio 2).</p>}
      </div>
      <p>
        Three fictional territories contain different mixtures of viewers.
        Choose an edition and audience; overseas reception is separate from the
        original anime's critic score.
      </p>
      <Select
        label="Production"
        value={q.projectId}
        onChange={(v) => setQ({ ...q, projectId: v })}
        options={[
          { value: "", label: "Choose production" },
          ...run.projects.map((p) => ({
            value: p.id,
            label: p.draft.title + " · " + p.stage,
          })),
        ]}
      />
      {p && profile && (
        <details>
          <summary>
            Content profile · {locked ? "locked" : "choose at greenlight"}
          </summary>
          <p>
            0 absent/simple, 1 mild, 2 substantial, 3 intense/complex. Creative
            choices lock after the first production day and define future
            release suitability.
          </p>
          {PROFILE_KEYS.map((k) => (
            <Select
              key={k}
              label={k}
              value={profile[k]}
              disabled={locked}
              onChange={(v) => editProfile(k, Number(v))}
              options={[0, 1, 2, 3].map((n) => ({
                value: n,
                label: String(n),
              }))}
            />
          ))}
        </details>
      )}
      <Select
        label="Territory"
        value={q.territory}
        onChange={(v) =>
          setQ({ ...q, territory: v as OverseasRequest["territory"] })
        }
        options={TERRITORIES.map((t) => ({
          value: t.id,
          label: t.name + " · " + t.language,
        }))}
      />
      <Select
        label="Distributor"
        value={q.distributor}
        onChange={(v) =>
          setQ({ ...q, distributor: v as OverseasRequest["distributor"] })
        }
        options={DISTRIBUTORS.map((d) => ({
          value: d.id,
          label: d.name + " · " + Math.round(d.share * 100) + "% share · £" + d.perViewer + "/viewer",
        }))}
      />
      <Select
        label="Audience"
        value={q.audience}
        onChange={(v) =>
          setQ({ ...q, audience: v as OverseasRequest["audience"] })
        }
        options={["kids", "teens", "adults", "family"].map((v) => ({
          value: v,
          label: v,
        }))}
      />
      <Select
        label="Viewer interests"
        value={q.segment}
        onChange={(v) =>
          setQ({ ...q, segment: v as OverseasRequest["segment"] })
        }
        options={SEGMENTS.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Select
        label="Edition"
        value={q.edition}
        onChange={(v) =>
          setQ({ ...q, edition: v as OverseasRequest["edition"] })
        }
        options={EDITIONS.map((e) => ({
          value: e.id,
          label: e.name + " · " + formatGBP(e.cost),
        }))}
      />
      <Select
        label="Launch campaign"
        value={q.campaign}
        onChange={(v) =>
          setQ({ ...q, campaign: Number(v) as OverseasRequest["campaign"] })
        }
        options={[0, 75000, 250000].map((n) => ({
          value: n,
          label: formatGBP(n),
        }))}
      />
      {a && (
        <div className="ink-card space-y-1 p-3">
          <b>Contract forecast</b>
          <p>
            Upfront {formatGBP(a.cost)} ·{" "}
            {quote.reused
              ? "Existing localisation reused"
              : "New localisation required"}
          </p>
          <p>
            Release weeks {a.opensWeek}–{a.endsWeek - 1} · catalogue tail {a.catalogueWeeks} weeks
          </p>
          {forecast && (
            <>
              <p>
                Reception estimate {forecast.reception[0]}–
                {forecast.reception[1]}/100.
              </p>
              <p>
                Total studio receipt estimate {formatGBP(forecast.receipts[0])}–
                {formatGBP(forecast.receipts[1])}, including the declining catalogue tail after distributor share and royalties.
              </p>
              <p>
                Contribution before staff pool:{" "}
                {formatGBP(forecast.receipts[0] - a.cost)} to{" "}
                {formatGBP(forecast.receipts[1] - a.cost)}.
              </p>
              <p className="text-xs">{forecast.confidence}</p>
            </>
          )}
          {a.reasons.map((t) => (
            <p className="text-xs" key={t}>
              {t}
            </p>
          ))}
        </div>
      )}
      <OverseasStrategyPanel run={run} setRun={props.setRun} request={q} />
      <p role="status" className="text-gold">
        {message || quote.block}
      </p>
      {p &&
        expansionOf(run).promises.some(
          (a) =>
            a.projectId === p.id && a.status === "fulfilled" && !a.editApproved,
        ) && (
          <button
            className={button}
            onClick={() => act((r) => approveCreatorEdit(r, p.id))}
          >
            NEGOTIATE LIMITED BROADCAST EDIT · −3 CREATOR MORALE
          </button>
        )}
      <button
        className={button}
        disabled={!!quote.block || !a}
        onClick={() =>
          act((r) => signOverseas(r, q), "Signed. Localisation is scheduled.")
        }
      >
        SIGN AND SCHEDULE RELEASE
      </button>
      {p?.result && !p.distributionOwner && !o.reviews[p.id] && (
        <button
          className={button}
          onClick={() =>
            act((r) => reviewLegacyRights(r, p.id), "Rights documented.")
          }
        >
          REVIEW LEGACY RIGHTS · £5,000
        </button>
      )}
      <div className="space-y-2">
        {o.releases
          .slice()
          .reverse()
          .map((a) => (
            <div className="ink-card p-3" key={a.id}>
              <b>
                {run.projects.find((p) => p.id === a.projectId)?.draft.title ??
                  a.projectId}
              </b>
              <p>
                {TERRITORIES.find((t) => t.id === a.territory)?.name} ·{" "}
                {a.status} ·{" "}
                {a.recognised ? a.reception + "/100" : "Reception pending"}
              </p>
              <p>
                Cost {formatGBP(a.cost)}
                {a.recognised
                  ? " · studio receipts " +
                    formatGBP(a.receipts + a.catalogueReceipts) +
                    " total incl. catalogue · " +
                    a.viewers.toLocaleString("en-GB") +
                    " viewers"
                  : " · audiences and receipts will be revealed at opening"}
              </p>
            </div>
          ))}
      </div>
    </div>
  );
}
