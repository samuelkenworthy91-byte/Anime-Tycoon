import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Home, Volume2, VolumeX, Keyboard, Save } from "lucide-react";
import { FxProvider, Btn } from "./fx/fx";
import { isMuted, primeAudio, setMuted, sfx } from "./engine/audio";
import { ARCS, GENRES, OFFICES, comboKey, type Contract, type Draft } from "./engine/data";
import { computeResult, type ShowResult } from "./engine/scoring";
import {
  bumpObjectives,
  growStaff,
  marketBonus,
  rankFanMult,
  rankRevenueMult,
  rankView,
  rollSeasonIfNeeded,
  settleObjectives,
} from "./engine/loop";
import {
  deleteSave,
  loadGame,
  saveGame,
  listSaves,
  type SaveSummary,
  type SaveSlots,
} from "./engine/storage";
import { advanceWeeks, AIR_WEEKS, MAX_WEEKS, migrate, initialRun, type RunState } from "./engine/state";
import Title from "./components/Title";
import Office from "./components/Office";
import Create, { draftCost, draftWeeks } from "./components/Create";
import Produce, { type ProduceResult } from "./components/Produce";
import ContractJob from "./components/ContractJob";
import Release, { type MarketNote } from "./components/Release";
import GameOver from "./components/GameOver";
import { cn } from "./utils/cn";

type Screen = "title" | "office" | "create" | "produce" | "contract" | "release" | "gameover";

