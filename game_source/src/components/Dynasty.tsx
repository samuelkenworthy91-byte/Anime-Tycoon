import { useMemo } from "react";
import { Banknote, Building2, GraduationCap, Landmark, Crown, Scale, Trophy, Check, Users, Database } from "lucide-react";
import { Btn } from "../fx/fx";
import {
  DYNASTY_INVESTMENTS,
  computeIndustryRecords,
  dynastyDifficulty,
  dynastyYear,
  investmentBlockReason,
  type InvestmentDef,
} from "../engine/legacy";
import { formatGBP, formatNum, yearOfWeek, ROLE_POINT } from "../engine/data";
import type { RunState } from "../engine/state";
import { cn } from "../utils/cn";

export default function DynastyPanel({ run, onBuy }: { run: RunState; onBuy: (id: string) => void }) {
  const diff = dynastyDifficulty(run);
  const y = dynastyYear(run);
  const records = useMemo(() => run.dynasty?.records ?? computeIndustryRecords(run), [run]);

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------ dynasty status */}
      <div className="rounded-xl border border-gold/40 bg-gold/10 p-3">
        <div className="flex items-center gap-2">
          <Crown size={16} className="text-gold" />
          <span className="font-display text-base font-extrabold text-gold">STUDIO DYNASTY</span>
          <span className="ml-auto rounded-lg border border-gold/50 bg-ink/40 px-2 py-0.5 font-display text-xs font-extrabold text-gold">
            YEAR {y + 1} OF EMPIRE
          </span>
        </div>
        <p className="mt-1 text-[11px] text-paper/60">
          The campaign ended, but the studio endures. The industry gets hungrier every year — wages climb, the audience
          expects more, rivals sharpen their craft, and your franchises tire faster. Spend big to stay on top.
        </p>
      </div>

      {/* ------------------------------------------------ difficulty */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Rec icon={<Users size={13} className="text-neon" />} k="Staff salaries" v={`×${diff.salaryMult.toFixed(2)}`} />
        <Rec icon={<Scale size={13} className="text-viol" />} k="Audience bar" v={`+${diff.expectationBoost.toFixed(0)}`} />
        <Rec icon={<Trophy size={13} className="text-cyanx" />} k="Rival craft" v={`+${diff.rivalBoost.toFixed(0)}`} />
        <Rec icon={<Database size={13} className="text-gold" />} k="Franchise fatigue" v={`+${diff.fatigueAdd.toFixed(0)}/entry`} />
        <Rec icon={<Banknote size={13} className="text-mint" />} k="Rest recovery" v={`×${diff.restMult.toFixed(2)}`} />
      </div>

      {/* ------------------------------------------------ investments */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-gold">
          <Building2 size={14} /> EMPIRE INVESTMENTS
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {DYNASTY_INVESTMENTS.map((d) => (
            <InvestmentCard key={d.id} run={run} def={d} onBuy={onBuy} />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------ records */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-cyanx">
          <Landmark size={14} /> ALL-TIME INDUSTRY RECORDS
        </div>
        <div className="space-y-1.5">
          {records.map((r) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-2.5 py-2",
                r.player ? "border-gold/60 bg-gold/10" : "border-line/60 bg-panel2/50"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-wider text-paper/45">{r.label.toUpperCase()}</div>
                <div className="truncate text-sm font-bold">
                  {r.holder}
                  {r.player && <Crown size={12} className="ml-1 inline text-gold" />}
                </div>
                {r.title && <div className="truncate text-[10px] text-paper/50">“{r.title}” · Year {r.year}</div>}
              </div>
              <div className="text-right font-display text-base font-extrabold text-gold">{recordValue(r)}</div>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-paper/40">
          Records refresh every year end. Out-gross, out-fan and out-award the whole industry to hoard the crown.
        </p>
      </div>

      {/* ------------------------------------------------ legacies */}
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-viol">
          <GraduationCap size={14} /> LEGACY OF LEGENDS
        </div>
        {(run.dynasty?.legacies ?? []).length === 0 ? (
          <div className="rounded-xl border border-dashed border-line p-3 text-center text-xs text-paper/40">
            Long-serving staff will retire here and mentor the next generation before they go. Their legacy lives on.
          </div>
        ) : (
          <div className="space-y-1.5">
            {(run.dynasty?.legacies ?? []).map((l, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-viol/40 bg-viol/5 px-2.5 py-2">
                <GraduationCap size={14} className="shrink-0 text-viol" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">{l.name}</div>
                  <div className="text-[10px] text-paper/55">
                    Retired Year {yearOfWeek(l.retiredWeek)} · +3% {ROLE_POINT[l.role]} forever
                    {l.mentored ? ` · mentored ${l.mentored}` : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function recordValue(r: { id: string; value: number }): string {
  if (r.id === "grossing" || r.id === "movie") return formatGBP(r.value);
  if (r.id === "fanbase") return formatNum(r.value);
  if (r.id === "franchise") return `${r.value} entries`;
  return `${r.value} awards`;
}

function InvestmentCard({ run, def, onBuy }: { run: RunState; def: InvestmentDef; onBuy: (id: string) => void }) {
  const owned = (run.dynasty?.investments ?? []).some((i) => i.id === def.id);
  const block = investmentBlockReason(run, def.id);
  return (
    <div className={cn("ink-card p-3", owned && "border-mint/50")}>
      <div className="flex items-center gap-1.5">
        <span className="font-display text-sm font-extrabold">{def.name}</span>
        {owned && <Check size={14} className="text-mint" />}
      </div>
      <div className="mt-0.5 text-[11px] text-paper/55">{def.blurb}</div>
      <ul className="mt-1.5 space-y-0.5">
        {def.effects.map((e, i) => (
          <li key={i} className="text-[11px] font-bold text-mint">
            {e}
          </li>
        ))}
      </ul>
      <div className="mt-2">
        {owned ? (
          <span className="font-display text-xs font-extrabold text-mint">OWNED</span>
        ) : (
          <Btn
            variant="gold"
            className="w-full !px-3 !py-1.5 text-xs"
            disabled={!!block}
            onClick={() => onBuy(def.id)}
          >
            {formatGBP(def.cost)} {block ? `— ${block}` : ""}
          </Btn>
        )}
      </div>
    </div>
  );
}

function Rec({ icon, k, v }: { icon: React.ReactNode; k: string; v: string }) {
  return (
    <div className="rounded-xl border border-line bg-panel2/60 p-2 text-center">
      <div className="flex items-center justify-center gap-1 text-[9px] font-bold tracking-wider text-paper/40">
        {icon} {k.toUpperCase()}
      </div>
      <div className="mt-0.5 truncate font-display text-sm font-extrabold">{v}</div>
    </div>
  );
}
