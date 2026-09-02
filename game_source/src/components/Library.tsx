import { useState } from "react";
import {
  ArrowLeft,
  Clapperboard,
  Crown,
  Film,
  Flame,
  Gamepad2,
  Ghost,
  Heart,
  Moon,
  RefreshCcw,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  Tv,
  Users,
} from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { GENRES, MEDIUMS, castById, dateLabel, formatGBPShort } from "../engine/data";
import {
  CONTINUATIONS,
  MERCH_PRODUCTS,
  continuationBlock,
  expectedScore,
  filmsOf,
  merchBlock,
  merchReturn,
  ovasOf,
  seasonsOf,
  spinoffsOf,
  topCharacter,
  type EntryKind,
} from "../engine/franchise";
import { launchMerch, type RunState } from "../engine/state";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

/* ------------------------------------------------------------------ plan */
export interface ContinuationPlan {
  key: string;
  kind: Exclude<EntryKind, "original">;
  crossKey?: string;
  spinChar?: string;
}

const KIND_ICON: Record<EntryKind, React.ComponentType<{ size?: number; className?: string }>> = {
  original: Sparkles,
  season: Tv,
  movie: Film,
  ova: Moon,
  side: Ghost,
  prequel: Clapperboard,
  spinoff: Users,
  reboot: RefreshCcw,
  crossover: Swords,
};

const KIND_LABEL: Record<EntryKind, string> = {
  original: "ORIGINAL",
  season: "SEASON",
  movie: "FILM",
  ova: "OVA",
  side: "SIDE STORY",
  prequel: "PREQUEL",
  spinoff: "SPIN-OFF",
  reboot: "REBOOT",
  crossover: "CROSSOVER",
};

function popColor(v: number) {
  return v >= 60 ? "#5ef0c0" : v >= 30 ? "#ffd166" : "#ff9d5e";
}
function fatColor(v: number) {
  return v >= 60 ? "#ff5e5e" : v >= 30 ? "#ff9d5e" : "#5ef0c0";
}

