/**
 * floor.ts — pixel art for the production floor (the bubble-popping phase).
 *
 * The minigame keeps its smooth CSS-pixel physics; only the drawing snaps to a
 * chunky grid (`u` = one art pixel), so the staff, desks and bubbles match the
 * studio scene instead of looking like left-over vector shapes.
 */

import type { Look } from "./chars";
import { MAT, themeFor } from "./props";
import { Pen, rng, shade, sprite, spriteOutlined, hash } from "./pen";
export { lookFrom } from "./chars";

export const PROD_W = 20;
export const PROD_H = 20;

/** chair + the crew member sitting at it: everything behind the desk slab */
export function prodDeskBack(look: Look): HTMLCanvasElement {
  return spriteOutlined(`pdb|${look.key}`, PROD_W, PROD_H, (p) => {
    /* chair */
    p.rect(3, 6, 10, 11, shade(look.top, -0.62));
    p.rect(4, 7, 8, 9, shade(look.top, -0.52));
    p.hline(4, 7, 8, shade(look.top, -0.4));
    /* head */
    p.rect(4, 1, 6, 1, look.hair);
    p.rect(3, 2, 8, 3, look.hair);
    p.hline(3, 2, 8, look.hairL);
    p.rect(3, 5, 8, 4, look.skin);
    p.vline(3, 2, 6, look.hair);
    p.vline(10, 2, 6, look.hairD);
    p.rect(4, 6, 2, 2, "#130f1e");
    p.rect(7, 6, 2, 2, "#130f1e");
    p.px(4, 6, "#ffffff");
    p.px(7, 6, "#ffffff");
    p.hline(5, 8, 3, look.skinS);
    /* torso */
    p.rect(3, 9, 8, 8, look.top);
    p.hline(3, 9, 8, look.topL);
    p.rect(4, 9, 6, 1, shade(look.top, 0.42));
    p.px(6, 11, look.acc);
    p.px(6, 13, look.acc);
    /* sleeves */
    p.rect(1, 10, 2, 6, look.topD);
    p.rect(12, 10, 2, 6, look.topD);
  });
}

/** desk slab, monitor, keyboard and the typing hands — in front of the crew */
export function prodDeskFront(color: string, level: number, frame: number): HTMLCanvasElement {
  const th = themeFor(Math.min(4, level));
  return spriteOutlined(`pdf|${color}|${level}|${frame}`, PROD_W, PROD_H, (p) => {
    /* monitor */
    p.rect(10, 3, 10, 10, MAT.dark);
    p.rect(11, 4, 8, 8, MAT.screen);
    for (let i = 0; i < 6; i++) {
      const hgt = 1 + Math.abs(Math.sin((frame + i) * 0.8)) * 5;
      p.vline(12 + i, 11 - Math.floor(hgt), Math.floor(hgt) + 1, i % 2 === 0 ? color : shade(color, -0.35));
    }
    p.px(18, 11, MAT.green);
    /* mug + keyboard sit on the slab */
    p.rect(1, 11, 3, 4, MAT.white);
    p.hline(1, 11, 3, "#ffffff");
    p.rect(1, 12, 3, 1, color);
    /* typing hands */
    const t = frame % 2 === 0 ? 0 : 1;
    p.rect(3, 12 + t, 3, 2, "#f2ecdf");
    p.rect(8, 13 - t, 3, 2, "#f2ecdf");
    p.rect(4, 13, 7, 2, MAT.metalD);
    p.hline(4, 13, 7, MAT.metalL);
    /* slab + front panel */
    p.rect(0, 14, PROD_W, 3, th.desk);
    p.hline(0, 14, PROD_W, th.deskL);
    p.hline(0, 16, PROD_W, th.deskD);
    p.rect(0, 17, PROD_W, 3, shade(th.desk, -0.42));
  });
}

/* ---------------------------------------------------------------- bubbles */

const BUB = 15;
const BC = 7; // centre of a 15x15 bubble

export type BubbleKind = "point" | "star" | "bug";

/**
 * A thought bubble with the crew member's face floating in it (or a sparkle /
 * an angry editing note). Drawn on a 15x15 grid and cached.
 */
