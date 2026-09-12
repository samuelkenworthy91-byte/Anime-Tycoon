import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'); const write=(p,s)=>fs.writeFileSync(p,s);
function once(s,a,b,label){if(!s.includes(a)) throw new Error(`missing ${label}`); return s.replace(a,b);}
function all(s,a,b,label){if(!s.includes(a)) throw new Error(`missing ${label}`); return s.split(a).join(b);}

// Showrunner roster: 4 new mechanical archetypes, temporarily reusing existing art until the dedicated art brief lands.
{
 const p='src/engine/data.ts'; let s=read(p);
 s=once(s,
'export const BOSS_LOOK: WorkerLook = {\n  sprite: "img/sprite-worker-6.png",\n  portrait: "img/portrait-worker-6.png",\n};',
'export const BOSS_LOOK: WorkerLook = {\n  sprite: "img/sprite-worker-6.png",\n  portrait: "img/portrait-worker-6.png",\n};\n/** Reserved model numbers for the four new worker paintings. They are deliberately\n * not activated in WORKER_LOOKS until their sprite+portrait files exist. */\nexport const PENDING_WORKER_ART_IDS = [28, 29, 30, 31] as const;', 'worker art reservation');
 s=once(s,
'  id: "steady" | "vision" | "producer" | "marketer" | "operations" | "franchise" | "mentor" | "research";',
'  id: "steady" | "vision" | "producer" | "marketer" | "operations" | "franchise" | "mentor" | "research" | "casting" | "festival" | "dealmaker" | "genre";','showrunner id union');
 s=once(s,'  perk: string;\n}','  perk: string;\n  /** true only while this archetype is borrowing an existing portrait/sprite */\n  artPending?: boolean;\n}','showrunner art pending');
 s=once(s,
'  { id: "research", name: "Ravi Shah", title: "The R&D Lead", img: "img/portrait-showrunner-research.png", sprite: "img/sprite-showrunner-research.png", portrait: "img/portrait-showrunner-research.png", perk: "Rapid Prototyping — research projects take 25% less time. Research data costs are unchanged." },\n];',
'  { id: "research", name: "Ravi Shah", title: "The R&D Lead", img: "img/portrait-showrunner-research.png", sprite: "img/sprite-showrunner-research.png", portrait: "img/portrait-showrunner-research.png", perk: "Rapid Prototyping — research projects take 25% less time. Research data costs are unchanged." },\n  { id: "casting", name: "Keiko Arata", title: "The Casting Director", img: "img/portrait-showrunner-mentor.png", sprite: "img/sprite-showrunner-mentor.png", portrait: "img/portrait-showrunner-mentor.png", perk: "Ensemble Eye — casting contribution +25% and mismatched casting penalties are substantially softened.", artPending: true },\n  { id: "festival", name: "Mateo Voss", title: "The Festival Strategist", img: "img/portrait-showrunner-marketer.png", sprite: "img/sprite-showrunner-marketer.png", portrait: "img/portrait-showrunner-marketer.png", perk: "For Your Consideration — player award entries receive +8% craft strength and +10% judged audience reach.", artPending: true },\n  { id: "dealmaker", name: "Dalia Haddad", title: "The Rights Broker", img: "img/portrait-showrunner-producer.png", sprite: "img/sprite-showrunner-producer.png", portrait: "img/portrait-showrunner-producer.png", perk: "Deal Heat — completed-show buyers pay 15% more and bidders push harder when you auction a studio-owned IP.", artPending: true },\n  { id: "genre", name: "Minseo Park", title: "The Genre Savant", img: "img/portrait-showrunner-research.png", sprite: "img/sprite-showrunner-research.png", portrait: "img/portrait-showrunner-research.png", perk: "Pattern Breaker — good genre pairings hit 30% harder while bad pairings are softened by 30%.", artPending: true },\n];','new showrunner entries');
 write(p,s);
}

