import {
  Bot,
  Sparkles,
  Coffee,
  Ghost,
  Heart,
  Trophy,
  Cpu,
  Sword,
  Mic2,
  Eye,
  Laugh,
  ChefHat,
  Crosshair,
  Wand2,
  Rocket,
  Tent,
  Ship,
  Hand,
  Landmark,
  MountainSnow,
  type LucideIcon,
} from "lucide-react";
import genreV2Runtime from "./generated/genreV2.json";

/* ------------------------------------------------------------------ types */
export type GenreId =
  | "mecha"
  | "isekai"
  | "slice"
  | "horror"
  | "romance"
  | "sports"
  | "cyber"
  | "fantasy"
  | "idol"
  | "mystery"
  | "comedy"
  | "cooking"
  | "military"
  | "supernatural"
  | "space"
  | "magical"
  | "survival"
  | "pirate"
  | "martial"
  | "mythology"
  | "nordic";

export type AnimeType = "shonen" | "shojo";

export type MediumId = "tv" | "movie" | "ona";
export type BudgetId = "indie" | "standard" | "blockbuster";
export type ScopeId = "short" | "standard" | "extended" | "prestige";
export type SlotId = "midnight" | "evening" | "prime" | "stream";
export type AudienceId = "kids" | "teens" | "adults" | "family";
export type StaffRole = "writer" | "animator" | "composer";
export type PointType = "story" | "art" | "sound";
export type CastRole = "protag" | "secondary" | "pet" | "villain";

export interface Genre {
  id: GenreId;
  label: string;
  color: string;
  icon: LucideIcon;
  desc: string;
  /** ideal slider value per phase (0..100, % toward first aspect) */
  ideal: [number, number, number];
  /** target mix of Story / Art / Sound points (sums to 1) */
  ratio: [number, number, number];
  /** research data cost to unlock (0 = available from the start) */
  rd: number;
}

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  /** per-discipline skill 10..99 */
  story: number;
  art: number;
  sound: number;
  level: number;
  salary: number; // per week
  cost: number; // signing fee
  stamina: number; // 0..100, drains with work
  /** index into STAFF_PORTRAITS (legacy; kept so old saves still load) */
  portrait: number;
  /** index into WORKER_LOOKS — the painted model used for the office sprite,
      the desk sprite on the production floor AND the menu portrait */
  look?: number;
  /* ---- career (engine/careers.ts fills + maintains these) ---- */
  /** lifetime career experience; level derives from it */
  xp?: number;
  /** 0..100 — long-term happiness (stamina is short-term energy) */
  morale?: number;
  /** 1-3 personality trait ids (see TRAIT_DEFS) */
  traits?: string[];
  /** specialisation id (see SPEC_DEFS), role-specific */
  spec?: string;
  /** favourite genre — matters for the Genre Fanatic trait & morale */
  favGenre?: GenreId;
  /** week this person signed with the studio */
  joinedWeek?: number;
  /** shipped shows this person worked on (most recent last) */
  shows?: { title: string; score: number; week: number }[];
  awardsWon?: number;
  bestShow?: { title: string; score: number } | null;
  lastTrainedWeek?: number;
  /** cooldown so salary/poach events do not spam */
  lastEventWeek?: number;
}

export interface CastMember {
  id: string;
  name: string;
  archetype: string;
  /** image path; if `pos` is set the file is a 2x2 portrait sheet */
  img: string;
  personality: string;
  role: CastRole;
  type: AnimeType;
  visibleAff: [GenreId, GenreId];
  hiddenAff: GenreId;
  gender: string;
  species: string;
  ageBand: string;
  culturalBasis: string;
  /** only synthetic records used to keep corrupt/ancient history readable */
  legacyPlaceholder?: boolean;
}

export type ArcUnlock =
  | { kind: "rd"; cost: number }
  | { kind: "genre"; genre: GenreId }
  | { kind: "franchise" }
  | { kind: "hits"; n: number }
  | { kind: "shows"; n: number }
  | { kind: "score"; n: number }
  | { kind: "staff"; n: number };

export interface Arc {
  id: string;
  name: string;
  cost: number;
  q: number;
  f: number;
  desc: string;
  syn?: GenreId[];
  synQ?: number;
  synF?: number;
  franchiseOnly?: boolean;
  /** synergy bonus if the matching cast slot's affinities fit the genres */
  cast?: CastRole;
  castQ?: number;
  /** genres where this beat tends to fight the tone — hidden until learned */
  anti?: GenreId[];
  antiQ?: number;
  antiF?: number;
  /** what must be true before this arc can be picked */
  unlock?: ArcUnlock;
}

export interface Draft {
  title: string;
  medium: MediumId;
  budget: BudgetId;
  /** production ambition: larger scopes cost more, take longer and strain departments */
  scope?: ScopeId;
  slot: SlotId;
  /** required for every new production; migration backfills legacy drafts */
  animeType: AnimeType;
  genres: GenreId[];
  audience: AudienceId;
  protag: string;
  protagName: string;
  /** Final billing names are locked after editing; optional keeps old saves valid. */
  secondaryName?: string;
  petName?: string;
  villainName?: string;
  secondary: string;
  pet: string;
  villain: string;
  arcs: string[];
  sliders: [number, number, number];
  franchiseKey?: string;
  season: number;
  /** which kind of franchise continuation this is (unset = original) */
  continuation?: "season" | "movie" | "ova" | "side" | "prequel" | "spinoff" | "reboot" | "crossover";
  /** crossover partner franchise */
  crossKey?: string;
  /** spin-off featured character (cast id from the parent IP) */
  spinChar?: string;
}

/* ---------------------------------------------------------------- genres */
const GENRE_COLORS: Record<GenreId, string> = {
  mecha: "#7af0ff", isekai: "#a78bfa", slice: "#ffd166", horror: "#a3e635", romance: "#ff5e7a",
  sports: "#fbbf24", cyber: "#22d3ee", fantasy: "#c084fc", idol: "#f472b6", mystery: "#94a3b8",
  comedy: "#ffb347", cooking: "#e76f51", military: "#6a994e", supernatural: "#9d4edd", space: "#4cc9f0",
  magical: "#f72585", survival: "#84a98c", pirate: "#2a9d8f", martial: "#e63946", mythology: "#d4a373", nordic: "#8ecae6",
};
const GENRE_ICONS: Record<GenreId, LucideIcon> = {
  mecha: Bot, isekai: Sparkles, slice: Coffee, horror: Ghost, romance: Heart, sports: Trophy, cyber: Cpu,
  fantasy: Sword, idol: Mic2, mystery: Eye, comedy: Laugh, cooking: ChefHat, military: Crosshair,
  supernatural: Wand2, space: Rocket, magical: Sparkles, survival: Tent, pirate: Ship, martial: Hand,
  mythology: Landmark, nordic: MountainSnow,
};

export const GENRES: Genre[] = genreV2Runtime.genres.map((g) => ({
  id: g.id as GenreId,
  label: g.label,
  color: GENRE_COLORS[g.id as GenreId],
  icon: GENRE_ICONS[g.id as GenreId],
  desc: g.description,
  ideal: g.ideal as [number, number, number],
  ratio: g.ratio as [number, number, number],
  rd: g.rd,
}));

export const GENRE = (id: GenreId) => GENRES.find((g) => g.id === id)!;

/* genre-pair synergy matrix (GDT-style "great combos") */
export const COMBO: Record<string, number> = Object.fromEntries(
  genreV2Runtime.combos
    .filter((c) => c.discovery_class !== "experimental" && c.learned_multiplier !== 1)
    .map((c) => [c.key, c.learned_multiplier])
);
export const comboKey = (genres: GenreId[]) => [...genres].sort().join("|");
/** Secret pairings that are WEIRDLY successful — hidden until you ship one. */
export const SECRET_COMBOS: Record<string, number> = Object.fromEntries(
  genreV2Runtime.combos
    .filter((c) => c.discovery_class === "experimental")
    .map((c) => [c.key, c.learned_multiplier])
);
export const secretComboKey = (genres: GenreId[]) => comboKey(genres) in SECRET_COMBOS ? comboKey(genres) : null;

