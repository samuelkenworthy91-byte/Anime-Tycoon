import type { AnimeType, GenreId } from "./data";

type Rng = () => number;
type Theme = "action" | "romance" | "horror" | "fantasy" | "scifi" | "sports" | "music" | "cozy" | "crime" | "adventure" | "monster" | "comedy";

const GENRE_THEMES: Record<GenreId, Theme[]> = {
  mecha: ["scifi", "action"],
  isekai: ["fantasy", "adventure"],
  slice: ["cozy", "romance"],
  horror: ["horror"],
  romance: ["romance"],
  sports: ["sports", "action"],
  cyber: ["scifi", "crime"],
  fantasy: ["fantasy", "adventure"],
  idol: ["music", "romance"],
  mystery: ["crime", "horror"],
  comedy: ["comedy", "cozy"],
  cooking: ["cozy", "comedy"],
  military: ["action", "crime"],
  supernatural: ["horror", "fantasy"],
  space: ["scifi", "adventure"],
  magical: ["fantasy", "romance"],
  survival: ["action", "horror"],
  pirate: ["adventure", "action"],
  martial: ["action", "sports"],
  mythology: ["fantasy", "adventure"],
  nordic: ["fantasy", "adventure"],
  samurai: ["action", "adventure"],
  shinobi: ["action", "crime"],
  vampire: ["horror", "romance"],
  grimdark: ["horror", "fantasy"],
  monster_taming: ["monster", "adventure"],
  crime: ["crime"],
  kaiju: ["monster", "action"],
  cosmic_horror: ["horror", "scifi"],
  arabia: ["fantasy", "adventure"],
};

const GENRE_WORDS: Record<GenreId, string[]> = {
  mecha: ["Frame", "Gear", "Titan", "Steel", "Pilot", "Engine"],
  isekai: ["Another World", "Summoner", "Reincarnation", "Guild", "Portal", "Kingdom"],
  slice: ["After School", "Summer", "Neighbourhood", "Tea", "Days", "Letters"],
  horror: ["Grave", "Whisper", "Rot", "Night", "Hollow", "Curse"],
  romance: ["Heartbeat", "Promise", "Kiss", "Confession", "Spring", "Distance"],
  sports: ["Final", "Ace", "Court", "Pitch", "Sprint", "Rivals"],
  cyber: ["Neon", "Protocol", "Ghostcode", "Circuit", "Zero", "Firewall"],
  fantasy: ["Crown", "Dragon", "Rune", "Mage", "Kingdom", "Relic"],
  idol: ["Encore", "Stage", "Spotlight", "Melody", "Dream", "Starlight"],
  mystery: ["Case", "Alibi", "Witness", "Cipher", "Clue", "Vanishing"],
  comedy: ["Disaster", "Chaos", "Problem", "Club", "Oops", "Panic"],
  cooking: ["Kitchen", "Recipe", "Bento", "Supper", "Flavour", "Table"],
  military: ["Front", "Platoon", "Siege", "Command", "Banner", "Armistice"],
  supernatural: ["Spirit", "Shrine", "Omen", "Veil", "Exorcist", "Moon"],
  space: ["Orbit", "Nova", "Voyager", "Colony", "Cosmos", "Starship"],
  magical: ["Wand", "Charm", "Moon", "Ribbon", "Crystal", "Wish"],
  survival: ["Last Day", "Shelter", "Ash", "Wilds", "Signal", "Hunger"],
  pirate: ["Tide", "Treasure", "Corsair", "Compass", "Horizon", "Black Flag"],
  martial: ["Fist", "Dojo", "Strike", "Dragon", "Master", "Tournament"],
  mythology: ["Oracle", "Pantheon", "Labyrinth", "Hero", "Fate", "Temple"],
  nordic: ["Frost", "Rune", "Wolf", "Saga", "Raven", "Longship"],
  samurai: ["Ronin", "Blade", "Dawn", "Clan", "Duel", "Chrysanthemum"],
  shinobi: ["Shadow", "Mask", "Moon", "Scroll", "Silent Step", "Smoke"],
  vampire: ["Blood", "Crimson", "Nocturne", "Fang", "Velvet", "Midnight"],
  grimdark: ["Ash", "Throne", "Grief", "Black Sun", "Oath", "Carrion"],
  monster_taming: ["Tamer", "Egg", "Familiar", "Bestiary", "Bond", "Wildkin"],
  crime: ["Underworld", "Heist", "Badge", "Syndicate", "Getaway", "Informant"],
  kaiju: ["Colossus", "Impact", "Leviathan", "Evacuation", "Titan", "Faultline"],
  cosmic_horror: ["Abyss", "Signal", "Void", "Witness", "Geometry", "Beyond"],
  arabia: ["Sands", "Djinn", "Bazaar", "Moon", "Caravan", "Palace"],
};