export default function App() {
  const [screen, setScreen] = useState<Screen>("title");
  const [run, setRun] = useState<RunState | null>(null);
  const [meta, setMeta] = useState({ studio: "Anime Runner", showrunner: "steady" });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [result, setResult] = useState<ShowResult | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [marketNote, setMarketNote] = useState<MarketNote | null>(null);

  const [sequelKey, setSequelKey] = useState<string | undefined>();
  const [paused, setPaused] = useState(false);
  const [victory, setVictory] = useState(false);
  const [muteUI, setMuteUI] = useState(isMuted());
  /* three hand-managed save slots; `slot` is the one this career writes to */
  const [slot, setSlot] = useState<number | null>(null);
  const [saves, setSaves] = useState<SaveSlots>(() => listSaves());
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const playRef = useRef(0);
  const savesRef = useRef(saves);
  savesRef.current = saves;
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
              return n;
            }
            n = rollSeasonIfNeeded(r, n);
            if (n.awards > r.awards) n = bumpObjectives(n, { t: "award", n: n.awards - r.awards });
            const settled = settleObjectives(n);
            if (settled.completed.length) sfx.fanfare();
            return settled.run;
          });
        }
        setClockDay(dayCountRef.current);
      }
      setClockPhase(Math.floor((dayAccRef.current / 120_000) * 4));
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, paused, run !== null, run?.week]);

  /* --------------------------------------------------------- save slots */
  const summaryOf = useCallback((r: RunState): SaveSummary => {
    const rank = rankView(r);
    return {
      studio: r.studio,
      showrunner: r.showrunner,
      week: r.week,
      year: Math.floor(r.week / 48) + 1,
      cash: r.cash,
      fans: r.fans,
      awards: r.awards,
      showsMade: r.showsMade,
      officeName: OFFICES[r.officeLevel]?.name ?? "Studio",
      score: rank.score,
      rankName: rank.rank.name,
      rankTier: rank.rank.tier,
      rankColor: rank.rank.color,
      staff: r.staff.length,
    };
  }, []);

  /** Write the live run into a slot. `auto` marks it as an autosave. */
  const saveTo = useCallback(
    (i: number, auto = false) => {
      if (!run) return;
      setSaves(saveGame(i, run, meta, summaryOf(run), { auto, playtime: playRef.current }));
      if (!auto) setSavedAt(Date.now());
    },
    [run, meta, summaryOf]
  );

  /** Autosave: debounced on any state change, plus a heart-beat while idle. */
  useEffect(() => {
    if (slot === null || !run || screen === "title" || screen === "gameover") return;
    const t = setTimeout(() => saveTo(slot, true), 1500);
    return () => clearTimeout(t);
  }, [run, slot, screen, saveTo]);

  useEffect(() => {
    if (slot === null || screen === "title" || screen === "gameover") return;
    const iv = setInterval(() => {
      playRef.current += 30;
      saveTo(slot, true);
    }, 30_000);
    return () => clearInterval(iv);
  }, [slot, screen, saveTo]);

  const deleteSlot = useCallback((i: number) => {
    sfx.back();
    setSaves(deleteSave(i));
    if (i === slot) setSlot(null);
  }, [slot]);

  /* --------------------------------------------------------- lifecycle */
  const continueRun = useCallback((i: number) => {
    const found = loadGame(i);
    if (!found) return;
    primeAudio();
    sfx.fanfare();
    setSaves(listSaves());
    setMeta(found.meta);
    setSlot(i);
    setRun(migrate(found.run));
    setDraft(null);
    setResult(null);
    setContract(null);
    setSequelKey(undefined);
    setVictory(false);
    setPaused(false);
    setScreen("office");
  }, []);

  const startRun = useCallback((studio: string, showrunner: string) => {
    primeAudio();
    sfx.fanfare();
    setMeta({ studio, showrunner });
    setRun(initialRun(studio, showrunner));
    const fresh = listSaves();
    setSaves(fresh);
    /* a new career takes the first free slot rather than quietly overwriting
       whatever the player had in there */
    const free = fresh.findIndex((v) => v === null);
    setSlot(free >= 0 ? free : 0);
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
    r = rollSeasonIfNeeded(next, r);
    if (r.awards > next.awards) r = bumpObjectives(r, { t: "award", n: r.awards - next.awards });
    const settled = settleObjectives(r);
    if (settled.completed.length) sfx.fanfare();
    r = settled.run;
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

    /* the season and the studio's reputation both move the pay-out */
    const mb = marketBonus(draft.genres, run.market);
    const rv = rankView(run);
    const revenue = Math.round(result.revenue * mb.revenue * rankRevenueMult(rv.rank.tier));
    const fans = Math.round(result.fans * mb.fans * rankFanMult(rv.rank.tier));
    setMarketNote({
      kind: mb.kind,
      label: mb.label,
      revenue: mb.revenue,
      fans: mb.fans,
      rankRevenue: rankRevenueMult(rv.rank.tier),
      rankFans: rankFanMult(rv.rank.tier),
      rankName: rv.rank.name,
      rankColor: rv.rank.color,
    });
    if (mb.kind !== "none") notices.push(`The season: ${mb.label}.`);

    /* income + fans arrive week by week while the show airs */
    const start = run.week + 1;
    const payouts = [...run.payouts];
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
      arcKnowledge: draft.arcs.reduce(
        (acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }),
        run.arcKnowledge
      ),
      studioTop: Math.max(run.studioTop, result.quality),
      franchises: {
        ...run.franchises,
        [fkey]: { baseTitle, season: draft.season, lastScore: result.total, alive: result.hallOfFame },
      },
      pendingSequel: result.total >= 30 ? fkey : draft.franchiseKey === run.pendingSequel ? null : run.pendingSequel,
      hallOfFame: result.hallOfFame
        ? [...run.hallOfFame, { title: draft.title, score: result.total, genres: draft.genres, protag: draft.protag, week: run.week }]
        : run.hallOfFame,
      /* shipping a show is how the crew actually gets better — and tired */
      staff: run.staff.map((s) => {
        const g = growStaff(s, {
          hit: result.tier === "hit" || result.hallOfFame,
          flop: result.tier === "flop",
        });
        return { ...g, stamina: Math.max(15, g.stamina - 26) };
      }),
      yearShows: [
        ...run.yearShows,
        { title: draft.title, studio: run.studio, score: result.total, player: true },
      ],
      lastResult: result,
      lastDraft: draft,
      notices,
    };

    const withEvent = bumpObjectives(next, {
      t: "show",
      genres: draft.genres,
      score: result.total,
      revenue,
      fans,
      hit: result.tier === "hit" || result.hallOfFame,
      hallOfFame: result.hallOfFame,
    });
    const settled = settle(withEvent, draftWeeks(draft));
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
      const settled = settle(bumpObjectives(next, { t: "contract" }), contract.weeks);
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
              disabled={slot === null}
              onClick={() => {
                if (slot === null) return;
                saveTo(slot);
                setSavedAt(Date.now());
              }}
            >
              <Save size={16} /> SAVE CAREER{slot !== null ? ` · SLOT ${slot + 1}` : ""}
            </Btn>
            <Btn variant="gold" className="w-full" onClick={restart}>
              <RotateCcw size={16} /> INSTANT RESTART
            </Btn>
            <Btn
              variant="ghost"
              className="w-full"
              onClick={() => {
                if (slot !== null) saveTo(slot, true);
                quitToTitle();
              }}
            >
              <Home size={16} /> SAVE &amp; QUIT TO TITLE
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
        {screen === "title" && (
          <Title onStart={startRun} onContinue={continueRun} onDeleteSave={deleteSlot} saves={saves} />
        )}
        {screen === "office" && run && (
          <Office
            run={run}
            setRun={(fn) => setRun((r) => (r ? fn(r) : r))}
            onNewShow={newShow}
            onContract={takeContract}
            clockDay={clockDay}
            clockPhase={clockPhase}
            onSave={() => slot !== null && saveTo(slot)}
            savedLabel={savedAt && Date.now() - savedAt < 4000 ? "SAVED" : "SAVE"}
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
        {screen === "produce" && run && draft && (
          <Produce run={run} draft={draft} paused={paused} onFinish={finishProduction} />
        )}
        {screen === "contract" && run && contract && (
          <ContractJob run={run} contract={contract} paused={paused} onDone={finishContract} />
        )}
        {screen === "release" && draft && result && (
          <Release draft={draft} result={result} market={marketNote} onContinue={continueFromRelease} />
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
