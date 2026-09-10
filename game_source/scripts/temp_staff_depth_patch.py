from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(rel): return (ROOT / rel).read_text(encoding='utf-8')
def write(rel, text): (ROOT / rel).write_text(text, encoding='utf-8')
def once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing anchor: {label}')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------- data.ts
p='src/engine/data.ts'; s=read(p)
s=once(s, '/** per-discipline skill 10..99 */', '/** raw per-discipline skill 10..999; staffPoint() applies mastery diminishing returns */', 'staff stat comment')
s=once(s, '  /** 1-3 personality trait ids (see TRAIT_DEFS) */\n  traits?: string[];', '  /** 2-4 personality trait ids for newly generated staff (old saves retain theirs) */\n  traits?: string[];', 'trait count comment')
s=once(s, '  /** favourite genre — matters for the Genre Fanatic trait & morale */\n  favGenre?: GenreId;\n  /** week this person signed with the studio */', '  /** favourite genre — matters for the Genre Fanatic trait & morale */\n  favGenre?: GenreId;\n  /** shipped productions by genre; used for personal novice → mastery performance */\n  genreExperience?: Partial<Record<GenreId, number>>;\n  /** week this person signed with the studio */', 'genreExperience field')
write(p,s)

# ------------------------------------------------------------- careers.ts
p='src/engine/careers.ts'; s=read(p)
s=once(s, 'export const SPEC_OUTPUT_BONUS = 0.25; // +25% on matching projects\nexport const SPEC_SPEED_BONUS = 0.1; // production-speed spec: +10% pace, always', 'export const SPEC_OUTPUT_BONUS = 0.35; // +35% on matching projects\nexport const SPEC_SPEED_BONUS = 0.15; // production-speed spec: +15% pace, always', 'spec strength')

traits='''export const TRAIT_DEFS: TraitDef[] = [
  { id: "perfectionist", name: "Perfectionist", desc: "+30% output · −25% personal pace", good: true },
  { id: "fast", name: "Fast Worker", desc: "+40% personal pace · −5% output", good: true },
  { id: "team", name: "Team Player", desc: "+0.12 team speed aura", good: true },
  { id: "genius", name: "Difficult Genius", desc: "+50% output · teammates −2 morale/wk", good: false },
  { id: "mentor", name: "Mentor", desc: "junior teammates +75% XP · mentor relationships form after 5 weeks", good: true },
  { id: "crunch", name: "Crunch Monster", desc: "condition output never below 92% while working", good: true },
  { id: "fragile", name: "Fragile Confidence", desc: "morale swings ×2", good: false },
  { id: "reliable", name: "Reliable", desc: "condition output never below 95%", good: true },
  { id: "fanatic", name: "Genre Fanatic", desc: "+65% output on favourite genre · +2 morale/wk on it, −2 off it", good: true },
  { id: "adapt", name: "Adaptation Expert", desc: "+35% output on licensed adaptations and season 2+", good: true },
  { id: "movie", name: "Movie Specialist", desc: "+40% output on movie projects", good: true },
  { id: "veteran", name: "Franchise Veteran", desc: "+25% output on franchise & season 2+ projects", good: true },
  { id: "researcher", name: "Research Hound", desc: "studio research duration −8% each · stacks to −24%", good: true },
  { id: "gossip", name: "Industry Gossip", desc: "releases they worked on gain +10% fans", good: true },
  { id: "publicist", name: "Fan Whisperer", desc: "releases they worked on gain +15% fans", good: true },
  { id: "organizer", name: "Production Organizer", desc: "+0.10 team speed aura", good: true },
  { id: "fixer", name: "Continuity Hawk", desc: "+30% output while a project carries editing notes", good: true },
  { id: "prodigy", name: "Fast Learner", desc: "+50% personal XP earned", good: true },
  { id: "ensemble", name: "Ensemble Brain", desc: "+15% output on teams of 3+", good: true },
  { id: "lonewolf", name: "Lone Wolf", desc: "+25% output on teams of 1–2 · −10% on teams of 4+", good: false },
  { id: "closer", name: "Finisher", desc: "+25% output during Sound, Post and Marketing stages", good: true },
  { id: "starter", name: "Concept Ace", desc: "+25% output during Concept and Pre-production", good: true },
  { id: "lorekeeper", name: "Lore Keeper", desc: "+30% output on licensed IP and franchise productions", good: true },
  { id: "networker", name: "Industry Networker", desc: "contracts they work on pay +15% each · team cap +45%", good: true },
];'''
s2,n=re.subn(r'export const TRAIT_DEFS: TraitDef\[\] = \[.*?\n\];\n\nexport const traitDef', traits+'\n\nexport const traitDef', s, count=1, flags=re.S)
if n!=1: raise SystemExit('Could not replace TRAIT_DEFS')
s=s2
s=once(s, '  const count = 1 + (seedA % 3); // 1..3', '  const count = 2 + (seedA % 3); // 2..4: candidates should feel meaningfully distinct', 'trait count')
s=once(s, '    favGenre: s.favGenre ?? GENRE_IDS[(h >> 5) % GENRE_IDS.length],\n    joinedWeek:', '    favGenre: s.favGenre ?? GENRE_IDS[(h >> 5) % GENRE_IDS.length],\n    genreExperience: s.genreExperience && typeof s.genreExperience === "object" ? { ...s.genreExperience } : {},\n    joinedWeek:', 'career genre experience migration')

