/**
 * studio.ts — the animated pixel-art studio.
 *
 * The scene renders into a low-resolution buffer (a couple of hundred pixels
 * wide) which the React component upscales with nearest-neighbour, so every
 * pixel on screen is a real pixel of art.
 *
 * What lives in here:
 *  - a room laid out per office tier (five of them, bedroom → global campus)
 *  - an outside world behind the windows running on its own day/night clock
 *  - the crew: seated sprites typing at live monitors, getting up to wander to
 *    the coffee machine, water cooler, snack machine and ping-pong table
 *  - ambient life: steam, dust motes, lamp glow, light shafts, the studio cat
 */

import { charSprite, CHAR_H, CHAR_W, lookFrom, type CharView, type Look } from "./chars";
import {
  boardSprite,
  catSprite,
  clockSprite,
  coffeeSprite,
  DESK_CHAR_X,
  DESK_H,
  DESK_SCREEN,
  DESK_W,
  deskBackSprite,
  deskFrontSprite,
  drawRug,
  drawScreen,
  lampSprite,
  MAT,
  plantSprite,
  pongSprite,
  posterSprite,
  serverSprite,
  shelfSprite,
  snackSprite,
  sofaSprite,
  themeFor,
  trophySprite,
  waterSprite,
  type Theme,
} from "./props";
import { clamp, ctx2d, hash, lerp, makeCanvas, mix, Pen, rng, shade } from "./pen";

export interface StudioStaff {
  name: string;
  color: string;
  tired?: boolean;
}

interface Desk {
  x: number;
  /** baseline — where the sitting character's feet are */
  base: number;
  row: number;
  screenKind: number;
}

interface Spot {
  x: number;
  y: number;
  kind: "coffee" | "water" | "snack" | "pong" | "board";
}

interface Walker {
  desk: number;
  x: number;
  y: number;
  homeX: number;
  homeY: number;
  state: "sit" | "walk" | "act";
  target: Spot | null;
  t: number;
  next: number;
  dir: 1 | -1;
  view: CharView;
  look: Look;
  seed: number;
}

interface Puff {
  x: number;
  y: number;
  vy: number;
  vx: number;
  life: number;
  max: number;
  kind: "steam" | "dust" | "spark";
}

interface WinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* -------------------------------------------------------------- sky phase */

interface SkyKey {
  top: string;
  bottom: string;
  glow: string;
  night: number;
}

const SKY_KEYS: SkyKey[] = [
  { top: "#f5a97f", bottom: "#ffd9a8", glow: "#ffb36b", night: 0 }, // dawn
  { top: "#4aa8f0", bottom: "#a7dcff", glow: "#bfe6ff", night: 0 }, // midday
  { top: "#ff7a5c", bottom: "#6a3f7a", glow: "#ff9a62", night: 0.35 }, // dusk
  { top: "#060a1e", bottom: "#161a3a", glow: "#24306b", night: 1 }, // night
];

function skyAt(tod: number): SkyKey {
  const t = ((tod % 1) + 1) % 1;
  const seg = t * 4;
  const i = Math.floor(seg) % 4;
  const n = (i + 1) % 4;
  const f = seg - Math.floor(seg);
  const a = SKY_KEYS[i];
  const b = SKY_KEYS[n];
  return {
    top: mix(a.top, b.top, f),
    bottom: mix(a.bottom, b.bottom, f),
    glow: mix(a.glow, b.glow, f),
    night: lerp(a.night, b.night, f),
  };
}

/* ------------------------------------------------------------------ scene */

export class StudioScene {
  W = 240;
  H = 144;
  level = 0;
  awards = 0;
  tod = 0.3;

  boss: StudioStaff = { name: "You", color: "#ffd166" };
  staff: StudioStaff[] = [];
  maxStaff = 2;

  private th: Theme = themeFor(0);
  private bg: HTMLCanvasElement | null = null;
  private bgKey = "";

  private todTarget = 0.3;
  private wallBottom = 60;
  private win: WinRect[] = [];
  private desks: Desk[] = [];
  private spots: Spot[] = [];
  private walkers: Walker[] = [];
  private puffs: Puff[] = [];
  private skyline: { x: number; w: number; h: number; seed: number }[] = [];
  private clock = 0;

  constructor() {
    this.build();
  }

