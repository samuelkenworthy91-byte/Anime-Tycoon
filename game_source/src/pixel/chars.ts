/**
 * chars.ts — the chibi studio crew.
 *
 * A character is a 16x26 sprite built from three blocks (head / torso / legs)
 * that are nudged around by a frame index, which is what gives the walk cycle,
 * the typing loop and the coffee sip their motion. Looks (skin, hair, outfit…)
 * are derived deterministically from a seed string so every staff member keeps
 * the same face all game.
 */

import { hash, mix, Pen, shade, spriteOutlined } from "./pen";

export const CHAR_W = 16;
export const CHAR_H = 26;
/** distance from the sprite top to the character's feet */
export const CHAR_FEET = 26;

const OUTLINE = "#130f1e";

const SKIN = ["#f7d7b4", "#ecbd93", "#cf9166", "#9a5f3c", "#6f4227", "#ffe6cf"];
const HAIR = [
  "#2a2033", "#4b2f1d", "#8c4a24", "#d9a441", "#e8e4f0", "#c94f7c",
  "#3be1ff", "#8b5cf6", "#5ef0c0", "#ff4d8d", "#7ec8ff", "#a3e635",
];
const TOPS = ["#ff4d8d", "#3be1ff", "#ffd166", "#5ef0c0", "#8b5cf6", "#ff8fc7", "#f2ecdf", "#7ec8ff", "#ff7a5c"];
const PANTS = ["#2a2540", "#38314f", "#232a3f", "#4a3a2a", "#1f2a3f"];
const SHOES = ["#1a1526", "#2b2233", "#3a2a1e"];
const ACCENTS = ["#ffd166", "#3be1ff", "#ff4d8d", "#5ef0c0", "#f2ecdf", "#8b5cf6"];

export interface Look {
  key: string;
  skin: string;
  skinS: string;
  hair: string;
  hairD: string;
  hairL: string;
  top: string;
  topD: string;
  topL: string;
  pants: string;
  shoe: string;
  acc: string;
  /** 0 short · 1 spiky · 2 bob · 3 long · 4 ponytail · 5 cap */
  style: number;
  /** 0 none · 1 glasses · 2 headphones · 3 scarf · 4 visor */
  extra: number;
  blush: boolean;
}

const pick = <T,>(arr: T[], n: number) => arr[((n % arr.length) + arr.length) % arr.length];

/**
 * Build a look from a seed (character id / name). `top` forces the outfit
 * colour so staff can be colour-coded by role.
 */
export function lookFrom(seed: string, top?: string, style?: number): Look {
  const h = hash(seed);
  const skin = pick(SKIN, h % SKIN.length);
  const hair = pick(HAIR, (h >> 3) % HAIR.length);
  const t = top ?? pick(TOPS, (h >> 7) % TOPS.length);
  return {
    key: `${seed}|${top ?? "-"}|${style ?? "-"}`,
    skin,
    skinS: shade(skin, -0.22),
    hair,
    hairD: shade(hair, -0.3),
    hairL: shade(hair, 0.28),
    top: t,
    topD: shade(t, -0.28),
    topL: shade(t, 0.26),
    pants: pick(PANTS, (h >> 11) % PANTS.length),
    shoe: pick(SHOES, (h >> 13) % SHOES.length),
    acc: pick(ACCENTS, (h >> 17) % ACCENTS.length),
    style: style ?? (h >> 19) % 6,
    extra: (h >> 23) % 5,
    blush: ((h >> 29) & 1) === 1,
  };
}

export type CharMode = "walk" | "idle" | "sit" | "sip" | "cheer";
export type CharView = "front" | "back" | "side";

const FRAMES: Record<CharMode, number> = { walk: 4, idle: 2, sit: 2, sip: 2, cheer: 2 };

/** Head silhouette: inclusive column spans, one entry per row (10px wide). */
const HEAD: [number, number][] = [
  [2, 7], [1, 8], [0, 9], [0, 9], [0, 9], [0, 9], [1, 8], [1, 8], [2, 7],
];

