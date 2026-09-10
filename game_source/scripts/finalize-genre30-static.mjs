import { readFileSync, writeFileSync } from "node:fs";

function read(path) { return readFileSync(path, "utf8"); }
function write(path, text) { writeFileSync(path, text); }
function replaceOnce(text, from, to, label) {
  const first = text.indexOf(from);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (text.indexOf(from, first + from.length) >= 0) throw new Error(`Patch target occurs more than once: ${label}`);
  return text.slice(0, first) + to + text.slice(first + from.length);
}
function replaceAllChecked(text, from, to, expected, label) {
  const parts = text.split(from);
  const count = parts.length - 1;
  if (count !== expected) throw new Error(`${label}: expected ${expected} matches, got ${count}`);
  return parts.join(to);
}

// ---------------------------------------------------------------- data.ts
{
  const path = "game_source/src/engine/data.ts";
  let s = read(path);
  s = replaceOnce(s,
`  | "samurai"
  | "shinobi";`,
`  | "samurai"
  | "shinobi"
  | "vampire"
  | "grimdark"
  | "monster_taming"
  | "crime"
  | "kaiju"
  | "cosmic_horror"
  | "arabia";`, "GenreId union");

  s = replaceOnce(s,
`  /* PROVISIONAL scaffolding colours (do not tune with the canonical set) */
  samurai: "#f4a261", shinobi: "#5f6caf",`,
`  samurai: "#f4a261", shinobi: "#5f6caf",
  vampire: "#b91c1c", grimdark: "#78716c", monster_taming: "#34d399", crime: "#64748b",
  kaiju: "#f97316", cosmic_horror: "#4338ca", arabia: "#d97706",`, "genre colours");

  s = replaceOnce(s,
`  /* PROVISIONAL scaffolding icons */
  samurai: Swords, shinobi: Moon,`,
`  samurai: Swords, shinobi: Moon,
  vampire: Moon, grimdark: Swords, monster_taming: Sparkles, crime: Crosshair,
  kaiju: MountainSnow, cosmic_horror: Eye, arabia: Landmark,`, "genre icons");

  s = s.replace("/** The 23 canonical ids supplied by the integrated V3 manifest. */", "/** Canonical genre ids supplied by the generated runtime catalog. */");

  s = replaceOnce(s,
`  midnight: { label: "Midnight Otaku Slot", cost: 6_000, reach: 0.78, best: ["horror", "mystery", "cyber", "slice", "supernatural", "survival", "shinobi" /* PROVISIONAL */], desc: "Cheap airtime for devoted weirdos." },`,
`  midnight: { label: "Midnight Otaku Slot", cost: 6_000, reach: 0.78, best: ["horror", "mystery", "cyber", "slice", "supernatural", "survival", "shinobi", "vampire", "grimdark", "crime", "cosmic_horror"], desc: "Cheap airtime for devoted weirdos." },`, "midnight genre fit");
  s = replaceOnce(s,
`  evening: { label: "Evening Family Slot", cost: 40_000, reach: 1.15, best: ["romance", "slice", "fantasy", "comedy", "cooking", "magical", "mythology"], desc: "Dinner-table viewing." },`,
`  evening: { label: "Evening Family Slot", cost: 40_000, reach: 1.15, best: ["romance", "slice", "fantasy", "comedy", "cooking", "magical", "mythology", "monster_taming", "arabia"], desc: "Dinner-table viewing." },`, "evening genre fit");
  s = replaceOnce(s,
`  prime: { label: "Prime-Time Saturday", cost: 110_000, reach: 1.62, best: ["sports", "mecha", "idol", "military", "martial", "pirate", "samurai" /* PROVISIONAL */], desc: "The whole nation watches." },`,
`  prime: { label: "Prime-Time Saturday", cost: 110_000, reach: 1.62, best: ["sports", "mecha", "idol", "military", "martial", "pirate", "samurai", "monster_taming", "kaiju"], desc: "The whole nation watches." },`, "prime genre fit");

  const audienceSuffixes = [
    ["shinobi: 0.95 /* PROVISIONAL */ }, desc: \"Toys sell themselves.\" },", "shinobi: 0.95, vampire: 0.75, grimdark: 0.65, monster_taming: 1.25, crime: 0.75, kaiju: 1.15, cosmic_horror: 0.55, arabia: 1.10 }, desc: \"Toys sell themselves.\" },"],
    ["shinobi: 1.12 /* PROVISIONAL */ }, desc: \"Loud, loyal, extremely online.\" },", "shinobi: 1.12, vampire: 1.15, grimdark: 1.12, monster_taming: 1.20, crime: 1.10, kaiju: 1.18, cosmic_horror: 1.08, arabia: 1.12 }, desc: \"Loud, loyal, extremely online.\" },"],
    ["shinobi: 1.1 /* PROVISIONAL */ }, desc: \"Discerning tastes, deep wallets.\" },", "shinobi: 1.1, vampire: 1.08, grimdark: 1.18, monster_taming: 0.95, crime: 1.25, kaiju: 1.08, cosmic_horror: 1.22, arabia: 1.10 }, desc: \"Discerning tastes, deep wallets.\" },"],
    ["shinobi: 1.0 /* PROVISIONAL */ }, desc: \"Hard to please everyone.\" },", "shinobi: 1.0, vampire: 0.85, grimdark: 0.70, monster_taming: 1.20, crime: 0.80, kaiju: 1.05, cosmic_horror: 0.65, arabia: 1.15 }, desc: \"Hard to please everyone.\" },"],
  ];
  for (const [from, to] of audienceSuffixes) s = replaceOnce(s, from, to, `audience fit ${from.slice(0, 20)}`);
  write(path, s);
}