  /* ------------------------------------------------------------ configure */

  setSize(w: number, h: number) {
    const H = clamp(Math.round(h), 96, 220);
    const W = clamp(Math.round(w), 150, 400);
    if (W === this.W && H === this.H) return;
    this.W = W;
    this.H = H;
    this.build();
  }

  configure(o: { level: number; boss: StudioStaff; staff: StudioStaff[]; maxStaff: number; timeOfDay: number; awards?: number }) {
    const levelChanged = o.level !== this.level;
    const staffChanged = o.staff.length !== this.staff.length || o.maxStaff !== this.maxStaff;
    const fresh = !this.bg;
    this.level = o.level;
    this.boss = o.boss;
    this.staff = o.staff;
    this.maxStaff = o.maxStaff;
    this.todTarget = o.timeOfDay;
    if (fresh) this.tod = o.timeOfDay;
    this.awards = o.awards ?? 0;
    if (levelChanged || staffChanged || fresh) {
      this.th = themeFor(this.level);
      this.build();
    }
  }

  /* --------------------------------------------------------------- layout */

  private build() {
    this.th = themeFor(this.level);
    this.wallBottom = Math.round(this.H * 0.42);
    this.buildWindows();
    this.buildDesks();
    this.buildSpots();
    this.buildSkyline();
    this.buildWalkers();
    this.puffs = [];
    this.bgKey = "";
  }

  private buildWindows() {
    const W = this.W;
    const y = Math.max(10, Math.round(this.H * 0.12));
    const h = Math.max(16, Math.round(this.H * 0.22));
    const count = this.level >= 4 ? 5 : this.level >= 2 ? 4 : this.level >= 1 ? 3 : 2;
    /* keep the wall clear for the whiteboard (left) and the shelf (right) */
    const left = this.level >= 2 ? 36 : Math.round(W * 0.05);
    const right = this.level >= 1 ? 52 : Math.round(W * 0.05);
    const usable = Math.max(40, W - left - right);
    const gap = Math.max(7, Math.round(usable * 0.05));
    const w = Math.floor((usable - gap * (count - 1)) / count);
    this.win = [];
    for (let i = 0; i < count; i++) this.win.push({ x: left + i * (w + gap), y, w, h });
  }

  private buildDesks() {
    /* the showrunner gets the first desk, so a studio for N staff has N+1 */
    const total = Math.min(this.maxStaff + 1, 14);
    /* keep the rows clear of the appliances parked against the walls */
    const side = this.level >= 3 ? 36 : this.level >= 1 ? 34 : 26;
    const usable = Math.max(60, this.W - side * 2);
    /* how many desks fit in a row before they start colliding */
    const maxPerRow = Math.max(2, Math.floor((usable - DESK_W) / 30) + 1);
    /* more desks per row as the studio grows — tier drives the row count */
    let nRows = this.level >= 3 ? 3 : this.level >= 1 ? 2 : 1;
    while (nRows < 3 && Math.ceil(total / nRows) > maxPerRow) nRows++;
    const shown = Math.min(total, nRows * maxPerRow);

    const rows = Array.from({ length: nRows }, (_, i) => Math.floor(shown / nRows) + (i < shown % nRows ? 1 : 0)).sort(
      (a, b) => a - b,
    );
    const gap = nRows === 3 ? 20 : 26;
    const bottom = this.H - 22;
    const baseFor = (r: number) => bottom - gap * (nRows - 1 - r);

    const hasPong = this.level >= 3 && this.W >= 250;
    const centre = this.W / 2 + (this.level >= 2 ? 8 : 0) + (hasPong ? 6 : 0);
    this.desks = [];
    rows.forEach((n, r) => {
      if (n <= 0) return;
      const spacing = n > 1 ? Math.min(38, (usable - DESK_W) / (n - 1)) : 0;
      const rowW = spacing * (n - 1) + DESK_W;
      const startX = Math.round(centre - rowW / 2);
      for (let i = 0; i < n; i++) {
        this.desks.push({
          x: Math.round(startX + i * spacing),
          base: baseFor(r),
          row: r,
          screenKind: (this.desks.length * 7 + r * 3) % 4,
        });
      }
    });
  }

