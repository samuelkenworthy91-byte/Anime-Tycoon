import {
  ARCS,
  GENRES,
  PETS,
  PROTAGONISTS,
  SECONDARY,
  VILLAINS,
  type AudienceId,
  type CastMember,
  type CastRole,
  type Draft,
  type GenreId,
  type Staff,
} from "./data";

/** A creator's personal brief is deliberately not the same thing as studio meta knowledge. */
export interface CreatorVision {
  title: string;
  primaryGenre: GenreId;
  secondaryGenre?: GenreId;
  audience: AudienceId;
  cast: Partial<Record<CastRole, string>>;
  arcs: string[];
  sliders: [number, number, number];
}

export interface VisionAlignment {
  score: number;
  matched: number;
  total: number;
}

export interface VisionEffects {
  outputMult: number;
  xpMult: number;
  moraleDelta: number;
  label: "ignored" | "compromised" | "mixed" | "supported" | "auteur";
}

const TITLE_WORDS: Record<GenreId, [string[], string[]]> = {
  mecha: [["Iron", "Steel", "Chrome", "Titan", "Nova"], ["Frame", "Vanguard", "Gear", "Lancer", "Protocol"]],
  isekai: [["Otherworld", "Second", "Lost", "Summoned", "Reborn"], ["Gate", "Chronicle", "Kingdom", "Quest", "Pilgrim"]],
  slice: [["After School", "Quiet", "Summer", "Everyday", "Sunday"], ["Days", "Notebook", "Cafe", "Letters", "Routine"]],
  horror: [["Crimson", "Hollow", "Bleeding", "Midnight", "Silent"], ["Chapel", "Ward", "House", "Smile", "Signal"]],
  romance: [["First", "Secret", "Falling", "Starlit", "Unsent"], ["Confession", "Promise", "Kiss", "Letters", "Heartbeat"]],
  sports: [["Final", "Rising", "Overtime", "Golden", "Breakaway"], ["Serve", "Eleven", "Sprint", "Court", "Captain"]],
  cyber: [["Neon", "Null", "Ghost", "Chrome", "Zero"], ["Protocol", "Circuit", "Memory", "Firewall", "District"]],
  fantasy: [["Silver", "Dragon", "Ancient", "Moonlit", "Crownless"], ["Oath", "Kingdom", "Grimoire", "Quest", "Throne"]],
  idol: [["Starlight", "Encore", "Prism", "Dream", "Stage"], ["Beat", "Promise", "Seven", "Melody", "Spotlight"]],
  mystery: [["Last", "Hidden", "Glass", "Vanishing", "Locked"], ["Clue", "Room", "Witness", "Case", "Answer"]],
  comedy: [["Disaster", "Lucky", "Chaotic", "Perfect", "Ridiculous"], ["Club", "Roommate", "Plan", "Senpai", "Tuesday"]],
  cooking: [["Midnight", "Golden", "Secret", "Kitchen", "Sweet"], ["Recipe", "Bento", "Table", "Chef", "Feast"]],
  military: [["Black", "Iron", "Last", "Ashen", "Northern"], ["Company", "Front", "Order", "Brigade", "Campaign"]],
  supernatural: [["Spirit", "Moon", "Cursed", "Hidden", "Thirteenth"], ["Contract", "Shrine", "Hour", "Veil", "Exorcist"]],
  space: [["Star", "Solar", "Void", "Orion", "Far"], ["Voyage", "Frontier", "Signal", "Colony", "Horizon"]],
  magical: [["Crystal", "Radiant", "Moon", "Miracle", "Prism"], ["Witch", "Heart", "Wand", "Promise", "Bloom"]],
  survival: [["Last", "Broken", "Wild", "Cold", "After"], ["Shelter", "Island", "Winter", "Camp", "Tomorrow"]],
  pirate: [["Crimson", "Black", "Storm", "Seven", "Rogue"], ["Tide", "Flag", "Voyage", "Compass", "Fortune"]],
  martial: [["Iron", "Burning", "Hundred", "Dragon", "Last"], ["Fist", "Dojo", "Strike", "Disciple", "Style"]],
  mythology: [["Olympian", "Fallen", "Sacred", "Divine", "Forgotten"], ["Oracle", "Pantheon", "Labyrinth", "Oath", "Titan"]],
  nordic: [["Frost", "Raven", "Wolf", "Runic", "Winter"], ["Saga", "Oath", "Hall", "Voyage", "Crown"]],
  samurai: [["Crimson", "Wandering", "Last", "Moonlit", "Broken"], ["Ronin", "Blade", "Daimyo", "Oath", "Duel"]],
  shinobi: [["Shadow", "Silent", "Hidden", "Moon", "Black"], ["Clan", "Scroll", "Mask", "Mission", "Kunai"]],
  vampire: [["Scarlet", "Velvet", "Blood", "Nocturne", "Pale"], ["Countess", "Covenant", "Moon", "Rose", "Thirst"]],
  grimdark: [["Ashen", "Rotten", "Black", "Dying", "Iron"], ["Crown", "Pilgrim", "Siege", "Saint", "Kingdom"]],
  monster_taming: [["Pocket", "Wild", "Primal", "Crystal", "Bonded"], ["Beasts", "Tamers", "League", "Companions", "Quest"]],
  crime: [["Black", "Last", "Silent", "Broken", "Tokyo"], ["Alibi", "District", "Witness", "Case", "Syndicate"]],
  kaiju: [["Titan", "Colossus", "Red", "Pacific", "Rising"], ["Protocol", "Impact", "Roar", "Zero", "Breaker"]],
  cosmic_horror: [["Outer", "Nameless", "Distant", "Impossible", "Starless"], ["Signal", "God", "Dream", "Abyss", "Geometry"]],
  arabia: [["Golden", "Desert", "Sapphire", "Moonlit", "Silk"], ["Caravan", "Djinn", "Palace", "Oasis", "Thief"]],
};

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rngFor(seed: string) {
  let a = hash(seed) || 1;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function choose<T>(rng: () => number, values: readonly T[]): T {
  return values[Math.min(values.length - 1, Math.floor(rng() * values.length))];
}

/** 25 curated word-pairs plus four title forms per genre = 100+ genre-appropriate forms per genre. */
export function genreTitle(seed: string, genre: GenreId): string {
  const rng = rngFor(seed + ":title:" + genre);
  const words = TITLE_WORDS[genre];
  const left = choose(rng, words[0]);
  const right = choose(rng, words[1]);
  const form = Math.floor(rng() * 4);
  if (form === 1) return "The " + left + " " + right;
  if (form === 2) return left + ": " + right;
  if (form === 3) return left + " " + right + " Chronicle";
  return left + " " + right;
}

function castPick(rng: () => number, pool: readonly CastMember[], genres: GenreId[]): string {
  const fitting = pool.filter((m) => m.visibleAff.some((g) => genres.includes(g)));
  return choose(rng, fitting.length ? fitting : pool).id;
}

export function generateCreatorVision(
  seed: string,
  primaryGenre: GenreId,
  unlockedGenres: readonly GenreId[],
  staff: Pick<Staff, "id" | "favGenre">,
): CreatorVision {
  const rng = rngFor(seed + ":" + staff.id);
  const alternatives = unlockedGenres.filter((g) => g !== primaryGenre);
  const secondaryGenre = alternatives.length && rng() < 0.55 ? choose(rng, alternatives) : undefined;
  const genres = secondaryGenre ? [primaryGenre, secondaryGenre] : [primaryGenre];
  const audience = choose(rng, ["kids", "teens", "adults", "family"] as const);
  const arcPool = ARCS.filter((a) => !a.franchiseOnly);
  const preferred = arcPool.filter((a) => a.syn?.some((g) => genres.includes(g)));
  const source = preferred.length >= 3 ? preferred : arcPool;
  const arcs: string[] = [];
  while (arcs.length < Math.min(3, source.length)) {
    const id = choose(rng, source).id;
    if (!arcs.includes(id)) arcs.push(id);
  }
  const primary = GENRES.find((g) => g.id === primaryGenre)!;
  const secondary = secondaryGenre ? GENRES.find((g) => g.id === secondaryGenre) : undefined;
  const sliders = primary.ideal.map((n, i) => {
    const base = secondary ? Math.round((n + secondary.ideal[i]) / 2) : n;
    return Math.max(0, Math.min(100, base + Math.round((rng() - 0.5) * 32)));
  }) as [number, number, number];
  return {
    title: genreTitle(seed, primaryGenre),
    primaryGenre,
    secondaryGenre,
    audience,
    cast: {
      protag: castPick(rng, PROTAGONISTS, genres),
      secondary: castPick(rng, SECONDARY, genres),
      pet: castPick(rng, PETS, genres),
      villain: castPick(rng, VILLAINS, genres),
    },
    arcs,
    sliders,
  };
}

export function visionAlignment(draft: Draft, vision: CreatorVision): VisionAlignment {
  let matched = 0;
  let total = 0;
  const add = (ok: boolean, weight = 1) => { total += weight; if (ok) matched += weight; };
  add(draft.title.trim().toLowerCase() === vision.title.trim().toLowerCase(), 1.5);
  add(draft.genres.includes(vision.primaryGenre), 1.5);
  if (vision.secondaryGenre) add(draft.genres.includes(vision.secondaryGenre));
  add(draft.audience === vision.audience);
  add(draft.protag === vision.cast.protag, 0.75);
  add(draft.secondary === vision.cast.secondary, 0.75);
  add(draft.pet === vision.cast.pet, 0.75);
  add(draft.villain === vision.cast.villain, 0.75);
  for (const arc of vision.arcs) add(draft.arcs.includes(arc));
  vision.sliders.forEach((target, i) => add(Math.abs((draft.sliders[i] ?? 50) - target) <= 12, 0.5));
  return { score: total ? Math.round((matched / total) * 100) : 50, matched, total };
}

export function visionEffects(alignment: number | VisionAlignment): VisionEffects {
  const score = typeof alignment === "number" ? alignment : alignment.score;
  if (score < 30) return { outputMult: 0.90, xpMult: 0.85, moraleDelta: -8, label: "ignored" };
  if (score < 50) return { outputMult: 0.95, xpMult: 0.95, moraleDelta: -3, label: "compromised" };
  if (score < 70) return { outputMult: 1, xpMult: 1, moraleDelta: 0, label: "mixed" };
  if (score < 88) return { outputMult: 1.07, xpMult: 1.15, moraleDelta: 5, label: "supported" };
  return { outputMult: 1.10, xpMult: 1.25, moraleDelta: 8, label: "auteur" };
}

export function creatorVisionEffectsForProject(
  promises: readonly { staffId: string; projectId?: string; vision?: CreatorVision }[] | undefined,
  project: { id: string; draft: Draft },
  staffId: string,
): VisionEffects {
  const promise = promises?.find((p) => p.staffId === staffId && p.projectId === project.id && p.vision);
  return promise?.vision
    ? visionEffects(visionAlignment(project.draft, promise.vision))
    : { outputMult: 1, xpMult: 1, moraleDelta: 0, label: "mixed" };
}
