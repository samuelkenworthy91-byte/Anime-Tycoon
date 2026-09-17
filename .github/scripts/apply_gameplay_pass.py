from pathlib import Path
import re

ROOT = Path('game_source')

def read(rel):
    return (ROOT / rel).read_text()

def write(rel, text):
    (ROOT / rel).write_text(text)

def replace(rel, old, new, count=1):
    text = read(rel)
    found = text.count(old)
    if found < count:
        raise SystemExit(f'{rel}: expected at least {count} occurrences, found {found}: {old[:120]!r}')
    write(rel, text.replace(old, new, count))

def regex_replace(rel, pattern, repl, count=1):
    text = read(rel)
    text2, n = re.subn(pattern, repl, text, count=count, flags=re.S)
    if n != count:
        raise SystemExit(f'{rel}: regex replacement expected {count}, got {n}: {pattern[:120]!r}')
    write(rel, text2)

# Licensed franchise provenance + Big Three commercial halo.
replace('src/engine/franchise.ts',
    '  /** irreversible sale of the original IP to an outside buyer */\n  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };',
    '  /** external licensed property this franchise originated from; optional for old saves */\n  licensedIpId?: string;\n  /** irreversible sale of the original IP to an outside buyer */\n  soldTo?: { id: string; name: string; kind: "network" | "rival"; week: number; price: number };')
replace('src/engine/franchise.ts', '  const bigThreeF = fr.bigThree ? 1.25 : 1;', '  const bigThreeF = fr.bigThree ? 1.6 : 1;')
replace('src/engine/franchise.ts',
    '    merchCooldown: {},\n    spunFrom,\n    alive: result.hallOfFame,',
    '    merchCooldown: {},\n    licensedIpId: d.licensedIpId,\n    spunFrom,\n    alive: result.hallOfFame,')
regex_replace('src/engine/franchise.ts',
    r'export function franchiseBoost\(fr: Franchise \| null, d: Draft, partner\?: Franchise \| null\): number \{.*?\n\}\n\n/\* ----------------------------------------------------- fan expectations \*/',
    '''export function franchiseBoost(fr: Franchise | null, d: Draft, partner?: Franchise | null): number {
  if (!fr || !d.continuation) {
    const base = d.franchiseKey ? 1 + 0.12 * Math.max(0, d.season - 1) : 1;
    return fr?.bigThree ? Math.round(base * 1.4 * 100) / 100 : base;
  }
  const def = continuationDef(d.continuation);
  if (!def) return 1;
  const seasonMult = d.continuation === "season" ? 1 + 0.12 * Math.max(0, d.season - 1) : 1;
  const popF = 0.75 + fr.popularity / 130;
  const fatF = Math.max(0.6, 1 - fr.fatigue / 200);
  let mult = seasonMult * popF * fatF * def.revMult;
  if (d.continuation === "spinoff") {
    const feat = fr.cast.find((c) => c.id === d.spinChar) ?? topCharacter(fr);
    mult *= 0.8 + (feat ? feat.popularity : 30) / 150;
  }
  if (d.continuation === "crossover" && partner) {
    mult *= 0.85 + (fr.popularity + partner.popularity) / 250;
  }
  const bounded = clamp(mult, 0.5, 3);
  const bigThreeHalo = fr.bigThree
    ? (d.continuation === "spinoff" || d.continuation === "crossover" ? 1.2 : 1.4)
    : 1;
  return Math.round(bounded * bigThreeHalo * 100) / 100;
}

/* ----------------------------------------------------- fan expectations */''')

# Route licensed sequels/reboots back through LicensedCreate, including old-save fallback.
replace('src/App.tsx',
    'import { advanceBigThreeWeek, pendingBigThreeReveal, syncBigThreeEra } from "./engine/bigThree";',
    'import { advanceBigThreeWeek, pendingBigThreeReveal, syncBigThreeEra } from "./engine/bigThree";\nimport { ipById } from "./engine/ip";')
