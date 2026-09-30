import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Coins,
  Dumbbell,
  FastForward,
  Gift,
  Play,
  Shield,
  Trophy,
  Users,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  ROLE_POINT,
  dateLabel,
  formatNum,
  workerLook,
  type PointType,
} from "../engine/data";
import {
  ARCBALL_APPROACHES,
  ARCBALL_CONSUMABLES,
  ARCBALL_SPONSORS,
  ARCBALL_DRILLS,
  ARCBALL_FORMATIONS,
  ARCBALL_POSITION_LABEL,
  ARCBALL_POSITIONS,
  activateArcball,
  applyChampionshipSpotlight,
  arcballArchetype,
  arcballPotentialLabel,
  arcballSponsorBlock,
  arcballTrainingReadiness,
  arcballProfile,
  arcballReady,
  arcballStandings,
  arcballStateOf,
  arcballTeamName,
  arcballUnlockReason,
  instantResolveArcballFixture,
  nextArcballFixture,
  playableArcballFixture,
  redeemArcballMedal,
  registerArcballPlayer,
  setArcballLineup,
  setArcballTactics,
  signArcballSponsor,
  trainArcball,
  useArcballConsumable,
  type ArcballApproachId,
  type ArcballFormationId,
  type ArcballSponsorId,
} from "../engine/arcball";
import type { RunState } from "../engine/state";
import { canSeeEmployeePotential } from "../engine/staffPotential";
import Portrait from "./Portrait";
import FirstSeenTutorial, { TutorialHelpButton } from "./FirstSeenTutorial";
import { markTutorialSeen, tutorialSeen } from "../engine/tutorials";
import { cn } from "../utils/cn";

type Tab = "squad" | "fixtures" | "league" | "training" | "rewards";

