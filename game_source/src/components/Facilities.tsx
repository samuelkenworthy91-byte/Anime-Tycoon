import { useState } from "react";
import { ArrowUpCircle, Check, ChevronDown, ChevronUp, Hammer, Lock } from "lucide-react";
import { Btn } from "../fx/fx";
import { sfx } from "../engine/audio";
import { formatGBP } from "../engine/data";
import {
  FACILITY_DEFS,
  MAX_TIER,
  facilityUpkeep,
  nextTier,
  slotsUsed,
  type FacilityDef,
} from "../engine/facilities";
import { facilityBlockReason, officeSlots, type RunState } from "../engine/state";
import { cn } from "../utils/cn";

const CATEGORY_LABEL: Record<FacilityDef["category"], string> = {
  production: "PRODUCTION",
  marketing: "MARKETING",
  people: "PEOPLE",
  revenue: "REVENUE",
};

function TierPips({ tier, color }: { tier: number; color: string }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: MAX_TIER }, (_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-sm"
          style={{ background: i < tier ? color : "rgba(255,255,255,.12)" }}
        />
      ))}
    </span>
  );
}

function FacilityCard({
  def,
  run,
  onBuy,
}: {
  def: FacilityDef;
  run: RunState;
  onBuy: (id: FacilityDef["id"]) => void;
}) {
  const tier = run.facilities[def.id] ?? 0;
  const owned = tier > 0;
  const nx = nextTier(run.facilities, def.id);
  const block = nx ? facilityBlockReason(run, def.id) : "Already at maximum tier";
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("ink-card p-3", owned && "border-l-4")} style={owned ? { borderLeftColor: def.color } : undefined}>
      <button className="flex w-full items-center gap-2 text-left" onClick={() => { sfx.click(); setOpen((o) => !o); }}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-display text-sm font-extrabold" style={owned ? { color: def.color } : undefined}>
              {def.name}
            </span>
            <span className="ink-chip px-1.5 py-0.5 text-[8px] font-bold text-paper/40">{CATEGORY_LABEL[def.category]}</span>
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-[10px] text-paper/50">
            {owned ? (
              <>
                <TierPips tier={tier} color={def.color} />
                <span className="font-bold" style={{ color: def.color }}>TIER {tier}/{MAX_TIER}</span>
                <span>· upkeep {formatGBP(def.tiers[tier - 1].upkeep)}/wk</span>
              </>
            ) : (
              <span className="italic">not built</span>
            )}
          </span>
        </span>
        <span className="text-paper/40">{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</span>
      </button>

      {/* current effect, always visible once owned */}
      {owned && (
        <ul className="mt-1.5 space-y-0.5">
          {def.effects(tier).map((line, i) => (
            <li key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-mint">
              <Check size={10} className="shrink-0" /> {line}
            </li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-2 border-t border-line/60 pt-2">
          <div className="text-[10px] italic text-paper/45">{def.blurb}</div>

          {nx ? (
            <>
              <div className="mt-2 text-[9px] font-bold tracking-[0.2em] text-paper/40">
                {owned ? `TIER ${nx.tier} UPGRADE` : "CONSTRUCTION"}
              </div>
              <ul className="mt-1 space-y-0.5">
                {def.effects(nx.tier).map((line, i) => (
                  <li key={i} className="text-[10px] text-cyanx">→ {line}</li>
                ))}
              </ul>
              <div className="mt-2 flex items-center gap-2">
                <Btn
                  variant={owned ? "cyan" : "gold"}
                  className="!px-3 !py-1.5 text-[10px]"
                  disabled={!!block}
                  onClick={() => onBuy(def.id)}
                >
                  {owned ? <ArrowUpCircle size={13} /> : <Hammer size={13} />}
                  {owned ? "UPGRADE" : "BUILD"} — {formatGBP(nx.cost)}
                  {nx.rd > 0 && <span className="text-viol"> + {nx.rd} RD</span>}
                </Btn>
                <span className="text-[9px] text-paper/45">upkeep {formatGBP(def.tiers[nx.tier - 1].upkeep)}/wk</span>
              </div>
              {block && (
                <div className="mt-1 flex items-center gap-1 text-[9px] font-bold text-neon">
                  <Lock size={9} /> {block}
                </div>
              )}
            </>
          ) : (
            <div className="mt-2 text-[10px] font-bold text-gold">Fully upgraded.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function FacilitiesPanel({
  run,
  onBuy,
}: {
  run: RunState;
  onBuy: (id: FacilityDef["id"]) => void;
}) {
  const used = slotsUsed(run.facilities);
  const total = officeSlots(run);
  const upkeep = facilityUpkeep(run.facilities);
  const owned = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) > 0);
  const buildable = FACILITY_DEFS.filter((d) => (run.facilities[d.id] ?? 0) === 0);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-[10px] font-bold">
        <span className="tracking-[0.25em] text-paper/45">ROOMS {used}/{total}</span>
        <span className="flex gap-1">
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn("h-2.5 w-2.5 rounded-sm", i < used ? "bg-cyanx" : "border border-line bg-panel3/50")} />
          ))}
        </span>
        {upkeep > 0 && <span className="ml-auto text-paper/45">upkeep {formatGBP(upkeep)}/wk</span>}
      </div>
      <div className="text-[9px] text-paper/40">
        Rooms occupy one slot each — a small studio must specialise. Upgrades never need a new slot. Moving office takes every room with you.
      </div>

      {owned.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold tracking-[0.25em] text-paper/40">YOUR ROOMS</div>
          {owned.map((d) => (
            <FacilityCard key={d.id} def={d} run={run} onBuy={onBuy} />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="text-[10px] font-bold tracking-[0.25em] text-paper/40">
          BUILD {used >= total && <span className="text-neon">— NO FREE ROOMS (relocate for more)</span>}
        </div>
        {buildable.map((d) => (
          <FacilityCard key={d.id} def={d} run={run} onBuy={onBuy} />
        ))}
      </div>
    </div>
  );
}
