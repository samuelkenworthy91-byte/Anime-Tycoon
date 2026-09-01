import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { sfx } from "../engine/audio";
import { cn } from "../utils/cn";

type BurstKind = "spark" | "coin" | "paper" | "ink" | "star";

interface FxApi {
  shake: (power: number) => void;
  burst: (x: number, y: number, kind?: BurstKind, count?: number) => void;
}

const FxCtx = createContext<FxApi>({ shake: () => {}, burst: () => {} });
export const useFx = () => useContext(FxCtx);

const PALETTES: Record<BurstKind, string[]> = {
  spark: ["#ffd166", "#ffffff", "#3be1ff", "#ff85b3"],
  coin: ["#ffd166", "#ffb020", "#fff3c4"],
  paper: ["#ff4d8d", "#3be1ff", "#ffd166", "#8b5cf6", "#5ef0c0", "#f2ecdf"],
  ink: ["#ff4d8d", "#a78bfa", "#ff85b3"],
  star: ["#ffffff", "#ffd166", "#3be1ff"],
};

let live = 0;

export function FxProvider({ children }: { children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const energy = useRef(0);
  const raf = useRef(0);

  const shake = useCallback((power: number) => {
    energy.current = Math.min(26, energy.current + power);
    if (!raf.current) {
      const loop = () => {
        const el = wrapRef.current;
        if (el) {
          if (energy.current > 0.4) {
            const e = energy.current;
            const dx = (Math.random() * 2 - 1) * e;
            const dy = (Math.random() * 2 - 1) * e * 0.7;
            const r = (Math.random() * 2 - 1) * e * 0.12;
            el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) rotate(${r.toFixed(2)}deg)`;
            energy.current *= 0.88;
            raf.current = requestAnimationFrame(loop);
          } else {
            el.style.transform = "";
            energy.current = 0;
            raf.current = 0;
            return;
          }
        } else {
          raf.current = 0;
          return;
        }
      };
      raf.current = requestAnimationFrame(loop);
    }
  }, []);

  const burst = useCallback((x: number, y: number, kind: BurstKind = "spark", count = 14) => {
    const layer = layerRef.current;
    if (!layer || live > 220) return;
    const colors = PALETTES[kind];
    for (let i = 0; i < count; i++) {
      live++;
      const el = document.createElement("div");
      const size = kind === "paper" ? 5 + Math.random() * 7 : 3 + Math.random() * 6;
      const color = colors[Math.floor(Math.random() * colors.length)];
      el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${
        kind === "paper" ? size * 0.5 : size
      }px;background:${color};pointer-events:none;z-index:90;${
        kind === "coin"
          ? "border-radius:50%;box-shadow:0 0 8px rgba(255,209,102,.8);"
          : kind === "star"
            ? "border-radius:50%;box-shadow:0 0 10px #fff;"
            : kind === "paper"
              ? "border-radius:1px;"
              : "border-radius:2px;transform:rotate(45deg);"
      }`;
      layer.appendChild(el);
      const ang = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * (kind === "paper" ? 180 : 120);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - (kind === "coin" ? 90 : 40);
      const grav = kind === "paper" || kind === "coin" ? 160 : 60;
      const rot = (Math.random() * 2 - 1) * (kind === "paper" ? 720 : 360);
      const anim = el.animate(
        [
          { transform: "translate(0px,0px) rotate(0deg) scale(1)", opacity: 1 },
          {
            transform: `translate(${dx}px, ${dy + grav}px) rotate(${rot}deg) scale(${kind === "ink" ? 1.6 : 0.4})`,
            opacity: 0,
          },
        ],
        { duration: 550 + Math.random() * 650, easing: "cubic-bezier(.15,.85,.35,1)", fill: "forwards" }
      );
      anim.onfinish = () => {
        el.remove();
        live--;
      };
    }
  }, []);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <FxCtx.Provider value={{ shake, burst }}>
      <div ref={wrapRef} className="h-full w-full will-change-transform">
        {children}
      </div>
      <div ref={layerRef} className="pointer-events-none fixed inset-0 z-[90] overflow-hidden" />
    </FxCtx.Provider>
  );
}

/* ---------------------------------------------------------------- CountUp */
export function CountUp({
  to,
  duration = 900,
  format = (n: number) => Math.round(n).toLocaleString("en-US"),
  className,
  onDone,
}: {
  to: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  onDone?: () => void;
}) {
  const [val, setVal] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    let rafId = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from + (to - from) * e);
      if (p < 1) rafId = requestAnimationFrame(tick);
      else {
        fromRef.current = to;
        onDone?.();
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);
  return <span className={className}>{format(val)}</span>;
}

/* ------------------------------------------------------------------- Btn */
export function Btn({
  children,
  onClick,
  variant = "ghost",
  className,
  disabled,
  big,
  title,
}: {
  children: ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: "primary" | "ghost" | "gold" | "cyan" | "danger";
  className?: string;
  disabled?: boolean;
  big?: boolean;
  title?: string;
}) {
  const { burst } = useFx();
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-br from-neon to-viol text-white shadow-[0_6px_24px_rgba(255,77,141,.45)] border border-neon2/40",
    gold: "bg-gradient-to-br from-gold to-[#ff9f43] text-[#231303] shadow-[0_6px_24px_rgba(255,209,102,.4)] border border-gold/50",
    cyan: "bg-gradient-to-br from-cyanx to-viol text-[#03222b] shadow-[0_6px_24px_rgba(59,225,255,.35)] border border-cyanx/50",
    danger: "bg-gradient-to-br from-[#ff4d4d] to-neon text-white border border-neon2/40",
    ghost: "bg-panel2 text-paper border border-line hover:border-neon/50 hover:bg-panel3",
  };
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={(e) => {
        if (disabled) return;
        sfx.click();
        const r = e.currentTarget.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, variant === "gold" ? "coin" : "spark", 8);
        onClick?.(e);
      }}
      className={cn(
        "btn-press font-display font-bold tracking-wide rounded-2xl inline-flex items-center justify-center gap-2 select-none",
        big ? "px-8 py-4 text-lg" : "px-5 py-2.5 text-sm",
        styles[variant],
        disabled && "opacity-40 saturate-0 pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}
