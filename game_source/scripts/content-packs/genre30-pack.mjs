export const GENRE30_NEW_GENRES = [
  {
    id: "monster_taming",
    label: "Monster Taming",
    icon: "Sparkles",
    ideal: [56, 78, 54],
    ratio: [0.38, 0.40, 0.22],
    rd: 44,
    tier: "LATE",
    description: "Creatures, bonds, collecting, raising and battling; stories about trainers and partners growing together."
  },
  {
    id: "crime",
    label: "Crime",
    icon: "Crosshair",
    ideal: [92, 46, 36],
    ratio: [0.55, 0.25, 0.20],
    rd: 46,
    tier: "LATE",
    description: "Gangs, detectives, police, heists, underworld organisations and criminal empires."
  },
  {
    id: "kaiju",
    label: "Kaiju",
    icon: "MountainSnow",
    ideal: [52, 92, 78],
    ratio: [0.22, 0.58, 0.20],
    rd: 54,
    tier: "LATE",
    description: "Giant monsters, defence forces, cities under siege and the ecology of impossible creatures."
  },
  {
    id: "cosmic_horror",
    label: "Cosmic Horror",
    icon: "Eye",
    ideal: [92, 58, 92],
    ratio: [0.50, 0.25, 0.25],
    rd: 64,
    tier: "LATE",
    description: "Unknowable entities, forbidden knowledge, cults and existential dread beyond ordinary horror."
  },
  {
    id: "arabia",
    label: "Arabia",
    icon: "Landmark",
    ideal: [76, 68, 46],
    ratio: [0.44, 0.36, 0.20],
    rd: 50,
    tier: "LATE",
    description: "Desert kingdoms, djinn, caravan cities, ancient ruins, palace politics and sword-and-sorcery adventure."
  }
];

export const GENRE30_NEW_IDS = GENRE30_NEW_GENRES.map((g) => g.id);

const PAIR_POLICY = {
  monster_taming: {
    strong: ["fantasy", "isekai", "sports", "survival", "magical", "mythology", "kaiju", "arabia"],
    supportive: ["mecha", "slice", "horror", "cyber", "mystery", "comedy", "military", "space", "pirate", "martial", "nordic", "samurai", "shinobi", "vampire", "grimdark"],
    risky: [],
    experimental: ["romance", "idol", "cooking", "crime", "cosmic_horror"]
  },
  crime: {
    strong: ["mystery", "military", "cyber", "survival", "pirate", "martial", "shinobi", "vampire", "grimdark", "cosmic_horror", "arabia"],
    supportive: ["horror", "romance", "fantasy", "supernatural", "space", "samurai", "nordic"],
    risky: ["magical"],
    experimental: ["mecha", "isekai", "slice", "sports", "idol", "comedy", "cooking", "mythology", "monster_taming", "kaiju"]
  },
  kaiju: {
    strong: ["mecha", "horror", "fantasy", "military", "space", "survival", "mythology", "grimdark", "monster_taming", "cosmic_horror", "arabia"],
    supportive: ["cyber", "supernatural", "magical", "martial", "nordic", "samurai", "vampire", "pirate"],
    risky: ["cooking"],
    experimental: ["isekai", "slice", "romance", "sports", "idol", "mystery", "comedy", "shinobi", "crime"]
  },
  cosmic_horror: {
    strong: ["horror", "mystery", "supernatural", "space", "survival", "mythology", "nordic", "grimdark", "kaiju", "crime", "arabia"],
    supportive: ["mecha", "isekai", "cyber", "fantasy", "military", "pirate", "samurai", "shinobi", "vampire"],
    risky: ["slice", "sports"],
    experimental: ["romance", "idol", "comedy", "cooking", "martial", "magical", "monster_taming"]
  },
  arabia: {
    strong: ["fantasy", "romance", "cooking", "supernatural", "magical", "pirate", "mythology", "grimdark", "monster_taming", "crime", "kaiju", "cosmic_horror"],
    supportive: ["isekai", "horror", "mystery", "comedy", "military", "survival", "martial", "shinobi", "vampire", "nordic"],
    risky: ["idol"],
    experimental: ["mecha", "slice", "sports", "cyber", "space", "samurai"]
  }
};

function hash32(text) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export const genre30PairKey = (a, b) => [a, b].sort().join("|");

