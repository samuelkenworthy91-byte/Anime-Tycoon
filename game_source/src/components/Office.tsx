import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  BarChart3,
  Clapperboard,
  Disc3,
  Globe,
  Hammer,
  KanbanSquare,
  Smartphone,
  Tv,
  Users,
  Banknote,
  Flame,
  X,
  Zap,
  FlaskConical,
  Crown,
  Star,
  Briefcase,
  Building2,
  Trophy,
  Database,
  ChevronRight,
  Calendar,
  Sparkles,
  Lock,
  TrendingUp,
  Award,
  Clock,
  Swords,
} from "lucide-react";
import { Btn, CountUp } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  ARCS,
  ARC_COMBOS,
  arcComboRating,
  CAST_CHEMS,
  castById,
  DISTRIBUTION_LABEL,
  FORMAT_ORDER,
  GENRES,
  NEWS,
  OFFICES,
  RESEARCH,
  ROLE_POINT,
  SHOWRUNNERS,
  MEDIUMS,
  POINT_COLOR,
  workerLookIndex,
  dateLabel,
  formatGBP,
  formatGBPShort,
  formatNum,
  type Contract,
  type GenreId,
} from "../engine/data";
import {
  assignToProject,
  buyFacility,
  forecastWeek,
  formatLockReason,
  office,
  projectCapacity,
  relocateOffice,
  staffCapacity,
  startBlockReason,
  startResearchProject,
  startTestAudience,
  unlockFormat,
  AUDIENCE_TEST_DAYS,
  AUDIENCE_TEST_RD,
  AUDIENCE_TEST_MAX_FINDINGS,
  audienceShowKey,
  studioScore,
  contractDailyOutputEstimateForRun,
  type RunState,
} from "../engine/state";
import { FACILITY_DEFS, slotsUsed } from "../engine/facilities";
import { activeProjects } from "../engine/projects";
import ProjectTracker from "./ProjectTracker";
import KnowledgeDossier, { type KnowledgeSelection } from "./KnowledgeDossier";
import { buyInvestment, computeIndustryRecords } from "../engine/legacy";
import { resumeAuto, setDelegation, takeOver } from "../engine/automation";
import { type HeadSlot } from "../engine/careers";
import Portrait from "./Portrait";
import Poster from "./Poster";
import { genreTitleCss } from "../engine/poster";
import type { HofEntry } from "../engine/state";

/** hall-of-fame list rows speak in the show's genre font too */
const hofTitleStyle = (h: HofEntry) => genreTitleCss(h.genres[0]);
import OfficeScene from "./OfficeScene";
import ProjectsPanel from "./Projects";
import FacilitiesPanel from "./Facilities";
import CrewPanel from "./Crew";
import MarketPanel from "./Market";
import LibraryPanel, { type ContinuationPlan } from "./Library";
import RivalsPanel from "./Rivals";
import DynastyPanel from "./Dynasty";
import { type Commission } from "../engine/market";
import { cn } from "../utils/cn";