export const comboMult = (genres: GenreId[], discovered = true) => {
  if (genres.length !== 2) return 1;
  const k = comboKey(genres);
  if (k in SECRET_COMBOS) return discovered ? SECRET_COMBOS[k] : 1;
  return COMBO[k] ?? 1;
};
export const comboLabel = (genres: GenreId[], discovered = true) => {
  if (genres.length < 2) return { label: "Single genre — focused", cls: "text-cyanx", mult: 1 };
  const k = comboKey(genres);
  if (k in SECRET_COMBOS && !discovered)
    return { label: "UNKNOWN PAIRING — ship it to find out", cls: "text-viol", mult: 1, secret: true };
  const m = comboMult(genres, discovered);
  if (k in SECRET_COMBOS)
    return { label: "SECRET COMBO!", cls: "text-viol", mult: m, secret: true };
  if (m >= 1.2) return { label: "GREAT COMBO!", cls: "text-gold", mult: m };
  if (m >= 1.08) return { label: "Good synergy", cls: "text-mint", mult: m };
  if (m >= 0.95) return { label: "Safe pairing", cls: "text-paper/70", mult: m };
  return { label: "RISKY MIX…", cls: "text-neon", mult: m };
};
/** combo level 0-5 raises quality the more you refine a pairing (Game Dev Story style) */
export const comboLevelBonus = (lv: number) => 1 + Math.min(5, lv) * 0.035;

/* ---------------------------------------------------------------- economy */
export const MEDIUMS: Record<MediumId, { label: string; desc: string; costMult: number; reach: number; weeks: number; rd: number }> = {
  tv: { label: "TV Series", desc: "12 episodes. The classic grind.", costMult: 1, reach: 1, weeks: 0, rd: 0 },
  ona: { label: "ONA Shorts", desc: "Cheap net mini-series for the fans.", costMult: 0.62, reach: 0.78, weeks: -3, rd: 0 },
  movie: { label: "Theatrical Film", desc: "Big screen, big risk, big reward.", costMult: 1.7, reach: 1.5, weeks: 4, rd: 40 },
};

export interface ProductionScope {
  label: string;
  shortLabel: string;
  desc: string;
  weeksMult: number;
  costMult: number;
  workMult: number;
  audienceMult: number;
  minOffice: number;
  minStaff: number;
  /** how many major story beats this format can carry without feeling crammed */
  arcLimit: number;
}

export const PRODUCTION_SCOPES: Record<ScopeId, ProductionScope> = {
  short: { label: "Short Run", shortLabel: "SHORT", desc: "Lean, focused and forgiving — ideal for a small crew.", weeksMult: 0.78, costMult: 0.78, workMult: 0.72, audienceMult: 0.78, minOffice: 0, minStaff: 0, arcLimit: 3 },
  standard: { label: "Standard Production", shortLabel: "STANDARD", desc: "The normal seasonal production target.", weeksMult: 1, costMult: 1, workMult: 1, audienceMult: 1, minOffice: 0, minStaff: 0, arcLimit: 4 },
  extended: { label: "Extended Production", shortLabel: "EXTENDED", desc: "More episodes, more cuts and a much heavier pipeline.", weeksMult: 1.42, costMult: 1.5, workMult: 1.45, audienceMult: 1.18, minOffice: 1, minStaff: 3, arcLimit: 5 },
  prestige: { label: "Prestige Production", shortLabel: "PRESTIGE", desc: "An event-scale slate anchor. Huge ceiling, brutal departmental demand.", weeksMult: 1.82, costMult: 2.15, workMult: 1.9, audienceMult: 1.38, minOffice: 2, minStaff: 5, arcLimit: 6 },
};

export const scopeLabel = (scope: ScopeId, medium: MediumId) => {
  if (scope === "short") return medium === "movie" ? "Short Feature" : medium === "ona" ? "Short Run" : "Short Cour";
  if (scope === "standard") return medium === "movie" ? "Standard Feature" : medium === "ona" ? "Streaming Season" : "Standard Cour";
  if (scope === "extended") return medium === "movie" ? "Major Feature" : medium === "ona" ? "Full Streaming Season" : "Double Cour";
  return medium === "movie" ? "Event Film" : medium === "ona" ? "Prestige Streaming Event" : "Prestige Series";
};

export const BUDGETS: Record<BudgetId, { label: string; cost: number; scope: number; desc: string; heat: number }> = {
  indie: { label: "Ink & Paper Indie", cost: 40_000, scope: 0.85, desc: "Tiny team, huge heart.", heat: 0 },
  standard: { label: "Standard Production", cost: 120_000, scope: 1.0, desc: "Full pipeline, sane deadlines.", heat: 0.15 },
  blockbuster: { label: "Blockbuster Line", cost: 320_000, scope: 1.32, desc: "Insane sakuga. Insane invoices.", heat: 0.3 },
};

export const SLOTS: Record<SlotId, { label: string; cost: number; reach: number; best: GenreId[]; desc: string }> = {
  midnight: { label: "Midnight Otaku Slot", cost: 6_000, reach: 0.78, best: ["horror", "mystery", "cyber", "slice", "supernatural", "survival"], desc: "Cheap airtime for devoted weirdos." },
  evening: { label: "Evening Family Slot", cost: 40_000, reach: 1.15, best: ["romance", "slice", "fantasy", "comedy", "cooking", "magical", "mythology"], desc: "Dinner-table viewing." },
  stream: { label: "Global Streaming", cost: 60_000, reach: 1.35, best: ["isekai", "fantasy", "cyber", "horror", "space", "supernatural"], desc: "Day-one simulcast worldwide." },
  prime: { label: "Prime-Time Saturday", cost: 110_000, reach: 1.62, best: ["sports", "mecha", "idol", "military", "martial", "pirate"], desc: "The whole nation watches." },
};

export const AUDIENCES: Record<AudienceId, { label: string; mult: number; fit: Partial<Record<GenreId, number>>; desc: string }> = {
  kids: { label: "Saturday Kids", mult: 1.0, fit: { sports: 1.15, idol: 1.1, mecha: 1.05, horror: 0.7, cyber: 0.8, mystery: 0.9, romance: 0.9, comedy: 1.15, cooking: 1.1, magical: 1.1, supernatural: 0.85, military: 0.95, space: 1.0, pirate: 1.1, martial: 1.1, mythology: 1.05, survival: 0.8, nordic: 0.9 }, desc: "Toys sell themselves." },
  teens: { label: "Teen Fever", mult: 1.05, fit: { isekai: 1.15, horror: 1.05, mecha: 1.0, romance: 1.0, idol: 1.05, slice: 0.95, comedy: 1.05, supernatural: 1.1, space: 1.05, military: 1.05, cooking: 0.95, magical: 0.95, sports: 1.15, martial: 1.12, pirate: 1.08, survival: 1.05, mythology: 1.02 }, desc: "Loud, loyal, extremely online." },
  adults: { label: "Seinen Adults", mult: 1.0, fit: { cyber: 1.2, mystery: 1.15, horror: 1.1, slice: 1.05, romance: 1.0, isekai: 0.95, military: 1.1, space: 1.05, comedy: 1.0, supernatural: 1.0, cooking: 1.0, magical: 0.85, survival: 1.12, nordic: 1.12, mythology: 1.08, pirate: 1.0, martial: 1.0 }, desc: "Discerning tastes, deep wallets." },
  family: { label: "All Ages", mult: 1.12, fit: { idol: 1.15, sports: 1.1, fantasy: 1.05, slice: 1.05, horror: 0.85, cyber: 0.9, comedy: 1.15, cooking: 1.15, magical: 1.1, space: 0.95, military: 0.85, supernatural: 0.9, pirate: 1.05, mythology: 1.05, martial: 1.0, survival: 0.9, nordic: 0.95 }, desc: "Hard to please everyone." },
};

