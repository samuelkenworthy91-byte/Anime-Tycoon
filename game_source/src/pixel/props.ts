/**
 * props.ts — the furniture, appliances and clutter that make the studio.
 *
 * Every prop is hand-plotted at 1px resolution so it survives being scaled up
 * with nearest-neighbour. Props are cached per (type, tier, variant).
 */

import { hash, mix, Pen, rng, shade, sprite } from "./pen";

/* ------------------------------------------------------------- materials */

export const MAT = {
  outline: "#120e1c",
  wood: "#7a4a2c",
  woodL: "#9c6238",
  woodD: "#4b2c18",
  metal: "#4a4a63",
  metalL: "#6d6d8a",
  metalD: "#2c2c40",
  dark: "#211c33",
  screen: "#0c1120",
  screenL: "#1d2846",
  paper: "#f4eee0",
  paperD: "#c9c1ad",
  green: "#3f8f5c",
  greenL: "#63c184",
  greenD: "#275c3c",
  gold: "#ffd166",
  goldD: "#c2902f",
  glass: "#8fd4ff",
  glassD: "#3f7fd9",
  red: "#ff5e5e",
  pink: "#ff4d8d",
  cyan: "#3be1ff",
  white: "#efe9dc",
};

/* ----------------------------------------------------------- tier themes */

export interface Theme {
  name: string;
  wall: string;
  wallL: string;
  wallD: string;
  floor: string;
  floorL: string;
  floorD: string;
  skirting: string;
  desk: string;
  deskL: string;
  deskD: string;
  chair: string;
  chairD: string;
  accent: string;
  accent2: string;
  ceiling: string;
}

export const TIERS: Theme[] = [
  {
    name: "bedroom",
    wall: "#4b3f5e", wallL: "#5c4f72", wallD: "#372e48",
    floor: "#7a5233", floorL: "#8d6040", floorD: "#5c3c25",
    skirting: "#3a2f4a",
    desk: "#8a5a3b", deskL: "#a97249", deskD: "#5b3a24",
    chair: "#3b3350", chairD: "#292340",
    accent: "#ff8fc7", accent2: "#ffd166",
    ceiling: "#3b3150",
  },
  {
    name: "anime-runner",
    wall: "#3b3a63", wallL: "#4a4979", wallD: "#2c2b4c",
    floor: "#4c3c5c", floorL: "#5c4a6e", floorD: "#392c48",
    skirting: "#2e2d4d",
    desk: "#8d6a45", deskL: "#a98355", deskD: "#5f4529",
    chair: "#3a3a5e", chairD: "#282845",
    accent: "#3be1ff", accent2: "#ff4d8d",
    ceiling: "#2f2e50",
  },
  {
    name: "sakuga-tower",
    wall: "#2f4a6e", wallL: "#3d5d85", wallD: "#22374f",
    floor: "#3b3a58", floorL: "#4a4969", floorD: "#2b2a42",
    skirting: "#26374f",
    desk: "#b9c2d6", deskL: "#d5dbe8", deskD: "#7f89a0",
    chair: "#2f3c56", chairD: "#202a3d",
    accent: "#ffd166", accent2: "#3be1ff",
    ceiling: "#26374f",
  },
  {
    name: "neo-district",
    wall: "#2c2350", wallL: "#382c62", wallD: "#1f1839",
    floor: "#241f3a", floorL: "#2f2947", floorD: "#191528",
    skirting: "#1a1530",
    desk: "#3a3352", deskL: "#4d4468", deskD: "#26213a",
    chair: "#2b2545", chairD: "#1d1932",
    accent: "#3be1ff", accent2: "#ff4d8d",
    ceiling: "#1c1734",
  },
  {
    name: "global-campus",
    wall: "#332c5c", wallL: "#413870", wallD: "#241f43",
    floor: "#4a4568", floorL: "#5a5479", floorD: "#37324e",
    skirting: "#282248",
    desk: "#d8d3e4", deskL: "#efe9dc", deskD: "#9a94ad",
    chair: "#38325a", chairD: "#262140",
    accent: "#ffd166", accent2: "#5ef0c0",
    ceiling: "#291f4a",
  },
];

