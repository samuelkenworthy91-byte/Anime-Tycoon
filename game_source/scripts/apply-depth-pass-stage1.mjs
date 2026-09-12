import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function once(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`missing ${label}`);
  return text.replace(from, to);
}
function regexOnce(text, re, to, label) {
  if (!re.test(text)) throw new Error(`missing regex ${label}`);
  return text.replace(re, to);
}

// ---------------------------------------------------------------- Edit Bay confirmation + larger naming boxes.
{
  const p = 'src/components/Produce.tsx';
  let s = read(p);
  s = once(s,
    '  const [finalNames, setFinalNames] = useState(() => ({\n',
    '  const [confirmDirtyLock, setConfirmDirtyLock] = useState(false);\n  const [finalNames, setFinalNames] = useState(() => ({\n',
    'edit confirmation state');
  s = once(s,
    '["title", "SHOW TITLE", 32], ["protagName", "LEAD", 18], ["secondaryName", "SUPPORT", 18],\n                ["petName", "MASCOT", 18], ["villainName", "VILLAIN", 18],',
    '["title", "SHOW TITLE", 64], ["protagName", "LEAD", 48], ["secondaryName", "SUPPORT", 48],\n                ["petName", "MASCOT", 48], ["villainName", "VILLAIN", 48],',
    'billing limits');
  const oldButton = `            <Btn big variant={remaining === 0 ? "primary" : "gold"} className="flex-1" onClick={() => {\n              sfx.whoosh();\n              onDone({ points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0,\n                rename: {\n                  title: finalNames.title.trim() || project.draft.title,\n                  protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,\n                  secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,\n                  petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),\n                  villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,\n                } });\n            }}>{remaining === 0 ? "LOCK CLEAN MASTER" : \`LOCK WITH \${remaining} NOTE\${remaining === 1 ? "" : "S"}\`}</Btn>`;
  const newButton = `            <Btn big variant={remaining === 0 ? "primary" : "gold"} className="flex-1" onClick={() => {\n              if (remaining > 0) { sfx.click(); setConfirmDirtyLock(true); return; }\n              sfx.whoosh();\n              onDone({ points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0,\n                rename: {\n                  title: finalNames.title.trim() || project.draft.title,\n                  protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,\n                  secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name,\n                  petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),\n                  villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,\n                } });\n            }}>{remaining === 0 ? "LOCK CLEAN MASTER" : \`LOCK WITH \${remaining} NOTE\${remaining === 1 ? "" : "S"}\`}</Btn>`;
  s = once(s, oldButton, newButton, 'dirty lock button');
  s = once(s,
    '          </div>\n        </div>\n      </div>\n    );\n  }\n\n  const Icon = phase!.icon;',
    `          </div>\n        </div>\n        {confirmDirtyLock && remaining > 0 && (\n          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-abyss/80 p-4 backdrop-blur-sm" onClick={() => setConfirmDirtyLock(false)}>\n            <div className="anim-pop w-full max-w-md rounded-2xl border border-gold/55 bg-panel p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>\n              <div className="text-[10px] font-extrabold tracking-[0.3em] text-gold">UNRESOLVED EDITOR NOTES</div>\n              <h3 className="mt-1 font-display text-2xl font-extrabold">ARE YOU SURE?</h3>\n              <p className="mt-2 text-sm leading-relaxed text-paper/65">This master still has <b className="text-gold">{remaining} editor note{remaining === 1 ? "" : "s"}</b>. Locking now makes those problems permanent and they will reduce the final review quality.</p>\n              <p className="mt-2 text-xs text-paper/45">You can cancel and keep the calendar running to let the edit team clear them.</p>\n              <div className="mt-4 flex gap-2">\n                <Btn variant="ghost" className="flex-1" onClick={() => setConfirmDirtyLock(false)}>KEEP EDITING</Btn>\n                <Btn variant="gold" className="flex-1" onClick={() => {\n                  sfx.whoosh(); setConfirmDirtyLock(false);\n                  onDone({ points: { story: 0, art: 0, sound: 0 }, issues: 0, spent: 0, rdGained: 0, squashed: 0, rename: {\n                    title: finalNames.title.trim() || project.draft.title, protagName: finalNames.protagName.trim() || castById(project.draft.protag).name,\n                    secondaryName: finalNames.secondaryName.trim() || castById(project.draft.secondary).name, petName: finalNames.petName.trim() || (project.draft.pet === "none" ? "" : castById(project.draft.pet).name),\n                    villainName: finalNames.villainName.trim() || castById(project.draft.villain).name,\n                  } });\n                }}>LOCK ANYWAY</Btn>\n              </div>\n            </div>\n          </div>\n        )}\n      </div>\n    );\n  }\n\n  const Icon = phase!.icon;`,
    'dirty lock modal');
  write(p, s);
}