  private buildSpots() {
    const wb = this.wallBottom;
    const H = this.H;
    const W = this.W;
    const hasPong = this.level >= 3 && W >= 250;
    /* spots sit just in front of each appliance so the crew queue up at it */
    this.spots = [
      { x: Math.max(150, W - 34), y: wb + 20, kind: "coffee" },
      { x: 28, y: wb + 20, kind: "water" },
    ];
    if (this.level >= 1) this.spots.push({ x: Math.max(150, W - 34), y: wb + 52, kind: "snack" });
    if (hasPong) this.spots.push({ x: 26, y: H - 18, kind: "pong" });
    if (this.level >= 2) this.spots.push({ x: 34, y: wb + 12, kind: "board" });
  }

  private buildSkyline() {
    const r = rng(hash(`sky${this.W}`));
    this.skyline = [];
    let x = -10;
    while (x < this.W + 20) {
      const w = 8 + Math.floor(r() * 16);
      const h = 6 + Math.floor(r() * 22);
      this.skyline.push({ x, w, h, seed: Math.floor(r() * 9999) });
      x += w + 1 + Math.floor(r() * 3);
    }
  }

  private buildWalkers() {
    const prev = this.walkers;
    this.walkers = [];
    const all = [this.boss, ...this.staff];
    for (let i = 0; i < this.desks.length; i++) {
      const d = this.desks[i];
      const who = all[i];
      if (!who) continue;
      const look = lookFrom(who.name + i, who.color, i === 0 ? 5 : undefined);
      const old = prev.find((w) => w.desk === i && w.look.key === look.key);
      this.walkers.push(
        old ?? {
          desk: i,
          x: d.x + 8,
          y: d.base,
          homeX: d.x + 8,
          homeY: d.base,
          state: "sit",
          target: null,
          t: 0,
          next: 2500 + Math.random() * 9000,
          dir: 1,
          view: "front",
          look,
          seed: Math.floor(Math.random() * 1000),
        },
      );
      /* keep the seat glued to the desk after a relayout */
      if (old) {
        old.homeX = d.x + 8;
        old.homeY = d.base;
        if (old.state === "sit") {
          old.x = old.homeX;
          old.y = old.homeY;
        }
      }
    }
  }

  /* --------------------------------------------------------------- update */

  update(dt: number) {
    this.clock += dt;

    /* ease the clock towards the new phase so dawn/dusk roll in gently
       (shortest way round, so night → morning doesn't run backwards) */
    let d = this.todTarget - this.tod;
    if (d > 0.5) d -= 1;
    if (d < -0.5) d += 1;
    this.tod = ((this.tod + d * Math.min(1, dt / 1400)) % 1 + 1) % 1;

    const speed = 0.03; // low-res px per ms

    for (const w of this.walkers) {
      w.t += dt;
      const tired = !!this.staff[w.desk - 1]?.tired;
      const sluggish = tired ? 0.72 : 1;

      if (w.state === "sit") {
        if (w.t < w.next) continue;
        const pool = this.spots.filter((s) => s.kind !== "board" || w.desk === 0);
        const spot = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
        if (spot) {
          w.target = spot;
          w.state = "walk";
          w.t = 0;
        } else {
          w.t = 0;
          w.next = 5000 + Math.random() * 8000;
        }
        continue;
      }

      if (w.state === "walk") {
        const goingHome = !w.target;
        const tx = goingHome ? w.homeX : w.target!.x;
        const ty = goingHome ? w.homeY : w.target!.y;
        const dx = tx - w.x;
        const dy = ty - w.y;
        const dist = Math.hypot(dx, dy);
        const step = speed * dt * sluggish;
        if (dist <= Math.max(step, 1.2)) {
          w.x = tx;
          w.y = ty;
          w.t = 0;
          if (goingHome) {
            w.state = "sit";
            w.view = "front";
            w.next = 5000 + Math.random() * 12000;
          } else {
            w.state = "act";
            w.view = w.target!.kind === "board" ? "back" : "front";
            if (w.target!.kind === "coffee") this.puffBurst(tx + 6, ty - 24, "steam", 5);
          }
        } else {
          w.x += (dx / dist) * step;
          w.y += (dy / dist) * step;
          if (Math.abs(dx) > Math.abs(dy) * 1.15) {
            w.view = "side";
            w.dir = dx >= 0 ? 1 : -1;
          } else {
            w.view = dy < 0 ? "back" : "front";
          }
        }
        continue;
      }

      /* act: hanging around a machine for a bit, then back to the desk */
      const at = w.target;
      if (at) {
        if ((at.kind === "coffee" || at.kind === "water") && Math.random() < dt / 850) {
          this.puffBurst(w.x + 6, w.y - 26, "steam", 1);
        }
        if (at.kind === "snack" && Math.random() < dt / 2400) {
          this.puffBurst(w.x + 4, w.y - 28, "spark", 2);
        }
      }
      if (w.t > 1800 + (w.seed % 2200)) {
        w.target = null; // null means "head home"
        w.state = "walk";
        w.t = 0;
      }
    }

    /* ambient dust drifting through the light */
    if (this.puffs.length < 30 && Math.random() < dt / 650) {
      this.puffs.push({
        x: Math.random() * this.W,
        y: this.wallBottom + Math.random() * (this.H - this.wallBottom),
        vx: (Math.random() - 0.5) * 0.004,
        vy: -0.003 - Math.random() * 0.005,
        life: 1,
        max: 1,
        kind: "dust",
      });
    }
    for (const q of this.puffs) {
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      q.life -= dt / (q.kind === "dust" ? 5200 : 1500);
    }
    this.puffs = this.puffs.filter((q) => q.life > 0);
  }