// -------------------------------------------------------- castCoverage docs
{
  const path = "game_source/src/engine/castCoverage.ts";
  let s = read(path);
  s = s.replace(/CAST V4 COVERAGE/g, "CANONICAL CAST COVERAGE");
  s = s.replace(/23 canonical genres produce 253 unordered pairs\. The final 736-character\n \* roster must provide/g,
    "The generated canonical genre catalog defines the unordered pair matrix. The live\n * roster must provide");
  s = s.replace(/4 roles × 2 anime types × 253 pairs = 2,024 required cells\./g,
    "At 30 genres: 4 roles × 2 anime types × 435 pairs = 3,480 required cells.");
  s = s.replace("/** all unordered canonical genre pairs — exactly 253 for 23 genres */", "/** All unordered pairs from the generated canonical genre catalog. */");
  write(path, s);
}

// -------------------------------------------------------------- test edits
function patch(path, fn) { const s = read(path); const n = fn(s); if (n === s) throw new Error(`${path}: patch made no changes`); write(path, n); }

patch("game_source/src/engine/__tests__/cast-coverage-2024.test.ts", (s) => {
  s = s.replace("expect(GENRES).toHaveLength(25);", "expect(GENRES).toHaveLength(30);");
  s = s.replace("expect(expectedPairs).toBe(300);", "expect(expectedPairs).toBe(435);");
  s = s.replace("expect(result.required).toBe(2400);", "expect(result.required).toBe(3480);");
  s = s.replace("expect(CAST_V2).toHaveLength(920);", "expect(CAST_V2).toHaveLength(1440);");
  return s;
});

patch("game_source/src/engine/__tests__/cast-v2.test.ts", (s) => {
  s = s.replace("keeps the original 21 unchanged and appends Samurai, Shinobi, Vampire and Grimdark", "keeps the original 21 unchanged and appends all nine expansion genres");
  s = s.replace("expect(GENRES).toHaveLength(25);", "expect(GENRES).toHaveLength(30);");
  s = s.replace('expect(GENRES.map((genre) => genre.id).slice(21)).toEqual(["samurai", "shinobi", "vampire", "grimdark"]);',
    'expect(GENRES.map((genre) => genre.id).slice(21)).toEqual(["samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"]);');
  return s;
});

patch("game_source/src/engine/__tests__/cast-v4-staging-mechanics.test.ts", (s) => {
  s = s.replace("expanded 920-member live roster", "expanded 1,440-member live roster");
  s = replaceAllChecked(s, "toHaveLength(920)", "toHaveLength(1440)", 1, "V4 live roster length");
  s = replaceAllChecked(s, "toBe(920)", "toBe(1440)", 1, "V4 live roster uniqueness");
  s = s.replace("all 2,400 strict role/type genre-pair cells", "all 3,480 strict role/type genre-pair cells");
  s = s.replace("expect(pairs).toHaveLength(300);", "expect(pairs).toHaveLength(435);");
  s = s.replace("expect(coveredCells).toBe(2400);", "expect(coveredCells).toBe(3480);");
  return s;
});

patch("game_source/src/engine/__tests__/cast-portraits.test.ts", (s) => {
  s = replaceAllChecked(s, "toHaveLength(920)", "toHaveLength(1440)", 2, "portrait roster counts");
  s = s.replace('      if (member.id.startsWith("vg_")) {\n        expect(member.img, member.id).toBe(`cast/v5/${member.id}.png`);\n      } else {',
`      if (member.id.startsWith("g30_")) {
        expect(member.img, member.id).toBe(\`cast/v6/\${member.id}.webp\`);
      } else if (member.id.startsWith("vg_")) {
        expect(member.img, member.id).toBe(\`cast/v5/\${member.id}.png\`);
      } else {`);
  s = s.replace('["v2", "v3", "v4", "v5"]', '["v2", "v3", "v4", "v5", "v6"]');
  return s;
});