{
  const p = 'src/components/Create.tsx';
  let s = read(p);
  s = once(s, 'onChange={(e) => set({ title: e.target.value.slice(0, 32) })}', 'onChange={(e) => set({ title: e.target.value.slice(0, 64) })}', 'create title limit');
  write(p, s);
}
{
  const p = 'src/components/Crew.tsx';
  let s = read(p);
  s = s.replaceAll('hireName.trim().slice(0, 40)', 'hireName.trim().slice(0, 48)');
  s = s.replaceAll('e.target.value.slice(0,40)', 'e.target.value.slice(0,48)');
  write(p, s);
}

// ---------------------------------------------------------------- Canonical licensed-IP poster anywhere the normal player Poster is used.
{
  const p = 'src/components/Poster.tsx';
  let s = read(p);
  s = once(s, 'import { cn } from "../utils/cn";\n', 'import { cn } from "../utils/cn";\nimport { ipById } from "../engine/ip";\n', 'poster IP import');
  s = once(s,
    'export default function Poster(props: PosterProps) {\n  const design = useMemo(',
    `export default function Poster(props: PosterProps) {\n  const licensedPoster = props.variant !== "mini" && props.draft?.licensedIpId ? ipById(props.draft.licensedIpId)?.posterAsset ?? null : null;\n  const design = useMemo(`,
    'poster licensed resolve');
  s = once(s,
    '  if (props.variant === "mini") return <PosterMini design={design} hof={props.hof!} className={props.className} />;\n  return <PosterFull {...props} design={design} />;',
    `  if (props.variant === "mini") return <PosterMini design={design} hof={props.hof!} className={props.className} />;\n  if (licensedPoster) return (\n    <div className={cn("anim-pop ink-card overflow-hidden", props.className)}>\n      <div className="relative aspect-[4/5] overflow-hidden bg-abyss">\n        <img src={licensedPoster} alt={props.draft?.title ?? "Licensed IP poster"} className="absolute inset-0 h-full w-full object-cover" />\n        {props.stamp && <div className="absolute left-1/2 top-6 z-10 -translate-x-1/2 -rotate-6 rounded-xl border-4 bg-ink/80 px-3 py-1.5 text-center font-display text-xl font-extrabold tracking-widest" style={{ borderColor: props.stamp.color, color: props.stamp.color }}>{props.stamp.label}</div>}\n      </div>\n    </div>\n  );\n  return <PosterFull {...props} design={design} />;`,
    'poster licensed render');
  write(p, s);
}

