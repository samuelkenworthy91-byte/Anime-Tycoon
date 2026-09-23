import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, Brain, Sparkles, TrendingUp } from "lucide-react";
import type { StudioEvent } from "../engine/events";
import type { DecisionEffect } from "../engine/decisionEvents";
import { sfx } from "../engine/audio";

const CATEGORY_ICON = (category?: string) => {
  const c = (category ?? "").toLowerCase();
  if (c.includes("research")) return <Brain size={18} />;
  if (c.includes("market") || c.includes("distribution") || c.includes("business")) return <TrendingUp size={18} />;
  if (c.includes("finance") || c.includes("merch")) return <Banknote size={18} />;
  if (c.includes("crisis")) return <AlertTriangle size={18} />;
  return <Sparkles size={18} />;
};

const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toLocaleString("en-GB")}`;
const money = (n: number) => `${n >= 0 ? "+" : "−"}£${Math.abs(n).toLocaleString("en-GB")}`;

function effectLine(effect: DecisionEffect): string {
  switch (effect.type) {
    case "cash": return `Cash ${money(effect.amount)}`;
    case "fans": return `Fans ${signed(effect.amount)}`;
    case "rd": return `Research Data ${signed(effect.amount)}`;
    case "staffMorale": return `Staff morale ${signed(effect.amount)} (${effect.staffIds.length})`;
    case "projectHype": return `Project hype ${signed(effect.amount)}`;
    case "projectIssues": return `Production notes ${signed(effect.amount)}`;
    case "projectPoints": return `${effect.point.toUpperCase()} quality ${signed(effect.amount)}`;
    case "franchisePopularity": return `Franchise popularity ${signed(effect.amount)}`;
    case "franchiseFatigue": return `Franchise fatigue ${signed(effect.amount)}`;
    case "marketGenre": return `${effect.genre} market heat ${signed(effect.amount)}`;
    case "activeResearch": return `Active research time −${Math.round(effect.fraction * 100)}%`;
    case "awardBoost": return `${effect.metric.toUpperCase()} awards strength ×${effect.mult.toFixed(2)}`;
    case "modifier": {
      const m = effect.modifier;
      const magnitude = m.mult !== undefined ? ` ×${m.mult.toFixed(2)}` : m.flat !== undefined ? ` ${signed(m.flat)}` : "";
      return `${m.label}${magnitude}`;
    }
  }
}

function impactLines(event: StudioEvent, choiceId: string): string[] {
  const effects = event.payload?.effects?.[choiceId] as DecisionEffect[] | undefined;
  if (effects?.length) return effects.map(effectLine);
  const choice = event.choices.find((item) => item.id === choiceId);
  return choice?.effect ? choice.effect.split(" · ") : ["No immediate numerical change."];
}

export default function DecisionEventOverlay({
  event,
  onChoose,
}: {
  event: StudioEvent;
  onChoose: (choiceId: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => setSelected(null), [event.id]);

  const advanced = event.kind === "decision";
  const headline = advanced ? event.headline ?? "STUDIO DECISION" : "STUDIO DILEMMA";
  const category = advanced ? event.category ?? "INDUSTRY EVENT" : "STUDIO EVENT";
  const chosen = selected ? event.choices.find((choice) => choice.id === selected) : null;
  const impacts = selected ? impactLines(event, selected) : [];

  return (
    <div className="fixed inset-0 z-[2147482500] flex items-start justify-center overflow-y-auto bg-[#151022]/[0.98] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+34px)] pt-[calc(env(safe-area-inset-top,0px)+24px)] backdrop-blur-md">
      <div className="anim-pop my-auto w-full max-w-xl rounded-2xl border border-gold/35 bg-panel p-4 shadow-2xl sm:p-6">
        {!selected ? (
          <>
            <div className="flex items-center gap-2 text-gold">
              {CATEGORY_ICON(category)}
              <span className="text-[10px] font-extrabold tracking-[0.28em]">{category.toUpperCase()}</span>
            </div>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-paper sm:text-3xl">{headline}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-paper/80 sm:text-sm">{event.text}</p>
            <div className="mt-4 rounded-xl border border-viol/30 bg-viol/[0.06] px-3 py-2 text-[10px] font-bold leading-relaxed text-viol">
              MAKE THE CALL · You’ll see what happened after you choose.
            </div>
            <div className="mt-4 space-y-2.5">
              {event.choices.map((choice, index) => (
                <button
                  key={choice.id}
                  onClick={() => {
                    index === 0 ? sfx.fanfare() : sfx.select();
                    setSelected(choice.id);
                  }}
                  className="btn-press w-full rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition-colors hover:border-gold/50 hover:bg-gold/[0.06]"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-paper/15 bg-abyss text-[10px] font-extrabold text-paper/55">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-extrabold tracking-wide text-paper">{choice.label}</div>
                      <div className="mt-1 text-[10px] text-paper/35">Choose based on the situation. Consequences are revealed afterward.</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-[10px] font-extrabold tracking-[0.28em] text-mint">CONSEQUENCE</div>
            <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-paper">YOUR DECISION: {chosen?.label ?? "COMMITTED"}</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-paper/60">This is what your choice changed:</p>
            <div className="mt-4 space-y-2">
              {impacts.map((line, index) => <div key={index} className="rounded-xl border border-mint/30 bg-mint/[0.06] px-3 py-2 text-[12px] font-bold text-mint">{line}</div>)}
            </div>
            <button
              type="button"
              onClick={() => onChoose(selected)}
              className="btn-press mt-5 min-h-12 w-full rounded-xl border border-gold/50 bg-gold/10 font-display text-sm font-extrabold text-gold"
            >
              CONTINUE
            </button>
          </>
        )}
        <div className="mt-4 text-center text-[9px] font-bold tracking-[0.18em] text-paper/30">{selected ? "THE CONSEQUENCE IS LOCKED IN" : "NO UNDO · MAKE THE CALL"}</div>
      </div>
    </div>
  );
}
