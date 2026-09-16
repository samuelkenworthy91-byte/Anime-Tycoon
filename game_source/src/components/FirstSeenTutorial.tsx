import { AlertTriangle, BookOpen, ChevronLeft, ChevronRight, Crown, Gavel, Globe2, Hammer, HelpCircle, SlidersHorizontal, Trophy, X, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import type { TutorialId } from "../engine/tutorials";
import { cn } from "../utils/cn";

type PreviewId =
  | "pitch" | "project-lead" | "rush-lead"
  | "policy-tabs" | "policy-options" | "policy-schedule"
  | "overseas-title" | "overseas-shape" | "overseas-sign"
  | "rights-appraise" | "rights-own" | "rights-adapt"
  | "debt-clock" | "debt-recover" | "debt-shutdown"
  | "dynasty-pressure" | "dynasty-invest" | "dynasty-legacy"
  | "franchise" | "knowledge" | "automation" | "capability";

type Step = { title: string; body: string; preview: PreviewId; callout: string };
type Guide = { eyebrow: string; title: string; intro: string; steps: Step[] };

const GUIDES: Record<TutorialId, Guide> = {
  "passion-projects": {
    eyebrow: "CREATOR AMBITIONS", title: "HOW PASSION PROJECTS WORK",
    intro: "A passion project is a promise to a member of staff. You can fund their idea, accept the brief, then honour it from the project itself without hunting through menus.",
    steps: [
      { title: "1 · DECIDE ON THE PITCH", body: "In Ambitions, fund development if you want more information, or accept the leadership brief immediately. Declining makes no promise.", preview: "pitch", callout: "Accepting creates a 48-week leadership promise." },
      { title: "2 · PUT THEM ON THE SHOW", body: "Once you greenlight a matching original show, the Project Board surfaces the promise. Assign and name them lead in one action if there is room.", preview: "project-lead", callout: "You do not need to return to Studio Culture." },
      { title: "3 · THE PROMISE FOLLOWS PRODUCTION", body: "The relevant Story, Animation or Sound Rush also shows the promised lead. If you missed the early appointment they can still earn it at 60% department participation.", preview: "rush-lead", callout: "Release the qualifying original show before the deadline." },
    ],
  },
  "working-policies": {
    eyebrow: "STUDIO CULTURE", title: "WORKING POLICIES & STAFF REQUESTS",
    intro: "Policies change recovery, profit sharing and creator development. Staff requests are separate decisions: urgent requests pop up, and closing a popup simply leaves it waiting in Staff / Studio Culture.",
    steps: [
      { title: "1 · OPEN WORKING POLICIES", body: "Use the Working Policies tab inside Studio Culture. The current policy stays visible so you can compare before committing.", preview: "policy-tabs", callout: "Policy changes are deliberately infrequent." },
      { title: "2 · SET THE THREE TERMS", body: "Choose paid recovery, the staff profit pool and how many days creators reserve for development while doing other work. A person asking for breathing room cannot make that same recovery request again for a full 48-week game year.", preview: "policy-options", callout: "Closing a staff-request popup means deal with it later, not reject it." },
      { title: "3 · SCHEDULE THE CHANGE", body: "Press Schedule Policy Change. New terms begin at the next four-week payroll boundary; existing productions keep the terms they started with.", preview: "policy-schedule", callout: "The exact start day is shown before the change takes effect." },
    ],
  },
  "overseas-markets": {
    eyebrow: "GLOBAL RELEASES", title: "OVERSEAS MARKETS",
    intro: "International releases are title-specific. Pick a finished show, shape it for a territory, then decide whether the commercial terms are worth signing.",
    steps: [
      { title: "1 · CHOOSE TITLE + TERRITORY", body: "Start with a released show and the market you want to enter. Each territory has different audience size, sensitivity and genre appetite.", preview: "overseas-title", callout: "A strong domestic show is not automatically a perfect overseas fit." },
      { title: "2 · SHAPE THE RELEASE", body: "Choose the audience segment, edition and content profile. Adaptation can protect reach but may cost money, time or creator goodwill.", preview: "overseas-shape", callout: "The forecast updates as you change the package." },
      { title: "3 · REVIEW, THEN SIGN", body: "Compare distributor terms, projected reach and localisation costs. Sign only when the package fits your goals; the market remembers previous releases.", preview: "overseas-sign", callout: "Overseas decisions affect money, fans and long-term regional strength." },
    ],
  },
  "rights-market": {
    eyebrow: "LICENSED IP", title: "RIGHTS MARKET & LICENSED ADAPTATIONS",
    intro: "Licensed IP is a full lifecycle: judge the property, win the rights, manage the contract, then adapt it using the same genre craft your studio has learned on original shows.",
    steps: [
      { title: "1 · APPRAISE BEFORE YOU BID", body: "Auctions hide some risk. The Data Lab reveals more about difficulty, merch, royalties and creator control. Bid only when the property still makes sense at the live price.", preview: "rights-appraise", callout: "Walking away is a valid strategic choice." },
      { title: "2 · RIGHTS HAVE TERMS", body: "Royalty, expiry, sequel, merch and international rights all matter. The Owned IP card always shows time remaining and when the manual renewal window opens; the Legal Desk improves negotiations and renewal prices.", preview: "rights-own", callout: "The manual extension window opens 24 weeks before expiry; warning starts 12 weeks out." },
      { title: "3 · CONTINUE OR REBOOT", body: "Licensed shows use canonical characters and the IP's real genre-combination slider fit. After an adaptation, choose Continue Series for a true follow-up or Reboot Property when the previous version needs a clean restart.", preview: "rights-adapt", callout: "A famous IP can make money while still damaging reputation if the adaptation is poor." },
    ],
  },
  "financial-distress": {
    eyebrow: "CASHFLOW WARNING", title: "YOUR STUDIO IS IN DEBT",
    intro: "Negative cash is survivable for a short time, but the shutdown clock keeps running until you return to £0 or above.",
    steps: [
      { title: "1 · THE CLOCK STARTS IMMEDIATELY", body: "Every completed week below £0 adds to the same insolvency streak. Returning to £0 or above clears the streak completely.", preview: "debt-clock", callout: "Watch the cash forecast, not just today's balance." },
      { title: "2 · ONE MONTH = FINAL NOTICE", body: "After four consecutive negative weeks the landlord gives one final month to recover. Contracts, selling a completed master, shelving spend and cutting commitments can buy time.", preview: "debt-recover", callout: "The reprieve is the second half of the eight-week clock, not extra debt capacity." },
      { title: "3 · TWO MONTHS = SHUTDOWN", body: "Eight consecutive weeks below £0 terminates the lease and ends the run. Any recovery to £0+ before then resets the danger.", preview: "debt-shutdown", callout: "Do not let the studio drift through several negative weeks at high speed." },
    ],
  },
  "dynasty-mode": {
    eyebrow: "POST-CAREER", title: "STUDIO DYNASTY MODE",
    intro: "The 12-year campaign is over, but continuing turns the save into an endless management run with escalating industry pressure.",
    steps: [
      { title: "1 · THE WORLD GETS HARDER", body: "Each dynasty year increases salary pressure, audience expectations, rival craft and franchise fatigue while recovery becomes less forgiving.", preview: "dynasty-pressure", callout: "Old winning formulas gradually need more investment and better execution." },
      { title: "2 · BUILD AN EMPIRE", body: "Permanent Dynasty investments help a mature studio absorb the new pressure. They are expensive by design and reward long-term cash reserves.", preview: "dynasty-invest", callout: "Treat empire projects as strategic infrastructure, not impulse purchases." },
      { title: "3 · PEOPLE BECOME LEGACY", body: "Long-serving staff eventually retire and can leave permanent mentoring legacies. Industry records continue to refresh every year.", preview: "dynasty-legacy", callout: "Dynasty mode is about sustaining a studio, not simply repeating the campaign forever." },
    ],
  },
  "franchise-library": {
    eyebrow: "SERIES MANAGEMENT", title: "FRANCHISE LIBRARY",
    intro: "The Work screen is now deliberately clean: it only quick-surfaces the most recent controlled entry in a series when that property is eligible for a true sequel. Everything more complicated lives here in the Library.",
    steps: [{ title: "SEQUEL QUICK ROUTE VS LIBRARY", body: "Use Work for a straightforward next season. Use the Library for reboots, prequels, spin-offs and other continuation choices. Sold rights disappear from the Work shortcut, and the latest entry shows how many weeks ago it aired.", preview: "franchise", callout: "If a weak adaptation blocks a true sequel, reboot it from the Library instead of abandoning the IP." }],
  },
  "studio-knowledge": {
    eyebrow: "R&D KNOWLEDGE", title: "STUDIO KNOWLEDGE",
    intro: "Anime Runner does not reveal every perfect answer up front. Your studio learns by releasing work, researching and running test audiences.",
    steps: [{ title: "KNOWLEDGE KEEPS DEEPENING", body: "Genre Studies and Narrative Analytics can be researched repeatedly at increasing cost until every standard arc relationship and combo effect is understood. Staff Appraisal reveals descriptive Potential bands for employees; later Talent Scouting extends those bands to candidates. Exact Potential numbers stay hidden.", preview: "knowledge", callout: "The research card shows progress toward complete knowledge instead of disappearing after one study." }],
  },
  "auto-manage": {
    eyebrow: "PRODUCTION DELEGATION", title: "AUTO MANAGE & QUICK PICKS",
    intro: "Larger studios can delegate repetitive work without making every management decision manually.",
    steps: [{ title: "DELEGATE, THEN INTERVENE", body: "Project Auto Manage hands production sprints to your team, but crises can still require a decision. Contract Jobs have a separate Quick Pick: it chooses the smallest currently available team projected to hit the deadline, or the strongest available three-seat team if nobody can make it. It never pulls busy staff off another assignment.", preview: "automation", callout: "Automation saves attention, not risk; Quick Pick is a deadline-aware staffing shortcut." }],
  },
  "production-capability": {
    eyebrow: "PERMANENT CRAFT", title: "PRODUCTION CAPABILITY & FINISHED MASTERS",
    intro: "Paid interventions can build permanent studio know-how, while finished masters can now be held back without continuing to consume production capacity.",
    steps: [{ title: "INVEST OR SHELVE", body: "Writing, animation, retake, sound and polish interventions feed permanent capability tracks. Separately, Release Prep can SHELVE MASTER: hype immediately falls to zero, staff and production capacity are freed, and quality is preserved. Releasing the shelved master later starts from zero hype and applies the commercial sales penalty, not a review-quality penalty.", preview: "capability", callout: "Shelving stops production burn; it is a release-timing trade-off, not a quality downgrade." }],
  },
};

function MiniButton({ children, hot = false }: { children: React.ReactNode; hot?: boolean }) {
  return <div className={cn("rounded-md border px-2 py-1 text-[8px] font-extrabold", hot ? "border-gold bg-gold/15 text-gold" : "border-line bg-panel2 text-paper/55")}>{children}</div>;
}
function Frame({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-paper/15 bg-ink shadow-[0_16px_45px_rgba(0,0,0,.45)]"><div className="flex items-center gap-1.5 border-b border-line bg-panel2/95 px-3 py-2 text-[8px] font-extrabold tracking-[0.2em] text-paper/45">{icon}{title}</div><div className="min-h-44 space-y-2 p-3">{children}</div></div>;
}
function ScreenPreview({ kind }: { kind: PreviewId }) {
  if (kind === "pitch") return <Frame title="STUDIO CULTURE · AMBITIONS"><div className="rounded-xl border border-viol/40 bg-viol/10 p-2"><b className="text-[10px]">MAYA · ORIGINAL HORROR</b><div className="mt-2 flex flex-wrap gap-1"><MiniButton>FUND DEVELOPMENT</MiniButton><MiniButton hot>ACCEPT LEADERSHIP BRIEF</MiniButton><MiniButton>DECLINE</MiniButton></div></div></Frame>;
  if (kind === "project-lead" || kind === "rush-lead") return <Frame title={kind === "project-lead" ? "PROJECT BOARD" : "PRODUCTION RUSH"} icon={<Crown size={10}/>}><div className="rounded-xl border border-viol/50 bg-viol/10 p-2"><b className="text-[9px] text-gold">PROMISED WRITING LEAD</b><div className="mt-1 text-[8px] text-paper/55">Maya · {kind === "rush-lead" ? "64" : "0"}% department participation</div><div className="mt-2"><MiniButton hot>{kind === "rush-lead" ? "NAME MAYA WRITING LEAD" : "ASSIGN + NAME MAYA WRITING LEAD"}</MiniButton></div></div></Frame>;
  if (kind.startsWith("policy-")) return <Frame title="STUDIO CULTURE" icon={<SlidersHorizontal size={10}/>}><div className="flex gap-1"><MiniButton>AMBITIONS</MiniButton><MiniButton hot>WORKING POLICIES</MiniButton><MiniButton>OVERSEAS</MiniButton></div>{kind === "policy-options" ? ["Protected recovery · 7 paid days","Staff profit pool · 5%","Creative development · 2 days / 4 weeks"].map(x=><div key={x} className="rounded border border-line bg-panel2 p-2 text-[8px]">{x}</div>) : <div className="rounded border border-line bg-panel2 p-3 text-[8px]">{kind === "policy-schedule" ? <><MiniButton hot>SCHEDULE POLICY CHANGE</MiniButton><div className="mt-2 text-mint">NEW POLICY BEGINS AT NEXT PAYROLL</div></> : "Changes take effect at the next payroll boundary."}</div>}</Frame>;
  if (kind.startsWith("overseas-")) return <Frame title="OVERSEAS MARKETS" icon={<Globe2 size={10}/>}><div className="whitespace-pre-line rounded border border-gold/40 bg-gold/5 p-2 text-[8px]">{kind === "overseas-title" ? "TITLE · Moonlit Circuit\nTERRITORY · Aurora Federation" : kind === "overseas-shape" ? "Audience · Teens\nEdition · Localised dub\nContent profile · Moderate edits" : "Projected reach · 1.4M\nLocalisation · £48,000\nDistributor share · 32%"}</div>{kind === "overseas-sign" && <MiniButton hot>SIGN OVERSEAS RELEASE</MiniButton>}</Frame>;
  if (kind.startsWith("rights-")) return <Frame title="RIGHTS MARKET" icon={<Gavel size={10}/>}><div className="whitespace-pre-line rounded-xl border border-gold/40 bg-gold/5 p-2 text-[8px]">{kind === "rights-appraise" ? "Difficulty ??? · Merch ??? · Royalty ???\nAPPRAISE · 3 RD" : kind === "rights-own" ? "Royalty 18% · 31 weeks remaining\nRENEWAL WINDOW OPENS IN 7 WEEKS\n✓ SEQUEL · □ MERCH · □ INTL" : "CONTINUE SERIES / REBOOT PROPERTY\nGENRE FIT STILL APPLIES\nHidden blueprint: undiscovered"}</div><MiniButton hot>{kind === "rights-appraise" ? "ENTER AUCTION" : kind === "rights-own" ? "EXTEND / NEGOTIATE" : "GREENLIGHT ADAPTATION"}</MiniButton></Frame>;
  if (kind.startsWith("debt-")) return <Frame title="FINANCIAL DISTRESS" icon={<AlertTriangle size={10}/>}><div className="grid grid-cols-3 gap-1 text-center text-[8px]"><div className="rounded border border-neon/40 p-2">W1<br/>DEBT</div><div className="rounded border border-gold/40 p-2">W4<br/>FINAL NOTICE</div><div className="rounded border border-neon/60 p-2">W8<br/>SHUTDOWN</div></div><div className="rounded border border-line bg-panel2 p-2 text-[8px]">{kind === "debt-clock" ? "£0+ resets the streak" : kind === "debt-recover" ? "Recover through income, sales or lower spend" : "Eight consecutive negative weeks ends the run"}</div></Frame>;
  if (kind.startsWith("dynasty-")) return <Frame title="STUDIO DYNASTY" icon={<Trophy size={10}/>}><div className="rounded border border-gold/40 bg-gold/5 p-2 text-[8px]">{kind === "dynasty-pressure" ? "Salaries ↑ · Audience bar ↑ · Rivals ↑ · Fatigue ↑" : kind === "dynasty-invest" ? "EMPIRE INVESTMENTS · Permanent infrastructure" : "LEGACY OF LEGENDS · Veterans mentor the next generation"}</div></Frame>;
  if (kind === "franchise") return <Frame title="FRANCHISE LIBRARY"><div className="text-[8px]">WORK QUICK PICK · TRUE SEQUEL READY</div><div className="text-[8px]">LIBRARY · REBOOT / PREQUEL / SPIN-OFF</div><div className="rounded border border-neon/30 p-2 text-[8px]">Latest entry · aired 18 weeks ago</div></Frame>;
  if (kind === "knowledge") return <Frame title="STUDIO KNOWLEDGE" icon={<BookOpen size={10}/>}><div className="rounded border border-line bg-panel2 p-2 text-[8px]">GENRE STUDIES · 214 / 630 RELATIONSHIPS<br/>NARRATIVE ANALYTICS · 18 / 42 STRUCTURES<br/>STAFF APPRAISAL · POTENTIAL BANDS</div><div className="text-[8px] text-paper/45">Repeat studies until standard knowledge is complete.</div></Frame>;
  if (kind === "automation") return <Frame title="PROJECTS & JOBS" icon={<Zap size={10}/>}><MiniButton hot>AUTO MANAGE PROJECT</MiniButton><MiniButton hot>JOB · QUICK PICK</MiniButton><div className="rounded border border-neon/40 p-2 text-[8px]">Quick Pick uses available staff and checks the deadline.</div></Frame>;
  return <Frame title="CAPABILITY & SHELVED MASTERS" icon={<Hammer size={10}/>}><div className="rounded border border-cyanx/30 p-2 text-[8px]">FINAL POLISH · LV2<br/>SHELVED MASTER · HYPE 0<br/>QUALITY PRESERVED · CAPACITY FREE</div></Frame>;
}

export function TutorialHelpButton({ onClick, label = "HOW THIS WORKS" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="btn-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyanx/35 bg-cyanx/5 px-2.5 text-[9px] font-extrabold text-cyanx"><HelpCircle size={13}/>{label}</button>;
}

export default function FirstSeenTutorial({ id, open, onDismiss, priority = "standard" }: { id: TutorialId; open: boolean; onDismiss: () => void; priority?: "standard" | "auction" }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open, id]);
  if (!open) return null;
  const guide = GUIDES[id]; const item = guide.steps[step]; const last = step === guide.steps.length - 1;
  return <div className={cn("fixed inset-0 flex items-end justify-center bg-abyss/88 p-2 backdrop-blur-md sm:items-center sm:p-4", priority === "auction" ? "z-[140]" : "z-[90]")} role="dialog" aria-modal="true" aria-label={guide.title}><div className="nice-scroll anim-pop max-h-[96dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyanx/35 bg-panel shadow-[0_24px_90px_rgba(0,0,0,.7)]"><div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-panel/95 p-4 backdrop-blur-md"><div className="min-w-0 flex-1"><div className="text-[9px] font-black tracking-[0.3em] text-cyanx">FIRST-TIME GUIDE · {guide.eyebrow}</div><h2 className="mt-1 font-display text-2xl font-extrabold">{guide.title}</h2></div><button type="button" onClick={onDismiss} className="btn-press rounded-lg border border-line p-2 text-paper/45" aria-label="Close tutorial"><X size={16}/></button></div><div className="space-y-4 p-4">{step === 0 && <p className="text-xs leading-relaxed text-paper/65">{guide.intro}</p>}<ScreenPreview kind={item.preview}/><div className="rounded-2xl border border-line bg-panel2/70 p-3"><div className="font-display text-sm font-extrabold">{item.title}</div><p className="mt-1 text-xs leading-relaxed text-paper/65">{item.body}</p><div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-2 text-[10px] font-bold text-gold">TIP · {item.callout}</div></div>{guide.steps.length > 1 && <div className="flex items-center justify-center gap-1.5">{guide.steps.map((_,i)=><span key={i} className={cn("h-1.5 rounded-full transition-all",i===step?"w-7 bg-cyanx":"w-2 bg-paper/20")}/>)}</div>}<div className="flex gap-2"><button type="button" disabled={step===0} onClick={()=>setStep(n=>Math.max(0,n-1))} className="btn-press min-h-11 rounded-xl border border-line px-3 text-xs font-bold text-paper/60 disabled:opacity-25"><ChevronLeft size={15}/></button><button type="button" onClick={()=>last?onDismiss():setStep(n=>n+1)} className="btn-press flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyanx/60 bg-cyanx/15 px-3 text-xs font-extrabold text-cyanx">{last?"GOT IT":"NEXT"}{!last&&<ChevronRight size={15}/>}</button></div><p className="text-center text-[9px] text-paper/35">This guide appears automatically once per save. Use HOW THIS WORKS on the relevant page to replay it at any time.</p></div></div></div>;
}
