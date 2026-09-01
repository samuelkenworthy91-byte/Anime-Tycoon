import { useState } from "react";
import { AlertTriangle, Check, ChevronLeft, Megaphone, Rocket, Scissors } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { POINT_COLOR, POINT_LABEL, PROMOS, formatGBP, type PointType } from "../engine/data";
import type { RunState } from "../engine/state";
import { facilityFX } from "../engine/facilities";
import { lateRevenueMult, type Project } from "../engine/projects";
import { cn } from "../utils/cn";

/** Release prep: buy promotion, then air — or step back and delay. */
export default function Ship({
  run,
  project,
  onAir,
  onBack,
}: {
  run: RunState;
  project: Project;
  /** commit: extra promo spend + final hype */
  onAir: (spent: number, hype: number) => void;
  onBack: () => void;
}) {
  const [spent, setSpent] = useState(0);
  const [hype, setHype] = useState(project.hype);
  const [bought, setBought] = useState<string[]>([]);

  const totalPts = project.points.story + project.points.art + project.points.sound;
  const lateMult = lateRevenueMult(project);
  const fx = facilityFX(run.facilities);
  const mktTier = run.facilities.marketing ?? 0;

  const buyPromo = (id: string, cost: number, h: number) => {
    sfx.cash();
    setSpent((s) => s + cost);
    setHype((x) => Math.min(100, x + h));
    setBought((p) => [...p, id]);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-ink gridlines">
      <div className="pointer-events-none absolute inset-0 screentone opacity-40" />

      <div className="relative z-10 flex items-center gap-2 border-b border-line/60 bg-ink/75 py-2 pl-3 pr-[76px] backdrop-blur-md">
        <span className="shrink-0 rounded-md bg-gold px-2 py-0.5 text-[10px] font-bold text-ink">RELEASE PREP</span>
        <span className="truncate font-display text-sm font-extrabold">{project.draft.title}</span>
      </div>

      <div className="nice-scroll relative z-10 mx-auto w-full max-w-3xl flex-1 overflow-y-auto p-4">
        <div className="text-center">
          <div className="text-[11px] tracking-[0.4em] text-gold">MASTER COMPLETE</div>
          <h2 className="font-display text-2xl font-extrabold md:text-3xl">READY TO AIR</h2>
          <p className="mt-1 text-xs text-paper/60">Buy promotion before it airs — hype drives the opening week.</p>
        </div>

        <div className="ink-card mt-3 grid grid-cols-3 gap-2 p-3 text-center">
          {(["story", "art", "sound"] as PointType[]).map((t) => (
            <div key={t}>
              <div className="font-display text-2xl font-extrabold" style={{ color: POINT_COLOR[t] }}>
                {project.points[t]}
              </div>
              <div className="text-[9px] font-bold text-paper/50">{POINT_LABEL[t].toUpperCase()}</div>
              <div className="mt-1 h-1.5 rounded bg-abyss">
                <div
                  className="h-full rounded"
                  style={{ width: `${totalPts ? (project.points[t] / totalPts) * 100 : 0}%`, background: POINT_COLOR[t] }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between rounded-xl border border-line bg-panel2/70 px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5 font-bold text-[#ff5e5e]">
            <Scissors size={13} /> {project.issues} unresolved editing notes
          </span>
          <span className="text-paper/50">−{(project.issues * 0.9).toFixed(1)} review points</span>
        </div>

        {project.lateWeeks > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-neon/50 bg-neon/10 px-3 py-2 text-xs font-bold text-neon">
            <AlertTriangle size={14} />
            {project.lateWeeks} week{project.lateWeeks > 1 ? "s" : ""} past the deadline — the broadcaster pays ×
            {lateMult.toFixed(2)} on revenue.
          </div>
        )}

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {PROMOS.map((p) => {
            const locked = p.locked && !run.research.includes("marketing") && !fx.promoUnlock;
            const isBought = bought.includes(p.id);
            /* the marketing office negotiates rates and amplifies every campaign */
            const cost = Math.round(p.cost * (1 - fx.promoDiscount));
            const hypeGain = Math.round(p.hype * fx.hypeMult);
            const afford = run.cash - spent >= cost;
            return (
              <div key={p.id} className={cn("ink-card p-3", isBought && "border-mint/60")}>
                <div className="flex items-center gap-1.5">
                  <Megaphone size={14} className="text-gold" />
                  <span className="font-display text-sm font-extrabold">{p.name}</span>
                  <span className="ml-auto text-[10px] font-bold text-cyanx">
                    +{hypeGain} hype
                    {hypeGain > p.hype && <span className="text-mint"> ↑</span>}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-paper/50">{p.desc}</div>
                <div className="mt-2">
                  {isBought ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-mint">
                      <Check size={12} /> BOOKED
                    </span>
                  ) : locked ? (
                    <span className="text-[10px] font-bold text-paper/40">Research “Marketing Dept.” or build a tier-2 Marketing Office</span>
                  ) : (
                    <Btn variant="gold" className="!px-3 !py-1.5 text-xs" disabled={!afford} onClick={() => buyPromo(p.id, cost, hypeGain)}>
                      BOOK {formatGBP(cost)}
                      {cost < p.cost && <s className="ml-1 text-[9px] opacity-60">{formatGBP(p.cost)}</s>}
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
          {mktTier > 0 && (
            <div className="ink-card border-dashed p-2.5 text-[9px] text-paper/45 sm:col-span-2">
              Marketing Office tier {mktTier}: hype gains ×{fx.hypeMult.toFixed(2)}, campaign prices −{Math.round(fx.promoDiscount * 100)}%.
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-line bg-panel2/70 p-3">
          <span className="text-xs font-bold text-paper/60">HYPE</span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-abyss">
            <div className="h-full rounded-full bg-gradient-to-r from-neon to-gold transition-all duration-500" style={{ width: `${hype}%` }} />
          </div>
          <span className="font-display text-sm font-extrabold text-gold">{hype}%</span>
        </div>

        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={onBack}>
            <ChevronLeft size={16} /> DELAY
          </Btn>
          <Btn big variant="gold" className="flex-1" onClick={() => onAir(spent, hype)}>
            <Rocket size={20} /> AIR THE SHOW!
          </Btn>
        </div>
        <div className="mt-1.5 text-center text-[9px] text-paper/45">
          Delaying keeps the team polishing (issues fall each week) but production costs keep burning and hype cools.
        </div>
      </div>
    </div>
  );
}