// Studio ops accepts either old numeric shipped-show progression (tests/title preview) or the new saved career.
{
 const p='src/engine/studioOps.ts'; let s=read(p);
 s=once(s,'import { STAFF_EFFECTIVE_SKILL_CAP, staffPoint, type Contract, type PointType, type Staff } from "./data";','import { STAFF_EFFECTIVE_SKILL_CAP, staffPoint, type Contract, type PointType, type Staff } from "./data";\nimport { SHOWRUNNER_BASE_CRAFT, type ShowrunnerCareer } from "./showrunnerCareer";','studioOps career import');
 const start='export interface ShowrunnerCraftStats { story: number; art: number; sound: number; }\nconst SHOWRUNNER_BASE_CRAFT: Record<string, ShowrunnerCraftStats> = {';
 const idx=s.indexOf(start); if(idx<0) throw new Error('missing old showrunner stats block');
 const endNeedle='export function showrunnerContractSkill(showrunner: string, showsMade: number, type: PointType): number {\n  return showrunnerStats(showrunner, showsMade)[type];\n}\n';
 const end=s.indexOf(endNeedle,idx); if(end<0) throw new Error('missing old showrunner skill end');
 const replacement=`export interface ShowrunnerCraftStats { story: number; art: number; sound: number; }\n\n/** Runtime uses the saved visible career. Numeric input remains supported for\n * title-screen previews and old unit tests, preserving the legacy +2.2/show curve. */\nexport function showrunnerStats(showrunner: string, careerOrShows: number | ShowrunnerCareer): ShowrunnerCraftStats {\n  if (typeof careerOrShows !== "number") return { story: careerOrShows.story, art: careerOrShows.art, sound: careerOrShows.sound };\n  const base = SHOWRUNNER_BASE_CRAFT[showrunner] ?? { story: 68, art: 68, sound: 68 };\n  const growth = Math.min(110, Math.round(Math.max(0, careerOrShows) * 2.2));\n  return {\n    story: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.story + growth),\n    art: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.art + growth),\n    sound: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.sound + growth),\n  };\n}\n\nexport function showrunnerContractSkill(showrunner: string, careerOrShows: number | ShowrunnerCareer, type: PointType): number {\n  return showrunnerStats(showrunner, careerOrShows)[type];\n}\n`;
 s=s.slice(0,idx)+replacement+s.slice(end+endNeedle.length);
 write(p,s);
}

// RunState + migration + release XP.
{
 const p='src/engine/state.ts'; let s=read(p);
 s=once(s,'} from "./studioOps";\nimport { rollStudioEvent, type StudioEvent } from "./events";',
'} from "./studioOps";\nimport { gainShowrunnerXp, initialShowrunnerCareer, migrateShowrunnerCareer, showrunnerDefaultName, SHOWRUNNER_RELEASE_XP, type ShowrunnerCareer } from "./showrunnerCareer";\nimport { rollStudioEvent, type StudioEvent } from "./events";','state showrunner imports');
 s=once(s,'  showrunner: string;\n  cash: number;','  showrunner: string;\n  /** editable display name; archetype id above remains stable for perks/saves */\n  showrunnerName: string;\n  /** visible long-term founding-director career */\n  showrunnerCareer: ShowrunnerCareer;\n  cash: number;','RunState showrunner fields');
 s=once(s,'    studio,\n    showrunner,\n    cash: START_CASH,','    studio,\n    showrunner,\n    showrunnerName: showrunnerDefaultName(showrunner),\n    showrunnerCareer: initialShowrunnerCareer(showrunner),\n    cash: START_CASH,','initial showrunner career');
 s=once(s,'    castGenreV2: 2,\n    genresUnlocked: unlocked,','    castGenreV2: 2,\n    showrunnerName: typeof (r as { showrunnerName?: unknown }).showrunnerName === "string" && (r as { showrunnerName: string }).showrunnerName.trim() ? (r as { showrunnerName: string }).showrunnerName.slice(0, 48) : showrunnerDefaultName(r.showrunner),\n    showrunnerCareer: migrateShowrunnerCareer(r.showrunner, (r as { showrunnerCareer?: unknown }).showrunnerCareer, r.showsMade ?? 0),\n    genresUnlocked: unlocked,','migrate showrunner career');
 s=all(s,'showrunnerContractSkill(r.showrunner, r.showsMade, type)','showrunnerContractSkill(r.showrunner, r.showrunnerCareer, type)','runtime showrunner skill');
 s=once(s,'  const run: RunState = {\n    ...r,\n    cash: r.cash - extra.spent + bonusCash,',
'  const runnerCareerGain = gainShowrunnerXp(r.showrunner, r.showrunnerCareer, SHOWRUNNER_RELEASE_XP(result.total, result.tier === "hit" || result.hallOfFame));\n  if (runnerCareerGain.levelsGained > 0) notices.push(`${r.showrunnerName || showrunnerDefaultName(r.showrunner)} reaches Showrunner Lv${runnerCareerGain.career.level}!`);\n\n  const run: RunState = {\n    ...r,\n    showrunnerCareer: runnerCareerGain.career,\n    cash: r.cash - extra.spent + bonusCash,','release showrunner XP');
 write(p,s);
}