/* ---------------------------------------------------------------- offices */
export interface Office {
  id: number;
  name: string;
  maxStaff: number;
  rent: number; // weekly
  cost: number; // relocation fee
  desks: number;
  /** how many major productions can run at the same time */
  projects: number;
  /** how many facility rooms can be built here */
  slots: number;
  blurb: string;
  bg: string;
}
export const OFFICES: Office[] = [
  { id: 0, name: "Bedroom Studio", maxStaff: 2, rent: 400, cost: 0, desks: 3, projects: 1, slots: 1, blurb: "A futon, a tablet and a dream.", bg: "img/bg-office-1.jpg" },
  { id: 1, name: "Anime Runner Building", maxStaff: 4, rent: 2_200, cost: 220_000, desks: 5, projects: 2, slots: 3, blurb: "Second floor above a ramen shop.", bg: "img/bg-office-2.jpg" },
  { id: 2, name: "Sakuga Tower", maxStaff: 6, rent: 6_500, cost: 1_100_000, desks: 7, projects: 3, slots: 5, blurb: "Glass walls. Real coffee. Legends work here.", bg: "img/bg-office-3.jpg" },
  { id: 3, name: "Neo District HQ", maxStaff: 9, rent: 18_000, cost: 4_600_000, desks: 10, projects: 4, slots: 7, blurb: "Rooftop terrace. Ping-pong table. Five coffee machines.", bg: "img/bg-office-3.jpg" },
  { id: 4, name: "Sakuga Global Campus", maxStaff: 12, rent: 55_000, cost: 18_000_000, desks: 13, projects: 5, slots: 10, blurb: "The whole industry orbits this address.", bg: "img/bg-office-3.jpg" },
];

/* --------------------------------------------------------------- research */
export interface ResearchItem {
  id: string;
  name: string;
  rd: number;
  desc: string;
}
export const RESEARCH: ResearchItem[] = [
  { id: "storyboard", name: "Storyboard Method", rd: 20, desc: "Story contribution checks gain +15% effective skill." },
  { id: "pipeline", name: "Digital Pipeline", rd: 28, desc: "All live contribution checks gain +12% effective skill." },
  { id: "qa", name: "Editing Room", rd: 24, desc: "Editing note-clear checks gain +15% effective skill and production issues are reduced." },
  { id: "marketing", name: "Marketing Dept.", rd: 30, desc: "Unlocks the big promo campaigns." },
  { id: "merch", name: "Merch Division", rd: 34, desc: "+18% revenue from every show." },
  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Art contribution checks gain +12% effective skill." },
  { id: "cg", name: "CG Assist", rd: 44, desc: "Animation department capacity +20%; blockbuster animation demand −10%." },
  { id: "local", name: "Localisation", rd: 48, desc: "+12% revenue from overseas markets." },
  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "Adds +35 effective skill to live editing checks." },
  { id: "merch2", name: "Global Merch", rd: 60, desc: "Merch revenue bonus rises to +30%." },
  { id: "genre_studies", name: "Genre Studies", rd: 32, desc: "Researches a starter set of arc-to-genre fits so the Story Arc screen can label them before you risk a production." },
  { id: "narrative_analytics", name: "Narrative Analytics", rd: 38, desc: "Researches several classic story structures, permanently revealing their combo ratings in the Story Arc planner." },
];

/* -------------------------------------------------------------- contracts */
export interface Contract {
  id: string;
  name: string;
  type: PointType;
  target: number;
  weeks: number;
  pay: number;
  rd: number;
}
const CONTRACT_POOL: { name: string; type: PointType }[] = [
  { name: "Light Novel Cover", type: "art" },
  { name: "Game Cutscene", type: "art" },
  { name: "Idol MV Insert", type: "sound" },
  { name: "Radio Drama CD", type: "sound" },
  { name: "Manga Script Doctor", type: "story" },
  { name: "Web Novel Adaptation", type: "story" },
  { name: "Ad Agency Short", type: "art" },
  { name: "Museum Anime Loop", type: "art" },
  { name: "Anthology Episode", type: "story" },
  { name: "Theme Song Arrange", type: "sound" },
];
let cid = 0;
export function rollContract(week: number): Contract {
  const base = CONTRACT_POOL[Math.floor(Math.random() * CONTRACT_POOL.length)];
  const scale = 1 + week / 90;
  const target = Math.round((16 + Math.random() * 26) * scale);
  const weeks = 2 + Math.floor(Math.random() * 3);
  return {
    id: `c${++cid}_${week}`,
    ...base,
    target,
    weeks,
    pay: Math.round((target * 900 + weeks * 4_000) / 500) * 500,
    rd: Math.max(2, Math.round(target / 6)),
  };
}

/* ------------------------------------------------------------------ promo */
export interface Promo {
  id: string;
  name: string;
  cost: number;
  hype: number;
  desc: string;
  locked?: boolean;
}
export const PROMOS: Promo[] = [
  { id: "pv", name: "Teaser PV", cost: 12_000, hype: 10, desc: "30 seconds of vibes, zero plot." },
  { id: "kv", name: "Key Visual Blitz", cost: 26_000, hype: 18, desc: "Station posters everywhere." },
  { id: "mag", name: "Magazine Spread", cost: 48_000, hype: 26, desc: "Six glossy pages of hype." },
  { id: "stage", name: "Expo Stage Event", cost: 95_000, hype: 40, desc: "Cast on stage, fans in tears.", locked: true },
];

/* ---------------------------------------------------------- cast helpers */
export {
  ANIME_TYPE_DESCRIPTION, ANIME_TYPE_LABEL, CAST_CHEMS, CAST_ROLE_LABEL, CAST_V2, CAST_WEIGHTS,
  PETS, PROTAGONISTS, SECONDARY, VILLAINS, affinityTier, castById, castChemFor, castList, publicAffinities,
  type AffinityTier, type CastChem,
} from "./castV2";