export const themeFor = (level: number) => TIERS[Math.max(0, Math.min(TIERS.length - 1, level))];

/* --------------------------------------------------------------- the desk */

export const DESK_W = 32;
export const DESK_H = 22;
/** where the character stands relative to the desk sprite */
export const DESK_CHAR_X = 1;
/** screen rect inside the desk sprite (animated every frame) */
export const DESK_SCREEN = { x: 20, y: 5, w: 10, h: 9 };

/** chair + everything behind the sitting character */
export function deskBackSprite(tier: number, variant: number): HTMLCanvasElement {
  const th = themeFor(tier);
  return sprite(`deskB|${tier}|${variant}`, DESK_W, DESK_H, (p) => {
    /* chair back */
    p.box(4, 3, 9, 9, th.chair, MAT.outline);
    p.rect(5, 4, 7, 7, shade(th.chair, 0.08));
    p.hline(5, 4, 7, shade(th.chair, 0.2));
    p.hline(5, 9, 7, th.chairD);
    /* seat */
    p.box(3, 12, 11, 4, shade(th.chair, -0.12), MAT.outline);
    p.hline(4, 12, 9, shade(th.chair, 0.14));
    /* post + castor base */
    p.vline(8, 16, 3, MAT.metalD);
    p.hline(5, 19, 7, MAT.metalD);
    p.px(5, 20, MAT.metalD);
    p.px(11, 20, MAT.metalD);
  });
}

/** desk slab, monitor and desk clutter — drawn in front of the character */
export function deskFrontSprite(tier: number, variant: number): HTMLCanvasElement {
  const th = themeFor(tier);
  const r = rng(hash(`desk${tier}${variant}`));
  return sprite(`deskF|${tier}|${variant}`, DESK_W, DESK_H, (p) => {
    /* monitor: stand, bezel, screen */
    p.rect(23, 13, 5, 3, MAT.metalD);
    p.rect(21, 15, 9, 1, MAT.metal);
    p.box(19, 4, 12, 11, MAT.dark, MAT.outline);
    p.rect(20, 5, 10, 9, MAT.screen);
    p.px(27, 13, tier >= 2 ? MAT.cyan : MAT.gold); // power LED
    p.hline(20, 5, 10, MAT.screenL);

    /* desk surface */
    p.rect(0, 14, DESK_W, 3, th.desk);
    p.hline(0, 14, DESK_W, th.deskL);
    p.hline(0, 16, DESK_W, th.deskD);
    /* front panel */
    p.rect(1, 17, DESK_W - 2, 5, shade(th.desk, -0.35));
    p.hline(1, 17, DESK_W - 2, shade(th.desk, -0.18));
    p.vline(1, 17, 5, shade(th.desk, -0.5));
    p.vline(DESK_W - 2, 17, 5, shade(th.desk, -0.5));
    if (tier >= 3) {
      /* neon strip under the lip of the fancy desks */
      p.hline(2, 18, DESK_W - 4, th.accent);
      p.hline(2, 19, DESK_W - 4, shade(th.accent, -0.5));
    }

    /* keyboard */
    p.rect(5, 13, 9, 2, MAT.metalD);
    p.hline(5, 13, 9, MAT.metalL);
    for (let i = 0; i < 4; i++) p.px(6 + i * 2, 13, MAT.metal);

    /* mug */
    const mugX = 15;
    p.rect(mugX, 11, 4, 4, MAT.white);
    p.rect(mugX + 3, 12, 2, 2, MAT.white);
    p.hline(mugX, 11, 4, shade(MAT.white, 0.2));
    p.rect(mugX, 12, 4, 1, variant % 2 === 0 ? MAT.pink : MAT.cyan);

    /* paper stack + pen */
    p.rect(1, 12, 5, 3, MAT.paper);
    p.hline(1, 12, 5, "#ffffff");
    p.hline(1, 13, 4, MAT.paperD);
    p.hline(1, 14, 3, MAT.paperD);
    p.px(2, 11, MAT.red);

    /* desk lamp on the posher desks */
    if (tier >= 2) {
      p.rect(13, 8, 1, 6, MAT.metalD);
      p.hline(11, 8, 5, MAT.metalD);
      p.rect(10, 7, 3, 2, th.accent);
      p.rect(10, 9, 3, 1, shade(th.accent, 0.35));
    }
    /* little plant / figure for character */
    if (variant % 3 === 1) {
      p.rect(30, 12, 2, 2, MAT.greenD);
      p.rect(29, 10, 4, 2, MAT.green);
      p.px(30, 9, MAT.greenL);
    } else if (variant % 3 === 2 && r() > 0.3) {
      /* stacked boxes of storyboards */
      p.rect(28, 11, 4, 3, MAT.paperD);
      p.hline(28, 11, 4, MAT.paper);
      p.rect(28, 14, 4, 1, MAT.paperD);
    }
  });
}

