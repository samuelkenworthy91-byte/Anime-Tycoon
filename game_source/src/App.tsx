import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Home, Volume2, VolumeX, Keyboard, HardDriveDownload, ChevronLeft, Check } from "lucide-react";
import { FxProvider, Btn } from "./fx/fx";
import { isMuted, primeAudio, setMuted, sfx } from "./engine/audio";
import { ARCS, type Contract, type Draft } from "./engine/data";
import type { ShowResult } from "./engine/scoring";
import {
  advanceWeeks,
  applyMilestone,
  initialRun,
  tickStudioDay,
  tickStudioWorkPulse,
  tickEditWorkPulse,
  tickEditDay,
  MAX_WEEKS,
  type DeskPulse,
  migrateRun,
  projectById,
  releaseProject,
  sellReadyProject,
  startBlockReason,
  startContractAssignment,
  startProject,
  type RunState,
} from "./engine/state";
import { applyWeeklyInsolvency } from "./engine/insolvency";
import { randomStartingGenres } from "./engine/startingGenres";
import type { MilestoneId, MilestoneOutcome } from "./engine/projects";
import { clearAllSaves, loadSlot, saveSlot, slotLabel, type SaveData, type SlotId } from "./engine/storage";
import SaveSlots from "./components/SaveSlots";
import Title from "./components/Title";
import Office from "./components/Office";
import Create from "./components/Create";
import { type Commission } from "./engine/market";
import { type ContinuationPlan } from "./components/Library";
import Produce from "./components/Produce";
import Ship from "./components/Ship";
import ContractJob from "./components/ContractJob";
import Release from "./components/Release";
import GameOver from "./components/GameOver";
import Retrospective from "./components/Retrospective";
import { beginDynastyMode } from "./engine/legacy";
import { liveWorkPulseGapMs } from "./engine/studioOps";
import AwardsCeremony from "./components/AwardsCeremony";
import DecisionEventOverlay from "./components/DecisionEventOverlay";
import LicensedCreate from "./components/LicensedCreate";
import AuctionForecast from "./components/AuctionForecast";
import AuctionCeremony from "./components/AuctionCeremony";
import { resolveStudioEvent } from "./engine/events";
import { cn } from "./utils/cn";
import StaffLevelUpModal from "./components/StaffLevelUpModal";
import ShowrunnerLevelUpModal from "./components/ShowrunnerLevelUpModal";

