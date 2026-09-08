#!/usr/bin/env node
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function write(path, content) {
  fs.writeFileSync(path, content);
}

function replaceRequired(path, from, to, label) {
  let src = read(path);
  if (src.includes(to)) return;
  if (!src.includes(from)) throw new Error(path + ": missing patch target " + label);
  src = src.replace(from, to);
  write(path, src);
}

/* ---------------------------------------------------------------- titles */
const rivalsPath = "game_source/src/engine/rivals.ts";
let rivals = read(rivalsPath);
if (!rivals.includes("awards-title-v5-type-banks")) {
  const section = /const RIVAL_TITLE_BANK:[\s\S]*?\nlet rivalProdSeq = 0;/;
  if (!section.test(rivals)) throw new Error("Could not locate rival title-generation section");
  const replacement = `/* awards-title-v5-type-banks: titles and posters share the same Anime Type + genres. */
export const RIVAL_TITLE_BANK: Record<AnimeType, Partial<Record<GenreId, string[]>>> = {
  shonen: {
    mecha: ["Neon Gear Re:Genesis", "Mobile Aegis: Iron Horizon", "Code Argent Rebellion", "Gurren Star Breaker"],
    isekai: ["Reborn Beyond the Seventh Gate", "Slime Crown Chronicle", "Overlord of the Empty Throne", "Another World, Zero Map"],
    slice: ["Silver Spoon Summer", "After-School Riot Club", "Daily Lives of the Unlucky Three", "Blue Sky Detour"],
    horror: ["Chainsaw Moon", "Ghoul City: Red Veil", "Parasyte Bloom", "Devil Nocturne"],
    romance: ["Golden Time Loop", "Blue Spring Signal", "Dress-Up Summer", "Toradora Afterglow"],
    sports: ["Blue Cage Eleven", "Haikyu Horizon", "Slam Blaze", "Diamond Ace: Final Inning"],
    cyber: ["Ghost in the Neon Shell", "Psycho-Pass: Zero Signal", "Serial Experiment IX", "Akira Protocol"],
    fantasy: ["Fullmetal Vanguard", "Black Clover: Ash Crown", "Seven Deadly Suns", "Magi of the Sapphire Gate"],
    idol: ["Oshi no Nova", "Starlight Revue Zero", "Prism Beat Vanguard", "Love Livewire!"],
    mystery: ["Case Closed: Black Rose", "Detective Midnight", "Locked Room Requiem", "Hyouka After Dark"],
    comedy: ["Gintama: Silver Noise", "Nichijou Panic", "Daily Lives: Chaos Mode", "Grand Blue Detour"],
    cooking: ["Food Wars: Crimson Plate", "Dungeon Feast Chronicle", "Sweetness & Steel", "Bento Battle Royale"],
    military: ["86: Ashen Front", "Code Argent: Black Rebellion", "Iron-Blood Vanguard", "Valkyria Zero"],
    supernatural: ["Mob Psycho: Eclipse", "Hollow Moon Requiem", "Cursed Crown", "Soul Eater Nocturne"],
    space: ["Cowboy Nebula", "Outlaw Starfall", "Planetes: Blue Orbit", "Crimson Galaxy Rail"],
    magical: ["Fate/Prism Breaker", "Moon Prism Vanguard", "Arcana Blade: Zero", "Magical Knights Nova"],
    survival: ["Abyssbound", "Promised Nevermore", "Deadman Wonderworld", "Last Train, No Signal!"],
    pirate: ["One Last Piece", "Grand Line: Crimson Tide", "Red Flag Odyssey", "Straw Hat Eclipse"],
    martial: ["One Punch Horizon", "Hero Academia: Iron Pulse", "Dragon Soul Zeta", "Fist of the North Sky"],
    mythology: ["Fate/Starfall", "Saint Astra", "Ragnarok Record: Zero", "Olympus Requiem"],
    nordic: ["Vinland Ashes", "Saga of the Northern Wolf", "North Sea Requiem", "Longship Horizon"],
    samurai: ["Rurouni Ember", "Champloo Requiem", "Seven Blades at Dawn", "Ronin Moon"],
    shinobi: ["Hidden Leaf Eclipse", "Ninja Scroll: Black Wind", "Shinobi Requiem", "Shadow Clone Genesis"],
  },
  shojo: {
    mecha: ["Escaflowne Hearts", "Rose Gear Waltz", "Starlight Mecha Serenade", "Crystal Frame Promise"],
    isekai: ["The Saint's Second Bloom", "Villainess of the Moonlit Court", "Red-Haired Princess Beyond the Gate", "The Duke and the Silver Familiar"],
    slice: ["Kimi ni Someday", "Orange After Rain", "Blue Spring Letters", "Honey Cloverlight"],
    horror: ["Crimson Petal Nocturne", "Vampire Rose Refrain", "The Girl Beyond Midnight", "Black Lily House"],
    romance: ["Kimi ni Starlight", "Lovely Complex: Afterglow", "Ao Haru Moon", "Starlight Confession"],
    sports: ["Chihaya in Bloom", "Aim for the Starlight", "Blooming Ace", "Crimson Court Serenade"],
    cyber: ["Plastic Memories: Violet Signal", "Digital Rose", "Eden of Starlight", "Neon Heart Protocol"],
    fantasy: ["Moonlit Dawn Princess", "Snow White with the Crimson Crown", "Yona of the Silver Sky", "Rose of the Crystal Kingdom"],
    idol: ["Oshi no Starlight", "Nana: Encore", "Full Moon Serenade", "Prism Stage! Refrain"],
    mystery: ["Gosick Rose", "Phantom Thief St. Moon", "Velvet Casebook", "The Raven in the Rose Tower"],
    comedy: ["Host Club Afterglow", "Lovely Chaos", "Maid of the Moon Cafe", "Skip a Beat!"],
    cooking: ["Kitchen Princess Refrain", "Sweetness & Starlight", "Bento Hearts", "Sugar Petal Patisserie"],
    military: ["Violet Letters", "White Lily Front", "Rose of the Iron Battalion", "Princess General Requiem"],
    supernatural: ["Kamisama Moonlight", "Spirit Bloom", "Fruits of the Moon Shrine", "Silver Bell Yokai"],
    space: ["Sailor Nebula", "Galaxy Rose", "Starlight Express: Andromeda", "Astra Hearts"],
    magical: ["Sailor Moonlight Prism", "Cardcaptor Starlight", "Princess Tutu Noir", "Tokyo Mew Stardust"],
    survival: ["Red Garden Requiem", "Children of the Black Rose", "Moonlit Sanctuary", "Glass Garden: Last Bloom"],
    pirate: ["Crimson Sailor Rose", "Mermaid Voyage Refrain", "Moonlit Corsair", "Treasure of the Glass Sea"],
    martial: ["Revolutionary Girl Iron Rose", "Rose-Fist Princess", "Moonlit Dojo Hearts", "Crimson Ribbon Duel"],
    mythology: ["Celestial Maiden Reborn", "Fushigi Constellation", "Moon Shrine Promise", "Star Goddess Refrain"],
    nordic: ["Snow Flower Saga", "North Wind Princess", "Aurora Rose Chronicle", "Winter Sea Serenade"],
    samurai: ["Hakuoki: Crimson Petal", "Moonlit Ronin Kiss", "Scarlet Blade Promise", "Edo Rose Refrain"],
    shinobi: ["Shinobi Moonflower", "Hidden Blossom Chronicle", "Kunoichi Starlight", "Shadow Rose Promise"],
  },
};

const RIVAL_TITLE_FALLBACK: Record<AnimeType, string[]> = {
  shonen: ["Crimson Horizon", "Neon Requiem", "Black Star Vanguard", "Zero Eclipse", "Ash Crown Chronicle"],
  shojo: ["Starlight Refrain", "Moonflower Promise", "Velvet Rose Serenade", "Blue Spring Afterglow", "Crystal Hearts Chronicle"],
};

export function makeOriginalTitle(genres: GenreId[], animeType: AnimeType): string {
  const bank = RIVAL_TITLE_BANK[animeType];
  const pool = genres.flatMap((genre) => bank[genre] ?? []);
  return pick(pool.length ? pool : RIVAL_TITLE_FALLBACK[animeType]);
}

function uniqueTitle(base: string, usedTitles: Set<string>): string {
  if (!usedTitles.has(base.toLowerCase())) return base;
  const tags = ["Refrain", "Afterglow", "Zero", "Another Sky", "Crimson Arc", "Eclipse", "Nova", "Re:Verse"];
  for (const tag of tags) {
    const candidate = base + ": " + tag;
    if (!usedTitles.has(candidate.toLowerCase())) return candidate;
  }
  let n = 2;
  while (usedTitles.has((base + " " + n).toLowerCase())) n += 1;
  return base + " " + n;
}

let rivalProdSeq = 0;`;
  rivals = rivals.replace(section, replacement);
  rivals = rivals.replace("      return pick(PUN_TITLES);", "      return makeOriginalTitle(fr.genres, fr.animeType);");
  write(rivalsPath, rivals);
}