/** animated monitor contents: code, waveforms, timelines, spreadsheets */
export function drawScreen(
  p: Pen,
  x: number,
  y: number,
  w: number,
  h: number,
  kind: number,
  t: number,
  color: string,
  busy: boolean,
) {
  p.rect(x, y, w, h, MAT.screen);
  if (!busy) {
    /* screensaver / standby */
    p.rect(x, y + h - 1, w, 1, shade(MAT.screen, 0.12));
    return;
  }
  const seed = Math.floor(t / 260);
  if (kind % 4 === 0) {
    /* scrolling code lines */
    for (let i = 0; i < h - 1; i++) {
      const len = 2 + ((seed * 7 + i * 5) % (w - 3));
      const yy = y + ((i + seed) % (h - 1));
      p.hline(x + 1, yy, len, i % 3 === 0 ? color : shade(color, -0.35));
    }
  } else if (kind % 4 === 1) {
    /* equaliser bars */
    for (let i = 0; i < w - 2; i++) {
      const bh = 1 + Math.abs(Math.sin((t / 340) + i * 0.9)) * (h - 3);
      p.vline(x + 1 + i, y + h - 2 - Math.floor(bh), Math.floor(bh) + 1, i % 3 === 0 ? color : shade(color, -0.3));
    }
  } else if (kind % 4 === 2) {
    /* timeline with a playhead */
    p.hline(x + 1, y + 2, w - 2, shade(MAT.screen, 0.35));
    for (let i = 0; i < w - 3; i++) {
      if ((i + seed) % 3 === 0) p.rect(x + 1 + i, y + 3, 2, 3, shade(color, -0.25));
    }
    const head = 1 + (Math.floor(t / 220) % (w - 2));
    p.vline(x + head, y + 1, h - 2, MAT.white);
    p.rect(x + 1, y + h - 3, w - 2, 1, color);
  } else {
    /* spreadsheet / storyboard grid */
    for (let j = 0; j < h - 1; j += 2) {
      p.hline(x + 1, y + 1 + j, w - 2, shade(MAT.screen, 0.22));
      for (let i = 0; i < w - 2; i += 3) {
        if (((i + j + seed) & 3) === 0) p.rect(x + 1 + i, y + 1 + j, 2, 1, color);
      }
    }
  }
  /* scanline sheen */
  const scan = y + (Math.floor(t / 90) % h);
  p.hline(x, scan, w, mix(MAT.screen, "#ffffff", 0.07));
}

/* -------------------------------------------------------------- appliances */

/** coffee machine — the social hub of any studio */
export function coffeeSprite(): HTMLCanvasElement {
  return sprite("coffee", 16, 24, (p) => {
    p.box(1, 2, 14, 20, MAT.metal, MAT.outline);
    p.rect(2, 3, 12, 8, MAT.dark);
    /* display */
    p.rect(3, 4, 10, 4, MAT.screen);
    p.hline(4, 5, 8, MAT.cyan);
    p.hline(4, 6, 5, MAT.gold);
    /* buttons */
    p.rect(3, 9, 3, 2, MAT.red);
    p.rect(7, 9, 3, 2, MAT.green);
    p.rect(11, 9, 3, 2, MAT.gold);
    /* nozzle + tray */
    p.rect(6, 13, 4, 3, MAT.metalD);
    p.rect(3, 18, 10, 2, MAT.metalL);
    p.rect(4, 16, 8, 2, MAT.dark);
    /* cup */
    p.rect(6, 15, 4, 3, MAT.white);
    p.hline(6, 15, 4, "#ffffff");
    /* base */
    p.rect(0, 22, 16, 2, MAT.metalD);
    p.hline(0, 22, 16, MAT.metal);
  });
}

