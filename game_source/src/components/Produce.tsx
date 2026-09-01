import { useMemo, useRef, useState } from "react";
import {
  Play,
  PenTool,
  MonitorPlay,
  Music4,
  Scissors,
  Zap,
  Megaphone,
  Rocket,
  UserRound,
  Building2,
  Check,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  POINT_LABEL,
  PROMOS,
  ROLE_POINT,
  SHOWRUNNERS,
  formatGBP,
  staffPoint,
  workerLookIndex,
  type Draft,
  type PointType,
} from "../engine/data";
import type { RunState } from "../engine/state";
import type { Points } from "../engine/scoring";
import ProductionFloor, { type FloorDesk, type FloorHandle, type FloorTotals } from "./ProductionFloor";
import { cn } from "../utils/cn";

export interface ProduceResult {
  points: Points;
  issues: number;
  hype: number;
  spent: number;
  sliders: [number, number, number];
  rdGained: number;
}

const PHASES: { name: string; icon: typeof PenTool; a: string; b: string; type: PointType }[] = [
  { name: "PRE-PRODUCTION", icon: PenTool, a: "Plot", b: "Characters", type: "story" },
  { name: "ANIMATION", icon: MonitorPlay, a: "Sakuga", b: "Consistency", type: "art" },
  { name: "SOUND & VOICE", icon: Music4, a: "Soundtrack", b: "Voice Cast", type: "sound" },
];

const CRUNCH_COST = 9_000;