regex_replace('src/App.tsx',
    r'  /\*\* a continuation chosen in the franchise library \*/\n  const continueFranchise = useCallback\(\(plan: ContinuationPlan\) => \{.*?\n  \}, \[\]\);',
    '''  /** a continuation chosen in the franchise library */
  const continueFranchise = useCallback((plan: ContinuationPlan) => {
    sfx.select();
    const fr = run?.franchises[plan.key];
    const licensedId = fr?.licensedIpId ?? (run && fr
      ? Object.keys(run.ipMarket.owned).find((id) => ipById(id)?.title === fr.baseTitle)
      : undefined);
    if (licensedId && run?.ipMarket.owned[licensedId]) {
      setContPlan(null);
      setPendingCommission(null);
      setLicensedIpId(licensedId);
      setScreen("licensed");
      return;
    }
    setContPlan(plan);
    setPendingCommission(null);
    setScreen("create");
  }, [run]);''')

# Licensed direction tooltips + discovery ladder.
replace('src/components/LicensedCreate.tsx',
    'import { ChevronLeft, Clapperboard, Lock, Sparkles, Users } from "lucide-react";',
    'import { ChevronLeft, CircleHelp, Clapperboard, Lock, Sparkles, Users } from "lucide-react";')
replace('src/components/LicensedCreate.tsx',
    'import { ARCS, BUDGETS, MEDIUMS, PRODUCTION_SCOPES, PROTAGONISTS, SECONDARY, PETS, VILLAINS, formatGBP, mediumAllowsScope, slotForMedium, type BudgetId, type Draft, type MediumId, type ScopeId } from "../engine/data";',
    'import { ARCS, BUDGETS, GENRES, MEDIUMS, PRODUCTION_SCOPES, PROTAGONISTS, SECONDARY, PETS, VILLAINS, comboKey, formatGBP, mediumAllowsScope, slotForMedium, type BudgetId, type Draft, type MediumId, type ScopeId } from "../engine/data";')
replace('src/components/LicensedCreate.tsx',
    'import { continuationBlock } from "../engine/franchise";',
    'import { continuationBlock } from "../engine/franchise";\nimport { exactDirectionKnown, studioKnowledgeEmphasis } from "../engine/studioOps";\nimport { genreTargetFor } from "../engine/genreTargets";')
replace('src/components/LicensedCreate.tsx',
    ' const [arcId,setArcId]=useState(available[0]?.id??""); const [studioArcId,setStudioArcId]=useState(""); const [medium,setMedium]=useState<MediumId>(initialMedium); const [budget,setBudget]=useState<BudgetId>("standard"); const [scope,setScope]=useState<ScopeId>("standard"); const [sliders,setSliders]=useState<[number,number,number]>([50,50,50]);\n const draft=',
    ''' const [arcId,setArcId]=useState(available[0]?.id??""); const [studioArcId,setStudioArcId]=useState(""); const [medium,setMedium]=useState<MediumId>(initialMedium); const [budget,setBudget]=useState<BudgetId>("standard"); const [scope,setScope]=useState<ScopeId>("standard"); const [sliders,setSliders]=useState<[number,number,number]>([50,50,50]);
 const directionGenres=ip.genreTags.slice(0,2);
 const directionDefs=directionGenres.map(id=>GENRES.find(g=>g.id===id)).filter(g=>!!g);
 const directionKnown=directionDefs.map(g=>run.genreKnowledge?.[g!.id]??0);
 const directionKnowledgeFloor=directionKnown.length?Math.min(...directionKnown):0;
 const directionTests=run.audienceComboSeries?.[comboKey(directionGenres)]?.length??0;
 const directionExact=exactDirectionKnown(directionKnown,directionGenres.length===2?directionTests:0);
 const directionTargets=genreTargetFor(directionGenres).ideal;
 const directionPhases=[
  {a:"Plot",b:"Characters",label:"STORY DIRECTION",tip:"Sets whether the adaptation prioritises plot/world mechanics or character and emotional work. This directly affects review scoring; the ideal comes from this IP's genre combination."},
  {a:"Sakuga",b:"Consistency",label:"ANIMATION DIRECTION",tip:"Sets whether animation resources favour standout spectacle cuts or even visual consistency. The genre combination determines which balance reviewers respond to best."},
  {a:"Soundtrack",b:"Voice Cast",label:"AUDIO DIRECTION",tip:"Sets whether audio direction leans toward music/atmosphere or dialogue and performance. The ideal is shared with original productions using the same genre combination."},
 ] as const;
 const draft=''' )
