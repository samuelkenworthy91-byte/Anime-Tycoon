import { useEffect, useRef } from "react";
import { StudioScene, type StudioStaff } from "../pixel/studio";
import { clamp } from "../pixel/pen";
import { Hd2d } from "../pixel/post";

export interface OfficeStaff extends StudioStaff {}

/**
 * The studio, rendered as animated pixel art.
 *
 * The scene is drawn into a small offscreen buffer (a few hundred pixels
 * across) and blitted to the visible canvas with nearest-neighbour sampling,
 * so it stays chunky and crisp instead of turning into smooth vector soup.
 * Only the staff name tags are drawn at screen resolution — text at 3px tall
 * would be unreadable.
 */
export default function OfficeScene({
  level,
  boss,
  staff,
  maxStaff,
  timeOfDay,
  awards = 0,
  /** 0 = classic flat pixels, 1 = full HD-2D */
  hd2d = 1,
  onDeskClick,
}: {
  level: number;
  boss: OfficeStaff;
  staff: OfficeStaff[];
  maxStaff: number;
  /** 0..1 fraction of the in-game day */
  timeOfDay: number;
  awards?: number;
  /** 0 = classic flat pixels, 1 = full HD-2D. Read live, so toggling it does
      not tear down and rebuild the scene. */
  hd2d?: number;
  onDeskClick?: (deskIndex: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const latest = useRef({ level, boss, staff, maxStaff, timeOfDay, awards, onDeskClick, hd2d });
  latest.current = { level, boss, staff, maxStaff, timeOfDay, awards, onDeskClick, hd2d };

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const g = canvas.getContext("2d")!;
    const low = document.createElement("canvas");
    const lg = low.getContext("2d")!;
    const scene = new StudioScene();
    const hd = new Hd2d();

    let scale = 1;
    let ox = 0;
    let oy = 0;
    let dpr = 1;

    const resize = () => {
      const cw = Math.max(1, wrap.clientWidth);
      const ch = Math.max(1, wrap.clientHeight);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(cw * dpr);
      canvas.height = Math.round(ch * dpr);
      canvas.style.width = `${cw}px`;
      canvas.style.height = `${ch}px`;

      /* pick a low-res buffer that matches the container's aspect ratio */
      const aspect = cw / ch;
      let H = 144;
      let W = Math.round(H * aspect);
      if (W < 150) {
        W = 150;
        H = Math.round(W / aspect);
      }
      if (W > 400) {
        W = 400;
        H = Math.round(W / aspect);
      }
      H = clamp(H, 96, 220);
      low.width = W;
      low.height = H;
      scene.setSize(W, H);

      /* cover-fit, integer-ish scale, centred */
      scale = Math.max(canvas.width / W, canvas.height / H);
      ox = (canvas.width - W * scale) / 2;
      oy = (canvas.height - H * scale) / 2;
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) * dpr - ox) / scale;
      const sy = ((e.clientY - rect.top) * dpr - oy) / scale;
      const hit = scene.hitDesk(sx, sy);
      if (hit !== null) latest.current.onDeskClick?.(hit);
    };
    canvas.addEventListener("pointerdown", onPointer);

    let last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const l = latest.current;
      scene.configure({
        level: l.level,
        boss: l.boss,
        staff: l.staff,
        maxStaff: l.maxStaff,
        timeOfDay: l.timeOfDay,
        awards: l.awards,
      });
      scene.update(dt);
      /* depth of field is part of the HD look, so it follows the toggle */
      scene.dof = l.hd2d > 0.5;
      scene.draw(lg);

      /* HD-2D: bloom, lamp light, grade, vignette, grain. All of it runs on
         the tiny buffer, so the light is shaded per art pixel and the chunky
         silhouettes survive the upscale untouched. */
      hd.intensity = l.hd2d;
      const amb = scene.ambient();
      hd.render(low, scene.lights(), amb.color, amb.mix, amb.night, now, scene.flicker());

      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.fillStyle = "#0a0812";
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(low, 0, 0, low.width, low.height, ox, oy, low.width * scale, low.height * scale);
      drawLabels(g, scene, ox, oy, scale);
      hd.grainPass(g, canvas.width, canvas.height, now); // returns immediately when intensity is 0

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0 h-full w-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute left-0 top-0" />
    </div>
  );
}

/** name tags — the one thing drawn at screen resolution */
function drawLabels(g: CanvasRenderingContext2D, scene: StudioScene, ox: number, oy: number, scale: number) {
  const spots = scene.labelSpots();
  const font = Math.max(10, Math.min(26, Math.round(2.6 * scale)));
  g.font = `700 ${font}px "Space Grotesk", system-ui, sans-serif`;
  g.textAlign = "center";
  g.textBaseline = "top";
  for (const s of spots) {
    const x = ox + s.x * scale;
    const y = oy + (s.y + 2) * scale;
    const w = g.measureText(s.text).width;
    g.fillStyle = "rgba(8,6,16,.66)";
    g.fillRect(x - w / 2 - 3, y - 1, w + 6, font + 5);
    g.fillStyle = "rgba(8,6,16,.5)";
    g.fillRect(x - w / 2 - 3, y + font + 4, w + 6, 1);
    g.fillStyle = s.boss ? "#ffd166" : "#efe9dc";
    g.fillText(s.text, x, y + 1);
  }
  g.textBaseline = "alphabetic";
}
