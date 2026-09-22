import fs from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const read = (p) => fs.readFileSync(root + p, 'utf8');
const write = (p, c) => fs.writeFileSync(root + p, c);
function replace(p, from, to) {
  const c = read(p);
  if (!c.includes(from)) throw new Error(`Missing anchor in ${p}: ${from.slice(0, 120)}`);
  write(p, c.replace(from, to));
}
function replaceRe(p, re, to, label) {
  const c = read(p);
  if (!re.test(c)) throw new Error(`Missing regex anchor in ${p}: ${label}`);
  write(p, c.replace(re, to));
}

// --- Slate plan model: rough genres + five meaningful preparation tiers.
replace('src/engine/slate.ts',
  'import { WEEKS_PER_YEAR, type Draft } from "./data";',
  'import { WEEKS_PER_YEAR, type Draft, type GenreId } from "./data";');
replace('src/engine/slate.ts',
`  licensedIpId?: string;
  createdWeek: number;`,
`  licensedIpId?: string;
  /** rough creative direction for calendar forecasts; creation can still change it */
  genres?: GenreId[];
  createdWeek: number;`);
replaceRe('src/engine/slate.ts',
/export const SLATE_PREP_MIN_WEEKS = 4;[\s\S]*?\nexport function armSlatePlan/,
`export const SLATE_PREP_MIN_WEEKS = 4;
export interface SlatePreparation {
  planId: string;
  importance: SlateImportance;
  weeksPlanned: number;
  effectiveWeeks: number;
  ready: boolean;
  label: "IMPROVISED" | "PREPARED" | "READY" | "LOCKED" | "LONG LEAD";
  hypeBonus: number;
  burnDiscount: number;
  deadlineBufferWeeks: number;
}

/** Advance planning now matters progressively rather than flipping one binary
 * switch. Elliot Mercer accelerates every slate; Freja accelerates franchise
 * planning specifically. */
export function slatePreparation(plan: SlatePlan, nowWeek: number, showrunner?: string): SlatePreparation {
  const weeksPlanned = Math.max(0, nowWeek - plan.createdWeek);
  const speed = showrunner === "operations" || (showrunner === "franchise" && plan.kind === "franchise") ? 1.25 : 1;
  const effectiveWeeks = Math.max(0, Math.round(weeksPlanned * speed));
  const importanceHype = plan.importance === "tentpole" ? 2 : plan.importance === "standard" ? 1 : 0;
  let label: SlatePreparation["label"] = "IMPROVISED";
  let hypeBonus = 0;
  let burnDiscount = 0;
  let deadlineBufferWeeks = 0;
  if (effectiveWeeks >= 20) {
    label = "LONG LEAD"; hypeBonus = 8 + importanceHype; burnDiscount = 0.08; deadlineBufferWeeks = 2;
  } else if (effectiveWeeks >= 12) {
    label = "LOCKED"; hypeBonus = 6 + importanceHype; burnDiscount = 0.07; deadlineBufferWeeks = 1;
  } else if (effectiveWeeks >= 8) {
    label = "READY"; hypeBonus = 4 + importanceHype; burnDiscount = 0.05;
  } else if (effectiveWeeks >= 4) {
    label = "PREPARED"; hypeBonus = 2 + importanceHype; burnDiscount = 0.03;
  }
  return {
    planId: plan.id,
    importance: plan.importance,
    weeksPlanned,
    effectiveWeeks,
    ready: effectiveWeeks >= SLATE_PREP_MIN_WEEKS,
    label,
    hypeBonus,
    burnDiscount,
    deadlineBufferWeeks,
  };
}

export function armSlatePlan`,
'preparation block');
replace('src/engine/slate.ts',
  '  const preparation = slatePreparation(plan, run.week);',
  '  const preparation = slatePreparation(plan, run.week, run.showrunner);');