regex_replace('src/components/LicensedCreate.tsx',
    r'<div className="ink-card p-3"><div className="text-\[10px\] font-black tracking-widest text-gold">PRODUCTION DIRECTION</div>.*?</div><div className="ink-card p-3 text-xs"><div className="flex justify-between"><span>Estimated production</span>',
    '''<div className="ink-card p-3"><div className="text-[10px] font-black tracking-widest text-gold">INITIAL PRODUCTION DIRECTION</div><div className="mt-1 text-[9px] leading-relaxed text-paper/50">These sliders materially affect final quality. They use the exact same hidden genre-combination targets as an original production, and each can be revised again at its production milestone.</div>{directionPhases.map((phase,i)=>{const target=directionTargets[i];const emphasis=studioKnowledgeEmphasis(target,phase.a,phase.b);return <div key={phase.label} className="mt-3 rounded-lg border border-line/70 bg-panel2/50 p-2"><div className="flex items-center justify-between gap-2"><div className="text-[10px] font-black text-paper/70">{phase.label}</div><button type="button" aria-label={`Explain ${phase.label.toLowerCase()}`} title={phase.tip} className="group relative rounded-full text-cyanx"><CircleHelp size={14}/><span className="pointer-events-none absolute right-0 top-5 z-30 hidden w-56 rounded-lg border border-cyanx/40 bg-ink p-2 text-left text-[9px] font-normal leading-relaxed text-paper/80 shadow-xl group-hover:block group-focus:block">{phase.tip}</span></button></div><div className="mt-1 flex justify-between text-[9px] font-bold text-paper/45"><span>{phase.a}</span><span>{sliders[i]} / {100-sliders[i]}</span><span>{phase.b}</span></div><input className="mt-1 w-full accent-pink-500" type="range" min="0" max="100" value={sliders[i]} onChange={e=>setSliders(old=>old.map((v,j)=>j===i?Number(e.target.value):v) as [number,number,number])}/><div className="mt-1.5 text-[9px] text-paper/55">{directionExact?<><span className="font-black text-mint">EXACT TARGET · {phase.a} {target}% / {phase.b} {100-target}%</span><button type="button" onClick={()=>setSliders(old=>old.map((v,j)=>j===i?target:v) as [number,number,number])} className="ml-2 rounded border border-mint/40 px-1.5 py-0.5 text-[8px] font-black text-mint">SET</button></>:directionKnowledgeFloor<=0?<>UNKNOWN · ship this combination or run audience tests to learn its direction.</>:directionKnowledgeFloor<=2?<>EARLY READ · <b>{emphasis}</b> appears more important.</>:directionKnowledgeFloor<=5?<>WORKING READ · the combination leans toward <b>{emphasis}</b>. Three exact-combo audience studies reveal the precise value.</>:<>HIGH-CONFIDENCE · {phase.a} around <b className="text-mint">{Math.round(target/5)*5}%</b> / {phase.b} around <b className="text-mint">{100-Math.round(target/5)*5}%</b>. Reach MASTERED for the exact target.</>}</div></div>})}</div><div className="ink-card p-3 text-xs"><div className="flex justify-between"><span>Estimated production</span>''')

# Rival scores: diminishing returns at elite end.
replace('src/engine/rivals.ts', 'const clampPct = (v: number) => clamp(Math.round(v), 0, 100);', '''const clampPct = (v: number) => clamp(Math.round(v), 0, 100);

export function shapeRivalScore(raw: number): number {
  let shaped = raw;
  if (shaped > 30) shaped = 30 + (shaped - 30) * 0.55;
  if (shaped > 36) shaped = 36 + (shaped - 36) * 0.45;
  return clamp(Math.round(shaped), 4, 39);
}''')
replace('src/engine/rivals.ts', '  return clamp(Math.round(s), 4, 39);', '  return shapeRivalScore(s);')
replace('src/engine/rivals.ts',
    '      const score = clamp(Math.round(13 + studio.tier * 2.4 + studio.reputation * .07 + PERSONAS[studio.persona].qualityBias + fit * 1.3 + jitter), 5, 39);',
    '      const score = Math.max(5, shapeRivalScore(13 + studio.tier * 2.4 + studio.reputation * .07 + PERSONAS[studio.persona].qualityBias + fit * 1.3 + jitter));')

