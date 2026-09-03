import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { WORKER_LOOKS, BOSS_LOOK } from "../engine/data";

export interface OfficeStaff {
  id?: string;
  name: string;
  color: string;
  tired?: boolean;
  /** index into WORKER_LOOKS so each person keeps their own painted model */
  look?: number;
  /** the showrunner's own painted office sprite */
  sprite?: string;
  working?: boolean;
  energy?: number;
  resting?: boolean;
  pulse?: { actorId: string; name: string; type: string; points: number; nonce: number };
}

/* ------------------------------------------------------------------ art
 * Hand-painted HD-2D backdrops in the Final Fantasy Tactics: War of the Lions
 * / Vanillaware idiom, with painted character sprites composited on top. The
 * backdrop is drawn "cover" into a fixed-aspect stage so every sprite anchor
 * below can be expressed as a plain percentage of that stage and stay put at
 * any window size.                                                          */
const STAGE_AR = 1600 / 900;

const SCENES = [
  "img/scene-office-1.jpg",
  "img/scene-office-2.jpg",
  "img/scene-office-3.jpg",
  "img/scene-office-3.jpg",
  "img/scene-office-3.jpg",
];

const SPRITES = WORKER_LOOKS.map((l) => l.sprite);
/** the showrunner has their own painted sprite */
const BOSS_SPRITE = BOSS_LOOK.sprite;

/** clear floor each backdrop leaves for characters, in stage percentages */
interface FloorZone {
  x0: number;
  x1: number;
  /** back edge (smaller = further away = smaller sprites) */
  y0: number;
  y1: number;
}
const FLOORS: FloorZone[] = [
  { x0: 26, x1: 72, y0: 68, y1: 90 }, // bedroom diorama: the bare boards
  { x0: 9, x1: 40, y0: 68, y1: 93 }, // studio: rug + tiles, left of the desks
  { x0: 25, x1: 53, y0: 72, y1: 93 }, // tower: the marble aisle only
  { x0: 25, x1: 53, y0: 72, y1: 93 },
  { x0: 25, x1: 53, y0: 72, y1: 93 },
];

/** sprite height as a share of stage height, at the very front of the zone */
const SPRITE_H = [0.28, 0.24, 0.19, 0.19, 0.19];

/* ------------------------------------------------------------- geometry */
/** lay out n anchors as staggered isometric rows inside the floor zone */
function anchors(zone: FloorZone, n: number): { x: number; y: number }[] {
  if (n <= 0) return [];
  const perRow = Math.max(2, Math.ceil(Math.sqrt(n * 1.6)));
  const rows = Math.ceil(n / perRow);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow);
    const c = i % perRow;
    const inRow = Math.min(perRow, n - r * perRow);
    /* rows run back-to-front so nearer characters overlap further ones */
    const ty = rows === 1 ? 0.62 : r / (rows - 1);
    const tx = inRow === 1 ? 0.5 : c / (inRow - 1);
    /* stagger alternate rows so nobody hides directly behind anybody */
    const jitter = r % 2 ? 0.5 / inRow : 0;
    out.push({
      x: zone.x0 + (zone.x1 - zone.x0) * Math.min(0.96, tx * 0.86 + 0.07 + jitter),
      y: zone.y0 + (zone.y1 - zone.y0) * ty,
    });
  }
  return out;
}

interface Body {
  home: { x: number; y: number };
  pos: { x: number; y: number };
  target: { x: number; y: number };
  /** seconds the current move should take */
  dur: number;
  flip: boolean;
}

