/**
 * chars.ts — the chibi studio crew.
 *
 * A character is a 16x26 sprite built from three blocks (head / torso / legs)
 * that are nudged around by a frame index, which is what gives the walk cycle,
 * the typing loop and the coffee sip their motion. Looks (skin, hair, outfit…)
 * are derived deterministically from a seed string so every staff member keeps
 * the same face all game.
 *
 * Lighting convention: the room is lit from the upper left, so highlights sit
 * on the left/top edges and shadows fall to the right/bottom. Every block
 * follows it, which is what stops a sprite looking like flat clip-art.
 */

import { ditherAt, hash, mix, Pen, shade, spriteOutlined } from "./pen";

export const CHAR_W = 16;
export const CHAR_H = 27;
/** distance from the sprite top to the character's feet */
export const CHAR_FEET = 27;
/**
 * Everything is drawn one pixel lower than the tight layout would allow. The
 * spare row at the top belongs to the outline pass — without it, spiky hair
 * and headphone bands get their outline cut off on the bob frames.
 */
const BASE = 1;

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
  skinL: string;
  hair: string;
  hairD: string;
  hairL: string;
  top: string;
  topD: string;
  topL: string;
  pants: string;
  shoe: string;
  acc: string;
  /** iris colour, tied to the hair so faces differ crew-wide */
  eye: string;
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
    skinL: shade(skin, 0.2),
    hair,
    hairD: shade(hair, -0.3),
    hairL: shade(hair, 0.28),
    top: t,
    topD: shade(t, -0.28),
    topL: shade(t, 0.26),
    pants: pick(PANTS, (h >> 11) % PANTS.length),
    shoe: pick(SHOES, (h >> 13) % SHOES.length),
    acc: pick(ACCENTS, (h >> 17) % ACCENTS.length),
    eye: shade(hair, -0.12),
    style: style ?? (h >> 19) % 6,
    extra: (h >> 23) % 5,
    blush: ((h >> 29) & 1) === 1,
  };
}

export type CharMode = "walk" | "idle" | "sit" | "sip" | "cheer";
export type CharView = "front" | "back" | "side";

/** A six-frame walk reads far smoother than four at this size. */
const FRAMES: Record<CharMode, number> = { walk: 6, idle: 2, sit: 2, sip: 2, cheer: 2 };

/* leg offsets and arm swing per walk frame (contact → passing → contact) */
const WALK_LEG: [number, number][] = [
  [1, -1],
  [1, 0],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [0, -1],
];
const WALK_ARM = [-1, 0, 1, 1, 0, -1];

/** Head silhouette: inclusive column spans, one entry per row (12px wide). */
const HEAD: [number, number][] = [
  [3, 8], [2, 9], [1, 10], [0, 11], [0, 11], [0, 11], [1, 10], [2, 9], [3, 8],
];
/** Profile silhouette — the face pushed to the left, back of the skull right. */
const HEAD_SIDE: [number, number][] = [
  [3, 8], [2, 9], [1, 10], [1, 10], [0, 11], [0, 11], [1, 10], [2, 9], [3, 8],
];
const HEAD_ROWS = HEAD.length; // 10

export function charSprite(look: Look, mode: CharMode, view: CharView, frame: number): HTMLCanvasElement {
  const f = ((frame % FRAMES[mode]) + FRAMES[mode]) % FRAMES[mode];
  return spriteOutlined(`ch2|${look.key}|${mode}|${view}|${f}`, CHAR_W, CHAR_H, (p) =>
    drawChar(p, look, mode, view, f),
  );
}

/** How many frames a mode animates over — the scene uses this to pace motion. */
export const modeFrames = (mode: CharMode) => FRAMES[mode];

/* --------------------------------------------------------------- drawing */