// The old panel is replaced by the accessible full-screen calendar, without
// changing imports elsewhere in Projects/Office.
write('src/components/StudioSlate.tsx', 'export { default } from "./StudioSlateV3";\n');

// --- House Specialisation: a real creative commitment, not a tiny modifier.
replaceRe('src/engine/specialisation.ts',
/const RANK_EFFECTS: Record<1 \| 2 \| 3, RankEffects> = \{[\s\S]*?\n\};\n\nexport interface SpecialisationProjectEffects/,
`const RANK_EFFECTS: Record<1 | 2 | 3, RankEffects> = {
  1: {
    signatureOutput: 1.02,
    signaturePace: 1.01,
    signatureInterventionCost: 0.97,
    signatureInterventionEffect: 1.02,
    signatureRisk: 0.97,
    signatureIssueChance: 0.97,
    signatureScore: 1.08,
    outsideScore: 0.97,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  2: {
    signatureOutput: 1.04,
    signaturePace: 1.02,
    signatureInterventionCost: 0.94,
    signatureInterventionEffect: 1.04,
    signatureRisk: 0.94,
    signatureIssueChance: 0.94,
    signatureScore: 1.15,
    outsideScore: 0.94,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
  3: {
    signatureOutput: 1.06,
    signaturePace: 1.03,
    signatureInterventionCost: 0.90,
    signatureInterventionEffect: 1.06,
    signatureRisk: 0.90,
    signatureIssueChance: 0.90,
    signatureScore: 1.25,
    outsideScore: 0.90,
    outsideOutput: 1,
    outsidePace: 1,
    outsideInterventionCost: 1,
    outsideRisk: 1,
    outsideIssueChance: 1,
  },
};

export interface SpecialisationProjectEffects`,
'RANK_EFFECTS');
replace('src/engine/specialisation.ts',
`      \`🎯 HOUSE SPECIALTY LOCKED: \${genreLabel(genre)} shows gain Story, Art and Sound scoring expertise. Shows without it take only a small house-focus penalty.\`,`,
`      \`🎯 HOUSE SPECIALTY LOCKED: \${genreLabel(genre)} shows gain Story, Art and Sound scoring expertise. As your House rank grows this reaches +25%; work outside your specialty can fall to −10%.\`,`);

// Make the Studio Identity screen say exactly what the choice now means.
replace('src/components/StudioIdentity.tsx',
`This is a permanent studio identity choice. Productions containing it become your house speciality; productions outside it become slightly less efficient and less predictable.`,
`This is a permanent creative commitment. Any production containing this genre counts as house work — even a genre combination. House scoring grows from +8% to +25%; work without it can eventually take a −10% all-craft penalty.`);
replace('src/components/StudioIdentity.tsx',
`Choose a house genre to build exceptional institutional expertise. Signature work gets stronger production output, faster pacing, better intervention economics, sharper forecasts and a direct Story / Art / Sound scoring lift. Work outside the house remains viable, but carries a small scoring penalty because the studio is operating away from its strongest identity.`,
`Choose the genre your studio wants to become famous for. Any show containing it — including a two-genre combination — counts as house work. The scoring swing is deliberately meaningful: +8% at Genre Studio, +15% at Authority and +25% at Institution; shows without your specialty take −3%, −6% or −10% respectively. Operational bonuses stay modest so the creative identity is the main reward.`);
replace('src/components/StudioIdentity.tsx',
`<div className="rounded-lg border border-mint/25 bg-mint/5 p-2"><b className="text-[10px] text-mint">+{benefits.signatureOutputPct}% OUTPUT</b><div className="text-[7px] text-paper/40">signature productions</div></div>`,
`<div className="rounded-lg border border-mint/35 bg-mint/5 p-2"><b className="text-[10px] text-mint">+{benefits.signatureScorePct}% STORY / ART / SOUND</b><div className="text-[7px] text-paper/40">every release containing your specialty</div></div>`);
replace('src/components/StudioIdentity.tsx',
`<div className="rounded-lg border border-neon/20 bg-neon/[.04] p-2"><b className="text-[10px] text-neon">OUTSIDE HOUSE</b><div className="text-[7px] text-paper/40">Small all-craft scoring penalty only. Production pace, rescue cost and issue risk are not broadly punished.</div></div>`,
`<div className="rounded-lg border border-neon/30 bg-neon/[.04] p-2"><b className="text-[10px] text-neon">−{benefits.outsideScorePenaltyPct}% OUTSIDE HOUSE</b><div className="text-[7px] text-paper/40">Story / Art / Sound when neither genre is your specialty</div></div>`);

