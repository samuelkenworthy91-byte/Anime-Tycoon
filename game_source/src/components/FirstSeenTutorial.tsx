import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Crown,
  Gavel,
  Globe2,
  Hammer,
  HelpCircle,
  Megaphone,
  Package,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { TutorialId } from "../engine/tutorials";
import { cn } from "../utils/cn";

type PreviewId =
  | "pitch" | "project-lead" | "rush-lead"
  | "overseas-title" | "overseas-shape" | "overseas-sign"
  | "rights-appraise" | "rights-own" | "rights-adapt"
  | "debt-clock" | "debt-recover" | "debt-shutdown"
  | "dynasty-pressure" | "dynasty-invest" | "dynasty-legacy"
  | "franchise" | "knowledge" | "automation" | "capability"
  | "slate" | "review" | "disciplines" | "publicity" | "merch"
  | "movement" | "relationships" | "rival-memory" | "reputation" | "era";

type Step = { title: string; body: string; preview: PreviewId; callout: string };
type Guide = { eyebrow: string; title: string; intro: string; steps: Step[] };

const GUIDES: Record<TutorialId, Guide> = {
  "passion-projects": {
    eyebrow: "CREATOR AMBITIONS", title: "PASSION PROJECTS",
    intro: "A staff member has an idea they care about. You decide whether to promise them a real chance to lead it.",
    steps: [
      { title: "1 · CHOOSE WHETHER TO PROMISE IT", body: "Accepting the brief makes a real promise. Funding development just gives you more information first.", preview: "pitch", callout: "Do not accept unless you are happy to make the show within the deadline." },
      { title: "2 · PUT THEM ON THE SHOW", body: "When you make the right original show, the Project Board reminds you who was promised the lead role.", preview: "project-lead", callout: "Use the highlighted button to assign them and make them lead in one go." },
      { title: "3 · THE PROMISE FOLLOWS THE PROJECT", body: "If you missed the early appointment, the matching Production Rush can still show the promised creator.", preview: "rush-lead", callout: "Release the qualifying show before the promise expires." },
    ],
  },
  "overseas-markets": {
    eyebrow: "GLOBAL RELEASES", title: "OVERSEAS MARKETS",
    intro: "You can release a finished anime in other regions. Different places want different things.",
    steps: [
      { title: "1 · PICK A SHOW AND A PLACE", body: "Choose which finished anime you want to sell overseas, then choose the territory.", preview: "overseas-title", callout: "A domestic hit is not automatically a perfect fit everywhere." },
      { title: "2 · SHAPE THE RELEASE", body: "Choose who you are aiming at and how much localisation or editing you want to do.", preview: "overseas-shape", callout: "The forecast changes when you change the package." },
      { title: "3 · CHECK THE DEAL", body: "Look at expected reach, costs and the distributor cut before signing.", preview: "overseas-sign", callout: "You can walk away from a bad overseas deal." },
    ],
  },
  "rights-market": {
    eyebrow: "LICENSED IP", title: "BUYING & USING LICENSED IP",
    intro: "Licensed IP gives you a famous property, but it also gives you rules, royalties and expectations.",
    steps: [
      { title: "1 · APPRAISE BEFORE BIDDING", body: "Research can reveal hidden difficulty, royalties and merchandising potential before you spend big.", preview: "rights-appraise", callout: "A famous name can still be a bad deal." },
      { title: "2 · CHECK WHAT YOU ACTUALLY BOUGHT", body: "Rights can include or exclude sequels, merchandise and international releases. The contract card tells you.", preview: "rights-own", callout: "Watch the expiry date too." },
      { title: "3 · CONTINUE OR REBOOT", body: "After an adaptation, continue a good version or reboot a bad one instead of getting stuck.", preview: "rights-adapt", callout: "Licensed shows still need good production choices." },
    ],
  },
  "financial-distress": {
    eyebrow: "CASHFLOW WARNING", title: "YOUR STUDIO IS IN DEBT",
    intro: "Going below £0 does not kill the studio immediately, but the clock starts ticking.",
    steps: [
      { title: "1 · WEEK 1: DANGER STARTS", body: "Every full week below £0 adds to the same debt streak.", preview: "debt-clock", callout: "Getting back to £0 or above resets the streak." },
      { title: "2 · WEEK 4: FINAL NOTICE", body: "After one month below £0 you get a final month to recover.", preview: "debt-recover", callout: "Contracts, sales and cutting spend can save the studio." },
      { title: "3 · WEEK 8: SHUTDOWN", body: "Eight straight negative weeks ends the run.", preview: "debt-shutdown", callout: "Do not leave the game on high speed while deeply in debt." },
    ],
  },
  "dynasty-mode": {
    eyebrow: "POST-CAREER", title: "POST-CAREER SANDBOX",
    intro: "Your 25-year career score is finished. Continuing is optional and becomes an endless sandbox.",
    steps: [
      { title: "1 · THE WORLD KEEPS GETTING HARDER", body: "Salaries, rival quality and audience expectations keep rising after the formal ending.", preview: "dynasty-pressure", callout: "Your career score is already locked in." },
      { title: "2 · BIG LATE-GAME INVESTMENTS", body: "Very expensive permanent upgrades give a mature studio somewhere useful to spend its money.", preview: "dynasty-invest", callout: "These are optional sandbox goals, not required career objectives." },
      { title: "3 · STAFF BECOME LEGENDS", body: "Veterans can retire and leave mentoring legacies while industry records continue.", preview: "dynasty-legacy", callout: "Sandbox is about sustaining the studio, not extending the official career." },
    ],
  },
  "franchise-library": {
    eyebrow: "SERIES MANAGEMENT", title: "FRANCHISE LIBRARY",
    intro: "The Work screen only shows the easiest next sequel. The Library is where you do the complicated franchise stuff.",
    steps: [
      { title: "1 · SEQUELS HERE, REBOOTS THERE", body: "Use Work for the obvious next season. Use the Library for reboots, prequels, spin-offs and older entries.", preview: "franchise", callout: "If a bad sequel blocks the series, try a reboot from the Library." },
      { title: "2 · MERCH LIVES WITH THE FRANCHISE", body: "When merchandising unlocks, open the franchise to make a product bet based on the fans it actually has.", preview: "merch", callout: "You only run one major merch bet per franchise at a time." },
    ],
  },
  "studio-knowledge": {
    eyebrow: "R&D", title: "RESEARCH & STUDIO KNOWLEDGE",
    intro: "Research does two jobs: make the studio permanently better, and teach you what works.",
    steps: [
      { title: "1 · EVERY LEVEL GIVES YOU SOMETHING", body: "Writing, Animation, Sound, Production and Business each have eight levels. There are no empty levels: every one has a named gain and a permanent mechanical improvement.", preview: "disciplines", callout: "The glowing NEXT reward is what your next level gives you." },
      { title: "2 · CHOOSE A HOUSE SPECIALTY", body: "Studio Knowledge is also where you choose the genre your studio wants to become famous for. Combinations count as long as your specialty is one of the genres.", preview: "reputation", callout: "This is a real commitment: the bonus can grow to +25%, while outside-house work can fall to −10%." },
      { title: "3 · KNOWLEDGE REVEALS ANSWERS", body: "Genre Studies and Narrative Analytics uncover combinations, arcs and production preferences. Staff research reveals Potential as useful words rather than exact hidden numbers.", preview: "knowledge", callout: "More knowledge means clearer advice next time you create a show." },
    ],
  },
  "auto-manage": {
    eyebrow: "PROJECTS", title: "PLANNING & DELEGATION",
    intro: "As the studio gets bigger, your job changes from clicking every task to deciding what deserves your attention.",
    steps: [
      { title: "1 · THE SLATE IS YOUR PRODUCTION CALENDAR", body: "Open the calendar to see active and planned shows blocked out by Development, Animation, Sound, Post, Marketing and Release. You choose a release window; the game draws the stages for you.", preview: "slate", callout: "Solid blocks are active. Dashed blocks are planned estimates." },
      { title: "2 · LATER CAREER ERAS EXPECT MORE DELEGATION", body: "Founding is hands-on. Major Studio and later eras are about managing a portfolio, not babysitting every routine sprint.", preview: "era", callout: "The game is not taking choices away; it is letting you skip routine clicks." },
      { title: "3 · AUTO MANAGE HANDLES ROUTINE WORK", body: "Auto Manage lets your team run normal production. Quick Pick chooses sensible available workers for contract jobs.", preview: "automation", callout: "You still make the important decisions when something goes wrong." },
    ],
  },
  "production-capability": {
    eyebrow: "PERMANENT CRAFT", title: "CAPABILITY & SHELVED MASTERS",
    intro: "Some production spending improves the studio permanently, and a finished show can be held back without taking up production space.",
    steps: [{ title: "INVEST OR SHELVE", body: "Interventions can build permanent capability. Shelving a finished show frees staff and capacity but wipes its launch hype.", preview: "capability", callout: "Shelving hurts sales momentum, not review quality." }],
  },
  "slate-planning": {
    eyebrow: "PLANNING", title: "THE STUDIO SLATE",
    intro: "This is your simple production calendar. You choose when you want a show out; the studio estimates the work backwards.",
    steps: [
      { title: "1 · COLOURS SHOW THE PRODUCTION", body: "Development, Pre-production, Animation, Sound, Post, Marketing and Release each have their own colour. You do not manually draw the blocks.", preview: "slate", callout: "Pick a release window and the calendar does the scheduling maths." },
      { title: "2 · LOOK FOR THE WARNING CARDS", body: "The calendar points out animation crunch, cash risk, audience clashes, rival releases, expiring rights and useful market windows before you commit.", preview: "slate", callout: "Warnings explain a risk; they never forbid your plan." },
      { title: "3 · PLANNING PAYS", body: "A show moves from IMPROVISED to PREPARED, READY, LOCKED and LONG LEAD the longer it stays on the Slate. Better preparation cuts weekly burn, adds starting hype and can give deadline safety.", preview: "slate", callout: "You can still make an unplanned show whenever you want." },
    ],
  },
  "review-diagnosis": {
    eyebrow: "REVIEWS", title: "WHY DID MY SHOW SCORE THAT?",
    intro: "Reviews now tell you what actually helped or hurt instead of only giving you four numbers.",
    steps: [
      { title: "1 · READ THE HIGHLIGHT UNDER EACH CRITIC", body: "Each critic points at a real cause: story balance, direction, editing, casting or something else.", preview: "review", callout: "Red means a real problem. Green means something you got right." },
      { title: "2 · USE 'WHAT WE LEARNED'", body: "The bottom summary turns the release into advice for your next anime.", preview: "review", callout: "As studio knowledge improves, the advice becomes more specific." },
    ],
  },
  "research-disciplines": {
    eyebrow: "R&D", title: "THE FIVE RESEARCH AREAS",
    intro: "Five clear disciplines replace a pile of tiny upgrades — and every paid level now matters.",
    steps: [
      { title: "1 · THERE ARE NO EMPTY LEVELS", body: "Every level from 1 to 8 has a named reward. Writing, Animation and Sound also gain +2% craft strength per level; Production and Business get their own permanent gains.", preview: "disciplines", callout: "If you buy a level, you always get an immediate improvement." },
      { title: "2 · FOLLOW THE NEXT REWARD", body: "Each research card shows your current level and the next named gain, so you always know what you are working toward.", preview: "disciplines", callout: "Choose the area that solves the problem your studio actually has." },
    ],
  },
  "publicity-audience": {
    eyebrow: "FANS & MARKETING", title: "WHO LIKES THIS ANIME?",
    intro: "Audience types are NOT five new currencies. They simply describe what kind of fans this anime attracts.",
    steps: [
      { title: "1 · CHECK THE FAN MIX", body: "Core Fans, Casual Viewers, Online Fandom, Prestige Audience and Collectors show who is most interested.", preview: "publicity", callout: "You do not spend these numbers." },
      { title: "2 · MATCH PUBLICITY TO THE FANS", body: "Campaigns show whether they fit the audience you actually built.", preview: "publicity", callout: "A Character Spotlight is much better when Online Fandom is strong." },
    ],
  },
  "merch-bets": {
    eyebrow: "MERCH", title: "ONE BIG MERCH BET",
    intro: "Instead of clicking every product, each franchise makes one important merchandise push at a time.",
    steps: [
      { title: "PICK THE PRODUCT THAT FITS YOUR FANS", body: "The card shows cost, expected return and audience fit. Collector-heavy fandoms are better for figures and cards.", preview: "merch", callout: "A bigger projected return usually means the product matches the fandom better." },
      { title: "LET THE BET RUN", body: "While one big merch push is active, that franchise cannot start another one.", preview: "merch", callout: "Other franchises can still run their own merch bets." },
    ],
  },
  "industry-movements": {
    eyebrow: "INDUSTRY", title: "LONG-TERM TRENDS",
    intro: "Sometimes the whole anime market moves in one direction for several seasons.",
    steps: [
      { title: "1 · WATCH FOR REVIVALS AND FATIGUE", body: "A Mecha Revival can lift mecha sales. Mecha Fatigue can hurt them. Streaming and prestige waves can also appear.", preview: "movement", callout: "These change SALES, not whether critics think the anime is good." },
      { title: "2 · RIVALS NOTICE TOO", body: "Rival studios may chase a booming genre, so popular trends can also become crowded.", preview: "movement", callout: "Booming does not mean guaranteed success." },
    ],
  },
  "staff-relationships": {
    eyebrow: "PEOPLE", title: "STAFF RELATIONSHIPS",
    intro: "Staff remember who they have worked with instead of relationships being a hidden one-off bonus.",
    steps: [
      { title: "GOLDEN PAIRS", body: "A strong partnership that keeps making good shows can become a Golden Pair and work especially well together.", preview: "relationships", callout: "Keep successful pairs together when it makes sense." },
      { title: "MENTORSHIP", body: "A senior creator can formally mentor a less experienced creator and speed up their growth.", preview: "relationships", callout: "Mentoring is about developing the junior, not creating another loyalty bar." },
    ],
  },
  "rival-memories": {
    eyebrow: "RIVALS", title: "RIVALS REMEMBER YOU",
    intro: "Rivalry is no longer only a number. Studios remember specific things you did to them.",
    steps: [{ title: "LOOK AT 'WHAT THEY REMEMBER'", body: "Poaching their talent or releasing directly against them creates a history entry on their studio card.", preview: "rival-memory", callout: "This explains why a rival relationship becomes hotter over time." }],
  },
  "studio-reputation": {
    eyebrow: "IDENTITY", title: "HOUSE SPECIALTY VS REPUTATION",
    intro: "These are different. You CHOOSE your House Specialty. You EARN your Industry Reputation from what you actually do.",
    steps: [
      { title: "1 · HOUSE SPECIALTY = YOUR BIG CREATIVE BET", body: "Pick one genre. Pure shows and any two-genre combination containing it count as house work.", preview: "reputation", callout: "Genre Studio: +8% / −3%. Authority: +15% / −6%. Institution: +25% / −10%." },
      { title: "2 · REPUTATION = WHAT PEOPLE THINK YOU ARE", body: "Hit Factory, Auteur Studio, Franchise Machine and other reputation labels appear from your real career choices. You do not pick them from a menu.", preview: "reputation", callout: "Specialty is your plan. Reputation is your history." },
    ],
  },
  "career-era-delegation": {
    eyebrow: "GROWTH", title: "YOUR JOB CHANGES AS THE STUDIO GROWS",
    intro: "Year 1 should feel hands-on. A major studio should not make you babysit every normal task forever.",
    steps: [
      { title: "CAREER ERAS CHANGE THE FOCUS", body: "Founding is about survival. Later eras focus more on slates, franchises, international growth and legacy.", preview: "era", callout: "The game still uses the same systems; your level of attention changes." },
      { title: "EXECUTIVE DELEGATION", body: "From the Major Studio era you can turn this on. Once a real team is assigned, routine projects default to Auto Manage.", preview: "era", callout: "You still choose the project, team, rescues and release." },
    ],
  },
};