anchor='/* ----------------------------------------------------- per-person output */'
insert='''/* ------------------------------------------------ personal genre craft */
/** Three real shipped productions takes an unfamiliar genre to neutral. */
export const GENRE_NEUTRAL_SHOWS = 3;

export const genreShows = (s: Staff, genre: GenreId): number =>
  Math.max(0, Math.floor(s.genreExperience?.[genre] ?? 0));

/** Professional specialisation/fandom supplies a starting familiarity floor,
 * while the stored counter always remains the number actually shipped. */
export function genreFamiliarity(s: Staff, genre: GenreId): number {
  let floor = 0;
  const d = specDef(s.spec);
  if (d?.genres?.includes(genre)) floor = Math.max(floor, 3);
  if (s.favGenre === genre) floor = Math.max(floor, 4);
  return Math.max(genreShows(s, genre), floor);
}

export function genreExperienceMultiplier(familiarity: number): number {
  const n = Math.max(0, Math.floor(familiarity));
  if (n === 0) return 0.60;
  if (n === 1) return 0.75;
  if (n === 2) return 0.90;
  if (n === 3) return 1.00;
  return Math.min(1.25, Math.round((1 + (n - 3) * 0.04) * 100) / 100);
}

export function genreExperienceLabel(familiarity: number): string {
  const n = Math.max(0, Math.floor(familiarity));
  if (n === 0) return "UNTESTED";
  if (n === 1) return "ROOKIE";
  if (n === 2) return "LEARNING";
  if (n === 3) return "NEUTRAL";
  if (n <= 5) return "COMFORTABLE";
  if (n <= 8) return "EXPERIENCED";
  return "EXPERT";
}

/** Average genre readiness across the production's one/two genres. */
export function staffGenreMultiplier(s: Staff, genres: GenreId[]): number {
  if (!genres.length) return 1;
  return genres.reduce((sum, g) => sum + genreExperienceMultiplier(genreFamiliarity(s, g)), 0) / genres.length;
}

/** Employed Research Hounds accelerate the studio's research desk. */
export function staffResearchDurationMult(staff: Staff[]): number {
  const n = staff.filter((s) => hasTrait(s, "researcher")).length;
  return Math.max(0.76, 1 - Math.min(3, n) * 0.08);
}

/** Project-specific audience personalities only count if they actually shipped it. */
export function staffReleaseFanMult(staff: Staff[]): number {
  const gossip = staff.filter((s) => hasTrait(s, "gossip")).length;
  const publicists = staff.filter((s) => hasTrait(s, "publicist")).length;
  return Math.min(1.55, 1 + gossip * 0.10 + publicists * 0.15);
}

/** Networkers improve freelance terms only when assigned to that contract. */
export function contractCrewPayMult(staff: Staff[]): number {
  const n = staff.filter((s) => hasTrait(s, "networker")).length;
  return 1 + Math.min(3, n) * 0.15;
}

'''
if anchor not in s: raise SystemExit('Missing per-person anchor')
s=s.replace(anchor,insert+anchor,1)

s=once(s, '  const weeks = bonds[bondKey(a.id, b.id)] ?? 0;\n  if (weeks < BOND_WEEKS) return null;', '  const weeks = bonds[bondKey(a.id, b.id)] ?? 0;\n  const threshold = hasTrait(a, "mentor") || hasTrait(b, "mentor") ? 5 : BOND_WEEKS;\n  if (weeks < threshold) return null;', 'mentor bond threshold')

old='''  if (hasTrait(s, "crunch")) cond = Math.max(0.85, cond);
  if (hasTrait(s, "reliable")) cond = Math.max(0.9, cond);

  let out = cond;
  let pace = cond;
  let aura = 0;
  let xpMult = 1;

  /* traits */
  if (hasTrait(s, "perfectionist")) {
    out *= 1.15;
    pace *= 0.8;
  }
  if (hasTrait(s, "fast")) pace *= 1.25;
  if (hasTrait(s, "team")) aura += 0.08;
  if (hasTrait(s, "genius")) out *= 1.3;
  if (hasTrait(s, "fanatic") && s.favGenre && p.draft.genres.includes(s.favGenre)) out *= 1.3;
  if (hasTrait(s, "adapt") && p.draft.season > 1) out *= 1.2;
  if (hasTrait(s, "movie") && p.draft.medium === "movie") out *= 1.25;
  if (hasTrait(s, "veteran") && (p.draft.franchiseKey || p.draft.season > 1)) out *= 1.15;
'''
new='''  if (hasTrait(s, "crunch")) cond = Math.max(0.92, cond);
  if (hasTrait(s, "reliable")) cond = Math.max(0.95, cond);

  let out = cond * staffGenreMultiplier(s, p.draft.genres);
  let pace = cond;
  let aura = 0;
  let xpMult = 1;

  /* traits — deliberately large enough that hiring personality matters */
  if (hasTrait(s, "perfectionist")) { out *= 1.30; pace *= 0.75; }
  if (hasTrait(s, "fast")) { pace *= 1.40; out *= 0.95; }
  if (hasTrait(s, "team")) aura += 0.12;
  if (hasTrait(s, "genius")) out *= 1.50;
  if (hasTrait(s, "fanatic") && s.favGenre && p.draft.genres.includes(s.favGenre)) out *= 1.65;
  if (hasTrait(s, "adapt") && (p.draft.season > 1 || !!p.draft.licensedIpId)) out *= 1.35;
  if (hasTrait(s, "movie") && p.draft.medium === "movie") out *= 1.40;
  if (hasTrait(s, "veteran") && (p.draft.franchiseKey || p.draft.season > 1)) out *= 1.25;
  if (hasTrait(s, "organizer")) aura += 0.10;
  if (hasTrait(s, "fixer") && p.issues > 0) out *= 1.30;
  if (hasTrait(s, "prodigy")) xpMult *= 1.50;
  if (hasTrait(s, "ensemble") && team.length >= 3) out *= 1.15;
  if (hasTrait(s, "lonewolf")) out *= team.length <= 2 ? 1.25 : team.length >= 4 ? 0.90 : 1;
  if (hasTrait(s, "closer") && ["sound", "post", "marketing"].includes(p.stage)) out *= 1.25;
  if (hasTrait(s, "starter") && ["concept", "preprod"].includes(p.stage)) out *= 1.25;
  if (hasTrait(s, "lorekeeper") && (!!p.draft.licensedIpId || !!p.draft.franchiseKey)) out *= 1.30;
'''
s=once(s,old,new,'person trait mechanics')
s=s.replace('xpMult *= 1.5;', 'xpMult *= 1.75;')

