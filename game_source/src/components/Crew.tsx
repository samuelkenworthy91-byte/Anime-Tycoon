import { useState } from "react";
import {
  Award,
  ChevronDown,
  ChevronUp,
  Crown,
  Flower2,
  GraduationCap,
  Handshake,
  Heart,
  Monitor,
  Music,
  PenTool,
  Trash2,
  UserRound,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  POINT_COLOR,
  ROLE_LABEL,
  ROLE_POINT,
  dateLabel,
  formatGBP,
  staffMain,
  workerLook,
  type PointType,
  type Staff,
} from "../engine/data";
import {
  HEAD_DESC,
  HEAD_MIN_LEVEL,
  HEAD_TITLES,
  LEGEND_BONUS,
  XP_LEVELS,
  MAX_LEVEL,
  bondBetween,
  levelProgress,
  levelTitle,
  marketSalary,
  moraleOf,
  specDef,
  specLabel,
  traitDef,
  trainCost,
  trainXp,
  yearsEmployed,
  type BondKind,
  type HeadSlot,
} from "../engine/careers";
import {
  appointHead,
  headBlockReason,
  respondPoach,
  respondSalary,
  trainBlockReason,
  trainStaff,
  type RunState,
} from "../engine/state";
import { projectOfStaff } from "../engine/projects";
import { rollHire } from "../engine/careers";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

const BOND_LABEL: Record<BondKind, string> = {
  partnership: "Partners",
  mentorship: "Mentor & student",
  rivalry: "Friendly rivals",
  clash: "Personality clash",
};
const BOND_COLOR: Record<BondKind, string> = {
  partnership: "#5ef0c0",
  mentorship: "#ffd166",
  rivalry: "#3be1ff",
  clash: "#ff5e5e",
};

const roleIcon = (role: Staff["role"]) =>
  role === "writer" ? <PenTool size={13} /> : role === "animator" ? <Monitor size={13} /> : <Music size={13} />;

