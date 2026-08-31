/**
 * pen.ts — tiny pixel-art toolkit.
 *
 * Everything in the pixel layer draws at 1px granularity into small offscreen
 * canvases ("sprites"). Those sprites are then blitted into a low-resolution
 * scene buffer which is upscaled with nearest-neighbour sampling, so the art
 * stays crisp at any screen size (that is what makes it read as pixel art
 * rather than as smooth vector shapes).
 *
 * Rules of the road:
 *  - draw only with integer coordinates (Pen rounds for you)
 *  - never enable image smoothing
 *  - sprites are cached by key so a frame costs a handful of drawImage calls
 */

export type Ctx = CanvasRenderingContext2D;

/* --------------------------------------------------------------- helpers */

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext("2d");
  if (g) g.imageSmoothingEnabled = false;
  return c;
}

export function ctx2d(c: HTMLCanvasElement): Ctx {
  const g = c.getContext("2d")!;
  g.imageSmoothingEnabled = false;
  return g;
}

/** Deterministic string hash (FNV-1a). */
export function hash(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Small, fast deterministic PRNG so props/characters look the same every run. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp255 = (n: number) => Math.max(0, Math.min(255, Math.round(n)));

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
export function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const f = (v: number) => clamp255(amount >= 0 ? v + (255 - v) * amount : v * (1 + amount));
  return `#${((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1)}`;
}