export function bubbleSprite(
  kind: BubbleKind,
  color: string,
  look: Look | null,
  frame: number,
  /** 0..3 — how strong the producer is; stronger bubbles get a brighter rim */
  tier = 0
): HTMLCanvasElement {
  return spriteOutlined(`bub|${kind}|${color}|${look?.key ?? "-"}|${frame}|${tier}`, BUB, BUB, (p) => {
    const fill = kind === "bug" ? "#ff4d4d" : kind === "star" ? "#ffd166" : color;
    const dark = shade(fill, -0.55);
    const light = shade(fill, 0.3);
    for (let y = 0; y < BUB; y++) {
      for (let x = 0; x < BUB; x++) {
        const d = Math.hypot(x - BC, y - BC);
        if (d > 7.1) continue;
        p.px(x, y, d > 6.1 ? dark : d > 4.6 ? fill : light);
      }
    }
    /* skilled producers ship brighter work: a lit rim and extra sparkle */
    if (tier > 0 && kind !== "bug") {
      const rim = kind === "star" ? "#fff6cf" : mix0(light, "#ffffff", 0.55);
      for (let y = 0; y < BUB; y++) {
        for (let x = 0; x < BUB; x++) {
          const d = Math.hypot(x - BC, y - BC);
          if (d > 6.1 && d <= 7.1 && x + y > 13) p.px(x, y, rim);
        }
      }
      if (tier >= 2) {
        p.px(BC + 3, BC - 4, "#ffffff");
        p.px(BC + 4, BC - 3, "#ffffff");
      }
      if (tier >= 3) {
        p.px(BC + 3, BC + 4, "#ffffff");
        p.px(BC + 4, BC + 3, "#ffffff");
        p.px(BC + 4, BC - 4, mix0(light, "#ffffff", 0.8));
      }
    }

    /* glass highlight, top left */
    p.px(BC - 3, BC - 4, "#ffffff");
    p.px(BC - 4, BC - 3, "#ffffff");
    p.px(BC - 3, BC - 3, "#ffffff");
    p.px(BC - 2, BC - 4, mix0(fill, "#ffffff", 0.55));

    if (kind === "star") {
      /* four point sparkle */
      const c = "#fff6cf";
      p.vline(BC, BC - 4, 9, c);
      p.hline(BC - 4, BC, 9, c);
      p.px(BC - 2, BC - 2, c);
      p.px(BC + 2, BC - 2, c);
      p.px(BC - 2, BC + 2, c);
      p.px(BC + 2, BC + 2, c);
      p.rect(BC - 1, BC - 1, 2, 2, "#ffffff");
      p.px(BC - 4, BC - 4, c);
      p.px(BC + 4, BC + 4, c);
      p.px(BC + 4, BC - 4, c);
      p.px(BC - 4, BC + 4, c);
      return;
    }
    if (kind === "bug") {
      /* editing note: scowling face */
      const k = "#2a0a12";
      p.rect(BC - 4, BC - 2, 3, 3, k);
      p.rect(BC + 2, BC - 2, 3, 3, k);
      p.px(BC - 5, BC - 4, k);
      p.px(BC - 4, BC - 3, k);
      p.px(BC + 4, BC - 4, k);
      p.px(BC + 3, BC - 3, k);
      p.hline(BC - 2, BC + 3, 5, k);
      p.px(BC - 3, BC + 4, k);
      p.px(BC + 3, BC + 4, k);
      return;
    }
    /* point bubble: the crew member's face */
    const skin = look?.skin ?? "#f7d7b4";
    const hair = look?.hair ?? "#2a2033";
    const skinS = look?.skinS ?? shade(skin, -0.22);
    p.rect(BC - 4, BC - 4, 9, 3, hair);
    p.hline(BC - 4, BC - 4, 9, shade(hair, 0.3));
    p.rect(BC - 5, BC - 2, 1, 5, hair);
    p.rect(BC + 5, BC - 2, 1, 5, shade(hair, -0.2));
    p.rect(BC - 4, BC - 1, 9, 6, skin);
    const blink = frame % 5 === 4;
    if (blink) {
      p.hline(BC - 3, BC + 1, 3, "#130f1e");
      p.hline(BC + 1, BC + 1, 3, "#130f1e");
    } else {
      p.rect(BC - 3, BC, 3, 3, "#130f1e");
      p.rect(BC + 1, BC, 3, 3, "#130f1e");
      p.px(BC - 3, BC, "#ffffff");
      p.px(BC + 1, BC, "#ffffff");
    }
    p.hline(BC - 1, BC + 3, 3, skinS);
    p.px(BC - 5, BC + 2, "#f08a8a");
    p.px(BC + 5, BC + 2, "#f08a8a");
  });
}