function Bar({ v, color }: { v: number; color: string }) {
  return (
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-paper/10">
      <div className="h-full rounded-full" style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

function Stat({ k, v, accent }: { k: string; v: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-md border border-paper/10 bg-paper/5 px-2 py-1.5">
      <div className="text-[9px] tracking-widest text-paper/45">{k}</div>
      <div className="text-[12px] font-bold" style={accent ? { color: accent } : undefined}>
        {v}
      </div>
    </div>
  );
}

/* ================================================================ panel */
export default function LibraryPanel({
  run,
  setRun,
  onContinue,
}: {
  run: RunState;
  setRun: (fn: (r: RunState) => RunState) => void;
  onContinue: (plan: ContinuationPlan) => void;
}) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [picking, setPicking] = useState<null | "crossover" | "spinoff">(null);

  const list = Object.values(run.franchises).sort(
    (a, b) => b.popularity - a.popularity || b.totalRevenue - a.totalRevenue
  );
  const open = openKey ? run.franchises[openKey] : null;

  /* ----------------------------------------------------------- list view */
  if (!open) {
    return (
      <div className="space-y-1.5 text-[12px]">
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-paper/20 p-4 text-center text-paper/40">
            Ship a show and it lives here forever — your studio's library of IPs.
          </div>
        )}
        {list.map((fr) => {
          const hof = fr.entries.some((e) => e.hallOfFame);
          return (
            <button
              key={fr.key}
              className="ink-card block w-full p-2.5 text-left"
              onClick={() => {
                sfx.select();
                setOpenKey(fr.key);
              }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="min-w-0 truncate font-display text-sm font-extrabold">
                  {fr.baseTitle}
                  {hof && <Trophy size={12} className="ml-1 inline text-gold" />}
                  {fr.cult && <span className="ml-1.5 text-[9px] font-bold text-viol">CULT</span>}
                </div>
                <div className="shrink-0 text-[10px] text-paper/50">
                  {fr.entries.length} entr{fr.entries.length === 1 ? "y" : "ies"}
                </div>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-paper/50">
                <span>
                  best <b className="text-paper/80">{fr.bestScore}/40</b>
                </span>
                <span>{formatGBPShort(fr.totalRevenue)} lifetime</span>
                <span>{fr.lifetimeFans.toLocaleString("en-GB")} fans</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="w-8 text-[9px] tracking-wider text-paper/45">HYPE</span>
                <Bar v={fr.popularity} color={popColor(fr.popularity)} />
                <span className="w-14 text-right text-[9px] tracking-wider text-paper/45">FATIGUE</span>
                <Bar v={fr.fatigue} color={fatColor(fr.fatigue)} />
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  /* --------------------------------------------------------- detail view */
  const fr = open;
  const hofEntries = fr.entries.filter((e) => e.hallOfFame).length;
  const top = topCharacter(fr);

  const doMerch = (productId: string) => {
    sfx.fanfare();
    setRun((r) => launchMerch(r, fr.key, productId) ?? r);
  };

  const startContinuation = (kind: Exclude<EntryKind, "original">, extra?: Partial<ContinuationPlan>) => {
    sfx.select();
    onContinue({ key: fr.key, kind, ...extra });
  };

  const otherFranchises = list.filter((f) => f.key !== fr.key);

  return (
    <div className="space-y-3 text-[12px]">
      <button
        className="flex items-center gap-1 text-[11px] font-bold tracking-widest text-paper/60"
        onClick={() => {
          sfx.click();
          setOpenKey(null);
          setPicking(null);
        }}
      >
        <ArrowLeft size={13} /> ALL FRANCHISES
      </button>

      {/* ------------------------------------------------------- profile */}
      <div className="ink-card p-3">
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0 truncate font-display text-base font-extrabold">
            {fr.baseTitle}
            {fr.cult && <span className="ml-2 text-[10px] font-bold text-viol">🕯️ CULT CLASSIC</span>}
          </div>
          {hofEntries > 0 && (
            <div className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-gold">
              <Trophy size={12} /> {hofEntries}× HALL OF FAME
            </div>
          )}
        </div>
        <div className="mt-0.5 text-[10px] text-paper/50">
          {fr.genres.map((g) => GENRES.find((x) => x.id === g)?.label).join(" × ") || "—"} · debuted{" "}
          {dateLabel(fr.createdWeek)}
          {fr.spunFrom && ` · spun off from ${run.franchises[fr.spunFrom]?.baseTitle ?? fr.spunFrom}`}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-1.5">
          <Stat k="SEASONS" v={seasonsOf(fr)} />
          <Stat k="FILMS" v={filmsOf(fr)} />
          <Stat k="OVAS" v={ovasOf(fr)} />
          <Stat k="SPIN-OFFS" v={spinoffsOf(fr)} />
          <Stat k="BEST REVIEW" v={`${fr.bestScore}/40`} accent="#ffd166" />
          <Stat k="LIFETIME FANS" v={fr.lifetimeFans.toLocaleString("en-GB")} />
          <Stat k="TOTAL REVENUE" v={formatGBPShort(fr.totalRevenue)} accent="#5ef0c0" />
          <Stat k="MERCH VALUE" v={formatGBPShort(fr.merchValue)} accent="#5ef0c0" />
          <Stat k="LAST ENTRY" v={dateLabel(fr.lastEntryWeek)} />
        </div>

        <div className="mt-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-16 text-[9px] tracking-wider text-paper/45">POPULARITY</span>
            <Bar v={fr.popularity} color={popColor(fr.popularity)} />
            <span className="w-8 text-right text-[10px] font-bold" style={{ color: popColor(fr.popularity) }}>
              {fr.popularity}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-16 text-[9px] tracking-wider text-paper/45">FATIGUE</span>
            <Bar v={fr.fatigue} color={fatColor(fr.fatigue)} />
            <span className="w-8 text-right text-[10px] font-bold" style={{ color: fatColor(fr.fatigue) }}>
              {fr.fatigue}
            </span>
          </div>
          {fr.fatigue >= 40 && (
            <div className="text-[10px] text-paper/45">Fans are tiring of this IP — resting it restores excitement.</div>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------- cast */}
      {fr.cast.length > 0 && (
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold">
            <Heart size={11} /> CHARACTER POPULARITY
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {fr.cast.map((c) => (
              <div key={c.role} className="flex items-center gap-2 rounded-md border border-paper/10 bg-paper/5 p-1.5">
                <Portrait img={castById(c.id).img} pos={castById(c.id).pos} alt="" className="h-8 w-8 rounded-md" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold">
                    {c.name}
                    {top?.id === c.id && <Crown size={10} className="ml-1 inline text-gold" />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bar v={c.popularity} color={popColor(c.popularity)} />
                    <span className="text-[9px] font-bold text-paper/60">{c.popularity}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-1 text-[9px] text-paper/40">
            Popular characters sell merch, carry spin-offs and soften fan verdicts.
          </div>
        </div>
      )}

      {/* ------------------------------------------------------ timeline */}
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold">
          <Flame size={11} /> TIMELINE
        </div>
        <div className="space-y-1">
          {[...fr.entries].reverse().map((e, i) => {
            const Icon = KIND_ICON[e.kind];
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-1.5",
                  e.disappointment ? "border-red-400/40 bg-red-400/5" : "border-paper/10 bg-paper/5"
                )}
              >
                <Icon size={14} className="shrink-0 text-paper/50" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[11px] font-bold">
                    {e.title}
                    {e.hallOfFame && <Trophy size={10} className="ml-1 inline text-gold" />}
                  </div>
                  <div className="text-[9px] text-paper/45">
                    {KIND_LABEL[e.kind]} · {dateLabel(e.week)}
                    {e.revenue > 0 && ` · ${formatGBPShort(e.revenue)}`}
                    {e.expected !== undefined && ` · fans expected ${e.expected}/40`}
                    {e.disappointment && <span className="text-red-300"> · fans disappointed</span>}
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 font-display text-sm font-extrabold",
                    e.score >= 32 ? "text-gold" : e.score >= 24 ? "text-mint" : "text-paper/60"
                  )}
                >
                  {e.score}/40
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --------------------------------------------------------- merch */}
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold">
          <ShoppingBag size={11} /> MERCHANDISING
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {MERCH_PRODUCTS.map((p) => {
            const block = merchBlock(fr, p, run.week, run.cash);
            const ret = merchReturn(fr, p);
            return (
              <div key={p.id} className={cn("rounded-md border p-2", block ? "border-paper/10 bg-paper/5 opacity-60" : "border-mint/30 bg-mint/5")}>
                <div className="flex items-center gap-1 text-[11px] font-bold">
                  {p.id === "mobile" && <Gamepad2 size={11} />}
                  {p.label}
                </div>
                <div className="text-[9px] text-paper/45">{p.desc}</div>
                <div className="mt-1 text-[9px] text-paper/60">
                  −{formatGBPShort(p.cost)} → ≈<b className="text-mint">{formatGBPShort(ret)}</b> / {p.weeks} wk
                </div>
                {block ? (
                  <div className="mt-1 text-[9px] text-paper/40">{block}</div>
                ) : (
                  <Btn variant="cyan" className="mt-1 w-full !py-1 text-[10px]" onClick={() => doMerch(p.id)}>
                    LAUNCH
                  </Btn>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------- continuations */}
      <div>
        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-gold">
          <Clapperboard size={11} /> CONTINUE THE STORY
        </div>
        <div className="space-y-1.5">
          {CONTINUATIONS.map((c) => {
            const block =
              (c.medium && !run.mediumsUnlocked.includes(c.medium)
                ? `Research the ${MEDIUMS[c.medium].label} format first`
                : null) ??
              continuationBlock(fr, c.kind, {
                week: run.week,
                franchiseCount: list.length,
                officeLevel: run.officeLevel,
                projects: run.projects,
              });
            const expected = expectedScore(fr, c.kind);
            const needsPick = c.kind === "crossover" || c.kind === "spinoff";
            return (
              <div key={c.kind} className={cn("rounded-md border p-2", block ? "border-paper/10 bg-paper/5" : "border-paper/20 bg-paper/5")}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold">
                      {c.label}
                      {c.fee > 0 && <span className="ml-1.5 text-[9px] text-paper/50">+{formatGBPShort(c.fee)} fee</span>}
                    </div>
                    <div className="text-[9px] text-paper/45">{c.desc}</div>
                    <div className="text-[9px] text-paper/40">
                      {block ?? `${c.risk} Fans will expect ≥${expected}/40. Fatigue +${c.fatigueAdd}.`}
                    </div>
                  </div>
                  {!block && (
                    <Btn
                      variant={c.kind === "season" ? "gold" : "ghost"}
                      className="shrink-0 !py-1 text-[10px]"
                      onClick={() => {
                        if (needsPick) {
                          sfx.click();
                          setPicking(c.kind as "crossover" | "spinoff");
                        } else startContinuation(c.kind);
                      }}
                    >
                      {needsPick ? "CHOOSE…" : "GREENLIGHT"}
                    </Btn>
                  )}
                </div>

                {/* crossover partner / spin-off character pickers */}
                {picking === "crossover" && c.kind === "crossover" && (
                  <div className="mt-1.5 space-y-1 border-t border-paper/10 pt-1.5">
                    <div className="text-[9px] tracking-widest text-paper/45">CROSS OVER WITH…</div>
                    {otherFranchises.map((f) => (
                      <Btn key={f.key} variant="ghost" className="w-full !justify-between !py-1 text-[10px]" onClick={() => startContinuation("crossover", { crossKey: f.key })}>
                        <span className="truncate">{f.baseTitle}</span>
                        <span className="text-paper/50">pop {f.popularity}</span>
                      </Btn>
                    ))}
                  </div>
                )}
                {picking === "spinoff" && c.kind === "spinoff" && (
                  <div className="mt-1.5 space-y-1 border-t border-paper/10 pt-1.5">
                    <div className="text-[9px] tracking-widest text-paper/45">STARRING…</div>
                    {fr.cast
                      .filter((ch) => ch.popularity >= 45)
                      .map((ch) => (
                        <Btn key={ch.id} variant="ghost" className="w-full !justify-between !py-1 text-[10px]" onClick={() => startContinuation("spinoff", { spinChar: ch.id })}>
                          <span className="truncate">{ch.name}</span>
                          <span className="text-paper/50">pop {ch.popularity}</span>
                        </Btn>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
