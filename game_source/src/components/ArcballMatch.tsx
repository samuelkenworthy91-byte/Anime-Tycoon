import { useEffect, useMemo, useState } from "react";
import { FastForward, Pause, Play, Shield, SkipForward, X } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { WORKER_LOOKS, workerLook } from "../engine/data";
import {
  ARCBALL_POSITION_LABEL,
  ARCBALL_POSITIONS,
  arcballStateOf,
  arcballTeamName,
  beginArcballMatch,
  finishArcballMatch,
  rivalArcballRoster,
  stepArcballMatch,
  type ArcballInstruction,
  type ArcballIntensity,
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

  useEffect(() => {
    if (!match || match.minute >= 90 || speed === 0 || committed) return;
    const timer = window.setTimeout(() => {
      setMatch((current) => current ? stepArcballMatch(run, current, intensity, instruction) : current);
    }, Math.max(220, 1050 / speed));
    return () => window.clearTimeout(timer);
  }, [match, speed, intensity, instruction, run, committed]);

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
      setSpeed(0);
      sfx.fanfare();
    }
  };

  const homeName = arcballTeamName(run, fixture.homeId);
  const awayName = arcballTeamName(run, fixture.awayId);

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
          <div className="relative aspect-[3/4] max-h-[58vh] min-h-[360px] overflow-hidden rounded-xl border-2 border-[#d7e7b3]/40 bg-[#235a36] shadow-inner sm:aspect-[5/3] sm:min-h-[320px]">
            <div className="absolute inset-[4%] border border-white/45"/>
            <div className="absolute left-[4%] right-[4%] top-1/2 border-t border-white/45"/>
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/45"/>
            <div className="absolute left-[35%] right-[35%] top-[4%] h-[10%] border border-t-0 border-white/45"/>
            <div className="absolute bottom-[4%] left-[35%] right-[35%] h-[10%] border border-b-0 border-white/45"/>
            <div className="absolute left-1/2 top-[3%] -translate-x-1/2 rounded bg-ink/65 px-2 py-0.5 text-[7px] font-black text-white/70">{rival?.name ?? rivalId}</div>
            <div className="absolute bottom-[3%] left-1/2 -translate-x-1/2 rounded bg-ink/65 px-2 py-0.5 text-[7px] font-black text-white/70">{run.studio}</div>

            {rivalPlayers.map((player, index) => {
              const [x0, y0] = RIVAL_BASE[player.position];
              const x = x0 + Math.sin((match.minute + index * 9) / 13) * 3.2;
              const y = y0 + Math.cos((match.minute + index * 7) / 17) * 2.3;
              const active = match.activeRivalName === player.name;
              return (
                <PitchHead key={player.id} x={x} y={y} name={player.name.split(" ")[0]} active={active} portrait={WORKER_LOOKS[player.look]?.portrait}/>
              );
            })}

            {playerRows.map(({ position, member }, index) => {
              const [x0, y0] = PLAYER_BASE[position];
              const x = x0 + Math.sin((match.minute + index * 11) / 12) * 3.4;
              const y = y0 + Math.cos((match.minute + index * 5) / 16) * 2.4;
              const active = match.activePlayerId === member.id;
              return (
                <PitchHead key={member.id} x={x} y={y} name={member.name.split(" ")[0]} active={active} portrait={workerLook(member).portrait} player/>
              );
            })}

            <div className={cn("absolute h-2.5 w-2.5 rounded-full border border-black/50 bg-white shadow transition-all duration-500", match.lastPossession === "home" ? (match.playerIsHome ? "bottom-[44%] left-[49%]" : "top-[44%] left-[49%]") : match.lastPossession === "away" ? (match.playerIsHome ? "top-[44%] left-[49%]" : "bottom-[44%] left-[49%]") : "left-[49%] top-[49%]")}/>
          </div>

          <div className="grid grid-cols-4 gap-1">
            {([0,1,2,4] as const).map((value) => (
              <button key={value} className={cn("btn-press rounded-lg border py-2 text-[9px] font-black", speed === value ? "border-cyanx bg-cyanx/15 text-cyanx" : "border-line bg-panel2/50 text-paper/45")} onClick={() => setSpeed(value)}>
                {value === 0 ? <><Pause size={10} className="mx-auto"/>PAUSE</> : value === 1 ? <><Play size={10} className="mx-auto"/>1×</> : <><FastForward size={10} className="mx-auto"/>{value}×</>}
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
            <div className="mb-1 text-[8px] font-black tracking-[0.2em] text-paper/40">MATCH FEED</div>
            <div className="space-y-1">
              {[...match.events].reverse().slice(0, 7).map((event, index) => (
                <div key={event.minute + "|" + index + "|" + event.text} className={cn("text-[10px]", event.kind === "goal" ? "font-black text-gold" : "text-paper/55")}>
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
    </div>
  );
}

function PitchHead({
  x,
  y,
  name,
  portrait,
  active,
  player = false,
}: {
  x: number;
  y: number;
  name: string;
  portrait?: string;
  active: boolean;
  player?: boolean;
}) {
  return (
    <div className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-all duration-700" style={{ left: x + "%", top: y + "%" }}>
      <div className={cn("h-9 w-9 overflow-hidden rounded-full border-2 bg-panel shadow-md transition-transform sm:h-10 sm:w-10", active ? "scale-125 border-gold" : player ? "border-cyanx/70" : "border-neon/70")}>
        {portrait ? <Portrait img={portrait} name={name} alt="" className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center text-xs font-black">{name[0]}</div>}
      </div>
      <div className={cn("mt-0.5 max-w-[62px] truncate rounded px-1 py-0.5 text-[7px] font-black shadow", player ? "bg-cyanx/90 text-ink" : "bg-neon/90 text-white")}>{name}</div>
    </div>
  );
}
