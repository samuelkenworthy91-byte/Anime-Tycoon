import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Crown,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Flame,
  Play,
  Rocket,
  Scissors,
  TrendingUp,
  Tv,
  UserRound,
  Users,
  Banknote,
  Zap,
  Trash2,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  ROLE_LABEL,
  ROLE_POINT,
  formatGBPShort,
  staffMain,
  workerLook,
  type PointType,
  type Staff,
} from "../engine/data";
import { AIR_WEEKS, forecastWeek, projectCapacity, staffOperationReason, type RunState } from "../engine/state";
import { AUTO_MIN_OFFICE, delegationBlockReason } from "../engine/automation";
import { HEAD_TITLES, levelTitle, type HeadSlot } from "../engine/careers";
import { SEQUEL_SCORE_THRESHOLD, continuationBlock } from "../engine/franchise";
import {
  MILESTONE_LABEL,
  PRODUCTION_STAGES,
  STAGE_LABEL,
  TEAM_MAX,
  activeProjects,
  projectOfStaff,
  daysToDeadline,
  type Project,
} from "../engine/projects";
import Portrait from "./Portrait";
import StudioSlate from "./StudioSlate";
import { cn } from "../utils/cn";
import { BASE_INTERVENTIONS, INVESTMENT_TIERS, interventionBlock, interventionInvestmentKey, interventionQuote } from "../engine/spending";
import { expansionOf } from "../engine/studioExpansion";
import { canDelegateRoutineProduction, careerEraForWeek } from "../engine/careerEras";

const STAGE_COLOR: Record<string, string> = {
  concept: "#a78bfa",
  preprod: "#ff8fc7",
  animation: "#3be1ff",
  sound: "#ffd166",
  post: "#5ef0c0",
  marketing: "#ff7a3d",
  ready: "#ffd166",
  airing: "#5ef0c0",
  done: "#8b8fa3",
};