// Existing showrunners now interact with the new planning system.
replace('src/engine/showrunnerImpact.ts',
`  operations: "Production scheduling +10 percentage points · production burn ×0.90",`,
`  operations: "Production scheduling +10 percentage points · production burn ×0.90 · Slate Readiness builds ×1.25",`);
replace('src/engine/showrunnerImpact.ts',
`  franchise: "New sequel/continuation fatigue ×0.75 (25% less fatigue added)",`,
`  franchise: "New sequel/continuation fatigue ×0.75 · franchise Slate Readiness builds ×1.25",`);
replace('src/engine/data.ts',
`perk: "On Schedule — +10 percentage points of production scheduling capacity and 10% lower production burn."`,
`perk: "On Schedule — +10 percentage points of production scheduling capacity, 10% lower production burn and Slate Readiness builds 25% faster."`);
replace('src/engine/data.ts',
`perk: "Long View — sequels and continuations add 25% less franchise fatigue."`,
`perk: "Long View — sequels and continuations add 25% less franchise fatigue; franchise Slate Readiness builds 25% faster."`);

// Tutorial triggers must recognise the new compact Slate card.
replace('src/components/ContextTutorialExtras.tsx',
`  { id: "slate-planning", marker: "STUDIO SLATE & DEPARTMENT LOAD" },`,
`  { id: "slate-planning", marker: "STUDIO SLATE" },`);
replace('src/components/ContextTutorialExtras.tsx',
`  { id: "slate-planning", marker: "STUDIO SLATE & DEPARTMENT LOAD", label: "SLATE" },`,
`  { id: "slate-planning", marker: "STUDIO SLATE", label: "SLATE" },`);