function MiniButton({ children, hot = false }: { children: React.ReactNode; hot?: boolean }) {
  return <div className={cn("rounded-md border px-2 py-1 text-[8px] font-extrabold", hot ? "border-gold bg-gold/15 text-gold ring-2 ring-gold/55 shadow-[0_0_18px_rgba(255,209,102,.22)]" : "border-line bg-panel2 text-paper/45")}>{children}</div>;
}

function Spotlight({ children, label = "LOOK HERE", tone = "gold" }: { children: React.ReactNode; label?: string; tone?: "gold" | "cyan" | "mint" }) {
  const cls = tone === "cyan" ? "border-cyanx/70 ring-cyanx/50 text-cyanx" : tone === "mint" ? "border-mint/70 ring-mint/50 text-mint" : "border-gold/70 ring-gold/50 text-gold";
  return <div className={cn("relative rounded-xl border bg-panel2/90 p-2 ring-2 shadow-[0_0_24px_rgba(255,255,255,.06)]", cls)}><div className="absolute -right-1 -top-2 rounded-full bg-ink px-1.5 py-0.5 text-[7px] font-black tracking-wider">← {label}</div>{children}</div>;
}

function Frame({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-2xl border border-paper/15 bg-ink shadow-[0_16px_45px_rgba(0,0,0,.45)]"><div className="flex items-center gap-1.5 border-b border-line bg-panel2/95 px-3 py-2 text-[8px] font-extrabold tracking-[0.2em] text-paper/45">{icon}{title}</div><div className="min-h-44 space-y-2 p-3">{children}</div></div>;
}

function ScreenPreview({ kind }: { kind: PreviewId }) {
  if (kind === "pitch") return <Frame title="STUDIO CULTURE · AMBITIONS"><Spotlight><b className="text-[10px]">MAYA · ORIGINAL HORROR</b><div className="mt-2 flex flex-wrap gap-1"><MiniButton>FUND DEVELOPMENT</MiniButton><MiniButton hot>ACCEPT LEADERSHIP BRIEF</MiniButton><MiniButton>DECLINE</MiniButton></div></Spotlight></Frame>;
  if (kind === "project-lead" || kind === "rush-lead") return <Frame title={kind === "project-lead" ? "PROJECT BOARD" : "PRODUCTION RUSH"} icon={<Crown size={10}/>}><Spotlight><b className="text-[9px] text-gold">PROMISED WRITING LEAD</b><div className="mt-1 text-[8px] text-paper/55">Maya · {kind === "rush-lead" ? "64" : "0"}% participation</div><div className="mt-2"><MiniButton hot>{kind === "rush-lead" ? "NAME MAYA WRITING LEAD" : "ASSIGN + NAME MAYA WRITING LEAD"}</MiniButton></div></Spotlight></Frame>;
  if (kind.startsWith("overseas-")) return <Frame title="OVERSEAS MARKETS" icon={<Globe2 size={10}/>}><Spotlight tone="cyan"><div className="whitespace-pre-line text-[8px]">{kind === "overseas-title" ? "TITLE · Moonlit Circuit\nTERRITORY · Aurora Federation" : kind === "overseas-shape" ? "Audience · Teens\nEdition · Localised dub\nContent profile · Moderate edits" : "Projected reach · 1.4M\nLocalisation · £48,000\nDistributor share · 32%"}</div></Spotlight>{kind === "overseas-sign" && <MiniButton hot>SIGN OVERSEAS RELEASE</MiniButton>}</Frame>;
  if (kind.startsWith("rights-")) return <Frame title="RIGHTS MARKET" icon={<Gavel size={10}/>}><Spotlight><div className="whitespace-pre-line text-[8px]">{kind === "rights-appraise" ? "Difficulty ??? · Merch ??? · Royalty ???\nAPPRAISE · 3 RD" : kind === "rights-own" ? "Royalty 18% · 31 weeks remaining\n✓ SEQUEL · □ MERCH · □ INTL" : "CONTINUE SERIES / REBOOT PROPERTY\nGENRE FIT STILL APPLIES"}</div></Spotlight><MiniButton hot>{kind === "rights-appraise" ? "ENTER AUCTION" : kind === "rights-own" ? "EXTEND / NEGOTIATE" : "GREENLIGHT ADAPTATION"}</MiniButton></Frame>;
  if (kind.startsWith("debt-")) return <Frame title="FINANCIAL DISTRESS" icon={<AlertTriangle size={10}/>}><Spotlight><div className="grid grid-cols-3 gap-1 text-center text-[8px]"><div>W1<br/>DEBT</div><div>W4<br/>FINAL NOTICE</div><div>W8<br/>SHUTDOWN</div></div></Spotlight></Frame>;
  if (kind.startsWith("dynasty-")) return <Frame title="POST-CAREER SANDBOX" icon={<Trophy size={10}/>}><Spotlight><div className="text-[8px]">{kind === "dynasty-pressure" ? "Salaries ↑ · Audience bar ↑ · Rivals ↑ · Fatigue ↑" : kind === "dynasty-invest" ? "POST-CAREER INVESTMENTS · Permanent infrastructure" : "LEGACY OF LEGENDS · Veterans mentor the next generation"}</div></Spotlight></Frame>;
  if (kind === "franchise") return <Frame title="FRANCHISE LIBRARY"><div className="text-[8px] text-paper/35">WORK QUICK PICK · TRUE SEQUEL READY</div><Spotlight><div className="text-[8px]">LIBRARY · REBOOT / PREQUEL / SPIN-OFF</div></Spotlight></Frame>;
  if (kind === "knowledge") return <Frame title="STUDIO KNOWLEDGE" icon={<BookOpen size={10}/>}><Spotlight tone="cyan"><div className="text-[8px]">GENRE STUDIES · 214 / 630<br/>NARRATIVE ANALYTICS · 18 / 42<br/>STAFF APPRAISAL · POTENTIAL BANDS</div></Spotlight></Frame>;
  if (kind === "automation") return <Frame title="PROJECTS & JOBS" icon={<Zap size={10}/>}><Spotlight><MiniButton hot>AUTO MANAGE PROJECT</MiniButton><div className="mt-1"><MiniButton hot>JOB · QUICK PICK</MiniButton></div></Spotlight></Frame>;
  if (kind === "capability") return <Frame title="CAPABILITY & SHELVED MASTERS" icon={<Hammer size={10}/>}><Spotlight tone="cyan"><div className="text-[8px]">FINAL POLISH · LV2<br/>SHELVED MASTER · HYPE 0<br/>QUALITY PRESERVED · CAPACITY FREE</div></Spotlight></Frame>;
  if (kind === "slate") return <Frame title="STUDIO SLATE · YEAR 6 Q2" icon={<CalendarRange size={10}/>}><div className="grid grid-cols-3 gap-1 text-[7px] text-paper/35"><div>APR</div><div>MAY</div><div>JUN</div></div><Spotlight tone="cyan"><div className="flex items-center justify-between text-[8px]"><b>Moon Witch S3</b><span className="text-gold">TENTPOLE</span></div><div className="mt-1 text-[7px] text-paper/45">Target · May</div></Spotlight><Spotlight label="WARNING"><div className="text-[8px]">⚠ Planned slate pressure 7 exceeds safe load 5</div></Spotlight><MiniButton hot>+ PLAN PROJECT</MiniButton></Frame>;
  if (kind === "review") return <Frame title="PREMIERE REVIEWS" icon={<Sparkles size={10}/>}><div className="rounded-lg border border-line bg-panel2/50 p-2 text-[8px] text-paper/40">CRITIC · 7/10<br/>“Strong ideas, uneven finish.”</div><Spotlight label="THIS IS WHY"><b className="text-[8px] text-neon2">! Editing notes materially hurt the finish</b><div className="mt-1 text-[7px] text-paper/45">7 unresolved notes reached release.</div></Spotlight><Spotlight label="USE NEXT TIME" tone="cyan"><b className="text-[8px] text-cyanx">WHAT WE LEARNED</b><div className="mt-1 text-[7px]">✓ Animation emphasis was well judged<br/>→ Story could use more support</div></Spotlight></Frame>;
  if (kind === "disciplines") return <Frame title="R&D · STUDIO DISCIPLINES" icon={<BookOpen size={10}/>}><Spotlight tone="cyan"><div className="flex items-center justify-between text-[8px]"><b>PRODUCTION & QA</b><b className="text-cyanx">LV 3/8</b></div><div className="mt-2 text-[7px] text-paper/45">NEXT MILESTONE · LV4</div><div className="text-[8px] font-bold">Auto-Cleanup</div></Spotlight><div className="grid grid-cols-2 gap-1 text-[7px] text-paper/35"><div>Writing & Development</div><div>Animation & Art</div><div>Sound & Performance</div><div>Business & Audience</div></div></Frame>;
  if (kind === "publicity") return <Frame title="PUBLICITY · LAUNCH" icon={<Megaphone size={10}/>}><Spotlight tone="cyan"><div className="grid grid-cols-5 gap-1 text-center text-[7px]"><div>Core<br/><b>18%</b></div><div>Casual<br/><b>16%</b></div><div className="text-cyanx">Online<br/><b>34%</b></div><div>Prestige<br/><b>12%</b></div><div>Collectors<br/><b>20%</b></div></div><div className="mt-1 text-[7px] text-paper/40">These are fan types, not currencies.</div></Spotlight><Spotlight label="GOOD MATCH"><div className="flex items-center justify-between text-[8px]"><b>Character Spotlight</b><span className="text-mint">AUDIENCE EXCELLENT ×1.20</span></div></Spotlight></Frame>;
  if (kind === "merch") return <Frame title="FRANCHISE MERCH" icon={<Package size={10}/>}><Spotlight><div className="flex justify-between text-[8px]"><b>SCALE FIGURES</b><span className="text-mint">≈£1.4m</span></div><div className="mt-1 text-[7px] text-paper/45">Cost £380k · 18 weeks · audience ×1.24</div><MiniButton hot>START MERCH BET</MiniButton></Spotlight><div className="rounded-lg border border-line p-2 text-[7px] text-paper/35">One active bet per franchise at a time.</div></Frame>;
  if (kind === "movement") return <Frame title="INDUSTRY" icon={<Sparkles size={10}/>}><Spotlight tone="cyan"><div className="text-[7px] font-black text-cyanx">CULTURAL MOVEMENT · BOOM</div><div className="mt-1 text-[11px] font-black">THE MECHA REVIVAL</div><div className="mt-1 text-[7px] text-paper/45">68 weeks remain · affects commercial demand, not critic quality</div></Spotlight><div className="text-[7px] text-paper/35">Rivals may chase the same trend.</div></Frame>;
  if (kind === "relationships") return <Frame title="CREW · RELATIONSHIPS" icon={<Users size={10}/>}><Spotlight><div className="text-[8px] font-black text-gold">GOLDEN PAIR · MAYA + REN</div><div className="text-[7px] text-paper/45">6 shared releases · 4 hits · best 35/40</div></Spotlight><Spotlight label="OPTION"><div className="text-[8px]">SENIOR CREATOR → JUNIOR CREATOR</div><MiniButton hot>FORMAL MENTORSHIP</MiniButton></Spotlight></Frame>;
  if (kind === "rival-memory") return <Frame title="RIVAL STUDIO" icon={<Swords size={10}/>}><div className="text-[9px] font-black">SUNNYRISE</div><Spotlight label="THEY REMEMBER"><div className="text-[8px]">Y7 · You poached Akira Tanaka.</div><div className="mt-1 text-[8px]">Y8 · “Steel Dawn” beat “Red Orbit” head-to-head 34–31.</div></Spotlight></Frame>;
  if (kind === "reputation") return <Frame title="HOUSE SPECIALISATION & REPUTATION" icon={<Crown size={10}/>}><Spotlight label="YOU CHOOSE THIS"><div className="text-[7px] text-paper/40">HOUSE SPECIALISATION</div><div className="text-[9px] font-black">MECHA · AUTHORITY</div><div className="text-[7px] text-paper/45">Bonus in signature work. No outside-genre penalty.</div></Spotlight><Spotlight label="YOU EARN THIS" tone="cyan"><div className="text-[7px] text-paper/40">INDUSTRY REPUTATION</div><div className="text-[9px] font-black text-cyanx">FRANCHISE MACHINE</div><div className="text-[7px] text-paper/45">Earned from what your studio actually does.</div></Spotlight></Frame>;
  return <Frame title="PROJECTS · MAJOR STUDIO ERA" icon={<Crown size={10}/>}><div className="text-[7px] text-cyanx">YEAR 9 · MAJOR STUDIO ERA</div><div className="text-[8px] text-paper/45">Focus: slate planning, delegation and prestige projects</div><Spotlight><MiniButton hot>EXECUTIVE DELEGATION · ON</MiniButton><div className="mt-1 text-[7px] text-paper/45">Routine projects default to Auto Manage after a real team is assigned.</div></Spotlight></Frame>;
}

export function TutorialHelpButton({ onClick, label = "HOW THIS WORKS" }: { onClick: () => void; label?: string }) {
  return <button type="button" onClick={onClick} className="btn-press inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-cyanx/35 bg-cyanx/5 px-2.5 text-[9px] font-extrabold text-cyanx"><HelpCircle size={13}/>{label}</button>;
}

export default function FirstSeenTutorial({ id, open, onDismiss, priority = "standard" }: { id: TutorialId; open: boolean; onDismiss: () => void; priority?: "standard" | "auction" }) {
  const [step, setStep] = useState(0);
  useEffect(() => { if (open) setStep(0); }, [open, id]);
  if (!open) return null;
  const guide = GUIDES[id];
  const item = guide.steps[step];
  const last = step === guide.steps.length - 1;
  return <div data-first-seen-tutorial="true" className={cn("fixed inset-0 flex items-end justify-center bg-abyss/88 p-2 backdrop-blur-md sm:items-center sm:p-4", priority === "auction" ? "z-[140]" : "z-[90]")} role="dialog" aria-modal="true" aria-label={guide.title}>
    <div className="nice-scroll anim-pop max-h-[96dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-cyanx/35 bg-panel shadow-[0_24px_90px_rgba(0,0,0,.7)]">
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-line bg-panel/95 p-4 backdrop-blur-md">
        <div className="min-w-0 flex-1"><div className="text-[9px] font-black tracking-[0.3em] text-cyanx">FIRST-TIME GUIDE · {guide.eyebrow}</div><h2 className="mt-1 font-display text-2xl font-extrabold">{guide.title}</h2></div>
        <button type="button" onClick={onDismiss} className="btn-press rounded-lg border border-line p-2 text-paper/45" aria-label="Close tutorial"><X size={16}/></button>
      </div>
      <div className="space-y-4 p-4">
        {step === 0 && <p className="text-xs leading-relaxed text-paper/65">{guide.intro}</p>}
        <ScreenPreview kind={item.preview}/>
        <div className="rounded-2xl border border-line bg-panel2/70 p-3"><div className="font-display text-sm font-extrabold">{item.title}</div><p className="mt-1 text-xs leading-relaxed text-paper/65">{item.body}</p><div className="mt-2 rounded-lg border border-gold/30 bg-gold/5 px-2.5 py-2 text-[10px] font-bold text-gold">TIP · {item.callout}</div></div>
        {guide.steps.length > 1 && <div className="flex items-center justify-center gap-1.5">{guide.steps.map((_,i)=><span key={i} className={cn("h-1.5 rounded-full transition-all",i===step?"w-7 bg-cyanx":"w-2 bg-paper/20")}/>)}</div>}
        <div className="flex gap-2"><button type="button" disabled={step===0} onClick={()=>setStep(n=>Math.max(0,n-1))} className="btn-press min-h-11 rounded-xl border border-line px-3 text-xs font-bold text-paper/60 disabled:opacity-25"><ChevronLeft size={15}/></button><button type="button" onClick={()=>last?onDismiss():setStep(n=>n+1)} className="btn-press flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-cyanx/60 bg-cyanx/15 px-3 text-xs font-extrabold text-cyanx">{last?"GOT IT":"NEXT"}{!last&&<ChevronRight size={15}/>}</button></div>
        <p className="text-center text-[9px] text-paper/35">This appears once automatically. Use HOW THIS WORKS on the relevant screen to replay it later.</p>
      </div>
    </div>
  </div>;
}

/*
 * New Depth & Clarity systems appear on several screens that pre-date the
 * tutorial host. Rather than coupling every screen to tutorial state, this
 * tiny observer waits for the real player-facing heading to enter the DOM and
 * then opens the matching screenshot-style guide once. Existing contextual
 * tutorials still use RunState; this ledger is reset when a new career wipes
 * save slots (see storage.ts).
 */
const CONTEXT_TUTORIAL_KEY = "kirameki.context-tutorials.v1";
const AUTO_CONTEXTS: readonly { id: TutorialId; marker: string }[] = [
  { id: "review-diagnosis", marker: "WHAT WE LEARNED" },
  { id: "publicity-audience", marker: "PUBLICITY · LAUNCH" },
  { id: "merch-bets", marker: "MERCHANDISING · TIER" },
  { id: "industry-movements", marker: "CULTURAL MOVEMENT ·" },
  { id: "rival-memories", marker: "WHAT THEY REMEMBER" },
  { id: "studio-reputation", marker: "INDUSTRY REPUTATION · EARNED, NOT CHOSEN" },
  { id: "staff-relationships", marker: "GOLDEN PAIR" },
  { id: "staff-relationships", marker: "FORMAL MENTORSHIP" },
] as const;

function contextSeen(): Set<TutorialId> {
  try {
    const raw = localStorage.getItem(CONTEXT_TUTORIAL_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function markContextSeen(id: TutorialId) {
  try {
    const seen = contextSeen();
    seen.add(id);
    localStorage.setItem(CONTEXT_TUTORIAL_KEY, JSON.stringify([...seen]));
  } catch {
    /* private mode / quota: tutorial still closes for this render */
  }
}

function ContextTutorialHost() {
  const [tutorial, setTutorial] = useState<TutorialId | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => setRevision((n) => n + 1));
    observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    const timer = window.setInterval(() => setRevision((n) => n + 1), 900);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (tutorial) return;
    if (document.querySelector('[data-first-seen-tutorial="true"]')) return;
    const text = document.body.innerText || "";
    const seen = contextSeen();
    const hit = AUTO_CONTEXTS.find((entry) => !seen.has(entry.id) && text.includes(entry.marker));
    if (hit) setTutorial(hit.id);
  }, [revision, tutorial]);

  if (!tutorial) return null;
  return <FirstSeenTutorial id={tutorial} open onDismiss={() => { markContextSeen(tutorial); setTutorial(null); setRevision((n) => n + 1); }} />;
}

let contextHostMounted = false;
function mountContextTutorialHost() {
  if (contextHostMounted || typeof document === "undefined") return;
  if (!document.body) { window.setTimeout(mountContextTutorialHost, 20); return; }
  contextHostMounted = true;
  const node = document.createElement("div");
  node.id = "anime-runner-context-tutorial-host";
  document.body.appendChild(node);
  createRoot(node).render(<ContextTutorialHost />);
}

if (typeof window !== "undefined") window.setTimeout(mountContextTutorialHost, 0);