/* ---------------------------------------------------------- staff card */
function StaffCard({
  s,
  run,
  setRun,
}: {
  s: Staff;
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const [open, setOpen] = useState(false);
  const proj = projectOfStaff(run.projects, s.id);
  const morale = moraleOf(s);
  const xp = s.xp ?? 0;
  const prog = levelProgress(xp);
  const spec = specDef(s.spec);
  const headSlot = (Object.entries(run.heads) as [HeadSlot, string][]).find(([, id]) => id === s.id)?.[0];
  const trainTier = run.facilities.training ?? 0;
  const trainBlock = trainBlockReason(run, s.id);
  const cost = trainCost(trainTier);
  const bondsWith = run.staff
    .filter((o) => o.id !== s.id)
    .map((o) => ({ other: o, bond: bondBetween(run.bonds, s, o) }))
    .filter((x) => x.bond !== null);

  const fire = () => {
    sfx.back();
    setRun((r) => ({
      ...r,
      staff: r.staff.filter((x) => x.id !== s.id),
      projects: r.projects.map((p) => ({ ...p, staffIds: p.staffIds.filter((id) => id !== s.id) })),
      notices: [...r.notices, `${s.name} leaves the studio after ${Math.max(1, Math.round(yearsEmployed(s, r.week) * 10) / 10)} year(s).`],
    }));
  };

  return (
    <div className={cn("ink-card p-2.5", headSlot && "border-gold/50")}>
      {/* header */}
      <div className="flex items-center gap-2">
        <Portrait img={workerLook(s).portrait} name={s.name} alt={s.name} className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span style={{ color: POINT_COLOR[ROLE_POINT[s.role]] }}>{roleIcon(s.role)}</span>
            <span className="truncate text-sm font-bold">{s.name}</span>
            {headSlot && (
              <span className="ink-chip flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-extrabold text-gold">
                <Crown size={9} /> {HEAD_TITLES[headSlot].toUpperCase()}
              </span>
            )}
            <span className="ml-auto shrink-0 text-[10px] text-paper/50">{formatGBP(s.salary)}/wk</span>
          </div>
          {/* level + xp */}
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-[9px] font-extrabold text-gold">Lv{s.level} {levelTitle(s.level)}</span>
            <div className="h-1 flex-1 rounded bg-abyss">
              <div className="h-full rounded bg-gold/80" style={{ width: `${Math.round(prog * 100)}%` }} />
            </div>
            <span className="text-[8px] text-paper/40">
              {s.level >= MAX_LEVEL ? "MAX" : `${xp}/${XP_LEVELS[s.level]} XP`}
            </span>
          </div>
        </div>
        <button onClick={() => { sfx.click(); setOpen((o) => !o); }} className="shrink-0 p-1 text-paper/40">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* condition row */}
      <div className="mt-1.5 flex items-center gap-2 text-[9px] font-bold">
        <span className={cn(s.stamina < 45 ? "text-neon" : "text-mint")}>{Math.round(s.stamina)}% energy</span>
        <span className="flex flex-1 items-center gap-1">
          <Heart size={9} className={morale < 40 ? "text-neon" : "text-[#ff8fc7]"} />
          <span className="h-1.5 flex-1 rounded bg-abyss">
            <span
              className="block h-full rounded"
              style={{ width: `${morale}%`, background: morale < 40 ? "#ff5e5e" : "#ff8fc7" }}
            />
          </span>
          <span className={morale < 40 ? "text-neon" : "text-paper/50"}>{morale} morale</span>
        </span>
        {proj ? (
          <span className="ink-chip max-w-[90px] truncate px-1.5 py-0.5 text-[8px] font-bold text-cyanx">▶ {proj.draft.title}</span>
        ) : (
          <span className="ink-chip px-1.5 py-0.5 text-[8px] font-bold text-paper/35">idle</span>
        )}
      </div>

      {/* stats */}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {(["story", "art", "sound"] as const).map((t) => (
          <div key={t}>
            <div className="flex justify-between text-[8px] font-bold text-paper/50">
              <span>{t.toUpperCase()}</span>
              <span>{s[t]}</span>
            </div>
            <div className="h-1.5 rounded bg-abyss">
              <div className="h-full rounded" style={{ width: `${s[t]}%`, background: POINT_COLOR[t] }} />
            </div>
          </div>
        ))}
      </div>

      {/* spec + traits (always visible — this is who they are) */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {spec && (
          <span className="ink-chip px-1.5 py-0.5 text-[8px] font-bold text-viol" title={specLabel(spec)}>
            ★ {spec.name}
          </span>
        )}
        {(s.traits ?? []).map((tid) => {
          const t = traitDef(tid);
          if (!t) return null;
          return (
            <span key={tid} className={cn("ink-chip px-1.5 py-0.5 text-[8px] font-bold", t.good ? "text-mint" : "text-neon2")} title={t.desc}>
              {t.name}
            </span>
          );
        })}
      </div>

      {open && (
        <div className="mt-2 space-y-2 border-t border-line/60 pt-2">
          {/* numeric effects, spelled out */}
          <div className="space-y-0.5 text-[9px] text-paper/55">
            {spec && <div><b className="text-viol">{spec.name}:</b> {specLabel(spec)}</div>}
            {(s.traits ?? []).map((tid) => {
              const t = traitDef(tid);
              return t ? (
                <div key={tid}><b className={t.good ? "text-mint" : "text-neon2"}>{t.name}:</b> {t.desc}</div>
              ) : null;
            })}
          </div>

          {/* relationships */}
          {bondsWith.length > 0 && (
            <div>
              <div className="text-[8px] font-bold tracking-[0.2em] text-paper/40">RELATIONSHIPS</div>
              <div className="mt-1 space-y-0.5">
                {bondsWith.map(({ other, bond }) => (
                  <div key={other.id} className="flex items-center gap-1.5 text-[9px]">
                    <Handshake size={9} style={{ color: BOND_COLOR[bond!.kind] }} />
                    <b style={{ color: BOND_COLOR[bond!.kind] }}>{BOND_LABEL[bond!.kind]}</b>
                    <span className="text-paper/60">with {other.name.split(" ")[0]}</span>
                    <span className="ml-auto text-paper/40">{bond!.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* career history */}
          <div>
            <div className="text-[8px] font-bold tracking-[0.2em] text-paper/40">CAREER</div>
            <div className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] text-paper/55">
              <span>Joined {dateLabel(s.joinedWeek ?? 0)}</span>
              <span>{(yearsEmployed(s, run.week)).toFixed(1)} yrs at the studio</span>
              <span>{(s.shows ?? []).length} shows shipped</span>
              <span className="flex items-center gap-1"><Award size={9} className="text-gold" /> {s.awardsWon ?? 0} awards</span>
              {s.bestShow && (
                <span className="col-span-2 text-gold">Biggest hit: “{s.bestShow.title}” ({s.bestShow.score}/40)</span>
              )}
              <span className="col-span-2 text-paper/45">Market rate: {formatGBP(marketSalary(s))}/wk</span>
            </div>
          </div>

          {/* training */}
          {trainTier > 0 && (
            <div>
              <div className="flex items-center gap-1 text-[8px] font-bold tracking-[0.2em] text-paper/40">
                <GraduationCap size={10} /> TRAINING · {formatGBP(cost.cash)} + {cost.rd} RD → +1 skill, +{trainXp(trainTier)} XP
              </div>
              <div className="mt-1 flex gap-1.5">
                {(["story", "art", "sound"] as PointType[]).map((t) => (
                  <Btn
                    key={t}
                    variant="ghost"
                    className="!px-2 !py-1 text-[9px]"
                    disabled={!!trainBlock}
                    onClick={() => {
                      sfx.fanfare();
                      setRun((r) => trainStaff(r, s.id, t) ?? r);
                    }}
                  >
                    <span style={{ color: POINT_COLOR[t] }}>+1 {t.toUpperCase()}</span>
                  </Btn>
                ))}
              </div>
              {trainBlock && <div className="mt-0.5 text-[8px] text-neon">{trainBlock}</div>}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={fire} className="btn-press flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[10px] text-neon/80 hover:bg-neon/10">
              <Trash2 size={11} /> LET GO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------- events inbox */
function EventCard({ e, run, setRun }: { e: RunState["staffEvents"][number]; run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const s = run.staff.find((x) => x.id === e.staffId);
  if (!s) return null;
  const act = (fn: (r: RunState) => RunState) => {
    sfx.select();
    setRun(fn);
  };
  return (
    <div className="ink-card border-gold/50 p-2.5">
      <div className="flex items-center gap-2">
        <Portrait img={workerLook(s).portrait} name={s.name} alt={s.name} className="h-8 w-8 shrink-0 rounded-lg border border-line" />
        <div className="min-w-0 flex-1 text-[10px]">
          {e.kind === "raise" ? (
            <>
              <b>{s.name}</b> asks for <b className="text-gold">{formatGBP(e.amount)}/wk</b>{" "}
              <span className="text-paper/50">(now {formatGBP(s.salary)})</span>
            </>
          ) : (
            <>
              A rival studio offers <b>{s.name}</b> <b className="text-neon2">{formatGBP(e.amount)}/wk</b>{" "}
              <span className="text-paper/50">(you pay {formatGBP(s.salary)})</span>
            </>
          )}
          <div className="text-[8px] text-paper/40">answer by {dateLabel(e.expiresWeek)}</div>
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {e.kind === "raise" ? (
          <>
            <Btn variant="gold" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondSalary(r, e.id, "accept"))}>
              ACCEPT (+15 morale)
            </Btn>
            <Btn variant="cyan" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondSalary(r, e.id, "counter"))}>
              MEET HALFWAY (+4)
            </Btn>
            <Btn variant="ghost" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondSalary(r, e.id, "refuse"))}>
              REFUSE (−18)
            </Btn>
          </>
        ) : (
          <>
            <Btn variant="gold" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondPoach(r, e.id, "match"))}>
              MATCH {formatGBP(e.amount)}
            </Btn>
            <Btn variant="cyan" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondPoach(r, e.id, "promote"))}>
              PROMOTE (90% + big morale)
            </Btn>
            <Btn variant="ghost" className="!px-2 !py-1 text-[9px]" onClick={() => act((r) => respondPoach(r, e.id, "release"))}>
              LET THEM GO
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ the panel */
export default function CrewPanel({
  run,
  setRun,
  maxStaff,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  maxStaff: number;
}) {
  const hire = (cand: Staff) => {
    if (run.cash < cand.cost || run.staff.length >= maxStaff) return;
    sfx.coin();
    setRun((r) => ({
      ...r,
      cash: r.cash - cand.cost,
      staff: [...r.staff, { ...cand, joinedWeek: r.week }],
      candidates: r.candidates.filter((c) => c.id !== cand.id),
      notices: [...r.notices, `${cand.name} joins as ${ROLE_LABEL[cand.role]}!`],
    }));
  };
  const scout = () => {
    if (run.cash < 8_000) return;
    sfx.click();
    setRun((r) => ({ ...r, cash: r.cash - 8_000, candidates: [rollHire(r.week), rollHire(r.week), rollHire(r.week)] }));
  };

  const headSlots: HeadSlot[] = ["writer", "animator", "composer", "production"];
  const anyHeadUnlocked = run.officeLevel >= 2;

  return (
    <div className="space-y-3">
      {/* -------------------------------------------------- events inbox */}
      {run.staffEvents.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold tracking-[0.25em] text-gold">NEEDS AN ANSWER</div>
          {run.staffEvents.map((e) => (
            <EventCard key={e.id} e={e} run={run} setRun={setRun} />
          ))}
        </div>
      )}

      {/* ---------------------------------------------- department heads */}
      {anyHeadUnlocked && (
        <div>
          <div className="mb-1.5 text-[10px] font-bold tracking-[0.25em] text-paper/45">DEPARTMENT HEADS</div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {headSlots.map((slot) => {
              const headId = run.heads[slot];
              const head = run.staff.find((x) => x.id === headId);
              const eligible = run.staff.filter((x) => !headBlockReason(run, slot, x.id));
              const locked = run.officeLevel < (slot === "production" ? 3 : 2);
              return (
                <div key={slot} className={cn("ink-card p-2", head && "border-gold/40")}>
                  <div className="flex items-center gap-1.5 text-[10px] font-extrabold">
                    <Crown size={11} className={head ? "text-gold" : "text-paper/30"} />
                    {HEAD_TITLES[slot]}
                  </div>
                  <div className="text-[8px] text-paper/45">{HEAD_DESC[slot]}</div>
                  {head ? (
                    <div className="mt-1 flex items-center gap-1.5">
                      <Portrait img={workerLook(head).portrait} name={head.name} alt="" className="h-6 w-6 rounded-full border border-gold/50" />
                      <span className="text-[10px] font-bold text-gold">{head.name}</span>
                    </div>
                  ) : locked ? (
                    <div className="mt-1 text-[8px] italic text-paper/35">
                      Unlocks at {slot === "production" ? "Neo District HQ" : "Sakuga Tower"}
                    </div>
                  ) : eligible.length === 0 ? (
                    <div className="mt-1 text-[8px] italic text-paper/35">Needs a Lv{HEAD_MIN_LEVEL[slot]}+ {slot === "production" ? "veteran" : slot}</div>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {eligible.slice(0, 3).map((x) => (
                        <Btn
                          key={x.id}
                          variant="ghost"
                          className="!px-1.5 !py-0.5 text-[8px]"
                          onClick={() => {
                            sfx.fanfare();
                            setRun((r) => appointHead(r, slot, x.id) ?? r);
                          }}
                        >
                          APPOINT {x.name.split(" ")[0].toUpperCase()} (+25% salary)
                        </Btn>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {/* ------------------------------------------------------- crew */}
        <div>
          <div className="mb-2 text-xs font-bold tracking-widest text-paper/50">
            YOUR CREW ({run.staff.length}/{maxStaff})
          </div>
          {run.staff.length === 0 && <div className="text-sm text-paper/40">Nobody here but you.</div>}
          <div className="space-y-2">
            {run.staff.map((s) => (
              <StaffCard key={s.id} s={s} run={run} setRun={setRun} />
            ))}
          </div>

          {/* retired legends */}
          {run.legends.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center gap-1 text-[10px] font-bold tracking-[0.25em] text-paper/40">
                <Flower2 size={11} className="text-gold" /> STUDIO LEGENDS
              </div>
              <div className="space-y-1">
                {run.legends.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.05] px-2 py-1.5 text-[10px]">
                    <UserRound size={11} className="text-gold" />
                    <span className="font-bold text-gold">{l.name}</span>
                    <span className="text-paper/50">{ROLE_LABEL[l.role]} · {l.shows} shows{l.bestShow ? ` · “${l.bestShow.title}”` : ""}</span>
                    <span className="ml-auto shrink-0 font-bold text-mint">+{Math.round(LEGEND_BONUS * 100)}% {ROLE_POINT[l.role]} forever</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ------------------------------------------------- recruitment */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold tracking-widest text-paper/50">RECRUITMENT AD</span>
            <Btn variant="ghost" className="!px-2.5 !py-1 text-[10px]" onClick={scout} disabled={run.cash < 8_000}>
              NEW ADS {formatGBP(8_000)}
            </Btn>
          </div>
          <div className="space-y-2">
            {run.candidates.map((c) => {
              const cSpec = specDef(c.spec);
              return (
                <div key={c.id} className="ink-card p-2.5">
                  <div className="flex items-center gap-2">
                    <Portrait img={workerLook(c).portrait} name={c.name} alt={c.name} className="h-10 w-10 shrink-0 rounded-lg border border-line object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-bold">{c.name}</div>
                      <div className="text-[10px] text-paper/55">
                        {ROLE_LABEL[c.role]} · main <b className="text-mint">{staffMain(c)}</b> · {formatGBP(c.salary)}/wk
                      </div>
                      <div className="text-[10px] text-gold">sign {formatGBP(c.cost)}</div>
                    </div>
                    <Btn
                      variant="cyan"
                      className="!px-3 !py-1.5 text-xs"
                      onClick={() => hire(c)}
                      disabled={run.cash < c.cost || run.staff.length >= maxStaff}
                    >
                      HIRE
                    </Btn>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {cSpec && (
                      <span className="ink-chip px-1.5 py-0.5 text-[8px] font-bold text-viol" title={specLabel(cSpec)}>
                        ★ {cSpec.name}
                      </span>
                    )}
                    {(c.traits ?? []).map((tid) => {
                      const t = traitDef(tid);
                      return t ? (
                        <span key={tid} className={cn("ink-chip px-1.5 py-0.5 text-[8px] font-bold", t.good ? "text-mint" : "text-neon2")} title={t.desc}>
                          {t.name}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              );
            })}
            {run.staff.length >= maxStaff && (
              <div className="rounded-lg border border-neon/40 bg-neon/10 p-2 text-[11px] text-neon2">
                Desks are full — move to a bigger studio to hire more.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