old='''export function recordShow(s: Staff, title: string, score: number, week: number): Staff {
  const shows = [...(s.shows ?? []), { title, score, week }].slice(-20);
  const best = s.bestShow && s.bestShow.score >= score ? s.bestShow : { title, score };
  return { ...s, shows, bestShow: best };
}'''
new='''export function recordShow(s: Staff, title: string, score: number, week: number, genres: GenreId[] = []): Staff {
  const shows = [...(s.shows ?? []), { title, score, week }].slice(-20);
  const best = s.bestShow && s.bestShow.score >= score ? s.bestShow : { title, score };
  const genreExperience = { ...(s.genreExperience ?? {}) };
  for (const genre of new Set(genres)) genreExperience[genre] = genreShows(s, genre) + 1;
  return { ...s, shows, bestShow: best, genreExperience };
}'''
s=once(s,old,new,'recordShow genre experience')
write(p,s)

# ----------------------------------------------------------- studioOps.ts
p='src/engine/studioOps.ts'; s=read(p)
old='''export function showrunnerContractSkill(showrunner: string, showsMade: number, type: PointType): number {
  const base = Math.min(90, 50 + showsMade * 2);
  const speciality =
    showrunner === "steady" && type === "art" ? 12
    : showrunner === "vision" && type === "story" ? 12
    : showrunner === "producer" ? 8
    : showrunner === "marketer" && type === "sound" ? 8
    : 0;
  return Math.min(99, base + speciality);
}'''
new='''export interface ShowrunnerCraftStats { story: number; art: number; sound: number; }
const SHOWRUNNER_BASE_CRAFT: Record<string, ShowrunnerCraftStats> = {
  steady: { story: 62, art: 88, sound: 58 },
  vision: { story: 90, art: 68, sound: 64 },
  producer: { story: 70, art: 68, sound: 66 },
  marketer: { story: 60, art: 64, sound: 82 },
  operations: { story: 72, art: 80, sound: 68 },
  franchise: { story: 82, art: 70, sound: 66 },
  mentor: { story: 76, art: 74, sound: 72 },
  research: { story: 84, art: 66, sound: 72 },
};

/** These are the actual craft numbers used whenever the founding showrunner
 * takes a contract/rush seat. They improve with the studio's shipped work. */
export function showrunnerStats(showrunner: string, showsMade: number): ShowrunnerCraftStats {
  const base = SHOWRUNNER_BASE_CRAFT[showrunner] ?? { story: 68, art: 68, sound: 68 };
  const growth = Math.min(110, Math.round(Math.max(0, showsMade) * 2.2));
  return {
    story: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.story + growth),
    art: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.art + growth),
    sound: Math.min(STAFF_EFFECTIVE_SKILL_CAP, base.sound + growth),
  };
}

export function showrunnerContractSkill(showrunner: string, showsMade: number, type: PointType): number {
  return showrunnerStats(showrunner, showsMade)[type];
}'''
s=once(s,old,new,'showrunner actual stats')
anchor='''export const studioKnowledgeEmphasis = (ideal: number, a: string, b: string): string =>
  ideal >= 50 ? a : b;
'''
newanchor=anchor+'''\n/** One mastery threshold is shared by the dossier and every direction meeting. */
export const GENRE_MASTERY_KNOWLEDGE = 9;
export function exactDirectionKnown(knowledge: number[], exactComboTests = 0): boolean {
  if (!knowledge.length) return false;
  return knowledge.every((n) => n >= GENRE_MASTERY_KNOWLEDGE) || exactComboTests >= 3;
}
'''
s=once(s,anchor,newanchor,'mastery helper')
write(p,s)

# --------------------------------------------------------------- state.ts
p='src/engine/state.ts'; s=read(p)
s=once(s, '  bondKey,\n  bondKind,\n  ensureCareer,', '  bondKey,\n  bondKind,\n  contractCrewPayMult,\n  ensureCareer,', 'career import contract helper')
s=once(s, '  recordShow,\n  rollHire,\n  studioPointMult,', '  recordShow,\n  rollHire,\n  staffReleaseFanMult,\n  staffResearchDurationMult,\n  studioPointMult,', 'career import fan research helpers')