function drawChar(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number) {
  /* body rise/fall: up on the passing frames, down on contact */
  const bob =
    mode === "walk" ? (frame === 1 || frame === 4 ? -1 : 0) : mode === "idle" ? (frame === 1 ? -1 : 0) : 0;
  /* sitting drops the body a little; the desk hides everything below
     the waist, so only the head, shoulders and typing hands stay visible */
  const y = mode === "sit" ? 1 : bob;

  if (mode !== "sit") drawLegs(p, look, mode, view, frame, y);
  drawTorso(p, look, mode, view, frame, y);
  drawHead(p, look, mode, view, frame, y);
  if (mode === "cheer") drawCheerArms(p, look, y);
}

/* ------------------------------------------------------------------ legs */

function drawLegs(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const top = 20 + dy;
  const legH = 25 - top;
  const [lo, ro] = mode === "walk" ? WALK_LEG[frame] : [0, 0];
  const side = view === "side";

  if (side) {
    /* one leg slightly behind the other so the walk still reads in profile */
    p.rect(5 + lo, top, 3, legH, shade(look.pants, 0.06));
    p.rect(8 + ro, top, 3, legH, shade(look.pants, -0.25));
    drawShoe(p, 5 + lo, 25 + dy, look.shoe, 0, 4);
    drawShoe(p, 8 + ro, 25 + dy, shade(look.shoe, -0.2), 0, 4);
    return;
  }
  p.rect(4 + lo, top, 3, legH, look.pants);
  p.rect(8 + ro, top, 3, legH, look.pants);
  /* lit on the left, shaded between the legs and down the right */
  p.vline(4 + lo, top, legH, shade(look.pants, 0.16));
  p.vline(6 + lo, top, legH - 1, shade(look.pants, -0.22));
  p.vline(8 + ro, top, legH - 1, shade(look.pants, 0.14));
  p.vline(10 + ro, top, legH, shade(look.pants, -0.26));
  drawShoe(p, 4 + lo, 25 + dy, look.shoe, 0, 4);
  drawShoe(p, 8 + ro, 25 + dy, shade(look.shoe, -0.12), 0, 4);
}

function drawShoe(p: Pen, x: number, y: number, c: string, off: number, w: number) {
  p.rect(x + off, y, w, 2, c);
  p.hline(x + off, y, w, shade(c, 0.28));
  p.px(x + off + w - 1, y + 1, shade(c, -0.4));
}

/* ----------------------------------------------------------------- torso */