function classFor(a, b) {
  const primary = GENRE30_NEW_IDS.includes(a) ? a : b;
  const partner = primary === a ? b : a;
  const policy = PAIR_POLICY[primary];
  if (!policy) throw new Error(`No pair policy for ${a}/${b}`);
  for (const cls of ["strong", "supportive", "risky", "experimental"]) {
    if (policy[cls].includes(partner)) return cls;
  }
  return "neutral";
}

function learnedMultiplier(key, cls) {
  const h = hash32(key);
  if (cls === "strong") return Number((1.22 + (h % 7) * 0.01).toFixed(2));
  if (cls === "supportive") return Number((1.10 + (h % 6) * 0.01).toFixed(2));
  if (cls === "risky") return Number((0.80 + (h % 10) * 0.01).toFixed(2));
  if (cls === "experimental") return Number((1.20 + (h % 7) * 0.01).toFixed(2));
  return 1;
}

function comboRecord(a, b) {
  const key = genre30PairKey(a, b);
  const discovery_class = classFor(a, b);
  const learned_multiplier = learnedMultiplier(key, discovery_class);
  return {
    genre_1: a,
    genre_2: b,
    key,
    first_release_multiplier: discovery_class === "experimental" ? 1 : learned_multiplier,
    learned_multiplier,
    discovery_class
  };
}

export function buildGenre30Combos(existingGenreIds) {
  const out = [];
  for (let i = 0; i < GENRE30_NEW_IDS.length; i += 1) {
    const current = GENRE30_NEW_IDS[i];
    for (const existing of existingGenreIds) out.push(comboRecord(current, existing));
    for (let j = i + 1; j < GENRE30_NEW_IDS.length; j += 1) out.push(comboRecord(current, GENRE30_NEW_IDS[j]));
  }
  return out;
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ""; }
    else if (ch === '\n') { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += ch;
  }
  if (field || row.length) { row.push(field.replace(/\r$/, "")); rows.push(row); }
  const header = rows.shift();
  return rows.filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ""])));
}

const GIVEN = [
  "Aiko","Amara","Ansel","Arden","Ari","Asa","Asha","Cass","Cassia","Dara","Eira","Elian","Emi","Farah","Hana","Haru","Idris","Imani","Jae","Jin",
  "Kael","Kira","Leila","Lina","Lucan","Mara","Mika","Mina","Nadia","Nao","Niko","Noor","Rhea","Ren","Rin","Samira","Sana","Sora","Tala","Yara"
];
const SURNAMES = [
  "Adebayo","Akhtar","Alvarez","Amari","Azhar","Bako","Bennett","Chen","Cho","Costa","Crowe","Dahl","Darzi","Diallo","Duval","Farouk","Fen","Ferreira","Fischer","Haddad",
  "Hale","Hassan","Ito","Kade","Kaur","Khan","Kim","Kovacs","Laurent","Locke","Marlow","Mendes","Mensah","Mirren","Mori","Navarro","Nguyen","Nielsen","Njeri","Novak",
  "Okafor","Okoye","Ortega","Park","Patel","Petrov","Rahman","Ramos","Reyes","Roux","Saad","Santos","Serrano","Silva","Solberg","Tan","Torres","Varga","Vega","Volkov"
];
const MASCOT_STEMS = ["Azu","Bram","Chai","Cinder","Clink","Djinni","Ember","Fang","Glim","Kiki","Lumen","Miri","Miso","Moku","Nib","Nori","Orbit","Pebble","Pip","Puck","Riff","Rune","Sable","Skiff","Soot","Talon","Tika","Toto","Vanta","Whisp"];
const MASCOT_ENDS = ["bean","blink","claw","coil","drift","fang","flare","ling","mite","moth","paw","puff","snap","spark","sprite","tail","tooth","whirl","whisk","wing","wisp"];

function repairName(index, role, used) {
  const capacity = role === "pet" ? MASCOT_STEMS.length * MASCOT_ENDS.length : GIVEN.length * SURNAMES.length;
  for (let attempt = 0; attempt < capacity; attempt += 1) {
    const n = index + attempt;
    const candidate = role === "pet"
      ? `${MASCOT_STEMS[n % MASCOT_STEMS.length]}${MASCOT_ENDS[Math.floor(n / MASCOT_STEMS.length) % MASCOT_ENDS.length]}`
      : `${GIVEN[n % GIVEN.length]} ${SURNAMES[Math.floor(n / GIVEN.length) % SURNAMES.length]}`;
    if (!used.has(candidate)) return candidate;
  }
  throw new Error(`Unable to generate a unique ${role} name`);
}

