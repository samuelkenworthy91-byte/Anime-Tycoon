/**
 * post.ts — the HD-2D pass.
 *
 * Octopath-style rendering is pixel art *photographed* rather than pixel art
 * drawn flat: bright things bloom, lamps actually throw light, the far
 * background sits slightly out of focus, and the whole frame is graded and
 * grainy like it came off a sensor.
 *
 * Everything here runs on the small scene buffer, so it costs almost nothing.
 * The important part is *where* it runs: light is evaluated per art pixel, so
 * it varies smoothly from one chunky pixel to the next but never resamples
 * the art itself. Silhouettes stay hard-edged and the light reads as light —
 * which is the whole difference between photographed pixels and a blur
 * slapped on top of them.
 */

import { makeCanvas, rng } from "./pen";

export interface HdLight {
  x: number;
  y: number;
  /** radius in buffer pixels */
  r: number;
  /** #rrggbb */
  color: string;
  /** 0..1 */
  strength: number;
  /**
   * Rects this light must not reach, in buffer pixels. Light landing on the
   * glass would brighten the night sky, which reads as fog rather than as a
   * window, so the ceiling lamps punch the windows out of their pools.
   */
  block?: { x: number; y: number; w: number; h: number }[];
}

const hexRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const GRAIN = 96;

export class Hd2d {
  private a = makeCanvas(8, 8);
  private b = makeCanvas(8, 8);
  private lm = makeCanvas(8, 8);
  private lmKey = "";
  private grain: HTMLCanvasElement | null = null;
  /** 0 = off, 1 = full HD-2D */
  intensity = 1;

  private ensure(w: number, h: number) {
    if (this.a.width !== w || this.a.height !== h) {
      this.a.width = w;
      this.a.height = h;
      this.b.width = w;
      this.b.height = h;
    }
    if (!this.grain) this.grain = makeGrain();
  }