s=once(s, '  const researchDecisionMult = decisionResearchSpeedMult(r);\n  const weeks = Math.max(0.25, baseResearchWeeks * researchDecisionMult);', '  const researchDecisionMult = decisionResearchSpeedMult(r);\n  const staffResearchMult = staffResearchDurationMult(r.staff);\n  const weeks = Math.max(0.25, baseResearchWeeks * researchDecisionMult * staffResearchMult);', 'research staff trait')

s=s.replace('if (team.some((x) => hasTrait(x, "genius"))) dm -= 1;', 'if (team.some((x) => hasTrait(x, "genius"))) dm -= 2;')
s=s.replace('dm += proj.draft.genres.includes(st.favGenre) ? 1 : -1;', 'dm += proj.draft.genres.includes(st.favGenre) ? 2 : -2;')

# weekly/headless contract completion
old='''        if (progress >= job.contract.target) {
          cash += job.contract.pay;
          rd += job.contract.rd;'''
new='''        if (progress >= job.contract.target) {
          const contractPay = Math.round(job.contract.pay * contractCrewPayMult(crew));
          cash += contractPay;
          rd += job.contract.rd;'''
s=once(s,old,new,'weekly contract pay')
s=once(s, 'notices.push(`✅ Contract delivered: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);', 'notices.push(`✅ Contract delivered: ${job.contract.name} (+£${contractPay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);', 'weekly contract notice')

# live pulse contract completion
old='''  for (const job of completed) {
    cash += job.contract.pay;
    rd += job.contract.rd;'''
new='''  for (const job of completed) {
    const contractCrew = staff.filter((st) => job.staffIds.includes(st.id));
    const contractPay = Math.round(job.contract.pay * contractCrewPayMult(contractCrew));
    cash += contractPay;
    rd += job.contract.rd;'''
s=once(s,old,new,'live contract pay')
s=once(s, 'notices.push(`🎉 CONTRACT DELIVERED: ${job.contract.name} (+£${job.contract.pay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);', 'notices.push(`🎉 CONTRACT DELIVERED: ${job.contract.name} (+£${contractPay.toLocaleString("en-GB")}, +${job.contract.rd} RD).`);', 'live contract notice')

# project fan personalities: same crew that actually shipped
anchor='''  const decisionFanMult = decisionReleaseFansMult(r, d);
  if (Math.abs(decisionFanMult - 1) > 0.001) {
    out = {
      ...out,
      fans: Math.round(out.fans * decisionFanMult),
      breakdown: [...out.breakdown, { label: "Decision-event audience effect", pts: `×${decisionFanMult.toFixed(2)} fans` }],
    };
  }
'''
newanchor=anchor+'''  const releaseCrew = r.staff.filter((s) => p.staffIds.includes(s.id));
  const staffFanMult = staffReleaseFanMult(releaseCrew);
  if (Math.abs(staffFanMult - 1) > 0.001) {
    out = {
      ...out,
      fans: Math.round(out.fans * staffFanMult),
      breakdown: [...out.breakdown, { label: "Crew audience skills", pts: `×${staffFanMult.toFixed(2)} fans` }],
    };
  }
'''
s=once(s,anchor,newanchor,'release fan skills')
s=s.replace('story: Math.min(99, s.story + gain),', 'story: Math.min(STAFF_STAT_CAP, s.story + gain),')
s=s.replace('art: Math.min(99, s.art + gain),', 'art: Math.min(STAFF_STAT_CAP, s.art + gain),')
s=s.replace('sound: Math.min(99, s.sound + gain),', 'sound: Math.min(STAFF_STAT_CAP, s.sound + gain),')
s=once(s, 'nx = recordShow(nx, draft.title, result.total, r.week);', 'nx = recordShow(nx, draft.title, result.total, r.week, draft.genres);', 'record release genres')
write(p,s)

# ------------------------------------------------------------ Produce.tsx
p='src/components/Produce.tsx'; s=read(p)
s=once(s, 'import { rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport, studioKnowledgeEmphasis } from "../engine/studioOps";', 'import { exactDirectionKnown, rushBoostPoint, rushOutcomeRange, rushResearchCost, rushTeamSupport, showrunnerStats, studioKnowledgeEmphasis } from "../engine/studioOps";\nimport { personMod, staffGenreMultiplier } from "../engine/careers";', 'Produce imports')
s=once(s, '  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const team =', '  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerStats = showrunnerStats(run.showrunner, run.showsMade);\n  const team =', 'runner stats variable')
s=s.replace('{ name: runner.name, skill: Math.min(99, 48 + run.showsMade * 2) },', '{ name: runner.name, skill: runnerStats[phase!.type] },')
s=once(s, '              const exactComboLearned = genres.length === 2 && testedSeries >= 3;', '              const exactKnown = exactDirectionKnown(known, genres.length === 2 ? testedSeries : 0);', 'exact mastery gating')
s=s.replace('{exactComboLearned ? (', '{exactKnown ? (')
s=once(s, '<div>EXACT COMBO TARGET · <span className="text-neon2">{phase!.a} {exactTarget}%</span> · {phase!.b} {100 - exactTarget}%</div>', '<div>EXACT SCORING TARGET · <span className="text-neon2">{phase!.a} {exactTarget}%</span> · {phase!.b} {100 - exactTarget}%</div>\n                      <button type="button" onClick={() => setSlider(exactTarget)} className="btn-press rounded-md border border-mint/50 bg-mint/10 px-2 py-1 text-[9px] font-extrabold text-mint">SET SLIDER TO {exactTarget}%</button>', 'exact slider button')
s=once(s, '<div className="text-[9px] text-cyanx">Verified from {testedSeries} separate test-audience series using this exact combo.</div>', '<div className="text-[9px] text-cyanx">100% exact: this is the same target used by final scoring. {testedSeries >= 3 ? `Verified from ${testedSeries} exact-combo audience studies.` : "Unlocked because every selected genre is MASTERED."}</div>', 'exact tooltip proof')
s=once(s, '''                  ) : (
                    <div className="mt-0.5 text-[10px] font-bold text-mint">
                      Studio estimate: <span className="text-neon2">{phase!.a}</span> around {Math.round(exactTarget / 5) * 5}% · {phase!.b} around {100 - Math.round(exactTarget / 5) * 5}%
                    </div>
                  )}''', '''                  ) : (
                    <div className="mt-0.5 text-[10px] font-bold text-mint">
                      High-confidence estimate: <span className="text-neon2">{phase!.a}</span> around {Math.round(exactTarget / 5) * 5}% · {phase!.b} around {100 - Math.round(exactTarget / 5) * 5}% · reach MASTERED for the exact scoring target.
                    </div>
                  )}''', 'high knowledge approximate')
