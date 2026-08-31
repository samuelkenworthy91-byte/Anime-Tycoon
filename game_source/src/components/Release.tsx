import { useEffect, useRef, useState } from "react";
import { Star, ArrowRight, TrendingUp, TrendingDown, PoundSterling, Flame, Trophy, Database, Users } from "lucide-react";
import { Btn, CountUp, useFx } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  CAST_CHEMS,
  GENRES,
  MEDIUMS,
  SHEET_POS,
  castById,
  comboMult,
  formatGBP,
  formatNum,
  type Draft,
} from "../engine/data";
import { TIERS, type ShowResult } from "../engine/scoring";
import { AIR_WEEKS } from "../engine/state";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

export default function Release({
  draft,
  result,
  onContinue,
}: {
  draft: Draft;
  result: ShowResult;
  onContinue: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [salesWeek, setSalesWeek] = useState(0);
  const { burst, shake } = useFx();
  const fired = useRef(false);

  /* stages: 0 wait, 1-4 reviews, 5 verdict, 6 sales, 7 done */
  useEffect(() => {
    if (stage > 6) return;
    const t = setTimeout(() => setStage((s) => s + 1), stage === 0 ? 800 : 820);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage >= 1 && stage <= 4) {
      sfx.stamp();
      burst(window.innerWidth / 2, window.innerHeight * 0.38, "spark", 9);
    }
    if (stage === 5) {
      if (result.tier === "flop" || result.tier === "mixed") sfx.fail();
      else sfx.fanfare();
      shake(result.hallOfFame ? 15 : result.tier === "hit" ? 8 : 4);
      burst(
        window.innerWidth / 2,
        window.innerHeight * 0.42,
        result.tier === "flop" ? "ink" : "paper",
        result.hallOfFame ? 72 : 38
      );
    }
    if (stage === 6 && !fired.current) {
      fired.current = true;
      sfx.cash();
    }
  }, [stage, result.tier, result.hallOfFame, burst, shake]);

  /* animate the sales chart week by week */
  useEffect(() => {
    if (stage < 6 || salesWeek >= result.sales.length) return;
    const t = setTimeout(() => {
      setSalesWeek((w) => w + 1);
      sfx.coin();
    }, 170);
    return () => clearTimeout(t);
  }, [stage, salesWeek, result.sales.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        if (stage < 6) setStage(6);
        else if (salesWeek < result.sales.length) setSalesWeek(result.sales.length);
        else onContinue();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage, salesWeek, result.sales.length, onContinue]);

  const protag = castById(draft.protag);
  const sec = castById(draft.secondary);
  const pet = castById(draft.pet);
  const vil = castById(draft.villain);
  const tier = TIERS[result.tier];
  const net = result.revenue - result.costs;
  const peak = Math.max(...result.sales, 1);
  const shownUnits = result.sales.slice(0, salesWeek).reduce((a, b) => a + b, 0);
  const shownRevenue = Math.round(shownUnits * 2.6);
  const cast = [
    { m: protag, tag: "LEAD" },
    { m: sec, tag: "SUPPORT" },
    { m: pet, tag: "MASCOT" },
    { m: vil, tag: "VILLAIN" },
  ];

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-ink"
      onPointerDown={() => (stage < 6 ? setStage(6) : setSalesWeek(result.sales.length))}
    >
      <img src="img/bg-release.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-abyss/70 via-abyss/40 to-abyss/75" />
      <div className="pointer-events-none absolute inset-0 gridlines opacity-40" />
      <div className="pointer-events-none absolute inset-0 speedlines opacity-30" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-gold/10 blur-[110px]" />

      <div className="relative z-10 border-b border-line/60 bg-ink/70 py-2 pl-3 pr-[76px] text-center backdrop-blur-md">
        <span className="text-[10px] tracking-[0.5em] text-gold">PREMIERE</span>
        <div className="font-display text-sm font-extrabold md:text-base">ON AIR — tap to skip</div>
      </div>

      <div className="nice-scroll relative z-10 mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-3 md:p-5">
        <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr]">
          {/* poster */}
          <div className="anim-pop ink-card overflow-hidden">
            <div className="relative aspect-[4/5]">
              <img
                src={protag.img}
                alt={protag.name}
                className="h-full w-full object-cover"
                style={protag.pos !== undefined ? { objectPosition: SHEET_POS[protag.pos], objectFit: "cover" } : undefined}
              />
              <div className="crt absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3">
                <div className="font-display text-xl font-extrabold leading-tight drop-shadow-lg">{draft.title}</div>
                <div className="text-[11px] font-bold text-cyanx">
                  {draft.protagName} · {MEDIUMS[draft.medium].label}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {draft.genres.map((g) => {
                    const gg = GENRES.find((x) => x.id === g)!;
                    return (
                      <span key={g} className="rounded border px-1.5 py-0.5 text-[9px] font-bold" style={{ borderColor: gg.color, color: gg.color }}>
                        {gg.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              {stage >= 5 && (
                <div
                  className="anim-pop absolute left-1/2 top-6 -translate-x-1/2 -rotate-6 rounded-xl border-4 px-3 py-1.5 text-center font-display text-xl font-extrabold tracking-widest"
                  style={{ borderColor: tier.color, color: tier.color, background: "rgba(6,5,14,.78)", boxShadow: `0 0 30px ${tier.color}55` }}
                >
                  {tier.label}
                </div>
              )}
              {/* cast strip */}
              <div className="absolute left-2 top-2 flex -space-x-3">
                {cast.map((c) => (
                  <Portrait
                    key={c.m.id}
                    img={c.m.img}
                    pos={c.m.pos}
                    name={c.m.name}
                    alt={c.m.name}
                    className="h-9 w-9 rounded-full border-2 border-abyss object-cover"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* reviews + numbers */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {result.reviews.map((r, i) =>
                stage > i ? (
                  <div key={r.outlet} className="anim-pop ink-card flex items-center gap-2 p-2.5">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-abyss">
                      <span className={cn("font-display text-lg font-extrabold", r.score >= 9 ? "text-gold" : r.score >= 7 ? "text-mint" : r.score >= 5 ? "text-paper" : "text-neon")}>
                        {r.score}
                      </span>
                      <Star size={8} className="text-gold" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[11px] font-extrabold tracking-wide">{r.outlet}</div>
                      <div className="line-clamp-2 text-[10px] italic leading-tight text-paper/60">“{r.quote}”</div>
                    </div>
                  </div>
                ) : (
                  <div key={r.outlet} className="ink-card flex h-[62px] items-center justify-center p-2.5 opacity-40">
                    <span className="anim-blink text-xs text-paper/40">REVIEWING…</span>
                  </div>
                )
              )}
            </div>

            {stage >= 5 && (
              <div className="anim-pop flex items-center justify-between rounded-2xl border border-gold/50 bg-gold/10 p-3">
                <div>
                  <span className="text-xs font-bold text-paper/70">CRITIC TOTAL</span>
                  {result.hallOfFame ? (
                    <div className="flex items-center gap-1 text-[10px] font-extrabold text-gold">
                      <Trophy size={11} /> HALL OF FAME (32+) — POSTER ON THE WALL
                    </div>
                  ) : result.total >= 30 ? (
                    <div className="text-[10px] font-extrabold text-mint">SEQUEL RIGHTS SECURED (30+)</div>
                  ) : null}
                </div>
                <span className="font-display text-3xl font-extrabold text-gold drop-shadow-[0_0_14px_rgba(255,209,102,.5)]">
                  <CountUp to={result.total} duration={700} format={(n) => `${Math.round(n)}/40`} />
                </span>
              </div>
            )}

            {stage >= 6 && (
              <div className="anim-up space-y-2">
                {/* weekly sales chart */}
                <div className="ink-card p-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold tracking-widest text-paper/50">WEEKLY VIEWERSHIP</span>
                    <span className="font-display text-sm font-extrabold text-gold">{formatGBP(shownRevenue)}</span>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {result.sales.map((v, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-viol to-neon transition-all duration-200"
                          style={{ height: i < salesWeek ? `${Math.max(4, (v / peak) * 84)}px` : "2px" }}
                        />
                        <span className="text-[8px] text-paper/35">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <Stat icon={<PoundSterling size={13} className="text-gold" />} v={formatGBP(result.revenue)} k="TOTAL REVENUE" cls="text-gold" />
                  <Stat icon={<Flame size={13} className="text-neon" />} v={`+${formatNum(result.fans)}`} k="FANS" cls="text-neon2" />
                  <Stat
                    icon={net >= 0 ? <TrendingUp size={13} className="text-mint" /> : <TrendingDown size={13} className="text-neon" />}
                    v={`${net >= 0 ? "+" : ""}${formatGBP(net)}`}
                    k="PROFIT"
                    cls={net >= 0 ? "text-mint" : "text-neon"}
                  />
                  <Stat icon={<Database size={13} className="text-viol" />} v={`+${result.rd}`} k="RESEARCH" cls="text-viol" />
                </div>

                <div className="rounded-xl border border-mint/40 bg-mint/5 p-2 text-center text-[11px] font-bold text-mint">
                  <TrendingUp size={12} className="mr-1 inline" />
                  Revenue lands week by week over the {AIR_WEEKS}-week broadcast — keep an eye on the office HUD.
                </div>

                {result.newCombo && (
                  <div className="anim-pop rounded-xl border border-cyanx/60 bg-cyanx/10 p-2 text-center text-[11px] font-bold text-cyanx">
                    ✦ NEW COMBINATION DISCOVERED — combo knowledge now Lv{result.comboLevel + 1}
                  </div>
                )}
                {result.secretDiscovered && (
                  <div className="anim-pop rounded-xl border border-viol/60 bg-viol/10 p-2 text-center text-[11px] font-bold text-viol">
                    ✦✦ SECRET COMBO DISCOVERED — this pairing was hiding a ×{comboMult(draft.genres, true).toFixed(2)} multiplier!
                  </div>
                )}
                {result.chemDiscovered.length > 0 && (
                  <div className="anim-pop rounded-xl border border-mint/60 bg-mint/10 p-2 text-center text-[11px] font-bold text-mint">
                    ✦ CAST CHEMISTRY DISCOVERED — {result.chemDiscovered.map((id) => CAST_CHEMS.find((c) => c.id === id)?.name ?? id).join(", ")}!
                  </div>
                )}
                {draft.franchiseKey && result.total < 30 && (
                  <div className="rounded-xl border border-neon/50 bg-neon/10 p-2 text-center text-[11px] font-bold text-neon2">
                    The sequel underperformed — the committee closes the franchise.
                  </div>
                )}

                <details className="ink-card p-3">
                  <summary className="cursor-pointer text-[11px] font-bold tracking-widest text-paper/50">
                    DEVELOPMENT REPORT
                  </summary>
                  <div className="mt-2 space-y-1">
                    {result.breakdown.map((b) => (
                      <div key={b.label} className="flex justify-between text-[11px]">
                        <span className="text-paper/60">{b.label}</span>
                        <span className="font-bold text-paper/90">{b.pts}</span>
                      </div>
                    ))}
                  </div>
                </details>

                <div className="ink-card flex items-center gap-2 p-2.5">
                  <Users size={13} className="text-cyanx" />
                  <span className="text-[11px] text-paper/60">CAST:</span>
                  {cast.map((c) => (
                    <span key={c.m.id} className="flex items-center gap-1 text-[10px] font-bold text-paper/80">
                      <Portrait
                        img={c.m.img}
                        pos={c.m.pos}
                        name={c.m.name}
                        alt=""
                        className="h-5 w-5 rounded-full border border-line object-cover"
                      />
                      {c.m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 border-t border-line/60 bg-ink/80 p-3 text-center backdrop-blur-md">
        <Btn big variant={result.hallOfFame ? "gold" : "primary"} disabled={stage < 6} onClick={onContinue}>
          BACK TO THE STUDIO <ArrowRight size={18} />
        </Btn>
      </div>
    </div>
  );
}

function Stat({ icon, v, k, cls }: { icon: React.ReactNode; v: string; k: string; cls: string }) {
  return (
    <div className="ink-card p-2 text-center">
      <div className="flex justify-center">{icon}</div>
      <div className={cn("truncate font-display text-xs font-extrabold md:text-sm", cls)}>{v}</div>
      <div className="text-[8px] font-bold text-paper/50">{k}</div>
    </div>
  );
}