/* =================================================================== */
export default function Office({
  run,
  setRun,
  onNewShow,
  onContract,
  onCommission,
  onContinue,
  onMilestone,
  onShip,
  workPulses = [],
  clockDay = 0,
  clockPhase = 0,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onNewShow: (sequelKey?: string) => void;
  onContract: (c: Contract) => void;
  onCommission: (c: Commission) => void;
  onContinue: (plan: ContinuationPlan) => void;
  onMilestone: (projectId: string) => void;
  onShip: (projectId: string) => void;
  workPulses?: import("../engine/state").DeskPulse[];
  clockDay?: number;
  clockPhase?: number;
}) {
  const [modal, setModal] = useState<null | "projects" | "facilities" | "staff" | "research" | "contracts" | "market" | "relocate" | "hof" | "awards" | "sequels" | "rivals" | "dynasty" | "more">(null);
  const [fcOpen, setFcOpen] = useState(false);
  const [knowledge, setKnowledge] = useState<KnowledgeSelection>(null);
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];
  const fc = forecastWeek(run);
  const ticker = useMemo(() => [...run.notices.slice(-6).reverse(), ...NEWS].join(" ✦ "), [run.notices]);
  const score = studioScore(run);
  const off = office(run);
  const nextOffice = OFFICES[run.officeLevel + 1];
  const projActive = activeProjects(run.projects);
  const projCap = projectCapacity(run);
  const newShowBlocked = startBlockReason(run);
  const projAlerts = run.projects.filter((p) => (p.milestone && !p.rush) || p.stage === "ready").length;
  const roomsUsed = slotsUsed(run.facilities);
  const builtRooms = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);

  const research = (id: string, rd: number) => {
    if (run.rd < rd) return;
    sfx.fanfare();
    setRun((r) => startResearchProject(r, id, rd) ?? r);
  };
  const unlockGenre = (g: GenreId, rd: number) => {
    if (run.rd < rd) return;
    sfx.fanfare();
    setRun((r) => ({
      ...r,
      rd: r.rd - rd,
      genresUnlocked: [...r.genresUnlocked, g],
      notices: [...r.notices, `New genre licensed: ${GENRES.find((x) => x.id === g)?.label}!`],
    }));
  };
  const relocate = () => {
    if (!nextOffice || run.cash < nextOffice.cost) return;
    sfx.fanfare();
    setModal(null);
    setRun((r) => relocateOffice(r) ?? r);
  };

  const seq = run.pendingSequel ? run.franchises[run.pendingSequel] : null;
  const seriesList = useMemo(
    () => Object.entries(run.franchises).sort((a, b) => b[1].season - a[1].season || b[1].lastScore - a[1].lastScore),
    [run.franchises]
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink">
      <OfficeScene
        level={run.officeLevel}
        boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0 || run.contractJobs.some((j) => j.showrunner), pulse: workPulses.find((x) => x.actorId === "showrunner") }}
        staff={run.staff.map((s) => ({
          id: s.id,
          name: s.name.split(" ")[0],
          color: POINT_COLOR[ROLE_POINT[s.role]],
          tired: !!run.staffResting?.[s.id] || s.stamina < 28,
          look: workerLookIndex(s),
          workstation: s.role === "animator" ? "animation" : s.role === "composer" ? "audio" : "standard",
          working: !run.staffResting?.[s.id] && s.stamina > 0 && (projActive.some((pr) => pr.staffIds.includes(s.id)) || run.contractJobs.some((j) => j.staffIds.includes(s.id))),
          energy: s.stamina,
          resting: !!run.staffResting?.[s.id],
          pulse: workPulses.find((x) => x.actorId === s.id),
        }))}
        maxStaff={staffCapacity(run)}
        timeOfDay={(clockPhase + 0.5) / 4}
        onDeskClick={() => setModal("staff")}
      />

      <div className="office-hud relative z-20 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md md:pl-5">
        <div className="flex min-w-0 items-center gap-2">
          <Crown size={16} className="shrink-0 text-gold" />
          <span className="truncate font-display text-sm font-extrabold md:text-base">{run.studio}</span>
        </div>
        <div className="office-hud-date ink-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyanx md:text-xs">
          <Calendar size={12} /> {dateLabel(run.week)}
        </div>
        <div className="office-hud-stats ml-auto flex items-center gap-1.5 md:gap-2">
          <div className={cn("office-hud-cash ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold", run.cash < 0 && "border-neon text-neon")}>
            <Banknote size={13} className={run.cash < 0 ? "text-neon" : "text-mint"} />
            <CountUp to={run.cash} format={(n) => formatGBPShort(n)} />
          </div>
          <div className="office-hud-forecast relative">
            <button
              onClick={() => setFcOpen(true)}
              title="See next week's money in detail"
              className={cn(
                "ink-chip btn-press flex items-center gap-1 px-2 py-1 text-[10px] font-bold",
                fc.cashAfter < 0 ? "animate-pulse border-neon bg-neon/15 text-neon" : fc.net >= 0 ? "text-mint" : "text-gold"
              )}
            >
              {fc.cashAfter < 0 ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
              <span className="hidden md:inline">NEXT WK</span> {fc.net >= 0 ? "+" : "−"}{formatGBPShort(Math.abs(fc.net))}
            </button>
          </div>
          <div className="office-hud-rd ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-viol">
            <Database size={13} />
            <CountUp to={run.rd} />
          </div>
        </div>
      </div>

      <ProjectTracker run={run} clockDay={clockDay} onOpen={() => setModal("projects")} />

      <div className="relative z-20 shrink-0 border-t border-line/60 bg-ink/90 px-2 py-1.5 backdrop-blur-md">
        <div className="mx-auto grid max-w-xl grid-cols-5 gap-1">
          <Btn variant="primary" className="relative !min-h-0 !px-1.5 !py-1.5 text-[9px] sm:text-[10px]" onClick={() => setModal("projects")}><KanbanSquare size={15}/> WORK</Btn>
          <Btn variant={newShowBlocked ? "ghost" : "primary"} disabled={!!newShowBlocked} className="!min-h-0 !px-1.5 !py-1.5 text-[9px] sm:text-[10px]" onClick={() => onNewShow()}><Clapperboard size={15}/> NEW SHOW</Btn>
          <Btn variant="cyan" className="!min-h-0 !px-1.5 !py-1.5 text-[9px] sm:text-[10px]" onClick={() => setModal("contracts")}><Briefcase size={15}/> JOBS</Btn>
          <Btn variant="ghost" className="!min-h-0 !px-1.5 !py-1.5 text-[9px] sm:text-[10px]" onClick={() => setModal("staff")}><Users size={15}/> STAFF</Btn>
          <Btn variant="ghost" className="!min-h-0 !px-1.5 !py-1.5 text-[9px] sm:text-[10px]" onClick={() => setModal("more")}><Sparkles size={15}/> MORE</Btn>
        </div>
      </div>

      <div className="relative z-20 shrink-0 border-t border-line/40 bg-panel2/70 py-0.5 backdrop-blur-md">
        <div className="overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
          <div className="inline-block text-[9px] text-paper/55" style={{ animation: "marquee 46s linear infinite" }}>{ticker} ✦ {ticker}</div>
        </div>
      </div>

      {modal === "more" && <Modal title="STUDIO MENU" onClose={() => setModal(null)}><div className="grid grid-cols-2 gap-2"><button className="ink-card p-3" onClick={() => setModal("research")}>R&amp;D</button><button className="ink-card p-3" onClick={() => setModal("staff")}>STAFF</button></div></Modal>}
      {modal === "research" && <Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}><div className="text-sm font-bold">{run.rd} Research Data</div></Modal>}
      {modal === "staff" && <Modal title="STAFF ROOM" onClose={() => setModal(null)}><CrewPanel run={run} setRun={setRun} maxStaff={staffCapacity(run)} /></Modal>}
      {modal === "projects" && <Modal title="PROJECT BOARD" onClose={() => setModal(null)}><ProjectsPanel run={run} onAssign={(projectId, staffId) => setRun((r) => assignToProject(r, projectId, staffId))} onMilestone={onMilestone} onShip={onShip} onNewShow={() => onNewShow()} onContinueSeason={(key) => onContinue({ key, kind: "season" })} onDelegate={(projectId, headSlot: HeadSlot | null) => setRun((r) => setDelegation(r, projectId, headSlot) ?? r)} onTakeOver={(projectId) => setRun((r) => takeOver(r, projectId))} onResume={(projectId) => setRun((r) => resumeAuto(r, projectId))} /></Modal>}

      {fcOpen && createPortal(
        <div className="forecast-screen" onClick={() => setFcOpen(false)} role="dialog" aria-modal="true" aria-label="Next week's forecast">
          <div className="forecast-screen-inner">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-extrabold tracking-[0.22em] text-cyanx">FINANCIAL FORECAST</div>
                <div className="mt-1 font-display text-xl font-extrabold">NEXT WEEK — {dateLabel(fc.week)}</div>
              </div>
              <X size={20} className="shrink-0 text-paper/60" />
            </div>

            <div className="space-y-4">
              <section className="rounded-2xl border border-mint/35 bg-mint/5 p-4">
                <div className="mb-2 text-[10px] font-extrabold tracking-[0.2em] text-mint">MONEY IN</div>
                {fc.payoutsDue.length > 0 ? fc.payoutsDue.map((p, i) => <div key={i} className="flex justify-between gap-3 py-1 text-sm"><span className="text-paper/70">{p.label}</span><span className="font-bold text-mint">+{formatGBPShort(p.amount)}</span></div>) : <div className="text-sm text-paper/40">No payouts scheduled</div>}
              </section>

              <section className="rounded-2xl border border-neon/30 bg-neon/5 p-4">
                <div className="mb-2 text-[10px] font-extrabold tracking-[0.2em] text-neon">MONEY OUT</div>
                {fc.costsDue.length > 0 ? fc.costsDue.map((c, i) => <div key={i} className="flex justify-between gap-3 py-1 text-sm"><span className="text-paper/70">{c.label}</span><span className="font-bold text-neon">−{formatGBPShort(c.amount)}</span></div>) : <div className="text-sm text-paper/40">No costs due</div>}
              </section>

              <section className="rounded-2xl border border-line bg-panel2/70 p-4 text-sm">
                <div className="flex justify-between py-1"><span>Total money in</span><span className="font-bold text-mint">{fc.income > 0 ? `+${formatGBPShort(fc.income)}` : "—"}</span></div>
                <div className="flex justify-between py-1"><span>Total money out</span><span className="font-bold text-neon">{fc.burn + fc.lateFees + fc.payday > 0 ? `−${formatGBPShort(fc.burn + fc.lateFees + fc.payday)}` : "—"}</span></div>
                <div className="my-2 border-t border-line" />
                <div className="flex justify-between py-1 text-base font-extrabold"><span>Net next week</span><span className={fc.net >= 0 ? "text-mint" : "text-neon"}>{fc.net >= 0 ? "+" : "−"}{formatGBPShort(Math.abs(fc.net))}</span></div>
                <div className="flex justify-between py-1 text-base font-extrabold"><span>Studio cash after</span><span className={fc.cashAfter < 0 ? "text-neon" : "text-paper"}>≈ {formatGBPShort(fc.cashAfter)}</span></div>
              </section>
            </div>
          </div>
          <div className="forecast-screen-close">TAP ANYWHERE TO CLOSE</div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Rec({ k, v }: { k: string; v: string }) {
  return <div className="rounded-xl border border-line bg-panel2/60 p-2.5 text-center"><div className="text-[9px] font-bold tracking-wider text-paper/40">{k.toUpperCase()}</div><div className="mt-0.5 truncate font-display text-sm font-extrabold">{v}</div></div>;
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-3 backdrop-blur-sm" onClick={onClose}><div className="anim-pop nice-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-panel p-4 md:p-5" onClick={(e) => e.stopPropagation()}><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-extrabold">{title}</h3><button onClick={onClose} className="btn-press rounded-lg border border-line p-1.5 text-paper/60 hover:bg-panel3" aria-label="Close"><X size={15}/></button></div>{children}</div></div>;
}

export { Lock };