old='''              const skill = Math.round(staffPoint(st, phase!.type) * (0.72 + st.stamina / 360));
              const range = rushOutcomeRange(skill);
              const support = rushTeamSupport(team.filter((x) => x.id !== st.id).map((x) => staffPoint(x, phase!.type)));
              const img = WORKER_LOOKS[workerLookIndex(st)]?.sprite;
              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider }, img)} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><img src={img} alt="" className="h-12 w-10 shrink-0 object-contain drop-shadow-lg"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · energy {Math.round(st.stamina)}% · team support +{support}</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] font-bold text-paper/50">RANGE {range.min + support}–{range.max + support}</div></div></button>;'''
new='''              const mod = personMod(st, project, team, { bonds: run.bonds });
              const skill = Math.round(staffPoint(st, phase!.type) * mod.out);
              const range = rushOutcomeRange(skill);
              const support = rushTeamSupport(team.filter((x) => x.id !== st.id).map((x) => Math.round(staffPoint(x, phase!.type) * personMod(x, project, team, { bonds: run.bonds }).out)));
              const genreMult = staffGenreMultiplier(st, project.draft.genres);
              const img = WORKER_LOOKS[workerLookIndex(st)]?.sprite;
              return <button key={st.id} onClick={() => choose({ leadId: st.id, leadName: st.name, skill, type: phase!.type, cost: 0, slider }, img)} className="btn-press ink-card flex w-full items-center gap-3 p-3 text-left hover:border-cyanx/60"><img src={img} alt="" className="h-12 w-10 shrink-0 object-contain drop-shadow-lg"/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{st.name}</div><div className="text-[10px] text-paper/50">{POINT_LABEL[phase!.type]} {staffPoint(st, phase!.type)} · genre readiness ×{genreMult.toFixed(2)} · team support +{support}</div></div><div className="text-right"><div className="font-display text-lg font-extrabold" style={{color:POINT_COLOR[phase!.type]}}>SKILL {skill}</div><div className="text-[9px] font-bold text-paper/50">RANGE {range.min + support}–{range.max + support}</div></div></button>;'''
s=once(s,old,new,'rush staff depth')
s=once(s, '<button onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: Math.min(99, 44 + run.showsMade * 3), type: phase!.type, cost: 0, slider }, runner.sprite)}', '<button onClick={() => choose({ leadId: "showrunner", leadName: runner.name, skill: runnerStats[phase!.type], type: phase!.type, cost: 0, slider }, runner.sprite)}', 'rush showrunner skill')
s=once(s, '<div className="text-[10px] text-paper/50">Free · improves with studio experience</div></div></button>', '<div className="text-[10px] text-paper/50">Actual {POINT_LABEL[phase!.type]} skill {runnerStats[phase!.type]} · Story {runnerStats.story} · Art {runnerStats.art} · Sound {runnerStats.sound}</div></div></button>', 'rush showrunner display')
write(p,s)

# --------------------------------------------------- KnowledgeDossier.tsx
p='src/components/KnowledgeDossier.tsx'; s=read(p)
s=once(s, 'import type { RunState } from "../engine/state";', 'import type { RunState } from "../engine/state";\nimport { GENRE_MASTERY_KNOWLEDGE } from "../engine/studioOps";', 'dossier mastery import')
old='''          k < 3 ? "Audience direction preferences are still fuzzy." :
          k < 6 ? `The studio has a working read on this genre. More releases narrow the slider targets.` :
          `Plot ${g.ideal[0]}% · Sakuga ${g.ideal[1]}% · Music ${g.ideal[2]}%`'''
new='''          k < 3 ? "Audience direction preferences are still fuzzy." :
          k < GENRE_MASTERY_KNOWLEDGE ? `High-confidence read only. More releases/research narrow the slider targets; exact numbers unlock at MASTERED (${GENRE_MASTERY_KNOWLEDGE}).` :
          `MASTERED · exact scoring targets: Plot ${g.ideal[0]}% · Sakuga ${g.ideal[1]}% · Music ${g.ideal[2]}%`'''
