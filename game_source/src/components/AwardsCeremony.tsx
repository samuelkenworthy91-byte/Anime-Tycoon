import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { licensedAwardPosterAsset, type AwardCategory, type AwardCeremony, type AwardNominee } from "../engine/awards";
import { castById, type Draft } from "../engine/data";
import { rivalPosterById } from "../engine/rivalPosters";
import { cn } from "../utils/cn";
import { primeAudio, sfx } from "../engine/audio";
import Poster, { PosterDecorationLayer, hofDesign, titleTextStyle } from "./Poster";
import "./awardsCeremony.css";

type BeatKind = "intro" | "nominees" | "envelope" | "reveal";
type Phase =
  | { t: "closed" }
  | { t: "opening" }
  | { t: "category"; ci: number; beat: BeatKind }
  | { t: "summary" };

const BEAT_MS: Record<BeatKind, number> = {
  intro: 2200,
  nominees: 4200,
  envelope: 3000,
  reveal: 6200,
};
const AOTY_EXTRA_MS = 2200;

const fmtCash = (n: number) => `£${Math.round(n).toLocaleString("en-GB")}`;
const fmtFans = (n: number) => `+${n.toLocaleString("en-GB")} FANS`;

const nomineeKey = (n: AwardNominee) =>
  n.sourceId?.trim() || `${n.player ? "player" : "rival"}|${n.studio.trim().toLowerCase()}|${n.title.trim().toLowerCase()}`;

const sameNominee = (a: AwardNominee | null | undefined, b: AwardNominee | null | undefined) =>
  !!a && !!b && nomineeKey(a) === nomineeKey(b);

function fallbackDraft(n: AwardNominee): Draft {
  const lead = castById(n.protag ?? "");
  return {
    title: n.title,
    genres: [...n.genres],
    medium: "tv",
    budget: "standard",
    slot: "midnight",
    animeType: n.animeType,
    audience: "teens",
    protag: lead.id,
    protagName: lead.name,
    secondary: "",
    pet: "",
    villain: "",
    arcs: [],
    sliders: [50, 50, 50],
    season: 1,
  };
}

