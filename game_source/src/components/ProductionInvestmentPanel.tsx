import { BarChart3, Coins, ShieldCheck, Sparkles } from "lucide-react";
import { formatGBPShort } from "../engine/data";
import type { Project } from "../engine/projects";
import type { RunState } from "../engine/state";
import {
  INTERVENTIONS,
  INVESTMENT_TIERS,
  interventionBlock,
  interventionInvestmentKey,
  interventionQuote,
  productionCapabilities,
  type InterventionQuote,
} from "../engine/spending";
import { cn } from "../utils/cn";

function quoteEffect(q: InterventionQuote) {
  const bits: string[] = [];
  if (q.points > 0) bits.push(`+${q.points} ${q.intervention.point ?? "craft"}`);
  if (q.issueDelta < 0) bits.push(`−${Math.abs(q.issueDelta)} notes`);
  else if (q.issueDelta > 0) bits.push(`+${q.issueDelta} notes`);
  if (q.hype !== 0) bits.push(`${q.hype > 0 ? "+" : ""}${q.hype} hype`);
  if (q.days > 0) bits.push(`+${q.days} days`);
  if (q.risk > 0) bits.push(`${Math.round((1 - q.risk) * 100)}% full effect`);
  return bits.join(" · ") || "Operational intervention";
}

export default function ProductionInvestmentPanel({
  run,
  project,
  onIntervention,
}: {
  run: RunState;
  project: Project;
  onIntervention: (investmentKey: string) => void;
}) {
  const capabilities = productionCapabilities(run);
  const relevant = INTERVENTIONS.filter((d) => d.stages.includes(project.stage) || (project.interventions ?? []).includes(d.id));

  return (
    <details className="mt-2 rounded-lg border border-line bg-panel2/50 p-2">
      <summary className="cursor-pointer text-[10px] font-black tracking-widest text-gold">PRODUCTION INVESTMENT & CAPABILITY</summary>

      <div className="mt-2 rounded-lg border border-cyanx/20 bg-cyanx/[.035] p-2">
        <div className="flex items-center gap-1.5 text-[8px] font-black tracking-[0.16em] text-cyanx">
          <BarChart3 size={10} /> PERMANENT STUDIO CAPABILITY
        </div>
        <div className="mt-1 text-[8px] leading-relaxed text-paper/40">
          Qualifying rescue spend builds permanent departmental know-how. Each level costs more; bonuses are intentionally small so the production decision still matters.
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-5">
          {capabilities.map((cap) => {
            const pct = cap.nextThreshold === null ? 100 : Math.min(100, Math.round(cap.spend / Math.max(1, cap.nextThreshold) * 100));
            return (
              <div key={cap.id} className="rounded-md border border-line/60 bg-panel2/70 p-1.5" title={`${cap.description} ${cap.effect}`}>
                <div className="flex items-center justify-between gap-1 text-[7px] font-black">
                  <span className="truncate text-paper/65">{cap.name.toUpperCase()}</span>
                  <span className="shrink-0 text-cyanx">LV{cap.level}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-abyss"><div className="h-full rounded-full bg-cyanx" style={{ width: `${pct}%` }} /></div>
                <div className="mt-0.5 truncate text-[6px] text-paper/35">{cap.nextThreshold === null ? "MASTERED" : `${formatGBPShort(cap.toNext)} to next`}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 space-y-2">
        {relevant.length === 0 && <div className="rounded-lg border border-dashed border-line p-2 text-center text-[9px] text-paper/40">No paid intervention is available at this stage.</div>}
        {relevant.map((d) => {
          const used = (project.interventions ?? []).includes(d.id);
          const cap = d.capability ? capabilities.find((x) => x.id === d.capability) : null;
          const tiers = d.scalable ? INVESTMENT_TIERS : INVESTMENT_TIERS.slice(0, 1);
          return (
            <div key={d.id} className={cn("rounded-lg border bg-panel2/55 p-2", used ? "border-mint/25 opacity-60" : "border-line")}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] font-black text-paper/80">{d.name.toUpperCase()}</div>
                  <div className="text-[7px] leading-relaxed text-paper/40">{d.description}</div>
                </div>
                {cap && <span className="shrink-0 rounded border border-cyanx/30 px-1.5 py-.5 text-[7px] font-black text-cyanx">{cap.name} LV{cap.level}</span>}
                {used && <span className="shrink-0 text-[7px] font-black text-mint">USED</span>}
              </div>

              <div className={cn("mt-1.5 grid gap-1", d.scalable ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1")}>
                {tiers.map((tier) => {
                  const q = interventionQuote(run, d, tier.id);
                  const block = interventionBlock(run, project, d, tier.id);
                  if (!q) return null;
                  const roi = q.points > 0 ? Math.round(q.cost / q.points / 100) * 100 : null;
                  return (
                    <button
                      key={tier.id}
                      disabled={!!block}
                      title={block ?? tier.description}
                      onClick={() => onIntervention(interventionInvestmentKey(d.id, tier.id))}
                      className={cn(
                        "btn-press min-w-0 rounded-md border p-1.5 text-left",
                        block ? "border-line/40 bg-panel2/40 opacity-35" : tier.id === "obsessive" ? "border-neon/45 bg-neon/5 hover:border-neon" : tier.id === "prestige" ? "border-gold/45 bg-gold/5 hover:border-gold" : "border-cyanx/25 bg-cyanx/[.025] hover:border-cyanx"
                      )}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[7px] font-black tracking-wider text-paper/75">{tier.name.toUpperCase()}</span>
                        <span className="flex items-center gap-.5 whitespace-nowrap text-[7px] font-black text-gold"><Coins size={7}/>{formatGBPShort(q.cost)}</span>
                      </div>
                      <div className="mt-0.5 text-[6.5px] leading-snug text-paper/45">{block ?? quoteEffect(q)}</div>
                      {!block && roi !== null && <div className="mt-0.5 text-[6px] text-paper/25">≈ {formatGBPShort(roi)} per craft point</div>}
                    </button>
                  );
                })}
              </div>
              {!d.scalable && <div className="mt-1 flex items-center gap-1 text-[6.5px] text-paper/30"><ShieldCheck size={7}/> Tactical emergency action — deliberately no Prestige/Obsessive version.</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center gap-1 rounded-md border border-gold/15 bg-gold/[.03] px-2 py-1.5 text-[7px] text-paper/35">
        <Sparkles size={9} className="shrink-0 text-gold" /> Higher tiers buy more certainty/output, but cost escalates far faster than the benefit. Capability never makes a weak production automatically good.
      </div>
    </details>
  );
}