export function waterSprite(): HTMLCanvasElement {
  return sprite("water", 12, 24, (p) => {
    p.box(1, 8, 10, 14, MAT.metalL, MAT.outline);
    p.rect(2, 9, 8, 12, shade(MAT.metalL, 0.1));
    /* bottle */
    p.box(2, 0, 8, 9, MAT.glass, MAT.outline);
    p.rect(3, 1, 6, 7, shade(MAT.glass, 0.25));
    p.hline(3, 2, 6, "#ffffff");
    p.rect(4, 4, 4, 4, shade(MAT.glassD, 0.1));
    /* tap */
    p.rect(4, 12, 4, 2, MAT.metalD);
    p.rect(5, 14, 2, 2, MAT.metal);
    p.rect(3, 16, 6, 2, MAT.metalD);
    p.rect(1, 22, 10, 2, MAT.metalD);
  });
}

export function snackSprite(): HTMLCanvasElement {
  return sprite("snack", 16, 26, (p) => {
    p.box(0, 0, 16, 24, "#2a2a44", MAT.outline);
    p.rect(1, 1, 11, 18, MAT.screen);
    /* snacks behind glass */
    const cols = [MAT.pink, MAT.cyan, MAT.gold, MAT.green];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const col = cols[(r * 3 + c) % cols.length];
        p.rect(2 + c * 3, 2 + r * 6, 3, 4, col);
        p.hline(2 + c * 3, 2 + r * 6, 3, shade(col, 0.3));
      }
    }
    /* glass sheen */
    p.vline(3, 1, 18, mix(MAT.screen, "#ffffff", 0.12));
    p.vline(4, 1, 18, mix(MAT.screen, "#ffffff", 0.05));
    /* panel */
    p.rect(12, 1, 3, 18, MAT.dark);
    for (let i = 0; i < 4; i++) p.rect(13, 3 + i * 4, 1, 2, [MAT.red, MAT.gold, MAT.green, MAT.cyan][i]);
    /* delivery slot */
    p.rect(2, 20, 12, 3, MAT.metalD);
    p.rect(0, 24, 16, 2, MAT.metalD);
  });
}

export function pongSprite(): HTMLCanvasElement {
  return sprite("pong", 36, 16, (p) => {
    /* table */
    p.rect(0, 4, 36, 6, MAT.green);
    p.hline(0, 4, 36, MAT.greenL);
    p.hline(0, 9, 36, MAT.greenD);
    /* net */
    p.rect(17, 0, 2, 7, MAT.white);
    p.hline(17, 0, 2, "#ffffff");
    /* legs */
    p.rect(3, 10, 2, 6, MAT.metalD);
    p.rect(31, 10, 2, 6, MAT.metalD);
    p.hline(2, 15, 4, MAT.metal);
    p.hline(30, 15, 4, MAT.metal);
  });
}

export function plantSprite(variant: number): HTMLCanvasElement {
  return sprite(`plant${variant}`, 14, 20, (p) => {
    const r = rng(hash(`plant${variant}`));
    const pot = variant % 2 === 0 ? "#a3562f" : "#7d6ba8";
    /* pot */
    p.rect(3, 13, 8, 6, pot);
    p.hline(3, 13, 8, shade(pot, 0.25));
    p.rect(2, 12, 10, 2, shade(pot, 0.1));
    p.hline(2, 12, 10, shade(pot, 0.3));
    p.rect(3, 19, 8, 1, shade(pot, -0.35));
    /* leaves */
    const cx = 7;
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.42 + (r() - 0.5) * 0.2;
      const len = 5 + r() * 5;
      for (let d = 1; d < len; d++) {
        const x = Math.round(cx + Math.cos(ang) * d);
        const y = Math.round(12 + Math.sin(ang) * d * 0.95);
        p.px(x, y, d > len - 2 ? MAT.greenL : MAT.green);
        if (d % 2 === 0) p.px(x + (Math.cos(ang) > 0 ? 1 : -1), y, MAT.greenD);
      }
    }
    p.px(cx, 11, MAT.greenL);
  });
}