const BANKS: Record<Theme, { adjectives: string[]; nouns: string[]; places: string[]; people: string[]; verbs: string[]; past: string[] }> = {
  action: {
    adjectives: ["Crimson", "Last", "Raging", "Broken", "Iron", "Savage", "Burning", "Zero"],
    nouns: ["Blade", "Fang", "Strike", "Rebellion", "Vanguard", "Oath", "Storm", "Trigger"],
    places: ["the Arena", "Red City", "the Border", "Black Ridge", "the Last Gate", "the Front"],
    people: ["Fighter", "Hunter", "Rival", "Outlaw", "Champion", "Warrior"],
    verbs: ["Break", "Defy", "Chase", "Crush", "Cross", "Awaken"],
    past: ["Broke", "Defied", "Crossed", "Shattered", "Chased", "Awakened"],
  },
  romance: {
    adjectives: ["Secret", "Blue", "First", "Last", "Tender", "Distant", "Unspoken", "April"],
    nouns: ["Promise", "Heartbeat", "Letter", "Confession", "Distance", "Spring", "Memory", "Kiss"],
    places: ["Platform Three", "the Rooftop", "Our Classroom", "the Seaside", "the Last Train", "Maple Street"],
    people: ["Classmate", "Senpai", "Roommate", "Stranger", "Childhood Friend", "Neighbour"],
    verbs: ["Remember", "Wait For", "Meet", "Choose", "Find", "Tell"],
    past: ["Waited", "Met", "Chose", "Found", "Promised", "Returned"],
  },
  horror: {
    adjectives: ["Hollow", "Black", "Rotten", "Silent", "Pale", "Unseen", "Thirteenth", "Dead"],
    nouns: ["Whisper", "Curse", "Mouth", "House", "Skin", "Bell", "Grave", "Shadow"],
    places: ["the Basement", "Mourning Hill", "Room 13", "the Old Shrine", "the Empty Ward", "Below"],
    people: ["Witness", "Exorcist", "Missing Girl", "Undertaker", "Medium", "Neighbour"],
    verbs: ["Bury", "Watch", "Open", "Follow", "Name", "Wake"],
    past: ["Buried", "Watched", "Opened", "Followed", "Named", "Woke"],
  },
  fantasy: {
    adjectives: ["Golden", "Cursed", "Forgotten", "Moonlit", "Ancient", "Fallen", "Seventh", "Emerald"],
    nouns: ["Crown", "Rune", "Dragon", "Grimoire", "Kingdom", "Relic", "Throne", "Star"],
    places: ["the Seven Kingdoms", "Moonfall", "the Glass Forest", "the Far Tower", "the Sunken Realm", "Aster Vale"],
    people: ["Mage", "Prince", "Witch", "Knight", "Alchemist", "Saint"],
    verbs: ["Summon", "Rule", "Restore", "Steal", "Save", "Awaken"],
    past: ["Summoned", "Ruled", "Restored", "Stole", "Saved", "Awakened"],
  },
  scifi: {
    adjectives: ["Neon", "Quantum", "Chrome", "Dead", "Synthetic", "Orbital", "Electric", "Zero"],
    nouns: ["Protocol", "Signal", "Circuit", "Colony", "Ghost", "Vector", "Core", "Archive"],
    places: ["Sector Nine", "Low Orbit", "the Neon Ward", "Mars", "the Last Server", "Station K"],
    people: ["Pilot", "Android", "Courier", "Engineer", "Clone", "Hacker"],
    verbs: ["Override", "Escape", "Decode", "Reboot", "Hack", "Reach"],
    past: ["Overrode", "Escaped", "Decoded", "Rebooted", "Hacked", "Reached"],
  },
  sports: {
    adjectives: ["Final", "Rising", "Golden", "Last", "Perfect", "Wild", "Second", "Underdog"],
    nouns: ["Ace", "Sprint", "Rally", "Pitch", "Court", "Goal", "Serve", "Climb"],
    places: ["Nationals", "Centre Court", "the Final Lap", "North Stadium", "the Mountain", "Summer Camp"],
    people: ["Ace", "Rookie", "Captain", "Striker", "Runner", "Prodigy"],
    verbs: ["Win", "Climb", "Serve", "Run", "Fight", "Return"],
    past: ["Won", "Climbed", "Served", "Ran", "Fought", "Returned"],
  },
  music: {
    adjectives: ["Electric", "Midnight", "Golden", "Last", "Secret", "Neon", "Perfect", "Fading"],
    nouns: ["Encore", "Melody", "Stage", "Chorus", "Spotlight", "Beat", "Harmony", "Song"],
    places: ["the Main Stage", "Studio B", "the Summer Festival", "Backstage", "the Dome", "the Last Encore"],
    people: ["Idol", "Singer", "Guitarist", "Rookie", "Composer", "Fan"],
    verbs: ["Sing", "Shine", "Perform", "Hear", "Chase", "Remember"],
    past: ["Sang", "Shone", "Performed", "Heard", "Chased", "Remembered"],
  },
  cozy: {
    adjectives: ["Little", "Warm", "Sunday", "Quiet", "Sweet", "Sunny", "Tiny", "Late"],
    nouns: ["Cafe", "Lunchbox", "Garden", "Notebook", "Neighbourhood", "Recipe", "Afternoon", "Home"],
    places: ["the Corner Cafe", "Maple Street", "Our Kitchen", "the Shopping Arcade", "the Seaside", "Homeroom"],
    people: ["Neighbour", "Chef", "Club President", "Roommate", "Shopkeeper", "Classmate"],
    verbs: ["Cook", "Share", "Visit", "Grow", "Remember", "Stay"],
    past: ["Cooked", "Shared", "Visited", "Grew", "Remembered", "Stayed"],
  },
  crime: {
    adjectives: ["Dirty", "Last", "Midnight", "Cold", "Broken", "Black", "Double", "Silent"],
    nouns: ["Alibi", "Heist", "Badge", "Syndicate", "Case", "Witness", "Getaway", "Debt"],
    places: ["Ward Six", "the Back Alley", "the Harbour", "Midnight City", "the Precinct", "the Last Train"],
    people: ["Detective", "Thief", "Informant", "Inspector", "Fixer", "Witness"],
    verbs: ["Steal", "Expose", "Catch", "Betray", "Escape", "Trace"],
    past: ["Stole", "Exposed", "Caught", "Betrayed", "Escaped", "Traced"],
  },
  adventure: {
    adjectives: ["Far", "Lost", "Endless", "Bright", "Grand", "Hidden", "Blue", "Last"],
    nouns: ["Voyage", "Horizon", "Compass", "Road", "Map", "Expedition", "Treasure", "Frontier"],
    places: ["the World's Edge", "Blue Horizon", "the Forbidden Coast", "the Far North", "Cloud Harbor", "the Lost Road"],
    people: ["Explorer", "Captain", "Ranger", "Wanderer", "Treasure Hunter", "Guide"],
    verbs: ["Sail", "Cross", "Find", "Explore", "Reach", "Chase"],
    past: ["Sailed", "Crossed", "Found", "Explored", "Reached", "Chased"],
  },
  monster: {
    adjectives: ["Wild", "Ancient", "Colossal", "Hidden", "Pocket", "Raging", "Prime", "Emerald"],
    nouns: ["Beast", "Bond", "Colossus", "Egg", "Bestiary", "Roar", "Tamer", "Leviathan"],
    places: ["the Wild Zone", "Monster Isle", "the Crater", "the Great Reserve", "Kaiju Bay", "the Deep Forest"],
    people: ["Tamer", "Handler", "Ranger", "Rookie", "Keeper", "Hunter"],
    verbs: ["Tame", "Raise", "Defend", "Hatch", "Track", "Bond With"],
    past: ["Tamed", "Raised", "Defended", "Hatched", "Tracked", "Found"],
  },
  comedy: {
    adjectives: ["Ridiculous", "Worst", "Accidental", "Perfectly Normal", "Impossible", "Tiny", "Disastrous", "Awkward"],
    nouns: ["Problem", "Club", "Plan", "Disaster", "Roommate", "Deadline", "Secret", "Panic"],
    places: ["Class 2-B", "the Wrong Club", "My Apartment", "the Staff Room", "the Festival", "the Convenience Store"],
    people: ["Idiot", "Classmate", "Boss", "Neighbour", "Rival", "Genius"],
    verbs: ["Survive", "Hide From", "Impress", "Avoid", "Fix", "Outsmart"],
    past: ["Survived", "Hid From", "Impressed", "Avoided", "Fixed", "Outsmarted"],
  },
};

