import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { GENRES, dateLabel, type GenreId } from "../engine/data";
import { departmentStatuses } from "../engine/capacity";
import { PRODUCTION_STAGES, type Project, type ProjectStage } from "../engine/projects";
import type { RunState } from "../engine/state";
import {
  QUARTER_WEEKS,
  addSlatePlan,
  armSlatePlan,
  careerCalendarYear,
  plansForQuarter,
  quarterIndexForWeek,
  quarterStartWeek,
  removeSlatePlan,
  slatePreparation,
  updateSlatePlan,
  type SlateImportance,
  type SlatePlan,
  type SlatePlanKind,
} from "../engine/slate";
import {
  slateCalendarWarnings,
  slateStageAtWeek,
  type SlateCalendarStage,
} from "../engine/slateCalendar";
import { ipById } from "../engine/ip";
import { cn } from "../utils/cn";

const importanceLabel: Record<SlateImportance, string> = {
  supporting: "SUPPORTING",
  standard: "STANDARD",
  tentpole: "TENTPOLE",
};

const releaseOffsets = [1, 4, 7, 10] as const;
const releaseOffsetLabel = ["EARLY", "MID", "LATE", "END"] as const;

const stageStyle: Record<SlateCalendarStage, string> = {
  development: "border-violet-400/55 bg-violet-500/28 text-violet-100",
  preprod: "border-fuchsia-400/50 bg-fuchsia-500/24 text-fuchsia-100",
  animation: "border-cyanx/60 bg-cyanx/24 text-cyanx",
  sound: "border-mint/55 bg-mint/20 text-mint",
  post: "border-gold/55 bg-gold/18 text-gold",
  marketing: "border-neon/50 bg-neon/16 text-neon",
  release: "border-paper/70 bg-paper/15 text-paper",
};

const stageLegend: { stage: SlateCalendarStage; label: string }[] = [
  { stage: "development", label: "Development" },
  { stage: "preprod", label: "Pre-production" },
  { stage: "animation", label: "Animation" },
  { stage: "sound", label: "Sound" },
  { stage: "post", label: "Post / QA" },
  { stage: "marketing", label: "Marketing" },
  { stage: "release", label: "Release" },
];

function quarterWeeks(year: number, quarter: number) {
  const start = quarterStartWeek(year, quarter);
  return Array.from({ length: QUARTER_WEEKS }, (_, index) => start + index);
}

function projectCalendarStage(project: Project, week: number): SlateCalendarStage | null {
  if (week < project.createdWeek) return null;
  let cursor = project.createdWeek;
  for (const stage of PRODUCTION_STAGES) {
    const length = Math.max(1, project.plan[stage] ?? 1);
    if (week >= cursor && week < cursor + length) {
      if (stage === "concept") return "development";
      if (stage === "preprod") return "preprod";
      if (stage === "animation") return "animation";
      if (stage === "sound") return "sound";
      if (stage === "post") return "post";
      if (stage === "marketing") return "marketing";
    }
    cursor += length;
  }
  if (week === cursor) return "release";
  return null;
}

function stageShort(stage: SlateCalendarStage | null) {
  if (!stage) return "";
  if (stage === "development") return "D";
  if (stage === "preprod") return "P";
  if (stage === "animation") return "A";
  if (stage === "sound") return "S";
  if (stage === "post") return "Q";
  if (stage === "marketing") return "M";
  return "R";
}

function CalendarCells({ weeks, stageForWeek, tentative = false }: {
  weeks: number[];
  stageForWeek: (week: number) => SlateCalendarStage | null;
  tentative?: boolean;
}) {
  return (
    <div className="grid grid-cols-12 gap-[2px]">
      {weeks.map((week) => {
        const stage = stageForWeek(week);
        return (
          <div
            key={week}
            title={stage ? `${dateLabel(week)} · ${stage}` : dateLabel(week)}
            className={cn(
              "flex h-7 items-center justify-center rounded-[4px] border text-[7px] font-black",
              stage ? stageStyle[stage] : "border-line/25 bg-panel2/20 text-paper/15",
              tentative && stage && "border-dashed opacity-80",
            )}
          >
            {stageShort(stage)}
          </div>
        );
      })}
    </div>
  );
}

