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
  MAX_WEEKS,
  migrateRun,
  projectById,
  releaseProject,
  startProject,
  type RunState,
} from "./engine/state";
import type { MilestoneId, MilestoneOutcome } from "./engine/projects";
import { clearAllSaves, loadSlot, saveSlot, slotLabel, type SaveData, type SlotId } from "./engine/storage";
import SaveSlots from "./components/SaveSlots";
import Title from "./components/Title";
import Office from "./components/Office";
import Create from "./components/Create";
import Produce from "./components/Produce";
import Ship from "./components/Ship";
import ContractJob from "./components/ContractJob";
import Release from "./components/Release";
import GameOver from "./components/GameOver";
import { cn } from "./utils/cn";

type Screen = "title" | "office" | "create" | "produce" | "ship" | "contract" | "release" | "gameover";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [run, setRun] = useState<RunState | null>(null);
  const [meta, setMeta] = useState({ studio: "Anime Runner", showrunner: "steady" });
  /** the draft+result of the show whose reviews are on screen */
  const [released, setReleased] = useState<{ draft: Draft; result: ShowResult } | null>(null);
  /** the milestone sprint currently being played */
  const [focus, setFocus] = useState<{ projectId: string; milestone: MilestoneId } | null>(null);
  /** the project on the release-prep screen */
  const [shipId, setShipId] = useState<string | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [sequelKey, setSequelKey] = useState<string | undefined>();
  const [paused, setPaused] = useState(false);
  const [victory, setVictory] = useState(false);
  const [muteUI, setMuteUI] = useState(isMuted());
  /* real-time game clock: 1 in-game day = 2 real minutes; 7 days = 1 week */
  const [clockDay, setClockDay] = useState(0);
  const [clockPhase, setClockPhase] = useState(0);
  const dayAccRef = useRef(0);
  const dayCountRef = useRef(0);

  const canPause = screen !== "title" && screen !== "gameover";
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

  /* a finished career is not resumable — retire the save */
  useEffect(() => {
    if (screen === "gameover") {
      clearAllSaves();
      setSaveStamp((n) => n + 1);
    }
  }, [screen]);

  /* ------------------------------------------------------- game clock */
  useEffect(() => {
    if (screen !== "office" || paused || !run) return;
    const iv = setInterval(() => {
      dayAccRef.current += 1000;
      if (dayAccRef.current >= 120_000) {
        dayAccRef.current -= 120_000;
        dayCountRef.current += 1;
        if (dayCountRef.current >= 7) {
          dayCountRef.current = 0;
          setRun((r) => {
            if (!r) return r;
            let n = advanceWeeks(r, 1);
            if (n.cash < 0) {
              if (n.bailouts < 2) {
                n = { ...n, bailouts: n.bailouts + 1, cash: n.cash + 150_000, notices: [...n.notices, "Emergency crowdfunding from the fans! (+£150,000)"] };
              } else {
                setVictory(false);
                setScreen("gameover");
                return n;
              }
            }
            if (n.week >= MAX_WEEKS) {
              setVictory(true);
              setScreen("gameover");
            }
            return n;
          });
        }
        setClockDay(dayCountRef.current);
      }
      setClockPhase(Math.floor((dayAccRef.current / 120_000) * 4));
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, paused, run !== null, run?.week]);

  /* --------------------------------------------------------- lifecycle */
  const loadRun = useCallback((slot: SlotId) => {
    const save = loadSlot(slot);
    if (!save) return;
    primeAudio();
    sfx.fanfare();
    setMeta(save.meta);
    setRun(migrateRun(save.run));
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setSequelKey(undefined);
    setVictory(false);
    setPaused(false);
    setSavePicker(false);
    dayAccRef.current = save.clock?.acc ?? 0;
    dayCountRef.current = save.clock?.dayCount ?? 0;
    setClockDay(save.clock?.day ?? 0);
    setClockPhase(save.clock?.phase ?? 0);
    setScreen("office");
  }, []);

  const startRun = useCallback((studio: string, showrunner: string) => {
    primeAudio();
    sfx.fanfare();
    clearAllSaves();
    setMeta({ studio, showrunner });
    setRun(initialRun(studio, showrunner));
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setSequelKey(undefined);
    setVictory(false);
    setPaused(false);
    setScreen("office");
  }, []);

  const restart = useCallback(() => {
    sfx.fanfare();
    clearAllSaves();
    setRun(initialRun(meta.studio, meta.showrunner));
    setReleased(null);
    setFocus(null);
    setShipId(null);
    setContract(null);
    setSequelKey(undefined);
    setVictory(false);
    setPaused(false);
    setScreen("office");
  }, [meta]);

  const quitToTitle = useCallback(() => {
    sfx.back();
    setPaused(false);
    setScreen("title");
  }, []);

  /** apply time + check for bankruptcy / end of career */
  const settle = useCallback((next: RunState, weeks: number): RunState => {
    let r = advanceWeeks(next, weeks);
    if (r.cash < 0) {
      if (r.bailouts < 2) {
        r = {
          ...r,
          bailouts: r.bailouts + 1,
          cash: r.cash + 150_000,
          notices: [...r.notices, "Emergency crowdfunding from the fans! (+£150,000)"],
        };
      } else {
        setVictory(false);
        setScreen("gameover");
        return r;
      }
    }
    if (r.week >= MAX_WEEKS) {
      setVictory(true);
      setScreen("gameover");
    }
    return r;
  }, []);

  /* --------------------------------------------------------- show flow */
  const newShow = useCallback((key?: string) => {
    sfx.select();
    setSequelKey(key);
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

  /* greenlight: the show enters the pipeline as a project — no time skip */
  const beginProduction = useCallback((d: Draft) => {
    setRun((r) => {
      if (!r) return r;
      const next = startProject(r, d);
      if (!next) return r;
      sfx.whoosh();
      return next;
    });
    setScreen("office");
  }, []);

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
      const out = releaseProject(run, shipId, { spent, hype });
      if (!out) return;
      sfx.reveal();
      setRun(out.run);
      setReleased({ draft: p.draft, result: out.result });
      setShipId(null);
      setScreen("release");
    },
    [run, shipId]
  );

  const continueFromRelease = useCallback(() => {
    setReleased(null);
    setScreen("office");
  }, []);

  /* one deliberate week of studio time from the project board */
  const skipWeek = useCallback(() => {
    sfx.click();
    setRun((r) => (r ? settle(r, 1) : r));
  }, [settle]);

  /* ----------------------------------------------------- contract flow */
  const takeContract = useCallback((c: Contract) => {
    sfx.select();
    setContract(c);
    setScreen("contract");
  }, []);

  const finishContract = useCallback(
    (success: boolean, scored: number) => {
      if (!run || !contract) return;
      const next: RunState = {
        ...run,
        cash: run.cash + (success ? contract.pay : 0),
        rd: run.rd + (success ? contract.rd : Math.max(1, Math.round(contract.rd / 3))),
        staff: run.staff.map((s) => ({ ...s, stamina: Math.max(20, s.stamina - 10) })),
        notices: [
          ...run.notices,
          success
            ? `Contract delivered: ${contract.name} (+£${contract.pay.toLocaleString("en-GB")}).`
            : `Contract failed: ${contract.name} — ${scored}/${contract.target} points.`,
        ],
        contracts: run.contracts.filter((x) => x.id !== contract.id),
      };
      const settled = settle(next, contract.weeks);
      setRun(settled);
      setContract(null);
      if (settled.cash >= 0 && settled.week < MAX_WEEKS) setScreen("office");
    },
    [run, contract, settle]
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
            <Keyboard size={12} /> Tap bubbles · keys 1-7 per desk · SPACE top bubble · ENTER next · M mute · ESC pause
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
            onContract={takeContract}
            onMilestone={openMilestone}
            onShip={openShip}
            onSkipWeek={skipWeek}
            clockDay={clockDay}
            clockPhase={clockPhase}
          />
        )}
        {screen === "create" && run && (
          <Create
            run={run}
            sequelKey={sequelKey}
            paused={paused}
            onBegin={beginProduction}
            onCancel={() => setScreen("office")}
            onUnlockArc={unlockArc}
          />
        )}
        {screen === "produce" && run && focus && projectById(run, focus.projectId) && (
          <Produce
            run={run}
            project={projectById(run, focus.projectId)!}
            milestone={focus.milestone}
            paused={paused}
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
            onBack={() => {
              sfx.back();
              setShipId(null);
              setScreen("office");
            }}
          />
        )}
        {screen === "contract" && run && contract && (
          <ContractJob run={run} contract={contract} paused={paused} onDone={finishContract} />
        )}
        {screen === "release" && released && (
          <Release draft={released.draft} result={released.result} onContinue={continueFromRelease} />
        )}
        {screen === "gameover" && run && (
          <GameOver run={run} victory={victory} onRestart={restart} onTitle={quitToTitle} />
        )}

        {screen !== "title" && screen !== "gameover" && (
          <div className="absolute right-3 top-2.5 z-[60] flex gap-1.5">
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

        {paused && pauseMenu}
        {paused && savePicker && savePickerOverlay}
      </div>
    </FxProvider>
  );
}
