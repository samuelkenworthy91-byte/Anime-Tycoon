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
import { WORKER_LOOKS } from "../engine/data";
import Portrait from "./Portrait";
import { cn } from "../utils/cn";

type PreviewId =
  | "pitch" | "project-lead" | "rush-lead"
  | "overseas-title" | "overseas-shape" | "overseas-sign"
  | "rights-appraise" | "rights-own" | "rights-adapt"
  | "debt-clock" | "debt-recover" | "debt-shutdown"
  | "dynasty-pressure" | "dynasty-invest" | "dynasty-legacy"
  | "franchise" | "knowledge" | "automation" | "capability"
  | "slate" | "review" | "disciplines" | "publicity" | "merch"
  | "movement" | "relationships" | "rival-memory" | "reputation" | "era" | "full-delegation"
  | "arcball-world" | "arcball-team" | "arcball-cost" | "arcball-rewards" | "arcball-manager";

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
  "full-delegation": {
    eyebrow: "MANAGEMENT", title: "LET A CREATOR RUN THE WHOLE SHOW",
    intro: "Full Delegation is different from Auto Manage. You choose one employee; they invent and run an original production for you.",
    steps: [
      { title: "1 · PICK WHO GETS THE KEYS", body: "Choose a free employee. Their tastes help decide the title, genre mix, audience, cast, arcs and direction.", preview: "full-delegation", callout: "The named creator owns the creative decisions, not an invisible AI manager." },
      { title: "2 · THEY AIM FOR SOLID, NOT PERFECT", body: "They assemble an available crew and automatically handle production rushes and normal milestones. Their choices are sensible, but they do not know the mathematical optimum.", preview: "full-delegation", callout: "Delegated live contributions run at 80% strength." },
      { title: "3 · YOU CAN STEP BACK IN", body: "The production keeps appearing on your Project Board. Press TAKE OVER whenever you want to handle the remaining work yourself.", preview: "full-delegation", callout: "Delegate for convenience; intervene when a show matters enough to deserve your attention." },
    ],
  },
  "arcball": {
    eyebrow: "STUDIO CULTURE", title: "WELCOME TO ARCBALL",
    intro: "Studios compete off-screen too. Arcball is the anime industry's five-a-side worker sport: part rivalry, part celebrity machine, part management headache.",
    steps: [
      { title: "1 · THIS IS ARCBALL", body: "Writers, animators, composers and producers represent their studios in packed inter-studio matches. It is a real spectator sport inside Anime Runner's world, with rivalries, stars, sponsors and seasonal honours.", preview: "arcball-world", callout: "Arcball ability is completely separate from Story, Art and Sound." },
      { title: "2 · YOUR WORKERS ARE THE TEAM", body: "Build a five-person side from your employees: Keeper, Anchor, Runner, Creator and Striker. A poor animator can still be an elite athlete, so hiring and retention decisions become less obvious.", preview: "arcball-team", callout: "Sporting talent can make an otherwise weak production employee worth keeping." },
      { title: "3 · SPORT COSTS REAL ENERGY", body: "Arcball uses the same people as anime production. Matches and training drain their real studio energy, so playing a star writer before a deadline can hurt the show they are making.", preview: "arcball-cost", callout: "The sport is strongest when it creates a genuine staffing trade-off." },
      { title: "4 · THE BEST PLAYERS HELP THE STUDIO", body: "Normal success earns fans, Arc Tokens and development options. Elite seasonal awards can permanently improve how a worker contributes to anime production, while titles create major franchise opportunities.", preview: "arcball-rewards", callout: "Top-end Arcball success feeds the main game; ordinary participation remains optional." },
      { title: "5 · YOU ARE THE MANAGER", body: "You do not directly control a worker during play. Recruit, train, pick the formation and approach, manage effort, make substitutions and then watch the team execute your plan.", preview: "arcball-manager", callout: "The pitch should explain your tactical choices without turning Arcball into an action game." },
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

function ArcballCutscene() {
  const looks = [WORKER_LOOKS[2]?.portrait, WORKER_LOOKS[7]?.portrait, WORKER_LOOKS[11]?.portrait];
  return <div className="relative h-56 overflow-hidden rounded-2xl border border-cyanx/30 bg-[#111a24]">
    <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#26364f] to-transparent"/>
    <div className="absolute left-[8%] right-[8%] top-4 flex justify-around opacity-55">
      {Array.from({length:11},(_,i)=><span key={i} className="h-1.5 w-1.5 rounded-full bg-paper shadow-[0_0_8px_rgba(255,255,255,.8)]"/>)}
    </div>
    <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-md border border-paper/20 bg-ink/80 px-3 py-1 text-[7px] font-black tracking-[0.2em] text-paper/60">INTER-STUDIO ARCBALL · SOLD OUT</div>
    <div className="absolute -bottom-10 left-[-8%] right-[-8%] h-48 -skew-y-6 rounded-[50%] border border-white/20 bg-[#24563b] shadow-[inset_0_0_50px_rgba(0,0,0,.45)]">
      <div className="absolute left-[8%] right-[8%] top-1/2 border-t border-white/25"/>
      <div className="absolute left-1/2 top-[17%] bottom-[10%] border-l border-white/20"/>
    </div>
    <div className="absolute left-[7%] top-[45%] h-1 w-[45%] -rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent"/>
    <div className="absolute right-[6%] top-[50%] h-1 w-[38%] rotate-6 bg-gradient-to-l from-transparent via-gold/80 to-transparent"/>
    <ArcballCutsceneWorker portrait={looks[0]} x="18%" y="55%" jersey="bg-cyanx" label="REN · CREATOR" />
    <ArcballCutsceneWorker portrait={looks[1]} x="56%" y="38%" jersey="bg-neon" label="MORI · ANCHOR" rival />
    <ArcballCutsceneWorker portrait={looks[2]} x="73%" y="63%" jersey="bg-cyanx" label="DANNY · STRIKER" />
    <div className="absolute left-[48%] top-[56%] h-6 w-6 rounded-full border-2 border-black/60 bg-paper shadow-[0_0_18px_rgba(255,255,255,.95)]">
      <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink/80"/>
    </div>
    <div className="absolute bottom-2 left-2 right-2 rounded-lg border border-white/10 bg-ink/80 px-2 py-1.5 text-[7px] leading-relaxed text-paper/70">
      Ren slips the Arcball through the press. Danny explodes into the lane as Mori dives across to intercept.
    </div>
  </div>;
}

function ArcballCutsceneWorker({ portrait, x, y, jersey, label, rival=false }: { portrait?: string | number; x:string; y:string; jersey:string; label:string; rival?:boolean }) {
  return <div className="absolute z-10 -translate-x-1/2 -translate-y-1/2" style={{left:x,top:y}}>
    <div className={cn("mx-auto h-12 w-9 -skew-x-6 rounded-t-xl border border-black/40", jersey, rival && "opacity-90")}/>
    <div className="absolute -top-6 left-1/2 h-10 w-10 -translate-x-1/2 overflow-hidden rounded-full border-2 border-paper/60 bg-panel shadow-lg">
      {portrait !== undefined ? <Portrait img={portrait} name={label} alt="" className="h-full w-full object-cover"/> : <div className="h-full w-full bg-panel3"/>}
    </div>
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-ink/85 px-1.5 py-0.5 text-[6px] font-black text-paper/70">{label}</div>
  </div>;
}

function ScreenPreview({ kind }: { kind: PreviewId }) {
  if (kind === "arcball-world") return <ArcballCutscene/>;
  if (kind === "arcball-team") return <Frame title="ARCBALL · SQUAD"><div className="grid grid-cols-5 gap-1 text-center text-[7px] font-black">{["KEEPER","ANCHOR","RUNNER","CREATOR","STRIKER"].map((role,i)=><div key={role} className="rounded-lg border border-cyanx/25 bg-cyanx/5 p-1.5"><div className="mx-auto mb-1 h-7 w-7 rounded-full border border-cyanx/40 bg-panel3"/><div>{role}</div><div className="text-mint">{[68,74,81,77,83][i]}</div></div>)}</div><Spotlight tone="cyan"><div className="text-[8px]"><b>DANNY KIM</b><br/>Story 24 · Art 19 · Sound 21<br/><span className="text-mint">ARCBALL STRIKER · 83</span></div></Spotlight></Frame>;
  if (kind === "arcball-cost") return <Frame title="ONE WORKER · TWO JOBS"><div className="grid grid-cols-2 gap-2 text-[8px]"><Spotlight label="STUDIO"><b>ANIME DEADLINE</b><div className="mt-1">Danny assigned to Animation<br/>Energy 82%</div></Spotlight><Spotlight label="ARCBALL" tone="cyan"><b>MATCH TONIGHT</b><div className="mt-1">PUSH intensity<br/>Projected energy 64%</div></Spotlight></div><div className="rounded-lg border border-neon/25 bg-neon/5 p-2 text-[8px] text-neon">Same worker. Same stamina. You choose the priority.</div></Frame>;
  if (kind === "arcball-rewards") return <Frame title="ARCBALL · CAREER PATH" icon={<Trophy size={10}/>}><div className="grid grid-cols-4 gap-1 text-center text-[7px]"><div className="rounded border border-line p-1">MATCHES<br/><b>FANS</b></div><div className="rounded border border-line p-1">TOKENS<br/><b>TRAINING</b></div><div className="rounded border border-gold/35 p-1 text-gold">AWARDS<br/><b>PERKS</b></div><div className="rounded border border-cyanx/35 p-1 text-cyanx">TITLE<br/><b>SPOTLIGHT</b></div></div><Spotlight><div className="text-[8px]">PLAYER OF THE YEAR → permanent anime-production perk<br/>LEAGUE TITLE → franchise-level commercial advantage</div></Spotlight></Frame>;
  if (kind === "arcball-manager") return <Frame title="ARCBALL · MATCH DAY"><div className="grid grid-cols-2 gap-2"><Spotlight tone="cyan"><div className="text-[8px]"><b>FORMATION</b><br/>2-1-1 Balanced<br/><b>APPROACH</b><br/>Short Build</div></Spotlight><Spotlight><div className="text-[8px]"><b>TOUCHLINE</b><br/>Feed Striker<br/><b>INTENSITY</b><br/>Push</div></Spotlight></div><div className="rounded-lg border border-line bg-[#24563b] p-3 text-center text-[8px] text-paper/70">● → ● → <span className="text-gold">● SHOT</span><br/><span className="text-[7px] text-paper/45">Players and ball move through the tactical sequence.</span></div></Frame>;
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
  if (kind === "slate") return <Frame title="PRODUCTION CALENDAR · YEAR 6 Q2" icon={<CalendarRange size={10}/>}><div className="grid grid-cols-6 gap-1 text-center text-[6px] font-black"><div className="rounded border border-violet-400/50 bg-violet-500/20 p-1">DEV</div><div className="rounded border border-fuchsia-400/50 bg-fuchsia-500/20 p-1">PRE</div><div className="rounded border border-cyanx/50 bg-cyanx/20 p-1">ANI</div><div className="rounded border border-mint/50 bg-mint/20 p-1">SND</div><div className="rounded border border-gold/50 bg-gold/15 p-1">QA</div><div className="rounded border border-neon/50 bg-neon/15 p-1">REL</div></div><Spotlight tone="cyan"><div className="text-[8px] font-black">MOON WITCH S3</div><div className="mt-1 grid grid-cols-12 gap-[1px]">{Array.from({length:12},(_,i)=><span key={i} className={cn("h-3 rounded-[2px]",i<2?"bg-violet-500/50":i<7?"bg-cyanx/50":i<9?"bg-mint/45":i<11?"bg-gold/45":"bg-neon/45")}/>)}</div><div className="mt-1 text-[7px] text-mint">LOCKED · −7% burn · +5% pace · lower note risk</div></Spotlight><Spotlight label="WARNING"><div className="text-[8px]">⚠ ANIMATION CRUNCH · two blue blocks overlap</div></Spotlight></Frame>;
  if (kind === "review") return <Frame title="PREMIERE REVIEWS" icon={<Sparkles size={10}/>}><div className="rounded-lg border border-line bg-panel2/50 p-2 text-[8px] text-paper/40">CRITIC · 7/10<br/>“Strong ideas, uneven finish.”</div><Spotlight label="THIS IS WHY"><b className="text-[8px] text-neon2">! Editing notes materially hurt the finish</b><div className="mt-1 text-[7px] text-paper/45">7 unresolved notes reached release.</div></Spotlight><Spotlight label="USE NEXT TIME" tone="cyan"><b className="text-[8px] text-cyanx">WHAT WE LEARNED</b><div className="mt-1 text-[7px]">✓ Animation emphasis was well judged<br/>→ Story could use more support</div></Spotlight></Frame>;
  if (kind === "disciplines") return <Frame title="R&D · STUDIO DISCIPLINES" icon={<BookOpen size={10}/>}><Spotlight tone="cyan"><div className="flex items-center justify-between text-[8px]"><b>PRODUCTION & QA</b><b className="text-cyanx">LV 3/8</b></div><div className="mt-2 grid grid-cols-8 gap-1">{[1,2,3,4,5,6,7,8].map((n)=><div key={n} className={cn("rounded border px-1 py-1 text-center text-[7px] font-black",n<=3?"border-mint/40 bg-mint/10 text-mint":n===4?"border-gold/60 bg-gold/15 text-gold":"border-line text-paper/25")}>{n}</div>)}</div><div className="mt-2 text-[7px] text-paper/45">NEXT · LV4</div><div className="text-[8px] font-bold">Auto-Cleanup · plus permanent Production gain</div></Spotlight><div className="text-[7px] text-paper/35">Every level has a named reward. No dead levels.</div></Frame>;
  if (kind === "publicity") return <Frame title="PUBLICITY · LAUNCH" icon={<Megaphone size={10}/>}><Spotlight tone="cyan"><div className="grid grid-cols-5 gap-1 text-center text-[7px]"><div>Core<br/><b>18%</b></div><div>Casual<br/><b>16%</b></div><div className="text-cyanx">Online<br/><b>34%</b></div><div>Prestige<br/><b>12%</b></div><div>Collectors<br/><b>20%</b></div></div><div className="mt-1 text-[7px] text-paper/40">These are fan types, not currencies.</div></Spotlight><Spotlight label="GOOD MATCH"><div className="flex items-center justify-between text-[8px]"><b>Character Spotlight</b><span className="text-mint">AUDIENCE EXCELLENT ×1.20</span></div></Spotlight></Frame>;
  if (kind === "merch") return <Frame title="FRANCHISE MERCH" icon={<Package size={10}/>}><Spotlight><div className="flex justify-between text-[8px]"><b>SCALE FIGURES</b><span className="text-mint">≈£1.4m</span></div><div className="mt-1 text-[7px] text-paper/45">Cost £380k · 18 weeks · audience ×1.24</div><MiniButton hot>START MERCH BET</MiniButton></Spotlight><div className="rounded-lg border border-line p-2 text-[7px] text-paper/35">One active bet per franchise at a time.</div></Frame>;
  if (kind === "movement") return <Frame title="INDUSTRY" icon={<Sparkles size={10}/>}><Spotlight tone="cyan"><div className="text-[7px] font-black text-cyanx">CULTURAL MOVEMENT · BOOM</div><div className="mt-1 text-[11px] font-black">THE MECHA REVIVAL</div><div className="mt-1 text-[7px] text-paper/45">68 weeks remain · affects commercial demand, not critic quality</div></Spotlight><div className="text-[7px] text-paper/35">Rivals may chase the same trend.</div></Frame>;
  if (kind === "relationships") return <Frame title="CREW · RELATIONSHIPS" icon={<Users size={10}/>}><Spotlight><div className="text-[8px] font-black text-gold">GOLDEN PAIR · MAYA + REN</div><div className="text-[7px] text-paper/45">6 shared releases · 4 hits · best 35/40</div></Spotlight><Spotlight label="OPTION"><div className="text-[8px]">SENIOR CREATOR → JUNIOR CREATOR</div><MiniButton hot>FORMAL MENTORSHIP</MiniButton></Spotlight></Frame>;
  if (kind === "rival-memory") return <Frame title="RIVAL STUDIO" icon={<Swords size={10}/>}><div className="text-[9px] font-black">SUNNYRISE</div><Spotlight label="THEY REMEMBER"><div className="text-[8px]">Y7 · You poached Akira Tanaka.</div><div className="mt-1 text-[8px]">Y8 · “Steel Dawn” beat “Red Orbit” head-to-head 34–31.</div></Spotlight></Frame>;
  if (kind === "reputation") return <Frame title="HOUSE SPECIALTY & REPUTATION" icon={<Crown size={10}/>}><Spotlight label="YOU CHOOSE THIS"><div className="text-[7px] text-paper/40">HOUSE SPECIALTY</div><div className="text-[9px] font-black">MECHA · AUTHORITY</div><div className="mt-1 text-[8px] font-black text-mint">WITH MECHA · +15% ALL CRAFT</div><div className="text-[8px] font-black text-neon">WITHOUT MECHA · −6% ALL CRAFT</div><div className="mt-1 text-[7px] text-paper/45">At Institution this becomes +25% / −10%.</div></Spotlight><Spotlight label="YOU EARN THIS" tone="cyan"><div className="text-[7px] text-paper/40">INDUSTRY REPUTATION</div><div className="text-[9px] font-black text-cyanx">FRANCHISE MACHINE</div><div className="text-[7px] text-paper/45">Earned from what your studio actually does.</div></Spotlight></Frame>;
  if (kind === "full-delegation") return <Frame title="PROJECTS · FULL DELEGATION" icon={<Users size={10}/>}><Spotlight label="PICK A CREATOR" tone="cyan"><div className="flex items-center justify-between text-[8px]"><b>MAYA CHEN · WRITER · LV4</b><span className="text-cyanx">DELEGATE</span></div><div className="mt-1 text-[7px] text-paper/45">Prefers Mystery · free to lead</div></Spotlight><Spotlight label="THEY CHOOSE"><div className="text-[8px]">Title · genres · cast · arcs · sliders · crew · production rushes</div></Spotlight><div className="rounded-lg border border-viol/30 bg-viol/5 p-2 text-[8px] font-bold text-viol">LIVE CONTRIBUTIONS · 80% STRENGTH · TAKE OVER ANY TIME</div></Frame>;
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