// Player-simple tutorial copy for the revised systems.
replaceRe('src/components/FirstSeenTutorial.tsx',
/  "studio-knowledge": \{[\s\S]*?\n  \},\n  "auto-manage":/,
`  "studio-knowledge": {
    eyebrow: "R&D", title: "RESEARCH & STUDIO KNOWLEDGE",
    intro: "Research does two jobs: make the studio permanently better, and teach you what works.",
    steps: [
      { title: "1 · EVERY LEVEL GIVES YOU SOMETHING", body: "Writing, Animation, Sound, Production and Business each have eight levels. There are no empty levels: every one has a named gain and a permanent mechanical improvement.", preview: "disciplines", callout: "The glowing NEXT reward is what your next level gives you." },
      { title: "2 · CHOOSE A HOUSE SPECIALTY", body: "Studio Knowledge is also where you choose the genre your studio wants to become famous for. Combinations count as long as your specialty is one of the genres.", preview: "reputation", callout: "This is a real commitment: the bonus can grow to +25%, while outside-house work can fall to −10%." },
      { title: "3 · KNOWLEDGE REVEALS ANSWERS", body: "Genre Studies and Narrative Analytics uncover combinations, arcs and production preferences. Staff research reveals Potential as useful words rather than exact hidden numbers.", preview: "knowledge", callout: "More knowledge means clearer advice next time you create a show." },
    ],
  },
  "auto-manage":`,
'studio-knowledge guide');
replace('src/components/FirstSeenTutorial.tsx',
`      { title: "1 · THE SLATE IS YOUR FUTURE CALENDAR", body: "Use PLAN to put future Originals, Franchises or Licensed projects on a quarter before you actually start them.", preview: "slate", callout: "Warnings mean the quarter may be too crowded; they do not forbid the plan." },`,
`      { title: "1 · THE SLATE IS YOUR PRODUCTION CALENDAR", body: "Open the calendar to see active and planned shows blocked out by Development, Animation, Sound, Post, Marketing and Release. You choose a release window; the game draws the stages for you.", preview: "slate", callout: "Solid blocks are active. Dashed blocks are planned estimates." },`);
replaceRe('src/components/FirstSeenTutorial.tsx',
/  "slate-planning": \{[\s\S]*?\n  \},\n  "review-diagnosis":/,
`  "slate-planning": {
    eyebrow: "PLANNING", title: "THE STUDIO SLATE",
    intro: "This is your simple production calendar. You choose when you want a show out; the studio estimates the work backwards.",
    steps: [
      { title: "1 · COLOURS SHOW THE PRODUCTION", body: "Development, Pre-production, Animation, Sound, Post, Marketing and Release each have their own colour. You do not manually draw the blocks.", preview: "slate", callout: "Pick a release window and the calendar does the scheduling maths." },
      { title: "2 · LOOK FOR THE WARNING CARDS", body: "The calendar points out animation crunch, cash risk, audience clashes, rival releases, expiring rights and useful market windows before you commit.", preview: "slate", callout: "Warnings explain a risk; they never forbid your plan." },
      { title: "3 · PLANNING PAYS", body: "A show moves from IMPROVISED to PREPARED, READY, LOCKED and LONG LEAD the longer it stays on the Slate. Better preparation cuts weekly burn, adds starting hype and can give deadline safety.", preview: "slate", callout: "You can still make an unplanned show whenever you want." },
    ],
  },
  "review-diagnosis":`,
'slate guide');
replaceRe('src/components/FirstSeenTutorial.tsx',
/  "research-disciplines": \{[\s\S]*?\n  \},\n  "publicity-audience":/,
`  "research-disciplines": {
    eyebrow: "R&D", title: "THE FIVE RESEARCH AREAS",
    intro: "Five clear disciplines replace a pile of tiny upgrades — and every paid level now matters.",
    steps: [
      { title: "1 · THERE ARE NO EMPTY LEVELS", body: "Every level from 1 to 8 has a named reward. Writing, Animation and Sound also gain +2% craft strength per level; Production and Business get their own permanent gains.", preview: "disciplines", callout: "If you buy a level, you always get an immediate improvement." },
      { title: "2 · FOLLOW THE NEXT REWARD", body: "Each research card shows your current level and the next named gain, so you always know what you are working toward.", preview: "disciplines", callout: "Choose the area that solves the problem your studio actually has." },
    ],
  },
  "publicity-audience":`,
'research guide');
replaceRe('src/components/FirstSeenTutorial.tsx',
/  "studio-reputation": \{[\s\S]*?\n  \},\n  "career-era-delegation":/,
`  "studio-reputation": {
    eyebrow: "IDENTITY", title: "HOUSE SPECIALTY VS REPUTATION",
    intro: "These are different. You CHOOSE your House Specialty. You EARN your Industry Reputation from what you actually do.",
    steps: [
      { title: "1 · HOUSE SPECIALTY = YOUR BIG CREATIVE BET", body: "Pick one genre. Pure shows and any two-genre combination containing it count as house work.", preview: "reputation", callout: "Genre Studio: +8% / −3%. Authority: +15% / −6%. Institution: +25% / −10%." },
      { title: "2 · REPUTATION = WHAT PEOPLE THINK YOU ARE", body: "Hit Factory, Auteur Studio, Franchise Machine and other reputation labels appear from your real career choices. You do not pick them from a menu.", preview: "reputation", callout: "Specialty is your plan. Reputation is your history." },
    ],
  },
  "career-era-delegation":`,
'reputation guide');

console.log('Slate V3 + specialisation integration patch complete.');