/* ------------------------------------------------------------------- arcs */
export const ARCS: Arc[] = [
  { id: "hook", name: "Cold Open Hook", cost: 8_000, q: 4, f: 0.04, desc: "Start with a bang. Critics rewatch it." },
  { id: "lore", name: "Worldbuilding Dive", cost: 15_000, q: 3, f: 0.03, syn: ["fantasy", "cyber", "mystery"], synQ: 3, desc: "Lore so deep the wiki needs editors." },
  { id: "montage", name: "Training Montage", cost: 10_000, q: 2, f: 0.03, syn: ["martial", "sports"], synQ: 3, desc: "Push-ups! Friendship! Power levels!" },
  { id: "tournament", name: "Tournament Arc", cost: 26_000, q: 1, f: 0.14, syn: ["martial", "sports"], synQ: 4, desc: "Bracket of dreams. Merch prints money." },
  { id: "beach", name: "Beach Episode", cost: 6_000, q: -1, f: 0.09, syn: ["romance", "slice"], synQ: 3, desc: "Pure fanservice. Critics sigh. Fans scream." },
  { id: "festival", name: "Festival Episode", cost: 11_000, q: 2, f: 0.05, syn: ["romance", "slice", "romance"], synQ: 3, desc: "Yukata, fireworks, almost-confessions." },
  { id: "launch", name: "Mecha Launch", cost: 24_000, q: 1, f: 0.05, syn: ["mecha", "cyber"], synQ: 5, desc: "90 uninterrupted seconds of launch sequence." },
  { id: "live", name: "Idol Live", cost: 21_000, q: 1, f: 0.1, syn: ["idol"], synQ: 5, synF: 0.03, desc: "A full episode concert. Glowsticks sold separately." },
  { id: "case", name: "Phantom Case", cost: 12_000, q: 3, f: 0.04, syn: ["mystery", "horror"], synQ: 4, desc: "A locked-room mystery. In space. Maybe." },
  { id: "twist", name: "Tragic Twist", cost: 14_000, q: 5, f: 0, syn: ["horror", "mystery", "romance"], synQ: 3, desc: "Nobody saw it coming. Nobody recovered." },
  { id: "filler", name: "Filler Saga", cost: -12_000, q: -4, f: 0.02, desc: "Cheap padding. The manga isn't ready." },
  { id: "timeskip", name: "Timeskip Reboot", cost: 14_000, q: 2, f: 0.05, syn: ["martial", "isekai"], synQ: 2, desc: "Three years pass. Everyone's buffer now." },
  { id: "crossover", name: "Crossover Special", cost: 28_000, q: 0, f: 0.12, franchiseOnly: true, desc: "Your past casts collide in one hour of chaos." },
  { id: "finale", name: "Finale Climax", cost: 22_000, q: 4, f: 0.08, desc: "Everything pays off. Better nail the landing." },
  { id: "origin", name: "Villain Origin", cost: 18_000, q: 5, f: 0.04, syn: ["horror", "mystery", "martial"], synQ: 3, cast: "villain", castQ: 3, desc: "The villain's tragic past. Critics weep." },
  { id: "redemption", name: "Villain Redemption", cost: 22_000, q: 4, f: 0.08, syn: ["martial", "romance", "romance"], synQ: 3, cast: "villain", castQ: 2, desc: "The big bad switches sides. Merch explodes." },
  { id: "mascot", name: "Mascot Episode", cost: 14_000, q: 0, f: 0.12, cast: "pet", castQ: 4, desc: "The mascot carries a whole episode. Toys sell out." },
  { id: "musical", name: "Full Musical Episode", cost: 24_000, q: 2, f: 0.08, syn: ["idol"], synQ: 4, desc: "Everyone sings. Even the narrator." },
  { id: "confession", name: "Confession Episode", cost: 18_000, q: 4, f: 0.06, syn: ["romance", "romance"], synQ: 3, desc: "It finally happens. Fans pass out." },
  { id: "cliffhanger", name: "Mid-Season Cliffhanger", cost: 16_000, q: 3, f: 0.07, syn: ["mystery", "horror"], synQ: 3, desc: "The season ends on a scream." },
  { id: "sakuga", name: "Sakuga Showcase", cost: 26_000, q: 2, f: 0.05, syn: ["mecha", "cyber", "martial"], synQ: 4, desc: "Nine minutes of animation so clean it hurts." },
  { id: "collab", name: "Merch Collab", cost: 20_000, q: 0, f: 0.1, syn: ["idol", "slice"], synQ: 2, desc: "The crossover toy drop. Bots crash the site." },
  { id: "ova", name: "OVA Special", cost: 30_000, q: 2, f: 0.1, franchiseOnly: true, desc: "A bonus disc for the true believers." },
  { id: "war", name: "All-Out War", cost: 42_000, q: 6, f: 0.1, syn: ["martial", "mecha", "fantasy"], synQ: 4, desc: "The entire cast fights at once. Budget dies." },
  /* ------------------------------------------------- unlockable arcs */
  { id: "movienight", name: "Movie Night Special", cost: 12_000, q: 1, f: 0.04, desc: "A low-stakes breather the fans rewatch.", unlock: { kind: "shows", n: 2 } },
  { id: "heist", name: "Heist Caper", cost: 19_000, q: 2, f: 0.06, syn: ["mystery", "comedy"], synQ: 3, desc: "One last score. This time it's personal.", unlock: { kind: "genre", genre: "comedy" } },
  { id: "cookingbattle", name: "Cooking Battle", cost: 16_000, q: 1, f: 0.09, syn: ["cooking"], synQ: 4, synF: 0.02, desc: "Judges weep. Merch sells out.", unlock: { kind: "genre", genre: "cooking" } },
  { id: "grandprix", name: "Grand Prix", cost: 25_000, q: 2, f: 0.09, syn: ["sports", "sports"], synQ: 4, desc: "Tyre strategy, friendship, and the finish line.", unlock: { kind: "genre", genre: "sports" } },
  { id: "bootcamp", name: "Boot Camp", cost: 17_000, q: 2, f: 0.04, syn: ["military", "martial"], synQ: 3, desc: "They'll break you. Then they'll build you.", unlock: { kind: "genre", genre: "military" } },
  { id: "ghosthunt", name: "Ghost Hunt", cost: 15_000, q: 3, f: 0.05, syn: ["supernatural", "horror"], synQ: 4, desc: "The cameras catch something. Nobody rewatches.", unlock: { kind: "genre", genre: "supernatural" } },
  { id: "orbital", name: "Orbital Rescue", cost: 23_000, q: 2, f: 0.06, syn: ["space", "mecha"], synQ: 4, desc: "Six minutes of fuel left. Hold the line.", unlock: { kind: "genre", genre: "space" } },
  { id: "raincity", name: "Rain City Chase", cost: 20_000, q: 3, f: 0.03, syn: ["mystery", "mystery"], synQ: 4, desc: "Every shadow is a suspect.", unlock: { kind: "genre", genre: "mystery" } },
  { id: "transformation", name: "Transformation Test", cost: 18_000, q: 2, f: 0.05, syn: ["magical", "romance"], synQ: 4, desc: "The new form fails at the worst moment.", unlock: { kind: "genre", genre: "magical" } },
  { id: "directorscut", name: "Director's Cut", cost: 21_000, q: 3, f: 0.02, syn: ["cyber", "mystery"], synQ: 3, desc: "Forty minutes nobody asked for. Critics adore it.", unlock: { kind: "rd", cost: 18 } },
  { id: "fanservice", name: "Fan Service Deluxe", cost: 9_000, q: -2, f: 0.12, desc: "Cheap. Shameless. Financially unwise to skip.", unlock: { kind: "rd", cost: 10 } },
  { id: "mega", name: "Mega Crossover", cost: 30_000, q: 2, f: 0.14, franchiseOnly: true, desc: "Every franchise you own, one timeline.", unlock: { kind: "franchise" } },
  { id: "awardpush", name: "Award Season Push", cost: 26_000, q: 4, f: 0.03, desc: "Screeners, galas, and one very tired director.", unlock: { kind: "score", n: 30 } },
  { id: "guildwar", name: "Guild War", cost: 34_000, q: 5, f: 0.07, syn: ["fantasy", "martial"], synQ: 4, desc: "Factions, betrayals, and a siege that spans two episodes.", unlock: { kind: "hits", n: 3 } },
  { id: "expansion", name: "Studio Expansion Arc", cost: 24_000, q: 3, f: 0.05, desc: "The meta-narrative: your own studio, animated.", unlock: { kind: "staff", n: 6 } },
  { id: "idolfest", name: "Idol Festival", cost: 22_000, q: 2, f: 0.1, syn: ["idol"], synQ: 4, desc: "Three nights. One stage. Zero dry eyes.", unlock: { kind: "genre", genre: "idol" } },
  /* --------------------------------------- discovery-era narrative beats */
  { id: "narr_slowburn", name: "Slow-Burn Introduction", cost: 9_000, q: 4, f: 0.01, syn: ["slice", "romance", "mystery"], synQ: 3, anti: ["sports", "martial"], antiQ: -2, desc: "Let the cast breathe before the plot starts squeezing." },
  { id: "narr_flashforward", name: "Flash-Forward Teaser", cost: 13_000, q: 3, f: 0.04, syn: ["mystery", "cyber", "mystery"], synQ: 3, anti: ["slice"], antiQ: -1, desc: "Show the destination first and dare viewers to work out the road.", unlock: { kind: "shows", n: 2 } },
  { id: "narr_mediasres", name: "In Medias Res", cost: 15_000, q: 4, f: 0.03, syn: ["martial", "military", "sports"], synQ: 3, anti: ["slice", "cooking"], antiQ: -2, desc: "Open halfway through the disaster and explain later.", unlock: { kind: "score", n: 22 } },
  { id: "narr_rivalintro", name: "Rival Introduction", cost: 12_000, q: 3, f: 0.05, syn: ["martial", "sports", "sports"], synQ: 4, cast: "secondary", castQ: 2, desc: "A perfect foil arrives and immediately steals the frame." },
  { id: "narr_mentor", name: "Mentor Arc", cost: 14_000, q: 4, f: 0.03, syn: ["martial", "fantasy", "military"], synQ: 3, cast: "secondary", castQ: 2, desc: "Wisdom, bad habits, and one lesson that matters later." },
  { id: "narr_foundfamily", name: "Found Family", cost: 13_000, q: 4, f: 0.05, syn: ["slice", "fantasy", "romance"], synQ: 3, anti: ["mystery"], antiQ: -1, desc: "The team slowly becomes the home they were missing.", unlock: { kind: "genre", genre: "slice" } },
  { id: "narr_journey", name: "Journey Arc", cost: 16_000, q: 3, f: 0.05, syn: ["fantasy", "isekai", "space"], synQ: 4, desc: "New places, new problems, increasingly questionable maps." },
  { id: "narr_politics", name: "Political Intrigue", cost: 19_000, q: 5, f: 0.01, syn: ["military", "mystery", "fantasy"], synQ: 4, anti: ["idol", "cooking"], antiQ: -2, desc: "Factions smile politely while sharpening knives.", unlock: { kind: "rd", cost: 16 } },
  { id: "narr_explore", name: "Exploration Expedition", cost: 15_000, q: 3, f: 0.04, syn: ["space", "fantasy", "isekai"], synQ: 3, desc: "Put something impossible beyond the next horizon." },
  { id: "narr_siege", name: "Siege Arc", cost: 31_000, q: 6, f: 0.06, syn: ["military", "fantasy", "mecha"], synQ: 4, anti: ["slice", "romance"], antiQ: -3, desc: "One location, no escape, every department working overtime.", unlock: { kind: "hits", n: 2 } },
  { id: "narr_survival", name: "Survival Game", cost: 22_000, q: 3, f: 0.08, syn: ["horror", "mystery", "martial"], synQ: 4, anti: ["romance", "cooking"], antiQ: -2, desc: "Rules are announced. Half the cast immediately breaks them.", unlock: { kind: "genre", genre: "horror" } },
  { id: "narr_rescue", name: "Rescue Mission", cost: 18_000, q: 3, f: 0.06, syn: ["martial", "military", "space"], synQ: 3, desc: "Someone is missing; everyone else gets one shot." },
  { id: "narr_revenge", name: "Revenge Arc", cost: 19_000, q: 4, f: 0.04, syn: ["mystery", "martial", "horror"], synQ: 3, anti: ["idol", "cooking"], antiQ: -2, desc: "A clean objective gradually becomes a terrible idea.", unlock: { kind: "shows", n: 3 } },
  { id: "narr_betrayal", name: "Betrayal", cost: 17_000, q: 5, f: 0.02, syn: ["mystery", "military", "mystery"], synQ: 3, desc: "The trusted ally was taking notes for somebody else.", unlock: { kind: "hits", n: 1 } },
  { id: "narr_secretid", name: "Secret Identity", cost: 14_000, q: 4, f: 0.04, syn: ["mystery", "magical", "supernatural"], synQ: 4, desc: "Two lives, one increasingly impossible calendar.", unlock: { kind: "genre", genre: "mystery" } },
  { id: "narr_falsewin", name: "False Victory", cost: 20_000, q: 5, f: 0.03, syn: ["martial", "horror", "military"], synQ: 3, desc: "They won. Which is exactly why something feels wrong.", unlock: { kind: "score", n: 26 } },
  { id: "narr_villainreveal", name: "Villain Reveal", cost: 18_000, q: 5, f: 0.05, syn: ["mystery", "horror", "mystery"], synQ: 4, cast: "villain", castQ: 3, desc: "The camera finally turns toward the person behind it all." },
  { id: "narr_quiet", name: "Quiet Character Episode", cost: 8_000, q: 4, f: 0.02, syn: ["slice", "romance", "romance"], synQ: 4, anti: ["sports", "military"], antiQ: -2, desc: "No explosions. One conversation. Somehow the episode everyone quotes." },
  { id: "narr_pov", name: "POV Switch", cost: 16_000, q: 5, f: 0.01, syn: ["mystery", "mystery", "horror"], synQ: 3, desc: "Retell the conflict through the eyes of somebody the audience mistrusted.", unlock: { kind: "rd", cost: 22 } },
  { id: "narr_sacrifice", name: "Heroic Sacrifice", cost: 24_000, q: 6, f: 0.03, syn: ["martial", "fantasy", "military"], synQ: 4, anti: ["comedy", "cooking"], antiQ: -3, desc: "One character pays the bill for everybody else's tomorrow.", unlock: { kind: "score", n: 30 } },
];

