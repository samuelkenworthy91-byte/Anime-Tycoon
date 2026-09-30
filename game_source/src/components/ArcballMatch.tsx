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

const VISUAL_BEATS = 5;

function moveTowardGoal(point: [number, number], player: boolean, amount: number): [number, number] {
  return [point[0], player ? Math.max(9, point[1] - amount) : Math.min(91, point[1] + amount)];
}

function lerpPoint(a: [number, number], b: [number, number], amount: number): [number, number] {
  return [a[0] + (b[0] - a[0]) * amount, a[1] + (b[1] - a[1]) * amount];
}

function visualPhaseFor(matchPhase: ArcballMatchPhase, beat: number): ArcballMatchPhase {
  if (beat <= 0) return "buildup";
  if (beat === 1) return "midfield";
  if (beat === 2) return matchPhase === "breakaway" ? "breakaway" : "midfield";
  if (beat === 3 && (matchPhase === "shot" || matchPhase === "goal")) return "chance";
  return matchPhase;
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
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (!match || speed === 0 || committed || halfTime) return;
    const finalBeat = match.minute === 0 ? 1 : VISUAL_BEATS - 1;
    if (match.minute >= 90 && beat >= finalBeat) return;
    const beatDelay = speed === 1 ? 1120 : speed === 2 ? 560 : 255;
    const importantHold = beat === finalBeat && (match.phase === "goal" || match.phase === "shot") ? 1.45 : 1;
    const timer = window.setTimeout(() => {
      if (beat < finalBeat) {
        setBeat((value) => value + 1);
        return;
      }
      if (match.minute < 90) {
        setBeat(0);
        setMatch((current) => current ? stepArcballMatch(run, current, intensity, instruction) : current);
      }
    }, beatDelay * importantHold);
    return () => window.clearTimeout(timer);
  }, [match, beat, speed, intensity, instruction, run, committed, halfTime]);

  useEffect(() => {
    if (!match || committed || halfTimeSeen || match.minute !== 45 || beat < VISUAL_BEATS - 1) return;
    setSpeed(0);
    setHalfTime(true);
    setHalfTimeSeen(true);
  }, [match, beat, committed, halfTimeSeen]);

  useEffect(() => {
    if (!match || match.minute < 90 || beat < VISUAL_BEATS - 1 || committed) return;
    const next = finishArcballMatch(run, match, "watch");
    if (!next) return;
    setRun(() => next);
    setCommitted(true);
    setSpeed(0);
    sfx.fanfare();
  }, [match, beat, committed, run, setRun]);

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
  const visualPhase = visualPhaseFor(match.phase, beat);
  const supportBase = playerHasBall && supportPlayerRow
    ? pitchPoint(supportPlayerRow.position, true, false, visualPhase)
    : !playerHasBall && supportRival
      ? pitchPoint(supportRival.position, false, false, visualPhase)
      : null;
  const activeBase = playerHasBall && activePlayerRow
    ? pitchPoint(activePlayerRow.position, true, false, visualPhase)
    : !playerHasBall && activeRival
      ? pitchPoint(activeRival.position, false, false, visualPhase)
      : null;
  const supportCarry = supportBase ? moveTowardGoal(supportBase, playerHasBall, 6) : null;
  const receivePoint = activeBase ? moveTowardGoal(activeBase, playerHasBall, 5) : null;
  const activeCarry = activeBase ? moveTowardGoal(activeBase, playerHasBall, match.phase === "breakaway" ? 14 : 10) : null;
  const goalPoint: [number, number] = playerHasBall ? [50, 7] : [50, 93];
  const defendingAnchorBase = playerHasBall
    ? rivalPlayers.find((p) => p.position === "anchor")
    : playerRows.find((row) => row.position === "anchor");
  const defendingAnchorPoint: [number, number] | null = defendingAnchorBase
    ? playerHasBall
      ? pitchPoint((defendingAnchorBase as (typeof rivalPlayers)[number]).position, false, false, visualPhase)
      : pitchPoint((defendingAnchorBase as (typeof playerRows)[number]).position, true, false, visualPhase)
    : null;
  const interceptPoint = activeCarry && defendingAnchorPoint ? lerpPoint(activeCarry, defendingAnchorPoint, .52) : activeCarry;

  let ballPoint: [number, number] = [50, 50];
  if (match.minute > 0) {
    if (beat === 0) ballPoint = supportBase ?? activeBase ?? [50, 50];
    else if (beat === 1) ballPoint = supportCarry ?? activeBase ?? [50, 50];
    else if (beat === 2) ballPoint = receivePoint ?? activeBase ?? [50, 50];
    else if (beat === 3) ballPoint = activeCarry ?? receivePoint ?? [50, 50];
    else if (match.phase === "goal" || match.phase === "shot") ballPoint = goalPoint;
    else if (match.phase === "defence") ballPoint = interceptPoint ?? activeCarry ?? [50, 50];
    else ballPoint = activeCarry ?? receivePoint ?? [50, 50];
  }

  const latestEvent = match.events[match.events.length - 1];
  const playerScore = match.playerIsHome ? match.homeScore : match.awayScore;
  const opponentScore = match.playerIsHome ? match.awayScore : match.homeScore;
  const playerShots = match.playerIsHome ? match.homeShots : match.awayShots;
  const opponentShots = match.playerIsHome ? match.awayShots : match.homeShots;
  const playerOnTarget = match.playerIsHome ? match.homeOnTarget : match.awayOnTarget;
  const opponentOnTarget = match.playerIsHome ? match.awayOnTarget : match.homeOnTarget;
  const playerPoss = match.playerIsHome ? homePoss : awayPoss;
  const opponentPoss = 100 - playerPoss;
  const attackingTeam = playerHasBall ? run.studio : (rival?.name ?? rivalId);
  const supportName = playerHasBall ? supportPlayerRow?.member.name : supportRival?.name;
  const activeName = playerHasBall ? activePlayerRow?.member.name : activeRival?.name;
  const defenderName = playerHasBall
    ? rivalPlayers.find((p) => p.position === "anchor")?.name
    : playerRows.find((row) => row.position === "anchor")?.member.name;
  const liveCommentary = match.minute === 0
    ? "The teams settle into shape around centre court. The opening possession is about to begin."
    : beat === 0
      ? (supportName ?? activeName ?? attackingTeam) + " brings the ball under control for " + attackingTeam + " and looks upfield."
      : beat === 1
        ? (supportName ?? activeName ?? "The carrier") + " advances with the ball as " + (activeName ?? "a teammate") + " moves away from a marker to offer the next pass."
        : beat === 2
          ? supportName && activeName
            ? supportName + " releases the ball into " + activeName + "'s path. " + activeName + " moves to meet it rather than waiting for the pass."
            : (activeName ?? "The receiver") + " takes the next pass on the move."
          : beat === 3
            ? match.phase === "goal" || match.phase === "shot"
              ? (activeName ?? "The attacker") + " drives into the scoring lane. " + (defenderName ?? "The last defender") + " closes across while the keeper sets for the shot."
              : match.phase === "defence"
                ? (activeName ?? "The receiver") + " tries to turn into space, but " + (defenderName ?? "the defence") + " is already stepping toward the passing lane."
                : match.phase === "breakaway"
                  ? (activeName ?? "The runner") + " accelerates into open space with the defence retreating toward goal."
                  : (activeName ?? "The receiver") + " takes possession and carries forward while teammates reshape around the ball."
            : latestEvent?.text ?? "The move comes to an end.";
  const visibleHomeScore = match.phase === "goal" && beat < VISUAL_BEATS - 1 && match.lastPossession === "home" ? Math.max(0, match.homeScore - 1) : match.homeScore;
  const visibleAwayScore = match.phase === "goal" && beat < VISUAL_BEATS - 1 && match.lastPossession === "away" ? Math.max(0, match.awayScore - 1) : match.awayScore;
  const visibleEvents = beat < VISUAL_BEATS - 1 && match.minute > 0 ? match.events.slice(0, -1) : match.events;
  const ballTransitionMs = speed === 1 ? 900 : speed === 2 ? 430 : 190;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-ink">
      <div className="flex items-center gap-2 border-b border-line bg-panel2/90 px-3 py-2">
        <Shield size={15} className="text-cyanx"/>
        <div className="min-w-0 flex-1">
          <div className="text-[8px] font-black tracking-[0.25em] text-cyanx">ARCBALL LEAGUE · YEAR {state.seasonYear}</div>
          <div className="truncate font-display text-sm font-black">{homeName} <span className="text-gold">{visibleHomeScore}–{visibleAwayScore}</span> {awayName}</div>
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
              {PHASE_LABEL[visualPhase]}
            </div>

            {beat === 2 && supportCarry && receivePoint && (
              <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line
                  x1={supportCarry[0]} y1={supportCarry[1]}
                  x2={receivePoint[0]} y2={receivePoint[1]}
                  stroke="rgba(255,255,255,.72)"
                  strokeWidth="0.75"
                  strokeDasharray="2.2 1.7"
                />
              </svg>
            )}
            {beat === 4 && activeCarry && (match.phase === "goal" || match.phase === "shot") && (
              <svg className="pointer-events-none absolute inset-0 z-[5] h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                <line
                  x1={activeCarry[0]} y1={activeCarry[1]}
                  x2={goalPoint[0]} y2={goalPoint[1]}
                  stroke="rgba(255,214,90,.8)"
                  strokeWidth="0.9"
                  strokeDasharray="2 1.4"
                />
              </svg>
            )}

            {rivalPlayers.map((player) => {
              const isSupport = !playerHasBall && match.supportingRivalName === player.name;
              const isActive = !playerHasBall && match.activeRivalName === player.name;
              const isDefender = playerHasBall && player.position === "anchor";
              let point = pitchPoint(player.position, false, false, visualPhase);
              if (isSupport && beat >= 1) point = supportCarry ?? point;
              if (isActive && beat >= 2) point = beat >= 3 ? (activeCarry ?? receivePoint ?? point) : (receivePoint ?? point);
              if (isDefender && beat >= 3 && activeCarry) point = lerpPoint(point, activeCarry, beat === 3 ? .35 : .52);
              return (
                <PitchHead
                  key={player.id}
                  x={point[0]}
                  y={point[1]}
                  name={player.name.split(" ")[0]}
                  active={isActive || isDefender}
                  hasBall={false}
                  portrait={WORKER_LOOKS[player.look]?.portrait}
                  transitionMs={ballTransitionMs}
                />
              );
            })}

            {playerRows.map(({ position, member }) => {
              const isSupport = playerHasBall && match.supportingPlayerId === member.id;
              const isActive = playerHasBall && match.activePlayerId === member.id;
              const isDefender = !playerHasBall && position === "anchor";
              let point = pitchPoint(position, true, false, visualPhase);
              if (isSupport && beat >= 1) point = supportCarry ?? point;
              if (isActive && beat >= 2) point = beat >= 3 ? (activeCarry ?? receivePoint ?? point) : (receivePoint ?? point);
              if (isDefender && beat >= 3 && activeCarry) point = lerpPoint(point, activeCarry, beat === 3 ? .35 : .52);
              const projectedEnergy = Math.max(0, Math.round(member.stamina - (match.effort[member.id] ?? 0)));
              return (
                <PitchHead
                  key={member.id}
                  x={point[0]}
                  y={point[1]}
                  name={member.name.split(" ")[0]}
                  active={isActive || isDefender}
                  hasBall={false}
                  portrait={workerLook(member).portrait}
                  player
                  energy={projectedEnergy}
                  transitionMs={ballTransitionMs}
                />
              );
            })}

            <div
              className="pointer-events-none absolute z-30 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/70 shadow-[0_0_8px_rgba(255,255,255,.85)]"
              style={{
                left: ballPoint[0] + "%",
                top: ballPoint[1] + "%",
                transitionProperty: "left, top",
                transitionDuration: ballTransitionMs + "ms",
                transitionTimingFunction: "ease-in-out",
                background: "conic-gradient(#fff 0 18%, #222 18% 34%, #fff 34% 52%, #222 52% 68%, #fff 68% 84%, #222 84% 100%)",
              }}
              aria-label="Arcball"
            />

            {beat === VISUAL_BEATS - 1 && (match.phase === "goal" || match.phase === "shot") && latestEvent && (
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

          <div className="rounded-xl border border-cyanx/30 bg-cyanx/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[8px] font-black tracking-[0.22em] text-cyanx">LIVE PLAY · {match.minute}'</div>
              <div className="text-[7px] font-black text-paper/35">{Math.min(beat + 1, VISUAL_BEATS)}/{VISUAL_BEATS}</div>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-paper/80">{liveCommentary}</div>
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
              {[...visibleEvents].reverse().slice(0, 7).map((event, index) => (
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
  transitionMs = 900,
}: {
  x: number;
  y: number;
  name: string;
  portrait?: string;
  active: boolean;
  hasBall: boolean;
  player?: boolean;
  energy?: number;
  transitionMs?: number;
}) {
  const tired = energy !== undefined && energy <= 35;
  return (
    <div
      className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center ease-in-out"
      style={{ left: x + "%", top: y + "%", transitionProperty: "left, top", transitionDuration: transitionMs + "ms" }}
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