// ---------------------------------------------------------------- Research: more structures + two actual positive arc fits per genre.
{
  const p = 'src/engine/data.ts';
  let s = read(p);
  const old = `/** Creative research can reveal a starter library without forcing blind releases. */\nexport const ARC_RESEARCH_COMBOS = ["rivalry", "suspense", "deep", "earned_victory", "heart"] as const;\nexport const ARC_RESEARCH_GENRE_KEYS = [\n  arcGenreKey("hook", "martial"),\n  arcGenreKey("lore", "fantasy"),\n  arcGenreKey("montage", "martial"),\n  arcGenreKey("tournament", "sports"),\n  arcGenreKey("festival", "romance"),\n  arcGenreKey("case", "mystery"),\n  arcGenreKey("narr_slowburn", "slice"),\n  arcGenreKey("narr_rivalintro", "sports"),\n  arcGenreKey("narr_politics", "mystery"),\n  arcGenreKey("narr_quiet", "slice"),\n] as const;`;
  const neu = `/** Creative research now gives enough actionable intelligence to justify its cost. */\nexport const ARC_RESEARCH_COMBOS = [\n  "rivalry", "suspense", "deep", "earned_victory", "heart", "spectacle",\n  "music", "road", "rival_payoff", "mentor_legacy", "mystery_reveal", "survival_rescue",\n] as const;\n\n/** Pick exactly two genuinely positive, non-secret story beats for every active genre.\n *  Sorting is stable and favours the strongest synergy, then broadly useful arcs. */\nexport const ARC_RESEARCH_GENRE_KEYS: string[] = GENRES.flatMap((genre) =>\n  ARCS\n    .filter((arc) => arc.syn?.includes(genre.id) && !arc.franchiseOnly && arc.unlock?.kind !== "studioArc")\n    .sort((a, b) => ((b.synQ ?? 0) + (b.synF ?? 0) * 100) - ((a.synQ ?? 0) + (a.synF ?? 0) * 100) || b.q - a.q || a.id.localeCompare(b.id))\n    .slice(0, 2)\n    .map((arc) => arcGenreKey(arc.id, genre.id))\n);\n\n/** Genre Studies also pays for any ordinary RD blueprint among its 60 recommendations.\n *  It never bypasses franchise, achievement, genre, or licensed-IP secret locks. */\nexport const ARC_RESEARCH_UNLOCK_IDS: string[] = [...new Set(ARC_RESEARCH_GENRE_KEYS.map((key) => key.slice(0, key.lastIndexOf("|"))))]\n  .filter((id) => ARCS.find((arc) => arc.id === id)?.unlock?.kind === "rd");`;
  s = once(s, old, neu, 'research constants');
  write(p, s);
}

