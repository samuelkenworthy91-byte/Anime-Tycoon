import { AlertTriangle, Banknote, Brain, Sparkles, TrendingUp } from "lucide-react";
import type { StudioEvent } from "../engine/events";
import { sfx } from "../engine/audio";

const CATEGORY_ICON = (category?: string) => {
  const c = (category ?? "").toLowerCase();
  if (c.includes("research")) return <Brain size={18} />;
  if (c.includes("market") || c.includes("distribution") || c.includes("business")) return <TrendingUp size={18} />;
  if (c.includes("finance") || c.includes("merch")) return <Banknote size={18} />;
  if (c.includes("crisis")) return <AlertTriangle size={18} />;
  return <Sparkles size={18} />;
};

export default function DecisionEventOverlay({
  event,
  onChoose,
}: {
  event: StudioEvent;
  onChoose: (choiceId: string) => void;
}) {
  const advanced = event.kind === "decision";
  const headline = advanced ? event.headline ?? "STUDIO DECISION" : "STUDIO DILEMMA";
  const category = advanced ? event.category ?? "INDUSTRY EVENT" : "STUDIO EVENT";

  return (
    <div className="fixed inset-0 z-[2147482500] flex items-start justify-center overflow-y-auto bg-[#151022]/[0.98] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+34px)] pt-[calc(env(safe-area-inset-top,0px)+24px)] backdrop-blur-md">
      <div className="anim-pop my-auto w-full max-w-xl rounded-2xl border border-gold/35 bg-panel p-4 shadow-2xl sm:p-6">
        <div className="flex items-center gap-2 text-gold">
          {CATEGORY_ICON(category)}
          <span className="text-[10px] font-extrabold tracking-[0.28em]">{category.toUpperCase()}</span>
        </div>
        <h2 className="mt-2 font-display text-2xl font-extrabold leading-tight text-paper sm:text-3xl">{headline}</h2>
        <p className="mt-3 text-[13px] leading-relaxed text-paper/80 sm:text-sm">{event.text}</p>

        <div className="mt-4 rounded-xl border border-neon/25 bg-neon/[0.06] px-3 py-2 text-[10px] font-bold leading-relaxed text-neon/85">
          THE CLOCK IS STOPPED. You must make a decision before the studio continues.
        </div>

        <div className="mt-4 space-y-2.5">
          {event.choices.map((choice, index) => (
            <button
              key={choice.id}
              onClick={() => {
                index === 0 ? sfx.fanfare() : sfx.select();
                onChoose(choice.id);
              }}
              className="btn-press w-full rounded-xl border border-line bg-panel2 px-3 py-3 text-left transition-colors hover:border-gold/50 hover:bg-gold/[0.06]"
            >
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-paper/15 bg-abyss text-[10px] font-extrabold text-paper/55">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-extrabold tracking-wide text-paper">{choice.label}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-cyanx">{choice.effect}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-4 text-center text-[9px] font-bold tracking-[0.18em] text-paper/30">NO UNDO · COSTS AND CONSEQUENCES APPLY IMMEDIATELY</div>
      </div>
    </div>
  );
}
