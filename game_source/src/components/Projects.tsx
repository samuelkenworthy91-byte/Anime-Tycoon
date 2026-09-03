import { useState } from "react";
import {
  AlertTriangle,
  Calendar,
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
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  ROLE_LABEL,
  ROLE_POINT,
  dateLabel,
  formatGBPShort,
  staffMain,
  workerLook,
  type PointType,
  type Staff,
} from "../engine/data";
import { AIR_WEEKS, forecastWeek, projectCapacity, staffOperationReason, type RunState } from "../engine/state";
import { AUTO_MIN_OFFICE, delegationBlockReason } from "../engine/automation";
import { HEAD_TITLES, type HeadSlot } from "../engine/careers";
import {
  MILESTONE_LABEL,
  PRODUCTION_STAGES,
  STAGE_LABEL,
  TEAM_MAX,
  activeProjects,
  projectOfStaff,
  weeksToDeadline,
  type Project,
} from "../engine/projects";
import Portrait from "./Portrait";
import StudioSlate from "./StudioSlate";
import { cn } from "../utils/cn";

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
  onAssign,
  onMilestone,
  onShip,
  onRushCrunch,
  onDelegate,
  onTakeOver,
  onResume,
  onContinueSeason,
}: {
  p: Project;
  run: RunState;
  onAssign: (projectId: string, staffId: string) => void;
  onMilestone: (projectId: string) => void;
  onShip: (projectId: string) => void;
  onRushCrunch: (projectId: string) => void;
  onDelegate: (projectId: string, headSlot: HeadSlot | null) => void;
  onTakeOver: (projectId: string) => void;
  onResume: (projectId: string) => void;
  /** jump straight into creating this IP's next season while it's still on air */
  onContinueSeason?: (franchiseKey: string) => void;
}) {
  const [teamOpen, setTeamOpen] = useState(false);
  const [delegateOpen, setDelegateOpen] = useState(false);
  const team = run.staff.filter((s) => p.staffIds.includes(s.id));
  const late = weeksToDeadline(p, run.week);
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
              <AlertTriangle size={10} /> {-late} WK LATE
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
              : `${STAGE_LABEL[p.stage]} ${Math.min(Math.floor(p.progress), plan)}/${plan} wk`}
            {p.rush ? (
              <b className="text-cyanx"> {MILESTONE_LABEL[p.rush.milestone]} · day {p.rush.daysWorked}/{p.rush.durationDays}</b>
            ) : p.milestone ? (
              <b className="text-neon"> {MILESTONE_LABEL[p.milestone]} waiting</b>
            ) : null}
          </span>
          <span className={cn("flex items-center gap-1 font-bold", late < 0 ? "text-neon" : late <= 2 ? "text-gold" : "text-paper/55")}>
            <Calendar size={10} /> {dateLabel(p.deadlineWeek)}
            {late >= 0 ? ` · ${late} wk left` : ""}
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
          <Flame size={10} /> {p.hype}
        </span>
        <span className="ink-chip flex items-center gap-1 px-1.5 py-0.5 text-paper/55">
          <Banknote size={10} /> {formatGBPShort(p.spent)} spent
        </span>
      </div>

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
                        {ROLE_LABEL[s.role]} · {staffMain(s)} <span style={{ color: POINT_COLOR[ROLE_POINT[s.role]] }}>●</span>
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
      {!auto && p.milestone && !p.rush && (
        <Btn big variant="primary" className="anim-ring mt-2 w-full" onClick={() => onMilestone(p.id)}>
          <Play size={17} /> ASSIGN {MILESTONE_LABEL[p.milestone].toUpperCase()} LEAD
        </Btn>
      )}
      {p.rush && (
        <div className="mt-2 rounded-xl border border-cyanx/40 bg-cyanx/5 p-2.5">
          <div className="flex items-center gap-2"><UserRound size={13} className="text-cyanx"/><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-extrabold text-cyanx">{p.rush.leadName} · SKILL {p.rush.skill}</div><div className="text-[9px] text-paper/45">+{p.rush.pointsAdded} {p.rush.type} so far · work lands each in-game day</div></div><Btn variant="gold" className="!px-2 !py-1 text-[9px]" disabled={run.cash < 9000} onClick={() => onRushCrunch(p.id)}><Zap size={11}/> CRUNCH</Btn></div>
          <div className="mt-1 text-[9px] text-paper/40">Crunch costs £9,000: +35% lead output for the next two rush days, with almost double mistake risk.</div>
        </div>
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
  onAssign,
  onMilestone,
  onShip,
  onRushCrunch,
  onNewShow,
  onDelegate,
  onTakeOver,
  onResume,
  onContinueSeason,
}: {
  run: RunState;
  onAssign: (projectId: string, staffId: string) => void;
  onMilestone: (projectId: string) => void;
  onShip: (projectId: string) => void;
  onRushCrunch: (projectId: string) => void;
  onNewShow: () => void;
  onDelegate: (projectId: string, headSlot: HeadSlot | null) => void;
  onTakeOver: (projectId: string) => void;
  onResume: (projectId: string) => void;
  /** greenlight the next season of an IP straight from its airing card */
  onContinueSeason?: (franchiseKey: string) => void;
}) {
  const cap = projectCapacity(run);
  const active = activeProjects(run.projects);
  const airing = run.projects.filter((p) => p.stage === "airing");
  const done = run.projects.filter((p) => p.stage === "done").slice(-4).reverse();
  const fc = forecastWeek(run);

  return (
    <div className="space-y-2.5">
      <StudioSlate run={run} />
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
          {fc.cashAfter < 0 && <b className="block font-bold text-neon">BANKRUPT NEXT WEEK — take a contract first!</b>}
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
          onRushCrunch={onRushCrunch}
          onDelegate={onDelegate}
          onTakeOver={onTakeOver}
          onResume={onResume}
          onContinueSeason={onContinueSeason}
        />
      ))}

      {active.length < cap && (
        <Btn big variant="primary" className="w-full" onClick={onNewShow}>
          <Clapperboard size={17} /> NEW SHOW ({active.length}/{cap} slots)
        </Btn>
      )}

      {done.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-bold tracking-[0.25em] text-paper/40">RECENTLY COMPLETED</div>
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