s=once(s,old,new,'dossier exact mastery')
write(p,s)

# ---------------------------------------------------------------- Crew.tsx
p='src/components/Crew.tsx'; s=read(p)
s=once(s, '  GENRES,\n  POINT_COLOR,', '  GENRES,\n  SHOWRUNNERS,\n  POINT_COLOR,', 'Crew SHOWRUNNERS import')
s=once(s, '  intensiveRdCost,\n  levelProgress,', '  genreExperienceLabel,\n  genreExperienceMultiplier,\n  genreFamiliarity,\n  genreShows,\n  intensiveRdCost,\n  levelProgress,', 'Crew genre helper imports')
s=once(s, 'import { signStaffContract } from "../engine/spending";', 'import { signStaffContract } from "../engine/spending";\nimport { showrunnerStats } from "../engine/studioOps";', 'Crew showrunner stats import')

candidate_component=r'''function CandidateSheet({ candidate, canHire, onHire, onClose }: { candidate: Staff | null; canHire: boolean; onHire: (s: Staff) => void; onClose: () => void }) {
  if (!candidate) return null;
  const spec = specDef(candidate.spec);
  const rows = GENRES.map((g) => {
    const familiarity = genreFamiliarity(candidate, g.id);
    const shipped = genreShows(candidate, g.id);
    const mult = genreExperienceMultiplier(familiarity);
    const preferred = candidate.favGenre === g.id ? "FAVOURITE" : spec?.genres?.includes(g.id) ? "SPECIALISM" : "";
    return { g, familiarity, shipped, mult, preferred };
  }).sort((a, b) => b.mult - a.mult || a.g.label.localeCompare(b.g.label));
  return (
    <div className="fixed inset-0 z-[97] flex items-end justify-center bg-abyss/80 p-3 backdrop-blur-md sm:items-center" onClick={onClose}>
      <div className="nice-scroll anim-pop max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyanx/40 bg-panel p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-3">
          <Portrait img={workerLook(candidate).portrait} name={candidate.name} alt={candidate.name} className="h-20 w-20 shrink-0 rounded-xl border border-line object-cover" />
          <div className="min-w-0 flex-1">
            <div className="text-[9px] font-extrabold tracking-[0.25em] text-cyanx">CANDIDATE DOSSIER</div>
            <div className="font-display text-xl font-extrabold">{candidate.name}</div>
            <div className="text-[10px] text-paper/55">{ROLE_LABEL[candidate.role]} · Lv{candidate.level} {levelTitle(candidate.level)}</div>
            <div className="mt-1 text-[10px] text-gold">Sign {formatGBP(candidate.cost)} · {formatGBP(candidate.salary)}/wk</div>
          </div>
          <button onClick={onClose} className="btn-press p-1 text-paper/40"><X size={17}/></button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {(["story","art","sound"] as PointType[]).map((t) => <div key={t} className="rounded-lg border border-line bg-panel2/70 p-2 text-center"><div className="text-[8px] font-bold text-paper/45">{t.toUpperCase()}</div><div className="font-display text-xl font-extrabold" style={{color:POINT_COLOR[t]}}>{candidate[t]}</div></div>)}
        </div>
        <div className="mt-3 rounded-xl border border-line bg-panel2/60 p-3">
          <div className="text-[9px] font-extrabold tracking-widest text-viol">MECHANICAL QUALITIES</div>
          {spec && <div className="mt-1 text-[10px]"><b className="text-viol">★ {spec.name}:</b> <span className="text-paper/65">{specLabel(spec)}</span></div>}
          {(candidate.traits ?? []).map((id) => { const t=traitDef(id); if(!t) return null; return <div key={id} className="mt-1 text-[10px]"><b className={t.good?"text-mint":"text-neon2"}>{t.name}:</b> <span className="text-paper/65">{t.desc}{id==="fanatic" && candidate.favGenre ? ` · favourite: ${GENRES.find((g)=>g.id===candidate.favGenre)?.label ?? candidate.favGenre}` : ""}</span></div>; })}
        </div>
        <div className="mt-3">
          <div className="text-[9px] font-extrabold tracking-widest text-paper/45">GENRE READINESS · PERSONAL OUTPUT MODIFIER</div>
          <div className="mt-1 grid gap-1.5 sm:grid-cols-2">
            {rows.map(({g,familiarity,shipped,mult,preferred}) => <div key={g.id} className="flex items-center rounded-lg border border-line bg-panel2/50 px-2 py-1.5 text-[9px]"><span className="font-bold">{g.label}</span>{preferred && <span className="ml-1 text-[7px] font-extrabold text-viol">{preferred}</span>}<span className={cn("ml-auto font-extrabold",mult<1?"text-neon":mult>1?"text-mint":"text-paper/70")}>{genreExperienceLabel(familiarity)} ×{mult.toFixed(2)}</span><span className="ml-1 text-paper/30">· {shipped} shipped</span></div>)}
          </div>
          <div className="mt-1.5 text-[9px] text-paper/45">Unfamiliar non-preferred genres start at ×0.60. Three shipped productions reaches neutral ×1.00. Specialisms/favourites provide a starting familiarity floor.</div>
        </div>
        <Btn big variant="cyan" className="mt-4 w-full" disabled={!canHire} onClick={() => onHire(candidate)}>{canHire ? `HIRE · ${formatGBP(candidate.cost)}` : "CANNOT HIRE"}</Btn>
      </div>
    </div>
  );
}

'''
anchor='/* ---------------------------------------------------------- staff card */'
if anchor not in s: raise SystemExit('Crew staff card anchor missing')
s=s.replace(anchor,candidate_component+anchor,1)
s=once(s, '  const [sheet, setSheet] = useState<AbilityInfo | null>(null);\n  const [intense,', '  const [sheet, setSheet] = useState<AbilityInfo | null>(null);\n  const [candidate, setCandidate] = useState<Staff | null>(null);\n  const [intense,', 'Crew candidate state')
s=once(s, '  const headSlots: HeadSlot[] = ["writer", "animator", "composer", "production"];\n  const anyHeadUnlocked', '  const runner = SHOWRUNNERS.find((s) => s.id === run.showrunner) ?? SHOWRUNNERS[0];\n  const runnerCraft = showrunnerStats(run.showrunner, run.showsMade);\n  const headSlots: HeadSlot[] = ["writer", "animator", "composer", "production"];\n  const anyHeadUnlocked', 'Crew runner values')