export default function ArcballPanel({
  run,
  setRun,
  onMatch,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onMatch: (fixtureId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>("squad");
  const state = arcballStateOf(run);
  const block = arcballUnlockReason(run);
  const next = nextArcballFixture(run);
  const playable = playableArcballFixture(run);
  const [rewardStaffId, setRewardStaffId] = useState(run.staff[0]?.id ?? "");
  const [rewardPoint, setRewardPoint] = useState<PointType>("story");
  const [spotlightKey, setSpotlightKey] = useState(Object.keys(run.franchises)[0] ?? "");
  const [help, setHelp] = useState(false);
  useEffect(() => {
    if (!block && !tutorialSeen(run, "arcball")) setHelp(true);
  }, [block, run.tutorialsSeen]);
  const dismissHelp = () => {
    setRun((r) => markTutorialSeen(r, "arcball"));
    setHelp(false);
  };

  if (!state.unlocked) {
    return (
      <div className="space-y-3">
        <div className="ink-card border-cyanx/40 p-4">
          <div className="flex items-center gap-2 text-cyanx">
            <Trophy size={19} />
            <div className="min-w-0 flex-1 font-display text-xl font-black">ARCBALL LEAGUE</div>
            <TutorialHelpButton label="WHAT IS ARCBALL?" onClick={() => setHelp(true)} />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-paper/60">
            Five employees represent the studio in the anime industry's inter-studio sport. Arcball skill is completely separate from Story, Art and Sound: a weak producer can still be a star athlete.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
            <div className={cn("rounded-lg border p-2", run.officeLevel >= 1 ? "border-mint/40 bg-mint/5 text-mint" : "border-line text-paper/45")}>
              <b>STUDIO</b><br/>Anime Runner Building or larger
            </div>
            <div className={cn("rounded-lg border p-2", run.staff.length >= 5 ? "border-mint/40 bg-mint/5 text-mint" : "border-line text-paper/45")}>
              <b>ROSTER</b><br/>{run.staff.length}/5 employees
            </div>
          </div>
          <Btn
            variant="cyan"
            className="mt-3 w-full"
            disabled={!!block}
            onClick={() => {
              sfx.fanfare();
              setRun((r) => activateArcball(r) ?? r);
            }}
          >
            <Trophy size={15}/> {block ? block.toUpperCase() : "ENTER THE ARCBALL LEAGUE"}
          </Btn>
        </div>
        <div className="text-[10px] text-paper/40">
          Arcball uses the workers you already employ. Matches drain their real studio energy, while sporting fame grows their existing creator following.
        </div>
        <FirstSeenTutorial id="arcball" open={help} onDismiss={dismissHelp} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: "squad", label: "SQUAD", icon: Users },
    { id: "fixtures", label: "FIXTURES", icon: CalendarDays },
    { id: "league", label: "LEAGUE", icon: Trophy },
    { id: "training", label: "TRAINING", icon: Dumbbell },
    { id: "rewards", label: "REWARDS", icon: Gift },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="font-display text-lg font-black text-cyanx">ARCBALL LEAGUE</div>
          <div className="text-[8px] text-paper/40">Workers, rivalries and studio prestige.</div>
        </div>
        <TutorialHelpButton label="HOW ARCBALL WORKS" onClick={() => setHelp(true)} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="ARC TOKENS" value={state.tokens.toString()} icon={<Coins size={13}/>} />
        <Stat label="TITLES" value={state.titles.toString()} icon={<Trophy size={13}/>} />
        <Stat label="SPOTLIGHTS" value={state.championshipSpotlights.toString()} icon={<Gift size={13}/>} />
      </div>

      {next && (
        <div className={cn("rounded-xl border p-3", playable ? "border-cyanx/60 bg-cyanx/10" : "border-line bg-panel2/50")}>
          <div className="text-[8px] font-black tracking-[0.25em] text-paper/40">NEXT ARCBALL FIXTURE · {dateLabel(next.week)}</div>
          <div className="mt-1 flex items-center gap-2">
            <div className="min-w-0 flex-1 font-display text-sm font-black">
              {arcballTeamName(run, next.homeId)} <span className="text-paper/35">VS</span> {arcballTeamName(run, next.awayId)}
            </div>
            {playable && playable.id === next.id && (
              <Btn variant="cyan" className="!px-2 !py-1 text-[9px]" onClick={() => onMatch(next.id)}><Play size={10}/> MANAGE</Btn>
            )}
          </div>
          <div className="mt-1 text-[9px] text-paper/45">
            {playable ? "Match week is live. Manage it now or it auto-simulates next week." : arcballReady(run) ? "Your five starters are ready." : "Set all five starting positions before the fixture."}
          </div>
        </div>
      )}

      <div className="grid grid-cols-5 gap-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} className={cn("btn-press rounded-lg border px-1 py-2 text-[8px] font-black", tab === id ? "border-cyanx bg-cyanx/15 text-cyanx" : "border-line bg-panel2/50 text-paper/45")} onClick={() => { sfx.click(); setTab(id); }}>
            <Icon size={12} className="mx-auto mb-0.5"/>{label}
          </button>
        ))}
      </div>

      {tab === "squad" && <Squad run={run} setRun={setRun} />}
      {tab === "fixtures" && <Fixtures run={run} setRun={setRun} onMatch={onMatch} />}
      {tab === "league" && <League run={run} setRun={setRun} />}
      {tab === "training" && <Training run={run} setRun={setRun} />}
      {tab === "rewards" && (
        <Rewards
          run={run}
          setRun={setRun}
          staffId={rewardStaffId}
          setStaffId={setRewardStaffId}
          point={rewardPoint}
          setPoint={setRewardPoint}
          spotlightKey={spotlightKey}
          setSpotlightKey={setSpotlightKey}
        />
      )}
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-panel2/65 p-2 text-center"><div className="flex items-center justify-center gap-1 text-[7px] font-black tracking-widest text-paper/40">{icon}{label}</div><div className="font-display text-lg font-black text-gold">{value}</div></div>;
}

