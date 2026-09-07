import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AwardCategory, AwardCeremony, AwardNominee } from "../engine/awards";
import { castById } from "../engine/data";
import { rivalPosterById } from "../engine/rivalPosters";
import { cn } from "../utils/cn";
import { primeAudio, sfx } from "../engine/audio";
import { hofDesign, titleTextStyle, PosterDecorationLayer } from "./Poster";
import "./awardsCeremony.css";

/*
 * ═══════════════════════════════════════════════════════════════════
 *  THE LONDON ANIME AWARDS — full-screen theatrical ceremony
 * ═══════════════════════════════════════════════════════════════════
 *
 * Beats per category:
 *   intro     marquee label lights + blurb
 *   nominees  key-art posters fly in, staggered
 *   envelope  "AND THE AWARD GOES TO…" build-up, spotlight sweeps
 *   reveal    winner zooms forward out of the rack, flash + confetti
 * Anime of the Year lands last as the super-finale; the summary board
 * closes the night with the studio's real totals and RETURN TO STUDIO.
 */

type BeatKind = "intro" | "nominees" | "envelope" | "reveal";
type Phase =
  | { t: "closed" }
  | { t: "opening" }
  | { t: "category"; ci: number; beat: BeatKind }
  | { t: "summary" };

const BEAT_MS: Record<BeatKind, number> = { intro: 2400, nominees: 3400, envelope: 3400, reveal: 5200 };
const AOTY_EXTRA_MS = 2600;

const fmtCash = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const fmtFans = (n: number) => `+${n.toLocaleString("en-GB")} FANS`;

/* deterministic confetti, re-seeded per ceremony year */
function confetti(seed: number, count: number) {
  const rnd = mulberry32(seed || 7);
  const colors = ["#ffd66a", "#f5c94d", "#fff3c4", "#ff5f78", "#7ae2ff", "#d9f7ff", "#ffb54d"];
  return Array.from({ length: count }, (_, i) => ({
    left: rnd() * 100,
    delay: rnd() * 1.2,
    duration: 2.6 + rnd() * 2.4,
    size: 5 + rnd() * 7,
    color: colors[(i * 7 + Math.floor(rnd() * 13)) % colors.length],
    drift: (rnd() * 16 - 8).toFixed(2),
    spin: (rnd() * 1440 - 720).toFixed(0),
    round: rnd() > 0.8,
  }));
}
function mulberry32(a: number) {
  let t = a >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------ nominee key art ---- */

function NomineeArt({ n, small = false }: { n: AwardNominee; small?: boolean }) {
  const design = useMemo(
    () => hofDesign({ title: n.title, genres: n.genres, animeType: n.animeType, protag: n.protag ?? "H", score: n.score }),
    [n]
  );
  const rival = n.posterId ? rivalPosterById(n.posterId) : null;
  const img = n.player && n.protag ? castById(n.protag).img : rival ? rival.img : null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* painted backdrop from the show's own palette */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(120% 90% at 50% 30%, ${design.primary.color}cc 0%, #151021 52%, #08060f 100%)`,
        }}
      />
      {img && (
        <img
          src={img}
          alt=""
          className={cn(
            "absolute inset-0 h-full w-full object-cover",
            n.player ? "opacity-90" : "opacity-[0.96]"
          )}
          style={n.player ? { objectPosition: "50% 18%" } : undefined}
        />
      )}
      {!img && <PosterDecorationLayer design={design} />}
      {img && <div className="absolute inset-0 bg-gradient-to-b from-[#08060f66] via-[#08060f22] to-[#08060fe6]" />}
      {/* title block */}
      <div className="absolute inset-x-0 bottom-0 p-1.5 pb-1">
        <div style={titleTextStyle(design, small ? 9 : 11)} className="text-center">
          {design.lines.map((l, i) => (
            <Fragment key={i}>
              {i > 0 && <br />}
              {l}
            </Fragment>
          ))}
        </div>
      </div>
      {n.player && (
        <div className="absolute right-0.5 top-0.5 rounded-sm bg-gold px-1 py-px text-[6px] font-black tracking-[0.14em] text-[#241202] shadow">
          YOUR&nbsp;STUDIO
        </div>
      )}
    </div>
  );
}