// ---------------------------------------------------------------- Staff specialisations, ability pool, fair genre selection, wilder Potential.
{
  const p = 'src/engine/careers.ts';
  let s = read(p);
  s = regexOnce(s,
    /export const SPEC_DEFS: SpecDef\[] = \[([\s\S]*?)\n\];\n\nexport const specDef/,
    (_m, body) => `const LEGACY_SPEC_DEFS: SpecDef[] = [${body}\n];\n\n/** Every role can now roll an equally-likely purple specialisation in every active genre. */\nconst GENRE_SPEC_DEFS: SpecDef[] = GENRES.flatMap((genre) => ([\n  { id: \`g_writer_\${genre.id}\`, role: "writer" as const, name: \`\${genre.label} Writing\`, genres: [genre.id] },\n  { id: \`g_animator_\${genre.id}\`, role: "animator" as const, name: \`\${genre.label} Animation\`, genres: [genre.id] },\n  { id: \`g_composer_\${genre.id}\`, role: "composer" as const, name: \`\${genre.label} Scoring\`, genres: [genre.id] },\n]));\nexport const SPEC_DEFS: SpecDef[] = [...LEGACY_SPEC_DEFS, ...GENRE_SPEC_DEFS];\n\nexport const specDef`,
    'specialisation expansion');

  const traitAnchor = `  { id: "networker", name: "Industry Networker", desc: "contracts they work on pay +15% each · team cap +45%", good: true },\n];`;
  const traitExpansion = `  { id: "networker", name: "Industry Networker", desc: "contracts they work on pay +15% each · team cap +45%", good: true },\n  { id: "blockbuster", name: "Big Budget Operator", desc: "+25% output on Blockbuster-budget productions", good: true },\n  { id: "indie", name: "Indie Alchemist", desc: "+25% output on Indie-budget productions", good: true },\n  { id: "broadcast", name: "Broadcast Veteran", desc: "+20% output on TV productions", good: true },\n  { id: "digital", name: "Digital Native", desc: "+20% output on Fan Web and ONA productions", good: true },\n  { id: "dualgenre", name: "Genre Blender", desc: "+20% output on two-genre productions", good: true },\n  { id: "singlefocus", name: "Purist", desc: "+20% output on single-genre productions", good: true },\n  { id: "originalist", name: "Original Voice", desc: "+20% output on brand-new original IP · −10% on continuations", good: false },\n  { id: "nightowl", name: "Midnight Auteur", desc: "+25% output in the Midnight broadcast slot", good: true },\n  { id: "primetime", name: "Prime-Time Instinct", desc: "+20% output in the Prime-Time slot", good: true },\n  { id: "family", name: "Four-Quadrant Touch", desc: "+20% output for Family audiences", good: true },\n  { id: "adult", name: "Mature Storyteller", desc: "+20% output for Adult audiences", good: true },\n  { id: "prestigecraft", name: "Prestige Obsessive", desc: "+25% output on Prestige-scope productions · −8% pace", good: true },\n  { id: "shortform", name: "Short-Form Specialist", desc: "+20% output on Short-scope productions", good: true },\n  { id: "comeback", name: "Comeback Artist", desc: "+25% output on reboots and prequels", good: true },\n];`;
  s = once(s, traitAnchor, traitExpansion, 'trait expansion');

  const oldMods = `  if (hasTrait(s, "networker"))`;
  // Networker is intentionally handled by contractCrewPayMult, so insert project traits before specialisation.
  const insertPoint = `\n  /* specialisation */\n  const d = specDef(s.spec);`;
  const projectTraits = `\n  if (hasTrait(s, "blockbuster") && p.draft.budget === "blockbuster") out *= 1.25;\n  if (hasTrait(s, "indie") && p.draft.budget === "indie") out *= 1.25;\n  if (hasTrait(s, "broadcast") && p.draft.medium === "tv") out *= 1.20;\n  if (hasTrait(s, "digital") && (p.draft.medium === "fanweb" || p.draft.medium === "ona")) out *= 1.20;\n  if (hasTrait(s, "dualgenre") && p.draft.genres.length === 2) out *= 1.20;\n  if (hasTrait(s, "singlefocus") && p.draft.genres.length === 1) out *= 1.20;\n  if (hasTrait(s, "originalist")) out *= p.draft.franchiseKey || p.draft.licensedIpId ? 0.90 : 1.20;\n  if (hasTrait(s, "nightowl") && p.draft.slot === "midnight") out *= 1.25;\n  if (hasTrait(s, "primetime") && p.draft.slot === "prime") out *= 1.20;\n  if (hasTrait(s, "family") && p.draft.audience === "family") out *= 1.20;\n  if (hasTrait(s, "adult") && p.draft.audience === "adults") out *= 1.20;\n  if (hasTrait(s, "prestigecraft") && (p.draft.scope ?? "standard") === "prestige") { out *= 1.25; pace *= 0.92; }\n  if (hasTrait(s, "shortform") && (p.draft.scope ?? "standard") === "short") out *= 1.20;\n  if (hasTrait(s, "comeback") && (p.draft.continuation === "reboot" || p.draft.continuation === "prequel")) out *= 1.25;\n\n  /* specialisation */\n  const d = specDef(s.spec);`;
  s = once(s, insertPoint, projectTraits, 'trait mechanics');

  s = regexOnce(s,
    /export function growthForLevel\(s: Staff, newLevel: number\): \{ story: number; art: number; sound: number \} \{[\s\S]*?\n\}\n\nconst GENRE_IDS = GENRES\.map\(\(g\) => g\.id\);/,
    `export function growthForLevel(s: Staff, newLevel: number): { story: number; art: number; sound: number } {\n  const potential = potentialOf(s);\n  const rng = levelRng(s.id, newLevel);\n  let lo = 0, hi = 2;\n  if (potential > 20 && potential <= 45) [lo, hi] = [1, 5];\n  else if (potential > 45 && potential <= 70) [lo, hi] = [3, 9];\n  else if (potential > 70 && potential <= 90) [lo, hi] = [6, 14];\n  else if (potential > 90) [lo, hi] = [10, 20];\n  let total = lo + Math.floor(rng() * (hi - lo + 1));\n  // Rare breakthrough levels make elite prospects visibly special without reload-reroll exploits.\n  if (potential >= 91 && rng() < 0.18) total += 4 + Math.floor(rng() * 7);\n  else if (potential >= 71 && rng() < 0.10) total += 2 + Math.floor(rng() * 5);\n  const gains = { story: 0, art: 0, sound: 0 };\n  const main = ROLE_POINT[s.role];\n  const types: PointType[] = ["story", "art", "sound"];\n  for (let i = 0; i < total; i++) {\n    const r = rng();\n    const chosen = r < 0.58 ? main : types.filter((t) => t !== main)[Math.floor(rng() * 2)];\n    gains[chosen] += 1;\n  }\n  return gains;\n}\n\nconst GENRE_IDS = GENRES.map((g) => g.id);\nexport function uniformGenreForSeed(seed: number): GenreId {\n  const n = ((Math.trunc(seed) % GENRE_IDS.length) + GENRE_IDS.length) % GENRE_IDS.length;\n  return GENRE_IDS[n];\n}\nexport const genreSpecialisationId = (role: StaffRole, genre: GenreId) => \`g_\${role}_\${genre}\`;`,
    'potential growth');

  s = once(s,
    `  const h = idHash(s.id);\n  const roleSpecs = SPEC_DEFS.filter((d) => d.role === s.role);`,
    `  const h = idHash(s.id);\n  const favGenre = s.favGenre ?? uniformGenreForSeed(idHash(s.id + "|fav-genre"));\n  const specGenre = uniformGenreForSeed(idHash(s.id + "|spec-genre"));`,
    'career fair genre seeds');
  s = once(s,
    `    traits: s.traits ?? pickTraits(h, h >> 3),\n    spec: s.spec ?? roleSpecs[h % roleSpecs.length].id,\n    favGenre: s.favGenre ?? GENRE_IDS[(h >> 5) % GENRE_IDS.length],`,
    `    traits: s.traits ?? pickTraits(h, h >> 3),\n    spec: s.spec ?? genreSpecialisationId(s.role, specGenre),\n    favGenre,`,
    'career fair genre assignment');
  write(p, s);
}