function Squad({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const state = arcballStateOf(run);
  const canSeePotential = canSeeEmployeePotential(run.research);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[9px] font-black tracking-wider text-paper/45">FORMATION
          <select
            className="ink-input mt-1 w-full px-2 py-2 text-xs"
            value={state.formation}
            onChange={(e) => setRun((r) => setArcballTactics(r, e.target.value as ArcballFormationId, arcballStateOf(r).approach))}
          >
            {Object.entries(ARCBALL_FORMATIONS).map(([id, def]) => <option key={id} value={id}>{def.label}</option>)}
          </select>
        </label>
        <label className="text-[9px] font-black tracking-wider text-paper/45">APPROACH
          <select
            className="ink-input mt-1 w-full px-2 py-2 text-xs"
            value={state.approach}
            onChange={(e) => setRun((r) => setArcballTactics(r, arcballStateOf(r).formation, e.target.value as ArcballApproachId))}
          >
            {Object.entries(ARCBALL_APPROACHES).map(([id, def]) => <option key={id} value={id}>{def.label}</option>)}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-line bg-panel2/40 p-2">
        <div className="mb-1 text-[9px] font-black tracking-[0.2em] text-cyanx">STARTING FIVE</div>
        <div className="space-y-1.5">
          {ARCBALL_POSITIONS.map((position) => {
            const id = state.lineup[position] ?? "";
            const member = run.staff.find((s) => s.id === id);
            const profile = member ? arcballProfile(member, state.players[member.id]) : null;
            return (
              <div key={position} className="grid grid-cols-[74px_1fr_42px] items-center gap-2 rounded-lg border border-line/70 bg-abyss/40 p-1.5">
                <span className="text-[9px] font-black text-gold">{ARCBALL_POSITION_LABEL[position].toUpperCase()}</span>
                <select className="ink-input min-w-0 px-2 py-1.5 text-[11px]" value={id} onChange={(e) => setRun((r) => setArcballLineup(r, position, e.target.value || null) ?? r)}>
                  <option value="">— EMPTY —</option>
                  {state.registered.map((staffId) => {
                    const s = run.staff.find((x) => x.id === staffId);
                    return s ? <option key={s.id} value={s.id}>{s.name}</option> : null;
                  })}
                </select>
                <span className={cn("text-right font-display text-sm font-black", profile ? "text-mint" : "text-paper/25")}>{profile ? profile.overall : "—"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[9px] font-black tracking-[0.2em] text-paper/45">REGISTRATION · {state.registered.length}/8</div>
        <div className="space-y-1.5">
          {run.staff.map((member) => {
            const registered = state.registered.includes(member.id);
            const profile = arcballProfile(member, state.players[member.id]);
            return (
              <div key={member.id} className={cn("flex items-center gap-2 rounded-lg border p-2", registered ? "border-cyanx/35 bg-cyanx/5" : "border-line bg-panel2/35")}>
                <Portrait img={workerLook(member).portrait} name={member.name} alt="" className="h-9 w-9 rounded-full border border-line object-cover"/>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold">{member.name}</div>
                  <div className="text-[8px] text-paper/45">
                    {profile.bestPosition.toUpperCase()} · ARC {profile.overall} · {arcballArchetype(profile).label.toUpperCase()} · FORM {state.players[member.id]?.form > 0 ? "+" : ""}{state.players[member.id]?.form ?? 0}
                  </div>
                  <div className="text-[7px] text-paper/35">{canSeePotential ? "POT " + arcballPotentialLabel(profile.potential).toUpperCase() : "POTENTIAL UNKNOWN"} · {(state.players[member.id]?.appearances ?? 0)} apps · {(state.players[member.id]?.goals ?? 0)} G · {(state.players[member.id]?.assists ?? 0)} A · {Math.round(state.players[member.id]?.arcballFans ?? 0).toLocaleString("en-GB")} sport fans</div>
                </div>
                <Btn variant={registered ? "ghost" : "cyan"} className="!px-2 !py-1 text-[8px]" disabled={!registered && state.registered.length >= 8} onClick={() => setRun((r) => registerArcballPlayer(r, member.id) ?? r)}>
                  {registered ? "REMOVE" : "REGISTER"}
                </Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Fixtures({ run, setRun, onMatch }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void; onMatch: (fixtureId: string) => void }) {
  const state = arcballStateOf(run);
  const fixtures = useMemo(() => state.fixtures.filter((f) => f.homeId === "player" || f.awayId === "player").sort((a, b) => b.week - a.week), [state.fixtures]);
  return (
    <div className="space-y-1.5">
      {fixtures.map((f) => {
        const played = f.homeScore !== undefined && f.awayScore !== undefined;
        const due = !played && f.week <= run.week;
        const canPlay = due && arcballReady(run);
        return (
          <div key={f.id} className={cn("rounded-lg border p-2", due ? "border-cyanx/50 bg-cyanx/5" : "border-line bg-panel2/35")}>
            <div className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[8px] font-black text-paper/40">{dateLabel(f.week)}</span>
              <div className="min-w-0 flex-1 text-[10px] font-bold">{arcballTeamName(run, f.homeId)} <span className="text-paper/30">v</span> {arcballTeamName(run, f.awayId)}</div>
              {played ? (
                <span className="font-display text-sm font-black text-gold">{f.homeScore}–{f.awayScore}</span>
              ) : due ? (
                <div className="flex gap-1">
                  <Btn variant="cyan" className="!px-2 !py-1 text-[8px]" disabled={!canPlay} onClick={() => onMatch(f.id)}><Play size={9}/> MANAGE</Btn>
                  <Btn variant="ghost" className="!px-2 !py-1 text-[8px]" disabled={!canPlay} onClick={() => setRun((r) => instantResolveArcballFixture(r, f.id) ?? r)}><FastForward size={9}/> SIM</Btn>
                </div>
              ) : <span className="text-[8px] text-paper/30">UPCOMING</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function League({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const state = arcballStateOf(run);
  const table = arcballStandings(run);
  const career = Object.entries(state.players)
    .map(([id, p]) => ({ id, p, staff: run.staff.find((s) => s.id === id) }))
    .filter((row) => !!row.staff)
    .sort((a, b) => (b.p.goals * 4 + b.p.assists * 3 + b.p.playerOfMatch * 5) - (a.p.goals * 4 + a.p.assists * 3 + a.p.playerOfMatch * 5));
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-line">
        <div className="grid grid-cols-[24px_1fr_repeat(4,30px)] bg-panel3 px-2 py-1.5 text-center text-[8px] font-black text-paper/45">
          <span>#</span><span className="text-left">STUDIO</span><span>P</span><span>GD</span><span>W</span><span>PTS</span>
        </div>
        {table.map((row, index) => (
          <div key={row.teamId} className={cn("grid grid-cols-[24px_1fr_repeat(4,30px)] items-center border-t border-line/60 px-2 py-2 text-center text-[9px]", row.teamId === "player" && "bg-cyanx/8 text-cyanx")}>
            <b>{index + 1}</b><span className="truncate text-left font-bold">{arcballTeamName(run, row.teamId)}</span><span>{row.played}</span><span>{row.gd > 0 ? "+" : ""}{row.gd}</span><span>{row.wins}</span><b>{row.points}</b>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-gold/30 bg-gold/5 p-3">
        <div className="text-[9px] font-black tracking-[0.2em] text-gold">SEASON SPONSOR</div>
        {state.sponsor && state.sponsorYear === state.seasonYear ? (
          <div className="mt-1 text-[10px] text-paper/65"><b>{ARCBALL_SPONSORS[state.sponsor].name}</b> · win bonus £{ARCBALL_SPONSORS[state.sponsor].win.toLocaleString("en-GB")} · top-three/title objectives pay at season end.</div>
        ) : (
          <div className="mt-2 grid gap-2">
            {(Object.entries(ARCBALL_SPONSORS) as [ArcballSponsorId, (typeof ARCBALL_SPONSORS)[ArcballSponsorId]][]).map(([id, sponsor]) => {
              const block = arcballSponsorBlock(run, id);
              return <div key={id} className="rounded-lg border border-line bg-panel2/40 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[10px] font-bold">{sponsor.name}</div><div className="text-[8px] text-paper/40">+£{sponsor.sign.toLocaleString("en-GB")} sign · +£{sponsor.win.toLocaleString("en-GB")}/win · {sponsor.requirement}</div></div><Btn variant="gold" className="!px-2 !py-1 text-[8px]" disabled={!!block} title={block ?? ""} onClick={() => setRun((r) => signArcballSponsor(r, id) ?? r)}>{block ? "LOCKED" : "SIGN"}</Btn></div></div>;
            })}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-cyanx/30 bg-cyanx/5 p-3">
        <div className="text-[9px] font-black tracking-[0.2em] text-cyanx">RIVAL SCOUTING · PERSISTENT CAREERS</div>
        <div className="mt-1 text-[8px] text-paper/40">These are real league opponents now: they age, develop, decline and remain with their studio across seasons.</div>
        <div className="mt-2 space-y-2">
          {run.rivalWorld.studios.map((studio) => {
            const roster = state.rivalRosters[studio.id] ?? [];
            const star = [...roster].sort((a,b) => b.rating - a.rating)[0];
            return <div key={studio.id} className="rounded-lg border border-line bg-panel2/35 p-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><div className="text-[10px] font-bold">{studio.name}</div><div className="text-[8px] text-paper/40">{roster.map((p) => p.name.split(" ")[0] + " " + p.position.slice(0,3).toUpperCase() + " " + p.rating).join(" · ")}</div></div>{star && <div className="text-right"><div className="text-[7px] text-paper/35">STAR</div><div className="text-[9px] font-black text-gold">{star.name}</div><div className="text-[8px] text-paper/45">ARC {star.rating} · age {star.age ?? "?"}</div></div>}</div></div>;
          })}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel2/35 p-3">
        <div className="text-[9px] font-black tracking-[0.2em] text-paper/50">CAREER RECORDS</div>
        <div className="mt-2 space-y-1">
          {career.slice(0, 6).map(({id,p,staff},index) => <div key={id} className="grid grid-cols-[20px_1fr_auto] items-center gap-2 rounded border border-line/50 px-2 py-1.5 text-[9px]"><b className="text-paper/30">{index+1}</b><span className="truncate font-bold">{staff?.name}</span><span className="text-paper/50">{p.appearances} app · <b className="text-gold">{p.goals} G</b> · {p.assists} A · {p.playerOfMatch} POTM</span></div>)}
        </div>
        {state.honours.length > 0 && <div className="mt-3 border-t border-line/60 pt-2"><div className="text-[8px] font-black text-gold">HONOURS</div>{[...state.honours].reverse().slice(0,8).map((h,i)=><div key={h.year+"|"+h.id+"|"+h.staffId+"|"+i} className="mt-1 text-[8px] text-paper/55">Y{h.year} · {h.name} · {h.id.replaceAll("_"," ").toUpperCase()}{h.productionPerk ? " · "+h.productionPerk : ""}</div>)}</div>}
      </section>
    </div>
  );
}

function Training({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const state = arcballStateOf(run);
  const [staffId, setStaffId] = useState(state.registered[0] ?? "");
  const member = run.staff.find((s) => s.id === staffId);
  const profile = member ? arcballProfile(member, state.players[member.id]) : null;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-gold/30 bg-gold/5 p-3 text-[10px] text-paper/60">
        Arcball training permanently develops sport attributes but spends Arc Tokens and drains the worker's real studio energy. Each registered worker can train once per industry week.
      </div>
      <select className="ink-input w-full px-3 py-2 text-sm" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
        {state.registered.map((id) => {
          const s = run.staff.find((x) => x.id === id);
          return s ? <option key={id} value={id}>{s.name}</option> : null;
        })}
      </select>
      {member && profile && (
        <>
          <div className="grid grid-cols-6 gap-1">
            {Object.entries(profile.stats).map(([stat, value]) => <div key={stat} className="rounded border border-line bg-panel2/55 p-1 text-center"><div className="text-[6px] font-black text-paper/35">{stat.toUpperCase()}</div><div className="font-display text-sm font-black text-mint">{value}</div></div>)}
          </div>
          <div className="text-[9px] text-paper/45">{member.name}: {Math.round(member.stamina)}% studio energy · Arcball potential {arcballPotentialLabel(profile.potential)}</div>
          <div className="space-y-1.5">
            {ARCBALL_DRILLS.map((drill) => {
              const trained = state.players[member.id]?.lastTrainingWeek === run.week;
              const readiness = arcballTrainingReadiness(member, drill.id, run.week);
              const readinessClass = readiness.label === "EXCELLENT" ? "text-mint" : readiness.label === "GOOD" ? "text-cyanx" : readiness.label === "POOR" ? "text-neon" : "text-paper/55";
              return <div key={drill.id} className="flex items-center gap-2 rounded-lg border border-line bg-panel2/35 p-2"><div className="min-w-0 flex-1"><div className="flex items-center gap-1 text-[10px] font-bold">{drill.name}<span className={cn("rounded bg-ink/40 px-1 py-0.5 text-[7px] font-black", readinessClass)}>{readiness.label}</span></div><div className="text-[8px] text-paper/40">{drill.desc} · −{drill.stamina} energy · readiness affects gain and downside risk</div></div><Btn variant="cyan" className="!px-2 !py-1 text-[8px]" disabled={trained || state.tokens < drill.cost} onClick={() => setRun((r) => trainArcball(r, member.id, drill.id) ?? r)}>{drill.cost} TOKENS</Btn></div>;
            })}
          </div>
        </>
      )}
      <FirstSeenTutorial id="arcball" open={help} onDismiss={dismissHelp} />
    </div>
  );
}

function Rewards({
  run,
  setRun,
  staffId,
  setStaffId,
  point,
  setPoint,
  spotlightKey,
  setSpotlightKey,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  staffId: string;
  setStaffId: (id: string) => void;
  point: PointType;
  setPoint: (p: PointType) => void;
  spotlightKey: string;
  setSpotlightKey: (key: string) => void;
}) {
  const state = arcballStateOf(run);
  const ownedFranchises = Object.values(run.franchises).filter((f) => !f.soldTo);
  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-line bg-panel2/35 p-3">
        <div className="flex items-center gap-1 text-[9px] font-black tracking-[0.2em] text-cyanx"><Gift size={11}/> CONSUMABLE BOOSTS</div>
        <select className="ink-input mt-2 w-full px-2 py-2 text-xs" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          {run.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ARCBALL_CONSUMABLES.map((item) => <div key={item.id} className="rounded-lg border border-line p-2"><div className="text-[10px] font-bold">{item.name}</div><div className="text-[8px] text-paper/40">{item.desc}</div><Btn variant="ghost" className="mt-1 !px-2 !py-1 text-[8px]" disabled={!staffId || state.tokens < item.cost} onClick={() => setRun((r) => useArcballConsumable(r, item.id, staffId) ?? r)}>{item.cost} TOKENS</Btn></div>)}
        </div>
      </section>

      <section className="rounded-xl border border-gold/35 bg-gold/5 p-3">
        <div className="text-[9px] font-black tracking-[0.2em] text-gold">PERMANENT WORKER DEVELOPMENT</div>
        <div className="mt-1 text-[8px] text-paper/45">Tier 1: +2 production skill, twice per Arcball season. Tier 2: +5, once per season.</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select className="ink-input px-2 py-2 text-xs" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
            {run.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className="ink-input px-2 py-2 text-xs" value={point} onChange={(e) => setPoint(e.target.value as PointType)}>
            {(["story", "art", "sound"] as PointType[]).map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Btn variant="gold" disabled={!staffId || state.tokens < 35 || state.seasonPurchases.tier1 >= 2} onClick={() => setRun((r) => redeemArcballMedal(r, staffId, point, 1) ?? r)}>
            TIER 1 · +2 · 35 TOKENS<br/><span className="text-[8px] opacity-60">{state.seasonPurchases.tier1}/2 USED</span>
          </Btn>
          <Btn variant="gold" disabled={!staffId || state.tokens < 75 || state.seasonPurchases.tier2 >= 1} onClick={() => setRun((r) => redeemArcballMedal(r, staffId, point, 2) ?? r)}>
            TIER 2 · +5 · 75 TOKENS<br/><span className="text-[8px] opacity-60">{state.seasonPurchases.tier2}/1 USED</span>
          </Btn>
        </div>
      </section>

      <section className="rounded-xl border border-cyanx/50 bg-cyanx/8 p-3">
        <div className="flex items-center gap-1 text-[9px] font-black tracking-[0.2em] text-cyanx"><Trophy size={11}/> TOP TIER · CHAMPIONSHIP SPOTLIGHT</div>
        <div className="mt-1 text-[9px] leading-relaxed text-paper/55">
          Win the Arcball League to earn one. Apply it to a franchise for +15 popularity, −15 fatigue, ×1.30 fans and ×1.20 sales on its next release, plus ×1.20 on its next merch push. No review-score bonus.
        </div>
        <div className="mt-2 flex gap-2">
          <select className="ink-input min-w-0 flex-1 px-2 py-2 text-xs" value={spotlightKey} onChange={(e) => setSpotlightKey(e.target.value)}>
            <option value="">SELECT FRANCHISE</option>
            {ownedFranchises.map((f) => <option key={f.key} value={f.key}>{f.baseTitle}</option>)}
          </select>
          <Btn variant="cyan" disabled={!spotlightKey || state.championshipSpotlights <= 0} onClick={() => setRun((r) => applyChampionshipSpotlight(r, spotlightKey) ?? r)}>
            USE · {state.championshipSpotlights}
          </Btn>
        </div>
      </section>

      <div className="rounded-lg border border-line bg-panel2/30 p-2 text-[8px] text-paper/40">
        Arcball rewards are intentionally supplementary. Production quality still comes from your staff, projects and interventions; the league mainly creates staff fame, recovery options and occasional development advantages.
      </div>
    </div>
  );
}
