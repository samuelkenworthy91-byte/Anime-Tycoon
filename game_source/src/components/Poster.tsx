import { useMemo } from "react";
import { posterDesign, titleHash, type HofEntryLite, type PosterDeco, type PosterDesign } from "../engine/poster";
import type { Draft } from "../engine/data";
import { castById } from "../engine/data";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

/*
 * <Poster/> — key-visual card for a show.
 *
 * The *design* (which font, which casing, what decorations, which billing
 * lines) is computed by posterDesign() in src/engine/poster.ts; this file is
 * only the rendering half.
 *
 * Variants:
 *   full  — the premiere poster on the release screen (4:5, billing block…)
 *   mini  — the gold wall tiles on the office stage (4:5, taped, tilted)
 */

export interface PosterPortraitProps {
  img: string;
  /** 2×2 tile quadrant index (see Portrait) */
  pos?: number;
  name: string;
}

interface BaseProps {
  className?: string;
  /** the show title is rendered in the genre font */
  hof?: HofEntryLite;
  draft?: Draft;
  studio?: string;
  score?: number | null;
  hallOfFame?: boolean;
}

interface FullProps extends BaseProps {
  variant?: "full";
  portrait: PosterPortraitProps;
  /** overlay top-left (cast strip) */
  topLeft?: React.ReactNode;
  /** rotated review stamp, shown when critics land */
  stamp?: { label: string; color: string } | null;
  /** genre chips + subtitle line under the title */
  footer?: React.ReactNode;
}

interface MiniProps extends BaseProps {
  variant: "mini";
}

export type PosterProps = FullProps | MiniProps;

/* ------------------------------------------------------------ decos ---- */

/* tiny deterministic rng from the title so decorations never jump around */
function seeded(title: string, i: number): number {
  return (titleHash(title) >>> ((i % 8) * 4)) & 0xff;
}

const SPARKLE = "polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)";
const STAR5 =
  "polygon(50% 0%, 63% 35%, 98% 35%, 70% 57%, 81% 91%, 50% 70%, 19% 91%, 30% 57%, 2% 35%, 37% 35%)";
const BURST =
  "polygon(50% 2%, 60% 26%, 84% 12%, 76% 38%, 98% 40%, 80% 57%, 94% 74%, 68% 72%, 66% 98%, 50% 78%, 34% 98%, 32% 72%, 6% 74%, 20% 57%, 2% 40%, 24% 38%, 16% 12%, 40% 26%)";
const PETAL = "polygon(50% 0%, 83% 20%, 100% 50%, 83% 80%, 50% 100%, 17% 80%, 0% 50%, 17% 20%)";
const HEX = "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)";