showrunner_card=r'''      <div className="ink-card border-gold/45 p-3">
        <div className="flex items-center gap-3">
          <Portrait img={runner.portrait} name={runner.name} alt={runner.name} className="h-14 w-14 rounded-xl border border-gold/40 object-cover" />
          <div className="min-w-0 flex-1"><div className="text-[8px] font-extrabold tracking-[0.25em] text-gold">FOUNDING SHOWRUNNER · ACTUAL CURRENT STATS</div><div className="font-display text-base font-extrabold">{runner.name}</div><div className="text-[9px] text-paper/50">{runner.title}</div></div>
          <div className="grid grid-cols-3 gap-1 text-center">{(["story","art","sound"] as PointType[]).map((t)=><div key={t} className="rounded-md bg-panel2 px-1.5 py-1"><div className="text-[7px] text-paper/35">{t.toUpperCase()}</div><div className="font-display text-sm font-extrabold" style={{color:POINT_COLOR[t]}}>{runnerCraft[t]}</div></div>)}</div>
        </div>
        <div className="mt-2 text-[10px] leading-relaxed text-paper/60"><b className="text-gold">PERK:</b> {runner.perk}</div>
        <div className="mt-1 text-[8px] text-paper/35">These Story/Art/Sound values are the exact numbers used when the showrunner personally leads a rush or contract seat, and improve as the studio ships work.</div>
      </div>

'''
anchor='''      {/* ---------------------------------------------- department heads */}'''
if anchor not in s: raise SystemExit('Crew department anchor missing')
s=s.replace(anchor,showrunner_card+anchor,1)

# clickable candidate cards; nested actions stop propagation
s=once(s, '<div key={c.id} className="ink-card p-2.5">\n                  <div className="flex items-center gap-2">', '<div key={c.id} role="button" tabIndex={0} onClick={() => setCandidate(c)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setCandidate(c); }} className="ink-card cursor-pointer p-2.5 hover:border-cyanx/50">\n                  <div className="flex items-center gap-2">', 'candidate card click')
s=once(s, 'onClick={() => hire(c)}\n                      disabled=', 'onClick={(e) => { e.stopPropagation(); hire(c); }}\n                      disabled=', 'candidate hire stop propagation')
s=s.replace('onClick={() => { sfx.click(); setSheet(specAbility(c)); }}', 'onClick={(e) => { e.stopPropagation(); sfx.click(); setSheet(specAbility(c)); }}')
s=s.replace('onClick={() => { sfx.click(); const hit = traitAbilities(c).find((a) => a.title === t.name); if (hit) setSheet(hit); }}', 'onClick={(e) => { e.stopPropagation(); sfx.click(); const hit = traitAbilities(c).find((a) => a.title === t.name); if (hit) setSheet(hit); }}')
s=once(s, '                  <div className="mt-1.5 flex flex-wrap gap-1">', '                  <div className="mt-1 text-[8px] font-extrabold tracking-wider text-cyanx">TAP CARD FOR FULL STATS, GENRE READINESS & EXACT MECHANICS</div>\n                  <div className="mt-1.5 flex flex-wrap gap-1">', 'candidate tap hint')
s=once(s, '      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n      {intense &&', '      <AbilitySheet info={sheet} onClose={() => setSheet(null)} />\n      <CandidateSheet candidate={candidate} canHire={!!candidate && run.cash >= candidate.cost && run.staff.length < maxStaff} onHire={(c) => { hire(c); setCandidate(null); }} onClose={() => setCandidate(null)} />\n      {intense &&', 'candidate modal render')
write(p,s)

# ---------------------------------------------------------------- Title.tsx
p='src/components/Title.tsx'; s=read(p)
# place import adjacent to existing engine imports, use a generic insertion
if 'showrunnerStats' not in s:
    first_import_end=s.find('\n', s.find('from "../engine/data";'))
    if first_import_end < 0: raise SystemExit('Title data import anchor missing')
    s=s[:first_import_end+1]+'import { showrunnerStats } from "../engine/studioOps";\n'+s[first_import_end+1:]
s=once(s, '<div className="mt-1 text-[11px] leading-snug text-paper/60">{s.perk}</div>', '<div className="mt-1 text-[11px] leading-snug text-paper/60">{s.perk}</div>\n                          <div className="mt-1 text-[9px] font-extrabold text-gold">STORY {showrunnerStats(s.id, 0).story} · ART {showrunnerStats(s.id, 0).art} · SOUND {showrunnerStats(s.id, 0).sound}</div>', 'Title showrunner stats')
write(p,s)

