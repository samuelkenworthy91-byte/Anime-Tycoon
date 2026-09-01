import { useMemo, useState } from "react";
import {
  Clapperboard,
  Users,
  X,
  PenTool,
  Monitor,
  Music,
  Trash2,
  Zap,
  FlaskConical,
  Briefcase,
  Building2,
  Trophy,
  Target,
  Database,
  ChevronRight,
  Sparkles,
  Lock,
  TrendingUp,
  Award,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  ARC_COMBOS,
  CAST_CHEMS,
  castById,
  GENRES,
  NEWS,
  OFFICES,
  RESEARCH,
  ROLE_LABEL,
  ROLE_POINT,
  SHOWRUNNERS,
  MEDIUMS,
  POINT_COLOR,
  STAFF_PORTRAITS,
  dateLabel,
  formatGBP,
  formatGBPShort,
  formatNum,
  levelUpCost,
  rollCandidate,
  staffMain,
  LEVEL_TITLES,
  type Contract,
  type GenreId,
  type Staff,
} from "../engine/data";
import { office, pendingIncome, weeklyOutgoings, type RunState } from "../engine/state";
import Portrait from "./Portrait";
import Hud from "./Hud";
import { applyTraining, bumpObjectives, objectiveViews, rankView, staffMood, trainCost } from "../engine/loop";
import OfficeScene from "./OfficeScene";
import { cn } from "../utils/cn";

