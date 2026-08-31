import { useEffect, useRef } from "react";

export interface OfficeStaff {
  name: string;
  color: string;
  tired?: boolean;
}

interface Spot {
  x: number;
  y: number;
  kind: "coffee" | "water" | "snack" | "pong" | "boss";
}

interface Walker {
  desk: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  state: "seated" | "walk" | "pause";
  target: { x: number; y: number } | null;
  t: number;
  next: number;
  dir: 1 | -1;
}

/**
 * Game Dev Story-style animated office: staff sit at desks with live monitors,
 * occasionally get up and wander to the coffee machine / water cooler / snack
 * machine, windows show a day-night city, and furniture upgrades per level.
 *
 * All changing props are read through a `latest` ref so the animation loop is
 * set up exactly once and never restarts (previously new object identities on
 * every render tore the scene down and reset all walkers).
 */
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
    w: 320,
    h: 320,
    walkers: [] as Walker[],
    desks: [] as { x: number; y: number; s: number }[],
    rows: [] as number[][],
  });
  const latest = useRef({ level, boss, staff, maxStaff, timeOfDay, onDeskClick });
  latest.current = { level, boss, staff, maxStaff, timeOfDay, onDeskClick };

  /* ----------------------------------------------------------- scene build */
  const buildRows = (maxStaff: number, level: number): number[][] => {
    const totalDesks = maxStaff + 1;
    const rows: number[][] = [];
    let left = totalDesks;
    const rowSizes =
      level >= 3
        ? [5, 4, Math.max(0, left - 9)]
        : level >= 2
          ? [4, Math.max(0, Math.ceil((totalDesks - 4) / 2)), Math.max(0, Math.floor((totalDesks - 4) / 2))]
          : level === 1
            ? [3, Math.max(0, totalDesks - 3)]
            : [totalDesks];
    rowSizes.forEach((n) => {
      if (n > 0 && left > 0) {
        rows.push(Array.from({ length: Math.min(n, left) }, (_, j) => j));
        left -= Math.min(n, left);
      }
    });
    return rows;
  };

  const layoutDesks = () => {
    const s = st.current;
    const w = s.w;
    const h = s.h;
    const desks: { x: number; y: number; s: number }[] = [];
    const rows = buildRows(latest.current.maxStaff, latest.current.level);
    s.rows = rows;
    const rowH = h * (0.5 / Math.max(1, rows.length));
    rows.forEach((row, ri) => {
      const depth = 0.55 + ri * 0.22; // front rows bigger
      const yBase = h * 0.34 + ri * rowH * 1.06;
      const gap = Math.min(120, (w * 0.78) / Math.max(1, row.length));
      const startX = w / 2 - (gap * (row.length - 1)) / 2;
      row.forEach((_, ci) => {
        desks.push({ x: startX + ci * gap, y: yBase, s: depth });
      });
    });
    s.desks = desks;
  };

  const makeWalkers = () => {
    const s = st.current;
    s.walkers = latest.current.staff.map((_, i) => {
      const d = s.desks[i + 1] ?? { x: s.w / 2, y: s.h * 0.5, s: 1 };
      return {
        desk: i + 1,
        x: d.x,
        y: d.y + 34 * d.s,
        homeX: d.x,
        homeY: d.y + 34 * d.s,
        state: "seated" as const,
        target: null,
        t: 0,
        next: (6 + Math.random() * 10) * 1000,
        dir: 1 as const,
      };
    });
  };

  const rebuild = () => {
    layoutDesks();
    makeWalkers();
  };

  /* ---------------------------------------------- rebuild when layout key */
  useEffect(() => {
    rebuild();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, maxStaff, staff.length]);

  /* ------------------------------------------------------- canvas + loop */
  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const g = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const s = st.current;

    const resize = () => {
      s.w = wrap.clientWidth;
      s.h = wrap.clientHeight;
      canvas.width = Math.max(1, Math.round(s.w * dpr));
      canvas.height = Math.max(1, Math.round(s.h * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    rebuild();

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      s.desks.forEach((d, i) => {
        const dw = 150 * d.s;
        const dh = 90 * d.s;
        if (Math.abs(px - d.x) < dw / 2 && Math.abs(py - d.y) < dh / 2) {
          latest.current.onDeskClick?.(i);
        }
      });
    };
    canvas.addEventListener("pointerdown", onPointer);

    /* ------------------------------ draw helpers ------------------------------ */
    const sky = (tod: number) => {
      if (tod < 0.22) return ["#ffb36b", "#ff7a5c"]; // morning
      if (tod < 0.5) return ["#7ec8ff", "#3f7fd9"]; // day
      if (tod < 0.74) return ["#ff9a62", "#7a4a8f"]; // evening
      return ["#101c3f", "#060a1c"]; // night
    };

    const drawRoom = (tod: number, t: number) => {
      const w = s.w;
      const h = s.h;
      const level = latest.current.level;
      const [top, bottom] = sky(tod);
      const skyGrad = g.createLinearGradient(0, 0, 0, h * 0.34);
      skyGrad.addColorStop(0, top);
      skyGrad.addColorStop(1, bottom);
      g.fillStyle = skyGrad;
      g.fillRect(0, 0, w, h * 0.34);

      /* stars at night */
      if (tod > 0.74 || tod < 0.1) {
        g.fillStyle = "rgba(255,255,255,.7)";
        for (let i = 0; i < 24; i++) {
          const sx = (i * 137.5 + 40) % w;
          const sy = (i * 71.3 + 20) % (h * 0.22);
          g.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t / 900 + i));
          g.fillRect(sx, sy, 2, 2);
        }
        g.globalAlpha = 1;
      }

      /* city silhouette behind window mullions */
      g.fillStyle = tod > 0.74 ? "#0b1226" : "#2a3154";
      const buildings = 7;
      for (let i = 0; i < buildings; i++) {
        const bw = w / buildings;
        const bh = h * (0.08 + ((i * 53) % 40) / 100);
        g.fillRect(i * bw + 4, h * 0.34 - bh, bw - 8, bh);
        /* lit windows */
        if (tod > 0.7) {
          g.fillStyle = "#ffd166";
          for (let wy = 0; wy < bh - 6; wy += 9) {
            for (let wx = 6; wx < bw - 10; wx += 8) {
              if (Math.sin(i * 31 + wx * 7 + wy * 13 + t / 800) > 0.2) g.fillRect(i * bw + wx, h * 0.34 - bh + wy, 3, 4);
            }
          }
          g.fillStyle = "#2a3154";
        }
      }

      /* wall */
      const wallGrad = g.createLinearGradient(0, 0, 0, h);
      wallGrad.addColorStop(0, level >= 2 ? "#232a4d" : level === 1 ? "#2a2350" : "#262039");
      wallGrad.addColorStop(0.6, level >= 2 ? "#1a1f3c" : level === 1 ? "#201a3e" : "#1d1830");
      g.fillStyle = wallGrad;
      g.fillRect(0, h * 0.34, w, h * 0.66);

      /* window frame */
      g.fillStyle = "rgba(10,8,18,.35)";
      g.fillRect(0, h * 0.34, w, h * 0.34);
      g.fillStyle = "rgba(255,255,255,.06)";
      g.fillRect(w * 0.05, h * 0.06, w * 0.9, h * 0.24);

      /* floor */
      const floorGrad = g.createLinearGradient(0, h * 0.55, 0, h);
      floorGrad.addColorStop(0, level >= 3 ? "#3a3050" : "#2e2547");
      floorGrad.addColorStop(1, "#181230");
      g.fillStyle = floorGrad;
      g.fillRect(0, h * 0.55, w, h * 0.45);
      /* floor tiles */
      g.strokeStyle = "rgba(255,255,255,.045)";
      g.lineWidth = 1;
      for (let i = 0; i < 9; i++) {
        const ty = h * 0.55 + ((i * i) / 81) * h * 0.45;
        g.beginPath();
        g.moveTo(0, ty);
        g.lineTo(w, ty);
        g.stroke();
      }
      for (let i = -4; i <= 5; i++) {
        g.beginPath();
        g.moveTo(w / 2 + i * w * 0.2, h * 0.55);
        g.lineTo(w / 2 + i * w * 0.32, h);
        g.stroke();
      }
      /* rug on level 1+ */
      if (level >= 1) {
        g.fillStyle = level >= 3 ? "rgba(120,60,160,.18)" : "rgba(60,110,160,.15)";
        g.beginPath();
        g.ellipse(w / 2, h * 0.88, w * 0.34, h * 0.07, 0, 0, Math.PI * 2);
        g.fill();
      }
    };

    const drawDesk = (x: number, y: number, sc: number, occupied: boolean, color: string, tired: boolean, t: number) => {
      const w = 130 * sc;
      const deskH = 26 * sc;
      const monitorW = 64 * sc;
      const monitorH = 42 * sc;
      const level = latest.current.level;
      /* chair behind */
      g.fillStyle = "#241c3e";
      g.beginPath();
      g.roundRect(x - 22 * sc, y - 40 * sc, 44 * sc, 40 * sc, 10 * sc);
      g.fill();
      if (occupied) {
        /* staff chibi: body + head */
        const bob = Math.sin(t / 260) * 1.6;
        g.fillStyle = color;
        g.beginPath();
        g.arc(x, y - 42 * sc + bob, 11 * sc, Math.PI, 0);
        g.fill();
        g.fillStyle = "#ffd9b8";
        g.fillRect(x - 8 * sc, y - 42 * sc + bob, 16 * sc, 12 * sc);
        g.fillStyle = "#0a0812";
        g.fillRect(x - 5 * sc, y - 37 * sc + bob, 2.4 * sc, 3 * sc);
        g.fillRect(x + 2.6 * sc, y - 37 * sc + bob, 2.4 * sc, 3 * sc);
        g.fillStyle = tired ? "#4a4166" : "#3a3f66";
        g.beginPath();
        g.roundRect(x - 12 * sc, y - 28 * sc + bob, 24 * sc, 14 * sc, 5 * sc);
        g.fill();
        if (tired) {
          g.fillStyle = "#ffd166";
          g.font = `800 ${10 * sc}px "Bricolage Grotesque", sans-serif`;
          g.textAlign = "center";
          g.fillText("Z z", x, y - 54 * sc);
        }
      } else {
        g.fillStyle = "rgba(255,255,255,.05)";
        g.beginPath();
        g.roundRect(x - 10 * sc, y - 36 * sc, 20 * sc, 34 * sc, 6 * sc);
        g.fill();
      }
      /* monitor */
      g.fillStyle = "#0a0812";
      g.beginPath();
      g.roundRect(x - monitorW / 2, y - 30 * sc, monitorW, monitorH, 5 * sc);
      g.fill();
      g.strokeStyle = "rgba(120,100,220,.5)";
      g.lineWidth = 1;
      g.stroke();
      if (occupied) {
        for (let bI = 0; bI < 5; bI++) {
          const hgt = 3 + Math.abs(Math.sin(t / 300 + bI * 1.7)) * 16 * sc;
          g.fillStyle = color;
          g.globalAlpha = 0.85;
          g.fillRect(x - monitorW / 2 + 6 * sc + bI * 11 * sc, y - 24 * sc + (monitorH - 14 * sc) - hgt, 6 * sc, hgt);
        }
        g.globalAlpha = 1;
      } else {
        g.fillStyle = "rgba(60,70,120,.5)";
        g.fillRect(x - monitorW / 2 + 6 * sc, y - 24 * sc, monitorW - 12 * sc, 6 * sc);
      }
      /* desk slab */
      const slab = g.createLinearGradient(0, y + 8 * sc, 0, y + 26 * sc);
      slab.addColorStop(0, level >= 2 ? "#6e5a8a" : "#8a5a3b");
      slab.addColorStop(1, level >= 2 ? "#43365c" : "#5e3b24");
      g.fillStyle = slab;
      g.beginPath();
      g.roundRect(x - w / 2, y, w, deskH, 4 * sc);
      g.fill();
      /* name tag */
      g.fillStyle = "rgba(242,236,223,.65)";
      g.font = `700 ${9 * sc}px "Space Grotesk", sans-serif`;
      g.textAlign = "center";
    };

    const drawAmenities = (t: number) => {
      const w = s.w;
      const h = s.h;
      const level = latest.current.level;
      /* water cooler (left) */
      g.fillStyle = "#2f4a6b";
      g.beginPath();
      g.roundRect(w * 0.1 - 16, h * 0.46, 32, 52, 6);
      g.fill();
      g.fillStyle = "#7ec8ff";
      g.beginPath();
      g.roundRect(w * 0.1 - 14, h * 0.42, 28, 10, 4);
      g.fill();
      /* coffee machine (right) */
      g.fillStyle = "#3a2f52";
      g.beginPath();
      g.roundRect(w * 0.9 - 20, h * 0.44, 40, 56, 6);
      g.fill();
      g.fillStyle = "#ffd166";
      g.beginPath();
      g.roundRect(w * 0.9 - 12, h * 0.48, 24, 14, 4);
      g.fill();
      g.fillStyle = "#ff5e5e";
      g.beginPath();
      g.arc(w * 0.9 + 10, h * 0.5, 3, 0, Math.PI * 2);
      g.fill();
      /* plant */
      g.fillStyle = "#2e6b4f";
      g.beginPath();
      g.arc(w * 0.94, h * 0.82, 14, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#1d4a36";
      g.beginPath();
      g.arc(w * 0.9, h * 0.8, 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#6b4a2c";
      g.beginPath();
      g.roundRect(w * 0.915, h * 0.84, 20, 16, 4);
      g.fill();
      /* snack machine level 2+ */
      if (level >= 2) {
        g.fillStyle = "#20263f";
        g.beginPath();
        g.roundRect(w * 0.86 - 22, h * 0.6, 44, 62, 6);
        g.fill();
        g.fillStyle = "#ff4d8d";
        g.fillRect(w * 0.86 - 16, h * 0.63, 12, 14);
        g.fillStyle = "#3be1ff";
        g.fillRect(w * 0.86, h * 0.63, 12, 14);
        g.fillStyle = "#ffd166";
        g.fillRect(w * 0.86 - 16, h * 0.79, 12, 14);
        g.fillStyle = "#5ef0c0";
        g.fillRect(w * 0.86, h * 0.79, 12, 14);
      }
      /* ping-pong table level 3+ */
      if (level >= 3) {
        g.fillStyle = "#1f7a5c";
        g.beginPath();
        g.ellipse(w * 0.12, h * 0.86, 34, 14, 0, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = "#fff3";
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(w * 0.12 - 34, h * 0.86);
        g.lineTo(w * 0.12 + 34, h * 0.86);
        g.stroke();
      }
      /* whiteboard (left wall) */
      g.fillStyle = "#efe9dc";
      g.beginPath();
      g.roundRect(w * 0.06, h * 0.12, w * 0.18, h * 0.14, 4);
      g.fill();
      g.fillStyle = "#c2417a";
      for (let i = 0; i < 4; i++) {
        g.fillRect(w * 0.08, h * 0.14 + i * h * 0.028, w * 0.12 - i * w * 0.02, 3);
      }
      /* posters */
      const posterCols = ["#ff4d8d", "#3be1ff", "#ffd166"];
      for (let i = 0; i < 3; i++) {
        g.fillStyle = posterCols[i];
        g.globalAlpha = 0.75;
        g.beginPath();
        g.roundRect(w * 0.72 + i * w * 0.08, h * 0.1, w * 0.055, h * 0.13, 3);
        g.fill();
        g.globalAlpha = 1;
      }
      void t;
    };

    const spots = (): Spot[] => {
      const w = s.w;
      const h = s.h;
      const level = latest.current.level;
      const list: Spot[] = [
        { x: w * 0.1, y: h * 0.52, kind: "water" },
        { x: w * 0.9, y: h * 0.5, kind: "coffee" },
      ];
      if (level >= 2) list.push({ x: w * 0.86, y: h * 0.66, kind: "snack" });
      if (level >= 3) list.push({ x: w * 0.12, y: h * 0.72, kind: "pong" });
      return list;
    };

    /* walker timings are in real ms (dt comes from requestAnimationFrame) */
    const updateWalkers = (dt: number) => {
      for (const wk of s.walkers) {
        wk.t += dt;
        if (wk.state === "seated") {
          if (wk.t > wk.next) {
            const sp = spots()[Math.floor(Math.random() * spots().length)];
            wk.target = { x: sp.x + (Math.random() - 0.5) * 20, y: sp.y };
            wk.state = "walk";
            wk.dir = wk.target.x >= wk.x ? 1 : -1;
            wk.t = 0;
          }
        } else if (wk.state === "walk" && wk.target) {
          const dx = wk.target.x - wk.x;
          const dy = wk.target.y - wk.y;
          const dist = Math.hypot(dx, dy);
          const step = 0.9 * dt * 0.06;
          if (dist < step) {
            wk.x = wk.target.x;
            wk.y = wk.target.y;
            wk.state = "pause";
            wk.t = 0;
          } else {
            wk.x += (dx / dist) * step;
            wk.y += (dy / dist) * step;
            wk.dir = dx >= 0 ? 1 : -1;
          }
        } else if (wk.state === "pause") {
          if (wk.t > (1.6 + Math.random() * 1.4) * 1000) {
            wk.target = { x: wk.homeX, y: wk.homeY };
            wk.state = "walk";
            wk.dir = wk.homeX >= wk.x ? 1 : -1;
          }
        }
        /* arrived back at desk → sit down and rest for a while */
        if (
          wk.state === "walk" &&
          wk.target &&
          Math.hypot(wk.target.x - wk.x, wk.target.y - wk.y) < 2 &&
          Math.hypot(wk.homeX - wk.x, wk.homeY - wk.y) < 2
        ) {
          wk.x = wk.homeX;
          wk.y = wk.homeY;
          wk.state = "seated";
          wk.next = (6 + Math.random() * 12) * 1000;
          wk.t = 0;
        }
      }
    };

    const drawWalker = (wk: Walker, color: string, tired: boolean, t: number) => {
      const walking = wk.state === "walk";
      const bob = walking ? Math.abs(Math.sin(t / 110)) * 3 : Math.sin(t / 300) * 1.2;
      const sc = 0.9;
      g.fillStyle = color;
      g.beginPath();
      g.arc(wk.x, wk.y - 34 * sc + bob, 10 * sc, Math.PI, 0);
      g.fill();
      g.fillStyle = "#ffd9b8";
      g.fillRect(wk.x - 7 * sc, wk.y - 34 * sc + bob, 14 * sc, 10 * sc);
      g.fillStyle = "#0a0812";
      g.fillRect(wk.x - 4.5 * sc, wk.y - 30 * sc + bob, 2.2 * sc, 2.6 * sc);
      g.fillRect(wk.x + 2.2 * sc, wk.y - 30 * sc + bob, 2.2 * sc, 2.6 * sc);
      g.fillStyle = tired ? "#4a4166" : "#3a3f66";
      g.beginPath();
      g.roundRect(wk.x - 11 * sc, wk.y - 23 * sc + bob, 22 * sc, 13 * sc, 5 * sc);
      g.fill();
      if (walking) {
        /* little feet shuffle */
        g.fillStyle = "#181230";
        g.fillRect(wk.x - 6 * sc + Math.sin(t / 90) * 3, wk.y - 8 * sc, 4 * sc, 3 * sc);
        g.fillRect(wk.x + 2 * sc - Math.sin(t / 90) * 3, wk.y - 8 * sc, 4 * sc, 3 * sc);
      }
      if (tired && wk.state !== "walk") {
        g.fillStyle = "#ffd166";
        g.font = `800 10px "Bricolage Grotesque", sans-serif`;
        g.textAlign = "center";
        g.fillText("Z z", wk.x, wk.y - 46 * sc);
      }
    };

    let last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const { staff: curStaff, boss: curBoss, timeOfDay: tod } = latest.current;
      updateWalkers(dt);

      drawRoom(tod, now);
      drawAmenities(now);

      /* desks back-to-front (rows drawn by index order; draw desks in y order) */
      const order = s.desks.map((d, i) => ({ d, i })).sort((a, b) => a.d.y - b.d.y);
      for (const { d, i } of order) {
        const isBoss = i === 0;
        const m = isBoss ? curBoss : curStaff[i - 1];
        const tired = !isBoss && m?.tired;
        if (isBoss) {
          drawDesk(d.x, d.y, d.s * 1.25, true, curBoss.color, false, now);
          g.fillStyle = "rgba(242,236,223,.75)";
          g.font = `700 ${10 * d.s}px "Space Grotesk", sans-serif`;
          g.textAlign = "center";
          g.fillText(curBoss.name, d.x, d.y + 40 * d.s);
        } else if (m) {
          drawDesk(d.x, d.y, d.s, true, m.color, !!tired, now);
          g.fillStyle = "rgba(242,236,223,.65)";
          g.font = `700 ${9 * d.s}px "Space Grotesk", sans-serif`;
          g.textAlign = "center";
          g.fillText(m.name, d.x, d.y + 40 * d.s);
        } else {
          drawDesk(d.x, d.y, d.s, false, "#666", false, now);
        }
      }

      /* walking staff drawn on the floor, in front of desks */
      const walkers = [...s.walkers].sort((a, b) => a.y - b.y);
      for (const wk of walkers) {
        const m = curStaff[wk.desk - 1];
        if (!m) continue;
        if (wk.state !== "seated") drawWalker(wk, m.color, !!m.tired, now);
      }

      /* time-of-day lighting overlay */
      if (tod > 0.74 || tod < 0.1) {
        g.fillStyle = "rgba(8,10,30,.34)";
        g.fillRect(0, 0, s.w, s.h);
      } else if (tod > 0.62) {
        g.fillStyle = "rgba(255,140,80,.14)";
        g.fillRect(0, 0, s.w, s.h);
      }
      if (tod > 0.74) {
        /* warm interior lights at night */
        const lamp = g.createRadialGradient(s.w / 2, s.h * 0.5, 20, s.w / 2, s.h * 0.5, s.w * 0.6);
        lamp.addColorStop(0, "rgba(255,209,102,.10)");
        lamp.addColorStop(1, "rgba(255,209,102,0)");
        g.fillStyle = lamp;
        g.fillRect(0, 0, s.w, s.h);
      }

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
      <canvas ref={canvasRef} className="h-full w-full" />
    </div>
  );
}