/* ------------------------------------------- hidden arc synergies (shipped to discover) */
export interface ArcCombo {
  id: string;
  name: string;
  /** required beats. `ordered` combos only fire when they appear in this sequence. */
  arcs: string[];
  q: number;
  f: number;
  ordered?: boolean;
}

export const ARC_COMBOS: ArcCombo[] = [
  { id: "rivalry", name: "Rivalry Saga", arcs: ["tournament", "origin"], q: 2, f: 0.02 },
  { id: "heart", name: "Heartfelt Trilogy", arcs: ["beach", "festival", "confession"], q: 3, f: 0.01 },
  { id: "suspense", name: "Suspense Engine", arcs: ["case", "twist", "cliffhanger"], q: 3, f: 0 },
  { id: "spectacle", name: "Sakuga Spectacle", arcs: ["launch", "sakuga", "war"], q: 3, f: 0.01 },
  { id: "music", name: "Song & Dance", arcs: ["live", "musical"], q: 2, f: 0.015 },
  { id: "gold", name: "Franchise Gold", arcs: ["crossover", "ova", "finale"], q: 2, f: 0.03 },
  { id: "blitz", name: "Merch Blitz", arcs: ["mascot", "collab"], q: 1, f: 0.02 },
  { id: "road", name: "Redemption Road", arcs: ["origin", "redemption", "finale"], q: 2, f: 0 },
  { id: "gag", name: "Gag Reel", arcs: ["filler", "beach"], q: -1, f: 0.03 },
  { id: "deep", name: "Deep Lore", arcs: ["lore", "twist"], q: 2, f: 0 },
  { id: "speed", name: "Need for Speed", arcs: ["grandprix", "montage"], q: 2, f: 0.01 },
  { id: "haunted", name: "Haunted Case Files", arcs: ["ghosthunt", "case"], q: 2, f: 0.01 },
  { id: "feast", name: "Feast & Merch", arcs: ["cookingbattle", "collab"], q: 2, f: 0.02 },
  { id: "orbit", name: "Orbital Launch", arcs: ["orbital", "launch"], q: 2, f: 0.01 },
  { id: "crime", name: "Crime & Rain", arcs: ["raincity", "case", "twist"], q: 2, f: 0.01 },
  { id: "magicgirl", name: "Magical Rising", arcs: ["transformation", "live", "confession"], q: 2, f: 0.01 },
  /* ordered structures: sequencing now matters, not just the shopping list */
  { id: "earned_victory", name: "Earned Victory", arcs: ["montage", "tournament", "finale"], q: 4, f: 0.03, ordered: true },
  { id: "rival_payoff", name: "Rivalry Payoff", arcs: ["narr_rivalintro", "tournament", "finale"], q: 4, f: 0.04, ordered: true },
  { id: "mentor_legacy", name: "Mentor's Legacy", arcs: ["narr_mentor", "narr_sacrifice", "finale"], q: 5, f: 0.02, ordered: true },
  { id: "mystery_reveal", name: "The Long Reveal", arcs: ["hook", "case", "narr_villainreveal", "twist"], q: 5, f: 0.02, ordered: true },
  { id: "false_betrayal", name: "Victory Was a Lie", arcs: ["narr_falsewin", "narr_betrayal", "finale"], q: 4, f: 0.03, ordered: true },
  { id: "journey_family", name: "Road Becomes Home", arcs: ["narr_journey", "narr_foundfamily", "finale"], q: 3, f: 0.04, ordered: true },
  { id: "political_siege", name: "War by Other Means", arcs: ["narr_politics", "narr_siege", "war"], q: 5, f: 0.01, ordered: true },
  { id: "identity_confession", name: "Mask Comes Off", arcs: ["narr_secretid", "confession"], q: 3, f: 0.03, ordered: true },
  { id: "survival_rescue", name: "No One Left Behind", arcs: ["narr_survival", "narr_rescue", "finale"], q: 4, f: 0.03, ordered: true },
  { id: "revenge_redemption", name: "Break the Cycle", arcs: ["narr_revenge", "redemption", "finale"], q: 4, f: 0.02, ordered: true },
  { id: "slowburn_payoff", name: "Slow Fuse", arcs: ["narr_slowburn", "twist", "finale"], q: 4, f: 0.02, ordered: true },
  { id: "pov_mystery", name: "Other Side of the Case", arcs: ["narr_pov", "case", "twist"], q: 4, f: 0.01, ordered: true },
  { id: "flashforward_loop", name: "Promise Kept", arcs: ["narr_flashforward", "origin", "finale"], q: 3, f: 0.02, ordered: true },
  /* deliberately bad structures teach the player that order can hurt too */
  { id: "backwards_training", name: "Training After the Test", arcs: ["tournament", "montage"], q: -3, f: -0.01, ordered: true },
  { id: "spoiled_mystery", name: "Mystery Spoiled Early", arcs: ["narr_villainreveal", "case"], q: -3, f: -0.01, ordered: true },
];