export default function StudioSlateV3({
  run,
  setRun,
  onOriginal,
  onFranchise,
  onLicensed,
}: {
  run: RunState;
  setRun: (fn: (state: RunState) => RunState) => void;
  onOriginal: () => void;
  onFranchise?: (key: string) => void;
  onLicensed?: (ipId: string) => void;
}) {
  const nowYear = careerCalendarYear(run.week);
  const nowQuarter = quarterIndexForWeek(run.week);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [year, setYear] = useState(nowYear);
  const [quarter, setQuarter] = useState(nowQuarter);
  const [planning, setPlanning] = useState(false);
  const [kind, setKind] = useState<SlatePlanKind>("original");
  const [importance, setImportance] = useState<SlateImportance>("standard");
  const [property, setProperty] = useState("");
  const [genre, setGenre] = useState<GenreId | "">("");
  const [releaseOffset, setReleaseOffset] = useState<(typeof releaseOffsets)[number]>(7);

  const weeks = useMemo(() => quarterWeeks(year, quarter), [year, quarter]);
  const quarterStart = weeks[0];
  const quarterEnd = weeks[weeks.length - 1];
  const plans = plansForQuarter(run, year, quarter);
  const active = run.projects.filter((project) => project.stage !== "done" && project.stage !== "airing" && project.stage !== "shelved");
  const quarterActive = active.filter((project) => {
    const start = project.createdWeek;
    const end = project.deadlineWeek;
    return end >= quarterStart && start <= quarterEnd;
  });
  const warnings = slateCalendarWarnings(run, plans);
  const depts = departmentStatuses(run.projects, run.staff, run.facilities, run.research);
  const franchises = Object.values(run.franchises ?? {}).filter((franchise) => !franchise.soldTo);
  const ownedIps = Object.values(run.ipMarket?.owned ?? {})
    .filter((contract) => contract.expiresWeek > run.week)
    .map((contract) => ({ contract, ip: ipById(contract.ipId) }))
    .filter((row) => !!row.ip);
  const unlockedGenres = GENRES.filter((item) => run.genresUnlocked.includes(item.id));

  const shiftQuarter = (delta: number) => {
    const absolute = (year - 1) * 4 + quarter + delta;
    setYear(Math.max(1, Math.floor(absolute / 4) + 1));
    setQuarter(((absolute % 4) + 4) % 4);
  };

  const openCalendar = () => {
    setYear(nowYear);
    setQuarter(nowQuarter);
    setCalendarOpen(true);
  };

  const addPlan = () => {
    if (kind !== "original" && !property) return;
    const chosenFranchise = kind === "franchise" ? franchises.find((item) => item.key === property) : undefined;
    const chosenIpRow = kind === "licensed" ? ownedIps.find((row) => row.contract.ipId === property) : undefined;
    const inheritedGenres = kind === "franchise"
      ? (chosenFranchise?.genres ?? []).slice(0, 2)
      : kind === "licensed"
        ? (chosenIpRow?.ip?.genres ?? []).slice(0, 2)
        : genre ? [genre] : [];
    const targetWeek = Math.max(run.week + 1, quarterStart + releaseOffset);
    setRun((state) => addSlatePlan(state, {
      kind,
      title: kind === "original"
        ? genre
          ? `Planned ${GENRES.find((item) => item.id === genre)?.label ?? "Original"}`
          : "Planned Original"
        : chosenFranchise?.baseTitle ?? chosenIpRow?.ip?.title ?? "Planned Project",
      targetWeek,
      importance,
      franchiseKey: chosenFranchise?.key,
      licensedIpId: chosenIpRow?.ip?.id,
      genres: inheritedGenres,
    }));
    setPlanning(false);
    setProperty("");
    setGenre("");
  };

  const startPlan = (plan: SlatePlan) => {
    setRun((state) => armSlatePlan(state, plan.id));
    setCalendarOpen(false);
    if (plan.kind === "franchise" && plan.franchiseKey && onFranchise) onFranchise(plan.franchiseKey);
    else if (plan.kind === "licensed" && plan.licensedIpId && onLicensed) onLicensed(plan.licensedIpId);
    else onOriginal();
  };

  return (
    <>
      <div className="rounded-xl border border-cyanx/30 bg-abyss/55 p-3">
        <div className="flex items-start gap-2">
          <CalendarRange size={17} className="mt-0.5 shrink-0 text-cyanx" />
          <div className="min-w-0 flex-1">
            <div className="font-display text-sm font-extrabold">STUDIO SLATE</div>
            <div className="mt-0.5 text-[9px] leading-relaxed text-paper/45">
              Your production calendar. Plan release windows, see stage clashes and bank preparation before you spend the money.
            </div>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-lg border border-line bg-panel2/55 p-1.5"><b className="block text-sm text-paper">{quarterActive.length}</b><span className="text-[7px] text-paper/35">ACTIVE NOW</span></div>
          <div className="rounded-lg border border-line bg-panel2/55 p-1.5"><b className="block text-sm text-gold">{plans.length}</b><span className="text-[7px] text-paper/35">PLANNED Q{quarter + 1}</span></div>
          <div className={cn("rounded-lg border p-1.5", warnings.some((warning) => warning.severity === "danger") ? "border-neon/45 bg-neon/8" : "border-mint/35 bg-mint/5")}><b className={cn("block text-sm", warnings.some((warning) => warning.severity === "danger") ? "text-neon" : "text-mint")}>{warnings.length}</b><span className="text-[7px] text-paper/35">PLANNING FLAGS</span></div>
        </div>
        <button onClick={openCalendar} className="btn-press mt-2 min-h-11 w-full rounded-lg border border-cyanx/55 bg-cyanx/10 text-[10px] font-black text-cyanx active:translate-y-[2px] active:scale-[0.99]">
          OPEN PRODUCTION CALENDAR
        </button>
      </div>

      {calendarOpen && (
        <div className="fixed inset-0 z-[120] flex flex-col bg-[#060713] text-paper">
          <div className="flex items-center gap-2 border-b border-line bg-ink/95 px-3 py-3 shadow-lg">
            <CalendarRange size={18} className="text-cyanx" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-base font-extrabold">PRODUCTION CALENDAR</div>
              <div className="text-[8px] text-paper/40">Pick a release window. The studio estimates everything backwards for you.</div>
            </div>
            <button aria-label="Close calendar" onClick={() => setCalendarOpen(false)} className="btn-press flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-panel2 text-paper/60"><X size={18}/></button>
          </div>

          <div className="nice-scroll flex-1 overflow-y-auto px-2.5 py-3 sm:px-4">
            <div className="mx-auto max-w-5xl space-y-3">
              <div className="flex items-center gap-1 rounded-xl border border-line bg-panel2/55 p-1.5">
                <button onClick={() => shiftQuarter(-1)} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-paper/55"><ChevronLeft size={17}/></button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[8px] font-black tracking-[0.18em] text-paper/35">YEAR {year}</div>
                  <div className="font-display text-sm font-extrabold text-cyanx">Q{quarter + 1} · {dateLabel(quarterStart)}–{dateLabel(quarterEnd)}</div>
                </div>
                <button onClick={() => shiftQuarter(1)} className="btn-press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-paper/55"><ChevronRight size={17}/></button>
              </div>

              <div className="grid grid-cols-4 gap-1 sm:grid-cols-7">
                {stageLegend.map((item) => <div key={item.stage} className={cn("rounded-lg border px-1.5 py-1 text-center text-[7px] font-black", stageStyle[item.stage])}>{item.label.toUpperCase()}</div>)}
              </div>

              <div className="grid grid-cols-2 gap-1 sm:grid-cols-5">
                {depts.map((dept) => {
                  const pct = Math.min(160, Math.round(dept.utilization * 100));
                  return <div key={dept.id} className={cn("rounded-lg border p-2", dept.overloaded ? "border-neon/45 bg-neon/8" : "border-line bg-panel2/45")}><div className="flex items-center justify-between text-[8px] font-bold"><span>{dept.label}</span><span className={dept.overloaded ? "text-neon" : "text-mint"}>{pct}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded bg-ink"><div className={cn("h-full rounded", dept.overloaded ? "bg-neon" : "bg-mint")} style={{ width: `${Math.min(100, pct)}%` }}/></div></div>;
                })}
              </div>

              {warnings.length > 0 && (
                <div className="space-y-1.5">
                  {warnings.map((warning) => <div key={warning.id} className={cn("rounded-xl border p-2.5", warning.severity === "danger" ? "border-neon/45 bg-neon/8" : warning.severity === "opportunity" ? "border-mint/40 bg-mint/6" : "border-gold/40 bg-gold/6")}><div className="flex items-center gap-1.5 text-[9px] font-black"><AlertTriangle size={12}/>{warning.title}</div><div className="mt-0.5 text-[8px] leading-relaxed text-paper/55">{warning.body}</div></div>)}
                </div>
              )}

              <div className="rounded-xl border border-line bg-panel2/35 p-2.5">
                <div className="grid grid-cols-[96px_repeat(12,minmax(0,1fr))] gap-[2px] text-[7px] text-paper/35">
                  <div className="flex items-end pb-1 font-black">SHOW</div>
                  {weeks.map((week, index) => <div key={week} className={cn("pb-1 text-center", week === run.week && "font-black text-gold")}>W{index + 1}</div>)}
                </div>

                <div className="space-y-3">
                  {quarterActive.map((project) => (
                    <div key={project.id}>
                      <div className="mb-1 flex items-center justify-between gap-2"><div className="truncate text-[9px] font-bold">{project.draft.title}</div><span className="shrink-0 rounded border border-cyanx/30 px-1 py-0.5 text-[7px] font-black text-cyanx">ACTIVE</span></div>
                      <CalendarCells weeks={weeks} stageForWeek={(week) => projectCalendarStage(project, week)} />
                    </div>
                  ))}

                  {plans.map((plan) => {
                    const prep = slatePreparation(plan, run.week, run.showrunner);
                    return (
                      <div key={plan.id} className="rounded-xl border border-gold/25 bg-gold/[.025] p-2">
                        <div className="mb-1 flex items-start gap-2"><div className="min-w-0 flex-1"><div className="truncate text-[9px] font-black text-gold">{plan.title}</div><div className="text-[7px] text-paper/35">{importanceLabel[plan.importance]} · RELEASE {dateLabel(plan.targetWeek)}{plan.genres?.length ? ` · ${plan.genres.map((id) => GENRES.find((item) => item.id === id)?.label ?? id).join(" + ")}` : ""}</div></div><button aria-label={`Delete ${plan.title}`} onClick={() => setRun((state) => removeSlatePlan(state, plan.id))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-paper/30"><Trash2 size={13}/></button></div>
                        <CalendarCells tentative weeks={weeks} stageForWeek={(week) => slateStageAtWeek(plan, week)?.stage ?? null} />
                        <div className={cn("mt-1.5 rounded-lg px-2 py-1.5 text-[8px] font-bold", prep.ready ? "bg-mint/8 text-mint" : "bg-panel2 text-paper/40")}>
                          {prep.label} · {prep.weeksPlanned} week{prep.weeksPlanned === 1 ? "" : "s"} planned{prep.effectiveWeeks !== prep.weeksPlanned ? ` (${prep.effectiveWeeks} effective with ${run.showrunner === "operations" ? "Line Producer" : "Franchise Architect"})` : ""}
                          {prep.ready ? ` · +${prep.hypeBonus} hype · −${Math.round(prep.burnDiscount * 100)}% burn${prep.paceBonus ? ` · +${Math.round(prep.paceBonus * 100)}% pace` : ""}${prep.issueChanceMult < 1 ? ` · −${Math.round((1 - prep.issueChanceMult) * 100)}% overload-note risk` : ""}${prep.deadlineBufferWeeks ? ` · +${prep.deadlineBufferWeeks} wk buffer` : ""}` : " · no planning bonus yet"}
                        </div>
                        <div className="mt-1.5 grid grid-cols-[1fr_auto_auto] gap-1">
                          <button onClick={() => startPlan(plan)} className="btn-press min-h-10 rounded-lg border border-gold/45 bg-gold/8 px-2 text-[8px] font-black text-gold">GREENLIGHT / SET UP</button>
                          <button aria-label="Move one week earlier" onClick={() => setRun((state) => updateSlatePlan(state, plan.id, { targetWeek: Math.max(run.week + 1, plan.targetWeek - 1) }))} className="btn-press min-h-10 rounded-lg border border-line px-3 text-xs text-paper/55">−1</button>
                          <button aria-label="Move one week later" onClick={() => setRun((state) => updateSlatePlan(state, plan.id, { targetWeek: plan.targetWeek + 1 }))} className="btn-press min-h-10 rounded-lg border border-line px-3 text-xs text-paper/55">+1</button>
                        </div>
                      </div>
                    );
                  })}

                  {quarterActive.length === 0 && plans.length === 0 && <div className="rounded-xl border border-dashed border-line p-5 text-center text-[9px] text-paper/35">This quarter is empty. Plan a show and the calendar will draw the estimated production stages automatically.</div>}
                </div>
              </div>

              {planning ? (
                <div className="rounded-xl border border-cyanx/40 bg-cyanx/5 p-3">
                  <div className="flex items-center justify-between gap-2"><div><div className="font-display text-sm font-extrabold text-cyanx">PLAN A SHOW</div><div className="text-[8px] text-paper/40">Four choices. The calendar does the scheduling maths.</div></div><button onClick={() => setPlanning(false)} className="flex h-10 w-10 items-center justify-center rounded-lg text-paper/45"><X size={15}/></button></div>

                  <div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">1 · WHAT KIND?</div>
                  <div className="mt-1 grid grid-cols-3 gap-1">{(["original", "franchise", "licensed"] as SlatePlanKind[]).map((id) => <button key={id} onClick={() => { setKind(id); setProperty(""); }} className={cn("min-h-11 rounded-lg border px-1 text-[8px] font-black", kind === id ? "border-cyanx bg-cyanx/15 text-cyanx" : "border-line text-paper/45")}>{id.toUpperCase()}</button>)}</div>

                  {kind === "original" && <><div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">2 · ROUGH GENRE <span className="font-normal">(optional)</span></div><select value={genre} onChange={(event) => setGenre(event.target.value as GenreId | "")} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-xs"><option value="">Decide later</option>{unlockedGenres.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></>}
                  {kind === "franchise" && <><div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">2 · WHICH FRANCHISE?</div><select value={property} onChange={(event) => setProperty(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-xs"><option value="">Choose franchise…</option>{franchises.map((item) => <option key={item.key} value={item.key}>{item.baseTitle}</option>)}</select></>}
                  {kind === "licensed" && <><div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">2 · WHICH OWNED IP?</div><select value={property} onChange={(event) => setProperty(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-panel2 px-2 text-xs"><option value="">Choose owned IP…</option>{ownedIps.map(({ contract, ip }) => <option key={contract.ipId} value={contract.ipId}>{ip!.title}</option>)}</select></>}

                  <div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">3 · HOW IMPORTANT?</div>
                  <div className="mt-1 grid grid-cols-3 gap-1">{(["supporting", "standard", "tentpole"] as SlateImportance[]).map((id) => <button key={id} onClick={() => setImportance(id)} className={cn("min-h-11 rounded-lg border px-1 text-[8px] font-black", importance === id ? "border-gold bg-gold/10 text-gold" : "border-line text-paper/45")}>{importanceLabel[id]}</button>)}</div>

                  <div className="mt-3 text-[8px] font-black tracking-wider text-paper/40">4 · WHEN SHOULD IT RELEASE?</div>
                  <div className="mt-1 grid grid-cols-4 gap-1">{releaseOffsets.map((offset, index) => <button key={offset} onClick={() => setReleaseOffset(offset)} className={cn("min-h-11 rounded-lg border px-1 text-[8px] font-black", releaseOffset === offset ? "border-mint bg-mint/10 text-mint" : "border-line text-paper/45")}><span className="block">{releaseOffsetLabel[index]}</span><span className="block text-[7px] font-normal opacity-60">W{offset + 1}</span></button>)}</div>

                  <button disabled={kind !== "original" && !property} onClick={addPlan} className="btn-press mt-3 min-h-12 w-full rounded-xl border border-cyanx/55 bg-cyanx/12 text-[10px] font-black text-cyanx disabled:opacity-30"><Check size={13} className="mr-1 inline"/>ADD TO CALENDAR</button>
                </div>
              ) : (
                <button onClick={() => setPlanning(true)} className="btn-press min-h-12 w-full rounded-xl border border-cyanx/55 bg-cyanx/10 text-[10px] font-black text-cyanx"><Plus size={14} className="mr-1 inline"/>PLAN A SHOW</button>
              )}

              <div className="rounded-xl border border-line/60 bg-panel2/35 p-2.5 text-[8px] leading-relaxed text-paper/45">
                <b className="text-paper/65">How to read this:</b> solid blocks are active productions; dashed blocks are estimates for planned shows. You only choose a release window — the calendar works backwards to show Development, Pre-production, Animation, Sound, Post/QA and Publicity. Leave a plan on the Slate before greenlighting it to bank Readiness; moving a plan is always allowed.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