function Deco({ kind, color, title, i }: { kind: PosterDeco; color: string; title: string; i: number }) {
  const r = seeded(title, i);
  const x = 6 + (r % 88);
  const y = 8 + ((r * 7) % 80);
  const s = 8 + (r % 10);
  switch (kind) {
    case "burst":
      return (
        <div
          className="pointer-events-none absolute left-1/2 top-[24%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 opacity-25"
          style={{ background: color, clipPath: BURST, filter: "blur(0.5px)", transform: `translate(-50%,-50%) rotate(${r % 40}deg)` }}
        />
      );
    case "speedlines":
      return <div className="speedlines pointer-events-none absolute inset-0 opacity-40" style={{ color }} />;
    case "petals":
      return (
        <div
          className="pointer-events-none absolute opacity-70"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s * 0.7, background: "#ffb9dd", clipPath: PETAL, transform: `rotate(${r % 360}deg)` }}
        />
      );
    case "sparkles":
      return (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: "#fff", clipPath: SPARKLE, opacity: 0.5 + (r % 40) / 100, boxShadow: `0 0 ${s / 2}px ${color}` }}
        />
      );
    case "hearts":
      return (
        <svg viewBox="0 0 24 24" className="pointer-events-none absolute" style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, fill: "#ff8fb0", opacity: 0.75 }}>
          <path d="M12 21s-7.5-4.9-9.7-8.6C.6 9.4 2 6 5.4 5.2 7.5 4.7 9.6 5.7 12 8c2.4-2.3 4.5-3.3 6.6-2.8C22 6 23.4 9.4 21.7 12.4 19.5 16.1 12 21 12 21z" />
        </svg>
      );
    case "checker":
      return (
        <div
          className="pointer-events-none absolute inset-x-0 top-2 h-2.5 opacity-80"
          style={{ background: "repeating-conic-gradient(#f2ecdf 0% 25%, #0a0812 0% 50%) 0 0 / 10px 10px" }}
        />
      );
    case "stars":
      return (
        <div
          className="pointer-events-none absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, background: "#ffd166", clipPath: STAR5, opacity: 0.85, filter: `drop-shadow(0 0 ${s / 3}px #ffd16688)` }}
        />
      );
    case "steam":
      return (
        <div
          className="pointer-events-none absolute rounded-full bg-paper/25 blur-[3px]"
          style={{ left: `${x}%`, top: `${y}%`, width: 5, height: 22, transform: `skewX(${(r % 10) - 5}deg)` }}
        />
      );
    case "reticle":
      return (
        <div className="pointer-events-none absolute inset-1">
          {[
            "left-0 top-0 border-l-2 border-t-2",
            "right-0 top-0 border-r-2 border-t-2",
            "bottom-0 left-0 border-b-2 border-l-2",
            "bottom-0 right-0 border-b-2 border-r-2",
          ].map((pos, k) => (
            <div key={k} className={cn("absolute h-3 w-3", pos)} style={{ borderColor: color, opacity: 0.8 }} />
          ))}
        </div>
      );
    case "hex":
      return (
        <div
          className="pointer-events-none absolute opacity-25"
          style={{ left: `${x}%`, top: `${y}%`, width: s * 1.6, height: s * 1.6, border: `2px solid ${color}`, clipPath: HEX }}
        />
      );
    case "orbit":
      return (
        <div
          className="pointer-events-none absolute left-1/2 top-[30%] h-16 w-40 -translate-x-1/2 rounded-[100%] border-2 opacity-40"
          style={{ borderColor: color, transform: `translateX(-50%) rotate(${-14 + (r % 8)}deg)` }}
        />
      );
    case "runes":
      return (
        <div
          className="pointer-events-none absolute h-2 w-2 opacity-60"
          style={{ left: `${x}%`, top: `${y}%`, border: `1.5px solid ${color}`, transform: `rotate(45deg)`, boxShadow: `0 0 6px ${color}` }}
        />
      );
    case "drips":
      return (
        <div
          className="pointer-events-none absolute top-0 rounded-b-full"
          style={{ left: `${x}%`, width: 6, height: s + 8, background: "#b71a35", opacity: 0.75 }}
        />
      );
    case "fog":
      return <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-paper/15 to-transparent" />;
    case "glitter":
      return (
        <div
          className="pointer-events-none absolute rounded-full"
          style={{ left: `${x}%`, top: `${y}%`, width: 3, height: 3, background: "#fff", boxShadow: `0 0 5px 2px ${color}99`, opacity: 0.9 }}
        />
      );
    case "neonBars":
      return (
        <div
          className="pointer-events-none absolute top-[8%] h-[70%] w-[3px] rounded opacity-50"
          style={{ left: i % 2 ? "6%" : "94%", background: color, boxShadow: `0 0 12px 2px ${color}` }}
        />
      );
    case "laurel":
      return null; /* rendered once, beside the title block */
  }
}