patch("game_source/src/engine/__tests__/kairosoft-production.test.ts", (s) => {
  s = s.replace('it("all 25 active genres remain present", () => {', 'it("all 30 active genres remain present", () => {');
  s = s.replace("expect(GENRES).toHaveLength(25);", "expect(GENRES).toHaveLength(30);");
  s = s.replace('["samurai", "shinobi", "vampire", "grimdark"]', '["samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"]');
  return s;
});

patch("game_source/src/engine/__tests__/genre-targets-hardmode.test.ts", (s) => s.replace("expect(count).toBe(300);", "expect(count).toBe(435);"));

patch("game_source/src/engine/__tests__/cast-coverage.test.ts", (s) => {
  s = s.replace('const ROLE_TOTALS: Record<string, number> = { lead: 231, sidekick: 227, mascot: 230, villain: 232 };',
    'const ROLE_TOTALS: Record<string, number> = { lead: 361, sidekick: 357, mascot: 360, villain: 362 };');
  s = s.replace(`  "lead:shonen": 113,
  "lead:shojo": 118,
  "sidekick:shonen": 112,
  "sidekick:shojo": 115,
  "mascot:shonen": 113,
  "mascot:shojo": 117,
  "villain:shonen": 115,
  "villain:shojo": 117,`,
`  "lead:shonen": 178,
  "lead:shojo": 183,
  "sidekick:shonen": 177,
  "sidekick:shojo": 180,
  "mascot:shonen": 178,
  "mascot:shojo": 182,
  "villain:shonen": 180,
  "villain:shojo": 182,`);
  s = s.replace('describe("canonical 25-genre cast roster", () => {', 'describe("canonical 30-genre cast roster", () => {');
  s = replaceAllChecked(s, "920", "1440", 2, "canonical roster count");
  s = s.replace("expect(measured).toBe(300);", "expect(measured).toBe(435);");
  s = s.replace("includes Samurai, Shinobi, Vampire and Grimdark in canonical content", "includes every expansion genre in canonical content");
  s = s.replace('["samurai", "shinobi", "vampire", "grimdark"] as GenreId[]', '["samurai", "shinobi", "vampire", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"] as GenreId[]');
  return s;
});

patch("game_source/src/engine/__tests__/samurai-shinobi-scaffold.test.ts", (s) => {
  s = s.replace('const CURRENT_EXPANSION_IDS = ["vampire", "grimdark"] as GenreId[];\nconst ALL_EXPANSION_IDS = [...LEGACY_EXPANSION_IDS, ...CURRENT_EXPANSION_IDS];',
`const V5_EXPANSION_IDS = ["vampire", "grimdark"] as GenreId[];
const GENRE30_EXPANSION_IDS = ["monster_taming", "crime", "kaiju", "cosmic_horror", "arabia"] as GenreId[];
const ALL_EXPANSION_IDS = [...LEGACY_EXPANSION_IDS, ...V5_EXPANSION_IDS, ...GENRE30_EXPANSION_IDS];`);
  s = s.replace('it("exposes 25 active canonical genre ids", () => {', 'it("exposes 30 active canonical genre ids", () => {');
  s = replaceAllChecked(s, "toHaveLength(25)", "toHaveLength(30)", 3, "genre/market catalog counts");
  s = s.replace("loads all 300 canonical pairs", "loads all 435 canonical pairs");
  s = s.replace("expect(manifest.combos).toHaveLength(300);", "expect(manifest.combos).toHaveLength(435);");
  s = s.replace('    expect(COMBO[comboKey(["grimdark", "space"] as GenreId[])]).toBe(1.27);',
`    expect(COMBO[comboKey(["grimdark", "space"] as GenreId[])]).toBe(1.27);
    expect(comboMult(["monster_taming", "kaiju"] as GenreId[])).toBeGreaterThan(1.2);
    expect(comboMult(["crime", "mystery"] as GenreId[])).toBeGreaterThan(1.2);
    expect(comboMult(["kaiju", "mecha"] as GenreId[])).toBeGreaterThan(1.2);
    expect(comboMult(["cosmic_horror", "space"] as GenreId[])).toBeGreaterThan(1.2);
    expect(comboMult(["arabia", "fantasy"] as GenreId[])).toBeGreaterThan(1.2);`);
  s = s.replace('    expect(r.genresUnlocked).not.toContain("vampire" as GenreId);',
`    expect(r.genresUnlocked).not.toContain("vampire" as GenreId);
    for (const id of GENRE30_EXPANSION_IDS) expect(r.genresUnlocked).not.toContain(id);`);
  return s;
});

// ---------------------------------------------------------- remove IP name
{
  const path = "game_source/docs/content-v6/GENRE30_ARCS.json";
  let s = read(path);
  s = replaceOnce(s, '"name":"Godzilla Was a Warning"', '"name":"The Old Monster Was a Warning"', "generic Kaiju combo name");
  write(path, s);
}

console.log("Applied final static 30-genre patches.");
