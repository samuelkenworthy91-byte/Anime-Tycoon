import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Clapperboard,
  Hammer,
  KanbanSquare,
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
  ARC_COMBOS,
  CAST_CHEMS,
  castById,
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
  office,
  officeSlots,
  pendingIncome,
  projectCapacity,
  relocateOffice,
  staffCapacity,
  startBlockReason,
  startResearchProject,
  studioScore,
  type RunState,
} from "../engine/state";
import { FACILITY_DEFS, slotsUsed } from "../engine/facilities";
import { activeProjects } from "../engine/projects";
import { buyInvestment, computeIndustryRecords, dynastyYear } from "../engine/legacy";
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
  onRushCrunch,
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
  onRushCrunch: (projectId: string) => void;
  workPulses?: import("../engine/state").DeskPulse[];
  clockDay?: number;
  clockPhase?: number;
}) {
  const [modal, setModal] = useState<null | "projects" | "facilities" | "staff" | "research" | "contracts" | "market" | "relocate" | "hof" | "awards" | "sequels" | "rivals" | "dynasty">(null);
  const [fcOpen, setFcOpen] = useState(false);
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];
  const fc = forecastWeek(run);
  const ticker = useMemo(() => [...run.notices.slice(-6).reverse(), ...NEWS].join(" ✦ "), [run.notices]);
  const score = studioScore(run);
  const off = office(run);
  const nextOffice = OFFICES[run.officeLevel + 1];
  const inFlight = pendingIncome(run, 12);
  const projActive = activeProjects(run.projects);
  const projCap = projectCapacity(run);
  const newShowBlocked = startBlockReason(run);
  /* projects needing the player: a milestone to play or a release decision */
  const projAlerts = run.projects.filter((p) => (p.milestone && !p.rush) || p.stage === "ready").length;
  const roomsUsed = slotsUsed(run.facilities);
  const roomsTotal = officeSlots(run);
  /* rooms drawn as glowing door signs inside the office scene */
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
  const unlockMovie = () => {
    if (run.rd < MEDIUMS.movie.rd) return;
    sfx.fanfare();
    setRun((r) => ({
      ...r,
      rd: r.rd - MEDIUMS.movie.rd,
      mediumsUnlocked: [...r.mediumsUnlocked, "movie"],
      notices: [...r.notices, "Theatrical distribution deal signed!"],
    }));
  };
  const relocate = () => {
    if (!nextOffice || run.cash < nextOffice.cost) return;
    sfx.fanfare();
    setModal(null);
    setRun((r) => relocateOffice(r) ?? r);
  };

  const seq = run.pendingSequel ? run.franchises[run.pendingSequel] : null;
  /* every series you have ever shipped can be continued, at any time, in any order */
  const seriesList = useMemo(
    () =>
      Object.entries(run.franchises).sort(
        (a, b) => b[1].season - a[1].season || b[1].lastScore - a[1].lastScore
      ),
    [run.franchises]
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink">
      {/* ---------------------------------------------------- office scene */}
      <OfficeScene
        level={run.officeLevel}
        boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0, pulse: workPulses.find((x) => x.actorId === "showrunner") }}
        staff={run.staff.map((s) => ({
          id: s.id,
          name: s.name.split(" ")[0],
          color: POINT_COLOR[ROLE_POINT[s.role]],
          tired: s.stamina < 45,
          look: workerLookIndex(s),
          working: projActive.some((pr) => pr.staffIds.includes(s.id)),
          pulse: workPulses.find((x) => x.actorId === s.id),
        }))}
        maxStaff={staffCapacity(run)}
        timeOfDay={(clockPhase + 0.5) / 4}
        onDeskClick={() => setModal("staff")}
      />
      {/* built rooms glow as neon door signs on the back wall */}
      {builtRooms.length > 0 && (
        <div className="pointer-events-none absolute right-[3%] top-[16%] z-10 hidden flex-col items-end gap-1 sm:flex">
          {builtRooms.slice(0, 6).map((d) => {
            const tier = run.facilities[d.id] ?? 1;
            return (
              <div
                key={d.id}
                className="rounded border px-1.5 py-0.5 text-right font-display text-[7px] font-extrabold tracking-widest backdrop-blur-[1px]"
                style={{
                  color: d.color,
                  borderColor: `${d.color}55`,
                  background: "rgba(9,7,22,.55)",
                  textShadow: `0 0 6px ${d.color}, 0 0 14px ${d.color}66`,
                }}
              >
                {d.name.toUpperCase()}
                {tier > 1 && <span className="ml-1 opacity-90">{["", "", "Ⅱ", "Ⅲ"][tier]}</span>}
              </div>
            );
          })}
          {builtRooms.length > 6 && (
            <div className="rounded border border-line/50 bg-abyss/60 px-1.5 py-0.5 font-display text-[7px] font-extrabold text-paper/60">
              +{builtRooms.length - 6} MORE
            </div>
          )}
        </div>
      )}

      {/* hall of fame posters — taped, tilted key visuals in genre type */}
      <div className="absolute left-[4%] top-[8%] z-10 hidden gap-2 sm:flex">
        {run.hallOfFame.slice(-3).map((h, i) => (
          <Poster key={i} variant="mini" hof={h} />
        ))}
        {run.hallOfFame.length === 0 && (
          <div className="flex h-16 w-14 items-center justify-center rounded border border-dashed border-line bg-abyss/60 text-center text-[8px] text-paper/30 md:w-20">
            HALL OF
            <br />
            FAME POSTER
          </div>
        )}
      </div>
      {run.research.includes("merch") && (
        <div className="absolute left-[5%] top-[44%] z-10 hidden sm:block">
          <div className="flex gap-1.5 rounded border border-line bg-panel2/80 px-1.5 py-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="h-2.5 w-2 rounded-t-full" style={{ background: ["#ff4d8d", "#3be1ff", "#ffd166"][i] }} />
                <div className="h-3 w-2.5 rounded-b-sm" style={{ background: ["#a12046", "#1a6d80", "#8a6b1a"][i] }} />
              </div>
            ))}
          </div>
          <div className="h-1.5 w-full rounded bg-[#5e3b24]" />
        </div>
      )}

      {/* ---------------------------------------------------------- HUD */}
      <div className="relative z-20 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md md:pl-5">
        <div className="flex min-w-0 items-center gap-2">
          <Crown size={16} className="shrink-0 text-gold" />
          <span className="truncate font-display text-sm font-extrabold md:text-base">{run.studio}</span>
        </div>
        <div className="ink-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold text-cyanx md:text-xs">
          <Calendar size={12} /> {dateLabel(run.week)}
        </div>
        <div className="ink-chip hidden shrink-0 items-center gap-1 px-2 py-1 text-[10px] font-bold text-gold sm:flex">
          <Clock size={12} /> DAY {clockDay + 1} · {["MORNING", "AFTERNOON", "EVENING", "NIGHT"][clockPhase]}{" "}
          <span className="text-paper/40">({run.incomeThisWeek > 0 ? `+${formatGBPShort(run.incomeThisWeek)} this week` : "no income this week"})</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 md:gap-2">
          {run.incomeThisWeek > 0 && (
            <div className="ink-chip flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-mint">
              <TrendingUp size={12} /> +{formatGBPShort(run.incomeThisWeek)}
            </div>
          )}
          <div className={cn("ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold", run.cash < 0 && "border-neon text-neon")}>
            <Banknote size={13} className={run.cash < 0 ? "text-neon" : "text-mint"} />
            <CountUp to={run.cash} format={(n) => formatGBPShort(n)} />
          </div>
          {/* next week's money: broadcast in, burn/bills out, and the cash you
              would be left holding — tap for the itemised breakdown */}
          <div className="relative">
            <button
              onClick={() => setFcOpen((o) => !o)}
              title="See next week's money in detail"
              className={cn(
                "ink-chip btn-press flex items-center gap-1 px-2 py-1 text-[10px] font-bold",
                fc.cashAfter < 0
                  ? "animate-pulse border-neon bg-neon/15 text-neon"
                  : fc.net >= 0
                    ? "text-mint"
                    : "text-gold"
              )}
            >
              {fc.cashAfter < 0 ? <AlertTriangle size={12} /> : <TrendingUp size={12} />}
              <span className="hidden md:inline">NEXT WK</span> {fc.net >= 0 ? "+" : "−"}
              {formatGBPShort(Math.abs(fc.net))}
            </button>
            {fcOpen && (
              <>
                <div className="fixed inset-0 z-[65]" onClick={() => setFcOpen(false)} />
                <div className="anim-pop absolute left-1/2 top-full z-[70] mt-2 w-72 -translate-x-1/2 rounded-xl border border-line bg-panel p-3 text-left shadow-2xl">
                  <div className="mb-1.5 font-display text-xs font-extrabold tracking-wider text-paper/80">
                    NEXT WEEK'S FORECAST — {dateLabel(fc.week)}
                  </div>
                  <div className="space-y-0.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-paper/60">Broadcast revenue</span>
                      <span className={cn("font-bold", fc.income > 0 ? "text-mint" : "text-paper/35")}>
                        {fc.income > 0 ? `+${formatGBPShort(fc.income)}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-paper/60">Production burn</span>
                      <span className={cn("font-bold", fc.burn > 0 ? "text-gold" : "text-paper/35")}>
                        {fc.burn > 0 ? `−${formatGBPShort(fc.burn)}` : "—"}
                      </span>
                    </div>
                    {fc.lateFees > 0 && (
                      <div className="flex justify-between">
                        <span className="text-paper/60">Deadline penalties</span>
                        <span className="font-bold text-neon">−{formatGBPShort(fc.lateFees)}</span>
                      </div>
                    )}
                    {fc.payday > 0 && (
                      <div className="flex justify-between">
                        <span className="text-paper/60">Payday — wages + rent</span>
                        <span className="font-bold text-neon">−{formatGBPShort(fc.payday)}</span>
                      </div>
                    )}
                    <div className="my-1 border-t border-line/60" />
                    <div className="flex justify-between">
                      <span className="font-bold text-paper/80">Net next week</span>
                      <span className={cn("font-display font-extrabold", fc.net >= 0 ? "text-mint" : "text-neon")}>
                        {fc.net >= 0 ? "+" : "−"}
                        {formatGBPShort(Math.abs(fc.net))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold text-paper/80">Studio cash after</span>
                      <span className={cn("font-display font-extrabold", fc.cashAfter < 0 ? "text-neon" : "text-paper")}>
                        ≈ {formatGBPShort(fc.cashAfter)}
                      </span>
                    </div>
                  </div>
                  {fc.cashAfter < 0 ? (
                    <div className="mt-2 rounded-lg border border-neon/50 bg-neon/10 px-2 py-1.5 text-[10px] font-bold text-neon">
                      At this rate the studio bounces next week
                      {run.bailouts < 2
                        ? " — the fans can crowdfund a rescue, but a contract or a cheaper week buys you time NOW."
                        : " — no bailouts left. Take a contract or this is the last week."}
                    </div>
                  ) : fc.net < 0 && fc.payday > 0 ? (
                    <div className="mt-2 rounded-lg border border-gold/40 bg-gold/10 px-2 py-1.5 text-[10px] text-gold">
                      Payday week — make sure there's broadcast money or contract cash to cover it.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
          <div className="ink-chip flex items-center gap-1.5 px-2 py-1 text-xs font-bold text-viol">
            <Database size={13} />
            <CountUp to={run.rd} />
          </div>
          <div className="ink-chip hidden items-center gap-1.5 px-2 py-1 text-xs font-bold text-neon2 sm:flex">
            <Flame size={13} />
            <CountUp to={run.fans} format={(n) => formatNum(n)} />
          </div>
          <div className="ink-chip hidden items-center gap-1.5 px-2 py-1 text-xs font-bold text-gold lg:flex">
            <Star size={13} />
            <CountUp to={score} />
          </div>
        </div>
      </div>

      {/* -------------------------------------------------------- actions */}
      <div className="relative z-20 border-t border-line/60 bg-ink/85 px-2 py-2.5 backdrop-blur-md md:px-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-1.5 md:gap-2.5">
          <Btn
            big
            variant="primary"
            className={cn(!projAlerts && !newShowBlocked && "anim-ring", "relative")}
            onClick={() => setModal("projects")}
          >
            <KanbanSquare size={19} /> PROJECTS
            <span className="text-[10px] opacity-70">({projActive.length}/{projCap})</span>
            {projAlerts > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold font-display text-[10px] font-extrabold text-ink anim-pop">
                {projAlerts}
              </span>
            )}
          </Btn>
          <Btn
            big
            variant={newShowBlocked ? "ghost" : "primary"}
            disabled={!!newShowBlocked}
            onClick={() => onNewShow()}
          >
            <Clapperboard size={19} /> NEW SHOW
          </Btn>
          <Btn variant="ghost" onClick={() => setModal("facilities")}>
            <Hammer size={15} className="text-gold" /> STUDIO
            <span className="text-[10px] opacity-70">({roomsUsed}/{roomsTotal})</span>
          </Btn>
          {seq && (
            <Btn big variant="gold" className="anim-pop" onClick={() => onNewShow(run.pendingSequel!)}>
              <Zap size={19} /> SEASON {seq.season + 1}
            </Btn>
          )}
          {seriesList.length > 0 && (
            <Btn variant="ghost" onClick={() => setModal("sequels")}>
              <Clapperboard size={15} className="text-gold" /> LIBRARY
              <span className="text-[10px] opacity-70">({seriesList.length})</span>
            </Btn>
          )}
          <Btn variant="cyan" onClick={() => setModal("contracts")}>
            <Briefcase size={15} /> CONTRACTS
          </Btn>
          <Btn variant="ghost" className="relative" onClick={() => setModal("market")}>
            <BarChart3 size={15} className="text-mint" /> MARKET
            {run.commissions.length + run.marketEvents.length + (run.studioEvents?.length ?? 0) > 0 && (
              <span className="anim-pop absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-cyanx font-display text-[9px] font-extrabold text-ink">
                {run.commissions.length + run.marketEvents.length + (run.studioEvents?.length ?? 0)}
              </span>
            )}
          </Btn>
          <Btn variant="ghost" className="relative" onClick={() => setModal("staff")}>
            <Users size={15} /> STAFF <span className="text-[10px] opacity-70">({run.staff.length}/{staffCapacity(run)})</span>
            {run.staffEvents.length > 0 && (
              <span className="anim-pop absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold font-display text-[9px] font-extrabold text-ink">
                {run.staffEvents.length}
              </span>
            )}
          </Btn>
          <Btn variant="ghost" onClick={() => setModal("research")}>
            <FlaskConical size={15} className="text-viol" /> R&amp;D
          </Btn>
          {nextOffice && (
            <Btn variant="ghost" onClick={() => setModal("relocate")}>
              <Building2 size={15} className="text-cyanx" /> MOVE
            </Btn>
          )}
          <Btn variant="ghost" onClick={() => setModal("awards")}>
            <Award size={15} className="text-gold" /> AWARDS
          </Btn>
          <Btn variant="ghost" onClick={() => setModal("rivals")}>
            <Swords size={15} className="text-cyanx" /> RIVALS
          </Btn>
          {run.dynasty && (
            <Btn variant="gold" className="anim-pop" onClick={() => setModal("dynasty")}>
              <Crown size={15} /> DYNASTY
              <span className="text-[10px] opacity-70">Y{dynastyYear(run) + 1}</span>
            </Btn>
          )}
          <Btn variant="ghost" onClick={() => setModal("hof")}>
            <Trophy size={15} className="text-gold" /> RECORDS
          </Btn>
        </div>
        {run.lastResult && run.lastDraft && (
          <div className="mx-auto mt-1.5 max-w-4xl text-center text-[11px] text-paper/50">
            Last: <b className="text-paper/80">{run.lastDraft.title}</b> — {run.lastResult.total}/40 ·{" "}
            {formatGBP(run.lastResult.revenue)} · +{formatNum(run.lastResult.fans)} fans
          </div>
        )}
        {fc.cashAfter < 0 && (
          <div className="mx-auto mt-1 max-w-4xl animate-pulse text-center text-[11px] font-bold text-neon">
            <AlertTriangle size={11} className="mr-1 inline" />
            Next week leaves you at ≈{formatGBPShort(fc.cashAfter)} — act NOW: take a contract
            {run.bailouts < 2 ? ", or the fans can bail you out once more." : " — no bailouts left, this is the last week."}
          </div>
        )}
        {inFlight > 0 && (
          <div className="mx-auto mt-1 max-w-4xl text-center text-[11px] text-mint/80">
            <TrendingUp size={11} className="mr-1 inline" />
            Broadcast revenue still landing — the box office will tell you what it was
          </div>
        )}
      </div>

      {/* ticker */}
      <div className="relative z-20 border-t border-line/40 bg-panel2/70 py-1.5 backdrop-blur-md">
        <div className="overflow-hidden whitespace-nowrap [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
          <div className="inline-block text-[11px] text-paper/60" style={{ animation: "marquee 46s linear infinite" }}>
            {ticker} ✦ {ticker}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- CONTRACTS */}
      {modal === "contracts" && (
        <Modal title="CONTRACT WORK" onClose={() => setModal(null)}>
          <p className="mb-3 text-xs text-paper/60">
            Small jobs for other studios. Quick money and research data — the classic way to keep the lights on between shows.
          </p>
          <div className="space-y-2">
            {run.contracts.map((c) => (
              <div key={c.id} className="ink-card flex items-center gap-3 p-3">
                <span className="rounded-lg bg-panel3 p-2" style={{ color: POINT_COLOR[c.type] }}>
                  <Briefcase size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{c.name}</div>
                  <div className="text-[11px] text-paper/55">
                    Needs <b style={{ color: POINT_COLOR[c.type] }}>{c.target} {c.type}</b> points · {c.weeks} weeks
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-sm font-extrabold text-gold">{formatGBP(c.pay)}</div>
                  <div className="text-[10px] font-bold text-viol">+{c.rd} RD</div>
                </div>
                <Btn variant="cyan" className="!px-3 !py-1.5 text-xs" onClick={() => onContract(c)}>
                  TAKE
                </Btn>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------ FACILITIES */}
      {modal === "market" && (
        <Modal title="THE MARKET" onClose={() => setModal(null)}>
          <MarketPanel
            run={run}
            setRun={setRun}
            onCommission={(c) => {
              setModal(null);
              onCommission(c);
            }}
          />
        </Modal>
      )}

      {modal === "facilities" && (
        <Modal title="STUDIO ROOMS" onClose={() => setModal(null)}>
          <FacilitiesPanel
            run={run}
            onBuy={(id) => {
              sfx.cash();
              setRun((r) => buyFacility(r, id) ?? r);
            }}
          />
        </Modal>
      )}

      {/* -------------------------------------------------------- PROJECTS */}
      {modal === "projects" && (
        <Modal title="PROJECT BOARD" onClose={() => setModal(null)}>
          <ProjectsPanel
            run={run}
            onAssign={(projectId, staffId) => {
              sfx.click();
              setRun((r) => assignToProject(r, projectId, staffId));
            }}
            onMilestone={(id) => {
              setModal(null);
              onMilestone(id);
            }}
            onShip={(id) => {
              setModal(null);
              onShip(id);
            }}
            onSkipWeek={onSkipWeek}
            onNewShow={() => {
              setModal(null);
              onNewShow();
            }}
            onContinueSeason={(key) => {
              setModal(null);
              onContinue({ key, kind: "season" });
            }}
            onDelegate={(projectId, headSlot: HeadSlot | null) => {
              sfx.whoosh();
              setRun((r) => setDelegation(r, projectId, headSlot) ?? r);
            }}
            onTakeOver={(projectId) => {
              sfx.click();
              setRun((r) => takeOver(r, projectId));
            }}
            onResume={(projectId) => {
              sfx.click();
              setRun((r) => resumeAuto(r, projectId));
            }}
          />
        </Modal>
      )}

      {/* ----------------------------------------------------------- STAFF */}
      {modal === "staff" && (
        <Modal title="STAFF ROOM" onClose={() => setModal(null)}>
          <CrewPanel run={run} setRun={setRun} maxStaff={staffCapacity(run)} />
        </Modal>
      )}

      {/* -------------------------------------------------------- RESEARCH */}
      {modal === "research" && (
        <Modal title="RESEARCH & DEVELOPMENT" onClose={() => setModal(null)}>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-viol/40 bg-viol/10 p-2.5">
            <Database size={16} className="text-viol" />
            <span className="text-sm font-bold">
              {run.rd} Research Data
            </span>
            <span className="ml-auto text-[11px] text-paper/50">Earn RD by shipping shows, fixing editing notes and taking contracts.</span>
          </div>
          <div className="mb-2 text-xs font-bold tracking-widest text-paper/50">STUDIO TECH</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {RESEARCH.map((u) => {
              const owned = run.research.includes(u.id);
              const pending = run.researchJobs.find((j) => j.researchId === u.id);
              return (
                <div key={u.id} className={cn("ink-card p-3", owned && "border-mint/50")}>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-viol" />
                    <span className="font-display text-sm font-extrabold">{u.name}</span>
                  </div>
                  <div className="mt-0.5 text-[11px] text-paper/55">{u.desc}</div>
                  <div className="mt-2">
                    {owned ? (
                      <span className="text-xs font-bold text-mint">RESEARCHED ✓</span>
                    ) : pending ? (
                      <span className="text-xs font-bold text-cyanx">IN RESEARCH · {Math.max(0, pending.completesWeek - run.week)} WK</span>
                    ) : (
                      <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={run.rd < u.rd} onClick={() => research(u.id, u.rd)}>
                        START · {u.rd} RD
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mb-2 mt-4 text-xs font-bold tracking-widest text-paper/50">GENRE LICENCES</div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {GENRES.filter((g) => g.rd > 0).map((g) => {
              const owned = run.genresUnlocked.includes(g.id);
              const Icon = g.icon;
              return (
                <button
                  key={g.id}
                  disabled={owned || run.rd < g.rd}
                  onClick={() => unlockGenre(g.id, g.rd)}
                  className={cn(
                    "btn-press flex items-center gap-1.5 rounded-xl border p-2 text-left",
                    owned ? "border-mint/50 bg-mint/5" : run.rd >= g.rd ? "border-line bg-panel2 hover:border-gold" : "border-line/50 opacity-45"
                  )}
                >
                  <Icon size={14} style={{ color: g.color }} />
                  <span className="text-xs font-bold">{g.label}</span>
                  <span className="ml-auto text-[10px] font-bold text-viol">{owned ? "✓" : `${g.rd}`}</span>
                </button>
              );
            })}
            {!run.mediumsUnlocked.includes("movie") ? (
              <button
                disabled={run.rd < MEDIUMS.movie.rd}
                onClick={unlockMovie}
                className={cn(
                  "btn-press flex items-center gap-1.5 rounded-xl border p-2 text-left",
                  run.rd >= MEDIUMS.movie.rd ? "border-gold/60 bg-gold/10" : "border-line/50 opacity-45"
                )}
              >
                <Clapperboard size={14} className="text-gold" />
                <span className="text-xs font-bold">Films</span>
                <span className="ml-auto text-[10px] font-bold text-viol">{MEDIUMS.movie.rd}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 rounded-xl border border-mint/50 bg-mint/5 p-2">
                <Clapperboard size={14} className="text-gold" />
                <span className="text-xs font-bold">Films</span>
                <span className="ml-auto text-[10px] font-bold text-mint">✓</span>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* -------------------------------------------------------- RELOCATE */}
      {modal === "relocate" && nextOffice && (
        <Modal title="RELOCATE STUDIO" onClose={() => setModal(null)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="ink-card p-4">
              <div className="text-[10px] font-bold tracking-widest text-paper/40">CURRENT</div>
              <div className="font-display text-lg font-extrabold">{off.name}</div>
              <div className="mt-2 space-y-1 text-xs text-paper/60">
                <div>Desks: {off.maxStaff} staff</div>
                <div>Project slots: {off.projects}</div>
                <div>Room slots: {off.slots}</div>
                <div>Rent: {formatGBP(off.rent)}/week</div>
              </div>
            </div>
            <div className="ink-card border-gold/50 p-4">
              <div className="text-[10px] font-bold tracking-widest text-gold">AVAILABLE</div>
              <div className="font-display text-lg font-extrabold text-gold">{nextOffice.name}</div>
              <div className="mt-1 text-[11px] italic text-paper/60">{nextOffice.blurb}</div>
              <div className="mt-2 space-y-1 text-xs text-paper/60">
                <div className="text-mint">Desks: {nextOffice.maxStaff} staff</div>
                <div className="text-mint">Project slots: {nextOffice.projects}</div>
                <div className="text-mint">Room slots: {nextOffice.slots}</div>
                <div>Rent: {formatGBP(nextOffice.rent)}/week</div>
                {roomsUsed > 0 && (
                  <div className="text-[10px] text-paper/45">Your {roomsUsed} built room{roomsUsed > 1 ? "s" : ""} and all upgrades move with you — nothing is lost.</div>
                )}
              </div>
              <Btn variant="gold" className="mt-3 w-full" disabled={run.cash < nextOffice.cost} onClick={relocate}>
                MOVE IN — {formatGBP(nextOffice.cost)}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ---------------------------------------------------------- AWARDS */}
      {modal === "awards" && (
        <Modal title="LONDON ANIME AWARDS" onClose={() => setModal(null)}>
          {run.awardsCeremony ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-gold/50 bg-gold/10 p-3 text-center">
                <div className="text-[10px] font-bold tracking-widest text-gold">YEAR {run.awardsCeremony.year} RESULTS</div>
                <div className="font-display text-2xl font-extrabold text-gold">
                  {run.awardsCeremony.playerAwards > 0
                    ? `${run.studio} wins ${run.awardsCeremony.playerAwards} award${run.awardsCeremony.playerAwards > 1 ? "s" : ""}!`
                    : "No awards this year."}
                </div>
              </div>
              {run.awardsCeremony.categories.map((cat) => (
                <div key={cat.name} className="ink-card p-3">
                  <div className="flex items-center gap-2">
                    <Award size={14} className="text-gold" />
                    <span className="font-display text-sm font-extrabold">{cat.name}</span>
                  </div>
                  <div className="mb-2 mt-0.5 text-[10px] text-paper/50">{cat.blurb}</div>
                  <div className="space-y-1">
                    {cat.nominees.map((n) => (
                      <div
                        key={n.title + n.studio}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                          n === cat.winner ? "border-gold/70 bg-gold/10" : "border-line/60 bg-panel2/50 opacity-70"
                        )}
                      >
                        <span className="truncate font-bold">{n.title}</span>
                        <span className="text-[10px] text-paper/50">{n.studio}</span>
                        <span className="ml-auto font-display font-extrabold text-gold">{n.score}/40</span>
                        {n === cat.winner && <Trophy size={13} className="text-gold" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-paper/40">
              No ceremony yet. The first London Anime Awards land at the end of Year 1 — rival studios are already
              rolling out their shows…
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Rec k="Awards won" v={String(run.awards)} />
            <Rec k="This year's slate" v={String(run.yearShows.length)} />
            <Rec k="Rival premieres this year" v={String(run.rivalWorld.studios.reduce((a, s) => a + s.productions.length, 0))} />
            <Rec k="Best score" v={`${run.bestScore}/40`} />
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- HOF */}
      {modal === "sequels" && (
        <Modal title="FRANCHISE LIBRARY" onClose={() => setModal(null)}>
          <LibraryPanel
            run={run}
            setRun={setRun}
            onContinue={(plan) => {
              setModal(null);
              onContinue(plan);
            }}
          />
        </Modal>
      )}

      {/* ---------------------------------------------------------- RIVALS */}
      {modal === "rivals" && (
        <Modal title="THE INDUSTRY" onClose={() => setModal(null)}>
          <RivalsPanel run={run} setRun={setRun} />
        </Modal>
      )}

      {/* --------------------------------------------------------- DYNASTY */}
      {modal === "dynasty" && (
        <Modal title="STUDIO DYNASTY" onClose={() => setModal(null)}>
          <DynastyPanel
            run={run}
            onBuy={(id) => {
              sfx.cash();
              setRun((r) => buyInvestment(r, id) ?? r);
            }}
          />
        </Modal>
      )}

      {modal === "hof" && (
        <Modal title="STUDIO RECORDS" onClose={() => setModal(null)}>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">
            <Crown size={14} /> ALL-TIME INDUSTRY RECORDS
          </div>
          <div className="mb-3 space-y-1.5">
            {computeIndustryRecords(run).map((r) => (
              <div
                key={r.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
                  r.player ? "border-gold/60 bg-gold/10" : "border-line/60 bg-panel2/50"
                )}
              >
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-bold">{r.label}:</span>{" "}
                  <span className="text-paper/70">{r.holder}</span>
                  {r.title && <span className="text-paper/40"> — “{r.title}”</span>}
                </span>
                <span className="shrink-0 font-display font-extrabold text-gold">
                  {r.id === "grossing" || r.id === "movie"
                    ? formatGBPShort(r.value)
                    : r.id === "fanbase"
                      ? formatNum(r.value)
                      : r.id === "franchise"
                        ? `${r.value} entries`
                        : `${r.value}`}
                </span>
                {r.player && <Crown size={12} className="shrink-0 text-gold" />}
              </div>
            ))}
          </div>

          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-gold">
            <Trophy size={14} /> HALL OF FAME (32+/40)
          </div>
          {run.hallOfFame.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-paper/40">
              No hall-of-fame shows yet. Score 32/40 to immortalise a show.
            </div>
          ) : (
            <div className="space-y-1.5">
              {run.hallOfFame.map((h, i) => {
                /* every hall-of-famer is a chapter of some franchise's history */
                const fr = Object.values(run.franchises).find((f) =>
                  f.entries.some((e) => e.title === h.title)
                );
                return (
                  <div key={i} className="ink-card flex items-center gap-2 p-2">
                    <Portrait img={castById(h.protag).img} pos={castById(h.protag).pos} alt="" className="h-9 w-9 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold" style={hofTitleStyle(h)}>{h.title}</div>
                      <div className="text-[10px] text-paper/50">
                        {h.genres.map((g) => GENRES.find((x) => x.id === g)?.label).join(" × ")} · {dateLabel(h.week)}
                      </div>
                      {fr && (
                        <button
                          className="text-[10px] font-bold text-cyanx"
                          onClick={() => setModal("sequels")}
                        >
                          {fr.baseTitle} franchise · {fr.entries.length} entr{fr.entries.length === 1 ? "y" : "ies"} · pop {fr.popularity} →
                        </button>
                      )}
                    </div>
                    <div className="font-display text-base font-extrabold text-gold">{h.score}/40</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">
            <ChevronRight size={14} /> COMBO RESEARCH
          </div>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {Object.entries(run.comboLevels).length === 0 && (
              <div className="text-sm text-paper/40">Try genre pairings to build up combo knowledge.</div>
            )}
            {Object.entries(run.comboLevels).map(([k, lv]) => (
              <div key={k} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/60 px-2.5 py-1.5">
                <span className="truncate text-xs font-bold">
                  {k.split("|").map((g) => GENRES.find((x) => x.id === g)?.label ?? g).join(" × ")}
                </span>
                <span className="ml-auto flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={cn("h-2 w-2 rounded-full", n <= lv ? "bg-gold" : "bg-panel3")} />
                  ))}
                </span>
              </div>
            ))}
          </div>

          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-mint">
            <ChevronRight size={14} /> CAST CHEMISTRY (discovered by experimenting)
          </div>
          {run.castCombos.length === 0 ? (
            <div className="text-sm text-paper/40">Some casts just click. Ship odd combinations to find out which.</div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {run.castCombos.map((id) => {
                const c = CAST_CHEMS.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-2.5 py-1.5">
                    <span className="truncate text-xs font-bold text-mint">{c.name}</span>
                    <span className="ml-auto text-[10px] font-extrabold text-gold">×{c.mult.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mb-2 mt-4 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">
            <ChevronRight size={14} /> ARC SYNERGIES (discovered by experimenting)
          </div>
          {run.arcCombos.length === 0 ? (
            <div className="text-sm text-paper/40">Some story arcs amplify each other. Ship the right pairings to find out.</div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {run.arcCombos.map((id) => {
                const c = ARC_COMBOS.find((x) => x.id === id);
                if (!c) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-lg border border-cyanx/40 bg-cyanx/5 px-2.5 py-1.5">
                    <span className="truncate text-xs font-bold text-cyanx">{c.name}</span>
                    <span className="ml-auto text-[10px] font-extrabold text-gold">
                      {c.q >= 0 ? "+" : ""}
                      {c.q} Q{c.f ? ` · +${Math.round(c.f * 100)}% fans` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Rec k="Shows aired" v={String(run.showsMade)} />
            <Rec k="Best score" v={`${run.bestScore}/40`} />
            <Rec k="Lifetime revenue" v={formatGBPShort(run.totalRevenue)} />
            <Rec k="Awards won" v={String(run.awards)} />
            <Rec k="Structures studied" v={String(run.arcUnlocked.length)} />
          </div>
        </Modal>
      )}
    </div>
  );
}

function Rec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel2/60 p-2.5 text-center">
      <div className="text-[9px] font-bold tracking-wider text-paper/40">{k.toUpperCase()}</div>
      <div className="mt-0.5 truncate font-display text-sm font-extrabold">{v}</div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-3 backdrop-blur-sm" onClick={onClose}>
      <div
        className="anim-pop nice-scroll max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-line bg-panel p-4 md:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">{title}</h3>
          <button onClick={onClose} className="btn-press rounded-lg border border-line p-1.5 text-paper/60 hover:bg-panel3" aria-label="Close">
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export { Lock };