function mix0(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const r = Math.round(((pa >> 16) & 255) * (1 - t) + ((pb >> 16) & 255) * t);
  const g = Math.round(((pa >> 8) & 255) * (1 - t) + ((pb >> 8) & 255) * t);
  const bl = Math.round((pa & 255) * (1 - t) + (pb & 255) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

/* ------------------------------------------------------------ environment */

/**
 * Pixel backdrop for the production floor: a wall of windows over a city, the
 * studio floor, and a couple of pot plants. Cached per size + phase of day.
 */
export function floorRoom(w: number, h: number, tod: number): HTMLCanvasElement {
  const key = `floorRoom|${w}x${h}|${Math.round(tod * 8)}`;
  return sprite(key, w, h, (p) => {
    const th = themeFor(1);
    const wb = Math.round(h * 0.38);
    /* ceiling + wall */
    p.dgrad(0, 0, w, 6, [
      [0, shade(th.ceiling, -0.4)],
      [1, th.ceiling],
    ]);
    p.hline(0, 5, w, shade(th.ceiling, -0.55));
    p.dgrad(0, 6, w, wb - 6, [
      [0, th.wallL],
      [0.6, th.wall],
      [1, th.wallD],
    ]);
    /* windows */
    const wy = Math.round(h * 0.1);
    const wh = Math.max(10, Math.round(h * 0.2));
    const count = Math.max(2, Math.floor(w / 46));
    const margin = 8;
    const gap = 8;
    const ww = Math.floor((w - margin * 2 - gap * (count - 1)) / count);
    const r = rng(hash(`floor${w}x${h}`));
    for (let i = 0; i < count; i++) {
      const x = margin + i * (ww + gap);
      /* sky */
      p.dgrad(x, wy, ww, wh, [
        [0, tod > 0.7 ? "#0a1030" : tod > 0.45 ? "#ff8a5c" : "#4aa8f0"],
        [1, tod > 0.7 ? "#1a1a3a" : tod > 0.45 ? "#6a3f7a" : "#a7dcff"],
      ]);
      /* skyline */
      let bx = x + 1;
      while (bx < x + ww - 2) {
        const bw = 3 + Math.floor(r() * 6);
        const bh = 3 + Math.floor(r() * (wh - 6));
        p.rect(bx, wy + wh - bh, bw, bh, tod > 0.7 ? "#0d1124" : mix0("#1a2038", "#a7dcff", 0.35));
        if (tod > 0.65) {
          for (let yy = wy + wh - bh + 1; yy < wy + wh - 1; yy += 3)
            for (let xx = bx + 1; xx < bx + bw - 1; xx += 2) if (r() < 0.4) p.px(xx, yy, "#ffd166");
        }
        bx += bw + 1;
      }
      /* frame */
      p.rect(x - 1, wy - 1, ww + 2, 1, shade(th.wallL, -0.1));
      p.rect(x - 1, wy + wh, ww + 2, 2, shade(th.wall, 0.12));
      p.rect(x - 1, wy - 1, 1, wh + 3, shade(th.wallL, -0.1));
      p.rect(x + ww, wy - 1, 1, wh + 3, shade(th.wallL, -0.1));
      p.vline(x + (ww >> 1), wy, wh, shade(th.wallL, -0.05));
    }
    /* floor */
    p.rect(0, wb, w, 2, th.skirting);
    p.dgrad(0, wb + 2, w, h - wb - 2, [
      [0, th.floorD],
      [0.4, th.floor],
      [1, shade(th.floor, 0.1)],
    ]);
    const tile = mix0(th.floor, th.floorL, 0.3);
    let y = wb + 4;
    let step = 3;
    while (y < h) {
      p.hline(0, Math.round(y), w, tile);
      y += step;
      step *= 1.3;
    }
    for (let i = -6; i <= 6; i++) p.line(w / 2 + i * (w / 10), wb + 2, w / 2 + i * (w / 4), h, tile);
  });
}

/** a chunky pixel burst for pop feedback */
export function drawChunk(p: Pen, x: number, y: number, size: number, color: string) {
  p.rect(x, y, size, size, color);
}