/* =================================================================== */
export default function Office({
  run,
  setRun,
  onNewShow,
  onContract,
  clockDay = 0,
  clockPhase = 0,
  onSave,
  savedLabel,
  hd2d = 1,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onNewShow: (sequelKey?: string) => void;
  onContract: (c: Contract) => void;
  clockDay?: number;
  clockPhase?: number;
  onSave: () => void;
  savedLabel: string;
  /** 0 = classic flat pixels, 1 = full HD-2D */
  hd2d?: number;
}) {
  const [modal, setModal] = useState<null | "staff" | "research" | "contracts" | "relocate" | "hof" | "awards" | "objectives">(null);
  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];
  const ticker = useMemo(() => [...run.notices.slice(-6).reverse(), ...NEWS].join(" ✦ "), [run.notices]);
  const off = office(run);
  const nextOffice = OFFICES[run.officeLevel + 1];
  const inFlight = pendingIncome(run, 12);
  const objViews = objectiveViews(run);
  const rank = rankView(run);

  const hire = (cand: Staff) => {
    if (run.cash < cand.cost || run.staff.length >= off.maxStaff) return;
    sfx.coin();
    setRun((r) => ({
      ...r,
      cash: r.cash - cand.cost,
      staff: [...r.staff, cand],
      candidates: r.candidates.filter((c) => c.id !== cand.id),
      notices: [...r.notices, `${cand.name} joins as ${ROLE_LABEL[cand.role]}!`],
    }));
    setRun((r) => bumpObjectives(r, { t: "hire" }));
  };
  const fire = (id: string) => {
    sfx.back();
    setRun((r) => ({ ...r, staff: r.staff.filter((s) => s.id !== id) }));
  };
  const levelUp = (s: Staff) => {
    const cost = levelUpCost(s);
    if (run.rd < cost || s.level >= 5) return;
    sfx.fanfare();
    setRun((r) => ({
      ...r,
      rd: r.rd - cost,
      staff: r.staff.map((x) =>
        x.id === s.id
          ? {
              ...x,
              level: x.level + 1,
              story: Math.min(99, x.story + 5 + Math.floor(Math.random() * 6)),
              art: Math.min(99, x.art + 5 + Math.floor(Math.random() * 6)),
              sound: Math.min(99, x.sound + 5 + Math.floor(Math.random() * 6)),
              salary: Math.round(x.salary * 1.22),
            }
          : x
      ),
      notices: [...r.notices, `${s.name} levels up to ${LEVEL_TITLES[s.level - 1]}!`],
    }));
  };
  const train = (s: Staff) => {
    const cost = trainCost(s);
    if (run.cash < cost || staffMain(s) >= 99) return;
    sfx.fanfare();
    setRun((r) =>
      bumpObjectives(
        {
          ...r,
          cash: r.cash - cost,
          staff: r.staff.map((x) => (x.id === s.id ? applyTraining(x) : x)),
          notices: [...r.notices, `${s.name} comes back from a workshop inspired.`],
        },
        { t: "train" }
      )
    );
  };
  const scout = () => {
    if (run.cash < 8_000) return;
    sfx.click();
    setRun((r) => ({
      ...r,
      cash: r.cash - 8_000,
      candidates: [rollCandidate(r.week), rollCandidate(r.week), rollCandidate(r.week)],
    }));
  };
  const research = (id: string, rd: number) => {
    if (run.rd < rd) return;
    sfx.fanfare();
    setRun((r) => ({
      ...r,
      rd: r.rd - rd,
      research: [...r.research, id],
      notices: [...r.notices, `Research complete: ${RESEARCH.find((x) => x.id === id)?.name}!`],
    }));
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
    setRun((r) => ({
      ...r,
      cash: r.cash - nextOffice.cost,
      officeLevel: r.officeLevel + 1,
      notices: [...r.notices, `Studio relocated to ${nextOffice.name}!`],
    }));
  };

  const roleIcon = (role: Staff["role"]) =>
    role === "writer" ? <PenTool size={13} /> : role === "animator" ? <Monitor size={13} /> : <Music size={13} />;

  const seq = run.pendingSequel ? run.franchises[run.pendingSequel] : null;

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink">
      {/* ---------------------------------------------------- office scene */}
      <OfficeScene
        level={run.officeLevel}
        boss={{ name: runner.name.split(" ")[0], color: "#ffd166" }}
        staff={run.staff.map((s) => ({
          name: s.name.split(" ")[0],
          color: POINT_COLOR[ROLE_POINT[s.role]],
          tired: s.stamina < 45,
        }))}
        maxStaff={off.maxStaff}
        timeOfDay={(clockPhase + 0.5) / 4}
        awards={run.awards}
        hd2d={hd2d}
        onDeskClick={() => setModal("staff")}
      />

      {/* ---------------------------------------------------------- HUD */}
      <Hud
        run={run}
        officeName={off.name}
        clockDay={clockDay}
        clockPhase={clockPhase}
        netPerWeek={run.incomeThisWeek - weeklyOutgoings(run)}
        objectivesDone={objViews.filter((v) => v.done).length}
        objectivesTotal={objViews.length}
        onSave={onSave}
        onObjectives={() => setModal("objectives")}
        savedLabel={savedLabel}
      />

      {/* -------------------------------------------------------- actions */}
      <div className="relative z-20 border-t border-line/60 bg-ink/85 px-2 py-2.5 backdrop-blur-md md:px-5">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-1.5 md:gap-2.5">
          <Btn big variant="primary" className="anim-ring" onClick={() => onNewShow()}>
            <Clapperboard size={19} /> NEW SHOW
          </Btn>
          {seq && (
            <Btn big variant="gold" className="anim-pop" onClick={() => onNewShow(run.pendingSequel!)}>
              <Zap size={19} /> SEASON {seq.season + 1}
            </Btn>
          )}
          <Btn variant="cyan" onClick={() => setModal("contracts")}>
            <Briefcase size={15} /> CONTRACTS
          </Btn>
          <Btn variant="ghost" onClick={() => setModal("staff")}>
            <Users size={15} /> STAFF <span className="text-[10px] opacity-70">({run.staff.length}/{off.maxStaff})</span>
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

      {/* ----------------------------------------------------------- STAFF */}
      {modal === "staff" && (
        <Modal title="STAFF ROOM" onClose={() => setModal(null)}>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold tracking-widest text-paper/50">YOUR CREW</div>
              {run.staff.length === 0 && <div className="text-sm text-paper/40">Nobody here but you.</div>}
              <div className="space-y-2">
                {run.staff.map((s) => (
                  <div key={s.id} className="ink-card flex items-center gap-2 p-2.5">
                    <Portrait
                      img={STAFF_PORTRAITS[s.portrait].img}
                      pos={STAFF_PORTRAITS[s.portrait].pos}
                      name={s.name}
                      alt={s.name}
                      className="h-10 w-10 rounded-lg border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span style={{ color: POINT_COLOR[ROLE_POINT[s.role]] }}>{roleIcon(s.role)}</span>
                        <span className="truncate text-sm font-bold">{s.name}</span>
                        <span className="ink-chip px-1.5 py-0.5 text-[9px] font-bold text-gold">
                          Lv{s.level} {LEVEL_TITLES[s.level - 1]}
                        </span>
                        <span className="ml-auto text-[10px] text-paper/50">{formatGBP(s.salary)}/wk</span>
                      </div>
                      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                        {(["story", "art", "sound"] as const).map((t) => (
                          <div key={t}>
                            <div className="flex justify-between text-[9px] font-bold text-paper/50">
                              <span>{t.toUpperCase()}</span>
                              <span>{s[t]}</span>
                            </div>
                            <div className="h-1.5 rounded bg-abyss">
                              <div className="h-full rounded" style={{ width: `${s[t]}%`, background: POINT_COLOR[t] }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Btn
                        variant="gold"
                        className="!px-2.5 !py-1 text-[10px]"
                        disabled={run.rd < levelUpCost(s) || s.level >= 5}
                        onClick={() => levelUp(s)}
                      >
                        LEVEL UP · {levelUpCost(s)} RD
                      </Btn>
                      <Btn
                        variant="cyan"
                        className="!px-2.5 !py-1 text-[10px]"
                        disabled={run.cash < trainCost(s) || staffMain(s) >= 99}
                        onClick={() => train(s)}
                      >
                        WORKSHOP · {formatGBPShort(trainCost(s))}
                      </Btn>
                      <span className="text-[10px] font-bold" style={{ color: staffMood(s).color }}>
                        {staffMood(s).label} · {Math.round(s.stamina)}%
                      </span>
                      <button
                        onClick={() => fire(s.id)}
                        className="btn-press flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] text-neon/80 hover:bg-neon/10"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold tracking-widest text-paper/50">RECRUITMENT AD</span>
                <Btn variant="ghost" className="!px-2.5 !py-1 text-[10px]" onClick={scout} disabled={run.cash < 8_000}>
                  NEW ADS {formatGBP(8_000)}
                </Btn>
              </div>
              <div className="space-y-2">
                {run.candidates.map((c) => (
                  <div key={c.id} className="ink-card flex items-center gap-2 p-2.5">
                    <Portrait
                      img={STAFF_PORTRAITS[c.portrait].img}
                      pos={STAFF_PORTRAITS[c.portrait].pos}
                      name={c.name}
                      alt={c.name}
                      className="h-10 w-10 rounded-lg border border-line object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{c.name}</div>
                      <div className="text-[10px] text-paper/55">
                        {ROLE_LABEL[c.role]} · main <b className="text-mint">{staffMain(c)}</b> ·{" "}
                        {formatGBP(c.salary)}/wk
                      </div>
                      <div className="text-[10px] text-gold">sign {formatGBP(c.cost)}</div>
                    </div>
                    <Btn
                      variant="cyan"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => hire(c)}
                      disabled={run.cash < c.cost || run.staff.length >= off.maxStaff}
                    >
                      HIRE
                    </Btn>
                  </div>
                ))}
                {run.staff.length >= off.maxStaff && (
                  <div className="rounded-lg border border-neon/40 bg-neon/10 p-2 text-[11px] text-neon2">
                    Desks are full — move to a bigger studio to hire more.
                  </div>
                )}
              </div>
            </div>
          </div>
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
                    ) : (
                      <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={run.rd < u.rd} onClick={() => research(u.id, u.rd)}>
                        {u.rd} RD
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
                <div>Rent: {formatGBP(off.rent)}/week</div>
              </div>
            </div>
            <div className="ink-card border-gold/50 p-4">
              <div className="text-[10px] font-bold tracking-widest text-gold">AVAILABLE</div>
              <div className="font-display text-lg font-extrabold text-gold">{nextOffice.name}</div>
              <div className="mt-1 text-[11px] italic text-paper/60">{nextOffice.blurb}</div>
              <div className="mt-2 space-y-1 text-xs text-paper/60">
                <div className="text-mint">Desks: {nextOffice.maxStaff} staff</div>
                <div>Rent: {formatGBP(nextOffice.rent)}/week</div>
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
            <Rec k="Rivals in the race" v={String(run.rivals.length)} />
            <Rec k="Best score" v={`${run.bestScore}/40`} />
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------ OBJECTIVES */}
      {modal === "objectives" && (
        <Modal title="OBJECTIVES BOARD" onClose={() => setModal(null)}>
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 p-2.5">
            <Target size={16} className="text-gold" />
            <span className="text-sm font-bold">{rank.rank.name} studio</span>
            <span className="text-[11px] text-paper/60">
              {rank.next
                ? `${rank.score.toLocaleString("en-GB")} / ${rank.next.min.toLocaleString("en-GB")} score to ${rank.next.name}`
                : "the highest rank there is"}
            </span>
            <span className="ml-auto pxbar h-2 w-24 overflow-hidden">
              <span
                className="block h-full"
                style={{ width: `${Math.round(rank.toNext * 100)}%`, background: rank.rank.color }}
              />
            </span>
          </div>
          <p className="mb-3 text-xs text-paper/60">
            Three standing goals from the board — one you can finish this week, one this season, one for the whole
            career. They pay out the moment they are met and are replaced straight away.
          </p>
          <div className="space-y-2">
            {objViews.map((v) => {
              const pct = Math.max(0, Math.min(1, v.progress / Math.max(1, v.target)));
              const tierColor = v.tier === "short" ? "#3be1ff" : v.tier === "season" ? "#5ef0c0" : "#ffd166";
              const tierLabel = v.tier === "short" ? "THIS WEEK" : v.tier === "season" ? "THIS SEASON" : "CAREER";
              return (
                <div key={v.state.def + v.target} className={cn("ink-card p-3", v.done && "border-mint/60")}>
                  <div className="flex items-center gap-2">
                    <span
                      className="pxcell px-1.5 py-0.5 text-[9px] font-extrabold tracking-wider"
                      style={{ color: tierColor }}
                    >
                      {tierLabel}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-bold">{v.text}</span>
                    {v.done ? (
                      <span className="pxcell px-1.5 py-0.5 text-[10px] font-extrabold text-mint">DONE</span>
                    ) : (
                      <span className="pxfont text-xs font-bold text-paper/70">
                        {Math.min(v.progress, v.target).toLocaleString("en-GB")}/{v.target.toLocaleString("en-GB")}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 pxbar h-2.5 overflow-hidden">
                    <span className="block h-full transition-all" style={{ width: `${pct * 100}%`, background: tierColor }} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-paper/50">
                    <span className="min-w-0 flex-1 truncate">{v.hint}</span>
                    <span className="shrink-0 font-bold text-gold">{formatGBPShort(v.reward.cash)}</span>
                    <span className="shrink-0 font-bold text-viol">+{v.reward.rd} RD</span>
                    {v.reward.fans > 0 && <span className="shrink-0 font-bold text-neon2">+{formatNum(v.reward.fans)} fans</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {/* ------------------------------------------------------------- HOF */}
      {modal === "hof" && (
        <Modal title="STUDIO RECORDS" onClose={() => setModal(null)}>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-gold">
            <Trophy size={14} /> HALL OF FAME (32+/40)
          </div>
          {run.hallOfFame.length === 0 ? (
            <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-paper/40">
              No hall-of-fame shows yet. Score 32/40 to earn sequel rights.
            </div>
          ) : (
            <div className="space-y-1.5">
              {run.hallOfFame.map((h, i) => (
                <div key={i} className="ink-card flex items-center gap-2 p-2">
                  <Portrait img={castById(h.protag).img} pos={castById(h.protag).pos} alt="" className="h-9 w-9 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold">{h.title}</div>
                    <div className="text-[10px] text-paper/50">
                      {h.genres.map((g) => GENRES.find((x) => x.id === g)?.label).join(" × ")} · {dateLabel(h.week)}
                    </div>
                  </div>
                  <div className="font-display text-base font-extrabold text-gold">{h.score}/40</div>
                </div>
              ))}
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
    <div className="fixed-safe fixed inset-0 z-50 flex items-center justify-center bg-abyss/80 p-3 backdrop-blur-sm" onClick={onClose}>
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