type Screen = "title" | "office" | "create" | "licensed" | "produce" | "ship" | "contract" | "release" | "gameover" | "retrospective" | "awards" | "auction";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  /** commission brief carried into the Create screen (null = self-funded) */
  const [pendingCommission, setPendingCommission] = useState<Commission | null>(null);
  const [run, setRun] = useState<RunState | null>(null);
  const [meta, setMeta] = useState({ studio: "Anime Runner", showrunner: "steady" });
  /** the draft+result of the show whose reviews are on screen */
  const [released, setReleased] = useState<{ draft: Draft; result: ShowResult } | null>(null);
  /** the milestone sprint currently being played */
  const [focus, setFocus] = useState<{ projectId: string; milestone: MilestoneId } | null>(null);
  /** the project on the release-prep screen */
  const [shipId, setShipId] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [contPlan, setContPlan] = useState<ContinuationPlan | null>(null);
  const [licensedIpId, setLicensedIpId] = useState<string | null>(null);
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [timeSpeed, setTimeSpeed] = useState<0 | 1 | 4 | 8 | 12>(1);
  const [workPulses, setWorkPulses] = useState<DeskPulse[]>([]);
  const [muteUI, setMuteUI] = useState(isMuted());
  /* GDS-style live studio clock: one in-game day = 10 real seconds at 1×. */
  const [clockDay, setClockDay] = useState(0);
  const [clockPhase, setClockPhase] = useState(0);
  const dayAccRef = useRef(0);
  const dayCountRef = useRef(0);

  const canPause = screen !== "title" && screen !== "gameover" && screen !== "retrospective";
  /* bumped whenever a save is written/cleared so the title screen re-reads it */
  const [saveStamp, setSaveStamp] = useState(0);

  /* slot picker shown over the pause menu */
  const [savePicker, setSavePicker] = useState(false);
  const [savedTo, setSavedTo] = useState<SlotId | null>(null);

  /** the current career, packaged for storage */
  const snapshot = useCallback((): SaveData | null => {
    if (!run) return null;
    return {
      run,
      meta,
      clock: { day: clockDay, phase: clockPhase, acc: dayAccRef.current, dayCount: dayCountRef.current },
      summary: {
        studio: run.studio,
        week: run.week,
        cash: run.cash,
        fans: run.fans,
        shows: run.showsMade,
        officeLevel: run.officeLevel,
      },
    };
  }, [run, meta, clockDay, clockPhase]);

  /* ------------------------------------------------------------ autosave
   * The run is written to the rolling AUTOSAVE slot whenever it changes while
   * a career is in progress. Manual slots are only written from the pause
   * menu. Resuming always drops you back into the office, which is the only
   * safe re-entry point (mini-games are transient).                        */
  useEffect(() => {
    if (!run || screen === "title" || screen === "gameover") return;
    const snap = snapshot();
    if (snap) saveSlot("auto", snap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, meta, screen]);

  /* bankruptcy is the only way a studio dies — retire the save then */
  useEffect(() => {
    if (screen === "gameover") {
      clearAllSaves();
      setSaveStamp((n) => n + 1);
    }
  }, [screen]);

  /* ------------------------------------ awards: a new ceremony year pops
     the full-screen theatre; leaving returns to the office with the clock
     still paused (timeSpeed untouched) */
  const seenCeremonyYear = useRef(0);
  useEffect(() => {
    const year = run?.awardsCeremony?.year ?? 0;
    if (!year || year === seenCeremonyYear.current) return;
    if (screen === "office" || screen === "produce") {
      seenCeremonyYear.current = year;
      setTimeSpeed(0);      /* the live sim halts while the theatre is open */
      sfx.fanfare();
      setScreen("awards");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.awardsCeremony?.year, screen]);

  /* ------------------------------------ annual rights forecast: like other attention events,
     the live clock stops and the player explicitly decides whether to engage. */
  const seenAuctionPrompt = useRef<string | null>(null);
  useEffect(() => {
    const id = run?.ipMarket.pendingPromptId ?? null;
    if (!id || id === seenAuctionPrompt.current) return;
    if (screen === "office" || screen === "produce") {
      seenAuctionPrompt.current = id;
      setTimeSpeed(0);
      sfx.fanfare();
    }
  }, [run?.ipMarket.pendingPromptId, screen]);

  const pendingShowrunnerLevelUp = (run?.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0;
  const pendingLevelUp = pendingShowrunnerLevelUp || !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);
  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);

  /* ------------------------------------------------------- game clock */
  useEffect(() => {
    const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
    if ((screen !== "office" && !liveEditing) || paused || !run) return;
    const DAY_MS = 10_000;
    const iv = setInterval(() => {
      if (timeSpeed === 0) return;
      dayAccRef.current += 250 * timeSpeed;
      if (dayAccRef.current >= DAY_MS) {
        dayAccRef.current -= DAY_MS;
        dayCountRef.current += 1;
        const weekBoundary = dayCountRef.current >= 7;
        if (weekBoundary) dayCountRef.current = 0;
        setClockDay(dayCountRef.current);
        setRun((current) => {
          if (!current) return current;
          const dayRun = { ...current, day: (current.day ?? current.week * 7) + 1 };
          const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
          const daily = liveEditing && focus ? tickEditDay(dayRun, focus.projectId) : tickStudioDay(dayRun);
          let n = daily.run;
          setWorkPulses(daily.pulses);
          if (daily.attention) setTimeSpeed(0);
          if (weekBoundary) {
            const before = n;
            n = advanceWeeks(n, 1, { liveDaysAlreadyApplied: true });
            const attention =
              n.projects.some((p) => p.milestone && !p.rush && !before.projects.find((x) => x.id === p.id)?.milestone) ||
              n.projects.some((p) => p.stage === "ready" && before.projects.find((x) => x.id === p.id)?.stage !== "ready") ||
              n.marketEvents.length > before.marketEvents.length || n.studioEvents.length > before.studioEvents.length || n.staffEvents.length > before.staffEvents.length ||
              n.contractJobs.length < before.contractJobs.length || n.trainingJobs.length < before.trainingJobs.length || n.researchJobs.length < before.researchJobs.length;
            if (attention) setTimeSpeed(0);

            const insolvency = applyWeeklyInsolvency(n);
            n = insolvency.run;
            if (insolvency.reprieveIssued) setTimeSpeed(0);
            if (insolvency.shutdown) {
              setTimeSpeed(0);
              setScreen("gameover");
              return n;
            }

            if (n.week >= MAX_WEEKS && !n.dynasty) setScreen("retrospective");
          }
          return n;
        });
      }
      setClockPhase(Math.floor((dayAccRef.current / DAY_MS) * 4));
    }, 250);
    return () => clearInterval(iv);
  }, [screen, paused, timeSpeed, run !== null, run?.week, focus?.milestone, focus?.projectId]);

  /* Visible desk/edit bubbles are the actual unit of work. */
  useEffect(() => {
    const liveEditing = screen === "produce" && focus?.milestone === "edit" && !!focus.projectId;
    if ((screen !== "office" && !liveEditing) || paused || timeSpeed === 0 || !run) return;
    const gap = liveWorkPulseGapMs(timeSpeed);
    const iv = window.setInterval(() => {
      setRun((current) => {
        if (!current) return current;
        const live = liveEditing && focus ? tickEditWorkPulse(current, focus.projectId) : tickStudioWorkPulse(current);
        setWorkPulses(live.pulses);
        if (live.attention) setTimeSpeed(0);
        return live.run;
      });
    }, gap);
    return () => window.clearInterval(iv);
  }, [screen, paused, timeSpeed, run !== null, focus?.milestone, focus?.projectId]);

  /* --------------------------------------------------------- lifecycle */
  const loadRun = useCallback((slot: SlotId) => {
    const save = loadSlot(slot);
    if (!save) return;
    primeAudio();
    sfx.fanfare();
    const resumed = migrateRun(save.run);
    setMeta(save.meta);
    setRun(resumed);
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setContPlan(null);
    setPaused(false);
    setTimeSpeed(1);
    setSavePicker(false);
    seenCeremonyYear.current = resumed.awardsCeremony?.year ?? 0; /* an already-seen ceremony must not re-pop */
    dayAccRef.current = save.clock?.acc ?? 0;
    dayCountRef.current = save.clock?.dayCount ?? 0;
    setClockDay(save.clock?.day ?? 0);
    setClockPhase(save.clock?.phase ?? 0);
    /* a save parked exactly at the career end re-opens the retrospective */
    setScreen(resumed.week >= MAX_WEEKS && !resumed.dynasty ? "retrospective" : "office");
  }, []);

  const startRun = useCallback((studio: string, showrunner: string) => {
    primeAudio();
    sfx.fanfare();
    clearAllSaves();
    setMeta({ studio, showrunner });
    setRun({ ...initialRun(studio, showrunner), genresUnlocked: randomStartingGenres() });
    seenCeremonyYear.current = 0;
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setContPlan(null);
    setPaused(false);
    setTimeSpeed(1);
    setScreen("office");
  }, []);

  const restart = useCallback(() => {
    sfx.fanfare();
    clearAllSaves();
    setRun({ ...initialRun(meta.studio, meta.showrunner), genresUnlocked: randomStartingGenres() });
    seenCeremonyYear.current = 0;
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setContPlan(null);
    setPaused(false);
    setTimeSpeed(1);
    setScreen("office");
  }, [meta]);

  const quitToTitle = useCallback(() => {
    sfx.back();
    setPaused(false);
    setScreen("title");
  }, []);

  /** from the retrospective: the campaign ends, the save lives on */
  const continueDynasty = useCallback(() => {
    if (!run) return;
    sfx.fanfare();
    setRun(beginDynastyMode(run));
    setScreen("office");
  }, [run]);


  /* --------------------------------------------------------- show flow */
  const newShow = useCallback((key?: string) => {
    sfx.select();
    setContPlan(key ? { key, kind: "season" } : null);
    setPendingCommission(null);
    setScreen("create");
  }, []);

  const licensedShow = useCallback((ipId: string) => {
    sfx.select(); setContPlan(null); setPendingCommission(null); setLicensedIpId(ipId); setScreen("licensed");
  }, []);

  const enterAuction = useCallback((id: string) => {
    sfx.select(); setAuctionId(id); setTimeSpeed(0); setScreen("auction");
  }, []);

  /** a continuation chosen in the franchise library */
  const continueFranchise = useCallback((plan: ContinuationPlan) => {
    sfx.select();
    setContPlan(plan);
    setPendingCommission(null);
    setScreen("create");
  }, []);

  /** a commission brief was accepted on the market screen */
  const takeCommission = useCallback((c: Commission) => {
    sfx.select();
    setContPlan(null);
    setPendingCommission(c);
    setScreen("create");
  }, []);

  const unlockArc = useCallback(
    (id: string, cost: number) => {
      if (!run || run.rd < cost) return;
      sfx.fanfare();
      setRun((r) =>
        r
          ? {
              ...r,
              rd: r.rd - cost,
              arcUnlocked: [...r.arcUnlocked, id],
              notices: [...r.notices, `Story structure studied: ${ARCS.find((a) => a.id === id)?.name}!`],
            }
          : r
      );
    },
    [run]
  );

  /* greenlight: the show enters the pipeline as a project — no time skip.
     If the board refuses (capacity, cash, continuation rules) the player
     stays on the greenlight screen and gets told why — never a silent kick
     back to the office. */
  const beginProduction = useCallback(
    (d: Draft) => {
      if (!run) return;
      const next = startProject(run, d, pendingCommission ?? undefined);
      if (!next) {
        sfx.back();
        setRun((r) =>
          r
            ? {
                ...r,
                notices: [
                  ...r.notices,
                  startBlockReason(r, d) ?? "The production board refuses this greenlight right now.",
                ],
              }
            : r
        );
        return;
      }
      sfx.whoosh();
      setRun(next);
      setPendingCommission(null);
      setScreen("office");
    },
    [run, pendingCommission]
  );

  /* ------------------------------------------------- milestone sprints */
  const openMilestone = useCallback(
    (projectId: string) => {
      if (!run) return;
      const p = projectById(run, projectId);
      if (!p?.milestone) return;
      sfx.select();
      setFocus({ projectId, milestone: p.milestone });
      setScreen("produce");
    },
    [run]
  );

  const finishMilestone = useCallback(
    (o: MilestoneOutcome) => {
      if (!focus) return;
      sfx.reveal();
      setRun((r) => (r ? applyMilestone(r, focus.projectId, o) : r));
      setFocus(null);
      setScreen("office");
    },
    [focus]
  );

  /* --------------------------------------------------------- release */
  const openShip = useCallback((projectId: string) => {
    sfx.select();
    setShipId(projectId);
    setScreen("ship");
  }, []);

  const airShow = useCallback(
    (spent: number, hype: number) => {
      if (!run || !shipId) return;
      const p = projectById(run, shipId);
      if (!p) return;
      let out: ReturnType<typeof releaseProject>;
      try {
        out = releaseProject(run, shipId, { spent, hype });
      } catch (error) {
        console.error("Release failed", error);
        window.alert("RELEASE FAILED — this production could not be finalised. Your save has not been altered.");
        return;
      }
      if (!out) {
        window.alert("RELEASE FAILED — this production is not in a valid state to air. Your save has not been altered.");
        return;
      }
      sfx.reveal();
      setRun(out.run);
      setReleased({ draft: p.draft, result: out.result });
      setShipId(null);
      setScreen("release");
    },
    [run, shipId]
  );

  const sellShow = useCallback((offerId: string) => {
    if (!run || !shipId) return;
    const out = sellReadyProject(run, shipId, offerId);
    if (!out) return;
    sfx.cash();
    setRun(out.run);
    setShipId(null);
    setScreen("office");
  }, [run, shipId]);

  const continueFromRelease = useCallback(() => {
    setReleased(null);
    setScreen("office");
  }, []);


  /* ----------------------------------------------------- contract flow */
  const takeContract = useCallback((c: Contract) => {
    sfx.select();
    setContract(c);
    setScreen("contract");
  }, []);

  const finishContract = useCallback(
    (selection: { staffIds: string[]; showrunner: boolean }) => {
      if (!run || !contract) return;
      const next = startContractAssignment(run, contract, selection.staffIds, selection.showrunner);
      if (!next) { sfx.back(); return; }
      setRun(next);
      setContract(null);
      setScreen("office");
    },
    [run, contract]
  );

  /* --------------------------------------------------------- hotkeys */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key.toLowerCase() === "p") {
        if (canPause) {
          setPaused((p) => !p);
          sfx.click();
        }
      }
      if (e.key.toLowerCase() === "m") {
        const m = !isMuted();
        setMuted(m);
        setMuteUI(m);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [canPause]);

  const pauseMenu = useMemo(
    () => (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-abyss/85 backdrop-blur-md">
        <div className="anim-pop ink-card w-80 space-y-3 p-5 text-center">
          <div className="font-jp text-[10px] tracking-[0.5em] text-neon">PAUSE</div>
          <h2 className="font-display text-3xl font-extrabold">PAUSED</h2>
          <div className="space-y-2 pt-1">
            <Btn big variant="primary" className="w-full" onClick={() => setPaused(false)}>
              <Play size={18} /> RESUME
            </Btn>
            <Btn
              variant="cyan"
              className="w-full"
              onClick={() => {
                sfx.select();
                setSavedTo(null);
                setSavePicker(true);
              }}
            >
              <HardDriveDownload size={16} /> SAVE GAME
            </Btn>
            <Btn variant="gold" className="w-full" onClick={restart}>
              <RotateCcw size={16} /> INSTANT RESTART
            </Btn>
            <Btn variant="ghost" className="w-full" onClick={quitToTitle}>
              <Home size={16} /> SAVE &amp; QUIT TO TITLE
            </Btn>
          </div>
          <div className="text-[10px] text-mint/70">
            Autosaving continuously — SAVE GAME writes a slot you can come back to.
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-line/60 pt-3 text-[10px] text-paper/40">
            <Keyboard size={12} /> Staff run production automatically · ENTER next · M mute · ESC pause
          </div>
        </div>
      </div>
    ),
    [restart, quitToTitle]
  );

  /* ------------------------------------------------- save slot picker */
  const savePickerOverlay = (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-abyss/90 p-4 backdrop-blur-md">
      <div className="anim-pop ink-card w-full max-w-sm space-y-3 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display flex items-center gap-2 text-xl font-extrabold text-cyanx">
            <HardDriveDownload size={18} /> SAVE GAME
          </h2>
          <Btn variant="ghost" onClick={() => { sfx.back(); setSavePicker(false); }}>
            <ChevronLeft size={16} /> Back
          </Btn>
        </div>

        <SaveSlots
          mode="save"
          refreshKey={saveStamp}
          onChanged={() => setSaveStamp((n) => n + 1)}
          onPick={(id) => {
            const snap = snapshot();
            if (!snap) return;
            const ok = saveSlot(id, snap);
            setSavedTo(ok ? id : null);
            setSaveStamp((n) => n + 1);
            if (ok) sfx.fanfare();
          }}
        />

        {savedTo && (
          <div className="anim-pop flex items-center justify-center gap-2 rounded-xl border border-mint/50 bg-mint/10 px-3 py-2 text-xs font-bold text-mint">
            <Check size={14} /> Saved to {slotLabel(savedTo)}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <FxProvider>
      <div className="relative h-full w-full overflow-hidden bg-ink">
        {screen === "title" && <Title key={saveStamp} onStart={startRun} onLoad={loadRun} />}
        {screen === "office" && run && (
          <Office
            run={run}
            setRun={(fn) => setRun((r) => (r ? fn(r) : r))}
            onNewShow={newShow}
            onLicensed={licensedShow}
            onAuction={enterAuction}
            onContract={takeContract}
            onCommission={takeCommission}
            onContinue={continueFranchise}
            onMilestone={openMilestone}
            onShip={openShip}
            workPulses={workPulses}
            clockDay={clockDay}
            clockPhase={clockPhase}
          />
        )}
        {screen === "create" && run && (
          <Create
            run={run}
            plan={contPlan ?? undefined}
            commission={pendingCommission ?? undefined}
            paused={paused}
            onBegin={beginProduction}
            onCancel={() => {
              setPendingCommission(null);
              setScreen("office");
            }}
            onUnlockArc={unlockArc}
          />
        )}
        {screen === "licensed" && run && licensedIpId && (
          <LicensedCreate run={run} ipId={licensedIpId} onBegin={(d) => { beginProduction(d); setLicensedIpId(null); }} onCancel={() => { setLicensedIpId(null); setScreen("office"); }}/>
        )}
        {screen === "produce" && run && focus && projectById(run, focus.projectId) && (
          <Produce
            run={run}
            project={projectById(run, focus.projectId)!}
            milestone={focus.milestone}
            paused={paused}
            workPulses={workPulses}
            onDone={finishMilestone}
            onBack={() => {
              sfx.back();
              setFocus(null);
              setScreen("office");
            }}
          />
        )}
        {screen === "ship" && run && shipId && projectById(run, shipId) && (
          <Ship
            run={run}
            project={projectById(run, shipId)!}
            onAir={airShow}
            onSell={sellShow}
            onBack={() => {
              sfx.back();
              setShipId(null);
              setScreen("office");
            }}
          />
        )}
        {screen === "contract" && run && contract && (
          <ContractJob
            run={run}
            contract={contract}
            paused={paused}
            onDone={finishContract}
            onBack={() => { setContract(null); setScreen("office"); }}
          />
        )}
        {run && run.ipMarket.pendingPromptId && (screen === "office" || screen === "produce") && (
          <AuctionForecast run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} onEnter={enterAuction} />
        )}
        {screen === "auction" && run && auctionId && (
          <AuctionCeremony run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} auctionId={auctionId} onDone={() => { setAuctionId(null); setScreen("office"); }} />
        )}
        {screen === "awards" && run?.awardsCeremony && (
          <AwardsCeremony
            ceremony={run.awardsCeremony}
            studio={meta.studio}
            onDone={() => {
              setScreen("office");
              /* the clock stays paused — the player resumes time deliberately */
            }}
          />
        )}
        {screen === "release" && released && run && (
          <Release
            draft={released.draft}
            result={released.result}
            studio={run.studio}
            careerWeek={run.week}
            showsMadeBefore={Math.max(0, run.showsMade - 1)}
            onContinue={continueFromRelease}
          />
        )}
        {screen === "retrospective" && run && (
          <Retrospective run={run} onContinue={continueDynasty} onTitle={quitToTitle} />
        )}
        {screen === "gameover" && run && (
          <GameOver run={run} onRestart={restart} onTitle={quitToTitle} />
        )}

        {screen !== "title" && screen !== "gameover" && screen !== "retrospective" && (
          <div className="game-controls absolute right-3 top-2.5 z-[60] flex gap-1.5">
            {(screen === "office" || (screen === "produce" && focus?.milestone === "edit")) && ([0, 1, 4, 8, 12] as const).map((speed) => (
              <button key={speed} aria-label={`Time ${speed === 0 ? "paused" : `${speed}x`}`} onClick={() => { setTimeSpeed(speed); sfx.click(); }} className={cn("btn-press rounded-xl border px-2 py-1.5 text-[10px] font-extrabold", timeSpeed === speed ? "border-cyanx bg-cyanx/20 text-cyanx" : "border-line bg-panel2/90 text-paper/55")}>
                {speed === 0 ? "Ⅱ" : `${speed}×`}
              </button>
            ))}
            <button
              aria-label="Mute"
              onClick={() => {
                const m = !isMuted();
                setMuted(m);
                setMuteUI(m);
                sfx.click();
              }}
              className="btn-press rounded-xl border border-line bg-panel2/90 p-2 text-paper/70 hover:text-paper"
            >
              {muteUI ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>
            <button
              aria-label="Pause"
              onClick={() => canPause && setPaused((p) => !p)}
              className={cn("btn-press rounded-xl border border-line bg-panel2/90 p-2 text-paper/70 hover:text-paper", !canPause && "opacity-30")}
            >
              <Pause size={15} />
            </button>
          </div>
        )}

        {run && run.studioEvents.length > 0 && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && (
          <DecisionEventOverlay
            event={run.studioEvents[0]}
            onChoose={(choiceId) => {
              setTimeSpeed(0);
              setRun((current) => current ? (resolveStudioEvent(current, current.studioEvents[0].id, choiceId) ?? current) : current);
            }}
          />
        )}

        {run && (run.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0 && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <ShowrunnerLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}
        {run && !(run.showrunnerCareer?.pendingLevelUps?.length ?? 0) && run.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0) && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <StaffLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}

        {paused && pauseMenu}
        {paused && savePicker && savePickerOverlay}
      </div>
    </FxProvider>
  );
}