import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Home, Volume2, VolumeX, Keyboard } from "lucide-react";
import { FxProvider, Btn } from "./fx/fx";
import { isMuted, primeAudio, setMuted, sfx } from "./engine/audio";
import { GENRES, comboKey, type Contract, type Draft } from "./engine/data";
import { computeResult, type ShowResult } from "./engine/scoring";
import { advanceWeeks, AIR_WEEKS, initialRun, MAX_WEEKS, type RunState } from "./engine/state";
import Title from "./components/Title";
import Office from "./components/Office";
import Create, { draftCost, draftWeeks } from "./components/Create";
import Produce, { type ProduceResult } from "./components/Produce";
import ContractJob from "./components/ContractJob";
import Release from "./components/Release";
import GameOver from "./components/GameOver";
import { cn } from "./utils/cn";

type Screen = "title" | "office" | "create" | "produce" | "contract" | "release" | "gameover";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [run, setRun] = useState<RunState | null>(null);
  const [meta, setMeta] = useState({ studio: "Studio Kirameki", showrunner: "steady" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState<ShowResult | null>(null);
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
  const startRun = useCallback((studio: string, showrunner: string) => {
    primeAudio();
    sfx.fanfare();
    setMeta({ studio, showrunner });
    setRun(initialRun(studio, showrunner));
    setDraft(null);
    setResult(null);
    setContract(null);
    setSequelKey(undefined);
    setVictory(false);
    setPaused(false);
    setScreen("office");
  }, []);

  const restart = useCallback(() => {
    sfx.fanfare();
    setRun(initialRun(meta.studio, meta.showrunner));
    setDraft(null);
    setResult(null);
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

  const beginProduction = useCallback((d: Draft) => {
    sfx.whoosh();
    setRun((r) => (r ? { ...r, cash: r.cash - draftCost(d) } : r));
    setDraft(d);
    setScreen("produce");
  }, []);

  const finishProduction = useCallback(
    (pr: ProduceResult) => {
      if (!run || !draft) return;
      const d: Draft = { ...draft, sliders: pr.sliders };
      const genres = d.genres;
      const avgOf = (pick: (i: number) => number[]) =>
        [0, 1, 2].map((i) => pick(i).reduce((a, b) => a + b, 0) / Math.max(1, genres.length));
      const ideal = avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ideal[i])).map(Math.round) as [number, number, number];
      const ratio = (genres.length
        ? avgOf((i) => genres.map((g) => GENRES.find((x) => x.id === g)!.ratio[i]))
        : [0.34, 0.33, 0.33]) as [number, number, number];

      const key = comboKey(genres);
      const comboLevel = run.comboLevels[key] ?? 0;
      const franchiseMult = d.franchiseKey ? 1 + 0.14 * (d.season - 1) : 1;

      const res = computeResult({
        draft: d,
        points: pr.points,
        issues: pr.issues,
        hype: pr.hype,
        research: run.research,
        showrunner: run.showrunner,
        genreIdeal: ideal,
        genreRatio: ratio,
        comboLevel,
        newCombo: !(key in run.comboLevels),
        comboDiscovered: key in run.comboLevels,
        castCombos: run.castCombos,
        arcCombos: run.arcCombos,
        studioTop: run.studioTop,
        franchiseMult,
        costs: draftCost(d) + pr.spent,
        fanBase: run.fans,
      });

      sfx.reveal();
      setRun((r) => (r ? { ...r, cash: r.cash - pr.spent, rd: r.rd + pr.rdGained } : r));
      setDraft(d);
      setResult(res);
      setScreen("release");
    },
    [run, draft]
  );

  const continueFromRelease = useCallback(() => {
    if (!run || !draft || !result) return;
    const fkey = draft.franchiseKey ?? draft.title;
    const baseTitle = draft.franchiseKey ? run.franchises[draft.franchiseKey]?.baseTitle ?? draft.title : draft.title;
    const ck = comboKey(draft.genres);
    const notices = [...run.notices];
    if (result.hallOfFame) notices.push(`“${draft.title}” enters the HALL OF FAME with ${result.total}/40!`);
    else if (result.tier === "hit") notices.push(`“${draft.title}” is the talk of the season (${result.total}/40).`);
    else if (result.tier === "flop") notices.push(`Critics bury “${draft.title}” (${result.total}/40).`);

    /* income + fans arrive week by week while the show airs */
    const start = run.week + 1;
    const payouts = [...run.payouts];
    const revenue = result.revenue;
    const fans = result.fans;
    const weeks = AIR_WEEKS;
    let acc = 0;
    let accF = 0;
    const chunks: { amount: number; fans: number }[] = [];
    for (let i = 0; i < weeks; i++) {
      const frac = result.sales[i] / Math.max(1, result.sales.reduce((a, b) => a + b, 0));
      const amount = Math.round(revenue * frac);
      const fan = Math.round(fans * frac);
      chunks.push({ amount, fans: fan });
      acc += amount;
      accF += fan;
    }
    /* rounding drift lands on the final week */
    chunks[weeks - 1].amount += revenue - acc;
    chunks[weeks - 1].fans += fans - accF;
    chunks.forEach((c, i) => {
      if (c.amount > 0 || c.fans > 0)
        payouts.push({ week: start + i, amount: c.amount, fans: c.fans, label: `“${draft.title}” broadcast` });
    });

    const next: RunState = {
      ...run,
      payouts,
      totalRevenue: run.totalRevenue + revenue,
      showsMade: run.showsMade + 1,
      hits: run.hits + (result.tier === "hit" || result.hallOfFame ? 1 : 0),
      bestScore: Math.max(run.bestScore, result.total),
      comboLevels: { ...run.comboLevels, [ck]: Math.min(5, (run.comboLevels[ck] ?? 0) + 1) },
      castCombos: [...new Set([...run.castCombos, ...result.chemDiscovered])],
      arcCombos: [...new Set([...run.arcCombos, ...result.arcCombosDiscovered])],
      studioTop: Math.max(run.studioTop, result.quality),
      franchises: {
        ...run.franchises,
        [fkey]: { baseTitle, season: draft.season, lastScore: result.total, alive: result.hallOfFame },
      },
      pendingSequel: result.total >= 30 ? fkey : draft.franchiseKey === run.pendingSequel ? null : run.pendingSequel,
      hallOfFame: result.hallOfFame
        ? [...run.hallOfFame, { title: draft.title, score: result.total, genres: draft.genres, protag: draft.protag, week: run.week }]
        : run.hallOfFame,
      staff: run.staff.map((s) => ({
        ...s,
        stamina: Math.max(15, s.stamina - 26),
        story: Math.min(99, s.story + 1),
        art: Math.min(99, s.art + 1),
        sound: Math.min(99, s.sound + 1),
      })),
      yearShows: [
        ...run.yearShows,
        { title: draft.title, studio: run.studio, score: result.total, player: true },
      ],
      lastResult: result,
      lastDraft: draft,
      notices,
    };

    const settled = settle(next, draftWeeks(draft));
    setRun(settled);
    if (settled.cash >= 0 && settled.week < MAX_WEEKS) setScreen("office");
  }, [run, draft, result, settle]);

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
            <Btn variant="gold" className="w-full" onClick={restart}>
              <RotateCcw size={16} /> INSTANT RESTART
            </Btn>
            <Btn variant="ghost" className="w-full" onClick={quitToTitle}>
              <Home size={16} /> QUIT TO TITLE
            </Btn>
          </div>
          <div className="flex items-center justify-center gap-2 border-t border-line/60 pt-3 text-[10px] text-paper/40">
            <Keyboard size={12} /> Tap bubbles · keys 1-7 per desk · SPACE top bubble · ENTER next · M mute · ESC pause
          </div>
        </div>
      </div>
    ),
    [restart, quitToTitle]
  );

  return (
    <FxProvider>
      <div className="relative h-full w-full overflow-hidden bg-ink">
        {screen === "title" && <Title onStart={startRun} />}
        {screen === "office" && run && (
          <Office
            run={run}
            setRun={(fn) => setRun((r) => (r ? fn(r) : r))}
            onNewShow={newShow}
            onContract={takeContract}
            clockDay={clockDay}
            clockPhase={clockPhase}
          />
        )}
        {screen === "create" && run && (
          <Create run={run} sequelKey={sequelKey} paused={paused} onBegin={beginProduction} onCancel={() => setScreen("office")} />
        )}
        {screen === "produce" && run && draft && (
          <Produce run={run} draft={draft} paused={paused} onFinish={finishProduction} />
        )}
        {screen === "contract" && run && contract && (
          <ContractJob run={run} contract={contract} paused={paused} onDone={finishContract} />
        )}
        {screen === "release" && draft && result && (
          <Release draft={draft} result={result} onContinue={continueFromRelease} />
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
      </div>
    </FxProvider>
  );
}
