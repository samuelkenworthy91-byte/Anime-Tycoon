import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Database, Flame, PoundSterling, Star, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Btn, CountUp, useFx } from "../fx/fx";
import { sfx } from "../engine/audio";
import {
  ARC_COMBOS,
  CAST_CHEMS,
  GENRES,
  MEDIUMS,
  arcComboRating,
  comboMult,
  formatGBP,
  formatNum,
  type Draft,
} from "../engine/data";
import { TIERS, type ShowResult } from "../engine/scoring";
import { AIR_WEEKS } from "../engine/state";
import { arcClashById, genreReleaseEffect } from "../engine/creativeDiscovery";
import { careerYearForWeek, contextualReviewQuote } from "../engine/reviewNarrative";
import Poster from "./Poster";
import { cn } from "../utils/cn";

const AUTO_MS = [850, 1150, 1050, 1550, 850, 850, 850, 850, 1550, 1650];

function verdictLabel(result: ShowResult) {
  if (result.hallOfFame) return "HALL OF FAME";
  if (result.tier === "hit" && result.total >= 34) return "MASTERPIECE";
  if (result.tier === "hit") return "BREAKOUT HIT";
  if (result.tier === "solid") return "CRITICAL SUCCESS";
  if (result.tier === "mixed") return "DIVISIVE PREMIERE";
  return "BOX-OFFICE DISASTER";
}

interface DiscoveryCard {
  title: string;
  kicker: string;
  body: string;
  detail?: string;
  cls: string;
}