// Live UI callsites use the saved career and editable name.
{
 const p='src/components/Produce.tsx'; let s=read(p);
 s=once(s,'  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerStats = showrunnerStats(run.showrunner, run.showsMade);','  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerName = run.showrunnerName?.trim() || runner.name;\n  const runnerStats = showrunnerStats(run.showrunner, run.showrunnerCareer);','produce runner career');
 s=all(s,'runner.name','runnerName','produce editable showrunner name');
 // Restore object field accesses accidentally changed by global replacement in declaration if any.
 s=s.replace('run.showrunnerName?.trim() || runnerName','run.showrunnerName?.trim() || runner.name');
 write(p,s);
}
{
 const p='src/components/ContractJob.tsx'; let s=read(p);
 s=once(s,'  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerBusy = run.contractJobs.some((j) => j.showrunner);\n  const runnerSkill = showrunnerContractSkill(run.showrunner, run.showsMade, contract.type);','  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerName = run.showrunnerName?.trim() || runner.name;\n  const runnerBusy = run.contractJobs.some((j) => j.showrunner);\n  const runnerSkill = showrunnerContractSkill(run.showrunner, run.showrunnerCareer, contract.type);','contract runner career');
 s=all(s,'{runner.name}','{runnerName}','contract editable name');
 write(p,s);
}
{
 const p='src/components/Crew.tsx'; let s=read(p);
 s=once(s,'import { showrunnerStats } from "../engine/studioOps";','import { showrunnerStats } from "../engine/studioOps";\nimport { SHOWRUNNER_XP_LEVELS, showrunnerLevelTitle } from "../engine/showrunnerCareer";','crew career imports');
 s=once(s,'  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerCraft = showrunnerStats(run.showrunner, run.showsMade);','  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerName = run.showrunnerName?.trim() || runner.name;\n  const runnerCraft = showrunnerStats(run.showrunner, run.showrunnerCareer);','crew runner career');
 const old='<Portrait img={runner.portrait} name={runner.name} alt={runner.name} className="h-14 w-14 rounded-xl border border-gold/40 object-cover" />\n          <div className="min-w-0 flex-1"><div className="text-[8px] font-extrabold tracking-[0.25em] text-gold">FOUNDING SHOWRUNNER · ACTUAL CURRENT STATS</div><div className="font-display text-base font-extrabold">{runner.name}</div><div className="text-[9px] text-paper/50">{runner.title}</div></div>';
 const neu='<Portrait img={runner.portrait} name={runnerName} alt={runnerName} className="h-14 w-14 rounded-xl border border-gold/40 object-cover" />\n          <div className="min-w-0 flex-1"><div className="text-[8px] font-extrabold tracking-[0.25em] text-gold">FOUNDING SHOWRUNNER · ACTUAL CURRENT STATS</div><input aria-label="Showrunner name" value={run.showrunnerName} maxLength={48} onChange={(e)=>setRun((r)=>({...r,showrunnerName:e.target.value.slice(0,48)}))} className="ink-input mt-1 w-full px-2 py-1 font-display text-sm font-extrabold"/><div className="mt-1 text-[9px] text-paper/50">{runner.title} · Lv{run.showrunnerCareer.level} {showrunnerLevelTitle(run.showrunnerCareer.level)} · {run.showrunnerCareer.level >= 100 ? "MAX" : `${run.showrunnerCareer.xp}/${SHOWRUNNER_XP_LEVELS[run.showrunnerCareer.level]} XP`}{runner.artPending ? " · NEW ART PENDING" : ""}</div></div>';
 s=once(s,old,neu,'crew showrunner card');
 s=once(s,'These Story/Art/Sound values are the exact numbers used when the showrunner personally leads a rush or contract seat, and improve as the studio ships work.','These Story/Art/Sound values are the exact numbers used when the showrunner personally leads a rush or contract seat. Releases now earn visible Showrunner XP and trigger a full level-up reveal.','crew showrunner help');
 write(p,s);
}
{
 const p='src/components/Office.tsx'; let s=read(p);
 s=once(s,'boss={{ id: "showrunner", name: runner.name.split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0', 'boss={{ id: "showrunner", name: (run.showrunnerName || runner.name).split(" ")[0], color: "#ffd166", sprite: runner.sprite, working: projActive.length > 0','office editable showrunner name');
 write(p,s);
}