export function shelfSprite(seed: number): HTMLCanvasElement {
  return sprite(`shelf${seed}`, 20, 16, (p) => {
    const r = rng(hash(`shelf${seed}`));
    p.rect(0, 0, 20, 16, shade(MAT.wood, -0.25));
    p.rect(1, 1, 18, 14, shade(MAT.wood, -0.05));
    p.hline(0, 8, 20, MAT.woodD);
    p.hline(0, 15, 20, MAT.woodD);
    const cols = [MAT.pink, MAT.cyan, MAT.gold, MAT.green, MAT.red, "#8b5cf6", MAT.white];
    for (let row = 0; row < 2; row++) {
      let x = 2;
      while (x < 17) {
        const w = 1 + Math.floor(r() * 2);
        const h = row === 0 ? 5 : 6;
        const c = cols[Math.floor(r() * cols.length)];
        p.rect(x, row === 0 ? 2 : 9, w, h, c);
        p.hline(x, row === 0 ? 2 : 9, w, shade(c, 0.3));
        x += w + 1;
      }
    }
  });
}

export function trophySprite(color: string): HTMLCanvasElement {
  return sprite(`trophy${color}`, 9, 12, (p) => {
    p.rect(1, 1, 7, 5, color);
    p.hline(1, 1, 7, shade(color, 0.35));
    p.hline(1, 5, 7, shade(color, -0.3));
    p.px(0, 2, color);
    p.px(8, 2, color);
    p.vline(4, 6, 3, shade(color, -0.1));
    p.rect(2, 9, 5, 2, shade(color, -0.25));
    p.hline(1, 11, 7, MAT.woodD);
  });
}

export function sofaSprite(): HTMLCanvasElement {
  return sprite("sofa", 28, 16, (p) => {
    p.box(2, 4, 24, 8, "#5a3a63", MAT.outline);
    p.rect(3, 5, 22, 4, "#6d4775");
    p.hline(3, 5, 22, "#7d5686");
    p.rect(1, 2, 26, 4, "#6d4775");
    p.hline(1, 2, 26, "#7d5686");
    p.rect(3, 12, 22, 2, "#4a2f52");
    p.vline(2, 12, 4, MAT.woodD);
    p.vline(25, 12, 4, MAT.woodD);
    p.px(14, 6, "#8d5f96");
  });
}

export function serverSprite(): HTMLCanvasElement {
  return sprite("server", 14, 26, (p) => {
    p.box(1, 0, 12, 24, MAT.metalD, MAT.outline);
    for (let i = 0; i < 6; i++) {
      const y = 2 + i * 4;
      p.rect(2, y, 10, 3, shade(MAT.dark, i % 2 === 0 ? 0.05 : -0.05));
      p.hline(2, y, 10, shade(MAT.metal, 0.1));
      p.px(3, y + 1, MAT.green);
      p.px(5, y + 1, MAT.gold);
      p.px(7, y + 1, MAT.green);
    }
    p.rect(1, 24, 12, 2, MAT.metalD);
  });
}

export function boardSprite(seed: number): HTMLCanvasElement {
  return sprite(`board${seed}`, 28, 18, (p) => {
    const r = rng(hash(`board${seed}`));
    p.box(0, 0, 28, 16, MAT.paper, shade(MAT.paperD, -0.4));
    p.rect(1, 1, 26, 14, "#fbf7ee");
    /* scribbles: story beats */
    for (let i = 0; i < 6; i++) {
      const y = 3 + i * 2;
      const w = 4 + Math.floor(r() * 16);
      p.hline(2, y, w, i % 3 === 0 ? MAT.pink : i % 3 === 1 ? MAT.cyan : MAT.dark);
    }
    /* a little chart */
    p.rect(18, 9, 8, 5, "#e8e2d4");
    for (let i = 0; i < 4; i++) p.rect(19 + i * 2, 13 - Math.floor(r() * 4), 1, 4, MAT.gold);
    p.rect(0, 16, 28, 2, shade(MAT.paperD, -0.3));
    /* marker ledge */
    p.rect(6, 16, 8, 2, MAT.metalD);
    p.rect(7, 16, 3, 1, MAT.red);
  });
}