// ---------------------------------------------------------------- Research completion and old-save backfill.
{
  const p = 'src/engine/state.ts';
  let s = read(p);
  s = once(s, '  ARC_RESEARCH_GENRE_KEYS,\n', '  ARC_RESEARCH_GENRE_KEYS,\n  ARC_RESEARCH_UNLOCK_IDS,\n', 'research unlock import');
  // Carrier gains arcUnlocked, completion writes it.
  s = s.replace('  arcCombos: string[];\n  arcKnowledge: Record<string, number>;', '  arcCombos: string[];\n  arcUnlocked: string[];\n  arcKnowledge: Record<string, number>;');
  s = s.replace('  let arcCombos = carrier.arcCombos;\n  let arcKnowledge = carrier.arcKnowledge;', '  let arcCombos = carrier.arcCombos;\n  let arcUnlocked = carrier.arcUnlocked;\n  let arcKnowledge = carrier.arcKnowledge;');
  s = s.replace('  if (researchId === "genre_studies") {\n    arcGenreKnowledge = { ...carrier.arcGenreKnowledge };\n    for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);\n    notices.push("📚 Genre Studies reveals a starter set of arc-to-genre relationships.");\n  }',
    '  if (researchId === "genre_studies") {\n    arcGenreKnowledge = { ...carrier.arcGenreKnowledge };\n    for (const key of ARC_RESEARCH_GENRE_KEYS) arcGenreKnowledge[key] = Math.max(1, arcGenreKnowledge[key] ?? 0);\n    arcUnlocked = [...new Set([...carrier.arcUnlocked, ...ARC_RESEARCH_UNLOCK_IDS])];\n    notices.push(`📚 Genre Studies reveals two proven story beats for every genre (${ARC_RESEARCH_GENRE_KEYS.length} relationships).`);\n  }');
  s = s.replace('return { ...carrier, research, arcCombos, arcKnowledge, arcGenreKnowledge, castAffinityDiscovered, notices };', 'return { ...carrier, research, arcCombos, arcUnlocked, arcKnowledge, arcGenreKnowledge, castAffinityDiscovered, notices };');

  // Migration: completed research receives the expanded benefits immediately.
  s = once(s,
    '  const wasV2 = r.castGenreV2 === 2;\n  return {',
    `  const wasV2 = r.castGenreV2 === 2;\n  const hasNarrativeResearch = (r.research ?? []).includes("narrative_analytics");\n  const hasGenreResearch = (r.research ?? []).includes("genre_studies");\n  const migratedResearchArcCombos = [...new Set([...(Array.isArray(r.arcCombos) ? r.arcCombos : []), ...(hasNarrativeResearch ? ARC_RESEARCH_COMBOS : [])])];\n  const migratedResearchArcUnlocked = [...new Set([...(Array.isArray(r.arcUnlocked) ? r.arcUnlocked : []), ...(hasGenreResearch ? ARC_RESEARCH_UNLOCK_IDS : [])])];\n  const migratedResearchArcKnowledge = { ...(r.arcKnowledge && typeof r.arcKnowledge === "object" ? r.arcKnowledge : {}) };\n  if (hasNarrativeResearch) for (const id of ARC_RESEARCH_COMBOS) { const combo = ARC_COMBOS.find((c) => c.id === id); for (const arcId of combo?.arcs ?? []) migratedResearchArcKnowledge[arcId] = Math.max(1, migratedResearchArcKnowledge[arcId] ?? 0); }\n  const migratedResearchArcGenreKnowledge = migrateArcGenreKnowledge(r.arcGenreKnowledge);\n  if (hasGenreResearch) for (const key of ARC_RESEARCH_GENRE_KEYS) migratedResearchArcGenreKnowledge[key] = Math.max(1, migratedResearchArcGenreKnowledge[key] ?? 0);\n  return {`,
    'research migration vars');
  s = once(s,
    '    arcCombos: Array.isArray(r.arcCombos) ? r.arcCombos : [],\n    arcUnlocked: Array.isArray(r.arcUnlocked) ? r.arcUnlocked : [],\n    arcKnowledge: r.arcKnowledge && typeof r.arcKnowledge === "object" ? r.arcKnowledge : {},\n    arcGenreKnowledge: migrateArcGenreKnowledge(r.arcGenreKnowledge),',
    '    arcCombos: migratedResearchArcCombos,\n    arcUnlocked: migratedResearchArcUnlocked,\n    arcKnowledge: migratedResearchArcKnowledge,\n    arcGenreKnowledge: migratedResearchArcGenreKnowledge,',
    'research migration fields');
  write(p, s);
}