export function charSprite(look: Look, mode: CharMode, view: CharView, frame: number): HTMLCanvasElement {
  const f = ((frame % FRAMES[mode]) + FRAMES[mode]) % FRAMES[mode];
  return spriteOutlined(`ch|${look.key}|${mode}|${view}|${f}`, CHAR_W, CHAR_H, (p) =>
    drawChar(p, look, mode, view, f),
  );
}

/** How many frames a mode animates over — the scene uses this to pace motion. */
export const modeFrames = (mode: CharMode) => FRAMES[mode];

/* --------------------------------------------------------------- drawing */

function drawChar(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number) {
  const bob = mode === "walk" ? (frame % 2 === 1 ? -1 : 0) : mode === "idle" ? (frame === 1 ? -1 : 0) : 0;
  /* sitting drops the body a little; the desk hides everything below
     the waist, so only the head, shoulders and typing hands stay visible */
  const y = mode === "sit" ? 2 : bob;

  if (mode !== "sit") drawLegs(p, look, mode, view, frame, y);
  drawTorso(p, look, mode, view, frame, y);
  drawHead(p, look, mode, view, frame, y);
  if (mode === "cheer") drawCheerArms(p, look, y);
}

/* ------------------------------------------------------------------ legs */

function drawLegs(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const top = 18 + dy;
  const legH = 24 - top; // down to the ankle
  let lx = 0;
  let rx = 0;
  if (mode === "walk") {
    if (frame === 0) lx = -1;
    if (frame === 2) rx = 1;
  }
  if (view === "side") {
    /* one leg slightly behind the other so the walk still reads in profile */
    p.rect(5, top, 3, legH, look.pants);
    p.rect(8 + (mode === "walk" && frame === 2 ? 1 : 0), top, 3, legH, shade(look.pants, -0.25));
    drawShoe(p, 5, 24 + dy, look.shoe, lx, 4);
    drawShoe(p, 8, 24 + dy, shade(look.shoe, -0.2), rx, 4);
    return;
  }
  p.rect(4 + lx, top, 3, legH, look.pants);
  p.rect(8 + rx, top, 3, legH, look.pants);
  /* inner shading so the legs aren't one flat block */
  p.vline(6 + lx, top, legH - 1, shade(look.pants, -0.22));
  p.vline(8 + rx, top, legH - 1, shade(look.pants, 0.14));
  drawShoe(p, 4 + lx, 24 + dy, look.shoe, 0, 4);
  drawShoe(p, 8 + rx, 24 + dy, look.shoe, 0, 4);
}

function drawShoe(p: Pen, x: number, y: number, c: string, off: number, w: number) {
  p.rect(x + off, y, w, 2, c);
  p.hline(x + off, y, w, shade(c, 0.25));
  p.px(x + off + w - 1, y + 1, shade(c, -0.35));
}

/* ----------------------------------------------------------------- torso */

