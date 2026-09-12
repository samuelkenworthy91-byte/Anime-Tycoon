import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (p, s) => fs.writeFileSync(p, s);
function once(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`missing ${label}`);
  return text.replace(from, to);
}

// Purple specialisations stay grouped, but every active genre appears exactly once per role.
{
  const p = 'src/engine/careers.ts';
  let s = read(p);
  const old = `/** Every role can now roll an equally-likely purple specialisation in every active genre. */\nconst GENRE_SPEC_DEFS: SpecDef[] = GENRES.flatMap((genre) => ([\n  { id: \`g_writer_\${genre.id}\`, role: "writer" as const, name: \`\${genre.label} Writing\`, genres: [genre.id] },\n  { id: \`g_animator_\${genre.id}\`, role: "animator" as const, name: \`\${genre.label} Animation\`, genres: [genre.id] },\n  { id: \`g_composer_\${genre.id}\`, role: "composer" as const, name: \`\${genre.label} Scoring\`, genres: [genre.id] },\n]));\nexport const SPEC_DEFS: SpecDef[] = [...LEGACY_SPEC_DEFS, ...GENRE_SPEC_DEFS];`;
  const neu = `/** Purple specialisations stay broad/thematic rather than one genre each.\n *  Ten equal-sized groups cover all 30 active genres exactly once for every role,\n *  so rolling a group gives every genre identical opportunity overall. */\nexport const GENRE_SPEC_GROUPS = [\n  { id: "action", name: "Action & Rivalry", genres: ["martial", "sports", "mecha"] },\n  { id: "warriors", name: "Warriors & Shadows", genres: ["samurai", "shinobi", "military"] },\n  { id: "wonder", name: "Wonder & Adventure", genres: ["fantasy", "isekai", "arabia"] },\n  { id: "mystic", name: "Mystic & Occult", genres: ["magical", "supernatural", "mythology"] },\n  { id: "dark", name: "Dark & Macabre", genres: ["horror", "vampire", "grimdark"] },\n  { id: "mind", name: "Mystery & Underworld", genres: ["mystery", "crime", "cyber"] },\n  { id: "heart", name: "Heart & Everyday Life", genres: ["romance", "slice", "comedy"] },\n  { id: "stage", name: "Stage & Sensation", genres: ["idol", "cooking", "monster_taming"] },\n  { id: "frontier", name: "Frontier & Survival", genres: ["pirate", "nordic", "survival"] },\n  { id: "scale", name: "Scale & Beyond", genres: ["space", "kaiju", "cosmic_horror"] },\n] as const satisfies readonly { id: string; name: string; genres: readonly GenreId[] }[];\n\nconst GROUP_SPEC_DEFS: SpecDef[] = (["writer", "animator", "composer"] as const).flatMap((role) =>\n  GENRE_SPEC_GROUPS.map((group) => ({\n    id: \`g_\${role}_\${group.id}\`,\n    role,\n    name: \`\${group.name} \${role === "writer" ? "Writing" : role === "animator" ? "Animation" : "Scoring"}\`,\n    genres: [...group.genres],\n  }))\n);\nexport const SPEC_DEFS: SpecDef[] = [...LEGACY_SPEC_DEFS, ...GROUP_SPEC_DEFS];`;
  s = once(s, old, neu, 'grouped purple specialisations');
  s = once(s,
    'export const genreSpecialisationId = (role: StaffRole, genre: GenreId) => `g_${role}_${genre}`;',
    'export const genreSpecialisationId = (role: StaffRole, genre: GenreId) => { const group = GENRE_SPEC_GROUPS.find((g) => g.genres.includes(genre)); return `g_${role}_${group?.id ?? GENRE_SPEC_GROUPS[0].id}`; };',
    'group spec id resolver');
  write(p, s);
}

{
  const p = 'src/engine/__tests__/depth-pass-stage1.test.ts';
  let s = read(p);
  s = once(s,
    'import { growthForLevel, uniformGenreForSeed, specDef } from "../careers";',
    'import { GENRE_SPEC_GROUPS, growthForLevel, uniformGenreForSeed, specDef } from "../careers";',
    'test import');
  s = once(s,
`  it("every role has a purple specialisation for every genre", () => {\n    for (const genre of GENRES) for (const role of ["writer", "animator", "composer"] as const) {\n      const spec = specDef(\`g_\${role}_\${genre.id}\`);\n      expect(spec?.genres).toEqual([genre.id]);\n    }\n  });`,
`  it("purple specialisations stay grouped while covering every genre equally", () => {\n    expect(GENRE_SPEC_GROUPS).toHaveLength(10);\n    expect(GENRE_SPEC_GROUPS.every((g) => g.genres.length === 3)).toBe(true);\n    const flat = GENRE_SPEC_GROUPS.flatMap((g) => [...g.genres]);\n    expect(flat).toHaveLength(GENRES.length);\n    expect(new Set(flat).size).toBe(GENRES.length);\n    for (const genre of GENRES) {\n      expect(flat.filter((g) => g === genre.id)).toHaveLength(1);\n      for (const role of ["writer", "animator", "composer"] as const) {\n        const group = GENRE_SPEC_GROUPS.find((g) => g.genres.includes(genre.id))!;\n        expect(specDef(\`g_\${role}_\${group.id}\`)?.genres).toContain(genre.id);\n      }\n    }\n  });`,
    'grouped spec regression');
  write(p, s);
}

console.log('Stage 2 grouped specialisations applied');
