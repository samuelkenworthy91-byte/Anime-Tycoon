import { useEffect, useMemo, useState } from "react";
import { FastForward, Pause, Play, Shield, SkipForward, X } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { WORKER_LOOKS, workerLook } from "../engine/data";
import {
  ARCBALL_POSITIONS,
  arcballStateOf,
  arcballTeamName,
  beginArcballMatch,
  finishArcballMatch,
  rivalArcballRoster,
  stepArcballMatch,
  type ArcballInstruction,
  type ArcballIntensity,
  type ArcballMatchPhase,
  type ArcballMatchState,
  type ArcballPosition,
} from "../engine/arcball";
import type { RunState } from "../engine/state";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

const PLAYER_BASE: Record<ArcballPosition, [number, number]> = {
  keeper: [50, 86],
  anchor: [50, 72],
  runner: [27, 58],
  creator: [73, 57],
  striker: [50, 40],
};
const RIVAL_BASE: Record<ArcballPosition, [number, number]> = {
  keeper: [50, 14],
  anchor: [50, 28],
  runner: [73, 42],
  creator: [27, 43],
  striker: [50, 60],
};

const PHASE_LABEL: Record<ArcballMatchPhase, string> = {
  kickoff: "KICK OFF",
  buildup: "BUILD-UP",
  midfield: "MIDFIELD BATTLE",
  breakaway: "BREAKAWAY",
  chance: "CHANCE",
  shot: "SHOT",
  goal: "GOAL!",
  defence: "INTERCEPTION",
};

const PHASE_SHIFT: Record<ArcballMatchPhase, number> = {
  kickoff: 0,
  buildup: 3,
  midfield: 5,
  breakaway: 11,
  chance: 13,
  shot: 15,
  goal: 16,
  defence: 2,
};

function pitchPoint(position: ArcballPosition, player: boolean, active: boolean, phase: ArcballMatchPhase): [number, number] {
  const [x, y] = (player ? PLAYER_BASE : RIVAL_BASE)[position];
  if (!active) return [x, y];
  const shift = PHASE_SHIFT[phase];
  return [x, player ? Math.max(15, y - shift) : Math.min(85, y + shift)];
}