/* ------------------------------------------------------------ card */
function ProjectCard({
  p,
  run,
  setRun,
  onAssign,
  onMilestone,
  onShip,
  onDelegate,
  onTakeOver,
  onResume,
  onScrap,
  onContinueSeason,
  onLicensed,
  onIntervention,
  onAppointPromise,
  onAppointLead,
}: {
  p: Project;
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onAssign: (projectId: string, staffId: string) => void;
  onMilestone: (projectId: string) => void;
  onShip: (projectId: string) => void;
  onDelegate: (projectId: string, headSlot: HeadSlot | null) => void;
  onTakeOver: (projectId: string) => void;
  onResume: (projectId: string) => void;
  onScrap: (projectId: string) => void;
  /** jump straight into creating this IP's next season while it's still on air */
  onContinueSeason?: (franchiseKey: string) => void;
  onLicensed?: (ipId: string) => void;
  onIntervention: (projectId: string, interventionId: string) => void;
  onAppointPromise: (projectId: string, promiseId: string) => void;
  onAppointLead: (projectId: string, staffId: string | null) => void;
}) {
  const [teamOpen, setTeamOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const team = run.staff.filter((s) => p.staffIds.includes(s.id));
  const late = daysToDeadline(p, run.day ?? run.week * 7);
  const inPipeline = p.stage !== "airing" && p.stage !== "done";
  const stageIdx = PRODUCTION_STAGES.indexOf(p.stage);
  const plan = p.plan[p.stage] ?? 1;
  const pct = p.stage === "ready" ? 100 : Math.min(100, Math.round((p.progress / plan) * 100));
  const noTeam = inPipeline && team.length === 0;
  const auto = p.auto;
  const autoBlock = inPipeline && !auto ? delegationBlockReason(run, p) : null;
  const heads: [HeadSlot, string | null][] = [
    ["writer", run.heads.writer ?? null],
    ["animator", run.heads.animator ?? null],
    ["composer", run.heads.composer ?? null],
    ["production", run.heads.production ?? null],
  ];
  const expansion = expansionOf(run);
  const productionCredit = expansion.credits[p.id];
  const creativeLead = p.creativeLeadId ? run.staff.find((staff) => staff.id === p.creativeLeadId) : undefined;
  const promiseCandidates = expansion.promises.filter((promise) =>
    promise.status === "active" &&
    (!promise.projectId || promise.projectId === p.id) &&
    !p.commission &&
    !p.draft.continuation &&
    !p.draft.licensedIpId &&
    p.draft.genres.includes(promise.genre)
  );

  return (
    <div className={cn("ink-card p-3", p.milestone && "border-neon/60", p.stage === "ready" && "border-gold/60")}>
      {/* title row */}
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-extrabold tracking-wider text-ink"
          style={{ background: STAGE_COLOR[p.stage] }}
        >
          {STAGE_LABEL[p.stage].toUpperCase()}
        </span>
        <span className="min-w-0 truncate font-display text-sm font-extrabold">{p.draft.title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          {noTeam && (
            <span title="No staff assigned">
              <AlertTriangle size={13} className="text-gold" />
            </span>
          )}
          {inPipeline && late < 0 && (
            <span className="flex items-center gap-0.5 rounded-md bg-neon/20 px-1.5 py-0.5 text-[9px] font-extrabold text-neon">
              <AlertTriangle size={10} /> {-late}D LATE
            </span>
          )}
        </span>
      </div>

      {/* pipeline dots */}
      {inPipeline && (
        <div className="mt-2 flex items-center gap-1">
          {PRODUCTION_STAGES.map((s, i) => (
            <div
              key={s}
              title={STAGE_LABEL[s]}
              className={cn("h-1.5 flex-1 rounded-full", i < stageIdx ? "bg-mint" : i === stageIdx ? "" : "bg-panel3")}
              style={i === stageIdx ? { background: STAGE_COLOR[p.stage] } : undefined}
            />
          ))}
          <div className={cn("h-1.5 flex-1 rounded-full", p.stage === "ready" ? "bg-gold" : "bg-panel3")} title="Ready" />
        </div>
      )}

      {/* stage progress + deadline */}
      {inPipeline && p.stage !== "ready" && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-abyss">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: STAGE_COLOR[p.stage] }}
          />
        </div>
      )}
      {inPipeline && (
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-paper/55">
          <span>
            {p.stage === "ready"
              ? p.milestone
                ? ""
                : "Master complete"
              : `${STAGE_LABEL[p.stage]} ${Math.min(Math.floor(p.progress * 7), Math.round(plan * 7))}/${Math.round(plan * 7)} days`}
            {p.rush ? (
              <b className="text-cyanx"> {MILESTONE_LABEL[p.rush.milestone]} · day {p.rush.daysWorked}/{p.rush.durationDays}</b>
            ) : p.milestone ? (
              <b className="text-neon"> {MILESTONE_LABEL[p.milestone]} waiting</b>
            ) : null}
          </span>
          <span className={cn("flex items-center gap-1 font-bold", late < 0 ? "text-neon" : late <= 14 ? "text-gold" : "text-paper/55")}>
            <Calendar size={10} /> {late >= 0 ? `${late} days left` : `${-late} days late`}
          </span>
        </div>
      )}
      {p.stage === "airing" && p.airedWeek !== null && (
        <div className="mt-1.5 text-[10px] font-bold text-mint">
          ON AIR — week {Math.min(AIR_WEEKS, run.week - p.airedWeek + 1)}/{AIR_WEEKS}
          {p.result && <span className="ml-2 text-gold">{p.result.total}/40</span>}
        </div>
      )}

      {/* while the broadcast runs, the studio is free: a good studio starts
          on the next season straight away instead of waiting for the finale */}
      {p.stage === "airing" &&
        onContinueSeason &&
        (() => {
          const fkey = p.draft.franchiseKey ?? p.draft.title;
          const fr = run.franchises[fkey];
          if (!fr) return null;
          const nextNo = fr.season + 1;
          if (fr.lastScore < SEQUEL_SCORE_THRESHOLD) {
            return (
              <div className="mt-1.5 rounded-lg border border-neon/40 bg-neon/10 px-2 py-1.5 text-[10px] font-bold text-neon2">
                NO SEQUEL RIGHTS — latest entry {fr.lastScore}/40. Use SERIES for a spin-off or reboot.
              </div>
            );
          }
          const inFlight = run.projects.some(
            (x) =>
              x.id !== p.id &&
              x.stage !== "done" &&
              x.stage !== "airing" &&
              x.draft.franchiseKey === fkey &&
              x.draft.continuation === "season" &&
              x.draft.season === nextNo
          );
          if (inFlight)
            return (
              <div className="mt-1.5 text-[10px] italic text-paper/45">
                Season {nextNo} is already on the floor — check the board above.
              </div>
            );
          return (
            <Btn variant="gold" className="mt-1.5 w-full !py-1.5 text-[10px]" onClick={() => onContinueSeason(fkey)}>
              <Tv size={13} /> START SEASON {nextNo} NOW
            </Btn>
          );
        })()}

      {/* indicators */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
        {(["story", "art", "sound"] as PointType[]).map((t) => (
          <span key={t} className="ink-chip px-1.5 py-0.5" style={{ color: POINT_COLOR[t] }}>
            {p.points[t]}
          </span>
        ))}
        <span className={cn("ink-chip flex items-center gap-1 px-1.5 py-0.5", p.issues > 0 ? "text-[#ff5e5e]" : "text-paper/40")}>
          <Scissors size={10} /> {p.issues}
        </span>
        <span className="ink-chip flex items-center gap-1 px-1.5 py-0.5 text-gold">
          <Flame size={10} /> {Math.ceil(p.hype)}
        </span>
        <span className="ink-chip flex items-center gap-1 px-1.5 py-0.5 text-paper/55">
          <Banknote size={10} /> {formatGBPShort(p.spent)} spent
        </span>
      </div>

      {inPipeline && promiseCandidates.map((promise) => {
        const creator = run.staff.find((s) => s.id === promise.staffId);
        if (!creator) return null;
        const total = productionCredit?.byRole[promise.role] ?? 0;
        const creatorDays = productionCredit?.roleStaff[promise.staffId] ?? 0;
        const participation = total > 0 ? Math.round((creatorDays / total) * 100) : 0;
        const named = productionCredit?.leads[promise.role] === promise.staffId && promise.projectId === p.id;
        const conflictingLead = !!productionCredit?.leads[promise.role] && productionCredit.leads[promise.role] !== promise.staffId;
        const alreadyAssigned = p.staffIds.includes(promise.staffId);
        const early = p.stage === "concept" && total === 0;
        const earnedLate = total > 0 && participation >= 60;
        const canAutoAssign = alreadyAssigned || p.staffIds.length < TEAM_MAX;
        const canName = !named && !conflictingLead && canAutoAssign && (early || (alreadyAssigned && earnedLate));
        const leadLabel = promise.role === "writer" ? "WRITING" : promise.role === "animator" ? "ANIMATION" : "SOUND";
        return (
          <div key={promise.id} className="mt-2 rounded-lg border border-viol/55 bg-viol/10 p-2.5">
            <div className="flex items-center gap-2">
              <Crown size={13} className="text-gold" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[10px] font-black tracking-wider text-gold">LEADERSHIP PROMISE · {leadLabel} LEAD</div>
                <div className="truncate text-[10px] text-paper/70">{creator.name} · {participation}% department participation</div>
              </div>
              {named && <span className="rounded bg-mint/15 px-1.5 py-0.5 text-[8px] font-black text-mint">NAMED LEAD</span>}
            </div>
            {!named && canName && (
              <Btn variant="gold" className="mt-2 w-full !py-1.5 text-[10px]" onClick={() => onAppointPromise(p.id, promise.id)}>
                <Crown size={12} /> {alreadyAssigned ? "NAME " + creator.name.toUpperCase() + " " + leadLabel + " LEAD" : "ASSIGN + NAME " + creator.name.toUpperCase() + " " + leadLabel + " LEAD"}
              </Btn>
            )}
            {!named && !canName && (
              <div className="mt-1.5 text-[9px] text-paper/50">
                {conflictingLead
                  ? "Another " + leadLabel.toLowerCase() + " lead is already named."
                  : !canAutoAssign
                    ? "Team is full — make a slot before naming this promised lead."
                    : total > 0
                      ? "Keep " + creator.name + " on the project until they reach 60% of " + leadLabel.toLowerCase() + " production days. Current: " + participation + "%."
                      : "Assign " + creator.name + " before " + leadLabel.toLowerCase() + " work begins, or they can still earn the role later by reaching 60% participation."}
              </div>
            )}
          </div>
        );
      })}

      {inPipeline && (
        <details className="mt-2 rounded-lg border border-line bg-panel2/50 p-2">
          <summary className="cursor-pointer text-[10px] font-black tracking-widest text-gold">PAID PRODUCTION INTERVENTIONS</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {BASE_INTERVENTIONS.map((d) => {
              const standardBlock = interventionBlock(run, p, d);
              const tiers = d.scalable ? INVESTMENT_TIERS.filter((tier) => tier.id !== "obsessive") : INVESTMENT_TIERS.slice(0, 1);
              return (
                <div key={d.id} className={cn("rounded-lg border p-2", standardBlock ? "border-line/40 opacity-50" : "border-gold/30 bg-gold/5")}>
                  <div className="text-[10px] font-extrabold text-paper">{d.name}</div>
                  <div className="mt-0.5 text-[8px] text-paper/45">{standardBlock ?? d.description}</div>
                  {!standardBlock && (
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {tiers.map((tier) => {
                        const key = interventionInvestmentKey(d.id, tier.id);
                        const tierDef = { ...d, id: key, baseId: d.id, investmentTier: tier.id };
                        const block = interventionBlock(run, p, tierDef);
                        const quote = interventionQuote(run, d, tier.id, p.draft);
                        return (
                          <button
                            key={tier.id}
                            type="button"
                            disabled={!!block}
                            title={block ?? tier.description}
                            onClick={() => onIntervention(p.id, key)}
                            className={cn("btn-press rounded-md border px-1.5 py-1 text-center", block ? "border-line/30 text-paper/25" : "border-gold/30 bg-ink/35 hover:border-gold")}
                          >
                            <div className="text-[7px] font-black tracking-wide text-paper/55">{tier.name.toUpperCase()}</div>
                            <div className="text-[9px] font-extrabold text-gold">−{formatGBPShort(quote?.cost ?? d.cost)}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      )}
      {inPipeline && (p.executiveRushUntilDay ?? -1) >= (run.day ?? run.week * 7) && (
        <div className="mt-1.5 rounded-lg border border-neon/45 bg-neon/10 px-2.5 py-1.5 text-[9px] font-bold text-neon">
          ⚡ EXECUTIVE RUSH ACTIVE · ×2 production bubbles · ×2 editor-note risk · {Math.max(0, (p.executiveRushUntilDay ?? 0) - (run.day ?? run.week * 7))} days left
        </div>
      )}
      {inPipeline && (p.consultantUntilDay ?? -1) >= (run.day ?? run.week * 7) && (
        <div className="mt-1.5 rounded-lg border border-viol/45 bg-viol/10 px-2.5 py-1.5 text-[9px] font-bold text-viol">
          🧠 SPECIALIST CONSULTANT ACTIVE · every new error has a 50/50 chance to become R&D · {p.consultantConverted ?? 0} converted · {Math.max(0, (p.consultantUntilDay ?? 0) - (run.day ?? run.week * 7))} days left
        </div>
      )}

      {/* overall creative lead — available on every production type */}
      {inPipeline && (
        <div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 p-2">
          <div className="flex items-center gap-2">
            <Crown size={12} className="text-gold" />
            <div className="min-w-0 flex-1">
              <div className="text-[9px] font-black tracking-widest text-gold">PRODUCTION LEAD</div>
              <div className="truncate text-[10px] text-paper/55">
                {creativeLead
                  ? `${creativeLead.name} · ${levelTitle(creativeLead.level)} · ${Math.round(creativeLead.creatorFans ?? 0).toLocaleString("en-GB")} followers`
                  : "Name one assigned employee. Leads earn extra career XP and build a personal audience that can boost future releases."}
              </div>
            </div>
          </div>
          <select
            className="mt-1.5 min-h-9 w-full rounded-lg border border-line bg-panel2 px-2 text-[10px]"
            value={p.creativeLeadId ?? ""}
            disabled={team.length === 0}
            onChange={(event) => onAppointLead(p.id, event.target.value || null)}
          >
            <option value="">{team.length ? "No named production lead" : "Assign staff to the team first"}</option>
            {team.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} · {levelTitle(staff.level)} · {Math.round(staff.creatorFans ?? 0).toLocaleString("en-GB")} followers
              </option>
            ))}
          </select>
        </div>
      )}

      {/* team */}
      {inPipeline && (
        <div className="mt-2">
          <button
            onClick={() => {
              sfx.click();
              setTeamOpen((o) => !o);
            }}
            className="btn-press flex w-full items-center gap-1.5 rounded-lg border border-line bg-panel2/60 px-2 py-1.5"
          >
            <Users size={12} className="text-cyanx" />
            <span className="text-[10px] font-bold text-paper/70">
              TEAM {team.length}/{Math.min(TEAM_MAX, run.staff.length || TEAM_MAX)}
            </span>
            <span className="ml-1 flex -space-x-1.5">
              {team.slice(0, 6).map((s) => (
                <Portrait
                  key={s.id}
                  img={workerLook(s).portrait}
                  name={s.name}
                  alt={s.name}
                  className="h-6 w-6 rounded-full border border-line bg-panel3"
                />
              ))}
            </span>
            {team.length === 0 && <span className="text-[10px] italic text-gold">assign someone!</span>}
            <span className="ml-auto text-paper/40">{teamOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
          </button>

          {teamOpen && (
            <div className="mt-1.5 space-y-1">
              {run.staff.length === 0 && (
                <div className="rounded-lg border border-line/60 bg-panel2/40 px-2 py-2 text-center text-[10px] text-paper/45">
                  No staff hired yet — scout some in the STAFF menu.
                </div>
              )}
              {run.staff.map((s: Staff) => {
                const mine = p.staffIds.includes(s.id);
                const other = !mine ? projectOfStaff(run.projects, s.id) : null;
                const opBusy = !mine ? staffOperationReason(run, s.id) : null;
                const full = !mine && p.staffIds.length >= TEAM_MAX;
                return (
                  <div key={s.id} className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5", mine ? "border-mint/50 bg-mint/[0.06]" : "border-line bg-panel2/40")}>
                    <Portrait img={workerLook(s).portrait} name={s.name} alt={s.name} className="h-7 w-7 shrink-0 rounded-lg border border-line bg-panel3" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[11px] font-bold">{s.name}</div>
                      <div className="text-[9px] text-paper/50">
                        {ROLE_LABEL[s.role]} · {Math.round(staffMain(s))} <span style={{ color: POINT_COLOR[ROLE_POINT[s.role]] }}>●</span>
                        {other && <span className="ml-1 text-gold">on “{other.draft.title}”</span>}
                        {opBusy && <span className="ml-1 text-viol">{opBusy}</span>}
                        {s.stamina < 45 && <span className="ml-1 text-neon">tired</span>}
                      </div>
                    </div>
                    <Btn
                      variant={mine ? "ghost" : "cyan"}
                      className="!px-2 !py-1 text-[9px]"
                      disabled={full || !!opBusy}
                      onClick={() => onAssign(p.id, s.id)}
                    >
                      {mine ? "REMOVE" : opBusy ? "BUSY" : other ? "PULL OVER" : "ASSIGN"}
                    </Btn>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* production automation / intervention */}
      {inPipeline && (
        <div className="mt-2">
          {auto ? (
            <div className={cn("rounded-lg border px-2.5 py-2", auto.intervention ? "border-neon/60 bg-neon/10" : "border-viol/40 bg-viol/10")}>
              <div className="flex items-center gap-2">
                <Zap size={13} className={auto.intervention ? "text-neon" : "text-viol"} />
                <span className={cn("text-[10px] font-extrabold tracking-wider", auto.intervention ? "text-neon" : "text-viol")}>
                  {auto.intervention ? "⚠ PRODUCTION CRISIS" : "AUTO MANAGE"}
                </span>
                {!auto.intervention && (
                  <span className="truncate text-[10px] text-paper/60">
                    {auto.headSlot ? `${HEAD_TITLES[auto.headSlot]}` : "crew-led"}
                  </span>
                )}
              </div>
              {auto.intervention && (
                <div className="mt-1 text-[10px] text-paper/70">
                  The team can't carry on without you. Step in, or tell them to keep going.
                </div>
              )}
              <div className="mt-1.5 flex gap-1.5">
                <Btn variant="primary" className="!px-2.5 !py-1.5 text-[10px]" onClick={() => onTakeOver(p.id)}>
                  TAKE OVER
                </Btn>
                {auto.intervention ? (
                  <Btn variant="ghost" className="!px-2.5 !py-1.5 text-[10px]" onClick={() => onResume(p.id)}>
                    KEEP AUTO
                  </Btn>
                ) : (
                  <Btn variant="ghost" className="!px-2.5 !py-1.5 text-[10px]" onClick={() => setDelegateOpen((o) => !o)}>
                    CHANGE
                  </Btn>
                )}
              </div>
            </div>
          ) : run.officeLevel >= AUTO_MIN_OFFICE ? (
            <>
              <button
                onClick={() => {
                  sfx.click();
                  setDelegateOpen((o) => !o);
                }}
                className="btn-press flex w-full items-center gap-1.5 rounded-lg border border-viol/40 bg-viol/5 px-2 py-1.5"
              >
                <Zap size={12} className="text-viol" />
                <span className="text-[10px] font-bold text-paper/70">
                  AUTO MANAGE — hand the sprints to a department head
                </span>
                <span className="ml-auto text-paper/40">{delegateOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</span>
              </button>
              {delegateOpen && (
                <div className="mt-1.5 space-y-1">
                  <button
                    onClick={() => {
                      sfx.click();
                      onDelegate(p.id, null);
                      setDelegateOpen(false);
                    }}
                    className="btn-press w-full rounded-lg border border-line bg-panel2/60 px-2 py-1.5 text-left text-[10px] font-bold text-paper/80"
                  >
                    👥 CREW-LED — the whole team runs each sprint (no head needed)
                  </button>
                  {heads.map(([slot, id]) => {
                    const head = id ? run.staff.find((s) => s.id === id) : undefined;
                    return (
                      <button
                        key={slot}
                        disabled={!head}
                        onClick={() => {
                          sfx.click();
                          onDelegate(p.id, slot);
                          setDelegateOpen(false);
                        }}
                        className={cn(
                          "btn-press flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left",
                          head ? "border-line bg-panel2/60" : "border-line/40 bg-panel2/30 opacity-45"
                        )}
                      >
                        <span className="text-[10px] font-bold text-paper/80">{HEAD_TITLES[slot]}</span>
                        <span className="ml-auto text-[9px] text-paper/50">
                          {head ? `${head.name} (Lv ${head.level})` : "vacant — appoint one in STAFF"}
                        </span>
                      </button>
                    );
                  })}
                  {autoBlock && <div className="text-[9px] italic text-paper/40">{autoBlock}</div>}
                  {!autoBlock && (
                    <div className="text-[9px] text-paper/45">
                      Delegated sprints run ~70% as well as a hands-on one. You can always TAKE OVER later.
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-[9px] italic text-paper/35">
              AUTO MANAGE unlocks with Sakuga Tower — a studio with a real pipeline.
            </div>
          )}
        </div>
      )}

      {/* actions */}
      {inPipeline && p.lastMinuteBoost && (
        <div className="mt-2 rounded-lg border border-mint/40 bg-mint/10 px-2.5 py-2 text-[10px] font-bold text-mint">
          ✨ LAST-MINUTE BREAKTHROUGH · +{p.lastMinuteBoost.points} {p.lastMinuteBoost.type.toUpperCase()} before marketing
        </div>
      )}
      {inPipeline && (
        <Btn
          variant="ghost"
          className="mt-2 w-full border-neon/40 !py-1.5 text-[10px] text-neon"
          onClick={() => {
            const clawback = p.commission ? ` Commission advance £${p.commission.advance.toLocaleString("en-GB")} will also be clawed back.` : "";
            if (window.confirm(`SCRAP “${p.draft.title}”? £${Math.round(p.spent).toLocaleString("en-GB")} already spent will be lost.${clawback} This cannot be undone.`)) onScrap(p.id);
          }}
        >
          <Trash2 size={13} /> SCRAP PROJECT · WRITE OFF {formatGBPShort(p.spent)}
        </Btn>
      )}
      {!auto && p.milestone && !p.rush && (
        <Btn big variant="primary" className="anim-ring mt-2 w-full" onClick={() => onMilestone(p.id)}>
          <Play size={17} /> ASSIGN {MILESTONE_LABEL[p.milestone].toUpperCase()} LEAD
        </Btn>
      )}
      {p.stage === "ready" && (
        <div className="mt-2">
          <Btn big variant="gold" className="anim-ring w-full" onClick={() => onShip(p.id)}>
            <Rocket size={17} /> RELEASE PREP
          </Btn>
          <div className="mt-1 text-center text-[9px] text-paper/45">
            Delaying keeps polishing (−issues) but burns cash and cools hype{late < 0 ? " — and the network fines you weekly" : ""}.
          </div>
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- panel */
export default function ProjectsPanel({
  run,
  setRun,
  onAssign,
  onMilestone,
  onShip,
  onNewShow,
  onDelegate,
  onTakeOver,
  onResume,
  onScrap,
  onContinueSeason,
  onLicensed,
  onIntervention,
  onAppointPromise,
  onAppointLead,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onAssign: (projectId: string, staffId: string) => void;
  onMilestone: (projectId: string) => void;
  onShip: (projectId: string) => void;
  onNewShow: () => void;
  onDelegate: (projectId: string, headSlot: HeadSlot | null) => void;
  onTakeOver: (projectId: string) => void;
  onResume: (projectId: string) => void;
  onScrap: (projectId: string) => void;
  /** greenlight the next season of an IP straight from its airing card */
  onContinueSeason?: (franchiseKey: string) => void;
  onLicensed?: (ipId: string) => void;
  onIntervention: (projectId: string, interventionId: string) => void;
  onAppointPromise: (projectId: string, promiseId: string) => void;
  onAppointLead: (projectId: string, staffId: string | null) => void;
}) {
  const cap = projectCapacity(run);
  const active = activeProjects(run.projects);
  const airing = run.projects.filter((p) => p.stage === "airing");
  const done = [...run.projects]
    .filter((p) => p.stage === "done")
    .reverse()
    .filter((project, index, rows) => {
      const key = project.draft.franchiseKey ?? project.draft.title;
      return rows.findIndex((candidate) => (candidate.draft.franchiseKey ?? candidate.draft.title) === key) === index;
    })
    .slice(0, 4);
  const quickSequels = Object.values(run.franchises)
    .filter((fr) => !continuationBlock(fr, "season", { week: run.week, franchiseCount: Object.keys(run.franchises).length, officeLevel: run.officeLevel, projects: run.projects }))
    .sort((a, b) => b.lastEntryWeek - a.lastEntryWeek || b.lastScore - a.lastScore);
  const fc = forecastWeek(run);
  const era = careerEraForWeek(run.week);
  const executiveReady = canDelegateRoutineProduction(run.week) && run.officeLevel >= AUTO_MIN_OFFICE;

  return (
    <div className="space-y-2.5">
      <StudioSlate
        run={run}
        setRun={setRun}
        onOriginal={onNewShow}
        onFranchise={(key) => onContinueSeason?.(key)}
        onLicensed={(ipId) => onLicensed?.(ipId)}
      />
      <section className="rounded-xl border border-cyanx/25 bg-cyanx/5 p-2.5">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[8px] font-black tracking-[0.22em] text-cyanx">YEAR {Math.floor(run.week / 48) + 1} · {era.name.toUpperCase()}</div>
            <div className="mt-0.5 text-[9px] text-paper/50">{era.managementFocus}</div>
          </div>
          {executiveReady && (
            <button
              type="button"
              onClick={() => setRun((r) => ({ ...r, executiveDelegation: !r.executiveDelegation, notices: [...r.notices, !r.executiveDelegation ? "🧭 Executive delegation enabled: projects default to Auto Manage once two staff are assigned." : "🧭 Executive delegation disabled: new projects remain hands-on."].slice(-40) }))}
              className={cn("btn-press min-h-10 rounded-lg border px-2 text-[8px] font-black", run.executiveDelegation ? "border-mint/50 bg-mint/10 text-mint" : "border-line text-paper/50")}
            >
              EXECUTIVE DELEGATION {run.executiveDelegation ? "ON" : "OFF"}
            </button>
          )}
        </div>
        {executiveReady && <div className="mt-1 text-[8px] text-paper/40">This changes attention, not strategy: you still choose the show, team, interventions and release. Routine milestone sprints can run under the Production Head/team until a crisis needs you.</div>}
      </section>
      {quickSequels.length > 0 && onContinueSeason && <section className="rounded-xl border border-gold/30 bg-gold/5 p-2.5"><div className="text-[9px] font-black tracking-[0.22em] text-gold">TRUE SEQUELS READY</div><div className="mt-1 text-[9px] text-paper/45">Only the latest eligible state of each series appears here. Reboots, spin-offs and sold properties stay in the Library.</div><div className="mt-2 space-y-1.5">{quickSequels.map((fr)=>{const latest=fr.entries[fr.entries.length-1];const ago=Math.max(0,run.week-fr.lastEntryWeek);return <div key={fr.key} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/60 p-2"><div className="min-w-0 flex-1"><b className="block truncate text-xs">{fr.baseTitle}</b><div className="text-[9px] text-paper/45">Latest: {latest?.title??fr.baseTitle} · {ago} week{ago===1?"":"s"} ago · {fr.lastScore}/40</div></div><Btn variant="gold" className="!px-2 !py-1 text-[9px]" onClick={()=>onContinueSeason(fr.key)}>SEASON {fr.season+1}</Btn></div>})}</div></section>}
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold tracking-[0.25em] text-paper/45">
          SLOTS {active.length}/{cap}
        </span>
        <span className="text-[9px] text-paper/35">· bigger offices run more shows at once</span>
      </div>

      {/* the money next week is expected to move — so you can act before
          skipping into a week you can't afford */}
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] leading-snug",
          fc.cashAfter < 0 ? "border-neon/60 bg-neon/10 text-neon" : "border-line/60 bg-panel2/40 text-paper/60"
        )}
      >
        {fc.cashAfter < 0 ? <AlertTriangle size={12} className="shrink-0" /> : <TrendingUp size={12} className="shrink-0 text-mint" />}
        <span>
          Next week:{" "}
          {fc.income > 0 && <span className="text-mint">broadcast +{formatGBPShort(fc.income)} · </span>}
          burn −{formatGBPShort(fc.burn)}
          {fc.lateFees > 0 && <span className="text-neon"> · penalties −{formatGBPShort(fc.lateFees)}</span>}
          {fc.payday > 0 && <span className="text-gold"> · payday −{formatGBPShort(fc.payday)}</span>}
          {" = "}
          <b className={fc.net >= 0 ? "text-mint" : "text-neon"}>
            {fc.net >= 0 ? "+" : "−"}
            {formatGBPShort(Math.abs(fc.net))}
          </b>
          {" → "}
          <b className={fc.cashAfter < 0 ? "text-neon" : "text-paper/90"}>≈{formatGBPShort(fc.cashAfter)} in the bank</b>
          {fc.cashAfter < 0 && <b className="block font-bold text-neon">DEBT WARNING — recover before 8 consecutive weeks below £0 or the landlord shuts the studio.</b>}
        </span>
      </div>

      {active.length === 0 && airing.length === 0 && (
        <div className="rounded-xl border border-line/60 bg-panel2/40 px-3 py-5 text-center text-[11px] text-paper/50">
          <Clapperboard size={18} className="mx-auto mb-1.5 text-paper/30" />
          Nothing in production. Greenlight a show!
        </div>
      )}

      {[...active, ...airing].map((p) => (
        <ProjectCard
          key={p.id}
          p={p}
          run={run}
          onAssign={onAssign}
          onMilestone={onMilestone}
          onShip={onShip}
          onDelegate={onDelegate}
          onTakeOver={onTakeOver}
          onResume={onResume}
          onScrap={onScrap}
          onContinueSeason={onContinueSeason}
          onIntervention={onIntervention}
          onAppointPromise={onAppointPromise}
          onAppointLead={onAppointLead}
        />
      ))}

      {active.length < cap && (
        <Btn big variant="primary" className="w-full" onClick={onNewShow}>
          <Clapperboard size={17} /> NEW SHOW ({active.length}/{cap} slots)
        </Btn>
      )}

      {done.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[0.25em] text-paper/40">LATEST FRANCHISE INSTALMENTS</div>
          <div className="space-y-1">
            {done.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-line/60 bg-panel2/40 px-2.5 py-1.5 text-[11px]">
                <UserRound size={11} className="text-paper/30" />
                <span className="min-w-0 truncate font-bold text-paper/70">{p.draft.title}</span>
                {p.result && (
                  <span className="ml-auto shrink-0 font-display font-extrabold text-gold">{p.result.total}/40</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