  private puffBurst(x: number, y: number, kind: Puff["kind"], n: number) {
    for (let i = 0; i < n; i++) {
      this.puffs.push({
        x: x + (Math.random() - 0.5) * 3,
        y: y + (Math.random() - 0.5) * 2,
        vx: (Math.random() - 0.5) * 0.008,
        vy: -0.012 - Math.random() * 0.01,
        life: 1 + Math.random() * 0.4,
        max: 1.4,
        kind,
      });
    }
  }

  /* ----------------------------------------------------------------- draw */

  draw(g: CanvasRenderingContext2D) {
    const p = new Pen(g);
    g.imageSmoothingEnabled = false;

    this.ensureBg();
    if (this.bg) g.drawImage(this.bg, 0, 0);

    this.drawOutside(p);
    this.drawWindowFrames(p);
    this.drawAmbient(p);

    /* furniture back-to-front, with each sitter sandwiched between their
       chair and their desk so the rows overlap believably */
    const order = this.desks.map((d, i) => ({ d, i })).sort((a, b) => a.d.base - b.d.base);
    for (const { d, i } of order) {
      g.drawImage(deskBackSprite(this.level, i % 3), d.x, d.base - DESK_H + 1);
      const sitter = this.walkers.find((w) => w.desk === i && w.state === "sit");
      if (sitter) this.drawWalker(p, sitter);
      g.drawImage(deskFrontSprite(this.level, i % 3), d.x, d.base - DESK_H + 1);
      this.drawScreenFor(p, d, i);
    }

    this.drawProps(p);

    /* anybody out of their chair walks in front of the desks */
    const roaming = this.walkers.filter((w) => w.state !== "sit").sort((a, b) => a.y - b.y);
    for (const w of roaming) this.drawWalker(p, w);

    this.drawParticles(p);
    this.drawGrade(p);
  }

  private drawScreenFor(p: Pen, d: Desk, i: number) {
    const who = i === 0 ? this.boss : this.staff[i - 1];
    const sp = new Pen(p.g);
    drawScreen(
      sp,
      d.x + DESK_SCREEN.x,
      d.base - DESK_H + 1 + DESK_SCREEN.y,
      DESK_SCREEN.w,
      DESK_SCREEN.h,
      d.screenKind,
      this.clock + i * 400,
      who ? who.color : "#3a3a55",
      !!who,
    );
  }

  /** Staff names — the component draws these in screen space so text stays crisp. */
  labelSpots(): { x: number; y: number; text: string; color: string; boss: boolean }[] {
    return this.desks
      .map((d, i) => {
        const who = i === 0 ? this.boss : this.staff[i - 1];
        if (!who) return null;
        return {
          x: d.x + DESK_CHAR_X + 7,
          y: d.base + 2,
          text: who.name.split(" ")[0],
          color: who.color,
          boss: i === 0,
        };
      })
      .filter(Boolean) as { x: number; y: number; text: string; color: string; boss: boolean }[];
  }