# Awards craft parity.
regex_replace('src/engine/awardCycle.ts',
    r'/\*\* The player has literal production points retained.*?export function awardDisciplineOutput\(run: RunState, entry: AwardNominee, category: CraftCategoryId, year = awardYearAtWeek\(run.week\)\): number \{.*?\n\}',
    '''/** Project both player and rival craft onto one annual comparison scale.
 * Player craft already comes from real department output via playerCraftFor();
 * rivals use frozen persona-shaped craft. */
export function awardDisciplineOutput(run: RunState, entry: AwardNominee, category: CraftCategoryId, year = awardYearAtWeek(run.week)): number {
  const era = year <= 2 ? 0 : year <= 5 ? 1 : year <= 8 ? 2 : 3;
  const metricFloor = 28 + era * 2;
  const rawFloor = awardCraftOutputFloor(year, category);
  return Math.round(rawFloor * Math.max(0, craftMetric(entry, category)) / metricFloor);
}''')

# Big Three thresholds/timing + queued global consensus.
replace('src/engine/bigThree.ts', '''export const BIG_THREE_START_WEEK = 5 * 48; // opening of industry Year 6
export const BIG_THREE_MAX_SLOTS = 3;
export const BIG_THREE_MIN_SCORE = 34;
export const BIG_THREE_MIN_REACH = 55_000;
export const BIG_THREE_MIN_CRAFT_FLOOR = 32;
export const BIG_THREE_MIN_MOMENTUM = 68;
export const BIG_THREE_BREAKOUT_REACH = 120_000;''', '''export const BIG_THREE_START_WEEK = 2 * 48; // opening of industry Year 3
export const BIG_THREE_MAX_SLOTS = 3;
export const BIG_THREE_MIN_SCORE = 38;
export const BIG_THREE_MIN_REACH = 150_000;
export const BIG_THREE_MIN_CRAFT_FLOOR = 36;
export const BIG_THREE_MIN_MOMENTUM = 78;
export const BIG_THREE_BREAKOUT_REACH = 300_000;''')
replace('src/engine/bigThree.ts', 'export const BIG_THREE_RIVAL_GRACE_WEEKS = 48;\nexport const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 72;', 'export const BIG_THREE_RIVAL_GRACE_WEEKS = 48;\nexport const BIG_THREE_RIVAL_COOLDOWN_WEEKS = 48;')
replace('src/engine/bigThree.ts', '  slots: BigThreeSlot[];\n  pendingReveals: BigThreeReveal[];', '  slots: BigThreeSlot[];\n  candidates: BigThreeSlot[];\n  pendingReveals: BigThreeReveal[];')
replace('src/engine/bigThree.ts', '  slots: [],\n  pendingReveals: [],', '  slots: [],\n  candidates: [],\n  pendingReveals: [],')
replace('src/engine/bigThree.ts', '  const slotIds = new Set(slots.map((slot) => slot.id));', '  const candidates = (Array.isArray(b.candidates) ? b.candidates : []).map(migrateSlot).filter((x): x is BigThreeSlot => !!x).filter((candidate) => !slots.some((slot) => slot.sourceId === candidate.sourceId)).slice(0, 12);\n  const slotIds = new Set(slots.map((slot) => slot.id));')
replace('src/engine/bigThree.ts', '    slots,\n    pendingReveals,', '    slots,\n    candidates,\n    pendingReveals,')
replace('src/engine/bigThree.ts', '    recognisedYear: 6,', '    recognisedYear: 3,')
replace('src/engine/bigThree.ts', '      year: 6,', '      year: 3,')
replace('src/engine/bigThree.ts', 'old post-Year-6 saves', 'old post-Year-3 saves')
replace('src/engine/bigThree.ts', '🌠 YEAR 6 — fans name', '🌠 YEAR 3 — fans name')
regex_replace('src/engine/bigThree.ts',
    r'export function recognisePlayerBigThreeRelease\(inputRun: RunState, release: BigThreePlayerReleaseInput\): RunState \{.*?\n\}\n\nfunction rivalMetrics',
    '''export function recognisePlayerBigThreeRelease(inputRun: RunState, release: BigThreePlayerReleaseInput): RunState {
  const run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced || run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return run;
  const sourceId = `player:${release.projectId}`;
  if (run.bigThree.slots.some((slot) => slot.sourceId === sourceId) || run.bigThree.candidates.some((slot) => slot.sourceId === sourceId)) return run;
  const craft = playerCraftFor(release.score, release.points);
  const craftFloor = Math.min(craft.story, craft.art, craft.sound);
  const momentum = playerMomentum(run, release.franchiseKey, release.reach);
  const metrics: BigThreeMetrics = { score: release.score, reach: release.reach, craftFloor, momentum, culturalScore: culturalScore(release.score, release.reach, craftFloor, momentum) };
  if (!bigThreeQualifies(metrics)) return run;
  const candidate: BigThreeSlot = {
    id: `big-three-candidate-${release.projectId}`, sourceId, title: release.draft.title,
    originalStudioId: "player", originalStudio: run.studio, currentOwnerId: "player", currentOwner: run.studio, currentOwnerType: "player", player: true,
    recognisedWeek: run.week, recognisedYear: yearOf(run.week), genres: [...release.draft.genres], animeType: release.draft.animeType,
    score: release.score, reach: release.reach, craftFloor, momentum, culturalScore: metrics.culturalScore, posterId: null,
    franchiseKey: release.franchiseKey, licensedIpId: release.draft.licensedIpId ?? null,
    draft: { ...release.draft, genres: [...release.draft.genres], arcs: [...release.draft.arcs], sliders: [...release.draft.sliders] as [number, number, number] },
    protag: release.draft.protag,
  };
  return { ...run, bigThree: { ...run.bigThree, candidates: [...run.bigThree.candidates, candidate].sort((a,b)=>b.culturalScore-a.culturalScore||b.score-a.score).slice(0,12) }, notices: [...run.notices, `🌠 CULTURAL PHENOMENON — “${candidate.title}” has entered Big Three speculation. A place can only be named after the current 48-week consensus window settles.`].slice(-40) };
}

function promotePlayerCandidate(run: RunState, candidate: BigThreeSlot): RunState {
  const slot: BigThreeSlot = { ...candidate, id: `big-three-slot-${run.bigThree.slots.length + 1}`, recognisedWeek: run.week, recognisedYear: yearOf(run.week) };
  let franchises = run.franchises;
  if (slot.franchiseKey) {
    const fr = franchises[slot.franchiseKey];
    if (fr) { const boosted = { ...fr, bigThree: true, popularity: Math.min(100, fr.popularity + 12) }; boosted.merchValue = merchValueOf(boosted); franchises = { ...franchises, [slot.franchiseKey]: boosted }; }
  }
  let ipMarket = run.ipMarket;
  if (slot.licensedIpId && ipMarket.owned[slot.licensedIpId]) ipMarket = { ...ipMarket, owned: { ...ipMarket.owned, [slot.licensedIpId]: { ...ipMarket.owned[slot.licensedIpId], bigThreePrestige: true } }, history: [...ipMarket.history, `Big Three cultural recognition: ${slot.title}. Renewal leverage improved.`].slice(-100) };
  const rivalWorld = { ...run.rivalWorld, studios: run.rivalWorld.studios.map((studio) => studio.status === "collapsed" ? studio : { ...studio, rivalry: Math.min(100, studio.rivalry + 8) }) };
  return { ...run, fans: run.fans + BIG_THREE_PLAYER_FAN_REWARD, rd: run.rd + BIG_THREE_PLAYER_RD_REWARD, franchises, ipMarket, rivalWorld,
    bigThree: { ...run.bigThree, slots: [...run.bigThree.slots, slot], candidates: [], pendingReveals: [...run.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }] },
    notices: [...run.notices, `🌠 FANDOM CONSENSUS — “${slot.title}” enters THE BIG THREE (+${BIG_THREE_PLAYER_FAN_REWARD.toLocaleString("en-GB")} fans, +${BIG_THREE_PLAYER_RD_REWARD} RD). BIG THREE HALO: direct franchise releases +40%, related spin-offs/crossovers +20%, merchandise demand +60%.`].slice(-40) };
}

function rivalMetrics''')
regex_replace('src/engine/bigThree.ts',
    r'export function advanceBigThreeWeek\(inputRun: RunState\): RunState \{.*?\n\}\n\nexport function pendingBigThreeReveal',
    '''export function advanceBigThreeWeek(inputRun: RunState): RunState {
  let run = syncBigThreeEra(inputRun);
  if (!run.bigThree.introduced) return run;
  if (run.bigThree.slots.length >= BIG_THREE_MAX_SLOTS) return refreshBigThreeOwnership({ ...run, bigThree: { ...run.bigThree, candidates: [], lastRivalScanWeek: run.week } });
  const latestRecognitionWeek = Math.max(BIG_THREE_START_WEEK, ...run.bigThree.slots.map((slot) => slot.recognisedWeek));
  if (run.week < latestRecognitionWeek + BIG_THREE_RIVAL_COOLDOWN_WEEKS) return refreshBigThreeOwnership(run);
  const lastScan = run.bigThree.lastRivalScanWeek;
  const rivalCandidates = run.rivalWorld.studios.flatMap((studio) => studio.releases.filter((release) => release.week > lastScan && release.week <= run.week && release.title !== BIG_THREE_SEED_TITLE).map((release) => ({ studio, release, metrics: rivalMetrics(studio, release) })).filter((candidate) => bigThreeQualifies(candidate.metrics))).sort((a,b)=>b.metrics.culturalScore-a.metrics.culturalScore||b.release.score-a.release.score);
  const playerCandidate = [...run.bigThree.candidates].filter((candidate)=>!run.bigThree.slots.some((slot)=>slot.sourceId===candidate.sourceId)).sort((a,b)=>b.culturalScore-a.culturalScore||b.score-a.score)[0];
  const rivalCandidate = rivalCandidates.find((candidate)=>!run.bigThree.slots.some((slot)=>slot.sourceId===`rival:${candidate.studio.id}:${candidate.release.week}:${candidate.release.title}`));
  run = { ...run, bigThree: { ...run.bigThree, lastRivalScanWeek: run.week } };
  if (!playerCandidate && !rivalCandidate) return refreshBigThreeOwnership(run);
  if (playerCandidate && (!rivalCandidate || playerCandidate.culturalScore >= rivalCandidate.metrics.culturalScore)) return refreshBigThreeOwnership(promotePlayerCandidate(run, playerCandidate));
  const candidate = rivalCandidate!;
  const slot = rivalSlot(run, candidate.studio, candidate.release, candidate.metrics);
  const rivalWorld = { ...run.rivalWorld, studios: run.rivalWorld.studios.map((studio) => studio.id === candidate.studio.id ? { ...studio, fans: studio.fans + 50_000, reputation: Math.min(100, studio.reputation + 8), momentum: Math.min(30, studio.momentum + 8) } : studio) };
  const remaining = BIG_THREE_MAX_SLOTS - run.bigThree.slots.length - 1;
  return refreshBigThreeOwnership({ ...run, rivalWorld, bigThree: { ...run.bigThree, slots: [...run.bigThree.slots, slot], candidates: [], pendingReveals: [...run.bigThree.pendingReveals, { id: `big-three-reveal-${slot.id}`, kind: "new_name", slotId: slot.id }] }, notices: [...run.notices, `🌠 FANDOM CONSENSUS — “${candidate.release.title}” (${candidate.studio.name}) enters THE BIG THREE. ${remaining} place${remaining === 1 ? "" : "s"} remain.`].slice(-40) });
}

export function pendingBigThreeReveal''')