function Laurel({ side }: { side: "l" | "r" }) {
  /* gold laurel branch for hall-of-fame posters */
  return (
    <svg viewBox="0 0 20 60" className={cn("h-14 w-5", side === "r" && "-scale-x-100")} aria-hidden>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <ellipse key={i} cx={11 - i * 0.8} cy={8 + i * 8.4} rx={4.4} ry={2.1} fill="#ffd166" opacity={0.95} transform={`rotate(${34 - i * 4} ${11 - i * 0.8} ${8 + i * 8.4})`} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------- fonts ---- */

export function titleTextStyle(d: PosterDesign, px: number): React.CSSProperties {
  const f = d.font;
  const longest = Math.max(...d.lines.map((l) => l.length), 1);
  const fit = longest <= 12 ? 1 : Math.max(0.62, 12 / longest);
  return {
    fontFamily: f.family,
    fontWeight: f.weight,
    fontStyle: f.italic ? "italic" : "normal",
    textTransform: f.upperCase ? "uppercase" : "none",
    letterSpacing: `${f.tracking}em`,
    transform: f.skew ? `skewX(${f.skew}deg)` : undefined,
    fontSize: px * f.scale * fit,
    lineHeight: 1.04,
    color: "#fffaf2",
    textShadow: f.glow
      ? `0 0 14px ${f.glow}aa, 0 2px 0 rgba(6,5,14,.9), 0 3px 10px rgba(0,0,0,.85)`
      : "0 2px 0 rgba(6,5,14,.9), 0 3px 10px rgba(0,0,0,.85)",
  };
}

/* ------------------------------------------------------------ poster ---- */

/** reusable design for the office's gold wall tiles — hof entries only carry
    a summary, so patch in neutral production fields for the billing block */
export function hofDesign(h: HofEntryLite): PosterDesign {
  return posterDesign(
    {
      title: h.title,
      genres: h.genres,
      medium: "tv",
      budget: "standard",
      slot: "midnight",
      audience: "teens",
      protag: h.protag,
      protagName: h.protag,
      secondary: "",
      pet: "",
      villain: "",
      arcs: [],
      sliders: [50, 50, 50],
      season: 1,
    },
    { hallOfFame: true }
  );
}

export function PosterDecorationLayer({ design }: { design: PosterDesign }) {
  const dots = useMemo(() => {
    const out: { kind: PosterDeco; n: number }[] = [];
    for (const d of design.decos) {
      /* heavier decos render once per corner/edge; confetti kinds repeat */
      const n =
        d === "sparkles" || d === "glitter" || d === "petals" || d === "hearts" || d === "runes" || d === "stars"
          ? 6
          : d === "drips" || d === "steam"
            ? 3
            : 1;
      out.push({ kind: d, n });
    }
    return out;
  }, [design.decos]);
  let i = 0;
  return (
    <>
      {dots.flatMap((d) =>
        Array.from({ length: d.n }, (_, k) => (
          <Deco key={`${d.kind}-${k}`} kind={d.kind} color={design.primary.color} title={design.lines.join(" ")} i={++i + k * 13} />
        ))
      )}
    </>
  );
}

export default function Poster(props: PosterProps) {
  const design = useMemo(
    () =>
      props.draft
        ? posterDesign(props.draft, { studio: props.studio, score: props.score ?? null, hallOfFame: props.hallOfFame })
        : hofDesign(props.hof!),
    [props]
  );

  if (props.variant === "mini") return <PosterMini design={design} hof={props.hof!} className={props.className} />;
  return <PosterFull {...props} design={design} />;
}

/* ---------------------------------------------------------- full card ---- */

function PosterFull(props: FullProps & { design: PosterDesign }) {
  const { design, portrait } = props;
  return (
    <div className={cn("anim-pop ink-card overflow-hidden", props.className)}>
      <div className="relative aspect-[4/5]" style={{ boxShadow: `inset 0 0 0 1px ${design.primary.color}55, inset 0 -80px 80px rgba(6,5,14,.35)` }}>
        <div className="pointer-events-none absolute inset-x-[8%] top-2 z-20 h-px" style={{ background: `linear-gradient(90deg, transparent, ${design.primary.color}, transparent)` }} />
        <Portrait img={portrait.img} pos={portrait.pos} name={portrait.name} alt={portrait.name} className="absolute inset-0" />
        <div className="crt absolute inset-0 bg-gradient-to-t from-abyss via-abyss/10 to-transparent" />

        {/* continuation ribbon, diagonal top-left */}
        {design.ribbon && (
          <div
            className="absolute -left-8 top-4 z-10 -rotate-45 px-8 py-0.5 text-center font-jp text-[9px] font-bold tracking-wider text-abyss shadow-lg"
            style={{ background: design.primary.color, boxShadow: `0 0 14px ${design.primary.color}` }}
          >
            {design.ribbon}
          </div>
        )}

        {/* kicker above the art's face line */}
        <div className="absolute inset-x-0 top-[7%] z-10 text-center font-jp text-[8px] tracking-[0.28em] text-paper/85 drop-shadow-md">
          {design.kicker}
        </div>

        {props.topLeft && <div className="absolute left-2 top-2 z-10">{props.topLeft}</div>}

        {props.stamp && (
          <div
            className="anim-pop absolute left-1/2 top-6 z-10 -translate-x-1/2 -rotate-6 rounded-xl border-4 px-3 py-1.5 text-center font-display text-xl font-extrabold tracking-widest"
            style={{ borderColor: props.stamp.color, color: props.stamp.color, background: "rgba(6,5,14,.78)", boxShadow: `0 0 30px ${props.stamp.color}55` }}
          >
            {props.stamp.label}
          </div>
        )}

        {/* title block */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <div className="flex items-end justify-center gap-1">
            <div className="min-w-0 text-center" style={titleTextStyle(design, 21)}>
              {design.lines.map((l, i) => (
                <div key={i} className="whitespace-nowrap">{l}</div>
              ))}
            </div>
          </div>
          {props.footer}
          {/* billing block — cinema credit strip */}
          <div className="mt-1.5 border-t border-paper/25 pt-1 text-center font-jp text-[5.5px] leading-[1.5] tracking-[0.14em] text-paper/55">
            {design.billing.map((b, i) => (
              <div key={i} className="truncate">{b}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- mini tile ---- */

function PosterMini({ design, hof, className }: { design: PosterDesign; hof: HofEntryLite; className?: string }) {
  const protag = castById(hof.protag);
  return (
    <div
      className={cn("relative w-[52px] shrink-0 overflow-visible md:w-[68px]", className)}
      style={{ transform: `rotate(${design.tilt}deg)` }}
    >
      {/* tape */}
      <div className="absolute -top-1.5 left-1/2 z-10 h-3 w-8 -translate-x-1/2 -rotate-2 rounded-[1px] bg-paper/40 shadow-sm backdrop-blur-[1px]" />
      <div className="aspect-[4/5] overflow-hidden rounded border-2 border-gold/70 bg-abyss">
        <div className="relative h-full w-full">
          <Portrait img={protag.img} pos={protag.pos} alt="" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-abyss via-transparent to-abyss/40" />
          <div
            className="absolute inset-x-0 bottom-0 p-0.5 text-center leading-none"
            style={titleTextStyle(design, 6)}
          >
            {design.lines.slice(0, 2).map((l, i) => (
              <div key={i} className="whitespace-nowrap">{l}</div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-0.5 bg-gold/90 py-0.5 text-center font-display text-[7px] font-extrabold text-ink">{hof.score}/40</div>
    </div>
  );
}