function NomineePoster({
  n,
  state,
  index,
}: {
  n: AwardNominee;
  state: "idle" | "in" | "dim" | "winner" | "loser";
  index: number;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-[22%] max-w-[150px] min-w-[64px] overflow-hidden rounded-lg border bg-[#0d0a17]",
        "shadow-[0_10px_30px_rgba(0,0,0,.7)]",
        state === "in" && "aw-poster-in",
        state === "dim" && "opacity-60 [filter:saturate(.55)_brightness(.75)] transition-all duration-700",
        state === "loser" && "aw-loser-dim",
        state === "winner" && "z-10 border-gold",
        state !== "winner" && "border-[#3a2f4d]"
      )}
      style={
        state === "in"
          ? { animationDelay: `${index * 0.22}s` }
          : undefined
      }
    >
      <NomineeArt n={n} />
      <div className="absolute inset-x-0 top-0 p-0.5 text-center text-[6.5px] font-bold uppercase tracking-[0.12em] text-paper/85 [text-shadow:0_1px_3px_#000]">
        {n.studio}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- main ---- */

export default function AwardsCeremony({
  ceremony,
  studio,
  onDone,
}: {
  ceremony: AwardCeremony;
  studio: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ t: "closed" });
  const order = ceremony.presentation; // 7 ids, aoty last
  const catsByKey = useMemo(() => {
    const m = new Map<string, AwardCategory>();
    for (const c of ceremony.categories) m.set(c.id, c);
    return m;
  }, [ceremony]);
  const cat: AwardCategory | null =
    phase.t === "category" ? catsByKey.get(order[phase.ci]) ?? null : null;
  const isAoty = (cat?.id ?? "") === "aoty";
  const winner = cat?.winner ?? null;

  const timer = useRef<number>(0);
  const schedule = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(nextRef.current, ms);
  };
  /* beat clock -------------------------------------------------------- */
  useEffect(() => {
    primeAudio();
    const p = phase;
    switch (p.t) {
      case "closed":
        sfx.whoosh();
        schedule(1900);
        break;
      case "opening":
        sfx.whoosh();
        schedule(2600);
        break;
      case "category":
        switch (p.beat) {
          case "intro":   sfx.phase(); schedule(BEAT_MS.intro + (isAoty ? 700 : 0)); break;
          case "nominees": sfx.stamp(); schedule(BEAT_MS.nominees + (isAoty ? 800 : 0)); break;
          case "envelope": sfx.reveal(); schedule(BEAT_MS.envelope + (isAoty ? 1400 : 0)); break;
          case "reveal": {
            const isPlayer = !!cat?.winner?.player;
            if (isAoty) sfx.fanfare();
            else if (isPlayer) sfx.cash();
            else sfx.stamp();
            if (isPlayer && !isAoty) setTimeout(() => sfx.coin(), 620);
            schedule(BEAT_MS.reveal + (isAoty ? AOTY_EXTRA_MS : 0));
            break;
          }
        }
        break;
      case "summary":
        sfx.fanfare();
        break;
    }
    return () => window.clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(phase)]);

  const next = useCallback(() => {
    setPhase((p) => {
      switch (p.t) {
        case "closed":  return { t: "opening" };
        case "opening": return { t: "category", ci: 0, beat: "intro" };
        case "summary": return p;
        case "category": {
          const beats: BeatKind[] = ["intro", "nominees", "envelope", "reveal"];
          const bi = beats.indexOf(p.beat);
          if (bi < beats.length - 1) return { t: "category", ci: p.ci, beat: beats[bi + 1] };
          return p.ci + 1 < order.length
            ? { t: "category", ci: p.ci + 1, beat: "intro" }
            : { t: "summary" };
        }
      }
    });
  }, [order.length]);
  const nextRef = useRef(next);
  nextRef.current = next;

  const skipAll = () => setPhase({ t: "summary" });

  /* deterministic weather of gold per year */
  const rain = useMemo(() => confetti(ceremony.year * 101, isAoty && phase.t === "category" && phase.beat === "reveal" ? 120 : 64), [ceremony.year, phase, isAoty]);
  const showConfetti = phase.t === "summary" || (phase.t === "category" && phase.beat === "reveal");

  const playerWins = ceremony.playerWins;

  return (
    <div className="fixed inset-0 z-[90] select-none overflow-hidden bg-[#060409] font-display text-paper">
      {/* stage backdrop */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-95"
        style={{ backgroundImage: "url(/awards/stage-bg.webp)" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_115%,rgba(255,190,90,.14),transparent_60%)]" />

      {/* ---------------------------------------------------------------- beat stage */}
      <div className="absolute inset-0 z-10 flex flex-col items-center">
        {(phase.t === "closed" || phase.t === "opening") && (
          <div className="relative z-40 flex h-full w-full flex-col items-center justify-center px-6 text-center">
            {phase.t === "opening" && (
              <div className="aw-title-reveal aw-marquee mt-[-12vh]">
                <div className="text-[10px] font-bold tracking-[0.5em] text-gold/90 sm:text-xs">{studio.toUpperCase()} PRESENTS</div>
                <div className="mt-2 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#b8831a] bg-clip-text text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_4px_18px_rgba(255,190,60,.4)] sm:text-6xl">
                  THE LONDON
                </div>
                <div className="bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#b8831a] bg-clip-text text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_4px_18px_rgba(255,190,60,.4)] sm:text-6xl">
                  ANIME AWARDS
                </div>
                <div className="mt-3 text-xs font-bold tracking-[0.6em] text-paper/70">YEAR {ceremony.year} CEREMONY</div>
              </div>
            )}
          </div>
        )}

        {phase.t === "category" && cat && (
          <div className="flex h-full w-full flex-col items-center justify-center px-3 pt-[7vh]" key={cat.id + phase.beat}>
            {/* category marquee */}
            <div className={cn("text-center", (phase.beat === "intro" || phase.beat === "nominees") && "aw-rise")}>
              <div className={cn("text-[9px] font-black tracking-[0.5em] sm:text-[11px]", isAoty ? "text-gold" : "text-gold/80")}>
                {isAoty ? "★ THE SUPER-FINALE ★" : `AWARD ${phase.ci + 1} OF ${order.length}`}
              </div>
              <div className="aw-marquee mt-1 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#c78f2a] bg-clip-text text-3xl font-black tracking-[0.1em] text-transparent drop-shadow-[0_3px_14px_rgba(255,190,60,.35)] sm:text-5xl">
                {cat.name.toUpperCase()}
              </div>
              <div className="mx-auto mt-1 max-w-md px-4 text-[10px] italic text-paper/70 sm:text-xs">{cat.blurb}</div>
            </div>

            {/* the nominees rack */}
            <div className="mt-4 flex h-[34vh] max-h-[300px] min-h-[150px] w-full max-w-3xl items-center justify-center gap-[2.5%] sm:mt-6">
              {cat.nominees.map((n, i) => {
                const isWinner = winner === n;
                let state: "idle" | "in" | "dim" | "winner" | "loser" = "idle";
                if (phase.beat === "nominees") state = "in";
                else if (phase.beat === "envelope") state = isWinner ? "dim" : "dim";
                else if (phase.beat === "reveal") state = isWinner ? "winner" : "loser";
                if (phase.beat === "envelope" && isWinner) state = "dim";
                return (
                  <div
                    key={n.title + n.studio + i}
                    className={cn(
                      "relative flex h-full flex-col justify-center",
                      state === "winner" && "aw-winner-zoom w-[38%] min-w-[110px]",
                      state !== "winner" && "w-[18%]"
                    )}
                  >
                    <NomineePoster n={n} state={state === "winner" ? "winner" : state} index={i} />
                    {state === "winner" && phase.beat === "reveal" && (
                      <>
                        <div className="aw-ring pointer-events-none absolute inset-[-16%] rounded-2xl border-2 border-gold" />
                        <div className="aw-ring pointer-events-none absolute inset-[-16%] rounded-2xl border border-[#fff3c4]" style={{ animationDelay: "0.35s" }} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* envelope / reveal caption */}
            <div className="mt-3 flex h-[24vh] min-h-[120px] flex-col items-center justify-start sm:mt-5">
              {phase.beat === "envelope" && (
                <div className="aw-envelope-in aw-envelope-pulse relative rounded-xl border-2 border-gold/80 bg-gradient-to-b from-[#2a1a08] to-[#130c04] px-6 py-3 shadow-[0_0_40px_rgba(255,190,60,.35)]">
                  <div className="text-center text-[10px] font-bold tracking-[0.4em] text-gold/80">AND THE AWARD GOES TO…</div>
                  <div className="mx-auto mt-1 h-px w-2/3 bg-gradient-to-r from-transparent via-gold/70 to-transparent" />
                  <div className="mt-1 text-center text-lg font-black tracking-[0.14em] text-[#fff3c4] sm:text-2xl">……</div>
                </div>
              )}
              {phase.beat === "reveal" && winner && (
                <div className="aw-rise text-center">
                  <div className="text-[10px] font-bold tracking-[0.4em] text-gold/80">AND THE AWARD GOES TO…</div>
                  <div className="mt-1 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#c78f2a] bg-clip-text text-2xl font-black tracking-[0.08em] text-transparent drop-shadow sm:text-4xl">
                    {winner.title.toUpperCase()}
                  </div>
                  <div className="mt-0.5 text-xs font-bold tracking-[0.3em] text-paper/80 sm:text-sm">
                    {winner.player ? "YOUR STUDIO · " : ""}{winner.studio.toUpperCase()}
                  </div>
                  {winner.player && (
                    <div className="aw-rise mt-2 inline-flex items-center gap-3 rounded-full border border-gold/70 bg-gold/15 px-4 py-1 text-[11px] font-black text-gold shadow-[0_0_24px_rgba(255,190,60,.35)] sm:text-sm">
                      <span className="text-[#bff2c0]">{fmtCash(cat.payout.cash)}</span>
                      <span className="text-paper/40">·</span>
                      <span>{fmtFans(cat.payout.fans)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {phase.t === "summary" && (
          <div className="aw-fade-in flex h-full w-full flex-col items-center px-4 pt-[9vh]">
            <div className="text-[10px] font-bold tracking-[0.5em] text-gold/80 sm:text-xs">THE LONDON ANIME AWARDS · YEAR {ceremony.year}</div>
            <div className="aw-marquee mt-1 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#c78f2a] bg-clip-text text-2xl font-black tracking-[0.12em] text-transparent sm:text-4xl">
              {playerWins.length > 0 ? `${studio.toUpperCase()} TAKES ${playerWins.length}` : "THE FINAL BOARD"}
            </div>
            <div className="mt-0.5 text-xs font-bold tracking-[0.4em] text-paper/60">
              {playerWins.length > 0 ? (playerWins.length === 1 ? "AWARD HOME" : "AWARDS HOME") : "WINNERS OF THE NIGHT"}
            </div>

            {/* totals */}
            <div className="aw-rise mt-3 flex items-center gap-3 sm:gap-5">
              <div className="rounded-xl border border-gold/60 bg-[#1b1206cc] px-4 py-2 text-center shadow-[0_0_30px_rgba(255,190,60,.25)]">
                <div className="text-lg font-black text-[#bff2c0] sm:text-2xl">{fmtCash(ceremony.playerCash)}</div>
                <div className="text-[8px] font-bold tracking-[0.3em] text-paper/60">PRIZE MONEY</div>
              </div>
              <div className="rounded-xl border border-gold/60 bg-[#1b1206cc] px-4 py-2 text-center shadow-[0_0_30px_rgba(255,190,60,.25)]">
                <div className="text-lg font-black text-gold sm:text-2xl">{fmtFans(ceremony.playerFans)}</div>
                <div className="text-[8px] font-bold tracking-[0.3em] text-paper/60">NEW FANS</div>
              </div>
              <div className="rounded-xl border border-gold/60 bg-[#1b1206cc] px-4 py-2 text-center shadow-[0_0_30px_rgba(255,190,60,.25)]">
                <div className="text-lg font-black text-paper sm:text-2xl">{ceremony.playerAwards}</div>
                <div className="text-[8px] font-bold tracking-[0.3em] text-paper/60">AWARDS WON</div>
              </div>
            </div>

            {/* the board */}
            <div className="aw-rise mt-3 w-full max-w-2xl space-y-1 overflow-y-auto px-2 pb-2" style={{ animationDelay: "0.25s", maxHeight: "34vh" }}>
              {order.map((id) => {
                const c = catsByKey.get(id)!;
                
                return (
                  <div
                    key={id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-1.5",
                      c.winner.player ? "border-gold/70 bg-gold/10" : "border-[#3a2f4d]/70 bg-[#0e0a16b3]"
                    )}
                  >
                    <span className={cn("text-base", c.winner.player ? "" : "opacity-50 grayscale")}>🏆</span>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-black sm:text-sm">
                        {c.winner.title}
                        {c.winner.player && <span className="ml-1.5 rounded-sm bg-gold px-1 py-px align-middle text-[8px] font-black tracking-[0.12em] text-[#241202]">YOUR&nbsp;STUDIO</span>}
                      </div>
                      <div className="text-[9px] tracking-[0.2em] text-paper/50">
                        {c.name.toUpperCase()} · {c.winner.studio.toUpperCase()}
                      </div>
                    </div>
                    {c.winner.player && (
                      <div className="ml-auto text-right text-[10px] font-black">
                        <div className="text-[#bff2c0]">{fmtCash(c.payout.cash)}</div>
                        <div className="text-gold/80">{fmtFans(c.payout.fans)}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => { sfx.fanfare(); onDone(); }}
              className="mt-3 mb-[3vh] rounded-xl border-2 border-gold bg-gradient-to-b from-[#ffd66a] to-[#c78f2a] px-8 py-2.5 text-sm font-black tracking-[0.2em] text-[#241202] shadow-[0_10px_40px_rgba(255,190,60,.4)] transition-transform hover:scale-105 active:scale-95"
            >
              RETURN TO STUDIO ▸
            </button>
          </div>
        )}
      </div>

      {/* floating controls */}
      {phase.t !== "summary" && (
        <div className="absolute bottom-4 right-4 z-[60] flex gap-2">
          <button
            onClick={skipAll}
            className="rounded-lg border border-paper/25 bg-black/60 px-3 py-1.5 text-[10px] font-bold tracking-[0.2em] text-paper/60 backdrop-blur transition hover:text-paper"
          >
            SKIP CEREMONY
          </button>
          <button
            onClick={() => { sfx.click(); next(); }}
            className="rounded-lg border border-gold/60 bg-black/60 px-4 py-1.5 text-[10px] font-bold tracking-[0.2em] text-gold backdrop-blur transition hover:bg-gold/20"
          >
            NEXT ▸
          </button>
        </div>
      )}

      {/* spotlight sweeps during envelope */}
      {phase.t === "category" && phase.beat === "envelope" && (
        <>
          <div className="aw-spotlight pointer-events-none absolute left-[16%] top-0 z-20 h-[46vh] w-[9vw] bg-gradient-to-b from-[#ffe9ad99] to-transparent [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" />
          <div className="aw-spotlight pointer-events-none absolute right-[16%] top-0 z-20 h-[46vh] w-[9vw] bg-gradient-to-b from-[#ffe9ad99] to-transparent [clip-path:polygon(38%_0,62%_0,100%_100%,0_100%)]" style={{ animationDelay: "1.3s" }} />
        </>
      )}

      {/* reveal flash */}
      {phase.t === "category" && phase.beat === "reveal" && (
        <div className="aw-flash pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(85%_85%_at_50%_38%,#fff8e6_0%,rgba(255,214,106,.75)_40%,transparent_78%)]" />
      )}

      {/* AOTY god rays */}
      {phase.t === "category" && phase.beat === "reveal" && isAoty && (
        <div
          className="aw-rays pointer-events-none absolute left-1/2 top-[36%] z-[5] h-[130vmax] w-[130vmax] -translate-x-1/2 -translate-y-1/2 opacity-25"
          style={{ background: "repeating-conic-gradient(from 0deg, #ffd66a55 0deg 6deg, transparent 6deg 22deg)" }}
        />
      )}

      {/* confetti */}
      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
          {rain.map((c, i) => (
            <div
              key={i}
              className={cn("aw-confetti-piece absolute top-0", c.round && "rounded-full")}
              style={{
                left: `${c.left}%`,
                width: c.size,
                height: c.round ? c.size : c.size * 1.6,
                background: c.color,
                animationDelay: `${c.delay}s`,
                animationDuration: `${c.duration}s`,
                ["--aw-drift" as never]: `${c.drift}vw`,
                ["--aw-spin" as never]: `${c.spin}deg`,
              }}
            />
          ))}
        </div>
      )}

      {/* the VALANCE frames the top, always above the curtain halves */}
      <img
        src="/awards/valance.webp"
        alt=""
        className="pointer-events-none absolute left-0 top-0 z-50 w-full object-cover"
        draggable={false}
      />

      {/* the curtains themselves */}
      <div
        className={cn("aw-curtain", phase.t === "closed" ? "closed-l" : "open-l")}
        style={{
          backgroundImage: "url(/awards/curtain-left.webp)",
          backgroundSize: "cover",
          backgroundPosition: "right center",
          boxShadow: phase.t === "closed" ? "14px 0 34px rgba(0,0,0,.55)" : undefined,
        }}
      />
      <div
        className={cn("aw-curtain", phase.t === "closed" ? "closed-r" : "open-r")}
        style={{
          backgroundImage: "url(/awards/curtain-right.webp)",
          backgroundSize: "cover",
          backgroundPosition: "left center",
          boxShadow: phase.t === "closed" ? "-14px 0 34px rgba(0,0,0,.55)" : undefined,
        }}
      />
    </div>
  );
}