function drawTorso(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const y = 11 + dy;
  const side = view === "side";
  const bodyW = side ? 6 : 8;
  const x = side ? 5 : 4;

  /* back arm (drawn first so it sits behind the body in profile) */
  if (side) {
    p.rect(x + bodyW - 1, y + 1, 2, 5, look.topD);
    p.rect(x + bodyW - 1, y + 6, 2, 2, look.skin);
  }

  /* torso */
  p.rect(x, y, bodyW, 7, look.top);
  p.hline(x, y, bodyW, look.topL);
  p.vline(x, y, 7, look.topL);
  p.vline(x + bodyW - 1, y, 7, look.topD);
  p.hline(x, y + 6, bodyW, look.topD);

  /* collar / shirt */
  p.rect(x + 2, y, bodyW - 4, 1, mix(look.topL, "#ffffff", 0.45));
  p.px(x + (bodyW >> 1) - 1, y + 1, look.topD);
  p.px(x + (bodyW >> 1), y + 1, look.topD);

  /* buttons down the placket */
  p.px(x + (bodyW >> 1) - 1, y + 3, look.acc);
  p.px(x + (bodyW >> 1) - 1, y + 5, look.acc);

  /* waistband */
  p.hline(x, y + 6, bodyW, look.pants);

  /* scarf */
  if (look.extra === 3) {
    p.rect(x, y, bodyW, 2, look.acc);
    p.rect(x + bodyW - 2, y + 2, 2, 3, look.acc);
  }

  /* arms */
  if (mode === "sit") {
    /* forearms on the desk, hands alternate — the typing loop */
    const t = frame === 1 ? 1 : 0;
    p.rect(x - 2, y + 4, 3, 2, look.topD);
    p.rect(x + bodyW - 1, y + 4, 3, 2, look.topD);
    p.rect(x - 3, y + 3 + (t ? 1 : 0), 2, 2, look.skin);
    p.rect(x + bodyW + 1, y + 4 - (t ? 1 : 0), 2, 2, look.skin);
  } else if (mode === "sip") {
    /* one arm up to the mug, the other relaxed */
    p.rect(x - 2, y + 1, 2, 5, look.topD);
    p.rect(x - 2, y + 6, 2, 2, look.skin);
    p.rect(x + bodyW, y + 1, 2, 3, look.topD);
    p.rect(x + bodyW, y - 1, 2, 2, look.skin);
    p.rect(x + bodyW - 1, y - 3, 3, 3, "#f2ecdf"); // mug
    p.rect(x + bodyW, y - 2, 2, 1, look.acc);
  } else if (mode === "walk") {
    const swing = frame === 0 ? 1 : frame === 2 ? -1 : 0;
    p.rect(x - 2 + (side ? 0 : swing), y + 1, 2, 5, look.topD);
    p.rect(x - 2 + (side ? 0 : swing), y + 6, 2, 2, look.skin);
    if (!side) {
      p.rect(x + bodyW - swing, y + 1, 2, 5, look.topD);
      p.rect(x + bodyW - swing, y + 6, 2, 2, look.skin);
    }
  } else {
    /* idle: arms hang, tiny 1px sway on the second frame */
    const sway = frame === 1 ? 1 : 0;
    p.rect(x - 2, y + 1 + (sway ? 1 : 0), 2, 5, look.topD);
    p.rect(x - 2, y + 6 + (sway ? 1 : 0), 2, 2, look.skin);
    if (!side) {
      p.rect(x + bodyW, y + 1 + (sway ? 0 : 1), 2, 5, look.topD);
      p.rect(x + bodyW, y + 6 + (sway ? 0 : 1), 2, 2, look.skin);
    }
  }
}

function drawCheerArms(p: Pen, look: Look, dy: number) {
  const y = 9 + dy;
  p.rect(1, y - 2, 2, 5, look.topD);
  p.rect(1, y - 4, 2, 2, look.skin);
  p.rect(13, y - 2, 2, 5, look.topD);
  p.rect(13, y - 4, 2, 2, look.skin);
}

/* ------------------------------------------------------------------ head */