/* --------------------------------------------------------------- sprite */
function Character({
  src,
  body,
  scale,
  label,
  color,
  tired,
  working,
  energy,
  resting,
  pulse,
  onClick,
  bobDelay,
}: {
  src: string;
  body: Body;
  scale: number;
  label: string;
  color: string;
  tired?: boolean;
  working?: boolean;
  energy?: number;
  resting?: boolean;
  pulse?: { points: number; type: string; nonce: number };
  onClick?: () => void;
  bobDelay: number;
}) {
  /* WotL-style toddle: while a move is in flight the sprite rocks foot to
     foot; standing still it settles back into the idle breathing bob */
  const [stepping, setStepping] = useState(false);
  /* sprite art may not be generated yet — fall back to a colored token */
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (body.dur <= 0) return;
    setStepping(true);
    const t = window.setTimeout(() => setStepping(false), body.dur * 1000);
    return () => window.clearTimeout(t);
  }, [body.target.x, body.target.y, body.dur]);

  /* nearer the camera = larger, and drawn on top */
  const depth = Math.max(0, Math.min(1, (body.pos.y - 55) / 40));
  const h = scale * (0.82 + depth * 0.36);

  return (
    <button
      onClick={onClick}
      className="group absolute block cursor-pointer border-0 bg-transparent p-0 outline-none"
      style={{
        left: `${body.pos.x}%`,
        top: `${body.pos.y}%`,
        height: `${h}%`,
        zIndex: 20 + Math.round(body.pos.y * 4),
        transform: "translate(-50%, -100%)",
        transition: `left ${body.dur}s linear, top ${body.dur}s linear`,
      }}
    >
      {/* contact shadow */}
      <span
        aria-hidden
        className="absolute left-1/2 bottom-0 -z-10 block rounded-[50%] bg-abyss/60 blur-[3px]"
        style={{
          width: "68%",
          height: "8%",
          transform: "translate(-50%, 42%)",
        }}
      />

      <span
        className={stepping ? "block h-full anim-waddle" : "block h-full anim-bob"}
        style={{ animationDelay: stepping ? "0ms" : `${bobDelay}ms` }}
      >
        {err ? (
          <span
            aria-hidden
            className="mx-auto block h-full aspect-square rounded-full"
            style={{
              background: `radial-gradient(circle at 35% 30%, ${color}, ${color}66)`,
              boxShadow: "0 6px 10px rgba(8,6,20,.55)",
            }}
          />
        ) : (
          <img
            src={src}
            alt={label}
            draggable={false}
            onError={() => setErr(true)}
            className="h-full w-auto select-none drop-shadow-[0_6px_10px_rgba(8,6,20,.55)]"
            style={{
              transform: body.flip ? "scaleX(-1)" : undefined,
              filter: tired
                ? "saturate(.55) brightness(.82) contrast(1.02)"
                : "saturate(1.04) contrast(1.03)",
            }}
          />
        )}
      </span>

      {working && (
        <>
          {/* compact production desk: monitor, stand and drawing tablet — no faux laptop/SVG */}
          <span className="pointer-events-none absolute bottom-[1%] left-1/2 z-20 block h-[10%] w-[94%] -translate-x-1/2 rounded-[3px] border border-[#8a6248]/70 bg-[#674630] shadow-[0_5px_12px_rgba(0,0,0,.45)]" />
          <span className="pointer-events-none absolute bottom-[10%] left-[51%] z-10 block h-[20%] w-[49%] -translate-x-1/2 rounded-[3px] border border-paper/20 bg-[#17182a] shadow-[0_0_10px_rgba(59,225,255,.16)]">
            <span className="absolute inset-[10%] overflow-hidden rounded-[2px] bg-[#252844]">
              <span className="absolute left-[8%] right-[8%] top-[18%] h-[8%] rounded bg-cyanx/65" />
              <span className="absolute left-[8%] right-[25%] top-[40%] h-[7%] rounded bg-neon/55" />
              <span className="absolute bottom-[18%] left-[8%] right-[12%] h-[6%] rounded bg-gold/45" />
            </span>
          </span>
          <span className="pointer-events-none absolute bottom-[7%] left-1/2 z-20 block h-[5%] w-[5%] -translate-x-1/2 bg-paper/25" />
          <span className="pointer-events-none absolute bottom-[3%] left-[48%] z-30 block h-[4%] w-[34%] -translate-x-1/2 -skew-x-6 rounded-[2px] border border-paper/10 bg-[#222235]" />
        </>
      )}
      {energy !== undefined && (
        <span className="pointer-events-none absolute -top-[5%] left-1/2 z-40 block w-[74%] -translate-x-1/2">
          <span className="mb-[2px] flex items-center justify-between text-[7px] font-extrabold text-paper/70"><span>{resting ? "RECOVERING" : working ? "ENERGY" : "REST"}</span><span>{Math.round(energy)}%</span></span>
          <span className="block h-[5px] overflow-hidden rounded-full border border-paper/20 bg-abyss/90"><span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, energy))}%`, background: energy < 25 ? "#ff4d6d" : energy < 55 ? "#ffd166" : "#73f2b5" }} /></span>
        </span>
      )}
      {pulse && (
        <span key={pulse.nonce} className="pointer-events-none absolute -top-[20%] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-full border border-gold/50 bg-abyss/95 px-2 py-1 font-display text-[10px] font-extrabold text-gold shadow-xl anim-floaty">
          +{pulse.points} {pulse.type.toUpperCase()}
        </span>
      )}

      {/* tired wisp */}
      {tired && (
        <span className="pointer-events-none absolute -top-1 left-[62%] text-[10px] font-bold text-cyanx/80 anim-floaty">
          {resting ? "☕" : "z"}
        </span>
      )}

      {/* nameplate on hover / focus */}
      <span
        className="pointer-events-none absolute left-1/2 top-full mt-0.5 -translate-x-1/2 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[9px] font-bold opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100"
        style={{
          borderColor: `${color}88`,
          background: "rgba(12,9,28,.88)",
          color,
        }}
      >
        {label}
      </span>
    </button>
  );
}

/* ---------------------------------------------------------------- scene */
export default function OfficeScene({
  level,
  boss,
  staff,
  maxStaff,
  timeOfDay,
  onDeskClick,
}: {
  level: number;
  boss: OfficeStaff;
  staff: OfficeStaff[];
  maxStaff: number;
  /** 0..1 fraction of the in-game day */
  timeOfDay: number;
  onDeskClick?: (deskIndex: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stage, setStage] = useState({ w: 0, h: 0, left: 0, top: 0 });

  const lvl = Math.max(0, Math.min(SCENES.length - 1, level));
  const zone = FLOORS[lvl];

  /* everyone on screen: the showrunner first, then hired staff */
  const cast = useMemo(
    () => [{ ...boss, boss: true }, ...staff.map((s) => ({ ...s, boss: false }))],
    [boss, staff]
  );

  /* --------------------------------------------------- stage measurement */
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => {
      const { width: cw, height: ch } = el.getBoundingClientRect();
      if (!cw || !ch) return;
      /* cover: fill the box, overflow the excess axis */
      const scale = Math.max(cw / STAGE_AR, ch);
      const w = scale * STAGE_AR;
      const h = scale;
      setStage({ w, h, left: (cw - w) / 2, top: (ch - h) / 2 });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ------------------------------------------------------------ movement */
  const [bodies, setBodies] = useState<Body[]>([]);
  const bodiesRef = useRef<Body[]>([]);
  bodiesRef.current = bodies;

  /* rebuild anchors whenever the cast size or the room changes */
  useEffect(() => {
    const spots = anchors(zone, Math.max(cast.length, Math.min(maxStaff + 1, 13)));
    setBodies((prev) =>
      cast.map((_, i) => {
        const home = spots[i] ?? spots[spots.length - 1] ?? { x: 50, y: 80 };
        const old = prev[i];
        return old
          ? { ...old, home }
          : { home, pos: { ...home }, target: { ...home }, dur: 0, flip: i % 2 === 1 };
      })
    );
  }, [cast.length, maxStaff, lvl]); // eslint-disable-line react-hooks/exhaustive-deps

  /* employees who finish recovering walk straight back to their workstation */
  useEffect(() => {
    setBodies((prev) => prev.map((b, i) => {
      if (!cast[i]?.working) return b;
      const dist = Math.hypot(b.home.x - b.pos.x, b.home.y - b.pos.y);
      if (dist < 0.6) return b;
      return { ...b, target: { ...b.home }, pos: { ...b.home }, dur: Math.max(1.2, dist / 5.5), flip: b.home.x < b.pos.x };
    }));
  }, [cast.map((c) => !!c.working).join("|")]); // eslint-disable-line react-hooks/exhaustive-deps

  /* every so often somebody wanders off and comes back */
  useEffect(() => {
    if (!bodies.length) return;
    const tick = window.setInterval(() => {
      const list = bodiesRef.current;
      if (!list.length) return;
      const resters = list.map((_, i) => i).filter((i) => !!cast[i]?.resting);
      const movable = resters.length ? resters : list.map((_, i) => i).filter((i) => !cast[i]?.working);
      if (!movable.length) return;
      if (!resters.length && Math.random() < 0.45) return;
      const picked = new Set<number>();
      const moves = resters.length ? Math.min(2, movable.length) : 1;
      while (picked.size < moves) picked.add(movable[Math.floor(Math.random() * movable.length)]);
      setBodies((prev) =>
        prev.map((b, j) => {
          if (!picked.has(j)) return b;
          const recovering = !!cast[j]?.resting;
          const atHome = Math.abs(b.pos.x - b.home.x) < 0.6 && Math.abs(b.pos.y - b.home.y) < 0.6;
          const to = recovering || atHome
            ? {
                x: zone.x0 + Math.random() * (zone.x1 - zone.x0),
                y: zone.y0 + Math.random() * (zone.y1 - zone.y0),
              }
            : { ...b.home };
          const dist = Math.hypot(to.x - b.pos.x, to.y - b.pos.y);
          return {
            ...b,
            target: to,
            pos: to,
            dur: recovering ? Math.max(0.75, dist / 8) : Math.max(1.4, dist / 5.5),
            flip: to.x < b.pos.x,
          };
        })
      );
    }, 1150);
    return () => window.clearInterval(tick);
  }, [bodies.length, zone, cast]);

  /* --------------------------------------------------------------- light */
  /* 0 = dawn, .5 = midday, 1 = night — warms up at noon, goes indigo at night */
  const night = Math.abs(timeOfDay - 0.5) * 2;
  const warm = 1 - night;

  return (
    <div ref={wrapRef} className="relative isolate min-h-0 w-full flex-1 overflow-hidden bg-abyss">
      <div
        className="absolute"
        style={{ width: stage.w, height: stage.h, left: stage.left, top: stage.top }}
      >
        {/* painted backdrop */}
        <img
          src={SCENES[lvl]}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full select-none object-cover"
          style={{
            filter: `saturate(${(1 + warm * 0.12).toFixed(3)}) brightness(${(0.82 + warm * 0.26).toFixed(3)})`,
          }}
        />

        {/* time-of-day wash */}
        <div
          className="pointer-events-none absolute inset-0 mix-blend-soft-light"
          style={{
            background: `linear-gradient(180deg, rgba(94,60,180,${0.5 * night}) 0%, rgba(255,196,120,${0.34 * warm}) 55%, rgba(20,12,44,${0.42 * night}) 100%)`,
          }}
        />

        {/* lamp bloom near the desks */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(60% 45% at 62% 42%, rgba(255,196,120,${0.16 + 0.16 * night}) 0%, transparent 70%)`,
          }}
        />

        {/* characters */}
        {bodies.map((b, i) => {
          const c = cast[i];
          if (!c) return null;
          return (
            <Character
              key={`${c.name}-${i}`}
              src={c.boss ? (c.sprite ?? BOSS_SPRITE) : SPRITES[(c.look ?? (i - 1)) % SPRITES.length]}
              body={b}
              scale={SPRITE_H[lvl] * 100}
              label={c.boss ? `${c.name} · showrunner` : c.name}
              color={c.color}
              tired={c.tired}
              working={c.working}
              energy={c.energy}
              resting={c.resting}
              pulse={c.pulse}
              bobDelay={i * 370}
              onClick={() => onDeskClick?.(i)}
            />
          );
        })}

        {/* vignette keeps the painted edges from fighting the HUD */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 90% at 50% 45%, transparent 42%, rgba(9,7,22,.55) 100%)",
          }}
        />
      </div>

      {/* empty-desk hint */}
      {staff.length < maxStaff && (
        <button
          onClick={() => onDeskClick?.(-1)}
          className="anim-pop absolute bottom-2 right-2 z-[400] rounded-lg border border-cyanx/50 bg-abyss/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-cyanx backdrop-blur-sm hover:border-cyanx"
        >
          {maxStaff - staff.length} DESK{maxStaff - staff.length > 1 ? "S" : ""} FREE
        </button>
      )}
    </div>
  );
}