  hitDesk(sx: number, sy: number): number | null {
    for (let i = 0; i < this.desks.length; i++) {
      const d = this.desks[i];
      if (sx >= d.x && sx <= d.x + DESK_W && sy >= d.base - DESK_H && sy <= d.base + 2) return i;
    }
    return null;
  }

  /* ------------------------------------------------------------ background */

  private ensureBg() {
    const key = `${this.W}x${this.H}|${this.level}|${this.awards}`;
    if (this.bgKey === key && this.bg) return;
    this.bgKey = key;

    const th = this.th;
    const W = this.W;
    const H = this.H;
    const wb = this.wallBottom;
    const c = makeCanvas(W, H);
    const p = new Pen(ctx2d(c));

    /* ceiling */
    p.vgrad(0, 0, W, 9, [
      [0, shade(th.ceiling, -0.4)],
      [1, th.ceiling],
    ]);
    p.hline(0, 8, W, shade(th.ceiling, -0.55));

    /* wall */
    p.vgrad(0, 9, W, wb - 9, [
      [0, th.wallL],
      [0.55, th.wall],
      [1, th.wallD],
    ]);
    for (let x = 0; x < W; x += 8) p.vline(x, 9, wb - 11, mix(th.wall, th.wallL, 0.22));

    /* skirting + floor */
    p.rect(0, wb, W, 3, th.skirting);
    p.hline(0, wb, W, shade(th.skirting, 0.3));
    p.hline(0, wb + 2, W, shade(th.skirting, -0.4));
    p.vgrad(0, wb + 3, W, H - wb - 3, [
      [0, th.floorD],
      [0.35, th.floor],
      [1, shade(th.floor, 0.1)],
    ]);

    /* floor tiles in perspective */
    const tile = mix(th.floor, th.floorL, 0.3);
    let y = wb + 6;
    let step = 4;
    while (y < H) {
      p.hline(0, Math.round(y), W, tile);
      y += step;
      step *= 1.3;
    }
    for (let i = -8; i <= 8; i++) {
      p.line(W / 2 + i * (W / 14), wb + 3, W / 2 + i * (W / 5), H, tile);
    }

    /* rug */
    if (this.level >= 1) {
      const rw = Math.min(W - 60, 150);
      drawRug(p, (W - rw) / 2, H - 28, rw, 20, shade(th.accent, -0.55), shade(th.accent, -0.34));
    }

    /* wall furniture (static, so it lives in the cached background) */
    const shelfY = wb - 30;
    if (this.level >= 2) {
      const by = Math.max(10, Math.round(H * 0.1));
      c.getContext("2d")!.drawImage(boardSprite(this.level), 4, by);
    }
    for (let i = 0; i < this.win.length - 1 && i < 4; i++) {
      const gap = this.win[i + 1].x - (this.win[i].x + this.win[i].w);
      if (gap < 12) continue;
      const px = this.win[i].x + this.win[i].w + Math.round((gap - 12) / 2);
      c.getContext("2d")!.drawImage(posterSprite(i * 7 + this.level), px, Math.round(H * 0.13));
    }
    if (this.level >= 1) {
      const g2 = ctx2d(c);
      g2.drawImage(shelfSprite(this.level), W - 46, shelfY);
      if (this.awards > 0) {
        const n = Math.min(4, this.awards);
        const cols = [MAT.gold, "#d9d9e8", "#d9905a", MAT.gold];
        for (let i = 0; i < n; i++) g2.drawImage(trophySprite(cols[i]), W - 44 + i * 9, shelfY - 11);
      }
    }

    this.bg = c;
  }

  /* ----------------------------------------------------------- outside art */