function drawHead(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const x = 3;
  const y = 2 + dy;
  const side = view === "side";
  const blink = mode !== "walk" && frame === 1 && ((look.style + frame) & 3) === 0;

  /* hair that falls behind the head (long styles) drawn before the skull */
  if (look.style === 3 || look.style === 4) {
    if (look.style === 3 && !side) {
      p.rect(x - 1, y + 3, 2, 9, look.hairD);
      p.rect(x + 9, y + 3, 2, 9, look.hairD);
    }
    if (look.style === 4 && side) {
      p.rect(x - 2, y + 1, 3, 8, look.hairD);
      p.px(x - 2, y + 8, look.hair);
    }
  }

  /* skull + face */
  const spans = side
    ? ([
        [1, 6], [0, 7], [0, 8], [0, 8], [0, 8], [0, 8], [0, 8], [1, 7], [2, 6],
      ] as [number, number][])
    : HEAD;
  p.shape(x, y, spans, look.skin, OUTLINE);

  /* hair cap */
  const hairRows = look.style === 5 ? 2 : 3;
  for (let i = 0; i < spans.length; i++) {
    const [a, b] = spans[i];
    if (i < hairRows || (look.style === 3 && i < 4)) {
      for (let c = a; c <= b; c++) p.px(x + c, y + i, i === 0 ? look.hairD : look.hair);
    }
  }
  /* highlight */
  p.px(x + (side ? 3 : 3), y + 1, look.hairL);
  p.px(x + (side ? 4 : 4), y + 1, look.hairL);

  if (look.style === 1) {
    /* spiky tufts poking above the cap */
    p.px(x + 2, y - 1, look.hair);
    p.px(x + 5, y - 2, look.hair);
    p.px(x + 7, y - 1, look.hair);
    p.px(x + 5, y - 1, look.hairL);
  }
  if (look.style === 5) {
    /* cap: brim + crown */
    p.rect(x - 1, y + 1, 11, 1, shade(look.acc, -0.25));
    p.rect(x, y - 1, 10, 2, look.acc);
    p.hline(x, y - 1, 10, shade(look.acc, 0.25));
  }
  if (look.style === 2 || look.style === 3) {
    /* side locks framing the face */
    const h = look.style === 2 ? 4 : 5;
    p.rect(x, y + 3, 1, h, look.hair);
    p.rect(x + 9, y + 3, 1, h, look.hair);
  }

  if (view === "back") {
    /* back of the head: a solid cap of hair, darker at the nape, no face */
    for (let i = 0; i < spans.length; i++) {
      const [a, b] = spans[i];
      for (let c = a; c <= b; c++) {
        const edge = c === a || c === b || i === spans.length - 1;
        p.px(x + c, y + i, edge || i >= 6 ? look.hairD : look.hair);
      }
    }
    p.hline(x + 3, y + 1, 3, look.hairL);
    p.hline(x + 3, y + 3, 2, shade(look.hair, 0.14));
    return;
  }

  /* eyes */
  const eyeY = y + 5;
  if (blink) {
    p.hline(side ? x + 3 : x + 2, eyeY, side ? 2 : 2, OUTLINE);
    if (!side) p.hline(x + 6, eyeY, 2, OUTLINE);
  } else {
    if (side) {
      p.rect(x + 3, eyeY, 2, 2, OUTLINE);
      p.px(x + 3, eyeY, "#ffffff");
    } else {
      p.rect(x + 2, eyeY, 2, 2, OUTLINE);
      p.rect(x + 6, eyeY, 2, 2, OUTLINE);
      p.px(x + 2, eyeY, "#ffffff");
      p.px(x + 6, eyeY, "#ffffff");
    }
  }

  /* mouth + blush */
  p.px(side ? x + 4 : x + 4, y + 7, look.skinS);
  if (!side) p.px(x + 5, y + 7, look.skinS);
  if (look.blush) {
    p.px(side ? x + 1 : x + 1, y + 6, "#f08a8a");
    if (!side) p.px(x + 8, y + 6, "#f08a8a");
  }

  /* accessories */
  if (look.extra === 1) {
    /* glasses */
    p.hline(side ? x + 2 : x + 1, eyeY - 1, side ? 4 : 8, shade(look.acc, -0.1));
    p.px(side ? x + 2 : x + 1, eyeY, shade(look.acc, -0.1));
    p.px(side ? x + 5 : x + 8, eyeY, shade(look.acc, -0.1));
    p.hline(side ? x + 2 : x + 1, eyeY + 2, side ? 4 : 8, shade(look.acc, -0.1));
    p.px(side ? x + 2 : x + 1, eyeY + 1, shade(look.acc, -0.1));
    p.px(side ? x + 5 : x + 8, eyeY + 1, shade(look.acc, -0.1));
    p.px(x + 4, eyeY + 1, shade(look.acc, -0.1));
  }
  if (look.extra === 2) {
    /* headphones */
    p.hline(x + 1, y - 1, 8, look.acc);
    p.rect(x, y + 3, 2, 3, look.acc);
    p.rect(x + 8, y + 3, 2, 3, look.acc);
    p.px(x + 1, y + 4, shade(look.acc, 0.35));
    p.px(x + 8, y + 4, shade(look.acc, -0.3));
  }
  if (look.extra === 4) {
    /* visor */
    p.rect(x + 1, eyeY - 1, 8, 3, shade(look.acc, -0.15));
    p.hline(x + 1, eyeY - 1, 8, shade(look.acc, 0.3));
    p.px(x + 2, eyeY, "#ffffff");
  }
}