const containsInOrder = (haystack: string[], needles: string[]) => {
  let at = -1;
  return needles.every((id) => {
    at = haystack.indexOf(id, at + 1);
    return at >= 0;
  });
};

/** hidden story structures. Some only work when the beats are in the right order. */
export const arcCombosFor = (arcIds: string[]): ArcCombo[] =>
  ARC_COMBOS.filter((c) => c.ordered ? containsInOrder(arcIds, c.arcs) : c.arcs.every((a) => arcIds.includes(a)));

export const arcGenreKey = (arcId: string, genre: GenreId) => `${arcId}|${genre}`;

export const arcGenreFit = (arc: Arc, genre: GenreId) => {
  if (arc.anti?.includes(genre)) return { label: "RISKY FIT", cls: "text-neon", score: arc.antiQ ?? -2 };
  if (arc.syn?.includes(genre)) {
    const score = arc.synQ ?? 0;
    if (score >= 4 || (arc.synF ?? 0) >= 0.03) return { label: "GREAT FIT", cls: "text-gold", score };
    return { label: "GOOD FIT", cls: "text-mint", score };
  }
  return { label: "NEUTRAL", cls: "text-paper/50", score: 0 };
};

export const arcComboRating = (combo: ArcCombo) => {
  if (combo.q < 0 || combo.f < 0) return { label: "RISKY STRUCTURE", cls: "text-neon" };
  if (combo.q >= 4 || combo.f >= 0.035) return { label: "GREAT COMBO!", cls: "text-gold" };
  if (combo.q >= 2 || combo.f >= 0.015) return { label: "GOOD SYNERGY", cls: "text-mint" };
  return { label: "WORKABLE", cls: "text-cyanx" };
};

/** Creative research can reveal a starter library without forcing blind releases. */
export const ARC_RESEARCH_COMBOS = ["rivalry", "suspense", "deep", "earned_victory", "heart"] as const;
export const ARC_RESEARCH_GENRE_KEYS = [
  arcGenreKey("hook", "martial"),
  arcGenreKey("lore", "fantasy"),
  arcGenreKey("montage", "martial"),
  arcGenreKey("tournament", "sports"),
  arcGenreKey("festival", "romance"),
  arcGenreKey("case", "mystery"),
  arcGenreKey("narr_slowburn", "slice"),
  arcGenreKey("narr_rivalintro", "sports"),
  arcGenreKey("narr_politics", "mystery"),
  arcGenreKey("narr_quiet", "slice"),
] as const;

/* ------------------------------------------------------------------ staff */
const FIRST = ["Hana", "Yuto", "Mei", "Ren", "Sakura", "Daichi", "Aoi", "Kenji", "Mio", "Sota", "Rin", "Takeshi", "Nao", "Haru", "Yuki", "Kenta", "Asuka", "Shun", "Emi", "Taiga", "Kira", "Masa", "Noa", "Goro"];
const LAST = ["Tanaka", "Sato", "Kurosawa", "Ishikawa", "Mori", "Abe", "Fujimoto", "Okabe", "Shinohara", "Wakamatsu", "Hirasawa", "Kobayashi", "Endo", "Miura", "Tsukishima", "Araki"];

export const ROLE_LABEL: Record<StaffRole, string> = { writer: "Writer", animator: "Animator", composer: "Composer" };
export const ROLE_POINT: Record<StaffRole, PointType> = { writer: "story", animator: "art", composer: "sound" };
export const POINT_LABEL: Record<PointType, string> = { story: "Story", art: "Art", sound: "Sound" };
export const POINT_COLOR: Record<PointType, string> = { story: "#ff4d8d", art: "#3be1ff", sound: "#ffd166" };

export const LEVEL_TITLES = ["Rookie", "Key Artist", "Chief", "Director", "Legend", "Visionary", "Living Master", "Immortal"];

/** 16 staff portraits sliced from four 2x2 sheets */
export const STAFF_PORTRAITS: { img: string; pos: number }[] = [
  { img: "img/staff-1.jpg", pos: 0 },
  { img: "img/staff-1.jpg", pos: 1 },
  { img: "img/staff-1.jpg", pos: 2 },
  { img: "img/staff-1.jpg", pos: 3 },
  { img: "img/staff-2.jpg", pos: 0 },
  { img: "img/staff-2.jpg", pos: 1 },
  { img: "img/staff-2.jpg", pos: 2 },
  { img: "img/staff-2.jpg", pos: 3 },
  { img: "img/staff-3.jpg", pos: 0 },
  { img: "img/staff-3.jpg", pos: 1 },
  { img: "img/staff-3.jpg", pos: 2 },
  { img: "img/staff-3.jpg", pos: 3 },
  { img: "img/staff-4.jpg", pos: 0 },
  { img: "img/staff-4.jpg", pos: 1 },
  { img: "img/staff-4.jpg", pos: 2 },
  { img: "img/staff-4.jpg", pos: 3 },
];

/* --------------------------------------------------------- worker looks
 * The ten painted chibi staff models. Each look pairs the full-body office
 * sprite with a portrait cropped from the very same painting, so the person
 * you hire from a menu is exactly the person who walks around the office.
 * Sprite 6 is reserved for the showrunner. */
export interface WorkerLook {
  sprite: string;
  portrait: string;
}
/* Looks must only reference art that actually shipped in public/img — a
   missing file renders as a broken image in menus (6 is the showrunner's
   dedicated model, reserved; art batch 2 added workers 14-16). */
export const WORKER_LOOKS: WorkerLook[] = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((n) => ({
  sprite: `img/sprite-worker-${n}.png`,
  portrait: `img/portrait-worker-${n}.png`,
}));
export const BOSS_LOOK: WorkerLook = {
  sprite: "img/sprite-worker-6.png",
  portrait: "img/portrait-worker-6.png",
};
/** stable model index for a staff member (old saves fall back to their
    legacy portrait index, so everyone keeps a consistent face) */
export const workerLookIndex = (s: Staff) => (s.look ?? s.portrait) % WORKER_LOOKS.length;
export const workerLook = (s: Staff) => WORKER_LOOKS[workerLookIndex(s)];