  private drawOutside(p: Pen) {
    if (!this.win.length) return;
    const g = p.g;
    const W = this.W;
    const y0 = this.win[0].y;
    const h0 = this.win[0].h;
    const sky = skyAt(this.tod);
    const t = this.clock;

    g.save();
    g.beginPath();
    for (const w of this.win) g.rect(w.x, w.y, w.w, w.h);
    g.clip();

    /* flat sky bands keep the dithered pixel look instead of a smooth ramp */
    const bands = 6;
    for (let i = 0; i < bands; i++) {
      p.rect(0, y0 + Math.round((i * h0) / bands), W, Math.ceil(h0 / bands) + 1, mix(sky.top, sky.bottom, i / (bands - 1)));
    }

    /* stars */
    if (sky.night > 0.25) {
      const r = rng(4242);
      for (let i = 0; i < 48; i++) {
        const sx = Math.floor(r() * W);
        const sy = y0 + Math.floor(r() * (h0 * 0.6));
        const tw = (0.35 + 0.65 * Math.abs(Math.sin(t / 700 + i))) * sky.night;
        if (tw > 0.35) p.px(sx, sy, mix(sky.top, "#ffffff", tw));
      }
    }

    /* sun / moon tracking across the sky */
    const cyc = (this.tod + 0.15) % 1;
    const cx = Math.round(W * (0.08 + 0.86 * cyc));
    const cy = Math.round(y0 + h0 * 0.62 - Math.sin(Math.PI * clamp(cyc * 1.3, 0, 1)) * h0 * 0.45);
    if (sky.night < 0.6) {
      g.globalAlpha = 0.16;
      p.ellipse(cx, cy, 7, 7, "#ffe9a8");
      g.globalAlpha = 1;
      p.ellipse(cx, cy, 4, 4, mix("#ffe9a8", sky.glow, 0.3));
      p.ellipse(cx, cy, 3, 3, "#fff6cf");
    } else {
      g.globalAlpha = 0.12;
      p.ellipse(cx, cy, 6, 6, "#cfd8ff");
      g.globalAlpha = 1;
      p.ellipse(cx, cy, 3, 3, "#e8eeff");
      p.px(cx + 1, cy - 1, "#c9d3f0");
    }

    /* drifting clouds */
    const cloudC = mix("#ffffff", sky.bottom, clamp(1 - sky.night * 1.4, 0, 0.75));
    for (let i = 0; i < 4; i++) {
      const speed = 0.004 + i * 0.0016;
      const cw = 14 + i * 5;
      const cxx = ((t * speed + i * 90) % (W + 60)) - 30;
      const cyy = y0 + 2 + ((i * 7) % Math.max(3, h0 - 13));
      p.rect(Math.round(cxx), cyy + 1, cw, 2, cloudC);
      p.rect(Math.round(cxx) + 3, cyy, cw - 8, 1, cloudC);
      p.rect(Math.round(cxx) + 2, cyy + 3, cw - 5, 1, mix(cloudC, sky.bottom, 0.35));
    }

    /* skyline: far layer then the near layer with lit windows at night */
    const groundY = y0 + h0;
    const farC = mix(sky.bottom, "#1a2038", 0.55 + sky.night * 0.3);
    const nearC = mix(sky.bottom, "#0d1124", 0.82 + sky.night * 0.18);
    for (const b of this.skyline) {
      p.rect(b.x, groundY - b.h, b.w, b.h, farC);
      p.hline(b.x, groundY - b.h, b.w, mix(farC, sky.bottom, 0.35));
    }
    for (const b of this.skyline) {
      const bx = b.x + 3 + ((b.seed % 7) - 3);
      const bw = Math.max(4, b.w - 5);
      const bh = Math.round(b.h * 0.72);
      p.rect(bx, groundY - bh, bw, bh, nearC);
      if (sky.night > 0.3) {
        const r = rng(b.seed);
        for (let wy = groundY - bh + 2; wy < groundY - 2; wy += 3) {
          for (let wx = bx + 1; wx < bx + bw - 1; wx += 2) {
            if (r() < 0.4 && Math.sin(t / 900 + wx * 3 + wy) > -0.8) {
              p.px(wx, wy, mix("#ffd166", "#ff9f43", r()));
            }
          }
        }
      }
      if (bh > 15) {
        const mx = bx + (bw >> 1);
        p.vline(mx, groundY - bh - 3, 3, nearC);
        if (Math.sin(t / 420 + b.seed) > 0.2) p.px(mx, groundY - bh - 3, "#ff5e5e");
      }
    }
    g.restore();
  }

  private drawWindowFrames(p: Pen) {
    const th = this.th;
    for (const w of this.win) {
      p.rect(w.x - 2, w.y - 2, w.w + 4, 2, shade(th.wallL, -0.12));
      p.rect(w.x - 2, w.y + w.h, w.w + 4, 3, shade(th.wall, 0.14));
      p.rect(w.x - 2, w.y - 2, 2, w.h + 5, shade(th.wallL, -0.12));
      p.rect(w.x + w.w, w.y - 2, 2, w.h + 5, shade(th.wallL, -0.12));
      p.vline(w.x + (w.w >> 1), w.y, w.h, shade(th.wallL, -0.06));
      p.hline(w.x, w.y + (w.h >> 1), w.w, shade(th.wallL, -0.06));
      p.hline(w.x - 2, w.y + w.h + 2, w.w + 4, shade(th.wall, 0.3));
    }
  }

