import { readFileSync, writeFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const write = (path, text) => writeFileSync(path, text, "utf8");

function replaceOnce(text, from, to, label) {
  if (text.includes(to)) return text;
  if (!text.includes(from)) throw new Error(`Patch target missing: ${label}`);
  return text.replace(from, to);
}

// 1) Gate hidden-affinity filter eligibility behind per-save discovery state.
{
  const path = "src/engine/castDisplayOrder.ts";
  let text = read(path);
  text = replaceOnce(
    text,
    'const affinitySet = (member: CastMember) => new Set<GenreId>([...member.visibleAff, member.hiddenAff]);',
    `const availableAffinitySet = (member: CastMember, discovered: ReadonlySet<string>) => {\n  const available = new Set<GenreId>(member.visibleAff);\n  if (discovered.has(member.id)) available.add(member.hiddenAff);\n  return available;\n};`,
    "available affinity set",
  );
  text = replaceOnce(
    text,
    'function strictOwnersForGenres(members: readonly CastMember[], genres: readonly GenreId[]): CastMember[] {',
    'function strictOwnersForGenres(members: readonly CastMember[], genres: readonly GenreId[], discovered: ReadonlySet<string>): CastMember[] {',
    "strict owner discovery parameter",
  );
  text = replaceOnce(
    text,
    '    const all = affinitySet(member);',
    '    const all = availableAffinitySet(member, discovered);',
    "strict owner available affinities",
  );
  text = replaceOnce(
    text,
    '  filters: readonly CastBrowseFilter[],\n): CastMember[] {',
    '  filters: readonly CastBrowseFilter[],\n  discoveredCastIds: readonly string[] = [],\n): CastMember[] {',
    "filter discovery parameter",
  );
  text = replaceOnce(
    text,
    '  const typed = typeFilter ? members.filter((member) => member.type === typeFilter.value) : [...members];\n  if (!genres.length) return dedupeVisiblePairs(typed, []);',
    '  const discovered = new Set(discoveredCastIds);\n  const typed = typeFilter ? members.filter((member) => member.type === typeFilter.value) : [...members];\n  if (!genres.length) return dedupeVisiblePairs(typed, []);',
    "filter discovery set",
  );
  text = replaceOnce(
    text,
    '  if (genres.length >= 2) return strictOwnersForGenres(typed, genres);\n\n  const matching = typed.filter((member) => affinitySet(member).has(genres[0]));',
    '  if (genres.length >= 2) return strictOwnersForGenres(typed, genres, discovered);\n\n  const matching = typed.filter((member) => availableAffinitySet(member, discovered).has(genres[0]));',
    "hidden eligibility gate",
  );
  text = replaceOnce(
    text,
    '  genre: GenreId | null,\n): CastMember[] {\n  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : []);',
    '  genre: GenreId | null,\n  discoveredCastIds: readonly string[] = [],\n): CastMember[] {\n  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : [], discoveredCastIds);',
    "visible genre discovery wrapper",
  );
  text = text.replace(
    ' * targeted secret-affinity connection that genuinely needs them.\n *\n * A two-genre search is strict:',
    ' * targeted secret-affinity connection that genuinely needs them. A hidden\n * affinity is never eligible until that cast ID is present in the current\n * save\'s `castAffinityDiscovered` list.\n *\n * A two-genre search is strict:',
  );
  write(path, text);
}

// 2) Feed the current career's discovered cast IDs into the browser filter.
{
  const path = "src/components/Create.tsx";
  let text = read(path);
  text = replaceOnce(
    text,
    '  const filteredCastList = filterCastByFilters(castRow.list, castFilters);',
    '  const filteredCastList = filterCastByFilters(castRow.list, castFilters, run.castAffinityDiscovered);',
    "Create discovery-aware cast filter",
  );
  write(path, text);
}

// 3) Update focused browser-filter tests to prove secrets do not leak early.
{
  const path = "src/engine/__tests__/cast-display-filter.test.ts";
  let text = read(path);
  text = replaceOnce(
    text,
    'const visiblePairKey = (member: (typeof PROTAGONISTS)[number]) => [...member.visibleAff].sort().join("|");',
    'const visiblePairKey = (member: (typeof PROTAGONISTS)[number]) => [...member.visibleAff].sort().join("|");\nconst ALL_DISCOVERED = PROTAGONISTS.map((member) => member.id);',
    "all-discovered test fixture",
  );
  text = text.replace(
    'const result = filterCastByVisibleGenre(PROTAGONISTS, genre);',
    'const result = filterCastByVisibleGenre(PROTAGONISTS, genre, ALL_DISCOVERED);',
  );
  const start = text.indexOf('  it("uses hidden affinities for eligibility without changing their concealed field"');
  if (start >= 0) {
    const endMarker = '\n  });\n});\n';
    const end = text.indexOf(endMarker, start);
    if (end < 0) throw new Error("Patch target missing: hidden affinity test end");
    const replacement = `  it("does not expose a hidden-affinity match until that character has been discovered", () => {\n    for (const genre of GENRES.map((g) => g.id)) {\n      const hiddenOnly = PROTAGONISTS.find((m) => m.hiddenAff === genre && !m.visibleAff.includes(genre));\n      if (!hiddenOnly) continue;\n\n      const before = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }], []);\n      expect(before.some((m) => m.id === hiddenOnly.id)).toBe(false);\n\n      const after = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }], [hiddenOnly.id]);\n      expect(after.some((m) => m.id === hiddenOnly.id)).toBe(true);\n      expect(after.find((m) => m.id === hiddenOnly.id)?.epithet).toContain("SECRET MATCH");\n      expect(hiddenOnly.visibleAff.includes(genre)).toBe(false);\n      expect(hiddenOnly.hiddenAff).toBe(genre);\n    }\n  });\n});\n`;
    text = text.slice(0, start) + replacement + text.slice(end + endMarker.length);
  }
  write(path, text);
}

// 4) Exhaustive coverage tests intentionally reveal all secrets so they continue
// validating the underlying 435-pair reserve coverage independently of UI gating.
{
  const path = "src/engine/__tests__/cast-coverage.test.ts";
  let text = read(path);
  text = replaceOnce(
    text,
    'const visiblePairKey = (member: CastMember) => [...member.visibleAff].sort().join("|");',
    'const visiblePairKey = (member: CastMember) => [...member.visibleAff].sort().join("|");\nconst ALL_DISCOVERED = CAST_V2.map((member) => member.id);',
    "coverage all-discovered fixture",
  );
  text = text.replace(
    '          ]);\n          expect(result, `${role}/${a}|${b}`)',
    '          ], ALL_DISCOVERED);\n          expect(result, `${role}/${a}|${b}`)',
  );
  text = text.replace(
    '            ]);\n            expect(result, `${role}/${type}/${a}|${b}`)',
    '            ], ALL_DISCOVERED);\n            expect(result, `${role}/${type}/${a}|${b}`)',
  );
  write(path, text);
}

{
  const path = "src/engine/__tests__/cast-portrait-wiring-regression.test.ts";
  let text = read(path);
  text = replaceOnce(
    text,
    'const v6 = CAST_V2.filter((member) => member.id.startsWith("g30_"));',
    'const v6 = CAST_V2.filter((member) => member.id.startsWith("g30_"));\nconst ALL_V6_DISCOVERED = v6.map((member) => member.id);',
    "V6 all-discovered fixture",
  );
  text = text.replace(
    '      ]);\n      expect(result, `${role}/${type}/${genreA}+${genreB}`)',
    '      ], ALL_V6_DISCOVERED);\n      expect(result, `${role}/${type}/${genreA}+${genreB}`)',
  );
  text = text.replace(
    'expect(filterCastByFilters(bucket, [{ kind: "genre", value: genreA }, { kind: "genre", value: genreB }]), `${role}/${type}/${pairKey}`)',
    'expect(filterCastByFilters(bucket, [{ kind: "genre", value: genreA }, { kind: "genre", value: genreB }], ALL_V6_DISCOVERED), `${role}/${type}/${pairKey}`)',
  );
  text = text.replace(
    '    ]);\n    expect(leads).toHaveLength(2);',
    '    ], ALL_V6_DISCOVERED);\n    expect(leads).toHaveLength(2);',
  );
  write(path, text);
}

console.log("Applied discovery-gated cast filtering patch.");