/* --------------------------------------------------------- poster typing */
replaceRequired(
  "game_source/src/engine/rivalPosters.ts",
  `  const pool = rivalPostersForStudio(ctx.studio);\n  if (!pool.length) return null;`,
  `  const studioPool = rivalPostersForStudio(ctx.studio);\n  if (!studioPool.length) return null;\n  /* Anime Type is a hard visual constraint: a Shonen release can never be\n     assigned Shojo-only key art, and vice versa. */\n  const pool = studioPool.filter((p) => p.animeTypes.includes(ctx.animeType));\n  if (!pool.length) return null;`,
  "hard Anime Type poster filter"
);

/* ------------------------------------------------------- playtest refresh */
let seed = read("game_source/src/engine/playtestSeed.ts");
seed = seed.replace(/kirameki\.playtest\.awards-y2\.slot3\.v\d+/, "kirameki.playtest.awards-y2.slot3.v5");
seed = seed.replace("My Heroic Overtime", "Rurouni Ember: Crimson Pulse");
seed = seed.replace("Kiss Note: Hearts in the Margin", "Kimi ni Starlight");
seed = seed.replace("Mobile Suit: Rent Is Due", "Mobile Aegis: Iron Horizon");
seed = seed.replace("Sailor Mood After School", "Moonflower After Rain");
write("game_source/src/engine/playtestSeed.ts", seed);