  /** shafts of daylight + ceiling lamp cones, drawn behind the furniture */
  private drawAmbient(p: Pen) {
    const g = p.g;
    const sky = skyAt(this.tod);
    if (sky.night < 0.75) {
      const strength = 0.1 * (1 - sky.night) * (this.tod < 0.45 ? 1 : 0.65);
      if (strength > 0.03) {
        g.globalAlpha = strength;
        for (const w of this.win) {
          const x0 = w.x + 2;
          const x1 = w.x + w.w - 6;
          for (let y = this.wallBottom + 3; y < this.H; y += 3) {
            const k = (y - this.wallBottom) / (this.H - this.wallBottom);
            p.rect(Math.round(lerp(x0, x0 - 14, k)), y, Math.round(lerp(x1 + 14, x1, k)) - Math.round(lerp(x0, x0 - 14, k)), 2, "#fff3c4");
          }
        }
        g.globalAlpha = 1;
      }
    }
    if (sky.night > 0.25) {
      const lampCount = this.level >= 2 ? 3 : 2;
      for (let i = 0; i < lampCount; i++) {
        const lx = ((i + 1) * this.W) / (lampCount + 1);
        const flick = 0.85 + 0.15 * Math.sin(this.clock / 90 + i * 2.1);
        g.globalAlpha = 0.08 * sky.night * flick;
        for (let y = 6; y < this.H; y += 2) {
          const half = 6 + (y - 6) * 0.3;
          p.rect(Math.round(lx - half), y, Math.round(half * 2), 2, "#ffd98a");
        }
        g.globalAlpha = 1;
        g.drawImage(lampSprite(), Math.round(lx - 8), 2);
        p.vline(Math.round(lx - 5), 0, 2, MAT.metalD);
        p.vline(Math.round(lx + 4), 0, 2, MAT.metalD);
      }
      g.globalAlpha = 0.06 * sky.night;
      p.ellipse(this.W / 2, this.H - 30, this.W * 0.4, 26, "#ffcf7a");
      g.globalAlpha = 1;
    } else {
      const lampCount = this.level >= 2 ? 3 : 2;
      for (let i = 0; i < lampCount; i++) {
        const lx = ((i + 1) * this.W) / (lampCount + 1);
        g.drawImage(lampSprite(), Math.round(lx - 8), 2);
        p.vline(Math.round(lx - 5), 0, 2, MAT.metalD);
        p.vline(Math.round(lx + 4), 0, 2, MAT.metalD);
      }
    }
  }

  /* ------------------------------------------------------------- furniture */

  private drawProps(p: Pen) {
    const W = this.W;
    const H = this.H;
    const wb = this.wallBottom;
    const g = p.g;
    const hasPong = this.level >= 3 && W >= 250;

    /* ---- right-hand wall: shelf of trophies + clock (drawn with the room) */

    /* ---- right column: coffee machine, snack machine, plant */
    g.drawImage(coffeeSprite(), W - 24, wb - 4);
    if (this.level >= 1) g.drawImage(snackSprite(), W - 24, wb + 28);
    g.drawImage(plantSprite(this.level), W - 18, H - 22);

    /* ---- left column: water cooler, server rack, sofa, plant */
    g.drawImage(waterSprite(), 8, wb - 4);
    if (this.level >= 3) g.drawImage(serverSprite(), 6, wb + 20);
    if (this.level >= 2) g.drawImage(sofaSprite(), 2, H - 32);
    if (this.level >= 1) g.drawImage(plantSprite(this.level + 3), W - 36, H - 20);

    /* ping-pong table, ball only moves while somebody is playing */
    if (hasPong) {
      g.drawImage(pongSprite(), 34, H - 18);
      const playing = this.walkers.some((w) => w.state === "act" && w.target?.kind === "pong");
      if (playing) {
        const bx = 40 + Math.abs(Math.sin(this.clock / 420)) * 24;
        const by = H - 28 - Math.abs(Math.sin(this.clock / 210)) * 7;
        p.rect(Math.round(bx), Math.round(by), 2, 2, MAT.white);
      }
    }

    /* wall clock — the only wall prop that moves */
    g.drawImage(clockSprite(this.clock / 1200), W - 15, 12);

    /* the studio cat, asleep wherever it is warmest */
    const catFrame = Math.floor(this.clock / 900) % 2;
    if (this.level >= 2) g.drawImage(catSprite(catFrame), 13, H - 34);
    else g.drawImage(catSprite(catFrame), 30, H - 12);
  }