let staffId = 0;
export function rollCandidate(week: number): Staff {
  const roles: StaffRole[] = ["writer", "animator", "composer"];
  const role = roles[Math.floor(Math.random() * 3)];
  const tier = Math.min(45, week * 0.16);
  const main = Math.round(34 + Math.random() * 34 + tier);
  const off = () => Math.round(12 + Math.random() * 30 + tier * 0.5);
  const id = `s${++staffId}_${Date.now()}${Math.floor(Math.random() * 999)}`;
  const s: Staff = {
    id,
    name: `${FIRST[Math.floor(Math.random() * FIRST.length)]} ${LAST[Math.floor(Math.random() * LAST.length)]}`,
    role,
    story: role === "writer" ? main : off(),
    art: role === "animator" ? main : off(),
    sound: role === "composer" ? main : off(),
    level: 1,
    stamina: 100,
    salary: 0,
    cost: 0,
    portrait: staffId % STAFF_PORTRAITS.length,
    look: (staffId + Math.floor(Math.random() * 3)) % WORKER_LOOKS.length,
  };
  s.salary = Math.round((320 + main * 12) / 10) * 10;
  s.cost = Math.round((5_000 + main * 420) / 500) * 500;
  return s;
}
export const staffPoint = (s: Staff, t: PointType) => (t === "story" ? s.story : t === "art" ? s.art : s.sound);
export const staffMain = (s: Staff) => staffPoint(s, ROLE_POINT[s.role]);
export const levelUpCost = (s: Staff) => 8 + s.level * 6;

/* ------------------------------------------------------------- showrunners */
export interface Showrunner {
  id: "steady" | "vision" | "producer" | "marketer";
  name: string;
  title: string;
  img: string;
  /** painted chibi office model — the boss sprite walking the studio floor */
  sprite: string;
  /** portrait crop of the very same model, used in menus */
  portrait: string;
  perk: string;
}
export const SHOWRUNNERS: Showrunner[] = [
  { id: "steady", name: "Genji Ashida", title: "The Master Animator", img: "img/showrunner-a.jpg", sprite: "img/sprite-showrunner-steady.png", portrait: "img/portrait-showrunner-steady.png", perk: "Steady Hand — all contribution checks are 50% stronger and pre-edit production creates 25% fewer editing notes." },
  { id: "vision", name: "Akari Natsume", title: "The Visionary Director", img: "img/showrunner-b.jpg", sprite: "img/sprite-worker-6.png", portrait: "img/portrait-worker-6.png", perk: "Vision — dramatic arcs hit harder, no review below 3/10." },
  { id: "producer", name: "Haruto Mori", title: "The Mogul Producer", img: "img/showrunner-c.jpg", sprite: "img/sprite-showrunner-producer.png", portrait: "img/portrait-showrunner-producer.png", perk: "Golden Rolodex — contracts pay 40% more and advances are bigger." },
  { id: "marketer", name: "Sana Kobayashi", title: "The Hype Machine", img: "img/showrunner-d.jpg", sprite: "img/sprite-showrunner-marketer.png", portrait: "img/portrait-showrunner-marketer.png", perk: "Buzz Engine — shows open with +10 hype and marketing runs faster." },
];

/* --------------------------------------------------------------- reviewers */
export interface Reviewer {
  name: string;
  focus: string;
  bias: "story" | "hype" | "harsh" | "tech";
  quotes: Record<string, string[]>;
}
export const REVIEWERS: Reviewer[] = [
  {
    name: "Animage Monthly",
    focus: "writing",
    bias: "story",
    quotes: {
      masterpiece: ["A once-in-a-decade script. Frame it in the lobby.", "I wept into my storyboard. Twice."],
      hit: ["Strong writing with real emotional payload.", "The writers' room deserves a raise."],
      solid: ["Competent storytelling, a few saggy episodes.", "Solid penmanship, if a little safe."],
      mixed: ["The script trips over its own ambitions.", "Promising ideas, wobbly execution."],
      flop: ["I've read better plots on instant noodle pots.", "Were the writers tracing another show?"],
    },
  },
  {
    name: "Otaku Pulse",
    focus: "fandom",
    bias: "hype",
    quotes: {
      masterpiece: ["MY TIMELINE IS ON FIRE. ABSOLUTE CINEMA.", "Cancelled my plans. All of them. Forever."],
      hit: ["The fandom is unwell (affectionate).", "Clip it. Ship it. Stream it again."],
      solid: ["The fanbase is cautiously optimistic!", "Decent watch-party material."],
      mixed: ["The comment section is at war.", "Mid, but the memes are premium."],
      flop: ["Ratio'd by its own studio's apology post.", "The fandom has filed a restraining order."],
    },
  },
  {
    name: "The London Reel",
    focus: "industry",
    bias: "harsh",
    quotes: {
      masterpiece: ["A landmark for the medium. We eat our words gladly.", "Rare perfection from a studio on the rise."],
      hit: ["A confident work from a studio to watch.", "Commercial instincts meet genuine craft."],
      solid: ["Serviceable. The industry survives another season.", "Adequate fare for its time slot."],
      mixed: ["Ambition outpaces the production schedule.", "Shows flashes, but the seams show."],
      flop: ["A cautionary tale for production committees.", "Airtime this wasted should be studied."],
    },
  },
  {
    name: "StudioScope",
    focus: "craft",
    bias: "tech",
    quotes: {
      masterpiece: ["Sakuga so clean my screen filed for unemployment.", "The compositing alone merits the score."],
      hit: ["Animation and OST in perfect sync.", "Genuinely gorgeous key sequences."],
      solid: ["Craft is consistent, if rarely dazzling.", "Some strong cuts between the stock footage."],
      mixed: ["Off-model episodes undercut the good ones.", "The sound mix deserved better drawings."],
      flop: ["Three frames of animation. I counted.", "The slideshow was... brave."],
    },
  },
];

/* ------------------------------------------------------------ rival shows */
export const RIVAL_STUDIOS = ["Toe-i Animation", "Sunnyrise", "Boneworks", "Kyo-Hani", "Madcap House", "Turtle Line"];