function drawTorso(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const y = 13 + BASE + dy;
  const side = view === "side";
  const bodyW = side ? 6 : 8;
  const x = side ? 5 : 4;

  /* back arm (drawn first so it sits behind the body in profile) */
  if (side) {
    p.rect(x + bodyW - 1, y + 1, 2, 5, shade(look.top, -0.32));
    p.rect(x + bodyW - 1, y + 6, 2, 2, look.skin);
  }

  /* torso */
  p.rect(x, y, bodyW, 6, look.top);
  p.hline(x, y, bodyW, look.topL);
  p.vline(x, y, 6, look.topL);
  p.vline(x + bodyW - 1, y, 6, look.topD);

  /* the shadow the head casts on the shoulders */
  p.hline(x + 1, y, bodyW - 2, shade(look.top, -0.14));

  /* collar / shirt */
  p.rect(x + 2, y + 1, bodyW - 4, 1, mix(look.topL, "#ffffff", 0.5));
  p.px(x + (bodyW >> 1) - 1, y + 2, look.topD);
  p.px(x + (bodyW >> 1), y + 2, look.topD);

  /* buttons down the placket */
  p.px(x + (bodyW >> 1) - 1, y + 3, look.acc);
  p.px(x + (bodyW >> 1) - 1, y + 5, look.acc);

  /* fabric shading: a dithered falloff down the right-hand side */
  for (let i = 0; i < 6; i++) {
    if (ditherAt(x + bodyW - 2, y + i) < 0.45) p.px(x + bodyW - 2, y + i, shade(look.top, -0.16));
  }

  /* waistband */
  p.hline(x, y + 6, bodyW, look.pants);
  p.hline(x, y + 6, bodyW - 1, shade(look.pants, 0.16));

  /* scarf */
  if (look.extra === 3) {
    p.rect(x, y, bodyW, 2, look.acc);
    p.hline(x, y, bodyW, shade(look.acc, 0.24));
    p.rect(x + bodyW - 2, y + 2, 2, 3, look.acc);
  }

  /* arms */
  if (mode === "sit") {
    /* forearms on the desk, hands alternate — the typing loop */
    const t = frame === 1 ? 1 : 0;
    p.rect(x - 2, y + 3, 3, 2, look.topD);
    p.rect(x + bodyW - 1, y + 3, 3, 2, look.topD);
    p.rect(x - 3, y + 2 + (t ? 1 : 0), 2, 2, look.skin);
    p.rect(x + bodyW + 1, y + 3 - (t ? 1 : 0), 2, 2, look.skin);
  } else if (mode === "sip") {
    /* one arm up to the mug, the other relaxed */
    p.rect(x - 2, y + 1, 2, 5, look.topD);
    p.rect(x - 2, y + 6, 2, 2, look.skin);
    p.rect(x + bodyW, y + 1, 2, 3, look.topD);
    p.rect(x + bodyW, y - 1, 2, 2, look.skin);
    p.rect(x + bodyW - 1, y - 3, 3, 3, "#f2ecdf"); // mug
    p.hline(x + bodyW - 1, y - 3, 3, "#ffffff");
    p.rect(x + bodyW, y - 2, 2, 1, look.acc);
  } else if (mode === "walk") {
    const swing = WALK_ARM[frame];
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
  const y = 13 + BASE + dy;
  p.rect(1, y - 2, 2, 5, look.topD);
  p.rect(1, y - 4, 2, 2, look.skin);
  p.rect(13, y - 2, 2, 5, look.topD);
  p.rect(13, y - 4, 2, 2, look.skin);
}

/* ------------------------------------------------------------------ head */

function drawHead(p: Pen, look: Look, mode: CharMode, view: CharView, frame: number, dy: number) {
  const x = 2;
  const y = 2 + BASE + dy;
  const side = view === "side";
  const blink = mode !== "walk" && frame === 1 && ((look.style + frame) & 3) === 0;

  /* hair that falls behind the head (long styles) drawn before the skull */
  if (look.style === 3 && !side) {
    p.rect(x - 1, y + 3, 2, 8, look.hairD);
    p.rect(x + 11, y + 3, 2, 8, shade(look.hairD, -0.2));
  }
  if (look.style === 4 && side) {
    /* the back of the skull is the right-hand side in profile */
    p.rect(x + 11, y + 2, 2, 8, look.hairD);
    p.px(x + 12, y + 9, look.hair);
    p.px(x + 12, y + 10, look.hairD);
  }

  /* skull + face */
  const spans = side ? HEAD_SIDE : HEAD;
  p.shape(x, y, spans, look.skin, OUTLINE);

  /* rim light: the room is lit from the upper left, so the left edge catches */
  for (let i = 2; i < HEAD_ROWS - 2; i++) {
    const a = spans[i][0];
    if (i >= 3 && i <= 6) p.px(x + a + 1, y + i, look.skinL);
  }
  /* and the underside of the chin falls away */
  p.hline(x + 4, y + HEAD_ROWS - 1, 4, look.skinS);
  p.px(x + 3, y + HEAD_ROWS - 1, mix(look.skinS, look.skin, 0.5));

  drawHair(p, look, mode, view, x, y, spans);

  if (view === "back") {
    /* back of the head: a solid cap of hair, darker at the nape, no face */
    for (let i = 0; i < spans.length; i++) {
      const [a, b] = spans[i];
      for (let c = a; c <= b; c++) {
        const edge = c === a || c === b || i === spans.length - 1;
        p.px(x + c, y + i, edge || i >= 6 ? look.hairD : look.hair);
      }
    }
    p.hline(x + 3, y + 1, 4, look.hairL);
    p.hline(x + 3, y + 3, 3, shade(look.hair, 0.14));
    p.hline(x + 7, y + 5, 2, shade(look.hair, -0.16));
    return;
  }

  /* ---------------------------------------------------------------- face */
  const eyeY = y + 4;
  const eyeL = side ? x + 3 : x + 2;
  const eyeR = x + 7;

  /* eyebrows — angled in for determined, out for sleepy */
  if (!blink) {
    p.hline(eyeL, eyeY - 1, 3, look.hairD);
    if (!side) p.hline(eyeR, eyeY - 1, 3, look.hairD);
  }

  if (blink) {
    p.hline(eyeL, eyeY + 1, 3, OUTLINE);
    if (!side) p.hline(eyeR, eyeY + 1, 3, OUTLINE);
  } else {
    drawEye(p, eyeL, eyeY, look);
    if (!side) drawEye(p, eyeR, eyeY, look);
  }

  /* nose: a single lit pixel between the eyes */
  if (!side) p.px(x + 5, y + 5, look.skinS);

  /* mouth — varies with what they are doing */
  const mouthY = y + 7;
  if (mode === "cheer") {
    p.hline(side ? x + 4 : x + 4, mouthY, 3, "#8e3b4e");
    p.hline(side ? x + 4 : x + 4, mouthY + 1, 3, "#c2566c");
    p.px(x + 5, mouthY, "#ffffff");
  } else if (mode === "sip") {
    p.hline(side ? x + 4 : x + 4, mouthY, 2, "#8e3b4e");
  } else if (side) {
    p.px(x + 4, mouthY, "#8e3b4e");
  } else {
    p.hline(x + 4, mouthY, 3, "#8e3b4e");
    p.px(x + 5, mouthY + 1, mix(look.skinS, "#c2566c", 0.4));
  }

  if (look.blush) {
    p.rect(side ? x + 1 : x + 1, y + 6, 2, 1, "#f08a8a");
    if (!side) p.rect(x + 9, y + 6, 2, 1, "#f08a8a");
  }

  drawAccessory(p, look, side, x, y, eyeY, eyeL, eyeR);
}

function drawEye(p: Pen, ex: number, ey: number, look: Look) {
  /* 3x3 eye: lash line on top, iris below, one white catchlight */
  p.rect(ex, ey, 3, 3, "#1b1430");
  p.rect(ex + 1, ey + 1, 2, 2, look.eye);
  p.px(ex + 1, ey + 1, "#ffffff");
  p.px(ex + 2, ey + 2, shade(look.eye, 0.3));
  /* a lit lower lid stops the eye reading as a black hole */
  p.hline(ex, ey + 2, 3, mix(look.skinS, "#1b1430", 0.3));
}

/** Hair cap, fringe and highlights. The fringe blends into the skin with a
 *  dithered edge rather than a hard line — the giveaway of hand-made pixels. */
function drawHair(p: Pen, look: Look, mode: CharMode, view: CharView, x: number, y: number, spans: [number, number][]) {
  const side = view === "side";
  const capRows = look.style === 5 ? 2 : 3;

  for (let i = 0; i < spans.length; i++) {
    const [a, b] = spans[i];
    if (i >= capRows && !(look.style === 3 && i < 4)) continue;
    for (let c = a; c <= b; c++) {
      /* darker at the top of the skull, lighter where it turns the light */
      const col = i === 0 ? look.hairD : c <= a + 1 ? look.hairL : look.hair;
      p.px(x + c, y + i, col);
    }
  }
  /* dithered fringe: the row where hair gives way to forehead */
  for (let i = capRows; i < capRows + 2 && i < spans.length; i++) {
    const [a, b] = spans[i];
    for (let c = a; c <= b; c++) {
      if (ditherAt(x + c, y + i) < 0.62 - (i - capRows) * 0.32) p.px(x + c, y + i, look.hair);
    }
  }
  /* strand highlight running back from the fringe */
  p.px(x + 3, y + 1, look.hairL);
  p.px(x + 4, y + 1, look.hairL);
  if (!side) p.px(x + 7, y + 2, shade(look.hair, 0.16));

  if (look.style === 1) {
    /* spiky tufts poking above the cap — kept to one row so the outline pass
       can still draw around them */
    p.px(x + 2, y - 1, look.hair);
    p.px(x + 5, y - 1, look.hairL);
    p.px(x + 6, y - 1, look.hairL);
    p.px(x + 7, y - 1, look.hair);
    p.px(x + 9, y - 1, look.hair);
  }
  if (look.style === 5) {
    /* cap: brim + crown */
    p.rect(x - 1, y + 1, 13, 1, shade(look.acc, -0.25));
    p.rect(x, y - 1, 12, 2, look.acc);
    p.hline(x, y - 1, 12, shade(look.acc, 0.28));
    p.px(x + 11, y, shade(look.acc, -0.2));
  }
  if (look.style === 2 || look.style === 3) {
    /* side locks framing the face */
    const h = look.style === 2 ? 4 : 5;
    p.rect(x, y + 3, 1, h, look.hair);
    p.rect(x + 11, y + 3, 1, h, shade(look.hair, -0.18));
  }
  if (look.style === 4 && !side) {
    /* ponytail flicking out behind, more on the walk */
    const flick = mode === "walk" ? 1 : 0;
    p.rect(x + 11, y + 3, 2, 4, look.hairD);
    p.px(x + 11 + flick, y + 7, look.hair);
    p.px(x + 11 + flick, y + 8, look.hairD);
  }
}

function drawAccessory(
  p: Pen,
  look: Look,
  side: boolean,
  x: number,
  y: number,
  eyeY: number,
  eyeL: number,
  eyeR: number,
) {
  if (look.extra === 1) {
    /* glasses: two rims, a bridge and a lit top edge */
    const c = shade(look.acc, -0.1);
    const lit = shade(look.acc, 0.35);
    for (const ex of side ? [eyeL] : [eyeL, eyeR]) {
      p.hline(ex - 1, eyeY - 1, 5, c);
      p.px(ex - 1, eyeY, c);
      p.px(ex + 3, eyeY, c);
      p.px(ex - 1, eyeY + 1, c);
      p.px(ex + 3, eyeY + 1, c);
      p.hline(ex - 1, eyeY + 2, 5, c);
      p.px(ex - 1, eyeY + 2, shade(c, -0.2));
      p.hline(ex - 1, eyeY - 1, 5, lit);
      p.px(ex - 1, eyeY - 1, mix(lit, "#ffffff", 0.5));
    }
    if (!side) p.hline(eyeL + 3, eyeY, 2, c);
  }
  if (look.extra === 2) {
    /* headphones: band over the head, cups at the ears */
    p.hline(x + 1, y - 1, 10, look.acc);
    p.hline(x + 2, y - 1, 4, shade(look.acc, 0.3));
    p.rect(x, y + 3, 2, 4, look.acc);
    p.rect(x + 10, y + 3, 2, 4, look.acc);
    p.px(x + 1, y + 4, shade(look.acc, 0.4));
    p.px(x + 10, y + 4, shade(look.acc, -0.3));
    p.px(x, y + 6, shade(look.acc, -0.35));
    p.px(x + 11, y + 6, shade(look.acc, -0.35));
  }
  if (look.extra === 4) {
    /* visor: a lit band across the eyes */
    p.rect(x + 1, eyeY - 1, 10, 3, shade(look.acc, -0.15));
    p.hline(x + 1, eyeY - 1, 10, shade(look.acc, 0.32));
    p.px(x + 2, eyeY, "#ffffff");
    p.px(x + 3, eyeY, mix("#ffffff", look.acc, 0.35));
  }
}