replace('src/engine/state.ts', '/** Year-6+ fan-decided cultural canon. Exactly three slots can ever be filled. */', '/** Year-3+ fan-decided cultural canon. Exactly three slots can ever be filled. */')
replace('src/engine/rivalPosters.ts', '/** Dedicated Year-6 Big Three flagship art; never consumed by routine rival slates. */', '/** Dedicated Year-3 Big Three flagship art; never consumed by routine rival slates. */')

# Tests.
replace('src/engine/__tests__/big-three.test.ts', '  run.week = BIG_THREE_START_WEEK;\n  run = syncBigThreeEra(run);', '  run.week = BIG_THREE_START_WEEK + BIG_THREE_RIVAL_GRACE_WEEKS;\n  run = syncBigThreeEra(run);', 1)
replace('src/engine/__tests__/big-three.test.ts', '{ total: 36, revenue: 4_000_000, fans: 150_000, hallOfFame: true }', '{ total: 39, revenue: 4_000_000, fans: 200_000, hallOfFame: true }')
replace('src/engine/__tests__/big-three.test.ts', 'score: 35, revenue: 2_000_000, fans: 80_000', 'score: 38, revenue: 2_000_000, fans: 100_000')
replace('src/engine/__tests__/big-three.test.ts', '  fr.lastScore = 35;\n  fr.bestScore = 36;', '  fr.lastScore = 38;\n  fr.bestScore = 39;')
regex_replace('src/engine/__tests__/big-three.test.ts', r'function recognise\(run: ReturnType<typeof initialRun>, d: Draft, projectId = "p1"\) \{.*?\n\}', '''function recognise(run: ReturnType<typeof initialRun>, d: Draft, projectId = "p1") {
  return advanceBigThreeWeek(recognisePlayerBigThreeRelease(run, { projectId, draft: d, score: 39, points: { story: 520, art: 560, sound: 500 }, reach: 200_000, franchiseKey: d.title }));
}''')
replace('src/engine/__tests__/big-three.test.ts', 'describe("Year 6 Big Three endgame", () => {', 'describe("Year 3 Big Three cultural canon", () => {')
replace('src/engine/__tests__/big-three.test.ts', 'stays dormant before Year 6', 'stays dormant before Year 3')
replace('src/engine/__tests__/big-three.test.ts', 'seeds Sunnyrise exactly once at the start of Year 6 with a persistent reveal', 'seeds Sunnyrise exactly once at the start of Year 3 with a persistent reveal')
replace('src/engine/__tests__/big-three.test.ts', 'recognisedYear: 6', 'recognisedYear: 3')
replace('src/engine/__tests__/big-three.test.ts', 'expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(true);\n    expect(bigThreeQualifies({ score: 33, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);\n    expect(bigThreeQualifies({ score: 36, reach: 20_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);\n    expect(bigThreeQualifies({ score: 36, reach: 150_000, craftFloor: 20, momentum: 80, culturalScore: 400 })).toBe(false);', 'expect(bigThreeQualifies({ score: 38, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(true);\n    expect(bigThreeQualifies({ score: 37, reach: 150_000, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);\n    expect(bigThreeQualifies({ score: 38, reach: 149_999, craftFloor: 45, momentum: 80, culturalScore: 400 })).toBe(false);\n    expect(bigThreeQualifies({ score: 38, reach: 150_000, craftFloor: 35, momentum: 80, culturalScore: 400 })).toBe(false);')
replace('src/engine/__tests__/big-three.test.ts', 'score: 37, week,', 'score: 39, week,')
replace('src/engine/__tests__/big-three.test.ts', 'revenue: 4_000_000, fans: 150_000,', 'revenue: 4_000_000, fans: 200_000,')
replace('src/engine/__tests__/big-three.test.ts', 'Year-6 shock gets breathing room.', 'Year-3 shock gets breathing room.')
replace('src/engine/__tests__/big-three.test.ts', 'migrates a post-Year-6 old save neutrally', 'migrates a post-Year-3 old save neutrally')
replace('src/engine/__tests__/big-three.test.ts', 'bestScore: 36, discoveredArcs', 'bestScore: 39, discoveredArcs')

