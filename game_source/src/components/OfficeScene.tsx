import { useEffect, useRef } from "react";

export interface OfficeStaff {
  name: string;
  color: string;
  tired?: boolean;
}

type SpotKind = "coffee" | "water" | "snack" | "pong" | "plant" | "board";

interface Spot {
  gx: number;
  gy: number;
  kind: SpotKind;
}

interface Walker {
  desk: number;
  /** float grid coords */
  gx: number;
  gy: number;
  homeGX: number;
  homeGY: number;
  state: "seated" | "walk" | "pause";
  target: { gx: number; gy: number } | null;
  t: number;
  next: number;
  /** 0 = S (toward camera), 1 = E, 2 = N, 3 = W */
  face: 0 | 1 | 2 | 3;
  frame: number;
}

interface Desk {
  gx: number;
  gy: number;
  /** display-space hit box, refreshed each layout */
  hx: number;
  hy: number;
  hw: number;
  hh: number;
}

/* ------------------------------------------------------------ palettes */
/* Deliberately limited, HD-2D style ramps: deep indigo shadows, warm lamps. */
const PAL = {
  outline: "#161226",
  floorA: ["#4b3f63", "#574a72", "#3f3556"],
  floorB: ["#443a5b", "#4f4368", "#392f4e"],
  grout: "#2b2340",
  rug: ["#7a3f63", "#3f5c7a", "#6a4a86"],
  wall: ["#3b3355", "#453c63", "#332c4c"],
  wallDark: "#2a2440",
  wallTrim: "#5d5182",
  deskTop: ["#8a6244", "#9a6f4d", "#6f5aa0"],
  deskSide: ["#63432e", "#6f4c35", "#4e3d75"],
  deskFace: ["#4c3324", "#573a29", "#3c2f5c",],
  skin: ["#f0c9a4", "#d9a273", "#b47a4f", "#8a5636"],
  hair: ["#2a2035", "#4b2e22", "#6b4a2c", "#8f8a9c", "#3c2a4d"],
  metal: "#6f6a8c",
  glass: "#8fd6ff",
  plant: ["#3d7a52", "#2c5c3c"],
  lamp: "#ffd08a",
};

