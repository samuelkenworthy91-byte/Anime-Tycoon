import { useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Crown,
  Flame,
  Minus,
  Star,
  Swords,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { GENRES, OFFICES, ROLE_LABEL, dateLabel, formatGBP, formatNum } from "../engine/data";
import {
  PERSONAS,
  RIVAL_STATUS_LABEL,
  rivalTalentAvailable,
  type RankingEntry,
  type RivalStudio,
} from "../engine/rivals";
import { hireRivalTalent, studioRankings, type RunState } from "../engine/state";
import { cn } from "../utils/cn";

const genreLabel = (id: string) => GENRES.find((g) => g.id === id)?.label ?? id;

function Movement({ m }: { m: RankingEntry["movement"] }) {
  if (m === "up") return <TrendingUp size={13} className="text-mint" />;
  if (m === "down") return <TrendingDown size={13} className="text-neon" />;
  return <Minus size={13} className="text-paper/30" />;
}

function heatColor(v: number): string {
  return v >= 70 ? "#ff5e5e" : v >= 40 ? "#ff9d5e" : v >= 15 ? "#ffd166" : "#8b8fa3";
}

/* ========================================================== rankings */

export function RankingsTable({ entries, highlight }: { entries: RankingEntry[]; highlight?: boolean }) {
  return (
    <div className="space-y-1.5">
      {entries.map((e) => (
        <div
          key={e.id}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-2",
            e.isPlayer ? "border-gold/60 bg-gold/10" : "border-paper/10 bg-paper/5",
            highlight && e.isPlayer && "anim-ring"
          )}
        >
          <span className="w-5 text-center font-display text-sm font-extrabold text-paper/60">{e.rank}</span>
          <Movement m={e.movement} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("truncate text-sm font-bold", e.isPlayer && "text-gold")}>{e.name}</span>
              {e.isPlayer && <Crown size={12} className="shrink-0 text-gold" />}
              {!e.isPlayer && e.status !== "active" && (
                <span className="shrink-0 rounded border border-paper/20 px-1 py-0.5 text-[8px] font-bold text-paper/50">
                  {RIVAL_STATUS_LABEL[e.status].toUpperCase()}
                </span>
              )}
              {!e.isPlayer && e.rivalry >= 50 && (
                <span className="shrink-0 flex items-center gap-0.5 rounded border border-neon/50 px-1 py-0.5 text-[8px] font-bold text-neon2" title={`Rivalry ${e.rivalry}/100`}>
                  <Swords size={9} /> {e.rivalry}
                </span>
              )}
            </div>
            {!e.isPlayer && e.persona && (
              <div className="truncate text-[10px] text-paper/45">{PERSONAS[e.persona].label}</div>
            )}
          </div>
          <div className="hidden shrink-0 text-right sm:block">
            <div className="font-display text-sm font-extrabold text-cyanx">{formatNum(e.score)}</div>
            <div className="text-[9px] text-paper/40">pts</div>
          </div>
          <div className="hidden shrink-0 items-center gap-2 text-[10px] text-paper/50 md:flex">
            <span className="flex items-center gap-0.5"><Flame size={10} className="text-neon2" />{formatNum(e.fans)}</span>
            <span className="flex items-center gap-0.5"><Star size={10} className="text-gold" />{e.awards}</span>
            <span className="flex items-center gap-0.5"><Clapperboard size={10} className="text-mint" />{e.releases}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===================================================== studio detail */

function StudioCard({ studio, run }: { studio: RivalStudio; run: RunState }) {
  const [open, setOpen] = useState(false);
  const p = PERSONAS[studio.persona];
  const upcoming = studio.productions.filter((pr) => pr.week > run.week).sort((a, b) => a.week - b.week);
  const recent = studio.releases.slice(-5).reverse();

  return (
    <div className={cn("ink-card p-3", open && "border-cyanx/40")}>
      <div className="flex items-center gap-2">
        <Building2 size={16} className={cn("shrink-0", studio.status === "collapsed" ? "text-paper/30" : "text-cyanx")} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate font-display text-sm font-extrabold">{studio.name}</span>
            <span className="shrink-0 rounded border border-paper/20 px-1 py-0.5 text-[8px] font-bold text-paper/50">
              {RIVAL_STATUS_LABEL[studio.status].toUpperCase()}
            </span>
            {studio.rivalry >= 30 && (
              <span className="shrink-0 flex items-center gap-0.5 text-[9px] font-bold" style={{ color: heatColor(studio.rivalry) }} title="Rivalry with you">
                <Swords size={9} /> {studio.rivalry}
              </span>
            )}
          </div>
          <div className="truncate text-[10px] text-paper/50">{p.label} · {p.blurb}</div>
        </div>
        <button onClick={() => { sfx.click(); setOpen((o) => !o); }} className="shrink-0 p-1 text-paper/40">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* stat strip */}
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        <div className="rounded-lg bg-panel2/60 py-1">
          <div className="text-[8px] font-bold tracking-wider text-paper/40">STRENGTH</div>
          <div className="font-display text-xs font-extrabold text-cyanx">{studio.tier}/5</div>
        </div>
        <div className="rounded-lg bg-panel2/60 py-1">
          <div className="text-[8px] font-bold tracking-wider text-paper/40">REPUTATION</div>
          <div className="font-display text-xs font-extrabold text-viol">{studio.reputation}</div>
        </div>
        <div className="rounded-lg bg-panel2/60 py-1">
          <div className="text-[8px] font-bold tracking-wider text-paper/40">MOMENTUM</div>
          <div className={cn("font-display text-xs font-extrabold", studio.momentum >= 0 ? "text-mint" : "text-neon")}>
            {studio.momentum >= 0 ? "+" : ""}{Math.round(studio.momentum)}
          </div>
        </div>
        <div className="rounded-lg bg-panel2/60 py-1">
          <div className="text-[8px] font-bold tracking-wider text-paper/40">AVG SCORE</div>
          <div className="font-display text-xs font-extrabold text-gold">{studio.releasesCount ? studio.avgScore : "—"}</div>
        </div>
      </div>

      {/* genres */}
      <div className="mt-1.5 flex flex-wrap gap-1">
        {studio.preferred.slice(0, 4).map((g) => {
          const isSpec = studio.specialist.includes(g);
          const def = GENRES.find((x) => x.id === g);
          return (
            <span
              key={g}
              className={cn("ink-chip px-1.5 py-0.5 text-[8px] font-bold", isSpec ? "text-gold" : "text-paper/60")}
              style={isSpec ? undefined : { color: def?.color }}
            >
              {isSpec ? "★ " : ""}{def?.label ?? g}
            </span>
          );
        })}
      </div>

      {/* upcoming productions */}
      {upcoming.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-[8px] font-bold tracking-[0.2em] text-paper/40">IN PRODUCTION</div>
          {upcoming.slice(0, 3).map((pr) => (
            <div key={pr.id} className="flex items-baseline justify-between gap-2 rounded-md border border-paper/10 bg-paper/5 px-2 py-1">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-bold">“{pr.title}”</div>
                <div className="text-[9px] text-paper/45">{pr.genres.map(genreLabel).join(" × ")}</div>
              </div>
              <div className="shrink-0 text-[9px] text-cyanx">{dateLabel(pr.week)}</div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="mt-2 space-y-2 border-t border-line/60 pt-2">
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="rounded-lg bg-panel2/60 py-1"><div className="font-display text-sm font-extrabold text-mint">{studio.franchises.length}</div><div className="text-[8px] text-paper/40">FRANCHISES</div></div>
            <div className="rounded-lg bg-panel2/60 py-1"><div className="font-display text-sm font-extrabold text-cyanx">{studio.releasesCount}</div><div className="text-[8px] text-paper/40">RELEASES</div></div>
            <div className="rounded-lg bg-panel2/60 py-1"><div className="font-display text-sm font-extrabold text-gold">{studio.hits}</div><div className="text-[8px] text-paper/40">HITS</div></div>
            <div className="rounded-lg bg-panel2/60 py-1"><div className="font-display text-sm font-extrabold text-gold">{studio.awards}</div><div className="text-[8px] text-paper/40">AWARDS</div></div>
          </div>

          {studio.franchises.length > 0 && (
            <div>
              <div className="text-[8px] font-bold tracking-[0.2em] text-paper/40">FRANCHISES</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {studio.franchises.slice(0, 8).map((f) => (
                  <span key={f.key} className="ink-chip px-1.5 py-0.5 text-[9px] font-bold text-viol">
                    {f.baseTitle} · S{f.season} · {f.popularity}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div>
              <div className="text-[8px] font-bold tracking-[0.2em] text-paper/40">RECENT RELEASES</div>
              <div className="mt-1 space-y-0.5">
                {recent.map((r, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-2 text-[10px]">
                    <span className="truncate text-paper/75">“{r.title}” <span className="text-paper/40">({dateLabel(r.week)})</span></span>
                    <span className={cn("shrink-0 font-bold", r.score >= 27 ? "text-mint" : r.score >= 15 ? "text-paper/60" : "text-neon")}>{r.score}/40</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================ talent */

function TalentTab({ run, setRun }: { run: RunState; setRun: (fn: (r: RunState) => RunState) => void }) {
  const available = rivalTalentAvailable(run.rivalWorld, run.week);
  const full = run.staff.length >= OFFICES[run.officeLevel].maxStaff;
  if (available.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-paper/40">
        No rival notables are on the market right now. Strong studios hoard their stars — keep playing and some will come up for grabs.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs text-paper/60">
        Notable creators at rival studios. Poach one and the rival studio will remember it — your rivalry heats up.
      </p>
      {available.map((t) => {
        const studio = run.rivalWorld.studios.find((s) => s.id === t.studioId);
        const blocked = run.cash < t.cost;
        return (
          <div key={t.id} className="ink-card flex items-center gap-2 p-2.5">
            <UserRound size={16} className="shrink-0 text-cyanx" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{t.name}</div>
              <div className="text-[10px] text-paper/55">
                {ROLE_LABEL[t.role]} · skill <b className="text-mint">{t.skill}</b> · Lv{t.level}
                {studio ? <> · <span className="text-paper/45">{studio.name}</span></> : null}
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="font-display text-xs font-extrabold text-gold">{formatGBP(t.cost)}</div>
              <div className="text-[9px] text-paper/40">signing fee</div>
            </div>
            <Btn
              variant="cyan"
              className="!px-2.5 !py-1 text-[10px]"
              disabled={blocked || full}
              onClick={() => {
                sfx.fanfare();
                setRun((r) => hireRivalTalent(r, t.id) ?? r);
              }}
            >
              {full ? "FULL" : "POACH"}
            </Btn>
          </div>
        );
      })}
      {full && <div className="text-[10px] text-neon">Your studio is at capacity — move to a bigger office to sign more talent.</div>}
    </div>
  );
}

/* ============================================================ panel */

export default function RivalsPanel({
  run,
  setRun,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
}) {
  const [tab, setTab] = useState<"rankings" | "studios" | "talent">("rankings");
  const entries = studioRankings(run);

  return (
    <div className="space-y-2 text-[12px]">
      <div className="mb-2 flex gap-1">
        {(
          [
            ["rankings", "RANKINGS"],
            ["studios", "STUDIOS"],
            ["talent", "TALENT"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => { sfx.select(); setTab(id); }}
            className={cn(
              "flex-1 rounded-md border px-2 py-1.5 text-[11px] font-bold tracking-widest transition-colors",
              tab === id ? "border-gold/60 bg-gold/15 text-gold" : "border-paper/15 bg-paper/5 text-paper/50"
            )}
          >
            {label}
            {id === "talent" && rivalTalentAvailable(run.rivalWorld, run.week).length > 0 && (
              <span className="ml-1 text-cyanx">({rivalTalentAvailable(run.rivalWorld, run.week).length})</span>
            )}
          </button>
        ))}
      </div>

      {tab === "rankings" && (
        <>
          <p className="text-[11px] text-paper/50">
            The industry's pecking order — revenue, fans, reviews, awards and successful franchises, combined. Arrows show movement since last year.
          </p>
          <RankingsTable entries={entries} highlight />
        </>
      )}

      {tab === "studios" && (
        <div className="space-y-2">
          {run.rivalWorld.studios.map((s) => (
            <StudioCard key={s.id} studio={s} run={run} />
          ))}
        </div>
      )}

      {tab === "talent" && <TalentTab run={run} setRun={setRun} />}
    </div>
  );
}