regex_replace('src/engine/__tests__/award-expectations.test.ts', r'  it\("uses exact retained player production points", \(\) => \{.*?\n  \}\);', '''  it("uses the same normalized craft scale for player and rival entries", () => {
    const run = initialRun("Test Studio", "steady");
    const player = nominee({ story: 32, art: 32, sound: 32, sourceId: "released-project" });
    const rival = nominee({ player: false, studioId: "rival", sourceId: "rival-row", story: 32, art: 32, sound: 32 });
    expect(awardDisciplineOutput(run, player, "writing", 6)).toBe(1200);
    expect(awardDisciplineOutput(run, rival, "writing", 6)).toBe(1200);
    expect(awardDisciplineOutput(run, player, "animation", 6)).toBe(1500);
    expect(awardDisciplineOutput(run, rival, "score", 6)).toBe(975);
  });''')
regex_replace('src/engine/__tests__/award-expectations.test.ts', r'  it\("requires the player to clear each discipline\'s own Year 6 raw floor", \(\) => \{.*?\n  \}\);', '''  it("applies the same Year 6 craft gate to player disciplines", () => {
    const seed = initialRun("Test Studio", "steady");
    const row = nominee({ sourceId: "year6-project", story: 31, art: 32, sound: 32 });
    const run = { ...seed, week: 283, day: 283 * 7, yearShows: [row] } as unknown as RunState;
    const frozen = freezeNominationsIfDue(run);
    const entry = frozen.yearShows.find((n) => n.nominationYear === 6 && n.player)!;
    expect(entry.nominationCategories).not.toContain("writing");
    expect(entry.nominationCategories).toContain("animation");
    expect(entry.nominationCategories).toContain("score");
  });''')