export default function ArcballMatch({
  run,
  setRun,
  fixtureId,
  onDone,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  fixtureId: string;
  onDone: () => void;
}) {
  const initial = useMemo(() => beginArcballMatch(run, fixtureId), [fixtureId]);
  const [match, setMatch] = useState<ArcballMatchState | null>(initial);
  const [speed, setSpeed] = useState<0 | 1 | 2 | 4>(0);
  const [intensity, setIntensity] = useState<ArcballIntensity>("normal");
  const [instruction, setInstruction] = useState<ArcballInstruction>("none");
  const [committed, setCommitted] = useState(false);
  const [halfTime, setHalfTime] = useState(false);
  const [halfTimeSeen, setHalfTimeSeen] = useState(false);

  useEffect(() => {
    if (!match || match.minute >= 90 || speed === 0 || committed || halfTime) return;
    const baseDelay = speed === 1 ? 5200 : speed === 2 ? 2600 : 1100;
    const eventHold = match.phase === "goal" ? 1.35 : match.phase === "shot" || match.phase === "chance" ? 1.15 : 1;
    const timer = window.setTimeout(() => {
      setMatch((current) => current ? stepArcballMatch(run, current, intensity, instruction) : current);
    }, baseDelay * eventHold);
    return () => window.clearTimeout(timer);
  }, [match, speed, intensity, instruction, run, committed, halfTime]);

  useEffect(() => {
    if (!match || committed || halfTimeSeen || match.minute !== 45) return;
    setSpeed(0);
    setHalfTime(true);
    setHalfTimeSeen(true);
  }, [match, committed, halfTimeSeen]);

  useEffect(() => {
    if (!match || match.minute < 90 || committed) return;
    const next = finishArcballMatch(run, match, "watch");
    if (!next) return;
    setRun(() => next);
    setCommitted(true);
    setSpeed(0);
    sfx.fanfare();
  }, [match, committed, run, setRun]);

  if (!match) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-ink p-4">
        <div className="ink-card max-w-sm p-5 text-center">
          <div className="font-display text-xl font-black">ARCBALL MATCH UNAVAILABLE</div>
          <div className="mt-2 text-xs text-paper/50">The fixture may already be complete, not yet due, or your starting five is incomplete.</div>
          <Btn variant="ghost" className="mt-4" onClick={onDone}>BACK TO STUDIO</Btn>
        </div>
      </div>
    );
  }

  const state = arcballStateOf(run);
  const fixture = state.fixtures.find((f) => f.id === fixtureId);
  if (!fixture) return null;

  const rivalId = match.playerIsHome ? fixture.awayId : fixture.homeId;
  const rival = run.rivalWorld.studios.find((s) => s.id === rivalId || s.name === rivalId);
  const rivalPlayers = rival ? rivalArcballRoster(rival, state.seasonYear) : [];
  const playerRows = ARCBALL_POSITIONS.flatMap((position) => {
    const member = run.staff.find((s) => s.id === state.lineup[position]);
    return member ? [{ position, member }] : [];
  });

  const instant = () => {
    if (!match || committed) return;
    let nextMatch = match;
    while (nextMatch.minute < 90) nextMatch = stepArcballMatch(run, nextMatch, intensity, instruction);
    setMatch(nextMatch);
    const nextRun = finishArcballMatch(run, nextMatch, "instant");
    if (nextRun) {
      setRun(() => nextRun);
      setCommitted(true);
      setHalfTime(false);
      setSpeed(0);
      sfx.fanfare();
    }
  };

  const homeName = arcballTeamName(run, fixture.homeId);
  const awayName = arcballTeamName(run, fixture.awayId);
  const possessionTotal = match.homePossessionTicks + match.awayPossessionTicks;
  const homePoss = possessionTotal ? Math.round(match.homePossessionTicks / possessionTotal * 100) : 50;
  const awayPoss = 100 - homePoss;

  const activePlayerRow = playerRows.find(({ member }) => member.id === match.activePlayerId);
  const supportPlayerRow = playerRows.find(({ member }) => member.id === match.supportingPlayerId);
  const activeRival = rivalPlayers.find((p) => p.name === match.activeRivalName);
  const supportRival = rivalPlayers.find((p) => p.name === match.supportingRivalName);

  const playerHasBall = match.lastPossession === (match.playerIsHome ? "home" : "away");
  const activeFrom = playerHasBall && supportPlayerRow
    ? pitchPoint(supportPlayerRow.position, true, false, match.phase)
    : !playerHasBall && supportRival
      ? pitchPoint(supportRival.position, false, false, match.phase)
      : null;
  const activeTo = playerHasBall && activePlayerRow
    ? pitchPoint(activePlayerRow.position, true, true, match.phase)
    : !playerHasBall && activeRival
      ? pitchPoint(activeRival.position, false, true, match.phase)
      : null;

  const latestEvent = match.events[match.events.length - 1];
  const playerScore = match.playerIsHome ? match.homeScore : match.awayScore;
  const opponentScore = match.playerIsHome ? match.awayScore : match.homeScore;
  const playerShots = match.playerIsHome ? match.homeShots : match.awayShots;
  const opponentShots = match.playerIsHome ? match.awayShots : match.homeShots;
  const playerOnTarget = match.playerIsHome ? match.homeOnTarget : match.awayOnTarget;
  const opponentOnTarget = match.playerIsHome ? match.awayOnTarget : match.homeOnTarget;
  const playerPoss = match.playerIsHome ? homePoss : awayPoss;
  const opponentPoss = 100 - playerPoss;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink">
      <div className="flex items-center gap-2 border-b border-line bg-panel2/90 px-3 py-2">
        <Shield size={15} className="text-cyanx"/>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black tracking-[0.25em] text-cyanx">ARCBALL LEAGUE · YEAR {state.seasonYear}</div>
          <div className="truncate font-display text-sm font-black">{homeName} <span className="text-gold">{match.homeScore}–{match.awayScore}</span> {awayName}</div>
        </div>
        <div className="font-display text-xl font-black text-gold">{match.minute}'</div>
        <button className="btn-press rounded-lg border border-line p-2 text-paper/50" onClick={committed ? onDone : () => { setSpeed(0); onDone(); }} aria-label="Back to studio"><X size={15}/></button>
      </div>

      <div className="nice-scroll flex-1 overflow-y-auto p-2 sm:p-3">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-line bg-panel2/55 text-center text-[8px]">
            <LiveStat label="POSSESSION" left={playerPoss + "%"} right={opponentPoss + "%"} />
            <LiveStat label="SHOTS" left={playerShots} right={opponentShots} />
            <LiveStat label="ON TARGET" left={playerOnTarget} right={opponentOnTarget} />
          </div>

          <div className="relative aspect-[3/4] max-h-[58vh] min-h-[390px] overflow-hidden rounded-xl border-2 border-[#d7e7b3]/40 bg-[#235a36] shadow-inner sm:aspect-[5/3] sm:min-h-[320px]">
            <div className="absolute inset-[4%] border border-white/45"/>
            <div className="absolute left-[4%] right-[4%] top-1/2 border-t border-white/45"/>
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"/>
            <div className="absolute left-[35%] right-[35%] top-[4%] h-[10%] border border-t-0 border-white/45"/>
            <div className="absolute bottom-[4%] left-[35%] right-[35%] h-[10%] border border-b-0 border-white/45"/>
            <div className="absolute left-1/2 top-[3%] -translate-x-1/2 rounded bg-ink/65 px-2 py-0.5 text-[7px] font-black text-white/70">{rival?.name ?? rivalId}</div>
            <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded bg-ink/65 px-2 py-0.5 text-[7px] font-black text-white/70">{run.studio}</div>

            <div className={cn(
              "absolute left-1/2 top-[18%] z-30 -translate-x-1/2 rounded-lg border px-3 py-1 text-center font-display text-sm font-black shadow-lg transition-all",
              match.phase === "goal" ? "scale-110 border-gold bg-gold text-ink" :
              match.phase === "shot" || match.phase === "chance" ? "border-gold/70 bg-ink/90 text-gold" :
              "border-white/20 bg-ink/75 text-white/85"
            )}>
              {PHASE_LABEL[match.phase]}
            </div>

            {activeFrom && activeTo && (
              <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line
                  x1={activeFrom[0]} y1={activeFrom[1]}
                  x2={activeTo[0]} y2={activeTo[1]}
                  stroke="rgba(255,255,255,.78)"
                  strokeWidth="0.8"
                  strokeDasharray="2.2 1.7"
                />
                <circle cx={activeTo[0]} cy={activeTo[1]} r="1.1" fill="white"/>
              </svg>
            )}

            {rivalPlayers.map((player) => {
              const active = match.activeRivalName === player.name && !playerHasBall;
              const [x, y] = pitchPoint(player.position, false, active, match.phase);
              return (
                <PitchHead
                  key={player.id}
                  x={x}
                  y={y}
                  name={player.name.split(" ")[0]}
                  active={active}
                  hasBall={active}
                  portrait={WORKER_LOOKS[player.look]?.portrait}
                />
              );
            })}

            {playerRows.map(({ position, member }) => {
              const active = match.activePlayerId === member.id && playerHasBall;
              const [x, y] = pitchPoint(position, true, active, match.phase);
              const projectedEnergy = Math.max(0, Math.round(member.stamina - (match.effort[member.id] ?? 0)));
              return (
                <PitchHead
                  key={member.id}
                  x={x}
                  y={y}
                  name={member.name.split(" ")[0]}
                  active={active}
                  hasBall={active}
                  portrait={workerLook(member).portrait}
                  player
                  energy={projectedEnergy}
                />
              );
            })}

            {!activeTo && <div className="absolute left-[49%] top-[49%] h-2.5 w-2.5 rounded-full border border-black/50 bg-white shadow"/>}

            {(match.phase === "goal" || match.phase === "shot") && latestEvent && (
              <div className={cn(
                "absolute bottom-[18%] left-[8%] right-[8%] z-40 rounded-xl border p-3 text-center shadow-2xl",
                match.phase === "goal" ? "border-gold bg-ink/95" : "border-white/25 bg-ink/90"
              )}>
                <div className={cn("font-display text-xl font-black", match.phase === "goal" ? "text-gold" : "text-white")}>
                  {match.phase === "goal" ? "GOAL!" : "SHOT"}
                </div>
                <div className="mt-1 text-[10px] leading-relaxed text-paper/75">{latestEvent.text}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-4 gap-1">
            {([0,1,2,4] as const).map((value) => (
              <button
                key={value}
                className={cn("btn-press rounded-lg border py-2 text-[8px] font-black", speed === value ? "border-cyanx bg-cyanx/15 text-cyanx" : "border-line bg-panel2/50 text-paper/45")}
                onClick={() => setSpeed(value)}
              >
                {value === 0 ? <><Pause size={10} className="mx-auto mb-0.5"/>PAUSE</> :
                 value === 1 ? <><Play size={10} className="mx-auto mb-0.5"/>WATCH<div className="text-[6px] opacity-50">1×</div></> :
                 value === 2 ? <><FastForward size={10} className="mx-auto mb-0.5"/>QUICK<div className="text-[6px] opacity-50">2×</div></> :
                 <><FastForward size={10} className="mx-auto mb-0.5"/>FAST<div className="text-[6px] opacity-50">4×</div></>}
              </button>
            ))}
          </div>

          {!committed && (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-[8px] font-black tracking-widest text-paper/40">INTENSITY
                <select className="ink-input mt-1 w-full px-2 py-2 text-xs" value={intensity} onChange={(e) => setIntensity(e.target.value as ArcballIntensity)}>
                  <option value="calm">CALM · lower fatigue</option>
                  <option value="normal">NORMAL</option>
                  <option value="push">PUSH · more attack / fatigue</option>
                  <option value="allin">ALL IN · huge risk / fatigue</option>
                </select>
              </label>
              <label className="text-[8px] font-black tracking-widest text-paper/40">TOUCHLINE INSTRUCTION
                <select className="ink-input mt-1 w-full px-2 py-2 text-xs" value={instruction} onChange={(e) => setInstruction(e.target.value as ArcballInstruction)}>
                  <option value="none">NO CHANGE</option>
                  <option value="feed">FEED STRIKER</option>
                  <option value="flanks">WORK THE FLANKS</option>
                  <option value="keep">KEEP POSSESSION</option>
                  <option value="press">PRESS HIGH</option>
                  <option value="drop">DROP BACK</option>
                </select>
              </label>
            </div>
          )}

          <div className="rounded-xl border border-line bg-panel2/55 p-3">
            <div className="mb-2 text-[8px] font-black tracking-[0.2em] text-paper/40">MATCH FEED · LATEST FIRST</div>
            <div className="space-y-1.5">
              {[...match.events].reverse().slice(0, 7).map((event, index) => (
                <div key={event.minute + "|" + index + "|" + event.text} className={cn(
                  "rounded-md border border-line/40 bg-abyss/25 px-2 py-1.5 text-[10px] leading-relaxed",
                  event.kind === "goal" ? "border-gold/35 font-black text-gold" :
                  event.kind === "shot" ? "text-white" : "text-paper/60"
                )}>
                  <span className="mr-2 inline-block w-7 text-right font-black text-paper/30">{event.minute}'</span>{event.text}
                </div>
              ))}
            </div>
          </div>

          {committed ? (
            <div className="ink-card border-gold/50 p-4 text-center">
              <div className="font-display text-xl font-black text-gold">FULL TIME · {match.homeScore}–{match.awayScore}</div>
              <div className="mt-1 text-[10px] text-paper/50">Arc Tokens, creator followers, studio fans and player energy have been applied.</div>
              <Btn variant="gold" className="mt-3" onClick={onDone}>BACK TO STUDIO</Btn>
            </div>
          ) : (
            <Btn variant="ghost" className="w-full" onClick={instant}><SkipForward size={14}/> INSTANT RESULT FROM HERE</Btn>
          )}
        </div>
      </div>

      {halfTime && !committed && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="ink-card w-full max-w-sm border-gold/50 p-5">
            <div className="text-center text-[9px] font-black tracking-[0.3em] text-gold">HALF TIME</div>
            <div className="mt-1 text-center font-display text-2xl font-black">{run.studio} {playerScore}–{opponentScore} {rival?.name ?? rivalId}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <HalfStat label="POSSESSION" value={playerPoss + "%"} />
              <HalfStat label="SHOTS" value={playerShots.toString()} />
              <HalfStat label="ON TARGET" value={playerOnTarget.toString()} />
            </div>
            <div className="mt-4 text-[9px] leading-relaxed text-paper/55">
              The clock is stopped. Change intensity or your touchline instruction below before starting the second half.
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <select className="ink-input px-2 py-2 text-xs" value={intensity} onChange={(e) => setIntensity(e.target.value as ArcballIntensity)}>
                <option value="calm">CALM</option>
                <option value="normal">NORMAL</option>
                <option value="push">PUSH</option>
                <option value="allin">ALL IN</option>
              </select>
              <select className="ink-input px-2 py-2 text-xs" value={instruction} onChange={(e) => setInstruction(e.target.value as ArcballInstruction)}>
                <option value="none">NO CHANGE</option>
                <option value="feed">FEED STRIKER</option>
                <option value="flanks">WORK FLANKS</option>
                <option value="keep">KEEP BALL</option>
                <option value="press">PRESS HIGH</option>
                <option value="drop">DROP BACK</option>
              </select>
            </div>
            <Btn variant="gold" className="mt-4 w-full" onClick={() => { setHalfTime(false); setSpeed(1); }}>
              <Play size={14}/> START SECOND HALF · WATCH
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveStat({ label, left, right }: { label: string; left: string | number; right: string | number }) {
  return (
    <div className="border-r border-line last:border-r-0 p-1.5">
      <div className="text-[6px] font-black tracking-widest text-paper/30">{label}</div>
      <div className="mt-0.5 font-display text-xs font-black"><span className="text-cyanx">{left}</span><span className="mx-1 text-paper/20">–</span><span className="text-neon">{right}</span></div>
    </div>
  );
}

function HalfStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-line bg-panel2/60 p-2"><div className="text-[7px] font-black tracking-wider text-paper/35">{label}</div><div className="font-display text-xl font-black text-cyanx">{value}</div></div>;
}

function PitchHead({
  x,
  y,
  name,
  portrait,
  active,
  hasBall,
  player = false,
  energy,
}: {
  x: number;
  y: number;
  name: string;
  portrait?: string;
  active: boolean;
  hasBall: boolean;
  player?: boolean;
  energy?: number;
}) {
  const tired = energy !== undefined && energy <= 35;
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-[1400ms] ease-in-out"
      style={{ left: x + "%", top: y + "%" }}
    >
      <div className="relative">
        <div className={cn(
          "h-9 w-9 overflow-hidden rounded-full border-2 bg-panel shadow-md transition-all duration-500 sm:h-10 sm:w-10",
          active ? "scale-125 border-gold shadow-[0_0_12px_rgba(255,214,90,.85)]" : player ? "border-cyanx/70" : "border-neon/70",
          tired && "opacity-70"
        )}>
          {portrait ? <Portrait img={portrait} name={name} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center text-xs font-black">{name[0]}</div>}
        </div>
        {hasBall && <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-black/60 bg-white shadow-[0_0_7px_white]"/>}
      </div>
      <div className={cn("mt-0.5 max-w-[68px] truncate rounded px-1 py-0.5 text-[7px] font-black shadow", player ? "bg-cyanx/90 text-ink" : "bg-neon/90 text-white")}>{name}</div>
      {energy !== undefined && (
        <div className="mt-0.5 w-12 overflow-hidden rounded-full border border-black/30 bg-black/45">
          <div className={cn("h-1 transition-all", energy <= 35 ? "bg-neon" : energy <= 60 ? "bg-gold" : "bg-mint")} style={{ width: Math.max(0, Math.min(100, energy)) + "%" }}/>
        </div>
      )}
      {tired && <div className="mt-0.5 rounded bg-ink/80 px-1 text-[6px] font-black text-neon">TIRED</div>}
    </div>
  );
}