export const PUN_TITLES = [
  "My Hero Acrimony",
  "Narutoast",
  "Two Pieces",
  "Dragon Bowl Z",
  "Snack on Titan",
  "Demon Snoozer",
  "Jujutsu Kaizen",
  "Pocket Fiends",
  "Sailor Spoon",
  "Fullmetal Accountant",
  "Cowboy Beep-Bop",
  "Spy x Flatpack",
  "Death Nope",
  "Sword Part Offline",
  "Tokyo Ghoulish",
  "Frieren: Beyond Journey's Brunch",
  "Chainsaw Woman",
  "Hunter x Plumber",
  "Bleech",
  "Fairy Tale",
  "Blockyuu!!",
  "K-Onion",
  "Neon Genesis Vegetarian",
  "Gumdrop Wing",
  "Steins;Gateau",
  "Mob Psycho 101",
  "Two Punch Man",
  "JoJo's Bizarre Accounting",
  "Tokyo Redecorators",
  "Vinland Salsa",
  "Black Cloverfield",
  "Dandadandan",
  "Oshi no Know",
  "Your Name? Again",
  "Spirited Away: The Sequel",
  "Howl's Moving Shed",
  "Princess Mononoke-y",
  "Ghost in the Shop",
  "Attack on Tofu",
  "One Peace Treaty",
  "Blue Exorcise",
  "Dr. Scone",
  "Fire Farce",
  "Soul Heater",
  "Code Ge-assignment",
  "Psycho-Passport",
  "Parasyte: The Maximum Rent",
  "Noragami-nation",
  "Erased Again",
  "Made in a Biscuit",
  "The Promised Neverlandlord",
  "Food Wars: Shokugeki no Sofa",
  "Cells at Work From Home",
  "Haikyu Later",
  "Kuroko's Basket Case",
  "Ace of Diamond Cutters",
  "Initial Tea",
  "Yuri on Rice",
  "Free! Shipping",
  "Blue Lockdown",
  "Slam Drunk",
  "Run with the Windows Open",
  "Bocchi the Crock",
  "Horimiya Later",
  "Toradora the Explorer",
  "Kaguya-sama: Love Is Floor",
  "My Dress-Up Darling Budget",
  "Rent-a-Girlfriend's Flat",
  "The Quintessential Quintuplets' Accountant",
  "Clannadwich",
  "Anohana Means No Refunds",
  "March Comes in Like a Layoff",
  "Violet Evergarden Centre",
  "Nana Bread",
  "Fruits Basket Case",
  "Ouran High School Host Invoice",
  "Lovely Complex Spreadsheet",
  "Cardcaptor Salary",
  "Sailor Profit",
  "Madoka Magica Mortgage",
  "Re:Zero Budget",
  "That Time I Got Reincarnated as a Slime Mould",
  "Konosuba Contractor",
  "Overlord of the Lease",
  "No Game No Wi-Fi",
  "The Rising of the Shield Invoice",
  "Mushoku Tensei: Jobless Refinance",
  "Sword Art Overtime",
  "Log Horizon Broadband",
  "Gate: Thus the Council Fought There",
  "Delicious in Tax Dungeon",
  "Campfire Cooking in Another World with My Absurd Skill Issue",
  "The Devil Is a Part-Timer's Manager",
  "Uncle from Another Department",
  "Solo Levelling the Books",
  "Tower of Admin",
  "God of High School Fees",
  "Bungo Stray Dogsbody",
  "Black Butler Service Charge",
  "Blue Period Drama",
  "Beastars and Stripes",
  "Odd Taxi Receipt",
  "Sonny Boyband",
  "Ping Pong the Animation Budget",
  "Great Pretender Invoice",
  "Monster Energy Meeting",
  "Pluto Is Out of Office",
  "Trigun Stamp Duty",
  "Samurai Champloo-nch",
  "Afro Samurai Accountant",
  "Rurouni Pension",
  "Inuyasha Later",
  "Yu Yu Hakusho Kiosk",
  "Saint Seiya Later",
  "Fist of the North Star Rating",
  "Gintama Receipt",
  "Dragon Quest: The Adventure of VAT",
  "Digimon Adventure Time Sheet",
  "Pokémon Concierge Fee",
  "Detective Conan the Contractor",
  "Lupin the Third Floor",
  "Case Closed for Lunch",
  "The Apothecary Diaries Department",
  "Skip and Loafer Payment",
  "Insomniacs After School Run",
  "Call of the Night Shift",
  "Zom 100: Bucket List of the Budget",
  "Mashle: Magic and Muscles and Metrics",
  "Undead Unpaid",
  "Kaiju No. Invoice",
  "Wind Breaker Room",
  "Hell's Paradise Payroll",
  "Ranking of Kingsize Beds",
  "Ranking of Queens",
  "To Your Eternity Contract",
  "Land of the Lustrous Expenses",
  "Ancient Magus' Bride Price",
  "The Faraway Paladin Invoice",
  "Goblin Slayer's Tax Return",
  "Claymore Coffee",
  "Berserk at the Printer",
  "Golden Kamuy Later",
  "Drifting Dragons' Expenses",
  "Space Dandy Budget",
  "Planetes and Pensions",
  "Legend of the Galactic Payroll",
  "Mobile Suit Gumdam",
  "Gurren Login",
  "Eureka Seven-Eleven",
  "Darling in the Fax",
  "Macrossed Wires",
  "86 Unread Emails",
  "Aldnoah.Zero Budget",
  "Knights of Sidonia Deposit",
  "Patlabor Day",
  "Akira Rental",
  "Paprika Invoice",
  "Perfect Blue Screen",
  "Millennium Actress Fee",
  "Summer Wars and Conditions",
  "Wolf Children Allowance",
  "The Girl Who Leapt Through Payroll",
  "Weathering with Debt",
  "Suzume's Door Invoice",
  "A Silent Invoice",
  "Belle and the Budget",
  "Ponyo on the Payroll",
  "Castle in the Spreadsheet",
  "Kiki's Delivery Surcharge",
  "Nausicaä of the Valley of the Windfall",
  "The Boy and the Heron Account",
];

export interface RivalShow {
  studio: string;
  title: string;
  score: number; // 0..40, revealed at the awards ceremony
  week: number;
  year: number;
  /** what they are flooding the market with */
  genre?: GenreId;
}

/** A rival studio rolls out 1-3 shows over the course of a year */
export function rollRivalShows(year: number, yearStartWeek: number): RivalShow[] {
  const used = new Set<string>();
  const pick = <T,>(arr: T[]): T => {
    let v = arr[Math.floor(Math.random() * arr.length)];
    let guard = 0;
    while (used.has(String(v)) && used.size < arr.length && guard++ < 60)
      v = arr[Math.floor(Math.random() * arr.length)];
    used.add(String(v));
    return v;
  };
  const count = 1 + Math.floor(Math.random() * 3);
  const shows: RivalShow[] = [];
  for (let i = 0; i < count; i++) {
    const studio = pick(RIVAL_STUDIOS);
    const title = pick(PUN_TITLES);
    const strength = 9 + year * 1.6 + Math.random() * 13;
    const score = Math.max(3, Math.min(38, Math.round(strength)));
    shows.push({
      studio,
      title,
      score,
      week: yearStartWeek + 2 + Math.floor(Math.random() * 44),
      year,
      genre: GENRES[Math.floor(Math.random() * GENRES.length)].id,
    });
  }
  return shows.sort((a, b) => a.week - b.week);
}

/* ------------------------------------------------------------------- misc */
export const SPIRITS_A = ["Neo", "Star", "Ultra", "Phantom", "Moonlight", "Cyber", "Rocket", "Crystal", "Samurai", "Midnight", "Turbo", "Ghost", "Honey", "Iron", "Velvet"];
export const SPIRITS_B = ["Wolf", "Academy", "Blade", "Parade", "Voyage", "Symphony", "Protocol", "Heartbeat", "Odyssey", "Kiss", "Delivery", "Alliance", "Club", "Zero", "Crown"];
export const SPIRITS_C = ["X", "2049", "Re", "EX", "II", "Z", "Dash"];
export function randomTitle(): string {
  const a = SPIRITS_A[Math.floor(Math.random() * SPIRITS_A.length)];
  const b = SPIRITS_B[Math.floor(Math.random() * SPIRITS_B.length)];
  const c = Math.random() < 0.4 ? ` ${SPIRITS_C[Math.floor(Math.random() * SPIRITS_C.length)]}` : "";
  return `${a} ${b}${c}`;
}

export const NEWS = [
  "Rival studio CRIMSON GEAR announces a 4-cour mecha epic…",
  "Streaming giant renews isekai anthology for 9th season.",
  "Figure scalpers crash site for beach-episode exclusive.",
  "Voice actor union wins karaoke night championship.",
  "Budget cuts hit industry: animators subsist on toast.",
  "Survey: 64% of fans can't name a single producer.",
  "Midnight slot horror anthology traumatises night owls.",
  "Kai plushies sell out in 4 minutes. Bots blamed.",
  "London Anime Expo adds a Sakuga Prize category.",
  "Manga author 'on hiatus' spotted at fishing tourney again.",
];

/* ------------------------------------------------------------------ money */
export function formatGBP(n: number): string {
  const v = Math.round(n);
  const sign = v < 0 ? "-" : "";
  return `${sign}£${Math.abs(v).toLocaleString("en-GB")}`;
}
export function formatGBPShort(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (a >= 1_000_000) return `${sign}£${(a / 1_000_000).toFixed(a >= 10_000_000 ? 1 : 2)}M`;
  if (a >= 1_000) return `${sign}£${(a / 1000).toFixed(a >= 100_000 ? 0 : 1)}k`;
  return `${sign}£${Math.round(a)}`;
}
export function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 10_000) return (n / 1000).toFixed(1) + "K";
  return Math.round(n).toLocaleString("en-GB");
}

/* -------------------------------------------------------------- calendar */
/** the length of the career campaign — after this the studio enters Dynasty Mode */
export const CAREER_WEEKS = 48 * 12;
/** weeks a released show earns broadcast revenue — Game Dev Tycoon style:
    a slow build, a peak, then a long tail of re-runs and word of mouth */
export const AIR_WEEKS = 12;
export const WEEKS_PER_MONTH = 4;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const yearOfWeek = (w: number) => Math.floor(w / 48) + 1;
export const monthOfWeek = (w: number) => Math.floor((w % 48) / 4);
export const weekOfMonth = (w: number) => (w % 4) + 1;
export const dateLabel = (w: number) => `Y${yearOfWeek(w)} ${MONTHS[monthOfWeek(w)]} W${weekOfMonth(w)}`;