(ROOT / 'src/engine/__tests__/gameplay-pass-regressions.test.ts').write_text('''import { describe, expect, it } from "vitest";\nimport { createFranchise, franchiseBoost, merchValueOf } from "../franchise";\nimport { shapeRivalScore } from "../rivals";\nimport { PETS, PROTAGONISTS, SECONDARY, VILLAINS, type Draft } from "../data";\n\nconst draft = (licensedIpId?: string): Draft => ({ title: "Licensed Crown", medium: "tv", budget: "standard", scope: "standard", slot: "prime", animeType: "shonen", genres: ["fantasy", "mecha"], audience: "teens", protag: PROTAGONISTS[0].id, protagName: PROTAGONISTS[0].name, secondary: SECONDARY[0].id, pet: PETS[0].id, villain: VILLAINS[0].id, arcs: ["hook", "finale"], sliders: [50,50,50], season: 1, ...(licensedIpId ? { licensedIpId, licensedArcId: `${licensedIpId}_opening`, licensedCharacters: ["Hero"] } : {}) });\n\ndescribe("gameplay pass regressions", () => {\n  it("persists licensed provenance", () => { const d=draft("ip_test"); const fr=createFranchise(d.title,d,{protag:d.protag,protagName:d.protagName,secondary:d.secondary,secondaryName:"S",pet:d.pet,petName:"P",villain:d.villain,villainName:"V"},{total:32,revenue:1_000_000,fans:20_000,hallOfFame:true},10); expect(fr.licensedIpId).toBe("ip_test"); });\n  it("makes 39 a genuinely extreme rival score", () => { expect([shapeRivalScore(30),shapeRivalScore(35),shapeRivalScore(40),shapeRivalScore(45),shapeRivalScore(50),shapeRivalScore(55)]).toEqual([30,33,36,37,38,39]); });\n  it("applies the Big Three commercial halo", () => { const d=draft(); d.continuation="season"; d.franchiseKey=d.title; d.season=4; const fr=createFranchise(d.title,d,{protag:d.protag,protagName:d.protagName,secondary:d.secondary,secondaryName:"S",pet:d.pet,petName:"P",villain:d.villain,villainName:"V"},{total:39,revenue:5_000_000,fans:200_000,hallOfFame:true},10); fr.popularity=100; fr.fatigue=0; const normalRevenue=franchiseBoost(fr,d); const normalMerch=merchValueOf(fr); fr.bigThree=true; expect(franchiseBoost(fr,d)).toBeGreaterThan(normalRevenue*1.35); expect(merchValueOf(fr)).toBeGreaterThan(normalMerch*1.5); });\n});\n''')
