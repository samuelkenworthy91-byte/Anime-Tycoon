import { useEffect, useImperativeHandle, useRef, type Ref } from "react";
import { sfx } from "../engine/audio";
import { useFx } from "../fx/fx";
import { POINT_COLOR, WORKER_LOOKS, BOSS_LOOK, type PointType } from "../engine/data";

export interface FloorDesk {
  name: string;
  skill: number;
  type: PointType;
  isBoss?: boolean;
  /** WORKER_LOOKS index; picks both the desk sprite and the bubble face.
      The boss (showrunner) uses their own photo for bubbles. */
  look?: number;
  img?: string;
  /** the showrunner's own painted office sprite (falls back to BOSS_LOOK) */
  sprite?: string;
}

export interface FloorTotals {
  story: number;
  art: number;
  sound: number;
  issues: number;
  squashed: number;
  best: number;
  collected: number;
  missed: number;
}

export interface FloorHandle {
  crunch: () => void;
}

interface Bubble {
  x: number;
  y: number;
  vy: number;
  r: number;
  kind: PointType | "bug" | "star";
  value: number;
  desk: number;
  born: number;
  wob: number;
  dead: boolean;
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}
interface Float {
  x: number;
  y: number;
  txt: string;
  color: string;
  t0: number;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7"];

export default function ProductionFloor({
  desks,
  duration,
  focus,
  spawnMult,
  lifeMult,
  bugRate,
  paused,
  onProgress,
  onDone,
  handleRef,
  debugMode,
}: {
  desks: FloorDesk[];
  duration: number;
  focus: PointType;
  spawnMult: number;
  lifeMult: number;
  bugRate: number;
  paused: boolean;
  onProgress?: (t: FloorTotals, pct: number) => void;
  onDone: (t: FloorTotals) => void;
  handleRef?: Ref<FloorHandle>;
  debugMode?: boolean;
}) {
  const { shake } = useFx();
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const crunchRef = useRef(0);

  useImperativeHandle(handleRef, () => ({
    crunch: () => {
      crunchRef.current = performance.now() + 6000;
      sfx.phase();
    },
  }));

  const st = useRef({
    elapsed: 0,
    last: 0,
    bubbles: [] as Bubble[],
    parts: [] as Particle[],
    floats: [] as Float[],
    nextSpawn: [] as number[],
    combo: 0,
    comboT: 0,
    totals: { story: 0, art: 0, sound: 0, issues: 0, squashed: 0, best: 0, collected: 0, missed: 0 } as FloorTotals,
    done: false,
    w: 320,
    h: 320,
    raf: 0,
    flash: 0,
    bg: null as HTMLImageElement | null,
    face: null as HTMLImageElement | null,
    _portraits: [] as HTMLImageElement[],
    _sprites: [] as HTMLImageElement[],
  });

  useEffect(() => {
    const s = st.current;
    s.elapsed = 0;
    s.last = 0;
    s.bubbles = [];
    s.parts = [];
    s.floats = [];
    s.combo = 0;
    s.done = false;
    s.totals = { story: 0, art: 0, sound: 0, issues: 0, squashed: 0, best: 0, collected: 0, missed: 0 };
    /* desks come to life at scattered moments — a studio floor is not a
       metronome, and nobody's first bubble should arrive on a schedule */
    s.nextSpawn = desks.map((_, i) => 450 + i * 150 + Math.random() * 900);

    const canvas = canvasRef.current!;
    const g = canvas.getContext("2d")!;
    const box = boxRef.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      s.w = box.clientWidth;
      s.h = box.clientHeight;
      canvas.width = s.w * dpr;
      canvas.height = s.h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    /* background environment art */
    const bg = new Image();
    bg.src = "img/scene-floor.jpg";
    s.bg = bg;

    /* painted HD-2D worker sprites, drawn seated behind each desk; one per
       look, with the showrunner's model appended at the end */
    const boss = desks.find((d) => d.isBoss);
    s._sprites = [...WORKER_LOOKS.map((l) => l.sprite), boss?.sprite || BOSS_LOOK.sprite].map((src) => {
      const im = new Image();
      im.src = src;
      return im;
    });

    /* showrunner portrait is the player avatar */
    const face = new Image();
    if (boss?.img) face.src = boss.img;
    s.face = face;

    const deskX = (i: number) => (s.w / desks.length) * (i + 0.5);
    const deskY = () => s.h - 74;

    const pop = (b: Bubble) => {
      b.dead = true;
      const t = s.totals;
      if (b.kind === "bug") {
        t.squashed++;
        sfx.hit(0);
        shake(2);
        s.floats.push({ x: b.x, y: b.y, txt: "FIXED", color: "#ff5e5e", t0: s.elapsed });
        for (let i = 0; i < 8; i++)
          s.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 1, color: "#ff5e5e", size: 2 + Math.random() * 3 });
        return;
      }
      const now = s.elapsed;
      s.combo = now - s.comboT < 1600 ? s.combo + 1 : 1;
      s.comboT = now;
      t.best = Math.max(t.best, s.combo);
      const mult = 1 + Math.floor(Math.min(s.combo, 20) / 5) * 0.25;
      const gained = Math.round(b.value * mult);
      const key = (b.kind === "star" ? focus : b.kind) as PointType;
      t[key] += gained;
      t.collected++;
      if (b.kind === "star") {
        sfx.perfect(s.combo);
        shake(6);
        s.flash = 1;
        for (let i = 0; i < 22; i++)
          s.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 9 - 1, life: 1, color: Math.random() < 0.5 ? "#ffd166" : "#fff", size: 2 + Math.random() * 5 });
      } else {
        sfx.hit(s.combo);
        shake(1.2);
        for (let i = 0; i < 9; i++)
          s.parts.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 6, life: 1, color: POINT_COLOR[key], size: 2 + Math.random() * 3.5 });
      }
      s.floats.push({
        x: b.x,
        y: b.y,
        txt: `+${gained}${s.combo >= 5 ? ` ×${mult.toFixed(2).replace(/0$/, "")}` : ""}`,
        color: b.kind === "star" ? "#ffd166" : POINT_COLOR[key],
        t0: s.elapsed,
      });
    };

    const hitTest = (px: number, py: number) => {
      let best: Bubble | null = null;
      let bestD = Infinity;
      for (const b of s.bubbles) {
        if (b.dead) continue;
        const d = Math.hypot(b.x - px, b.y - py);
        if (d < b.r + 16 && d < bestD) {
          bestD = d;
          best = b;
        }
      }
      if (best) pop(best);
      else sfx.type();
    };

    const popDesk = (i: number) => {
      const candidates = s.bubbles.filter((b) => !b.dead && b.desk === i);
      if (!candidates.length) return;
      candidates.sort((a, b) => a.y - b.y);
      pop(candidates[0]);
    };

    const onKey = (e: KeyboardEvent) => {
      if (pausedRef.current || s.done) return;
      const k = e.key.toLowerCase();
      const idx = KEYS.indexOf(k);
      if (idx >= 0 && idx < desks.length) {
        e.preventDefault();
        popDesk(idx);
      } else if (k === " " || k === "f" || k === "j") {
        e.preventDefault();
        const alive = s.bubbles.filter((b) => !b.dead);
        if (!alive.length) return;
        alive.sort((a, b) => (a.kind === "star" ? -1 : b.kind === "star" ? 1 : a.y - b.y));
        pop(alive[0]);
      }
    };
    window.addEventListener("keydown", onKey);

    const onPointer = (e: PointerEvent) => {
      if (pausedRef.current || s.done) return;
      const rect = canvas.getBoundingClientRect();
      hitTest(e.clientX - rect.left, e.clientY - rect.top);
    };
    canvas.addEventListener("pointerdown", onPointer);

    const spawn = (i: number, now: number) => {
      const d = desks[i];
      const crunching = now < crunchRef.current;
      const roll = Math.random();
      let kind: Bubble["kind"];
      if (debugMode) kind = roll < 0.72 ? "bug" : (["story", "art", "sound"] as PointType[])[Math.floor(Math.random() * 3)];
      else if (roll < bugRate * (crunching ? 1.9 : 1)) kind = "bug";
      else if (roll < bugRate + 0.05) kind = "star";
      else if (roll < bugRate + 0.05 + 0.62) kind = focus;
      else kind = d.type;
      /* talent pays: a veteran's work is worth more than a junior's —
         no more flat "everything is exactly +3" on the floor */
      const value =
        kind === "star"
          ? 10
          : kind === "bug"
            ? 0
            : Math.min(8, 1 + Math.floor(d.skill / 20) + (kind === focus ? 1 : 0));
      s.bubbles.push({
        x: deskX(i) + (Math.random() - 0.5) * 26,
        y: deskY() - 10,
        vy: -(0.42 + Math.random() * 0.16) / lifeMult,
        r: kind === "star" ? 24 : 18,
        kind,
        value,
        desk: i,
        born: s.elapsed,
        wob: Math.random() * 6.28,
        dead: false,
      });
      /* …and talent *produces* more often: skill pulls a desk's rhythm from
         ~2.4s down to ~0.7s per bubble, with a wide organic jitter */
      const rate = Math.max(650, 2700 - Math.min(1980, d.skill * 22)) / (spawnMult * (crunching ? 2.1 : 1));
      s.nextSpawn[i] = s.elapsed + rate * (0.55 + Math.random() * 0.9);
    };

    const draw = () => {
      const now = performance.now();
      const dt = s.last ? Math.min(48, now - s.last) : 16;
      s.last = now;
      if (!pausedRef.current && !s.done) s.elapsed += dt;
      const e = s.elapsed;
      const crunching = now < crunchRef.current;

      if (!pausedRef.current && !s.done) {
        desks.forEach((_, i) => {
          if (e >= s.nextSpawn[i]) spawn(i, now);
        });
      }

      /* physics */
      for (const b of s.bubbles) {
        if (b.dead) continue;
        if (!pausedRef.current && !s.done) {
          b.y += b.vy * dt * 0.36;
          b.wob += dt * 0.004;
        }
        if (b.y < 46) {
          b.dead = true;
          if (b.kind === "bug") {
            s.totals.issues++;
            sfx.miss();
            shake(4);
            s.floats.push({ x: b.x, y: 54, txt: "EDITING NOTE!", color: "#ff4d4d", t0: e });
          } else {
            s.totals.missed++;
            s.combo = 0;
          }
        }
      }
      s.bubbles = s.bubbles.filter((b) => !b.dead);

      if (!s.done && e > duration) {
        s.done = true;
        setTimeout(() => onDone({ ...s.totals }), 260);
      }
      onProgress?.({ ...s.totals }, Math.min(1, e / duration));

      /* ---------------- render ---------------- */
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, s.w, s.h);

      /* environment background */
      if (s.bg && s.bg.complete && s.bg.naturalWidth > 0) {
        const ratio = Math.max(s.w / s.bg.width, s.h / s.bg.height);
        const bw = s.bg.width * ratio;
        const bh = s.bg.height * ratio;
        /* soften + darken the backdrop: the painted cast in front of it is the
           focal plane, exactly how the HD-2D scenes stack their layers */
        g.filter = "blur(2.5px) brightness(.62) saturate(.9)";
        g.drawImage(s.bg, (s.w - bw) / 2, (s.h - bh) / 2, bw, bh);
        g.filter = "none";
      } else {
        const wall = g.createLinearGradient(0, 0, 0, s.h);
        wall.addColorStop(0, "#171226");
        wall.addColorStop(0.62, "#1e1733");
        wall.addColorStop(0.63, "#2a1f47");
        wall.addColorStop(1, "#160f2a");
        g.fillStyle = wall;
        g.fillRect(0, 0, s.w, s.h);
      }
      /* darken the top band so bubbles read clearly */
      const shade = g.createLinearGradient(0, 0, 0, 120);
      shade.addColorStop(0, "rgba(6,5,14,.72)");
      shade.addColorStop(1, "rgba(6,5,14,0)");
      g.fillStyle = shade;
      g.fillRect(0, 0, s.w, 120);

      if (crunching) {
        g.fillStyle = `rgba(255,77,141,${0.06 + Math.sin(now / 90) * 0.03})`;
        g.fillRect(0, 0, s.w, s.h);
      }

      /* danger line */
      g.strokeStyle = "rgba(255,77,141,.35)";
      g.setLineDash([7, 7]);
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(0, 46);
      g.lineTo(s.w, 46);
      g.stroke();
      g.setLineDash([]);

      /* desks + chibi staff */
      const dy = deskY();
      desks.forEach((d, i) => {
        const x = deskX(i);
        const w = Math.min(96, (s.w / desks.length) * 0.82);
        /* painted worker, seated: the desk slab and monitor overlap the legs */
        const spriteList = s._sprites;
        const spr = d.isBoss
          ? spriteList[WORKER_LOOKS.length]
          : spriteList[(d.look ?? i) % WORKER_LOOKS.length];
        if (spr && spr.complete && spr.naturalWidth > 0) {
          /* show the upper body only — cropped at the waist so they read as
             sitting rather than floating above the desk */
          const sh = 156;
          const sw = (spr.naturalWidth / spr.naturalHeight) * sh;
          const crop = 0.62; // top 62% of the sprite — cut at the waist
          g.save();
          g.beginPath();
          g.rect(x - sw / 2 - 6, dy - 98, sw + 12, 120);
          g.clip();
          g.shadowColor = "rgba(6,5,16,.7)";
          g.shadowBlur = 10;
          g.shadowOffsetY = 4;
          g.drawImage(
            spr,
            0,
            0,
            spr.naturalWidth,
            spr.naturalHeight * crop,
            x - sw / 2,
            dy - 98,
            sw,
            sh * crop
          );
          g.restore();
          g.shadowBlur = 0;
          g.shadowOffsetY = 0;
        } else {
          /* fallback while the art loads */
          g.fillStyle = d.isBoss ? "#ffd166" : "#7af0ff";
          g.beginPath();
          g.arc(x, dy - 26, 12, Math.PI, 0);
          g.fill();
          g.fillStyle = "#ffd9b8";
          g.fillRect(x - 9, dy - 26, 18, 13);
        }

        /* monitor */
        g.fillStyle = "#0a0812";
        g.beginPath();
        g.roundRect(x - 20, dy - 4, 40, 20, 4);
        g.fill();
        g.strokeStyle = "rgba(120,100,220,.5)";
        g.lineWidth = 1;
        g.stroke();
        for (let bI = 0; bI < 4; bI++) {
          const hgt = 5 + Math.abs(Math.sin(now / 240 + bI + i)) * 14;
          g.fillStyle = POINT_COLOR[d.type];
          g.globalAlpha = 0.85;
          g.fillRect(x - 24 + bI * 12, dy + 18 - hgt, 8, hgt);
        }
        g.globalAlpha = 1;

        /* desk slab */
        const slab = g.createLinearGradient(0, dy + 22, 0, dy + 36);
        slab.addColorStop(0, "#8a5a3b");
        slab.addColorStop(1, "#5e3b24");
        g.fillStyle = slab;
        g.beginPath();
        g.roundRect(x - w / 2, dy + 16, w, 10, 3);
        g.fill();

        /* label + hotkey */
        g.fillStyle = "rgba(242,236,223,.75)";
        g.font = `700 10px "Space Grotesk", sans-serif`;
        g.textAlign = "center";
        g.fillText(d.name.slice(0, 10), x, dy + 40);
        if (i < KEYS.length) {
          g.fillStyle = "rgba(10,8,18,.85)";
          g.beginPath();
          g.roundRect(x - 8, dy + 45, 16, 14, 4);
          g.fill();
          g.strokeStyle = POINT_COLOR[d.type];
          g.lineWidth = 1;
          g.stroke();
          g.fillStyle = POINT_COLOR[d.type];
          g.font = `700 9px "Space Grotesk", sans-serif`;
          g.fillText(KEYS[i], x, dy + 55);
        }
      });

      /* bubbles */
      for (const b of s.bubbles) {
        const wobX = Math.sin(b.wob) * 7;
        const px = b.x + wobX;
        const grow = Math.min(1, (e - b.born) / 180);
        const r = b.r * (0.6 + grow * 0.4);
        const col = b.kind === "bug" ? "#ff4d4d" : b.kind === "star" ? "#ffd166" : POINT_COLOR[b.kind];
        /* bubble body */
        g.beginPath();
        g.arc(px, b.y, r, 0, Math.PI * 2);
        const rg = g.createRadialGradient(px - r * 0.35, b.y - r * 0.4, r * 0.15, px, b.y, r);
        rg.addColorStop(0, "#ffffff");
        rg.addColorStop(0.42, col);
        rg.addColorStop(1, b.kind === "bug" ? "#5c0f1c" : "#1b1430");
        g.fillStyle = rg;
        g.shadowColor = col;
        g.shadowBlur = b.kind === "star" ? 22 : 12;
        g.fill();
        g.shadowBlur = 0;
        g.strokeStyle = "rgba(255,255,255,.7)";
        g.lineWidth = 1.4;
        g.stroke();

        /* the employee face inside the bubble */
        if (b.kind !== "bug") {
          const desk = desks[b.desk];
          const isBoss = desk?.isBoss;
          const look = desk?.look;
          let img: HTMLImageElement | null = null;
          if (isBoss) img = s.face;
          else if (look !== undefined && st.current._portraits[look % WORKER_LOOKS.length]) {
            img = st.current._portraits[look % WORKER_LOOKS.length] ?? null;
          }
          if (img && img.complete && img.naturalWidth > 0) {
            g.save();
            g.beginPath();
            g.arc(px, b.y, r * 0.72, 0, Math.PI * 2);
            g.clip();
            /* portraits are already head-and-shoulders crops of the sprite */
            g.drawImage(img, px - r * 0.8, b.y - r * 0.8, r * 1.6, r * 1.6);
            g.restore();
            g.strokeStyle = "rgba(255,255,255,.75)";
            g.lineWidth = 1.2;
            g.beginPath();
            g.arc(px, b.y, r * 0.72, 0, Math.PI * 2);
            g.stroke();
          } else {
            /* fallback: value number */
            g.fillStyle = "#0a0812";
            g.font = `800 ${b.kind === "star" ? 16 : 13}px "Bricolage Grotesque", sans-serif`;
            g.textAlign = "center";
            g.textBaseline = "middle";
            g.fillText(b.kind === "star" ? "★" : String(b.value), px, b.y + 1);
            g.textBaseline = "alphabetic";
          }
        } else {
          g.fillStyle = "#fff";
          g.font = `800 13px "Bricolage Grotesque", sans-serif`;
          g.textAlign = "center";
          g.textBaseline = "middle";
          g.fillText("!", px, b.y + 1);
          g.textBaseline = "alphabetic";
        }
      }

      /* particles */
      s.parts = s.parts.filter((p) => p.life > 0);
      for (const p of s.parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32;
        p.life -= 0.032;
        g.globalAlpha = Math.max(0, p.life);
        g.fillStyle = p.color;
        g.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      g.globalAlpha = 1;

      /* floating text */
      s.floats = s.floats.filter((f) => e - f.t0 < 720);
      for (const f of s.floats) {
        const k = (e - f.t0) / 720;
        g.globalAlpha = 1 - k;
        g.fillStyle = f.color;
        g.font = `800 ${Math.round(15 + (1 - k) * 5)}px "Bricolage Grotesque", sans-serif`;
        g.textAlign = "center";
        g.shadowColor = f.color;
        g.shadowBlur = 10;
        g.fillText(f.txt, f.x, f.y - 12 - k * 30);
        g.shadowBlur = 0;
      }
      g.globalAlpha = 1;

      /* combo */
      if (s.combo >= 3 && e - s.comboT < 1800) {
        g.textAlign = "center";
        g.fillStyle = s.combo >= 10 ? "#ffd166" : "#f2ecdf";
        g.font = `800 26px "Bricolage Grotesque", sans-serif`;
        g.shadowColor = "#ff4d8d";
        g.shadowBlur = s.combo >= 10 ? 16 : 0;
        g.fillText(`${s.combo} CHAIN`, s.w / 2, 76);
        g.shadowBlur = 0;
      }

      if (s.flash > 0) {
        g.fillStyle = `rgba(255,255,255,${s.flash * 0.35})`;
        g.fillRect(0, 0, s.w, s.h);
        s.flash -= 0.08;
      }

      /* progress bar */
      const pct = Math.min(1, e / duration);
      g.fillStyle = "rgba(255,255,255,.1)";
      g.fillRect(12, 14, s.w - 24, 6);
      g.fillStyle = crunching ? "#ffd166" : "#ff4d8d";
      g.fillRect(12, 14, (s.w - 24) * pct, 6);

      s.raf = requestAnimationFrame(draw);
    };
    s.raf = requestAnimationFrame(draw);

    /* preload the matching worker portraits for the point bubbles */
    st.current._portraits = WORKER_LOOKS.map((l) => {
      const im = new Image();
      im.src = l.portrait;
      return im;
    });

    return () => {
      cancelAnimationFrame(s.raf);
      window.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onPointer);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desks, duration, focus, spawnMult, lifeMult, bugRate, debugMode]);

  return (
    <div ref={boxRef} className="relative h-full w-full touch-none overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
