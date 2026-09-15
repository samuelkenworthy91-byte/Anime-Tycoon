import { ChevronLeft, ChevronRight, Crown, Globe2, HelpCircle, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { TutorialId } from "../engine/tutorials";
import { cn } from "../utils/cn";

type PreviewId =
  | "pitch"
  | "project-lead"
  | "rush-lead"
  | "policy-tabs"
  | "policy-options"
  | "policy-schedule"
  | "overseas-title"
  | "overseas-shape"
  | "overseas-sign";

type Step = { title: string; body: string; preview: PreviewId; callout: string };
type Guide = { eyebrow: string; title: string; intro: string; steps: Step[] };

const GUIDES: Record<TutorialId, Guide> = {
  "passion-projects": {
    eyebrow: "CREATOR AMBITIONS",
    title: "HOW PASSION PROJECTS WORK",
    intro: "A passion project is a promise to a member of staff. You can fund their idea, accept the brief, then honour it from the project itself without hunting through menus.",
    steps: [
      { title: "1 · DECIDE ON THE PITCH", body: "In Ambitions, fund development if you want more information, or accept the leadership brief immediately. Declining makes no promise.", preview: "pitch", callout: "Accepting creates a 48-week leadership promise." },
      { title: "2 · PUT THEM ON THE SHOW", body: "Once you greenlight a matching original show, the Project Board surfaces the promise. Assign and name them lead in one action if there is room.", preview: "project-lead", callout: "You do not need to return to Studio Culture." },
      { title: "3 · THE PROMISE FOLLOWS PRODUCTION", body: "The relevant Story, Animation or Sound Rush also shows the promised lead. If you missed the early appointment they can still earn it at 60% department participation.", preview: "rush-lead", callout: "Release the qualifying original show before the deadline." },
    ],
  },
  "working-policies": {
    eyebrow: "STUDIO CULTURE",
    title: "WORKING POLICIES",
    intro: "Policies change how staff recovery, profit sharing and passion-project development work. They are strategic commitments, not instant toggles.",
    steps: [
      { title: "1 · OPEN WORKING POLICIES", body: "Use the Working Policies tab inside Studio Culture. The current policy remains visible underneath so you can compare before committing.", preview: "policy-tabs", callout: "Policy changes are deliberately infrequent." },
      { title: "2 · SET THE THREE TERMS", body: "Choose paid recovery, the staff profit pool and how many days creators reserve for development while doing other work.", preview: "policy-options", callout: "More generous terms improve people management but cost time or money." },
      { title: "3 · SCHEDULE THE CHANGE", body: "Press Schedule Policy Change. The new terms begin at the next four-week payroll boundary; existing productions keep the terms they started with.", preview: "policy-schedule", callout: "You can see the exact start day before it takes effect." },
    ],
  },
  "overseas-markets": {
    eyebrow: "GLOBAL RELEASES",
    title: "OVERSEAS MARKETS",
    intro: "International releases are title-specific. Pick a finished show, shape it for a territory, then choose whether the commercial terms are worth signing.",
    steps: [
      { title: "1 · CHOOSE TITLE + TERRITORY", body: "Start with a released show and the market you want to enter. Each territory has different audience size, sensitivity and genre appetite.", preview: "overseas-title", callout: "A strong domestic show is not automatically a perfect overseas fit." },
      { title: "2 · SHAPE THE RELEASE", body: "Choose the audience segment, edition and content profile. Adaptation can protect reach but may cost money, time or creator goodwill.", preview: "overseas-shape", callout: "The forecast updates as you change the package." },
      { title: "3 · REVIEW, THEN SIGN", body: "Compare distributor terms, projected reach and localisation costs. Sign only when the package fits your goals; the market remembers previous releases.", preview: "overseas-sign", callout: "Overseas decisions affect money, fans and long-term regional strength." },
    ],
  },
};

function MiniButton({ children, hot = false }: { children: React.ReactNode; hot?: boolean }) {
  return <div className={cn("rounded-md border px-2 py-1 text-[8px] font-extrabold", hot ? "border-gold bg-gold/15 text-gold shadow-[0_0_18px_rgba(255,209,102,.25)]" : "border-line bg-panel2 text-paper/55")}>{children}</div>;
}

function ScreenPreview({ kind }: { kind: PreviewId }) {
  const frame = (children: React.ReactNode) => (
    <div className="overflow-hidden rounded-2xl border border-paper/15 bg-ink shadow-[0_16px_45px_rgba(0,0,0,.45)]">
      <div className="flex items-center justify-between border-b border-line bg-panel2/95 px-3 py-2 text-[8px] font-extrabold tracking-[0.2em] text-paper/45"><span>ANIME RUNNER</span><span>SCREEN PREVIEW</span></div>
      <div className="min-h-44 space-y-2 p-3">{children}</div>
    </div>
  );
  if (kind === "pitch") return frame(<><div className="text-[8px] font-black tracking-widest text-viol">STUDIO CULTURE · AMBITIONS</div><div className="rounded-xl border border-viol/40 bg-viol/10 p-2"><div className="text-[10px] font-bold">MAYA · ORIGINAL HORROR</div><div className="mt-1 text-[8px] text-paper/55">“Glass Chapel” · creator vision attached</div><div className="mt-2 flex flex-wrap gap-1"><MiniButton>FUND DEVELOPMENT</MiniButton><MiniButton hot>ACCEPT LEADERSHIP BRIEF</MiniButton><MiniButton>DECLINE</MiniButton></div></div></>);
  if (kind === "project-lead") return frame(<><div className="text-[8px] font-black tracking-widest text-cyanx">PROJECT BOARD · GLASS CHAPEL</div><div className="rounded-xl border border-viol/50 bg-viol/10 p-2"><div className="flex items-center gap-1 text-[9px] font-black text-gold"><Crown size={11}/> PROMISED WRITING LEAD</div><div className="mt-1 text-[8px] text-paper/55">Maya · 0% department participation</div><div className="mt-2"><MiniButton hot>ASSIGN + NAME MAYA WRITING LEAD</MiniButton></div></div></>);
  if (kind === "rush-lead") return frame(<><div className="text-[8px] font-black tracking-widest text-cyanx">STORY RUSH · DIRECTION MEETING</div><div className="rounded-xl border border-viol/50 bg-viol/10 p-2"><div className="flex items-center gap-1 text-[9px] font-black text-gold"><Crown size={11}/> PROMISED WRITING LEAD</div><div className="mt-1 text-[8px] text-paper/55">Maya · 64% department participation</div><div className="mt-2"><MiniButton hot>NAME MAYA WRITING LEAD</MiniButton></div></div><div className="rounded-lg border border-line p-2 text-[8px] text-paper/45">Plot 55% ━━━━━●━━━━ 45% Characters</div></>);
  if (kind === "policy-tabs") return frame(<><div className="flex gap-1"><MiniButton>AMBITIONS</MiniButton><MiniButton hot>WORKING POLICIES</MiniButton><MiniButton>OVERSEAS MARKETS</MiniButton></div><div className="rounded-lg border border-line bg-panel2 p-3 text-[8px] text-paper/55">Changes take effect at the next payroll boundary.</div></>);
  if (kind === "policy-options") return frame(<><div className="flex items-center gap-1 text-[9px] font-black text-gold"><SlidersHorizontal size={11}/> WORKING POLICIES</div>{["Protected recovery · 7 paid days","Staff profit pool · 5%","Creative development · 2 days / 4 weeks"].map((x)=><div key={x} className="rounded-lg border border-line bg-panel2 px-2 py-2 text-[8px] text-paper/70">{x}<span className="float-right text-cyanx">⌄</span></div>)}</>);
  if (kind === "policy-schedule") return frame(<><div className="rounded-xl border border-line bg-panel2 p-3"><div className="text-[8px] text-paper/50">CURRENT · 0 recovery · 0% pool · full-time development</div><div className="mt-2"><MiniButton hot>SCHEDULE POLICY CHANGE</MiniButton></div><div className="mt-2 text-[8px] font-bold text-mint">NEW POLICY BEGINS DAY 84</div></div></>);
  if (kind === "overseas-title") return frame(<><div className="flex items-center gap-1 text-[9px] font-black text-cyanx"><Globe2 size={11}/> OVERSEAS MARKETS</div><div className="rounded-lg border border-gold/40 bg-gold/5 p-2 text-[8px]"><div className="font-bold">TITLE</div><div className="mt-1 rounded bg-panel2 p-2">Moonlit Circuit ⌄</div></div><div className="rounded-lg border border-gold/40 bg-gold/5 p-2 text-[8px]"><div className="font-bold">TERRITORY</div><div className="mt-1 rounded bg-panel2 p-2">Aurora Federation ⌄</div></div></>);
  if (kind === "overseas-shape") return frame(<><div className="text-[8px] font-black tracking-widest text-cyanx">RELEASE PACKAGE</div>{["Audience · Teens","Edition · Localised dub","Content profile · Moderate edits"].map((x)=><div key={x} className="rounded-lg border border-line bg-panel2 px-2 py-2 text-[8px] text-paper/70">{x}<span className="float-right text-cyanx">⌄</span></div>)}<div className="rounded-lg border border-viol/35 bg-viol/10 p-2 text-[8px] text-viol">FORECAST UPDATES LIVE</div></>);
  return frame(<><div className="text-[8px] font-black tracking-widest text-cyanx">DISTRIBUTION QUOTE</div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg border border-line bg-panel2 p-2 text-[8px]">Projected reach<br/><b className="text-mint">1.4M viewers</b></div><div className="rounded-lg border border-line bg-panel2 p-2 text-[8px]">Localisation<br/><b className="text-gold">£48,000</b></div></div><div className="rounded-lg border border-line bg-panel2 p-2 text-[8px]">Distributor · Northstar Media · revenue share 68%</div><MiniButton hot>SIGN OVERSEAS RELEASE</MiniButton></>);
}

export function TutorialHelpButton({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="btn-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyanx/35 bg-cyanx/5 px-2.5 text-[9px] font-extrabold text-cyanx"><HelpCircle size={13}/> HOW THIS WORKS</button>;
}

export default function FirstSeenTutorial({ id, open, onDismiss }: { id: TutorialId; open: boolean; onDismiss: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open, id]);
  if (!open) return null;
  const guide = GUIDES[id];
  const item = guide.steps[step];
  const last = step === guide.steps.length - 1;
  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-abyss/88 p-2 backdrop-blur-md sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={guide.title}>
      <div className="nice-scroll anim-pop max-h-[96dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyanx/35 bg-panel shadow-[0_24px_90px_rgba(0,0,0,.7)]">
        <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-panel/95 p-4 backdrop-blur-md">
          <div className="min-w-0 flex-1"><div className="text-[9px] font-black tracking-[0.3em] text-cyanx">FIRST-TIME GUIDE · {guide.eyebrow}</div><h2 className="mt-1 font-display text-2xl font-extrabold">{guide.title}</h2></div>
          <button type="button" onClick={onDismiss} className="btn-press rounded-lg border border-line p-2 text-paper/45" aria-label="Close tutorial"><X size={16}/></button>
        </div>
        <div className="space-y-4 p-4">
          {step === 0 && <p className="text-xs leading-relaxed text-paper/65">{guide.intro}</p>}
          <ScreenPreview kind={item.preview}/>
          <div className="rounded-2xl border border-line bg-panel2/70 p-3"><div className="font-display text-sm font-extrabold text-paper">{item.title}</div><p className="mt-1 text-xs leading-relaxed text-paper/65">{item.body}</p><div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-2 text-[10px] font-bold text-gold">TIP · {item.callout}</div></div>
          <div className="flex items-center justify-center gap-1.5">{guide.steps.map((_,i)=><span key={i} className={cn("h-1.5 rounded-full transition-all",i===step?"w-7 bg-cyanx":"w-2 bg-paper/20")}/>)}</div>
          <div className="flex gap-2"><button type="button" disabled={step===0} onClick={()=>setStep((n)=>Math.max(0,n-1))} className="btn-press min-h-11 rounded-xl border border-line px-3 text-xs font-bold text-paper/60 disabled:opacity-25"><ChevronLeft size={15}/></button><button type="button" onClick={()=>last?onDismiss():setStep((n)=>n+1)} className="btn-press flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyanx/60 bg-cyanx/15 px-3 text-xs font-extrabold text-cyanx">{last?"GOT IT":"NEXT"}{!last&&<ChevronRight size={15}/>}</button></div>
          <p className="text-center text-[9px] text-paper/35">This guide appears automatically once per save. Use HOW THIS WORKS on the page to replay it at any time.</p>
        </div>
      </div>
    </div>
  );
}