export function posterSprite(seed: number): HTMLCanvasElement {
  return sprite(`poster${seed}`, 12, 16, (p) => {
    const r = rng(hash(`poster${seed}`));
    const bg = [MAT.pink, MAT.cyan, MAT.gold, "#8b5cf6", MAT.green][Math.floor(r() * 5)];
    p.rect(0, 0, 12, 16, shade(bg, -0.55));
    p.rect(1, 1, 10, 14, shade(bg, -0.15));
    /* abstract anime-poster art: sun + silhouette */
    p.ellipse(6, 6, 3, 3, shade(bg, 0.45));
    p.rect(1, 9, 10, 6, shade(bg, -0.5));
    p.ellipse(5, 9, 2, 2, shade(bg, -0.7));
    p.rect(2, 12, 8, 3, shade(bg, -0.65));
    p.hline(1, 1, 10, shade(bg, 0.2));
  });
}

export function clockSprite(minutes: number): HTMLCanvasElement {
  const m = Math.floor(minutes) % 60;
  return sprite(`clock${m}`, 11, 11, (p) => {
    p.ellipse(5, 5, 5, 5, MAT.outline);
    p.ellipse(5, 5, 4, 4, MAT.paper);
    p.ellipse(5, 5, 4.6, 4.6, MAT.dark);
    const ang = (m / 60) * Math.PI * 2 - Math.PI / 2;
    for (let d = 0; d < 3; d++) p.px(5 + Math.cos(ang) * d, 5 + Math.sin(ang) * d, MAT.outline);
    const ang2 = (m / 60) * Math.PI * 2 * 12 - Math.PI / 2;
    for (let d = 0; d < 2; d++) p.px(5 + Math.cos(ang2) * d, 5 + Math.sin(ang2) * d, MAT.pink);
    p.px(5, 5, MAT.dark);
  });
}

export function binSprite(): HTMLCanvasElement {
  return sprite("bin", 9, 12, (p) => {
    p.rect(1, 2, 7, 10, MAT.metal);
    p.hline(1, 2, 7, MAT.metalL);
    p.rect(0, 1, 9, 2, MAT.metalD);
    p.vline(3, 4, 7, MAT.metalD);
    p.vline(6, 4, 7, MAT.metalD);
    p.rect(2, 0, 3, 1, MAT.paperD);
  });
}

/** the studio cat — two frames, it breathes and flicks its tail */
export function catSprite(frame: number): HTMLCanvasElement {
  return sprite(`cat${frame}`, 16, 10, (p) => {
    const breathe = frame === 1 ? 1 : 0;
    const body = "#5a4a6b";
    const bodyL = "#6f5d82";
    /* curled body */
    p.ellipse(8, 6 - breathe, 6, 3 + breathe, body);
    p.ellipse(8, 5 - breathe, 5, 2, bodyL);
    /* head */
    p.ellipse(4, 5 - breathe, 3, 2, bodyL);
    p.px(2, 4 - breathe, body);
    p.px(5, 4 - breathe, body); // ears
    p.px(3, 5 - breathe, MAT.outline); // closed eye
    p.px(4, 5 - breathe, MAT.outline);
    p.px(3, 6 - breathe, MAT.pink);
    /* tail flick */
    const tail = frame === 1 ? 1 : 0;
    p.rect(13, 4 - breathe - tail, 3, 1, bodyL);
    p.px(15, 3 - breathe - tail, body);
  });
}

/** ceiling strip light — the glow is drawn separately so it can flicker */
export function lampSprite(): HTMLCanvasElement {
  return sprite("lamp", 16, 5, (p) => {
    p.rect(2, 0, 12, 1, MAT.metalD);
    p.rect(1, 1, 14, 3, MAT.metalL);
    p.rect(2, 2, 12, 2, "#fff6d8");
    p.hline(2, 4, 12, MAT.metal);
  });
}

/** potted-by-the-window style floor rug */
export function drawRug(p: Pen, x: number, y: number, w: number, h: number, c1: string, c2: string) {
  p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, c1);
  p.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 1, c2);
  p.ellipse(x + w / 2, y + h / 2, w / 6, h / 6, c1);
}