// App pauses for and renders the showrunner reveal before ordinary staff reveals.
{
 const p='src/App.tsx'; let s=read(p);
 s=once(s,'import StaffLevelUpModal from "./components/StaffLevelUpModal";','import StaffLevelUpModal from "./components/StaffLevelUpModal";\nimport ShowrunnerLevelUpModal from "./components/ShowrunnerLevelUpModal";','App showrunner modal import');
 s=once(s,'  const pendingLevelUp = !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);\n  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);','  const pendingShowrunnerLevelUp = (run?.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0;\n  const pendingLevelUp = pendingShowrunnerLevelUp || !!run?.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0);\n  useEffect(() => { if (pendingLevelUp) setTimeSpeed(0); }, [pendingLevelUp]);','App pause levelups');
 s=once(s,'        {run && run.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0) && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <StaffLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}','        {run && (run.showrunnerCareer?.pendingLevelUps?.length ?? 0) > 0 && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <ShowrunnerLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}\n        {run && !(run.showrunnerCareer?.pendingLevelUps?.length ?? 0) && run.staff.some((s) => (s.pendingLevelUps?.length ?? 0) > 0) && screen !== "title" && screen !== "gameover" && screen !== "retrospective" && <StaffLevelUpModal run={run} setRun={(fn) => setRun((r) => (r ? fn(r) : r))} />}','App render showrunner modal');
 write(p,s);
}

// New showrunner archetype mechanics.
{
 const p='src/engine/scoring.ts'; let s=read(p);
 s=once(s,'  const casting = castParts.reduce((sum, part) => sum + part.totalQuality, 0);','  const castingBase = castParts.reduce((sum, part) => sum + part.totalQuality, 0);\n  const casting = castingBase * (showrunner === "casting" ? 1.25 : 1);','casting showrunner bonus');
 s=once(s,'  const castFitMult = clamp(1 - zeroAffinityRoles * 0.075 - wrongTypeRoles * 0.035, 0.62, 1.02);','  const castFitMult = clamp(1 - zeroAffinityRoles * (showrunner === "casting" ? 0.045 : 0.075) - wrongTypeRoles * (showrunner === "casting" ? 0.02 : 0.035), 0.62, 1.02);','casting penalty soften');
 s=once(s,'  const comboFactor =\n    1 + (actualComboMult - 1) * COMBO_QUALITY_WEIGHT\n    + (comboLevelBonus(comboLevel) - 1) * COMBO_QUALITY_WEIGHT;','  const comboFactorBase =\n    1 + (actualComboMult - 1) * COMBO_QUALITY_WEIGHT\n    + (comboLevelBonus(comboLevel) - 1) * COMBO_QUALITY_WEIGHT;\n  const comboFactor = showrunner === "genre"\n    ? 1 + (comboFactorBase - 1) * (comboFactorBase >= 1 ? 1.3 : 0.7)\n    : comboFactorBase;','genre showrunner combo effect');
 write(p,s);
}

// Tests: roster grows to 12, old numeric preview remains valid, visible career migrates and levels.
{
 const p='src/engine/__tests__/showrunner-expansion.test.ts'; let s=read(p);
 s=s.replace('exposes eight unique playable identities with valid paired artwork and save IDs','exposes twelve unique playable identities with valid temporary or final artwork and stable save IDs');
 s=s.replace('expect(SHOWRUNNERS.map(s => s.id)).toEqual(["steady", "vision", "producer", "marketer", "operations", "franchise", "mentor", "research"]);','expect(SHOWRUNNERS.map(s => s.id)).toEqual(["steady", "vision", "producer", "marketer", "operations", "franchise", "mentor", "research", "casting", "festival", "dealmaker", "genre"]);');
 s=s.replace('expect(SHOWRUNNERS).toHaveLength(8);','expect(SHOWRUNNERS).toHaveLength(12);');
 write(p,s);
}
{
 const p='src/engine/__tests__/staff-depth.test.ts'; let s=read(p);
 s=s.replace('["steady","vision","producer","marketer","operations","franchise","mentor","research"]','["steady","vision","producer","marketer","operations","franchise","mentor","research","casting","festival","dealmaker","genre"]');
 write(p,s);
}

console.log('Stage 3 showrunner career + roster mechanics applied');