export default function Release({
  draft,
  result,
  studio,
  careerWeek = 0,
  showsMadeBefore = 0,
  onContinue,
}: {
  draft: Draft;
  result: ShowResult;
  studio: string;
  careerWeek?: number;
  showsMadeBefore?: number;
  onContinue: () => void;
}) {
  /*
   * 0 final master → 1 title → 2 key visual arrives → 3 beauty shot
   * 4-7 reviews → 8 verdict → 9 one-by-one discoveries → 10 commercial results
   */
  const [stage, setStage] = useState(0);
  const [salesWeek, setSalesWeek] = useState(0);
  const [discoveryIndex, setDiscoveryIndex] = useState(0);
  const { burst, shake } = useFx();
  const cashFired = useRef(false);

  const reviewCount = Math.max(0, Math.min(result.reviews.length, stage - 3));
  const verdictVisible = stage >= 8;
  const businessVisible = stage >= 10;
  const tier = TIERS[result.tier];
  const peak = Math.max(...result.sales, 1);
  const net = result.revenue - result.costs;
  const shownUnits = result.sales.slice(0, salesWeek).reduce((a, b) => a + b, 0);
  const shownRevenue = Math.round(shownUnits * 2.6);
  const careerYear = careerYearForWeek(careerWeek);

  const discoveries = useMemo<DiscoveryCard[]>(() => {
    const rows: DiscoveryCard[] = [];
    const genreEffect = genreReleaseEffect(draft.genres);

    if (result.secretDiscovered) {
      rows.push({
        title: "SECRET GENRE COMBO DISCOVERED!",
        kicker: "EXPERIMENTAL BREAKTHROUGH",
        body: `${genreEffect.label} should not work this well — but it does.`,
        detail: `QUALITY ×${comboMult(draft.genres, true).toFixed(2)} · SALES ×${(result.genreSalesMult ?? genreEffect.salesMultiplier).toFixed(2)}`,
        cls: "border-viol/80 bg-viol/20 text-viol",
      });
    }

    for (const id of result.arcCombosDiscovered ?? []) {
      const clash = arcClashById(id);
      if (clash) {
        rows.push({
          title: "STORY STRUCTURE CLASH DISCOVERED",
          kicker: "PAINFUL LESSON",
          body: `${clash.name}: ${clash.explanation}`,
          detail: `${clash.q} QUALITY PRESSURE · ${Math.round(clash.f * 100)}% AUDIENCE MOMENTUM`,
          cls: "border-neon/80 bg-neon/15 text-neon",
        });
        continue;
      }
      const combo = ARC_COMBOS.find((c) => c.id === id);
      if (!combo) continue;
      const rating = arcComboRating(combo);
      rows.push({
        title: "COMPATIBLE ARC STRUCTURE DISCOVERED!",
        kicker: "STORY BREAKTHROUGH",
        body: `${combo.name} — ${rating.label}. This structure is now known permanently.`,
        detail: `${combo.q > 0 ? "+" : ""}${combo.q} BASE QUALITY · ${combo.f >= 0 ? "+" : ""}${Math.round(combo.f * 100)}% MOMENTUM`,
        cls: rating.cls.includes("gold") ? "border-gold/80 bg-gold/15 text-gold" : rating.cls.includes("neon") ? "border-neon/80 bg-neon/15 text-neon" : "border-mint/80 bg-mint/15 text-mint",
      });
    }

    for (const breakthrough of result.castBreakthroughs ?? []) {
      const genre = GENRES.find((g) => g.id === breakthrough.genre)?.label ?? breakthrough.genre;
      rows.push({
        title: "HIDDEN AFFINITY REVEALED!",
        kicker: "CAST BREAKTHROUGH",
        body: `${breakthrough.name} has a hidden affinity for ${genre}.`,
        detail: "This affinity is now permanently visible when casting future productions.",
        cls: "border-gold/80 bg-gold/15 text-gold",
      });
    }

    if (result.chemDiscovered.length) {
      rows.push({
        title: "CAST CHEMISTRY DISCOVERED!",
        kicker: "ENSEMBLE BREAKTHROUGH",
        body: result.chemDiscovered.map((id) => CAST_CHEMS.find((c) => c.id === id)?.name ?? id).join(", "),
        detail: `CHEMISTRY ×${result.chemMult.toFixed(2)} — remembered for future casting.`,
        cls: "border-mint/80 bg-mint/15 text-mint",
      });
    }

    if (result.newCombo && !result.secretDiscovered) {
      rows.push({
        title: "GENRE PAIRING LEARNED",
        kicker: "STUDIO KNOWLEDGE",
        body: `${genreEffect.label} is now part of the studio's permanent production knowledge.`,
        detail: genreEffect.salesMultiplier < 1
          ? `The pairing suppressed word of mouth to ×${genreEffect.salesMultiplier.toFixed(2)} sales.`
          : genreEffect.salesMultiplier > 1
            ? `The pairing lifted word of mouth to ×${genreEffect.salesMultiplier.toFixed(2)} sales.`
            : `Pairing knowledge reached Lv${result.comboLevel + 1}.`,
        cls: genreEffect.salesMultiplier < 1 ? "border-neon/70 bg-neon/10 text-neon" : "border-cyanx/70 bg-cyanx/10 text-cyanx",
      });
    }

    return rows;
  }, [draft.genres, result]);

  const currentDiscovery = discoveries[discoveryIndex] ?? null;

  const advance = () => {
    if (stage < 9) {
      setStage((s) => s + 1);
      return;
    }
    if (stage === 9 && discoveries.length) {
      if (discoveryIndex < discoveries.length - 1) {
        setDiscoveryIndex((i) => i + 1);
        sfx.reveal();
      } else {
        setStage(10);
      }
      return;
    }
    if (stage < 10) setStage(10);
    else if (salesWeek < result.sales.length) setSalesWeek(result.sales.length);
  };

  useEffect(() => {
    if (stage >= 10) return;
    /* Discoveries are deliberately never auto-dismissed: the player must tap
       through each reveal after seeing the final review score. */
    if (stage === 9 && discoveries.length) return;
    const t = setTimeout(() => setStage((s) => Math.min(10, s + 1)), AUTO_MS[stage] ?? 900);
    return () => clearTimeout(t);
  }, [stage, discoveries.length]);

  useEffect(() => {
    if (stage >= 4 && stage <= 7) {
      sfx.stamp();
      burst(window.innerWidth * 0.72, window.innerHeight * 0.36, "spark", 10);
    }
    if (stage === 8) {
      if (result.tier === "flop" || result.tier === "mixed") sfx.fail();
      else sfx.fanfare();
      shake(result.hallOfFame ? 16 : result.tier === "hit" ? 9 : 4);
      burst(window.innerWidth / 2, window.innerHeight * 0.42, result.tier === "flop" ? "ink" : "paper", result.hallOfFame ? 82 : 46);
    }
    if (stage === 9 && discoveries.length) {
      sfx.reveal();
      burst(window.innerWidth / 2, window.innerHeight * 0.44, "spark", 34);
    }
    if (stage === 10 && !cashFired.current) {
      cashFired.current = true;
      sfx.cash();
    }
  }, [stage, discoveries.length, result.hallOfFame, result.tier, burst, shake]);

  useEffect(() => {
    if (!businessVisible || salesWeek >= result.sales.length) return;
    const t = setTimeout(() => {
      setSalesWeek((w) => w + 1);
      sfx.coin();
    }, 170);
    return () => clearTimeout(t);
  }, [businessVisible, salesWeek, result.sales.length]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (stage < 10) advance();
      else if (salesWeek < result.sales.length) setSalesWeek(result.sales.length);
      else onContinue();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [stage, discoveryIndex, discoveries.length, salesWeek, result.sales.length, onContinue]);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-ink"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button,details,summary")) return;
        advance();
      }}
    >
      <img src="img/bg-release.jpg" alt="" className={cn("absolute inset-0 h-full w-full object-cover transition-all duration-1000", stage < 2 ? "scale-110 opacity-0" : "scale-100 opacity-35 blur-[2px]")} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,209,102,.10),rgba(6,5,14,.88)_68%)]" />
      <div className="pointer-events-none absolute inset-0 gridlines opacity-20" />
      {result.tier === "hit" && stage >= 8 && <div className="pointer-events-none absolute inset-0 speedlines opacity-25" />}

      {/* Quiet opening: make completion feel like an event before showing any data. */}
      {stage === 0 && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center text-center anim-pop">
          <div className="text-[10px] font-bold tracking-[0.55em] text-paper/35">PRODUCTION STATUS</div>
          <div className="mt-3 font-display text-3xl font-extrabold tracking-wide text-paper md:text-5xl">FINAL MASTER COMPLETE</div>
          <div className="mt-3 h-px w-32 bg-gradient-to-r from-transparent via-gold to-transparent" />
          <div className="mt-3 text-xs tracking-[0.28em] text-gold/70">PREPARING WORLD PREMIERE</div>
        </div>
      )}

      {stage === 1 && (
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 text-center anim-pop">
          <div className="text-[10px] tracking-[0.5em] text-gold">{studio.toUpperCase()} PRESENTS</div>
          <h1 className="mt-5 max-w-4xl font-display text-5xl font-black leading-[0.9] text-paper drop-shadow-[0_0_28px_rgba(255,209,102,.22)] md:text-7xl">{draft.title}</h1>
          <div className="mt-5 text-xs font-bold tracking-[0.3em] text-paper/45">{MEDIUMS[draft.medium].label.toUpperCase()} · YEAR {careerYear}</div>
        </div>
      )}

      {stage >= 2 && (
        <>
          <header className="relative z-20 flex items-center justify-between border-b border-line/30 bg-ink/55 px-4 py-2 backdrop-blur-md">
            <div>
              <div className="text-[9px] font-bold tracking-[0.4em] text-gold">WORLD PREMIERE · YEAR {careerYear}</div>
              <div className="font-display text-sm font-extrabold text-paper">{draft.title}</div>
            </div>
            <div className="text-right text-[9px] tracking-wider text-paper/35">tap / ENTER to advance</div>
          </header>

          <main className="nice-scroll relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto p-3 md:p-5">
            <div className={cn("mx-auto grid w-full flex-1 items-center gap-5 transition-all duration-700", stage < 4 ? "max-w-xl grid-cols-1" : "max-w-5xl grid-cols-1 lg:grid-cols-[minmax(300px,430px)_1fr]")}>
              <div className="relative mx-auto w-full max-w-[430px]">
                {stage === 2 && <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-ink/65 backdrop-blur-[7px] anim-pop"><div className="text-center"><div className="text-[9px] tracking-[0.5em] text-paper/45">KEY VISUAL</div><div className="mt-2 font-display text-xl font-extrabold text-paper">REVEALING…</div></div></div>}
                <div className={cn("transition-all duration-1000", stage === 2 ? "scale-[.94] opacity-65 blur-[1px]" : "scale-100 opacity-100 blur-0", result.hallOfFame && verdictVisible && "rounded-2xl border-[7px] border-gold/80 p-1 shadow-[0_0_48px_rgba(255,209,102,.28)]")}>
                  <Poster
                    draft={draft}
                    studio={studio}
                    score={null}
                    hallOfFame={result.hallOfFame && verdictVisible}
                    portrait={{ img: (awaitCast(draft.protag)).img, name: draft.protagName }}
                    className="shadow-[0_24px_80px_rgba(0,0,0,.6)]"
                  />
                </div>
                {stage === 3 && (
                  <div className="pointer-events-none absolute inset-x-0 -bottom-8 text-center anim-pop">
                    <span className="rounded-full border border-paper/15 bg-ink/75 px-3 py-1 text-[9px] font-bold tracking-[0.28em] text-paper/55">OFFICIAL KEY VISUAL</span>
                  </div>
                )}
                {result.hallOfFame && verdictVisible && <div className="anim-pop mx-auto mt-2 w-fit rounded bg-gold px-4 py-1 text-center font-display text-[10px] font-extrabold tracking-widest text-ink">PERMANENT STUDIO COLLECTION</div>}
              </div>

              {stage >= 4 && (
                <div className="space-y-3">
                  <div className="text-center lg:text-left">
                    <div className="text-[9px] font-bold tracking-[0.42em] text-paper/35">THE REVIEWS ARE IN</div>
                    <div className="mt-1 font-display text-2xl font-extrabold text-paper">Critical reception</div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {result.reviews.map((r, i) => {
                      const quote = contextualReviewQuote({
                        outlet: r.outlet,
                        focus: r.focus,
                        score: r.score,
                        total: result.total,
                        quality: result.quality,
                        careerWeek,
                        showsMade: showsMadeBefore,
                        baseQuote: r.quote,
                      });
                      return (
                        <div key={r.outlet} className={cn("min-h-[86px] rounded-2xl border p-3 transition-all duration-500", i < reviewCount ? "anim-pop border-line/70 bg-panel2/85 opacity-100" : "border-line/20 bg-ink/25 opacity-20")}>
                          {i < reviewCount ? (
                            <div className="flex items-start gap-3">
                              <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border border-paper/10 bg-abyss shadow-inner">
                                <span className={cn("font-display text-2xl font-extrabold", r.score >= 9 ? "text-gold" : r.score >= 7 ? "text-mint" : r.score >= 5 ? "text-paper" : "text-neon")}>{r.score}</span>
                                <div className="flex">{Array.from({ length: Math.max(1, Math.round(r.score / 3)) }, (_, n) => <Star key={n} size={7} className="text-gold" />)}</div>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-extrabold tracking-wider text-paper/75">{r.outlet}</div>
                                <div className="mt-1 text-[11px] italic leading-snug text-paper/60">“{quote}”</div>
                              </div>
                            </div>
                          ) : <div className="flex h-full items-center justify-center text-[9px] tracking-[0.3em] text-paper/30">EMBARGOED</div>}
                        </div>
                      );
                    })}
                  </div>

                  {verdictVisible && (
                    <div className={cn("anim-pop relative overflow-hidden rounded-3xl border p-5 text-center", result.hallOfFame ? "border-gold/70 bg-gold/10" : result.tier === "flop" ? "border-neon/60 bg-neon/10" : "border-mint/50 bg-mint/10")}>
                      <div className="text-[9px] font-bold tracking-[0.48em] text-paper/45">PREMIERE VERDICT</div>
                      <div className={cn("mt-2 font-display text-4xl font-black tracking-tight md:text-5xl", result.hallOfFame ? "text-gold" : result.tier === "flop" || result.tier === "mixed" ? "text-neon" : "text-mint")}>{verdictLabel(result)}</div>
                      <div className="mt-2 flex items-center justify-center gap-3">
                        <span className="font-display text-4xl font-extrabold text-paper"><CountUp to={result.total} duration={800} format={(n) => `${Math.round(n)}/40`} /></span>
                        <span className="rounded-full border border-line px-2 py-1 text-[9px] font-bold tracking-wider" style={{ color: tier.color }}>{tier.label.toUpperCase()}</span>
                      </div>
                      {result.hallOfFame && <div className="mt-2 flex items-center justify-center gap-1 text-[10px] font-extrabold text-gold"><Trophy size={12} /> THE POSTER WILL HANG IN YOUR STUDIO</div>}
                      {!result.hallOfFame && result.total >= 30 && <div className="mt-2 text-[10px] font-extrabold text-mint">SEQUEL RIGHTS SECURED</div>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {businessVisible && (
              <section className="anim-up mx-auto mt-6 w-full max-w-5xl border-t border-line/40 pt-5">
                <div className="mb-3 text-center">
                  <div className="text-[9px] font-bold tracking-[0.42em] text-paper/35">NOW THE NUMBERS</div>
                  <div className="font-display text-2xl font-extrabold text-paper">Commercial performance</div>
                </div>

                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <Stat icon={<PoundSterling size={15} className="text-gold" />} v={formatGBP(result.revenue)} k="TOTAL REVENUE" cls="text-gold" />
                  <Stat icon={<Flame size={15} className="text-neon" />} v={`+${formatNum(result.fans)}`} k="NEW FANS" cls="text-neon2" />
                  <Stat icon={net >= 0 ? <TrendingUp size={15} className="text-mint" /> : <TrendingDown size={15} className="text-neon" />} v={`${net >= 0 ? "+" : ""}${formatGBP(net)}`} k="PROFIT" cls={net >= 0 ? "text-mint" : "text-neon"} />
                  <Stat icon={<Database size={15} className="text-viol" />} v={`+${result.rd}`} k="RESEARCH" cls="text-viol" />
                </div>

                <div className="mt-3 rounded-2xl border border-line/60 bg-panel2/70 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-bold tracking-[0.3em] text-paper/45">WEEKLY VIEWERSHIP</span>
                    <span className="font-display text-base font-extrabold text-gold">{formatGBP(shownRevenue)}</span>
                  </div>
                  <div className="flex h-24 items-end gap-1.5">
                    {result.sales.map((v, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <div className="w-full rounded-t bg-gradient-to-t from-viol to-neon transition-all duration-200" style={{ height: i < salesWeek ? `${Math.max(4, (v / peak) * 84)}px` : "2px" }} />
                        <span className="text-[8px] text-paper/35">W{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-mint/30 bg-mint/5 p-2 text-center text-[10px] font-bold text-mint">Revenue lands week by week over the {AIR_WEEKS}-week broadcast.</div>

                {draft.franchiseKey && result.total < 30 && <div className="mt-2 rounded-xl border border-neon/40 bg-neon/10 p-2 text-center text-[10px] font-bold text-neon2">The sequel underperformed, but the series remains available from SERIES in the office.</div>}

                <details className="mt-3 rounded-xl border border-line/50 bg-panel2/55 p-3">
                  <summary className="cursor-pointer text-[10px] font-bold tracking-widest text-paper/50">DEVELOPMENT REPORT</summary>
                  <div className="mt-2 space-y-1">
                    {result.breakdown.map((b) => <div key={b.label} className="flex justify-between gap-4 text-[11px]"><span className="text-paper/55">{b.label}</span><span className="text-right font-bold text-paper/85">{b.pts}</span></div>)}
                  </div>
                </details>
              </section>
            )}
          </main>

          <footer className="relative z-20 border-t border-line/35 bg-ink/75 p-3 text-center backdrop-blur-md">
            {businessVisible ? (
              <Btn big variant={result.hallOfFame ? "gold" : "primary"} onClick={onContinue}>BACK TO THE STUDIO <ArrowRight size={18} /></Btn>
            ) : (
              <button onClick={advance} className="btn-press rounded-full border border-line/50 bg-panel2/60 px-5 py-2 text-[9px] font-bold tracking-[0.25em] text-paper/55 hover:text-paper">{stage === 9 && discoveries.length ? "TAP TO DISMISS" : "CONTINUE REVEAL"}</button>
            )}
          </footer>
        </>
      )}

      {stage === 9 && currentDiscovery && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-abyss/90 p-5 backdrop-blur-md">
          <div className={cn("anim-pop w-full max-w-xl rounded-3xl border-2 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,.7)]", currentDiscovery.cls)}>
            <div className="text-[9px] font-black tracking-[0.48em] text-paper/45">{currentDiscovery.kicker}</div>
            <div className="mt-3 font-display text-3xl font-black leading-tight md:text-5xl">{currentDiscovery.title}</div>
            <div className="mx-auto mt-4 h-px w-28 bg-current opacity-50" />
            <div className="mt-4 text-base font-bold leading-relaxed text-paper md:text-lg">{currentDiscovery.body}</div>
            {currentDiscovery.detail && <div className="mt-3 rounded-xl border border-current/30 bg-ink/40 px-4 py-3 text-xs font-extrabold tracking-wide text-paper/85">{currentDiscovery.detail}</div>}
            <div className="mt-5 text-[10px] font-bold tracking-[0.25em] text-paper/45">DISCOVERY {discoveryIndex + 1} / {discoveries.length}</div>
            <button
              onClick={(e) => { e.stopPropagation(); advance(); }}
              className="btn-press mt-3 rounded-full border border-paper/25 bg-paper/10 px-6 py-2 text-[10px] font-black tracking-[0.25em] text-paper"
            >
              TAP TO DISMISS
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* Keep cast lookup local to the premiere so Poster remains reusable for office wall tiles. */
import { castById } from "../engine/data";
const awaitCast = (id: string) => castById(id);

function Stat({ icon, v, k, cls }: { icon: React.ReactNode; v: string; k: string; cls: string }) {
  return <div className="rounded-2xl border border-line/60 bg-panel2/75 p-3 text-center shadow-inner"><div className="flex justify-center">{icon}</div><div className={cn("mt-1 truncate font-display text-sm font-extrabold md:text-base", cls)}>{v}</div><div className="text-[8px] font-bold tracking-wider text-paper/45">{k}</div></div>;
}