/** back wall height, in tiles */
const WALL_T = 5.2;
/** how far behind the desk a seated worker sits, in cells */
const SEAT_OFF = 0.62;

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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const st = useRef({
    raf: 0,
    /* display size in CSS px */
    w: 320,
    h: 320,
    /* low-res buffer */
    buf: null as HTMLCanvasElement | null,
    bg: null as CanvasRenderingContext2D | null,
    pw: 320,
    ph: 240,
    scale: 2,
    /* iso grid */
    GW: 8,
    GH: 6,
    TW: 28,
    TH: 14,
    ox: 160,
    oy: 60,
    desks: [] as Desk[],
    walkers: [] as Walker[],
    spots: [] as Spot[],
  });

  const latest = useRef({ level, boss, staff, maxStaff, timeOfDay, onDeskClick });
  latest.current = { level, boss, staff, maxStaff, timeOfDay, onDeskClick };

  /* ------------------------------------------------------------- layout */
  const layout = () => {
    const s = st.current;
    const lv = Math.max(0, Math.min(3, latest.current.level));
    const n = latest.current.maxStaff + 1;

    /* desk grid: 2 cells apart so sprites have aisles to walk down */
    const cols = n <= 2 ? 2 : n <= 6 ? 3 : n <= 12 ? 4 : 5;
    const rows = Math.max(1, Math.ceil(n / cols));

    /* room footprint: desk block + a margin ring for amenities + walkways */
    s.GW = cols * 2 + 3;
    s.GH = rows * 2 + 3;

    /* fit the whole diamond AND the back walls inside the buffer */
    const spanCells = s.GW + s.GH;
    const tw = Math.floor((s.pw * 0.96 * 2) / spanCells);
    /* wall height is WALL_T tiles; total vertical = wallH + floor depth */
    const twByH = Math.floor((s.ph * 0.95) / (WALL_T / 2 + spanCells / 4));
    s.TW = Math.max(10, Math.min(44, Math.min(tw, twByH)));
    s.TH = Math.max(5, Math.round(s.TW / 2));

    /* centre the whole room (walls + floor) in the buffer */
    const wallH = s.TH * WALL_T;
    const sceneH = wallH + (spanCells * s.TH) / 2;
    s.ox = Math.round(s.pw / 2 + ((s.GH - s.GW) * s.TW) / 4);
    s.oy = Math.round(Math.max(wallH + 2, (s.ph - sceneH) / 2 + wallH));

    const desks: Desk[] = [];
    for (let i = 0; i < n; i++) {
      const c = i % cols;
      const r = Math.floor(i / cols);
      const gx = 1.5 + c * 2;
      const gy = 1.5 + r * 2;
      const p = iso(gx, gy);
      desks.push({
        gx,
        gy,
        hx: p.x * s.scale,
        hy: p.y * s.scale,
        hw: s.TW * 1.6 * s.scale,
        hh: s.TH * 3 * s.scale,
      });
    }
    s.desks = desks;

    /* amenities live around the edge of the room */
    const spots: Spot[] = [
      { gx: 0.5, gy: s.GH - 1.5, kind: "water" },
      { gx: s.GW - 1.5, gy: 0.5, kind: "coffee" },
      { gx: s.GW - 1.5, gy: s.GH - 1.5, kind: "plant" },
      { gx: 0.5, gy: 0.5, kind: "board" },
    ];
    if (lv >= 2) spots.push({ gx: s.GW - 1.5, gy: s.GH - 3.5, kind: "snack" });
    if (lv >= 3) spots.push({ gx: 0.5, gy: s.GH - 3.5, kind: "pong" });
    s.spots = spots;
  };

  const iso = (gx: number, gy: number) => {
    const s = st.current;
    return {
      x: s.ox + (gx - gy) * (s.TW / 2),
      y: s.oy + (gx + gy) * (s.TH / 2),
    };
  };

  const makeWalkers = () => {
    const s = st.current;
    s.walkers = latest.current.staff.map((_, i) => {
      const d = s.desks[i + 1] ?? s.desks[0] ?? { gx: 1.5, gy: 1.5 };
      /* staff stand/sit just in front (camera side) of their desk */
      const hgx = d.gx;
      const hgy = d.gy - SEAT_OFF;
      return {
        desk: i + 1,
        gx: hgx,
        gy: hgy,
        homeGX: hgx,
        homeGY: hgy,
        state: "seated" as const,
        target: null,
        t: Math.random() * 3000,
        next: (7 + Math.random() * 11) * 1000,
        face: 0 as const,
        frame: 0,
      };
    });
  };

  const rebuild = () => {
    layout();
    makeWalkers();
  };

  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, maxStaff, staff.length]);

  /* ------------------------------------------------------ canvas + loop */
  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const s = st.current;

    const buf = document.createElement("canvas");
    const g = buf.getContext("2d")!;
    s.buf = buf;
    s.bg = g;

    const resize = () => {
      s.w = Math.max(1, wrap.clientWidth);
      s.h = Math.max(1, wrap.clientHeight);
      /* integer pixel scale keeps the sprite grid crisp (HD-2D look) */
      s.scale = Math.max(2, Math.min(5, Math.round(Math.min(s.w, s.h) / 150)));
      s.pw = Math.ceil(s.w / s.scale);
      s.ph = Math.ceil(s.h / s.scale);
      buf.width = s.pw;
      buf.height = s.ph;
      canvas.width = Math.round(s.pw * s.scale);
      canvas.height = Math.round(s.ph * s.scale);
      canvas.style.width = `${s.w}px`;
      canvas.style.height = `${s.h}px`;
      ctx.imageSmoothingEnabled = false;
      g.imageSmoothingEnabled = false;
      if (s.pw > 20 && s.ph > 20) rebuild();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
      let best = -1;
      let bestD = Infinity;
      s.desks.forEach((d, i) => {
        const dx = Math.abs(px - d.hx) / (d.hw / 2);
        const dy = Math.abs(py - d.hy) / (d.hh / 2);
        const dist = dx + dy;
        if (dx < 1 && dy < 1 && dist < bestD) {
          bestD = dist;
          best = i;
        }
      });
      if (best >= 0) latest.current.onDeskClick?.(best);
    };
    canvas.addEventListener("pointerdown", onPointer);

    /* ------------------------------------------------------- primitives */
    const px = (x: number, y: number, w: number, h: number, c: string) => {
      g.fillStyle = c;
      g.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    };

    const poly = (pts: [number, number][], c: string) => {
      g.fillStyle = c;
      g.beginPath();
      g.moveTo(Math.round(pts[0][0]), Math.round(pts[0][1]));
      for (let i = 1; i < pts.length; i++) g.lineTo(Math.round(pts[i][0]), Math.round(pts[i][1]));
      g.closePath();
      g.fill();
    };

    /** the four corners of one floor cell, optionally lifted by `up` pixels */
    const corners = (gx: number, gy: number, up = 0, inset = 0) => {
      const a = iso(gx - 0.5 + inset, gy - 0.5 + inset);
      const b = iso(gx + 0.5 - inset, gy - 0.5 + inset);
      const c = iso(gx + 0.5 - inset, gy + 0.5 - inset);
      const d = iso(gx - 0.5 + inset, gy + 0.5 - inset);
      return {
        n: [b.x, b.y - up] as [number, number], // north (top)
        e: [c.x, c.y - up] as [number, number], // east  (right)
        sO: [d.x, d.y - up] as [number, number], // south (bottom)
        w: [a.x, a.y - up] as [number, number], // west  (left)
      };
    };

    /** iso box sitting on cell (gx,gy) */
    const isoBox = (
      gx: number,
      gy: number,
      height: number,
      top: string,
      left: string,
      right: string,
      inset = 0.06
    ) => {
      const lo = corners(gx, gy, 0, inset);
      const hi = corners(gx, gy, height, inset);
      /* left face (west→south) */
      poly([lo.w, lo.sO, hi.sO, hi.w], left);
      /* right face (south→east) */
      poly([lo.sO, lo.e, hi.e, hi.sO], right);
      /* top */
      poly([hi.n, hi.e, hi.sO, hi.w], top);
    };

    /* --------------------------------------------------------- the room */
    const skyRamp = (tod: number): [string, string] => {
      if (tod < 0.2) return ["#ffb36b", "#ff7a5c"];
      if (tod < 0.5) return ["#8fd0ff", "#4a86d6"];
      if (tod < 0.72) return ["#ff9a62", "#7a4a8f"];
      return ["#131e46", "#070b1e"];
    };

    const drawWalls = (tod: number, t: number) => {
      const lv = Math.max(0, Math.min(3, latest.current.level));
      const wallH = Math.round(s.TH * WALL_T);
      const [skyTop, skyBot] = skyRamp(tod);
      const night = tod > 0.72 || tod < 0.08;

      /* --- back-right wall: runs along increasing gx at gy = -0.5 --- */
      const p0 = iso(-0.5, -0.5);
      const p1 = iso(s.GW - 0.5, -0.5);
      poly(
        [
          [p0.x, p0.y - wallH],
          [p1.x, p1.y - wallH],
          [p1.x, p1.y],
          [p0.x, p0.y],
        ],
        PAL.wall[Math.min(2, lv)]
      );
      /* --- back-left wall: runs along increasing gy at gx = -0.5 --- */
      const q1 = iso(-0.5, s.GH - 0.5);
      poly(
        [
          [q1.x, q1.y - wallH],
          [p0.x, p0.y - wallH],
          [p0.x, p0.y],
          [q1.x, q1.y],
        ],
        PAL.wallDark
      );

      /* windows punched into the back-right wall */
      const winCount = Math.max(2, Math.floor(s.GW / 2));
      for (let i = 0; i < winCount; i++) {
        const gA = -0.2 + (i * (s.GW - 0.4)) / winCount;
        const gB = gA + (s.GW - 0.4) / winCount - 0.35;
        const a = iso(gA, -0.5);
        const b = iso(gB, -0.5);
        const top = wallH - Math.round(s.TH * 0.7);
        const bot = Math.round(s.TH * 1.3);
        /* sky */
        const grad = g.createLinearGradient(0, a.y - top, 0, a.y - bot);
        grad.addColorStop(0, skyTop);
        grad.addColorStop(1, skyBot);
        g.fillStyle = grad;
        g.beginPath();
        g.moveTo(Math.round(a.x), Math.round(a.y - top));
        g.lineTo(Math.round(b.x), Math.round(b.y - top));
        g.lineTo(Math.round(b.x), Math.round(b.y - bot));
        g.lineTo(Math.round(a.x), Math.round(a.y - bot));
        g.closePath();
        g.fill();
        /* distant city */
        const cityBase = a.y - bot;
        for (let k = 0; k < 5; k++) {
          const bw = (b.x - a.x) / 5;
          const bh = Math.round(s.TH * (0.7 + ((i * 7 + k * 13) % 9) / 6));
          px(a.x + k * bw + 1, cityBase - bh, bw - 1, bh, night ? "#0d1430" : "#2b3358");
          if (night) {
            for (let wy = 2; wy < bh - 2; wy += 3) {
              if ((i * 5 + k * 3 + wy) % 4 !== 0) px(a.x + k * bw + 2, cityBase - bh + wy, 1, 1, "#ffd166");
            }
          }
        }
        if (night) {
          /* stars */
          for (let k = 0; k < 4; k++) {
            const sx = a.x + 2 + ((k * 11 + i * 5) % Math.max(2, b.x - a.x - 3));
            const sy = a.y - top + 2 + ((k * 7 + i * 3) % Math.max(2, top - bot - 4));
            if (Math.sin(t / 700 + k + i) > -0.2) px(sx, sy, 1, 1, "#ffffff");
          }
        }
        /* frame */
        g.strokeStyle = PAL.wallTrim;
        g.lineWidth = 1;
        g.strokeRect(Math.round(a.x) + 0.5, Math.round(a.y - top) + 0.5, Math.round(b.x - a.x) - 1, top - bot);
      }

      /* wall trim / skirting */
      poly(
        [
          [p0.x, p0.y - 3],
          [p1.x, p1.y - 3],
          [p1.x, p1.y],
          [p0.x, p0.y],
        ],
        PAL.wallTrim
      );
      poly(
        [
          [q1.x, q1.y - 3],
          [p0.x, p0.y - 3],
          [p0.x, p0.y],
          [q1.x, q1.y],
        ],
        "#3d3560"
      );

      /* posters + whiteboard on the left wall */
      for (let i = 0; i < 3; i++) {
        const gA = 1.0 + i * 1.4;
        if (gA > s.GH - 1) break;
        const a = iso(-0.5, gA);
        const b = iso(-0.5, gA + 0.9);
        const top = wallH - Math.round(s.TH * 1.6);
        const bot = top - Math.round(s.TH * 2.2);
        const cols = ["#c74f86", "#4fb4c7", "#c7a44f"];
        poly(
          [
            [a.x, a.y - top],
            [b.x, b.y - top - (b.y - a.y) * 0 - 0],
            [b.x, b.y - bot],
            [a.x, a.y - bot],
          ],
          cols[i % 3]
        );
      }
    };

    const drawFloor = () => {
      const lv = Math.max(0, Math.min(3, latest.current.level));
      for (let gy = 0; gy < s.GH; gy++) {
        for (let gx = 0; gx < s.GW; gx++) {
          const c = corners(gx, gy);
          const checker = (gx + gy) % 2 === 0;
          const base = checker ? PAL.floorA[Math.min(2, lv)] : PAL.floorB[Math.min(2, lv)];
          poly([c.n, c.e, c.sO, c.w], base);
        }
      }
      /* grout lines, drawn once over the top so tiles read as a grid */
      g.strokeStyle = PAL.grout;
      g.lineWidth = 1;
      g.globalAlpha = 0.35;
      for (let gy = 0; gy <= s.GH; gy++) {
        const a = iso(-0.5, gy - 0.5);
        const b = iso(s.GW - 0.5, gy - 0.5);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      for (let gx = 0; gx <= s.GW; gx++) {
        const a = iso(gx - 0.5, -0.5);
        const b = iso(gx - 0.5, s.GH - 0.5);
        g.beginPath();
        g.moveTo(a.x, a.y);
        g.lineTo(b.x, b.y);
        g.stroke();
      }
      g.globalAlpha = 1;

      /* rug in the middle aisle once the studio grows */
      if (lv >= 1) {
        const cx = (s.GW - 1) / 2;
        const cy = s.GH - 1.5;
        g.globalAlpha = 0.35;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -0.5; dy <= 0.5; dy += 1) {
            const c = corners(cx + dx, cy + dy, 0, 0.02);
            poly([c.n, c.e, c.sO, c.w], PAL.rug[Math.min(2, lv - 1)]);
          }
        }
        g.globalAlpha = 1;
      }
    };

    /* ------------------------------------------------------- furniture */
    const drawChair = (d: Desk) => {
      isoBox(d.gx, d.gy - SEAT_OFF - 0.3, Math.round(s.TH * 1.6), "#3a3158", "#241e3c", "#2e2748", 0.3);
    };

    const drawDesk = (d: Desk, occupied: boolean, color: string, boss: boolean, t: number) => {
      const lv = Math.max(0, Math.min(2, latest.current.level));
      const H = Math.round(s.TH * 1.2);

      /* desk body */
      isoBox(
        d.gx,
        d.gy,
        H,
        boss ? "#a4784f" : PAL.deskTop[lv],
        PAL.deskFace[lv],
        PAL.deskSide[lv],
        0.05
      );

      /* monitor, parked on the east half of the desk so faces stay readable */
      const top = corners(d.gx, d.gy, H, 0.05);
      const cx = (top.w[0] + top.e[0]) / 2;
      const cy = (top.n[1] + top.sO[1]) / 2;
      const mw = Math.max(4, Math.round(s.TW * 0.42));
      const mh = Math.max(5, Math.round(s.TH * 1.25));
      const mx = Math.round(cx + s.TW * 0.2);
      const my = Math.round(cy + s.TH * 0.18);
      px(mx - mw / 2 - 1, my - mh - 1, mw + 2, mh + 2, PAL.outline);
      px(mx - mw / 2, my - mh, mw, mh, occupied ? "#101a34" : "#1a1830");
      if (occupied) {
        for (let i = 0; i < 3; i++) {
          const bw = Math.max(1, Math.round(mw / 5));
          const hgt = 1 + Math.abs(Math.sin(t / 320 + i * 1.6 + d.gx)) * (mh - 3);
          px(mx - mw / 2 + 1 + i * (bw + 1), my - 1 - hgt, bw, hgt, color);
        }
      }
      px(mx - 1, my - 1, 2, 2, PAL.metal);

      /* paperwork on the west half */
      px(cx - s.TW * 0.3, cy - 1, Math.max(2, s.TW * 0.16), Math.max(2, s.TH * 0.2), boss ? "#ffd166" : "#d9d2c4");
    };

    const drawSpot = (sp: Spot, t: number) => {
      const th = s.TH;
      const tw = s.TW;
      switch (sp.kind) {
        case "water": {
          /* base cabinet */
          isoBox(sp.gx, sp.gy, Math.round(th * 1.9), "#31567c", "#1c3048", "#254060", 0.32);
          /* the bottle sits on top: a lighter, narrower box */
          const baseY = Math.round(th * 1.9);
          const lo = corners(sp.gx, sp.gy, baseY, 0.36);
          const hi = corners(sp.gx, sp.gy, baseY + Math.round(th * 1.5), 0.36);
          poly([lo.w, lo.sO, hi.sO, hi.w], "#5fb3e0");
          poly([lo.sO, lo.e, hi.e, hi.sO], "#7ccdf5");
          poly([hi.n, hi.e, hi.sO, hi.w], "#a8e4ff");
          break;
        }
        case "coffee": {
          isoBox(sp.gx, sp.gy, Math.round(th * 2.4), "#4a3d63", "#2c2440", "#382e50", 0.28);
          const c = corners(sp.gx, sp.gy, Math.round(th * 1.7), 0.28);
          px(c.w[0] + tw * 0.16, c.w[1] - th * 0.4, tw * 0.22, th * 0.5, "#ffd166");
          if (Math.sin(t / 400) > 0) px(c.w[0] + tw * 0.2, c.w[1] - th * 1.4, 1, 2, "#ff6b6b");
          break;
        }
        case "snack": {
          isoBox(sp.gx, sp.gy, Math.round(th * 2.6), "#232a45", "#161c31", "#1d2439", 0.26);
          const c = corners(sp.gx, sp.gy, Math.round(th * 2.0), 0.26);
          const cols = ["#ff4d8d", "#3be1ff", "#ffd166", "#5ef0c0"];
          for (let i = 0; i < 4; i++) {
            px(c.w[0] + tw * 0.14 + (i % 2) * tw * 0.2, c.w[1] - th * (0.2 + Math.floor(i / 2) * 0.8), 3, 3, cols[i]);
          }
          break;
        }
        case "pong": {
          isoBox(sp.gx, sp.gy, Math.round(th * 0.9), "#1f7a5c", "#12503c", "#166148", 0.06);
          const c = corners(sp.gx, sp.gy, Math.round(th * 0.9), 0.06);
          g.strokeStyle = "#e8f5f0";
          g.lineWidth = 1;
          g.globalAlpha = 0.8;
          g.beginPath();
          g.moveTo((c.n[0] + c.w[0]) / 2, (c.n[1] + c.w[1]) / 2);
          g.lineTo((c.e[0] + c.sO[0]) / 2, (c.e[1] + c.sO[1]) / 2);
          g.stroke();
          g.globalAlpha = 1;
          break;
        }
        case "plant": {
          isoBox(sp.gx, sp.gy, Math.round(th * 0.8), "#6b4a2c", "#4b3320", "#573b26", 0.32);
          const c = corners(sp.gx, sp.gy, Math.round(th * 0.8), 0.32);
          const bx = (c.n[0] + c.sO[0]) / 2;
          const by = (c.n[1] + c.sO[1]) / 2;
          const sway = Math.sin(t / 1800) * 1;
          px(bx - 1, by - th * 1.5, 2, th * 1.5, "#2c5c3c");
          /* a compact leafy crown rather than scattered blobs */
          px(bx - tw * 0.22 + sway, by - th * 1.9, tw * 0.44, th * 0.5, PAL.plant[1]);
          px(bx - tw * 0.3 + sway, by - th * 1.6, tw * 0.6, th * 0.45, PAL.plant[0]);
          px(bx - tw * 0.14 + sway, by - th * 2.2, tw * 0.28, th * 0.4, PAL.plant[0]);
          break;
        }
        case "board": {
          /* filing cabinet with a stack of storyboards on top */
          isoBox(sp.gx, sp.gy, Math.round(th * 2.0), "#544a78", "#332c4f", "#413861", 0.24);
          const c = corners(sp.gx, sp.gy, Math.round(th * 2.0), 0.24);
          const bx = (c.w[0] + c.e[0]) / 2;
          const by = (c.n[1] + c.sO[1]) / 2;
          /* drawer handles on the camera-facing side */
          px(c.w[0] + tw * 0.14, c.w[1] + th * 0.3, Math.max(2, tw * 0.16), 1, "#8f86b8");
          px(c.w[0] + tw * 0.14, c.w[1] + th * 0.9, Math.max(2, tw * 0.16), 1, "#8f86b8");
          /* paper stack */
          px(bx - tw * 0.16, by - 3, Math.max(3, tw * 0.3), 3, "#e8e1d2");
          px(bx - tw * 0.14, by - 5, Math.max(3, tw * 0.26), 2, "#f4eee1");
          break;
        }
      }
    };

    /* ---------------------------------------------------------- sprites */
    const hashOf = (str: string) => {
      let h = 0;
      for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
      return Math.abs(h);
    };

    /**
     * A tactics-style pixel sprite: chunky silhouette, dark outline, 3 tone
     * ramp. Drawn from the feet position so it depth-sorts with the tiles.
     */
    const drawPerson = (
      fx: number,
      fy: number,
      color: string,
      seedName: string,
      face: 0 | 1 | 2 | 3,
      walking: boolean,
      t: number,
      tired: boolean,
      boss: boolean
    ) => {
      const H = Math.max(12, Math.round(s.TH * (boss ? 2.9 : 2.6)));
      const u = Math.max(1, Math.round(H / 18)); // sprite pixel unit
      const W = Math.max(4, Math.round(H * 0.42)); // torso width
      const seed = hashOf(seedName);
      const skin = PAL.skin[seed % PAL.skin.length];
      const hair = PAL.hair[(seed >> 3) % PAL.hair.length];
      const step = walking ? Math.floor(t / 130) % 4 : 0;
      const bob = walking ? (step === 1 || step === 3 ? -u : 0) : Math.sin(t / 420 + seed) > 0.65 ? -u : 0;

      const headH = Math.round(H * 0.36);
      const bodyH = Math.round(H * 0.4);
      const legH = Math.max(2, H - headH - bodyH);
      const x = Math.round(fx - W / 2);
      const y = Math.round(fy - H + bob);
      const bodyY = y + headH;

      /* contact shadow */
      g.fillStyle = "rgba(10,8,20,.45)";
      g.beginPath();
      g.ellipse(fx, fy, W * 0.7, Math.max(1.5, u * 1.2), 0, 0, Math.PI * 2);
      g.fill();

      /* legs */
      const legW = Math.max(1, Math.round(W * 0.34));
      const swing = walking ? (step === 0 ? u : step === 2 ? -u : 0) : 0;
      px(x - 1, bodyY + bodyH, W + 2, legH, PAL.outline);
      px(x + swing, bodyY + bodyH, legW, legH, "#37305a");
      px(x + W - legW - swing, bodyY + bodyH, legW, legH, "#282142");
      px(x - 1 + swing, y + H - u, legW + 1, u, "#171327");
      px(x + W - legW - swing, y + H - u, legW + 1, u, "#171327");

      /* torso (outline → fill → shadow ramp → rim light) */
      px(x - 1, bodyY - 1, W + 2, bodyH + 2, PAL.outline);
      px(x, bodyY, W, bodyH, color);
      g.globalAlpha = 0.3;
      px(x, bodyY, Math.max(1, Math.round(W * 0.34)), bodyH, "#0a0616");
      g.globalAlpha = 0.25;
      px(x + W - Math.max(1, Math.round(W * 0.2)), bodyY, Math.max(1, Math.round(W * 0.2)), bodyH, "#ffffff");
      g.globalAlpha = 1;
      if (boss) px(x, bodyY, W, u, "#ffd166");

      /* arms tucked at the sides */
      const armW = Math.max(1, Math.round(W * 0.26));
      px(x - armW - 1, bodyY + u, armW + 1, bodyH - u * 2, PAL.outline);
      px(x - armW, bodyY + u, armW, bodyH - u * 2 - 1, color);
      px(x + W, bodyY + u, armW + 1, bodyH - u * 2, PAL.outline);
      px(x + W, bodyY + u, armW, bodyH - u * 2 - 1, color);

      /* head — wider than the torso, tactics-chibi proportions */
      const hw = Math.max(4, Math.round(W * 1.15));
      const hx = Math.round(fx - hw / 2);
      px(hx - 1, y - 1, hw + 2, headH + 2, PAL.outline);
      px(hx, y, hw, headH, skin);
      /* hair: cap + side burns + a couple of spikes */
      const capH = Math.max(1, Math.round(headH * 0.44));
      px(hx, y, hw, capH, hair);
      px(hx, y + capH, Math.max(1, u), Math.round(headH * 0.5), hair);
      px(hx + hw - Math.max(1, u), y + capH, Math.max(1, u), Math.round(headH * 0.5), hair);
      px(hx + Math.round(hw * 0.15), y - u, Math.max(1, u), u, hair);
      px(hx + Math.round(hw * 0.62), y - u, Math.max(1, u), u, hair);
      if (face === 2) px(hx, y, hw, headH, hair); // back of the head

      /* face */
      if (face !== 2) {
        const eyeY = y + Math.round(headH * 0.62);
        const ew = Math.max(1, u);
        if (tired) {
          px(hx + Math.round(hw * 0.2), eyeY, ew * 2, 1, "#5a4f7a");
          px(hx + Math.round(hw * 0.58), eyeY, ew * 2, 1, "#5a4f7a");
        } else if (face === 1) {
          px(hx + Math.round(hw * 0.55), eyeY, ew, ew, PAL.outline);
        } else if (face === 3) {
          px(hx + Math.round(hw * 0.24), eyeY, ew, ew, PAL.outline);
        } else {
          px(hx + Math.round(hw * 0.2), eyeY, ew, ew, PAL.outline);
          px(hx + Math.round(hw * 0.62), eyeY, ew, ew, PAL.outline);
        }
      }

      /* tired Zs float above */
      if (tired && !walking) {
        const zt = (t / 900) % 1;
        px(fx + W * 0.7, y - 3 - zt * H * 0.5, u, u, "#ffd166");
        px(fx + W * 1.0, y - 6 - zt * H * 0.4, u, u, "#ffd166");
      }
    };

    /* -------------------------------------------------------- behaviour */
    const updateWalkers = (dt: number) => {
      const speed = 0.0016; // cells / ms
      for (const wk of s.walkers) {
        wk.t += dt;
        if (wk.state === "seated") {
          if (wk.t > wk.next && s.spots.length) {
            const sp = s.spots[Math.floor(Math.random() * s.spots.length)];
            wk.target = { gx: sp.gx + (Math.random() - 0.5) * 0.5, gy: sp.gy + 0.8 };
            wk.state = "walk";
            wk.t = 0;
          }
        } else if (wk.state === "walk" && wk.target) {
          const dx = wk.target.gx - wk.gx;
          const dy = wk.target.gy - wk.gy;
          const dist = Math.hypot(dx, dy);
          const stepLen = speed * dt;
          if (Math.abs(dx) > Math.abs(dy)) wk.face = dx > 0 ? 1 : 3;
          else wk.face = dy > 0 ? 0 : 2;
          if (dist <= stepLen) {
            wk.gx = wk.target.gx;
            wk.gy = wk.target.gy;
            const home = Math.hypot(wk.homeGX - wk.gx, wk.homeGY - wk.gy) < 0.05;
            if (home) {
              wk.state = "seated";
              wk.face = 0;
              wk.next = (7 + Math.random() * 13) * 1000;
            } else {
              wk.state = "pause";
            }
            wk.t = 0;
          } else {
            wk.gx += (dx / dist) * stepLen;
            wk.gy += (dy / dist) * stepLen;
          }
        } else if (wk.state === "pause") {
          if (wk.t > (1.8 + Math.random() * 1.8) * 1000) {
            wk.target = { gx: wk.homeGX, gy: wk.homeGY };
            wk.state = "walk";
            wk.t = 0;
          }
        }
      }
    };

    /* ---------------------------------------------------------- lighting */
    const drawLighting = (tod: number) => {
      const night = tod > 0.72 || tod < 0.08;
      const evening = tod > 0.6 && tod <= 0.72;

      /* colour grade (multiply) */
      g.globalCompositeOperation = "multiply";
      if (night) g.fillStyle = "#6d7fcc";
      else if (evening) g.fillStyle = "#ffc09a";
      else if (tod < 0.2) g.fillStyle = "#ffd2b0";
      else g.fillStyle = "#dfe4ff";
      g.fillRect(0, 0, s.pw, s.ph);
      g.globalCompositeOperation = "source-over";

      /* warm bloom pools from lamps + monitors (additive) */
      g.globalCompositeOperation = "lighter";
      const lampAlpha = night ? 0.62 : evening ? 0.36 : 0.16;
      for (const d of s.desks) {
        const p = iso(d.gx, d.gy);
        const r = s.TW * 1.5;
        const rg = g.createRadialGradient(p.x, p.y - s.TH, 0, p.x, p.y - s.TH, r);
        rg.addColorStop(0, `rgba(120,180,255,${lampAlpha * 0.5})`);
        rg.addColorStop(1, "rgba(120,180,255,0)");
        g.fillStyle = rg;
        g.fillRect(p.x - r, p.y - s.TH - r, r * 2, r * 2);
      }
      /* ceiling lamps */
      const lampCount = 3;
      for (let i = 0; i < lampCount; i++) {
        const lx = ((i + 0.5) / lampCount) * s.pw;
        const ly = s.ph * 0.34;
        const r = s.pw * 0.32;
        const rg = g.createRadialGradient(lx, ly, 0, lx, ly, r);
        rg.addColorStop(0, `rgba(255,208,138,${lampAlpha})`);
        rg.addColorStop(1, "rgba(255,208,138,0)");
        g.fillStyle = rg;
        g.fillRect(lx - r, ly - r, r * 2, r * 2);
      }
      g.globalCompositeOperation = "source-over";

      /* vignette */
      const vg = g.createRadialGradient(s.pw / 2, s.ph * 0.55, s.ph * 0.25, s.pw / 2, s.ph * 0.55, s.ph * 0.95);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(6,5,16,.42)");
      g.fillStyle = vg;
      g.fillRect(0, 0, s.pw, s.ph);
    };

    /** dust motes drifting in the light — cheap atmosphere */
    const drawMotes = (t: number) => {
      g.fillStyle = "rgba(255,230,190,.5)";
      for (let i = 0; i < 14; i++) {
        const mx = (i * 71.3 + Math.sin(t / 3000 + i) * 20 + t / 90) % s.pw;
        const my = (i * 43.7 + Math.cos(t / 2400 + i * 2) * 14) % (s.ph * 0.8);
        g.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t / 800 + i));
        g.fillRect(Math.round(mx), Math.round(my), 1, 1);
      }
      g.globalAlpha = 1;
    };

    /* ------------------------------------------------------------- loop */
    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (s.pw < 20 || s.ph < 20 || !s.bg) {
        s.raf = requestAnimationFrame(draw);
        return;
      }
      const { staff: curStaff, boss: curBoss, timeOfDay: tod } = latest.current;
      updateWalkers(dt);

      /* --- clear --- */
      g.fillStyle = "#0c0a1a";
      g.fillRect(0, 0, s.pw, s.ph);

      drawWalls(tod, now);
      drawFloor();

      /* --- depth-sorted entity pass --- */
      type Ent = { d: number; f: () => void };
      const ents: Ent[] = [];

      s.spots.forEach((sp) => ents.push({ d: sp.gx + sp.gy - 0.4, f: () => drawSpot(sp, now) }));

      s.desks.forEach((d, i) => {
        const isBoss = i === 0;
        const m = isBoss ? curBoss : curStaff[i - 1];
        /* chair, then the seated worker, then the desk in front of them */
        ents.push({ d: d.gx + d.gy - SEAT_OFF - 0.35, f: () => drawChair(d) });
        const wk = s.walkers.find((w) => w.desk === i);
        if (isBoss) {
          const p = iso(d.gx, d.gy - SEAT_OFF);
          ents.push({
            d: d.gx + d.gy - SEAT_OFF,
            f: () => drawPerson(p.x, p.y, curBoss.color, curBoss.name, 0, false, now, false, true),
          });
        } else if (m && wk && wk.state === "seated") {
          const p = iso(wk.gx, wk.gy);
          ents.push({
            d: wk.gx + wk.gy,
            f: () => drawPerson(p.x, p.y, m.color, m.name, 0, false, now, !!m.tired, false),
          });
        }
        ents.push({
          d: d.gx + d.gy,
          f: () => drawDesk(d, !!m, m?.color ?? "#5a5a72", isBoss, now),
        });
      });

      /* moving staff */
      for (const wk of s.walkers) {
        if (wk.state === "seated") continue;
        const m = curStaff[wk.desk - 1];
        if (!m) continue;
        const p = iso(wk.gx, wk.gy);
        ents.push({
          d: wk.gx + wk.gy,
          f: () => drawPerson(p.x, p.y, m.color, m.name, wk.face, wk.state === "walk", now, !!m.tired, false),
        });
      }

      ents.sort((a, b) => a.d - b.d);
      ents.forEach((e) => e.f());

      drawMotes(now);
      drawLighting(tod);

      /* --- blit the low-res buffer up, nearest-neighbour --- */
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(buf, 0, 0, s.pw, s.ph, 0, 0, canvas.width, canvas.height);

      /* --- HD-2D tilt-shift: fake depth blur on the top & bottom bands --- */
      const band = Math.round(canvas.height * 0.17);
      ctx.globalAlpha = 0.28;
      for (const off of [-1, 1]) {
        ctx.drawImage(buf, 0, 0, s.pw, Math.round(s.ph * 0.17), off * s.scale, 0, canvas.width, band);
        ctx.drawImage(
          buf,
          0,
          Math.round(s.ph * 0.86),
          s.pw,
          Math.round(s.ph * 0.14),
          off * s.scale,
          canvas.height - Math.round(canvas.height * 0.14),
          canvas.width,
          Math.round(canvas.height * 0.14)
        );
      }
      ctx.globalAlpha = 1;

      /* --- crisp name plates drawn at display resolution --- */
      ctx.textAlign = "center";
      const fs = Math.max(9, Math.round(s.scale * 3.4));
      ctx.font = `700 ${fs}px "Space Grotesk", sans-serif`;
      s.desks.forEach((d, i) => {
        const isBoss = i === 0;
        const m = isBoss ? curBoss : curStaff[i - 1];
        if (!m) return;
        const p = iso(d.gx, d.gy);
        const sx = p.x * s.scale;
        const sy = (p.y + s.TH * 2.1) * s.scale;
        ctx.fillStyle = "rgba(8,6,18,.6)";
        const tw = ctx.measureText(m.name).width;
        ctx.fillRect(sx - tw / 2 - 3, sy - fs, tw + 6, fs + 4);
        ctx.fillStyle = isBoss ? "#ffd166" : "rgba(242,236,223,.85)";
        ctx.fillText(m.name, sx, sy);
      });

      s.raf = requestAnimationFrame(draw);
    };
    s.raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(s.raf);
      canvas.removeEventListener("pointerdown", onPointer);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="h-full w-full" style={{ imageRendering: "pixelated" }} />
    </div>
  );
}