  private drawWalker(p: Pen, w: Walker) {
    const seated = w.state === "sit";
    const sipping = w.state === "act" && !!w.target && (w.target.kind === "coffee" || w.target.kind === "water" || w.target.kind === "snack");
    const mode = seated ? "sit" : sipping ? "sip" : w.state === "walk" ? "walk" : "idle";
    const frameMs = mode === "walk" ? 105 : mode === "sit" ? 240 : mode === "sip" ? 300 : 480;
    const frame = Math.floor((this.clock + w.seed * 37) / frameMs);
    const spr = charSprite(w.look, mode, w.view, frame);
    const g = p.g;
    const x = Math.round(w.x - CHAR_W / 2);
    const y = Math.round(w.y - CHAR_H + 1);
    if (w.view === "side" && w.dir < 0) {
      g.save();
      g.translate(x + CHAR_W, y);
      g.scale(-1, 1);
      g.drawImage(spr, 0, 0);
      g.restore();
    } else {
      g.drawImage(spr, x, y);
    }
    if (seated && this.staff[w.desk - 1]?.tired && Math.floor(this.clock / 600) % 4 < 3) {
      drawZed(p, Math.round(w.x) + 4, y - 3 - (Math.floor(this.clock / 320) % 3), 1 + (Math.floor(this.clock / 320) % 3));
    }
  }

  private drawParticles(p: Pen) {
    const g = p.g;
    for (const q of this.puffs) {
      const a = clamp(q.life / q.max, 0, 1);
      if (q.kind === "steam") {
        g.globalAlpha = 0.4 * a;
        p.rect(Math.round(q.x), Math.round(q.y), 2, 2, "#e9e6f5");
        p.px(Math.round(q.x), Math.round(q.y) - 1, "#ffffff");
      } else if (q.kind === "dust") {
        g.globalAlpha = 0.28 * a * (0.5 + 0.5 * Math.sin(this.clock / 400 + q.x));
        p.px(Math.round(q.x), Math.round(q.y), "#fff3c4");
      } else {
        g.globalAlpha = a;
        p.px(Math.round(q.x), Math.round(q.y), MAT.gold);
      }
      g.globalAlpha = 1;
    }
  }

  /** final colour grade: night tint, dusk warmth and a vignette */
  private drawGrade(p: Pen) {
    const sky = skyAt(this.tod);
    const g = p.g;
    if (sky.night > 0.2) {
      g.globalAlpha = 0.32 * sky.night;
      p.rect(0, 0, this.W, this.H, "#0a1030");
      g.globalAlpha = 1;
    } else if (this.tod > 0.5) {
      g.globalAlpha = 0.1 * (1 - sky.night);
      p.rect(0, 0, this.W, this.H, "#ff9a62");
      g.globalAlpha = 1;
    }
    g.globalAlpha = 0.16;
    p.rect(0, 0, this.W, 2, "#0a0714");
    p.rect(0, this.H - 2, this.W, 2, "#0a0714");
    p.vline(0, 0, this.H, "#0a0714");
    p.vline(this.W - 1, 0, this.H, "#0a0714");
    g.globalAlpha = 1;
  }
}

/* --------------------------------------------------------------- helpers */

/** 3x3 pixel "Z" for the sleepy status pip */
function drawZed(p: Pen, x: number, y: number, size: number) {
  const c = "#cfd8ff";
  for (let s = 0; s < size; s++) {
    const ox = x + s * 3;
    const oy = y - s * 2;
    p.hline(ox, oy, 3, c);
    p.px(ox + 1, oy + 1, c);
    p.hline(ox, oy + 2, 3, c);
  }
}

export { drawScreen } from "./props";