# --------------------------------------------------------------- tests
p='src/engine/__tests__/staff-depth.test.ts'
write(p,'''import { describe, expect, it } from "vitest";
import { GENRES, type Staff } from "../data";
import {
  TRAIT_DEFS,
  contractCrewPayMult,
  ensureCareer,
  genreExperienceMultiplier,
  genreFamiliarity,
  recordShow,
  staffGenreMultiplier,
  staffReleaseFanMult,
  staffResearchDurationMult,
} from "../careers";
import { exactDirectionKnown, GENRE_MASTERY_KNOWLEDGE, showrunnerContractSkill, showrunnerStats } from "../studioOps";

const base = (traits: string[] = []): Staff => ensureCareer({ id: `depth-${traits.join("-")}`, name: "Depth", role: "writer", story: 60, art: 40, sound: 35, level: 1, salary: 500, cost: 1000, stamina: 100, portrait: 0, traits, spec: "w_comedy", favGenre: "comedy", genreExperience: {} }, 0);

describe("staff depth", () => {
  it("makes a non-preferred genre bad at first and neutral after three shipped works", () => {
    let s = base();
    expect(staffGenreMultiplier(s, ["mecha"])).toBe(0.60);
    s = recordShow(s, "One", 20, 1, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(0.75);
    s = recordShow(s, "Two", 20, 2, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(0.90);
    s = recordShow(s, "Three", 20, 3, ["mecha"]); expect(staffGenreMultiplier(s,["mecha"])).toBe(1.00);
  });
  it("treats specialisms/favourites as genuine starting familiarity", () => {
    const s=base(["fanatic"]);
    expect(genreFamiliarity(s,"comedy")).toBeGreaterThanOrEqual(4);
    expect(genreExperienceMultiplier(genreFamiliarity(s,"comedy"))).toBeGreaterThan(1);
    expect(staffGenreMultiplier(s,["mecha"])).toBeLessThan(1);
  });
  it("ships a much broader mechanical trait catalogue", () => {
    expect(TRAIT_DEFS.length).toBeGreaterThanOrEqual(24);
    for (const id of ["researcher","gossip","publicist","organizer","networker","lorekeeper"]) expect(TRAIT_DEFS.some((t)=>t.id===id)).toBe(true);
  });
  it("routes research, audience and contract personalities into real multipliers", () => {
    expect(staffResearchDurationMult([base(["researcher"])] )).toBe(0.92);
    expect(staffReleaseFanMult([base(["gossip"]),base(["publicist"])] )).toBeCloseTo(1.25);
    expect(contractCrewPayMult([base(["networker"]),base(["networker"])] )).toBeCloseTo(1.30);
  });
  it("uses one exact mastery rule for slider advice", () => {
    expect(GENRE_MASTERY_KNOWLEDGE).toBe(9);
    expect(exactDirectionKnown([8])).toBe(false);
    expect(exactDirectionKnown([9])).toBe(true);
    expect(exactDirectionKnown([4,4],3)).toBe(true);
    expect(exactDirectionKnown([9,9],0)).toBe(true);
  });
  it("showrunner displayed stats are their actual contract/rush craft stats", () => {
    for (const id of ["steady","vision","producer","marketer","operations","franchise","mentor","research"]) {
      const stats=showrunnerStats(id,12);
      expect(showrunnerContractSkill(id,12,"story")).toBe(stats.story);
      expect(showrunnerContractSkill(id,12,"art")).toBe(stats.art);
      expect(showrunnerContractSkill(id,12,"sound")).toBe(stats.sound);
    }
  });
  it("the live genre catalogue still exists for candidate readiness UI",()=>expect(GENRES.length).toBeGreaterThanOrEqual(21));
});
''')

# docs
write('docs/STAFF_DEPTH_AND_MASTERY.md','''# Staff Depth & Mastery\n\n- Recruitment cards open a full pre-hire dossier with raw stats, salary/signing cost, specialisation, every trait's exact mechanics, favourite genre and per-genre readiness.\n- Non-preferred unfamiliar genres begin at ×0.60 personal output, progress through ×0.75 and ×0.90, and reach neutral ×1.00 after three shipped productions. Continued experience rises gradually to ×1.25.\n- Role specialisations and favourite genres provide a familiarity floor; Genre Fanatic is a major +65% favourite-genre specialist.\n- The trait pool is expanded to 24 mechanical personalities, including Research Hound, Industry Gossip, Fan Whisperer, Production Organizer, Continuity Hawk, Fast Learner, Industry Networker and more.\n- Research Hounds accelerate research, Gossip/Fan Whisperer staff increase fans on projects they shipped, and Networkers improve assigned contract pay.\n- The founding showrunner now exposes actual Story/Art/Sound craft stats, and those exact values drive rush/contract contributions.\n- Direction guidance uses one mastery threshold (knowledge 9). MASTERED genres or three exact-combo audience studies reveal the exact same integer slider target used by scoring and offer a one-tap SET SLIDER button.\n- Existing saves are additive: missing genreExperience ledgers initialise empty, while specialisation/favourite familiarity still prevents established specialists being treated as total novices in their own field.\n''')
print('staff depth patch applied')