/* --------------------------------------------------------- winner layout */
const cssPath = "game_source/src/components/awardsCeremony.css";
let css = read(cssPath);
if (!css.includes("awards-polish-v5: winner replaces nominee list")) {
  css += `

/* awards-polish-v5: winner replaces nominee list and stays inside mobile frame */
.aw-list-on-reveal {
  display: none !important;
}

.aw-reveal-layout {
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 0 !important;
  margin-top: .35rem !important;
  min-height: 0;
  overflow: hidden !important;
  padding-bottom: max(4.35rem, calc(env(safe-area-inset-bottom, 0px) + 3.8rem));
}

.aw-reveal-layout .aw-winner-panel {
  display: flex;
  width: min(72vw, 300px) !important;
  max-width: 300px !important;
  min-width: 0 !important;
  height: 100%;
  margin: 0 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.aw-reveal-layout .aw-winner-poster {
  width: min(58vw, 250px) !important;
  max-width: 250px !important;
  margin: 0 auto;
  flex: 0 1 auto;
}

.aw-reveal-layout .aw-winner-panel > .aw-rise {
  width: 100%;
  margin-top: .7rem !important;
  flex: 0 0 auto;
}

.aw-reveal-layout .aw-winner-panel > .aw-rise > div:nth-child(2) {
  line-height: 1.08;
  overflow-wrap: anywhere;
}

@media (max-width: 700px) {
  .aw-reveal-layout {
    flex-direction: row !important;
    justify-content: center !important;
    align-items: center !important;
    overflow: hidden !important;
    padding-bottom: max(4.6rem, calc(env(safe-area-inset-bottom, 0px) + 4rem));
  }
  .aw-reveal-layout .aw-winner-panel {
    width: min(78vw, 280px) !important;
    max-width: 280px !important;
  }
  .aw-reveal-layout .aw-winner-poster {
    width: min(60vw, 245px) !important;
    max-width: 245px !important;
  }
}

@media (max-width: 700px) and (max-height: 820px) {
  .aw-reveal-layout .aw-winner-panel {
    width: min(70vw, 240px) !important;
  }
  .aw-reveal-layout .aw-winner-poster {
    width: min(50vw, 210px) !important;
    max-width: 210px !important;
  }
  .aw-reveal-layout .aw-winner-panel > .aw-rise {
    margin-top: .5rem !important;
  }
}

@media (max-width: 700px) and (max-height: 700px) {
  .aw-reveal-layout .aw-winner-poster {
    width: min(44vw, 180px) !important;
    max-width: 180px !important;
  }
}
`;
  write(cssPath, css);
}

/* --------------------------------------------------------------- tests */
const testPath = "game_source/src/engine/__tests__/awards-polish.test.ts";
let test = read(testPath);
if (!test.includes("keeps rival poster Anime Type aligned")) {
  test = test.replace(
    `import { initRivalWorld } from "../rivals";`,
    `import { initRivalWorld, RIVAL_TITLE_BANK } from "../rivals";\nimport { rivalPosterById } from "../rivalPosters";`
  );
  const insert = `

  it("keeps rival title banks cool and clear of workplace gag spam", () => {
    const banned = /\\b(payroll|overtime|deadline|rent|receipt|timesheet|intern|office|business|accountant|meeting|compliance|benefits|emails?|annual leave|lunch break)\\b/i;
    const shonen = Object.values(RIVAL_TITLE_BANK.shonen).flatMap((titles) => titles ?? []);
    const shojo = Object.values(RIVAL_TITLE_BANK.shojo).flatMap((titles) => titles ?? []);
    expect(shonen.length).toBeGreaterThan(50);
    expect(shojo.length).toBeGreaterThan(50);
    expect([...shonen, ...shojo].some((title) => banned.test(title))).toBe(false);
    const shojoSet = new Set(shojo.map((title) => title.toLowerCase()));
    expect(shonen.filter((title) => shojoSet.has(title.toLowerCase()))).toEqual([]);
  });

  it("keeps rival poster Anime Type aligned with every generated production", () => {
    const world = initRivalWorld(0);
    const productions = world.studios.flatMap((studio) => studio.productions);
    for (const production of productions) {
      if (!production.posterId) continue;
      const poster = rivalPosterById(production.posterId);
      expect(poster).not.toBeNull();
      expect(poster?.animeTypes).toContain(production.animeType);
    }
  });`;
  const close = test.lastIndexOf("\n});");
  if (close < 0) throw new Error("Could not locate awards polish describe close");
  test = test.slice(0, close) + insert + test.slice(close);
  write(testPath, test);
}

console.log("Awards title/type/layout v5 polish applied.");