const SUFFIXES = ["Chronicle", "Requiem", "Days", "Theory", "Protocol", "Rising", "Zero", "EX", "After", "Beyond", "Frontier", "Nocturne"];
const ROMAN = ["II", "III", "IV", "V", "X", "Z", "R"];
const GENERIC_THEMES: Theme[] = ["action", "romance", "horror", "fantasy", "scifi", "sports", "music", "cozy", "crime", "adventure", "monster", "comedy"];

function pick<T>(items: readonly T[], rng: Rng): T {
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}

function unique<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

function themesFor(genres: readonly GenreId[], rng: Rng): Theme[] {
  const found = unique(genres.flatMap((genre) => GENRE_THEMES[genre] ?? []));
  return found.length ? found : [pick(GENERIC_THEMES, rng), pick(GENERIC_THEMES, rng)];
}

function genreWords(genres: readonly GenreId[]): string[] {
  return unique(genres.flatMap((genre) => GENRE_WORDS[genre] ?? []));
}

function capTitle(title: string): string {
  const clean = title.replace(/\s+/g, " ").replace(/\s+([:!?])/g, "$1").trim();
  if (clean.length <= 64) return clean;
  const clipped = clean.slice(0, 61);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > 40 ? lastSpace : 61).trim()}…`;
}

/**
 * Genre-aware anime title generator. The structures intentionally vary by
 * genre family: action/horror can be short and iconic, romance/slice-of-life
 * can be situational or emotional, and fantasy/isekai can use the longer
 * premise-like naming style common to modern light-novel adaptations.
 */
export function randomAnimeTitle(
  genres: readonly GenreId[] = [],
  animeType: AnimeType = "shonen",
  rng: Rng = Math.random,
): string {
  const themes = themesFor(genres, rng);
  const primary = BANKS[pick(themes, rng)];
  const secondary = BANKS[pick(themes, rng)];
  const specific = genreWords(genres);
  const noun = () => (specific.length && rng() < 0.55 ? pick(specific, rng) : pick(primary.nouns, rng));
  const noun2 = () => (specific.length && rng() < 0.4 ? pick(specific, rng) : pick(secondary.nouns, rng));
  const adj = () => pick(primary.adjectives, rng);
  const place = () => pick(secondary.places, rng);
  const person = () => pick(primary.people, rng);
  const verb = () => pick(primary.verbs, rng);
  const past = () => pick(secondary.past, rng);

  const fantasyLike = genres.some((g) => ["isekai", "fantasy", "magical", "mythology", "nordic", "arabia", "grimdark"].includes(g));
  const romanceLike = genres.some((g) => ["romance", "slice", "idol", "cooking"].includes(g)) || animeType === "shojo";
  const darkLike = genres.some((g) => ["horror", "cosmic_horror", "vampire", "mystery", "crime", "grimdark"].includes(g));
  const actionLike = genres.some((g) => ["mecha", "sports", "military", "survival", "pirate", "martial", "samurai", "shinobi", "kaiju", "monster_taming"].includes(g));

  const roll = rng();
  let title: string;

  if (fantasyLike && roll < 0.24) {
    const premise = pick([
      `I Became the ${person()} of ${place()}`,
      `Reborn With a ${noun()}, I Have to ${verb()} the Kingdom`,
      `The ${person()} Who ${past()} the ${noun2()}`,
      `My Second Life Begins With a ${noun()}`,
      `Banished From the Guild, I Found the ${noun2()}`,
    ], rng);
    title = premise;
  } else if (romanceLike && roll < 0.30) {
    title = pick([
      `My ${adj()} ${person()} Won't ${verb()} Me`,
      `${noun()} After School`,
      `The Day We ${past()} at ${place()}`,
      `${adj()} ${noun()} Between Us`,
      `I Still Remember ${place()}`,
      `Our ${noun()} Is a Little Complicated`,
    ], rng);
  } else if (darkLike && roll < 0.48) {
    title = pick([
      `${adj()} ${noun()}`,
      `The ${noun()} Below ${place()}`,
      `${noun()}: ${adj()} ${noun2()}`,
      `Do Not ${verb()} the ${noun2()}`,
      `Where the ${noun()} Sleeps`,
    ], rng);
  } else if (actionLike && roll < 0.52) {
    title = pick([
      `${adj()} ${noun()}`,
      `${noun()} ${pick(SUFFIXES, rng)}`,
      `${noun()}: ${adj()} ${noun2()}`,
      `${verb()} the ${noun2()}`,
      `${noun()} ${pick(ROMAN, rng)}`,
    ], rng);
  } else {
    title = pick([
      `${adj()} ${noun()}`,
      `${noun()} of ${place()}`,
      `The ${noun()} and the ${noun2()}`,
      `${noun()}: ${adj()} ${noun2()}`,
      `Where ${noun()} Bloom`,
      `${noun()} ${pick(SUFFIXES, rng)}`,
      `The ${person()} Who ${past()} the ${noun2()}`,
      `After the ${noun()}, We ${verb()}`,
      `${adj()} ${noun()} ${pick(ROMAN, rng)}`,
    ], rng);
  }

  return capTitle(title);
}