// ---------------------------------------------------------------- Regression tests for this tranche.
write('src/engine/__tests__/depth-pass-stage1.test.ts', `import { describe, expect, it } from "vitest";\nimport { ARCS, ARC_RESEARCH_COMBOS, ARC_RESEARCH_GENRE_KEYS, GENRES, arcGenreFit } from "../data";\nimport { growthForLevel, uniformGenreForSeed, specDef } from "../careers";\nimport type { Staff } from "../data";\n\ndescribe("depth pass stage 1", () => {\n  it("Genre Studies supplies exactly two genuine positive arc fits for all 30 genres", () => {\n    expect(GENRES).toHaveLength(30);\n    expect(ARC_RESEARCH_GENRE_KEYS).toHaveLength(60);\n    for (const genre of GENRES) {\n      const keys = ARC_RESEARCH_GENRE_KEYS.filter((k) => k.endsWith(\`|\${genre.id}\`));\n      expect(keys).toHaveLength(2);\n      for (const key of keys) {\n        const id = key.slice(0, key.lastIndexOf("|"));\n        const arc = ARCS.find((a) => a.id === id)!;\n        expect(arcGenreFit(arc, genre.id).score).toBeGreaterThan(0);\n      }\n    }\n  });\n  it("Narrative Analytics now teaches a substantially larger structure library", () => {\n    expect(ARC_RESEARCH_COMBOS.length).toBeGreaterThanOrEqual(12);\n  });\n  it("uniform genre seed maps every genre exactly once in a 30-seed cycle", () => {\n    expect(new Set(Array.from({ length: GENRES.length }, (_, i) => uniformGenreForSeed(i))).size).toBe(GENRES.length);\n  });\n  it("every role has a purple specialisation for every genre", () => {\n    for (const genre of GENRES) for (const role of ["writer", "animator", "composer"] as const) {\n      const spec = specDef(\`g_\${role}_\${genre.id}\`);\n      expect(spec?.genres).toEqual([genre.id]);\n    }\n  });\n  it("elite Potential has a dramatically higher ceiling than weak Potential", () => {\n    const base = (id:string,potential:number):Staff => ({ id, name:id, role:"animator", story:20, art:40, sound:20, level:1, salary:1, cost:1, stamina:100, portrait:0, potential });\n    const low = Array.from({length:100},(_,i)=>growthForLevel(base(\`low-\${i}\`,10),10)).map(g=>g.story+g.art+g.sound);\n    const elite = Array.from({length:100},(_,i)=>growthForLevel(base(\`elite-\${i}\`,10),10)).map(g=>g.story+g.art+g.sound);\n    expect(Math.min(...low)).toBe(0);\n    expect(Math.max(...elite)).toBeGreaterThanOrEqual(20);\n    expect(elite.reduce((a,b)=>a+b,0)/elite.length).toBeGreaterThan((low.reduce((a,b)=>a+b,0)/low.length)*5);\n  });\n});\n`);

console.log('Stage 1 depth pass applied');