/** Blend two hex colours. */
export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.replace("#", ""), 16);
  const pb = parseInt(b.replace("#", ""), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = clamp255(ar + (br - ar) * t);
  const g = clamp255(ag + (bg - ag) * t);
  const bl = clamp255(ab + (bb - ab) * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)}`;
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/* ------------------------------------------------------------------- pen */

export class Pen {
  g: Ctx;
  constructor(g: Ctx) {
    this.g = g;
    g.imageSmoothingEnabled = false;
  }

  /** single pixel; "." or "" means transparent */
  px(x: number, y: number, c: string) {
    if (!c || c === ".") return;
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), 1, 1);
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    if (!c || c === "." || w <= 0 || h <= 0) return;
    this.g.fillStyle = c;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  hline(x: number, y: number, w: number, c: string) {
    this.rect(x, y, w, 1, c);
  }
  vline(x: number, y: number, h: number, c: string) {
    this.rect(x, y, 1, h, c);
  }

  /** filled rect with a 1px border */
  box(x: number, y: number, w: number, h: number, fill: string, border: string) {
    this.rect(x, y, w, h, fill);
    this.hline(x, y, w, border);
    this.hline(x, y + h - 1, w, border);
    this.vline(x, y, h, border);
    this.vline(x + w - 1, y, h, border);
  }

  /** filled rect with the top-left lit and bottom-right shadowed (1px bevel) */
  bevel(x: number, y: number, w: number, h: number, fill: string, light: string, dark: string) {
    this.rect(x, y, w, h, fill);
    this.hline(x, y, w, light);
    this.vline(x, y, h, light);
    this.hline(x, y + h - 1, w, dark);
    this.vline(x + w - 1, y, h, dark);
  }

  /** Bresenham line, 1px, integer endpoints */
  line(x0: number, y0: number, x1: number, y1: number, c: string) {
    let x = Math.round(x0);
    let y = Math.round(y0);
    const xe = Math.round(x1);
    const ye = Math.round(y1);
    const dx = Math.abs(xe - x);
    const dy = Math.abs(ye - y);
    const sx = x < xe ? 1 : -1;
    const sy = y < ye ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.px(x, y, c);
      if (x === xe && y === ye) break;
      const e2 = err * 2;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  /** filled ellipse (pixel-precise, inclusive) */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    for (let y = -Math.floor(ry); y <= Math.floor(ry); y++) {
      for (let x = -Math.floor(rx); x <= Math.floor(rx); x++) {
        if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1.02) this.px(cx + x, cy + y, c);
      }
    }
  }

  /** vertical gradient fill, `stops` are [0..1, colour] pairs */
  vgrad(x: number, y: number, w: number, h: number, stops: [number, string][]) {
    for (let i = 0; i < h; i++) {
      const t = h <= 1 ? 0 : i / (h - 1);
      let col = stops[0][1];
      for (let s = 0; s < stops.length - 1; s++) {
        const [t0, c0] = stops[s];
        const [t1, c1] = stops[s + 1];
        if (t >= t0 && t <= t1) {
          col = t1 === t0 ? c0 : mix(c0, c1, (t - t0) / (t1 - t0));
          break;
        }
        if (t > t1) col = c1;
      }
      this.hline(x, y + i, w, col);
    }
  }

  /**
   * Draw a per-row silhouette. `spans[i] = [from, to]` are inclusive columns
   * for row i (0 = left edge of the shape). Edges get the outline colour,
   * the inside gets the fill, which is the quickest way to hand-author
   * organic pixel shapes (heads, cats, plants).
   */
  shape(x: number, y: number, spans: [number, number][], fill: string, outline: string) {
    spans.forEach(([a, b], i) => {
      for (let cx = a; cx <= b; cx++) {
        const edge = cx === a || cx === b || i === 0 || i === spans.length - 1;
        this.px(x + cx, y + i, edge ? outline : fill);
      }
    });
  }

  /** deterministic speckle pass — dirt, carpet fibres, screen noise */
  speckle(x: number, y: number, w: number, h: number, seed: number, chance: number, c: string) {
    const r = rng(seed);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (r() < chance) this.px(x + i, y + j, c);
  }
}

/* ------------------------------------------------------------ sprite cache */

const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Build (or fetch) a sprite. `key` must describe every input that changes the
 * pixels, otherwise you will get a stale image — see the *_key() helpers.
 */
export function sprite(key: string, w: number, h: number, draw: (p: Pen) => void): HTMLCanvasElement {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(w, h);
  draw(new Pen(ctx2d(c)));
  spriteCache.set(key, c);
  return c;
}

/**
 * Add a 1px dark outline around every opaque pixel of a sprite. This is what
 * makes the art read against the busy studio background — without it the
 * characters melt into the floor.
 */
export function outlinePass(c: HTMLCanvasElement, color = "#130f1e") {
  const w = c.width;
  const h = c.height;
  const g = c.getContext("2d")!;
  const img = g.getImageData(0, 0, w, h);
  const src = new Uint8ClampedArray(img.data);
  const n = parseInt(color.replace("#", "").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const gg = (n >> 8) & 255;
  const b = n & 255;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (src[i + 3] > 24) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          if (src[(ny * w + nx) * 4 + 3] > 24) {
            near = true;
            break;
          }
        }
      }
      if (near) {
        img.data[i] = r;
        img.data[i + 1] = gg;
        img.data[i + 2] = b;
        img.data[i + 3] = 255;
      }
    }
  }
  g.putImageData(img, 0, 0);
}

/** Sprite that gets the automatic outline pass once, then is cached. */
export function spriteOutlined(
  key: string,
  w: number,
  h: number,
  draw: (p: Pen) => void,
  outline = "#130f1e",
): HTMLCanvasElement {
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = makeCanvas(w, h);
  draw(new Pen(ctx2d(c)));
  outlinePass(c, outline);
  spriteCache.set(key, c);
  return c;
}

/** Cached horizontal mirror of a sprite (used for left/right facing). */
export function mirror(src: HTMLCanvasElement): HTMLCanvasElement {
  const key = `mir:${(src as unknown as { __id?: string }).__id ?? ""}:${src.width}x${src.height}:${spriteCache.size}`;
  void key;
  const c = makeCanvas(src.width, src.height);
  const g = ctx2d(c);
  g.imageSmoothingEnabled = false;
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return c;
}

/** Number of cached sprites — handy while tuning. */
export const spriteCount = () => spriteCache.size;