function confetti(seed: number, count: number) {
  const rnd = mulberry32(seed || 7);
  const colors = ["#ffd66a", "#f5c94d", "#fff3c4", "#ff5f78", "#7ae2ff", "#d9f7ff", "#ffb54d"];
  return Array.from({ length: count }, (_, i) => ({
    left: rnd() * 100,
    delay: rnd() * 1.1,
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

function GeneratedFallbackPoster({ nominee }: { nominee: AwardNominee }) {
  const design = useMemo(
    () =>
      hofDesign({
        title: nominee.title,
        genres: nominee.genres,
        animeType: nominee.animeType,
        protag: nominee.protag ?? "H",
        score: nominee.score,
      }),
    [nominee]
  );
  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/50 bg-[#0d0a17] shadow-[0_24px_80px_rgba(0,0,0,.72)]">
      <div
        className="absolute inset-0"
        style={{ background: `radial-gradient(120% 90% at 50% 30%, ${design.primary.color}bb 0%, #151021 54%, #08060f 100%)` }}
      />
      <PosterDecorationLayer design={design} />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#05030a] via-[#05030acc] to-transparent px-4 pb-5 pt-16 text-center">
        <div style={titleTextStyle(design, 28)}>{nominee.title}</div>
      </div>
    </div>
  );
}

function WinnerPoster({ nominee }: { nominee: AwardNominee }) {
  const licensedPoster = licensedAwardPosterAsset(nominee);
  if (licensedPoster) {
    return (
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">
        <img src={licensedPoster} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
      </div>
    );
  }
  if (nominee.player) {
    const draft = nominee.draft ?? fallbackDraft(nominee);
    const lead = castById(draft.protag);
    return (
      <Poster
        draft={draft}
        studio={nominee.studio}
        score={nominee.score}
        portrait={{ img: lead.img, name: draft.protagName || lead.name }}
        className="w-full shadow-[0_24px_90px_rgba(0,0,0,.75)]"
      />
    );
  }

  const rival = nominee.posterId ? rivalPosterById(nominee.posterId) : null;
  if (!rival) return <GeneratedFallbackPoster nominee={nominee} />;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl border border-gold/55 bg-[#0d0a17] shadow-[0_24px_90px_rgba(0,0,0,.75)]">
      <img src={rival.img} alt={`${nominee.title} poster`} className="absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
    </div>
  );
}

function NomineeList({ cat, beat }: { cat: AwardCategory; beat: BeatKind }) {
  const winner = cat.winner;
  const settled = beat === "envelope" || beat === "reveal";
  const nominees = cat.nominees.filter(
    (nominee, index, list) => list.findIndex((candidate) => nomineeKey(candidate) === nomineeKey(nominee)) === index
  );
  return (
    <div className={cn("aw-nominee-list", settled && "aw-list-settle")}>
      {nominees.map((nominee, index) => {
        const wins = sameNominee(nominee, winner);
        const lit = wins && beat === "reveal";
        return (
          <div
            key={`${nominee.title}-${nominee.studio}-${index}`}
            className={cn(
              "aw-nominee-row",
              beat === "nominees" && "aw-nominee-row-in",
              beat === "envelope" && "aw-nominee-row-wait",
              lit && "aw-nominee-row-winner"
            )}
            style={beat === "nominees" ? { animationDelay: `${index * 0.38}s` } : undefined}
          >
            {lit && <div className="aw-row-beam" aria-hidden />}
            <span className="relative z-10 min-w-0 truncate font-extrabold text-paper">{nominee.title}</span>
            <span className="relative z-10 shrink-0 text-paper/48"> — {nominee.studio}</span>
          </div>
        );
      })}
    </div>
  );
}

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
  const order = ceremony.presentation;
  const catsByKey = useMemo(() => new Map(ceremony.categories.map((c) => [c.id, c])), [ceremony.categories]);
  const cat = phase.t === "category" ? catsByKey.get(order[phase.ci]) ?? null : null;
  const isAoty = cat?.id === "aoty";
  const timer = useRef<number>(0);
  const nextRef = useRef<() => void>(() => undefined);

  const next = useCallback(() => {
    setPhase((p) => {
      switch (p.t) {
        case "closed":
          return { t: "opening" };
        case "opening":
          return { t: "category", ci: 0, beat: "intro" };
        case "summary":
          return p;
        case "category": {
          const beats: BeatKind[] = ["intro", "nominees", "envelope", "reveal"];
          const bi = beats.indexOf(p.beat);
          if (bi < beats.length - 1) return { t: "category", ci: p.ci, beat: beats[bi + 1] };
          return p.ci + 1 < order.length ? { t: "category", ci: p.ci + 1, beat: "intro" } : { t: "summary" };
        }
      }
    });
  }, [order.length]);
  nextRef.current = next;

  const schedule = (ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => nextRef.current(), ms);
  };

  useEffect(() => {
    primeAudio();
    sfx.stopCeremony();
    switch (phase.t) {
      case "closed":
        sfx.whoosh();
        schedule(1700);
        break;
      case "opening":
        sfx.whoosh();
        sfx.audienceSwell();
        schedule(2400);
        break;
      case "category":
        if (phase.beat === "intro") {
          sfx.phase();
          schedule(BEAT_MS.intro + (isAoty ? 500 : 0));
        } else if (phase.beat === "nominees") {
          schedule(BEAT_MS.nominees + (isAoty ? 600 : 0));
        } else if (phase.beat === "envelope") {
          sfx.drumroll(!!isAoty);
          schedule(BEAT_MS.envelope + (isAoty ? 1000 : 0));
        } else {
          sfx.applause(!!isAoty);
          if (isAoty) sfx.fanfare(true);
          schedule(BEAT_MS.reveal + (isAoty ? AOTY_EXTRA_MS : 0));
        }
        break;
      case "summary":
        sfx.applause(true);
        sfx.fanfare(true);
        break;
    }
    return () => {
      window.clearTimeout(timer.current);
      sfx.stopCeremony();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(phase)]);

  const showConfetti = phase.t === "summary" || (phase.t === "category" && phase.beat === "reveal");
  const rain = useMemo(
    () => confetti(ceremony.year * 101, isAoty && phase.t === "category" && phase.beat === "reveal" ? 120 : 58),
    [ceremony.year, isAoty, phase]
  );

  return (
    <div className="fixed inset-0 z-[90] select-none overflow-hidden bg-[#060409] font-display text-paper">
      <div className="absolute inset-0 bg-cover bg-center opacity-95" style={{ backgroundImage: "url(/awards/stage-bg.webp)" }} />
      <div className="absolute inset-0 bg-[radial-gradient(110%_76%_at_50%_108%,rgba(255,190,90,.16),transparent_62%)]" />
      <img src="/awards/valance.webp" alt="" className="aw-valance pointer-events-none absolute inset-x-0 top-0 z-40 h-auto w-full" />

      {(phase.t === "closed" || phase.t === "opening") && (
        <>
          <img src="/awards/curtain-left.webp" alt="" className={cn("aw-curtain aw-curtain-left", phase.t === "closed" ? "closed-l" : "open-l")} />
          <img src="/awards/curtain-right.webp" alt="" className={cn("aw-curtain aw-curtain-right", phase.t === "closed" ? "closed-r" : "open-r")} />
        </>
      )}

      {showConfetti && (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden" aria-hidden>
          {rain.map((piece, i) => (
            <i
              key={i}
              className="aw-confetti-piece absolute -top-4 block"
              style={{
                left: `${piece.left}%`,
                width: piece.size,
                height: piece.round ? piece.size : piece.size * 0.42,
                borderRadius: piece.round ? "50%" : 1,
                background: piece.color,
                animationDelay: `${piece.delay}s`,
                animationDuration: `${piece.duration}s`,
                ["--aw-drift" as string]: `${piece.drift}vw`,
                ["--aw-spin" as string]: `${piece.spin}deg`,
              }}
            />
          ))}
        </div>
      )}

      <div className="absolute inset-0 z-10 flex flex-col items-center">
        {phase.t === "opening" && (
          <div className="relative z-40 flex h-full w-full flex-col items-center justify-center px-6 text-center">
            <div className="aw-title-reveal aw-marquee aw-opening-title">
              <div className="text-[10px] font-bold tracking-[0.5em] text-gold/90 sm:text-xs">{studio.toUpperCase()} PRESENTS</div>
              <div className="mt-2 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#b8831a] bg-clip-text text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_4px_18px_rgba(255,190,60,.4)] sm:text-6xl">THE LONDON</div>
              <div className="bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#b8831a] bg-clip-text text-4xl font-black tracking-[0.18em] text-transparent drop-shadow-[0_4px_18px_rgba(255,190,60,.4)] sm:text-6xl">ANIME AWARDS</div>
              <div className="mt-3 text-xs font-bold tracking-[0.6em] text-paper/70">YEAR {ceremony.year} CEREMONY</div>
            </div>
          </div>
        )}

        {phase.t === "category" && cat && (
          <div className="aw-category-stage flex h-full w-full flex-col items-center px-4 pb-14" key={`${cat.id}-${phase.beat}`}>
            <div className={cn("aw-category-header text-center", (phase.beat === "intro" || phase.beat === "nominees") && "aw-rise")}>
              <div className={cn("text-[9px] font-black tracking-[0.5em] sm:text-[11px]", isAoty ? "text-gold" : "text-gold/80")}>
                {isAoty ? "★ THE SUPER-FINALE ★" : `AWARD ${phase.ci + 1} OF ${order.length}`}
              </div>
              <div className="aw-marquee mt-1 bg-gradient-to-b from-[#fff3c4] via-[#ffd66a] to-[#c78f2a] bg-clip-text text-3xl font-black tracking-[0.1em] text-transparent drop-shadow-[0_3px_14px_rgba(255,190,60,.35)] sm:text-5xl">{cat.name.toUpperCase()}</div>
              <div className="mx-auto mt-1 max-w-lg px-4 text-[10px] italic text-paper/70 sm:text-xs">{cat.blurb}</div>
            </div>

            {phase.beat === "intro" ? (
              <div className="aw-rise flex flex-1 items-center justify-center text-[10px] font-bold tracking-[0.5em] text-paper/35">THE NOMINEES</div>
            ) : (
              <div className={cn("mt-5 flex w-full max-w-4xl flex-1 items-center justify-center gap-6 overflow-hidden", phase.beat === "reveal" && "aw-reveal-layout")}>
                <div className={cn("relative w-full max-w-2xl", phase.beat === "reveal" && "aw-list-on-reveal")}>
                  <NomineeList cat={cat} beat={phase.beat} />
                  {phase.beat === "envelope" && (
                    <>
                      <div className="aw-spotlight pointer-events-none absolute inset-y-[-12%] left-1/2 w-28 -translate-x-1/2 bg-gradient-to-b from-[#fff8d588] via-[#ffe18a33] to-transparent blur-sm" />
                      <div className="aw-envelope-in absolute inset-x-0 -bottom-20 text-center">
                        <span className="rounded-full border border-gold/45 bg-[#120d1dee] px-5 py-2 text-[10px] font-black tracking-[0.34em] text-gold shadow-[0_0_30px_rgba(255,205,90,.16)]">AND THE AWARD GOES TO…</span>
                      </div>
                    </>
                  )}
                </div>

                {phase.beat === "reveal" && (
                  <div className="aw-winner-panel w-[42%] max-w-[320px] min-w-[190px]">
                    <div className="aw-winner-poster mx-auto w-full max-w-[280px]">
                      <WinnerPoster nominee={cat.winner} />
                    </div>
                    <div className="aw-rise mt-3 text-center">
                      <div className="text-[9px] font-black tracking-[0.38em] text-gold">WINNER</div>
                      <div className="mt-1 text-xl font-black text-paper sm:text-2xl">{cat.winner.title}</div>
                      <div className="mt-1 text-[10px] font-bold tracking-[0.22em] text-paper/55">{cat.winner.studio}</div>
                      {cat.winner.player && (
                        <div className="mx-auto mt-2 w-fit rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[8px] font-black tracking-[0.2em] text-gold">YOUR STUDIO · {fmtCash(cat.payout.cash)} · {fmtFans(cat.payout.fans)}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {phase.t === "summary" && (
          <div className="nice-scroll relative z-20 flex h-full w-full max-w-3xl flex-col overflow-y-auto px-4 pb-24 pt-[10vh]">
            <div className="aw-rise text-center">
              <div className="text-[10px] font-black tracking-[0.5em] text-gold">YEAR {ceremony.year}</div>
              <div className="mt-1 text-4xl font-black text-paper sm:text-5xl">AWARDS COMPLETE</div>
              <div className="mx-auto mt-3 h-px w-44 bg-gradient-to-r from-transparent via-gold to-transparent" />
            </div>

            <div className="mt-7 space-y-2">
              {ceremony.presentation.map((id, index) => {
                const row = catsByKey.get(id);
                if (!row) return null;
                return (
                  <div key={id} className="aw-rise flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0d0915cc] px-4 py-3" style={{ animationDelay: `${index * 0.08}s` }}>
                    <div>
                      <div className="text-[8px] font-black tracking-[0.25em] text-gold/75">{row.name.toUpperCase()}</div>
                      <div className="mt-0.5 font-extrabold text-paper">{row.winner.title}</div>
                    </div>
                    <div className="text-right text-[9px] font-bold tracking-[0.14em] text-paper/50">{row.winner.studio}</div>
                  </div>
                );
              })}
              {(ceremony.unawarded ?? []).map((row, index) => (
                <div key={`unawarded-${row.id}`} className="aw-rise flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0d0915aa] px-4 py-3" style={{ animationDelay: `${(ceremony.presentation.length + index) * 0.08}s` }}>
                  <div>
                    <div className="text-[8px] font-black tracking-[0.25em] text-paper/45">{row.name.toUpperCase()}</div>
                    <div className="mt-0.5 font-extrabold text-paper/55">NO AWARD PRESENTED</div>
                  </div>
                  <div className="max-w-[48%] text-right text-[8px] font-bold text-paper/35">No production cleared {row.qualification}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-5 text-center">
              <div className="text-[9px] font-black tracking-[0.35em] text-gold">YOUR STUDIO</div>
              <div className="mt-2 text-3xl font-black text-paper">{ceremony.playerAwards} AWARD{ceremony.playerAwards === 1 ? "" : "S"}</div>
              <div className="mt-2 flex items-center justify-center gap-4 text-[10px] font-bold text-paper/65">
                <span>{fmtCash(ceremony.playerCash)}</span>
                <span>{fmtFans(ceremony.playerFans)}</span>
              </div>
            </div>

            <button onClick={onDone} className="mx-auto mt-7 rounded-xl border border-gold/50 bg-gold px-8 py-3 text-[10px] font-black tracking-[0.26em] text-[#241202] shadow-[0_0_28px_rgba(255,209,102,.2)]">RETURN TO STUDIO</button>
          </div>
        )}
      </div>

      {phase.t !== "summary" && phase.t !== "closed" && (
        <div className="absolute bottom-3 right-3 z-[70] flex gap-2">
          <button onClick={() => { sfx.stopCeremony(); setPhase({ t: "summary" }); }} className="rounded-lg border border-white/10 bg-black/45 px-3 py-2 text-[8px] font-bold tracking-[0.16em] text-paper/45 backdrop-blur">SKIP CEREMONY</button>
          <button onClick={next} className="rounded-lg border border-gold/25 bg-black/55 px-4 py-2 text-[9px] font-black tracking-[0.18em] text-gold backdrop-blur">NEXT ›</button>
        </div>
      )}
    </div>
  );
}