  /** Paint every light into a half-scale additive map. */
  private buildLightMap(lights: HdLight[], W: number, H: number, _nightBucket: number) {
    const hw = Math.max(4, Math.ceil(W / 2));
    const hh = Math.max(4, Math.ceil(H / 2));
    if (this.lm.width !== hw || this.lm.height !== hh) {
      this.lm.width = hw;
      this.lm.height = hh;
    }
    const g = this.lm.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, hw, hh);
    for (const L of lights) {
      if (L.strength <= 0.01) continue;
      const [r, gg, bb] = hexRgb(L.color);
      const rad = Math.max(2, L.r) / 2;
      const cx = L.x / 2;
      const cy = L.y / 2;
      const grd = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
      /* Hold energy through the middle of the pool. A plain two-stop
         gradient spends everything in the first third and leaves the floor
         under a lamp darker than the wall beside it. */
      grd.addColorStop(0, `rgba(${r},${gg},${bb},${L.strength.toFixed(3)})`);
      grd.addColorStop(0.3, `rgba(${r},${gg},${bb},${(L.strength * 0.62).toFixed(3)})`);
      grd.addColorStop(0.62, `rgba(${r},${gg},${bb},${(L.strength * 0.26).toFixed(3)})`);
      grd.addColorStop(0.85, `rgba(${r},${gg},${bb},${(L.strength * 0.08).toFixed(3)})`);
      grd.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
      g.fillStyle = grd;
      g.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      if (L.block && L.block.length) {
        g.save();
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = "#000";
        for (const r of L.block) g.fillRect(r.x / 2, r.y / 2, r.w / 2, r.h / 2);
        g.restore();
      }
    }
  }

  /**
   * Bloom, dynamic light, grade, vignette and grain, applied to `low` in place.
   *
   * @param lights      lamp and window positions from the scene
   * @param ambient     colour the whole frame is multiplied toward
   * @param ambientMix  how hard that multiply bites (0..1)
   */
  render(
    low: HTMLCanvasElement,
    lights: HdLight[],
    ambient: string,
    ambientMix: number,
    night: number,
    clock: number,
    /** lamp flicker, 0..1.2 — rides on the alpha so the map stays cached */
    flicker = 1,
  ) {
    const k = this.intensity;
    if (k <= 0) return; // classic pixel art, untouched
    const g = low.getContext("2d")!;
    const W = low.width;
    const H = low.height;
    this.ensure(W, H);

    /* -------------------------------------------------------- grade / air */
    if (ambientMix > 0.001) {
      const [r, gg, bb] = hexRgb(ambient);
      g.save();
      g.globalCompositeOperation = "multiply";
      g.globalAlpha = Math.min(1, ambientMix * k);
      g.fillStyle = `rgb(${r},${gg},${bb})`;
      g.fillRect(0, 0, W, H);
      g.restore();
    }

    /* ------------------------------------------------------------ lights */
    /* Additive pools. These are what make the room feel lit rather than
       coloured — the sprites are shaded as if lit from the upper left, and
       the pools agree with them. Building ~20 radial gradients every frame is
       too much for a phone, so the rig is rendered once into a half-scale map
       and only rebuilt when something about it actually changes; the per-frame
       cost is one blit, with lamp flicker riding on the alpha. */
    if (lights.length && k > 0) {
      const bucket = Math.round(night * 10) / 10;
      const key = `${W}x${H}|${bucket}|${lights
        .map(
          (L) =>
            `${L.x | 0},${L.y | 0},${L.r | 0},${L.color},${L.strength.toFixed(2)}` +
            (L.block && L.block.length
              ? "|" + L.block.map((r) => `${r.x | 0},${r.y | 0},${r.w | 0},${r.h | 0}`).join(">")
              : ""),
        )
        .join(";")}`;
      if (key !== this.lmKey) {
        this.lmKey = key;
        this.buildLightMap(lights, W, H, bucket);
      }
      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = Math.max(0, Math.min(1, flicker)) * k;
      g.drawImage(this.lm, 0, 0, W, H);
      g.restore();
    }

    /* ------------------------------------------------------------- bloom */
    /* Square the frame against itself so only the bright parts survive,
       blur what is left, then add it back. Cheap, and it behaves like a
       real highlight bloom rather than a general haze. */
    if (k > 0) {
      const ga = this.a.getContext("2d")!;
      const gb = this.b.getContext("2d")!;
      ga.setTransform(1, 0, 0, 1, 0, 0);
      ga.globalCompositeOperation = "source-over";
      ga.globalAlpha = 1;
      ga.clearRect(0, 0, W, H);
      ga.drawImage(low, 0, 0);
      ga.globalCompositeOperation = "multiply";
      ga.drawImage(low, 0, 0);
      ga.globalCompositeOperation = "source-over";

      gb.setTransform(1, 0, 0, 1, 0, 0);
      gb.clearRect(0, 0, W, H);
      try {
        gb.filter = "blur(3px)";
      } catch {
        /* no filter support — bloom degrades to a soft copy, which is fine */
      }
      gb.drawImage(this.a, 0, 0);
      gb.filter = "none";

      g.save();
      g.globalCompositeOperation = "lighter";
      g.globalAlpha = 0.13 * k;
      g.drawImage(this.b, 0, 0);
      g.restore();
    }

    /* ---------------------------------------------------------- vignette */
    {
      const rad = Math.hypot(W, H) * 0.62;
      const grd = g.createRadialGradient(W / 2, H * 0.48, rad * 0.34, W / 2, H * 0.48, rad);
      const depth = (0.34 + night * 0.16) * k;
      grd.addColorStop(0, "rgba(4,3,10,0)");
      grd.addColorStop(0.65, `rgba(4,3,10,${(depth * 0.35).toFixed(3)})`);
      grd.addColorStop(1, `rgba(4,3,10,${depth.toFixed(3)})`);
      g.save();
      g.fillStyle = grd;
      g.fillRect(0, 0, W, H);
      g.restore();
    }

    /* ------------------------------------------------------------- grain */
    if (this.grain) {
      const ox = Math.floor((clock / 90) % GRAIN);
      const oy = Math.floor((clock / 55) % GRAIN);
      const pat = g.createPattern(this.grain, "repeat");
      if (pat) {
        g.save();
        g.globalCompositeOperation = "overlay";
        g.globalAlpha = 0.06 * k;
        g.translate(-ox, -oy);
        g.fillStyle = pat;
        g.fillRect(ox, oy, W, H);
        g.restore();
      }
    }
  }
  /**
   * A final, finer grain at screen resolution. The buffer grain quantises with
   * the pixels; this one sits on top like film, which is what stops the
   * upscale looking like a screenshot zoomed in.
   */
  grainPass(g: CanvasRenderingContext2D, w: number, h: number, clock: number) {
    if (this.intensity <= 0) return;
    if (!this.grain) this.grain = makeGrain();
    const pat = g.createPattern(this.grain, "repeat");
    if (!pat) return;
    const ox = Math.floor((clock / 70) % GRAIN);
    const oy = Math.floor((clock / 43) % GRAIN);
    g.save();
    g.globalCompositeOperation = "overlay";
    g.globalAlpha = 0.045 * this.intensity;
    g.translate(-ox, -oy);
    g.fillStyle = pat;
    g.fillRect(ox, oy, w, h);
    g.restore();
  }
}

/** A tile of monochrome noise, generated once and reused every frame. */
function makeGrain(): HTMLCanvasElement {
  const c = makeCanvas(GRAIN, GRAIN);
  const g = c.getContext("2d")!;
  const img = g.createImageData(GRAIN, GRAIN);
  const r = rng(0x51ee7);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 110 + Math.floor(r() * 90);
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