export default function Produce({
  run,
  draft,
  paused,
  onFinish,
}: {
  run: RunState;
  draft: Draft;
  paused: boolean;
  onFinish: (r: ProduceResult) => void;
}) {
  const [mode, setMode] = useState<"plan" | "assign" | "floor" | "phaseDone" | "debug" | "promo">("plan");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [sliders, setSliders] = useState<[number, number, number]>(draft.sliders);
  const [points, setPoints] = useState<Points>({ story: 0, art: 0, sound: 0 });
  const [issues, setIssues] = useState(0);
  const [spent, setSpent] = useState(0);
  const [rdGained, setRdGained] = useState(0);
  const [hype, setHype] = useState(0);
  const [promosBought, setPromosBought] = useState<string[]>([]);
  const [live, setLive] = useState<FloorTotals | null>(null);
  const [lastPhase, setLastPhase] = useState<FloorTotals | null>(null);
  const [crunches, setCrunches] = useState(0);
  const floorRef = useRef<FloorHandle>(null);

  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner)!;
  const phase = PHASES[phaseIdx];



  const desks = useMemo<FloorDesk[]>(() => {
    const list: FloorDesk[] = [
      { name: runner.name.split(" ")[0], skill: 46 + run.showsMade * 2, type: PHASES[phaseIdx].type, isBoss: true, img: runner.img },
    ];
    run.staff.forEach((s) =>
      list.push({ name: s.name.split(" ")[0], skill: Math.round(staffPoint(s, ROLE_POINT[s.role]) * (0.6 + s.stamina / 250)), type: ROLE_POINT[s.role], look: workerLookIndex(s) })
    );
    return list;
  }, [run.staff, run.showsMade, runner.name, phaseIdx]);

  const spawnMult = (run.research.includes("pipeline") ? 1.2 : 1) * (1 + run.officeLevel * 0.05);
  const lifeMult = (run.research.includes("storyboard") ? 1.25 : 1) * (run.showrunner === "steady" ? 1.2 : 1);
  const bugRate = 0.11 * (run.research.includes("qa") ? 0.7 : 1) * (run.showrunner === "steady" ? 0.85 : 1) * (1 + (draft.budget === "blockbuster" ? 0.35 : 0));

  const totalPts = points.story + points.art + points.sound;

  /* ---------------------------------------------------- specialist assign */
  const [, setAssigned] = useState<Record<number, string>>({});
  const specialistCandidates = useMemo(() => {
    const t = phase.type;
    const list = run.staff.map((s) => ({ id: s.id, name: s.name, skill: staffPoint(s, t), stamina: s.stamina, outsource: false }));
    list.sort((a, b) => b.skill - a.skill);
    return list;
  }, [run.staff, phase.type]);

  const outsourceCost = 18_000 + phaseIdx * 6_000;

  const takeSpecialist = (id: string, skill: number, cost: number) => {
    sfx.select();
    const boost = Math.round(skill * 0.42 + 4);
    setPoints((p) => ({ ...p, [phase.type]: p[phase.type] + boost }));
    setSpent((s) => s + cost);
    setAssigned((a) => ({ ...a, [phaseIdx]: id }));
    setMode("floor");
  };

  /* ------------------------------------------------------------ handlers */
  const startPhase = () => {
    sfx.phase();
    setMode("assign");
  };

  const onFloorDone = (t: FloorTotals) => {
    setPoints((p) => ({ story: p.story + t.story, art: p.art + t.art, sound: p.sound + t.sound }));
    setIssues((i) => i + t.issues);
    setRdGained((r) => r + t.squashed);
    setLastPhase(t);
    setMode("phaseDone");
  };

  const nextAfterPhase = () => {
    if (phaseIdx >= 2) {
      sfx.phase();
      setMode("debug");
    } else {
      setPhaseIdx((p) => p + 1);
      setMode("assign");
      sfx.phase();
    }
  };

  const onDebugDone = (t: FloorTotals) => {
    setIssues((i) => Math.max(0, i - t.squashed));
    setRdGained((r) => r + t.squashed * 2);
    setLastPhase(t);
    sfx.select();
    setMode("promo");
  };

  const buyPromo = (id: string, cost: number, h: number) => {
    sfx.cash();
    setSpent((s) => s + cost);
    setHype((x) => Math.min(100, x + h));
    setPromosBought((p) => [...p, id]);
  };

  const ship = () => {
    sfx.whoosh();
    onFinish({ points, issues, hype, spent, sliders, rdGained });
  };

  const crunch = () => {
    if (run.cash - spent < CRUNCH_COST) return;
    setSpent((s) => s + CRUNCH_COST);
    setCrunches((c) => c + 1);
    floorRef.current?.crunch();
  };

  /* -------------------------------------------------------------- render */
  const pointBar = (
    <div className="flex items-center gap-1.5 text-[11px] font-bold">
      {(["story", "art", "sound"] as PointType[]).map((t) => (
        <span
          key={t}
          className="ink-chip flex items-center gap-1 px-2 py-0.5"
          style={{ color: POINT_COLOR[t], borderColor: `${POINT_COLOR[t]}55` }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: POINT_COLOR[t] }} />
          {points[t] + (live && mode === "floor" ? live[t] : 0)}
        </span>
      ))}
      <span className={cn("ink-chip flex items-center gap-1 px-2 py-0.5", issues > 0 ? "text-[#ff5e5e]" : "text-paper/50")}>
        <Scissors size={11} /> {issues + (live && mode === "floor" ? live.issues : 0)}
      </span>
    </div>
  );

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      {/* header */}
      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="shrink-0 rounded-md bg-neon px-2 py-0.5 text-[10px] font-bold text-white">IN PRODUCTION</span>
        <span className="truncate font-display text-sm font-extrabold">{draft.title}</span>
        <div className="ml-auto hidden sm:block">{pointBar}</div>
        <div className="ml-auto flex shrink-0 gap-1 sm:ml-2">
          {PHASES.map((p, i) => (
            <div
              key={p.name}
              className={cn(
                "h-2 w-7 rounded-full border border-line",
                i < phaseIdx ? "bg-mint" : i === phaseIdx && mode !== "debug" && mode !== "promo" ? "bg-neon" : "bg-panel3"
              )}
            />
          ))}
          <div className={cn("h-2 w-7 rounded-full border border-line", mode === "debug" || mode === "promo" ? "bg-neon" : "bg-panel3")} />
        </div>
      </div>
      <div className="relative z-10 flex justify-center border-b border-line/40 bg-panel2/50 py-1 sm:hidden">{pointBar}</div>

      {/* ---------------------------------------------------------- PLAN */}
      {mode === "plan" && (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-4">
          <div className="mb-3 text-center">
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">
              DIRECTION MEETING
            </h2>
            <p className="mt-1 text-xs text-paper/50">
              The director has opinions about the balance. The critics will tell you if you got it right.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PHASES.map((p, i) => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="ink-card p-4">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-panel3 p-2" style={{ color: POINT_COLOR[p.type] }}>
                      <Icon size={17} />
                    </span>
                    <div>
                      <div className="font-display text-sm font-extrabold leading-tight">{p.name}</div>
                      <div className="text-[10px] text-paper/40">
                        makes {POINT_LABEL[p.type]} points
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between text-[10px] font-bold">
                    <span className="text-neon2">{p.a}</span>
                    <span className="text-cyanx">{p.b}</span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={sliders[i]}
                      onChange={(e) => {
                        const v = +e.target.value;
                        setSliders((old) => {
                          const n: [number, number, number] = [...old];
                          n[i] = v;
                          return n;
                        });
                      }}
                      className="ink-range relative z-10"
                      style={{ "--p": `${sliders[i]}%` } as React.CSSProperties}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-paper/50">
                    <span>{sliders[i]}%</span>
                    <span>{100 - sliders[i]}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex justify-center">
            <Btn big variant="primary" className="anim-ring w-full max-w-sm" onClick={startPhase}>
              <Play size={20} /> BEGIN PRODUCTION
            </Btn>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------- ASSIGN */}
      {mode === "assign" && (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
          <div className="anim-pop text-center">
            <div className="text-[11px] tracking-[0.4em] text-cyanx">STAGE {phaseIdx + 1} / 3</div>
            <h2 className="font-display text-3xl font-extrabold md:text-4xl">{phase.name}</h2>
            <p className="mt-1 text-xs text-paper/60">
              Who leads the {POINT_LABEL[phase.type].toLowerCase()} work? They set the opening point bonus.
            </p>
          </div>
          <div className="mt-4 space-y-2">
            {specialistCandidates.map((c) => (
              <button
                key={c.id}
                onClick={() => takeSpecialist(c.id, c.skill * (0.55 + c.stamina / 220), 0)}
                className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-neon/50"
              >
                <span className="rounded-lg bg-panel3 p-2 text-cyanx">
                  <UserRound size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{c.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="h-1.5 w-28 rounded bg-abyss">
                      <div className="h-full rounded" style={{ width: `${c.skill}%`, background: POINT_COLOR[phase.type] }} />
                    </div>
                    <span className="text-[10px] font-bold text-paper/60">
                      {POINT_LABEL[phase.type]} {c.skill}
                    </span>
                    <span className={cn("text-[10px] font-bold", c.stamina < 45 ? "text-neon" : "text-mint")}>
                      {c.stamina < 45 ? "BURNT OUT" : "FRESH"} {Math.round(c.stamina)}%
                    </span>
                  </div>
                </div>
                <span className="font-display text-sm font-extrabold text-mint">
                  +{Math.round(c.skill * (0.55 + c.stamina / 220) * 0.42 + 4)}
                </span>
              </button>
            ))}
            <button
              onClick={() => takeSpecialist("outsource", 78, outsourceCost)}
              disabled={run.cash - spent < outsourceCost}
              className={cn(
                "btn-press ink-card flex w-full items-center gap-3 border-gold/40 p-3 text-left hover:border-gold",
                run.cash - spent < outsourceCost && "pointer-events-none opacity-40"
              )}
            >
              <span className="rounded-lg bg-panel3 p-2 text-gold">
                <Building2 size={16} />
              </span>
              <div className="flex-1">
                <div className="text-sm font-bold text-gold">Outsource to a famous studio</div>
                <div className="text-[10px] text-paper/50">Guaranteed quality — for a price.</div>
              </div>
              <div className="text-right">
                <div className="font-display text-sm font-extrabold text-mint">+37</div>
                <div className="text-[10px] font-bold text-gold">{formatGBP(outsourceCost)}</div>
              </div>
            </button>
            <button
              onClick={() => takeSpecialist("self", 40 + run.showsMade * 3, 0)}
              className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-neon/50"
            >
              <img src={runner.img} alt="" className="h-10 w-10 rounded-lg object-cover" />
              <div className="flex-1">
                <div className="text-sm font-bold">{runner.name} (you)</div>
                <div className="text-[10px] text-paper/50">Do it yourself. Free, improves with experience.</div>
              </div>
              <span className="font-display text-sm font-extrabold text-mint">
                +{Math.round((40 + run.showsMade * 3) * 0.42 + 4)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- FLOOR */}
      {(mode === "floor" || mode === "debug") && (
        <div className="relative z-10 flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line/40 bg-panel2/60 px-3 py-1.5">
            <span className="text-[10px] text-paper/60">
              {mode === "debug" ? "EDITING — pop the red notes to fix them!" : `tap bubbles · keys 1-${Math.min(7, desks.length)} · SPACE grabs the top one`}
            </span>
            {mode === "floor" && (
              <button
                onClick={crunch}
                disabled={run.cash - spent < CRUNCH_COST}
                className={cn(
                  "btn-press ml-auto flex items-center gap-1 rounded-lg border border-gold/60 bg-gold/15 px-2.5 py-1 text-[10px] font-extrabold text-gold",
                  run.cash - spent < CRUNCH_COST && "pointer-events-none opacity-40"
                )}
              >
                <Zap size={12} /> CRUNCH {formatGBP(CRUNCH_COST)}
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1">
            <ProductionFloor
              key={mode === "debug" ? "debug" : `p${phaseIdx}`}
              handleRef={floorRef}
              desks={desks}
              duration={mode === "debug" ? 10000 : 13000}
              focus={phase.type}
              spawnMult={mode === "debug" ? 1.5 : spawnMult}
              lifeMult={lifeMult}
              bugRate={mode === "debug" ? 1 : bugRate}
              debugMode={mode === "debug"}
              paused={paused}
              onProgress={(t) => setLive(t)}
              onDone={mode === "debug" ? onDebugDone : onFloorDone}
            />
          </div>
        </div>
      )}

      {/* ----------------------------------------------------- PHASE DONE */}
      {mode === "phaseDone" && lastPhase && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center p-4">
          <div className="anim-pop ink-card w-full max-w-sm p-5 text-center">
            <div className="text-[10px] tracking-[0.4em] text-mint">STAGE COMPLETE</div>
            <div className="mt-1 font-display text-2xl font-extrabold">{phase.name}</div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {(["story", "art", "sound"] as PointType[]).map((t) => (
                <div key={t}>
                  <div className="font-display text-xl font-extrabold" style={{ color: POINT_COLOR[t] }}>
                    +{lastPhase[t]}
                  </div>
                  <div className="text-[9px] font-bold text-paper/50">{POINT_LABEL[t].toUpperCase()}</div>
                </div>
              ))}
              <div>
                <div className="font-display text-xl font-extrabold text-[#ff5e5e]">{lastPhase.issues}</div>
                <div className="text-[9px] font-bold text-paper/50">ISSUES</div>
              </div>
            </div>
            <div className="mt-3 flex justify-center gap-3 text-[10px] font-bold text-paper/50">
              <span>BEST CHAIN <b className="text-gold">{lastPhase.best}</b></span>
              <span>MISSED <b className="text-neon">{lastPhase.missed}</b></span>
              {crunches > 0 && <span>CRUNCH <b className="text-gold">×{crunches}</b></span>}
            </div>
            <Btn big variant="primary" className="mt-4 w-full" onClick={nextAfterPhase}>
              {phaseIdx >= 2 ? (
                <>
                  <Scissors size={18} /> START EDITING
                </>
              ) : (
                <>
                  <Play size={18} /> NEXT STAGE
                </>
              )}
            </Btn>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------- PROMO */}
      {mode === "promo" && (
        <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
          <div className="text-center">
            <div className="text-[11px] tracking-[0.4em] text-gold">FINAL ADJUSTMENTS</div>
            <h2 className="font-display text-2xl font-extrabold md:text-3xl">MASTER COMPLETE</h2>
            <p className="mt-1 text-xs text-paper/60">Buy promotion before it airs — hype drives the opening week.</p>
          </div>

          <div className="ink-card mt-3 grid grid-cols-3 gap-2 p-3 text-center">
            {(["story", "art", "sound"] as PointType[]).map((t) => (
              <div key={t}>
                <div className="font-display text-2xl font-extrabold" style={{ color: POINT_COLOR[t] }}>
                  {points[t]}
                </div>
                <div className="text-[9px] font-bold text-paper/50">{POINT_LABEL[t].toUpperCase()}</div>
                <div className="mt-1 h-1.5 rounded bg-abyss">
                  <div
                    className="h-full rounded"
                    style={{ width: `${totalPts ? (points[t] / totalPts) * 100 : 0}%`, background: POINT_COLOR[t] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel2/70 px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5 font-bold text-[#ff5e5e]">
              <Scissors size={13} /> {issues} unresolved editing notes
            </span>
            <span className="text-paper/50">−{(issues * 0.9).toFixed(1)} review points</span>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PROMOS.map((p) => {
              const locked = p.locked && !run.research.includes("marketing");
              const bought = promosBought.includes(p.id);
              const afford = run.cash - spent >= p.cost;
              return (
                <div key={p.id} className={cn("ink-card p-3", bought && "border-mint/60")}>
                  <div className="flex items-center gap-1.5">
                    <Megaphone size={14} className="text-gold" />
                    <span className="font-display text-sm font-extrabold">{p.name}</span>
                    
                    <span className="ml-auto text-[10px] font-bold text-cyanx">+{p.hype} hype</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-paper/50">{p.desc}</div>
                  <div className="mt-2">
                    {bought ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-mint">
                        <Check size={12} /> BOOKED
                      </span>
                    ) : locked ? (
                      <span className="text-[10px] font-bold text-paper/40">Research “Marketing Dept.” to unlock</span>
                    ) : (
                      <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={!afford} onClick={() => buyPromo(p.id, p.cost, p.hype)}>
                        BOOK {formatGBP(p.cost)}
                      </Btn>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3">
            <span className="text-xs font-bold text-paper/60">HYPE</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-abyss">
              <div className="h-full rounded-full bg-gradient-to-r from-neon to-gold transition-all duration-500" style={{ width: `${hype}%` }} />
            </div>
            <span className="font-display text-sm font-extrabold text-gold">{hype}%</span>
          </div>

          <Btn big variant="gold" className="mt-4 w-full" onClick={ship}>
            <Rocket size={20} /> AIR THE SHOW!
          </Btn>
        </div>
      )}
    </div>
  );
}