const LABELS = Object.fromEntries(GENRE30_NEW_GENRES.map((g) => [g.id, g.label]));
const FALLBACK_LABELS = {
  mecha:"Mecha", isekai:"Isekai", slice:"Slice of Life", horror:"Horror", romance:"Romance", sports:"Sports", cyber:"Cyber", fantasy:"Fantasy", idol:"Idol", mystery:"Mystery", comedy:"Comedy", cooking:"Cooking", military:"Military", supernatural:"Supernatural", space:"Space", magical:"Magical", survival:"Survival", pirate:"Pirate", martial:"Martial Arts", mythology:"Mythology", nordic:"Nordic", samurai:"Samurai", shinobi:"Shinobi", vampire:"Vampire", grimdark:"Grimdark"
};
const labelFor = (id) => LABELS[id] ?? FALLBACK_LABELS[id] ?? id;

function archetypeFor(row) {
  const pair = `${labelFor(row.visible_genre_1)} × ${labelFor(row.visible_genre_2)}`;
  if (row.role === "pet") return `${pair} companion creature`;
  if (row.role === "villain") return `${pair} antagonist`;
  if (row.role === "secondary") return `${pair} supporting specialist`;
  return `${pair} lead`;
}

function speciesFor(row) {
  const affinities = [row.visible_genre_1, row.visible_genre_2, row.hidden_genre];
  if (row.role === "pet") return affinities.includes("kaiju") ? "young kaiju companion" : "bond creature or familiar";
  if (row.role === "villain" && affinities.includes("cosmic_horror")) return "eldritch or humanoid antagonist";
  if (affinities.includes("arabia") && affinities.includes("supernatural")) return "human or djinn-touched humanoid";
  return "human or humanoid";
}

function personalityFor(row) {
  const a = labelFor(row.visible_genre_1).toLowerCase();
  const b = labelFor(row.visible_genre_2).toLowerCase();
  if (row.role === "pet") return `Expressive and fiercely bonded; reacts instinctively when ${a} and ${b} pressures collide.`;
  if (row.role === "villain") return `Turns the rules of ${a} and ${b} into leverage, revealing menace through patience rather than noise.`;
  if (row.role === "secondary") return `Practical under pressure, notices the ${a} complication first and usually has a ${b} contingency ready.`;
  return `Driven by curiosity and loyalty, pushing through ${a} danger while learning when ${b} instincts should be trusted.`;
}

function culturalBasisFor(row) {
  const affinities = [row.visible_genre_1, row.visible_genre_2, row.hidden_genre];
  if (affinities.includes("arabia")) return "invented West Asian / desert-kingdom adventure setting";
  if (affinities.includes("nordic")) return "invented northern maritime setting";
  if (affinities.includes("samurai") || affinities.includes("shinobi")) return "invented Japanese historical-fantasy setting";
  return "invented international anime setting";
}

export function buildGenre30Cast(rows, reservedNames = new Set()) {
  const ids = new Set();
  const manifestNameCount = new Map();
  for (const row of rows) manifestNameCount.set(row.name, (manifestNameCount.get(row.name) ?? 0) + 1);

  const used = new Set(reservedNames);
  for (const row of rows) {
    if ((manifestNameCount.get(row.name) ?? 0) === 1 && row.name && !used.has(row.name)) used.add(row.name);
  }

  const cast = [];
  rows.forEach((row, index) => {
    if (ids.has(row.character_id)) throw new Error(`Duplicate Genre 30 cast id: ${row.character_id}`);
    ids.add(row.character_id);
    const keepManifestName = (manifestNameCount.get(row.name) ?? 0) === 1 && row.name && !reservedNames.has(row.name);
    const name = keepManifestName ? row.name : repairName(index + 100, row.role, used);
    used.add(name);
    cast.push({
      id: row.character_id,
      name,
      archetype: archetypeFor(row),
      epithet: row.epithet || `The ${labelFor(row.visible_genre_1)} ${row.role === "villain" ? "Threat" : row.role === "pet" ? "Companion" : "Voice"}`,
      img: `cast/v6/${row.character_id}.webp`,
      personality: personalityFor(row),
      role: row.role,
      type: row.anime_type,
      visibleAff: [row.visible_genre_1, row.visible_genre_2],
      hiddenAff: row.hidden_genre,
      gender: "unspecified",
      species: speciesFor(row),
      ageBand: row.role === "pet" ? "ageless" : "adult",
      culturalBasis: culturalBasisFor(row),
      sourceManifestSequence: Number(row.sequence)
    });
  });
  return cast;
}
