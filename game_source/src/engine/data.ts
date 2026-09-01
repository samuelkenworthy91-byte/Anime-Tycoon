import {
  Flame,
  Flower2,
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
  Gauge,
  Crosshair,
  Wand2,
  Rocket,
  VenetianMask,
  type LucideIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ types */
export type GenreId =
  | "shonen"
  | "shojo"
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
  | "racing"
  | "military"
  | "supernatural"
  | "space"
  | "noir"
  | "magical";

export type MediumId = "tv" | "movie" | "ona";
export type BudgetId = "indie" | "standard" | "blockbuster";
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
  /** 0..3 quadrant within a 2x2 sheet; undefined = full image */
  pos?: number;
  tag: string;
  aff: GenreId[];
  role: CastRole;
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
  /** what must be true before this arc can be picked */
  unlock?: ArcUnlock;
}

export interface Draft {
  title: string;
  medium: MediumId;
  budget: BudgetId;
  slot: SlotId;
  genres: GenreId[];
  audience: AudienceId;
  protag: string;
  protagName: string;
  secondary: string;
  pet: string;
  villain: string;
  arcs: string[];
  sliders: [number, number, number];
  franchiseKey?: string;
  season: number;
}

/* ---------------------------------------------------------------- genres */
export const GENRES: Genre[] = [
  { id: "shonen", label: "Shonen", color: "#ff7a3d", icon: Flame, desc: "Hot-blooded battles & friendship.", ideal: [70, 68, 55], ratio: [0.3, 0.45, 0.25], rd: 0 },
  { id: "shojo", label: "Shojo", color: "#ff8fc7", icon: Flower2, desc: "Feelings first, sparkles mandatory.", ideal: [30, 45, 62], ratio: [0.42, 0.3, 0.28], rd: 0 },
  { id: "slice", label: "Slice of Life", color: "#ffd166", icon: Coffee, desc: "Nothing happens, beautifully.", ideal: [30, 36, 55], ratio: [0.45, 0.25, 0.3], rd: 0 },
  { id: "fantasy", label: "Fantasy", color: "#c084fc", icon: Sword, desc: "Guilds, magic, long walks.", ideal: [60, 60, 50], ratio: [0.36, 0.4, 0.24], rd: 0 },
  { id: "romance", label: "Romance", color: "#ff5e7a", icon: Heart, desc: "Will they? They won't. They will.", ideal: [26, 46, 56], ratio: [0.46, 0.24, 0.3], rd: 14 },
  { id: "sports", label: "Sports", color: "#fbbf24", icon: Trophy, desc: "Sweat, tears, tournament arcs.", ideal: [72, 75, 55], ratio: [0.26, 0.5, 0.24], rd: 18 },
  { id: "mecha", label: "Mecha", color: "#7af0ff", icon: Bot, desc: "Giant robots, bigger budgets.", ideal: [60, 72, 48], ratio: [0.22, 0.54, 0.24], rd: 22 },
  { id: "isekai", label: "Isekai", color: "#a78bfa", icon: Sparkles, desc: "Truck-kun strikes again.", ideal: [66, 58, 45], ratio: [0.38, 0.38, 0.24], rd: 24 },
  { id: "horror", label: "Horror", color: "#a3e635", icon: Ghost, desc: "Don't watch alone at 2AM.", ideal: [66, 40, 72], ratio: [0.32, 0.3, 0.38], rd: 26 },
  { id: "idol", label: "Idol", color: "#f472b6", icon: Mic2, desc: "Center position or nothing.", ideal: [55, 56, 82], ratio: [0.24, 0.32, 0.44], rd: 30 },
  { id: "mystery", label: "Mystery", color: "#94a3b8", icon: Eye, desc: "The butler never did it.", ideal: [72, 40, 50], ratio: [0.5, 0.24, 0.26], rd: 32 },
  { id: "cyber", label: "Cyberpunk", color: "#22d3ee", icon: Cpu, desc: "Neon rain and broken AIs.", ideal: [58, 66, 76], ratio: [0.3, 0.36, 0.34], rd: 36 },
  { id: "comedy", label: "Comedy", color: "#ffb347", icon: Laugh, desc: "Gags per minute, guaranteed.", ideal: [58, 55, 50], ratio: [0.36, 0.34, 0.3], rd: 18 },
  { id: "cooking", label: "Cooking", color: "#e76f51", icon: ChefHat, desc: "Food porn in 24fps.", ideal: [48, 66, 58], ratio: [0.3, 0.4, 0.3], rd: 22 },
  { id: "racing", label: "Racing", color: "#e63946", icon: Gauge, desc: "Checkered flags and drifting.", ideal: [72, 70, 46], ratio: [0.28, 0.48, 0.24], rd: 26 },
  { id: "military", label: "Military", color: "#6a994e", icon: Crosshair, desc: "Deploy. Regroup. Repeat.", ideal: [64, 72, 44], ratio: [0.26, 0.5, 0.24], rd: 28 },
  { id: "supernatural", label: "Supernatural", color: "#9d4edd", icon: Wand2, desc: "Monsters behind the curtain.", ideal: [62, 52, 58], ratio: [0.36, 0.3, 0.34], rd: 24 },
  { id: "space", label: "Space", color: "#4cc9f0", icon: Rocket, desc: "The final frontier, animated.", ideal: [60, 74, 66], ratio: [0.26, 0.44, 0.3], rd: 30 },
  { id: "noir", label: "Noir", color: "#8d99ae", icon: VenetianMask, desc: "Rain, hats, and alibis.", ideal: [70, 52, 60], ratio: [0.42, 0.3, 0.28], rd: 26 },
  { id: "magical", label: "Magical Girl", color: "#f72585", icon: Sparkles, desc: "Transform! Sparkle! Save the day.", ideal: [34, 58, 78], ratio: [0.34, 0.3, 0.36], rd: 20 },
];

export const GENRE = (id: GenreId) => GENRES.find((g) => g.id === id)!;

/* genre-pair synergy matrix (GDT-style "great combos") */
const pair = (a: GenreId, b: GenreId) => [a, b].sort().join("|");
export const COMBO: Record<string, number> = {
  [pair("shonen", "sports")]: 1.3,
  [pair("shonen", "fantasy")]: 1.22,
  [pair("shonen", "mecha")]: 1.2,
  [pair("isekai", "fantasy")]: 1.25,
  [pair("isekai", "shonen")]: 1.16,
  [pair("mecha", "cyber")]: 1.25,
  [pair("shojo", "romance")]: 1.25,
  [pair("romance", "slice")]: 1.2,
  [pair("horror", "mystery")]: 1.25,
  [pair("cyber", "mystery")]: 1.2,
  [pair("idol", "slice")]: 1.15,
  [pair("fantasy", "shojo")]: 1.12,
  [pair("sports", "slice")]: 1.1,
  [pair("horror", "cyber")]: 1.1,
  [pair("idol", "shonen")]: 1.08,
  [pair("comedy", "slice")]: 1.16,
  [pair("comedy", "shonen")]: 1.12,
  [pair("cooking", "slice")]: 1.18,
  [pair("cooking", "idol")]: 1.12,
  [pair("racing", "sports")]: 1.25,
  [pair("racing", "mecha")]: 1.15,
  [pair("military", "mecha")]: 1.22,
  [pair("military", "shonen")]: 1.14,
  [pair("supernatural", "horror")]: 1.2,
  [pair("supernatural", "mystery")]: 1.15,
  [pair("space", "mecha")]: 1.24,
  [pair("space", "cyber")]: 1.16,
  [pair("noir", "mystery")]: 1.22,
  [pair("noir", "cyber")]: 1.15,
  [pair("magical", "shojo")]: 1.24,
  [pair("magical", "idol")]: 1.14,
  [pair("comedy", "horror")]: 0.82,
  [pair("racing", "slice")]: 0.85,
  [pair("military", "idol")]: 0.8,
  [pair("space", "shojo")]: 0.85,
  [pair("noir", "slice")]: 0.85,
  [pair("magical", "military")]: 0.8,
  [pair("cyber", "shojo")]: 0.8,
  [pair("mecha", "slice")]: 0.8,
  [pair("horror", "sports")]: 0.8,
  [pair("sports", "mystery")]: 0.85,
  [pair("isekai", "romance")]: 0.88,
  [pair("mecha", "shojo")]: 0.9,
};
export const comboKey = (genres: GenreId[]) => [...genres].sort().join("|");
/** Secret pairings that are WEIRDLY successful — hidden until you ship one. */
export const SECRET_COMBOS: Record<string, number> = {
  [pair("horror", "slice")]: 1.3,
  [pair("idol", "horror")]: 1.28,
  [pair("sports", "mystery")]: 1.26,
  [pair("mecha", "romance")]: 1.24,
  [pair("isekai", "idol")]: 1.22,
  [pair("cyber", "slice")]: 1.22,
  [pair("shonen", "shojo")]: 1.2,
  [pair("mystery", "romance")]: 1.18,
  [pair("horror", "romance")]: 1.16,
  [pair("cyber", "fantasy")]: 1.15,
  [pair("cooking", "horror")]: 1.26,
  [pair("racing", "mystery")]: 1.22,
  [pair("space", "slice")]: 1.24,
  [pair("magical", "military")]: 1.25,
  [pair("noir", "romance")]: 1.2,
};
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

export const BUDGETS: Record<BudgetId, { label: string; cost: number; scope: number; desc: string; heat: number }> = {
  indie: { label: "Ink & Paper Indie", cost: 40_000, scope: 0.85, desc: "Tiny team, huge heart.", heat: 0 },
  standard: { label: "Standard Production", cost: 120_000, scope: 1.0, desc: "Full pipeline, sane deadlines.", heat: 0.15 },
  blockbuster: { label: "Blockbuster Line", cost: 320_000, scope: 1.32, desc: "Insane sakuga. Insane invoices.", heat: 0.3 },
};

export const SLOTS: Record<SlotId, { label: string; cost: number; reach: number; best: GenreId[]; desc: string }> = {
  midnight: { label: "Midnight Otaku Slot", cost: 6_000, reach: 0.78, best: ["horror", "mystery", "cyber", "slice", "noir", "supernatural"], desc: "Cheap airtime for devoted weirdos." },
  evening: { label: "Evening Family Slot", cost: 40_000, reach: 1.15, best: ["romance", "shojo", "slice", "fantasy", "comedy", "cooking", "magical"], desc: "Dinner-table viewing." },
  stream: { label: "Global Streaming", cost: 60_000, reach: 1.35, best: ["isekai", "fantasy", "cyber", "horror", "space", "supernatural"], desc: "Day-one simulcast worldwide." },
  prime: { label: "Prime-Time Saturday", cost: 110_000, reach: 1.62, best: ["shonen", "sports", "mecha", "idol", "racing", "military"], desc: "The whole nation watches." },
};

export const AUDIENCES: Record<AudienceId, { label: string; mult: number; fit: Partial<Record<GenreId, number>>; desc: string }> = {
  kids: { label: "Saturday Kids", mult: 1.0, fit: { shonen: 1.2, sports: 1.15, idol: 1.1, mecha: 1.05, horror: 0.7, cyber: 0.8, mystery: 0.9, romance: 0.9, comedy: 1.15, cooking: 1.1, racing: 1.1, magical: 1.1, supernatural: 0.85, noir: 0.7, military: 0.95, space: 1.0 }, desc: "Toys sell themselves." },
  teens: { label: "Teen Fever", mult: 1.05, fit: { shonen: 1.15, isekai: 1.15, horror: 1.05, mecha: 1.0, romance: 1.0, idol: 1.05, slice: 0.95, comedy: 1.05, racing: 1.15, supernatural: 1.1, space: 1.05, military: 1.05, noir: 0.95, cooking: 0.95, magical: 0.95 }, desc: "Loud, loyal, extremely online." },
  adults: { label: "Seinen Adults", mult: 1.0, fit: { cyber: 1.2, mystery: 1.15, horror: 1.1, slice: 1.05, romance: 1.0, shojo: 0.95, shonen: 0.88, isekai: 0.95, noir: 1.2, military: 1.1, space: 1.05, comedy: 1.0, supernatural: 1.0, cooking: 1.0, racing: 0.95, magical: 0.85 }, desc: "Discerning tastes, deep wallets." },
  family: { label: "All Ages", mult: 1.12, fit: { idol: 1.15, sports: 1.1, shonen: 1.05, fantasy: 1.05, slice: 1.05, horror: 0.85, cyber: 0.9, comedy: 1.15, cooking: 1.15, magical: 1.1, racing: 0.95, space: 0.95, noir: 0.8, military: 0.85, supernatural: 0.9 }, desc: "Hard to please everyone." },
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
  { id: "storyboard", name: "Storyboard Method", rd: 20, desc: "Bubbles linger 25% longer on the floor." },
  { id: "pipeline", name: "Digital Pipeline", rd: 28, desc: "+20% bubble spawn rate in every phase." },
  { id: "qa", name: "Editing Room", rd: 24, desc: "30% fewer editing notes appear on the floor." },
  { id: "marketing", name: "Marketing Dept.", rd: 30, desc: "Unlocks the big promo campaigns." },
  { id: "merch", name: "Merch Division", rd: 34, desc: "+18% revenue from every show." },
  { id: "mocap", name: "Motion Reference", rd: 40, desc: "Art bubbles are worth +1 point." },
  { id: "cg", name: "CG Assist", rd: 44, desc: "+25% bubble spawn rate in every phase." },
  { id: "local", name: "Localisation", rd: 48, desc: "+12% revenue from overseas markets." },
  { id: "autoclean", name: "Auto-Cleanup", rd: 52, desc: "50% fewer editing notes appear." },
  { id: "merch2", name: "Global Merch", rd: 60, desc: "Merch revenue bonus rises to +30%." },
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
/** 2x2 sheet slice: quadrant centers at 25%/75%, window shows ~62% of the sheet */
export const SHEET_POS = ["25% 25%", "75% 25%", "25% 75%", "75% 75%"] as const;
export const SHEET_SIZE = "161% 161%";

export interface CastChem {
  id: string;
  name: string;
  members: string[];
  mult: number;
}
/** Hidden chemistry between specific cast members — discovered by experimenting. */
export const CAST_CHEMS: CastChem[] = [
  { id: "rivalry", name: "Rival Quartet", members: ["kai", "s_riku", "v_carnage"], mult: 1.15 },
  { id: "cat", name: "Cat & Witch", members: ["emi", "p_nya", "v_nightshade"], mult: 1.14 },
  { id: "spooky", name: "Spooky Squad", members: ["kage", "s_chiaki", "v_hollow"], mult: 1.14 },
  { id: "clue", name: "Clue Crew", members: ["shiro", "s_shin", "v_puppeteer"], mult: 1.13 },
  { id: "pirates", name: "Sky Pirates", members: ["kaito", "s_ryo", "v_scuttle"], mult: 1.12 },
  { id: "stage", name: "Stage Lights", members: ["airi", "s_yuna", "p_piko"], mult: 1.12 },
  { id: "aces", name: "Ace Pilots", members: ["rei", "s_ken", "v_volt"], mult: 1.12 },
  { id: "mash", name: "Monster Mash", members: ["yuki", "v_titanus", "p_kona"], mult: 1.11 },
  { id: "tag", name: "Tag Team", members: ["kenta", "s_eiji", "p_gon"], mult: 1.1 },
  { id: "willthey", name: "Will They, Won't They", members: ["hikari", "s_nozomi", "p_mochi"], mult: 1.1 },
  /* --- wave two pairings --- */
  { id: "boardroom", name: "Hostile Takeover", members: ["kuro", "s_tobi", "v_kairos"], mult: 1.15 },
  { id: "skycrew", name: "Sky Crew", members: ["tsubasa", "s_boone", "p_fuwa"], mult: 1.14 },
  { id: "shrine", name: "Foxfire Rite", members: ["suzume", "s_amber", "p_nibi"], mult: 1.14 },
  { id: "quietwar", name: "The Quiet War", members: ["sen", "s_kanna", "v_onikage"], mult: 1.13 },
  { id: "inkwell", name: "Inkwell Nights", members: ["itsuki", "s_alfred", "v_harlequin"], mult: 1.12 },
  { id: "podium", name: "Podium Finish", members: ["leo", "s_maki", "p_ponta"], mult: 1.12 },
  { id: "greenwood", name: "Greenwood Pact", members: ["ash", "s_reina", "p_lumen"], mult: 1.11 },
  { id: "forge", name: "Forge & Spark", members: ["zuri", "s_peko", "p_cogsworth"], mult: 1.11 },
];
export const castChemFor = (draft: { protag: string; secondary: string; pet: string; villain: string }) =>
  CAST_CHEMS.filter((c) =>
    c.members.every((m) => m === draft.protag || m === draft.secondary || m === draft.pet || m === draft.villain)
  );

export const CAST_WEIGHTS: Record<CastRole, number> = {
  protag: 1,
  secondary: 0.55,
  villain: 0.45,
  pet: 0.3,
};

export const CAST_ROLE_LABEL: Record<CastRole, string> = {
  protag: "Protagonist",
  secondary: "Supporting",
  pet: "Pet / Mascot",
  villain: "Villain",
};

const CAST: Record<string, CastMember> = {};
function reg(m: CastMember): CastMember {
  CAST[m.id] = m;
  return m;
}
/**
 * Extra genre affinities for the newer genres, mapped by character id.
 * Kept separate from the reg() lines so the 136 base characters stay readable.
 */
export const CAST_AFF_EXTRA: Record<string, GenreId[]> = {
  /* comedy */
  kenta: ["comedy"], s_kiki: ["comedy"], s_sosuke: ["comedy"], p_chacha: ["comedy"], v_lich: ["comedy"], v_scuttle: ["comedy"],
  /* cooking */
  taro: ["cooking"], s_koko: ["cooking"], s_okada: ["cooking"], p_pudding: ["cooking"], p_mocha: ["cooking"],
  /* racing */
  rin: ["racing"], jin: ["racing"], s_haruto: ["racing"], p_pochi: ["racing"], v_tempest: ["racing"],
  /* military */
  daichi: ["military"], s_takeshi: ["military"], s_gen: ["military"], v_warden: ["military"], v_ash: ["military"], v_kurogane: ["military"],
  /* supernatural */
  shiori: ["supernatural"], s_chiaki: ["supernatural"], p_baku: ["supernatural"], p_kuro: ["supernatural"], v_moth: ["supernatural"], v_nightshade: ["supernatural"],
  /* space */
  sora: ["space"], mira: ["space"], p_koro: ["space"], p_tama: ["space"], v_paradox: ["space"], v_zero: ["space"], v_mirage: ["space"],
  /* noir */
  akira: ["noir"], renji: ["noir"], s_shin: ["noir"], s_aoi: ["noir"], v_nocturne: ["noir"], v_silence: ["noir"],
  /* magical */
  hikari: ["magical"], emi: ["magical"], s_mimi: ["magical"], p_nya: ["magical"], p_piko: ["magical"], v_hex: ["magical"],
  /* --- wave two cast (sheets 9-10) --- */
  sen: ["noir", "military"], zuri: ["racing", "cooking"], ash: ["supernatural"], kuro: ["noir", "racing"],
  tsubasa: ["racing", "military", "space"], itsuki: ["noir", "supernatural"], suzume: ["supernatural", "magical"], leo: ["comedy", "racing"],
  s_boone: ["racing", "cooking"], s_peko: ["comedy", "magical"], s_reina: ["military", "noir"], s_amber: ["supernatural", "cooking"],
  s_kanna: ["military", "noir"], s_alfred: ["noir", "comedy"], s_tobi: ["noir", "space"], s_maki: ["racing", "military"],
  p_drakko: ["magical", "comedy"], p_sakumi: ["magical", "supernatural"], p_cogsworth: ["noir", "space"], p_bloop: ["space", "magical"],
  p_ponta: ["comedy", "cooking"], p_lumen: ["magical", "supernatural"], p_nibi: ["supernatural", "noir"], p_fuwa: ["comedy", "space"],
  v_amethyst: ["magical", "supernatural"], v_gravemark: ["military"], v_kairos: ["noir", "space"], v_plague: ["supernatural", "noir"],
  v_harlequin: ["comedy", "supernatural"], v_onikage: ["supernatural", "military"], v_hollowchild: ["magical", "space"], v_bioform: ["military", "space"],
};

export const castById = (id: string): CastMember => {
  const c = CAST[id] ?? CAST.kai;
  const extra = CAST_AFF_EXTRA[id];
  return extra ? { ...c, aff: [...c.aff, ...extra] } : c;
};
export const castList = (role: CastRole): CastMember[] =>
  Object.values(CAST)
    .filter((c) => c.role === role)
    .map((c) => {
      const extra = CAST_AFF_EXTRA[c.id];
      return extra ? { ...c, aff: [...c.aff, ...extra] } : c;
    });

/* ------------------------------------------------------------ protagonists */
export const PROTAGONISTS: CastMember[] = [
  reg({ id: "kai", name: "Kai", archetype: "Battle Heart", img: "img/protag-kai.jpg", tag: "Never gives up. Ever.", aff: ["shonen", "sports", "fantasy"], role: "protag" }),
  reg({ id: "hikari", name: "Hikari", archetype: "Prism Wish", img: "img/protag-hikari.jpg", tag: "Transforms homework into miracles.", aff: ["shojo", "fantasy", "romance"], role: "protag" }),
  reg({ id: "rei", name: "Rei", archetype: "Steel Resolve", img: "img/protag-rei.jpg", tag: "Sync rate: 400% on Mondays.", aff: ["mecha", "cyber", "mystery"], role: "protag" }),
  reg({ id: "sora", name: "Sora", archetype: "Skyblade", img: "img/protag-sora.jpg", tag: "Reincarnated with max charisma.", aff: ["isekai", "fantasy", "shonen"], role: "protag" }),
  reg({ id: "yui", name: "Yui", archetype: "Everyday Warmth", img: "img/protag-yui.jpg", tag: "Weaponized coziness.", aff: ["slice", "romance", "shojo"], role: "protag" }),
  reg({ id: "kage", name: "Kage", archetype: "Shadow Edge", img: "img/protag-kage.jpg", tag: "Monologues in the rain.", aff: ["horror", "mystery", "cyber"], role: "protag" }),
  reg({ id: "airi", name: "Airi", archetype: "Center Stage", img: "img/protag-airi.jpg", tag: "Streams at 3AM, still sparkling.", aff: ["idol", "shonen", "slice"], role: "protag" }),
  reg({ id: "shiro", name: "Shiro", archetype: "Keen Mind", img: "img/protag-shiro.jpg", tag: "Solved the plot in episode 1.", aff: ["mystery", "horror", "slice"], role: "protag" }),
  reg({ id: "mako", name: "Mako", archetype: "Tidecaller", img: "img/cast-protag-1.jpg", pos: 0, tag: "The ocean always answers back.", aff: ["fantasy", "shonen", "sports"], role: "protag" }),
  reg({ id: "rin", name: "Rin", archetype: "Thunderstep", img: "img/cast-protag-1.jpg", pos: 1, tag: "Laps everyone at full sprint.", aff: ["sports", "shonen", "slice"], role: "protag" }),
  reg({ id: "niko", name: "Niko", archetype: "Gadget Ghost", img: "img/cast-protag-1.jpg", pos: 2, tag: "Prototypes things that shouldn't fly. They do.", aff: ["cyber", "mystery", "mecha"], role: "protag" }),
  reg({ id: "aya", name: "Aya", archetype: "Rose Thorn", img: "img/cast-protag-1.jpg", pos: 3, tag: "Sweet to everyone. Sharp when needed.", aff: ["shojo", "romance", "mystery"], role: "protag" }),
  reg({ id: "taro", name: "Taro", archetype: "Iron Chef", img: "img/cast-protag-2.jpg", pos: 0, tag: "Cooks for the whole guild.", aff: ["slice", "sports", "fantasy"], role: "protag" }),
  reg({ id: "mio", name: "Mio", archetype: "Moonlit Dancer", img: "img/cast-protag-2.jpg", pos: 1, tag: "Dances like the moon is watching.", aff: ["idol", "slice", "romance"], role: "protag" }),
  reg({ id: "kenta", name: "Kenta", archetype: "Punchline", img: "img/cast-protag-2.jpg", pos: 2, tag: "Jokes first, uppercuts second.", aff: ["shonen", "sports", "idol"], role: "protag" }),
  reg({ id: "saki", name: "Saki", archetype: "Paper Crane", img: "img/cast-protag-2.jpg", pos: 3, tag: "Folds every clue into place.", aff: ["slice", "mystery", "shojo"], role: "protag" }),
  reg({ id: "ryu", name: "Ryu", archetype: "Dragonheart", img: "img/cast-protag-3.jpg", pos: 0, tag: "His roar shakes the arena.", aff: ["shonen", "fantasy", "isekai"], role: "protag" }),
  reg({ id: "nana", name: "Nana", archetype: "Bubblegum Punk", img: "img/cast-protag-3.jpg", pos: 1, tag: "Cute on the outside, synthwave inside.", aff: ["idol", "cyber", "shojo"], role: "protag" }),
  reg({ id: "jin", name: "Jin", archetype: "Ghost Driver", img: "img/cast-protag-3.jpg", pos: 2, tag: "Drifts through traffic and timelines.", aff: ["mecha", "cyber", "sports"], role: "protag" }),
  reg({ id: "emi", name: "Emi", archetype: "Cottage Witch", img: "img/cast-protag-3.jpg", pos: 3, tag: "Brews tea and minor miracles.", aff: ["fantasy", "slice", "romance"], role: "protag" }),
  reg({ id: "goro", name: "Goro", archetype: "Sumo Spirit", img: "img/cast-protag-4.jpg", pos: 0, tag: "A gentle giant with a thunderous stomp.", aff: ["sports", "shonen", "slice"], role: "protag" }),
  reg({ id: "hana", name: "Hana", archetype: "Petalfall", img: "img/cast-protag-4.jpg", pos: 1, tag: "Petals follow her everywhere.", aff: ["shojo", "fantasy", "romance"], role: "protag" }),
  reg({ id: "daichi", name: "Daichi", archetype: "Earthbreaker", img: "img/cast-protag-4.jpg", pos: 2, tag: "Boulders flinch first.", aff: ["shonen", "fantasy", "sports"], role: "protag" }),
  reg({ id: "yuki", name: "Yuki", archetype: "Frostbite", img: "img/cast-protag-4.jpg", pos: 3, tag: "Cold outside, colder in a mystery.", aff: ["horror", "mystery", "slice"], role: "protag" }),
  reg({ id: "mira", name: "Mira", archetype: "Nebula Singer", img: "img/cast-protag-5.jpg", pos: 0, tag: "Her high notes bend gravity.", aff: ["idol", "cyber", "fantasy"], role: "protag" }),
  reg({ id: "kaito", name: "Kaito", archetype: "Sky Pirate", img: "img/cast-protag-5.jpg", pos: 1, tag: "Borrows airships. Returns them… eventually.", aff: ["fantasy", "shonen", "isekai"], role: "protag" }),
  reg({ id: "riko", name: "Riko", archetype: "Clockwork Heart", img: "img/cast-protag-5.jpg", pos: 2, tag: "Every gear has a purpose.", aff: ["mystery", "mecha", "cyber"], role: "protag" }),
  reg({ id: "akira", name: "Akira", archetype: "Neon Ronin", img: "img/cast-protag-5.jpg", pos: 3, tag: "Wanders the rain-lit city.", aff: ["cyber", "shonen", "horror"], role: "protag" }),
  reg({ id: "momo", name: "Momo", archetype: "Peach Bomb", img: "img/cast-protag-6.jpg", pos: 0, tag: "Explosively cheerful.", aff: ["shojo", "idol", "shonen"], role: "protag" }),
  reg({ id: "takumi", name: "Takumi", archetype: "Paper Thin", img: "img/cast-protag-6.jpg", pos: 1, tag: "Reads people like manuscripts.", aff: ["mystery", "slice", "romance"], role: "protag" }),
  reg({ id: "shiori", name: "Shiori", archetype: "Wispkeeper", img: "img/cast-protag-6.jpg", pos: 2, tag: "Talks to the lights in the woods.", aff: ["horror", "fantasy", "mystery"], role: "protag" }),
  reg({ id: "haru", name: "Haru", archetype: "Sunrise Sprinter", img: "img/cast-protag-6.jpg", pos: 3, tag: "First one on the track every day.", aff: ["sports", "slice", "shonen"], role: "protag" }),
  reg({ id: "yuzuki", name: "Yuzuki", archetype: "Lantern Guide", img: "img/cast-protag-7.jpg", pos: 0, tag: "Leads the lost home.", aff: ["shojo", "slice", "mystery"], role: "protag" }),
  reg({ id: "kota", name: "Kota", archetype: "Oak Heart", img: "img/cast-protag-7.jpg", pos: 1, tag: "Stubborn as a tree, twice as loyal.", aff: ["shonen", "fantasy", "sports"], role: "protag" }),
  reg({ id: "fumi", name: "Fumi", archetype: "Brushstroke", img: "img/cast-protag-7.jpg", pos: 2, tag: "Paints what words can't.", aff: ["slice", "idol", "shojo"], role: "protag" }),
  reg({ id: "renji", name: "Renji", archetype: "Silent Snow", img: "img/cast-protag-7.jpg", pos: 3, tag: "Speaks once, and it matters.", aff: ["mystery", "romance", "cyber"], role: "protag" }),
  reg({ id: "sakura", name: "Sakura", archetype: "Blossom Blade", img: "img/cast-protag-8.jpg", pos: 0, tag: "Gentle petals, sharper edge.", aff: ["shonen", "shojo", "fantasy"], role: "protag" }),
  reg({ id: "jun", name: "Jun", archetype: "Foxfire", img: "img/cast-protag-8.jpg", pos: 1, tag: "Always three tricks ahead.", aff: ["fantasy", "isekai", "mystery"], role: "protag" }),
  reg({ id: "kaede", name: "Kaede", archetype: "Autumn Verse", img: "img/cast-protag-8.jpg", pos: 2, tag: "Writes haiku, wins duels.", aff: ["slice", "romance", "fantasy"], role: "protag" }),
  reg({ id: "sota", name: "Sota", archetype: "Debugger", img: "img/cast-protag-8.jpg", pos: 3, tag: "Found the bug. Fixed the world.", aff: ["cyber", "mystery", "mecha"], role: "protag" }),
  /* --- wave two (sheets 9-10) --- */
  reg({ id: "sen", name: "Sen", archetype: "Scarred Blade", img: "img/cast-protag-9.jpg", pos: 0, tag: "The scar remembers so he doesn't have to.", aff: ["shonen", "mystery", "horror"], role: "protag" }),
  reg({ id: "zuri", name: "Zuri", archetype: "Gearsmith", img: "img/cast-protag-9.jpg", pos: 1, tag: "Builds it twice, breaks it once.", aff: ["mecha", "sports", "fantasy"], role: "protag" }),
  reg({ id: "ash", name: "Ash", archetype: "Green Arrow", img: "img/cast-protag-9.jpg", pos: 2, tag: "Never misses. Never brags.", aff: ["fantasy", "isekai", "mystery"], role: "protag" }),
  reg({ id: "kuro", name: "Kuro", archetype: "Red Coat", img: "img/cast-protag-9.jpg", pos: 3, tag: "Trouble finds him. He charges it rent.", aff: ["cyber", "shonen", "horror"], role: "protag" }),
  reg({ id: "tsubasa", name: "Tsubasa", archetype: "Sky Wrench", img: "img/cast-protag-10.jpg", pos: 0, tag: "Flies first, files paperwork never.", aff: ["mecha", "isekai", "sports"], role: "protag" }),
  reg({ id: "itsuki", name: "Itsuki", archetype: "Ink & Lamplight", img: "img/cast-protag-10.jpg", pos: 1, tag: "Writes the ending before the start.", aff: ["romance", "mystery", "slice"], role: "protag" }),
  reg({ id: "suzume", name: "Suzume", archetype: "Foxfire Maiden", img: "img/cast-protag-10.jpg", pos: 2, tag: "The shrine bells ring when she's angry.", aff: ["fantasy", "horror", "shojo"], role: "protag" }),
  reg({ id: "leo", name: "Leo", archetype: "No Rules", img: "img/cast-protag-10.jpg", pos: 3, tag: "Lands the trick on the last take.", aff: ["sports", "slice", "idol"], role: "protag" }),
];

/* ------------------------------------------------------------ supporting */
export const SECONDARY: CastMember[] = [
  reg({ id: "s_ren", name: "Ren", archetype: "The Trusty Sidekick", img: "img/cast-secondary-1.jpg", pos: 0, tag: "Has your back, always.", aff: ["shonen", "slice", "sports"], role: "secondary" }),
  reg({ id: "s_mika", name: "Mika", archetype: "The Sass Master", img: "img/cast-secondary-1.jpg", pos: 1, tag: "Burns brighter than the plot.", aff: ["shojo", "romance", "slice"], role: "secondary" }),
  reg({ id: "s_okada", name: "Okada", archetype: "The Old Sensei", img: "img/cast-secondary-1.jpg", pos: 2, tag: "Wise, gruff, secretly soft.", aff: ["sports", "shonen", "slice"], role: "secondary" }),
  reg({ id: "s_kiki", name: "Kiki", archetype: "The Comedic Engine", img: "img/cast-secondary-1.jpg", pos: 3, tag: "Falls up the stairs. Saves the day.", aff: ["slice", "shonen", "idol"], role: "secondary" }),
  reg({ id: "s_akane", name: "Akane", archetype: "The Cool Senpai", img: "img/cast-secondary-2.jpg", pos: 0, tag: "Everyone wants her approval.", aff: ["sports", "idol", "shojo"], role: "secondary" }),
  reg({ id: "s_chiaki", name: "Chiaki", archetype: "The Transfer Student", img: "img/cast-secondary-2.jpg", pos: 1, tag: "Knows things they shouldn't.", aff: ["mystery", "horror", "cyber"], role: "secondary" }),
  reg({ id: "s_momoko", name: "Momoko", archetype: "The Team Manager", img: "img/cast-secondary-2.jpg", pos: 2, tag: "Runs the schedule like a general.", aff: ["slice", "sports", "idol"], role: "secondary" }),
  reg({ id: "s_ichiro", name: "Ichiro", archetype: "Soft-Hearted Delinquent", img: "img/cast-secondary-2.jpg", pos: 3, tag: "Tough exterior, tofu interior.", aff: ["shonen", "slice", "romance"], role: "secondary" }),
  reg({ id: "s_anna", name: "Anna", archetype: "The Walking Encyclopedia", img: "img/cast-secondary-3.jpg", pos: 0, tag: "Spoilers the mystery genre.", aff: ["mystery", "slice", "fantasy"], role: "secondary" }),
  reg({ id: "s_takeshi", name: "Takeshi", archetype: "The Drill Coach", img: "img/cast-secondary-3.jpg", pos: 1, tag: "No pain, no montage.", aff: ["sports", "shonen", "mecha"], role: "secondary" }),
  reg({ id: "s_lulu", name: "Lulu", archetype: "The Superfan", img: "img/cast-secondary-3.jpg", pos: 2, tag: "Owns every limited edition.", aff: ["idol", "shojo", "slice"], role: "secondary" }),
  reg({ id: "s_haruto", name: "Nyanko", archetype: "The Streetwise Cat", img: "img/cast-secondary-3.jpg", pos: 3, tag: "Nine lives, one master plan.", aff: ["slice", "shonen", "mystery"], role: "secondary" }),
  reg({ id: "s_nozomi", name: "Nozomi", archetype: "The Childhood Friend", img: "img/cast-secondary-4.jpg", pos: 0, tag: "Been there since episode 0.", aff: ["romance", "slice", "shojo"], role: "secondary" }),
  reg({ id: "s_daiki", name: "Daiki", archetype: "The Night Owl Gamer", img: "img/cast-secondary-4.jpg", pos: 1, tag: "Ranks #1 by 4AM.", aff: ["cyber", "mecha", "slice"], role: "secondary" }),
  reg({ id: "s_sakurako", name: "Sakurako", archetype: "The Elegant Rival", img: "img/cast-secondary-4.jpg", pos: 2, tag: "Loses gracefully. Barely.", aff: ["shojo", "idol", "mystery"], role: "secondary" }),
  reg({ id: "s_gen", name: "Gen", archetype: "The Lazy Genius", img: "img/cast-secondary-4.jpg", pos: 3, tag: "Solved it while napping.", aff: ["mystery", "cyber", "slice"], role: "secondary" }),
  reg({ id: "s_yuna", name: "Yuna", archetype: "The Cheer Captain", img: "img/cast-secondary-5.jpg", pos: 0, tag: "Volume is her superpower.", aff: ["sports", "idol", "shonen"], role: "secondary" }),
  reg({ id: "s_ken", name: "Ken", archetype: "Strong & Silent", img: "img/cast-secondary-5.jpg", pos: 1, tag: "One nod says everything.", aff: ["shonen", "mecha", "sports"], role: "secondary" }),
  reg({ id: "s_mimi", name: "Mimi", archetype: "The Fashion Queen", img: "img/cast-secondary-5.jpg", pos: 2, tag: "Costume changes mid-battle.", aff: ["shojo", "idol", "romance"], role: "secondary" }),
  reg({ id: "s_riku", name: "Riku", archetype: "The Rival Ace", img: "img/cast-secondary-5.jpg", pos: 3, tag: "Beats you, then buys you ramen.", aff: ["sports", "shonen", "mecha"], role: "secondary" }),
  reg({ id: "s_aoi", name: "Aoi", archetype: "The Weather Girl", img: "img/cast-secondary-6.jpg", pos: 0, tag: "Smiles through any storm.", aff: ["slice", "romance", "shojo"], role: "secondary" }),
  reg({ id: "s_shin", name: "Pip", archetype: "The Alien Analyst", img: "img/cast-secondary-6.jpg", pos: 1, tag: "Flew 40 light-years for this plot.", aff: ["mystery", "cyber", "horror"], role: "secondary" }),
  reg({ id: "s_chika", name: "Chika", archetype: "The Pastry Dragon", img: "img/cast-secondary-6.jpg", pos: 2, tag: "Bribes everyone with cake. Occasionally breathes fire.", aff: ["slice", "fantasy", "romance"], role: "secondary" }),
  reg({ id: "s_ryo", name: "Ryo", archetype: "The Street Performer", img: "img/cast-secondary-6.jpg", pos: 3, tag: "Busks until the encore.", aff: ["idol", "slice", "romance"], role: "secondary" }),
  reg({ id: "s_megu", name: "Megu", archetype: "The Class Rep", img: "img/cast-secondary-7.jpg", pos: 0, tag: "Stern. Fair. Terrifying.", aff: ["slice", "mystery", "shojo"], role: "secondary" }),
  reg({ id: "s_tora", name: "Tora", archetype: "The Tiger Bruiser", img: "img/cast-secondary-7.jpg", pos: 1, tag: "Purrs before the knockout.", aff: ["shonen", "sports", "fantasy"], role: "secondary" }),
  reg({ id: "s_hina", name: "Hina", archetype: "The Timid Artist", img: "img/cast-secondary-7.jpg", pos: 2, tag: "Quiet hands, loud art.", aff: ["slice", "shojo", "romance"], role: "secondary" }),
  reg({ id: "s_kazuki", name: "Kazuki", archetype: "The Drama Club Star", img: "img/cast-secondary-7.jpg", pos: 3, tag: "Every exit is a mic drop.", aff: ["idol", "romance", "shojo"], role: "secondary" }),
  reg({ id: "s_nanami", name: "Nanami", archetype: "The Gossip Columnist", img: "img/cast-secondary-8.jpg", pos: 0, tag: "Knows before it happens.", aff: ["slice", "mystery", "romance"], role: "secondary" }),
  reg({ id: "s_eiji", name: "Eiji", archetype: "The Big Brother", img: "img/cast-secondary-8.jpg", pos: 1, tag: "Threatens every suitor.", aff: ["shonen", "slice", "sports"], role: "secondary" }),
  reg({ id: "s_koko", name: "Koko", archetype: "The Mystic Cat", img: "img/cast-secondary-8.jpg", pos: 2, tag: "Predicts cliffhangers. Demands tuna.", aff: ["mystery", "fantasy", "horror"], role: "secondary" }),
  reg({ id: "s_sosuke", name: "Sosuke", archetype: "The Automaton Butler", img: "img/cast-secondary-8.jpg", pos: 3, tag: "Polished. Unreadable. Battery at 99%.", aff: ["mystery", "mecha", "slice"], role: "secondary" }),
  /* --- wave two (sheets 9-10) --- */
  reg({ id: "s_boone", name: "Boone", archetype: "The Grease Mentor", img: "img/cast-secondary-9.jpg", pos: 0, tag: "Fixes engines and egos.", aff: ["mecha", "sports", "slice"], role: "secondary" }),
  reg({ id: "s_peko", name: "Peko", archetype: "The Hype Friend", img: "img/cast-secondary-9.jpg", pos: 1, tag: "Confetti follows her indoors.", aff: ["idol", "shojo", "slice"], role: "secondary" }),
  reg({ id: "s_reina", name: "Reina", archetype: "The Council President", img: "img/cast-secondary-9.jpg", pos: 2, tag: "The clipboard is a weapon.", aff: ["mystery", "romance", "slice"], role: "secondary" }),
  reg({ id: "s_amber", name: "Amber", archetype: "The Hooded Traveller", img: "img/cast-secondary-9.jpg", pos: 3, tag: "Knows every road and none of the rules.", aff: ["isekai", "fantasy", "mystery"], role: "secondary" }),
  reg({ id: "s_kanna", name: "Kanna", archetype: "The Silent Bodyguard", img: "img/cast-secondary-10.jpg", pos: 0, tag: "One eye. Zero misses.", aff: ["mystery", "horror", "cyber"], role: "secondary" }),
  reg({ id: "s_alfred", name: "Alfred", archetype: "The Perfect Butler", img: "img/cast-secondary-10.jpg", pos: 1, tag: "Tea at three. Secrets at midnight.", aff: ["mystery", "romance", "shojo"], role: "secondary" }),
  reg({ id: "s_tobi", name: "Tobi", archetype: "The Rookie Reporter", img: "img/cast-secondary-10.jpg", pos: 2, tag: "Shutter first, questions later.", aff: ["slice", "mystery", "cyber"], role: "secondary" }),
  reg({ id: "s_maki", name: "Maki", archetype: "The Rival Ace", img: "img/cast-secondary-10.jpg", pos: 3, tag: "Beats your record, then your excuses.", aff: ["sports", "shonen", "idol"], role: "secondary" }),
];

/* ------------------------------------------------------------------ pets */
export const PETS: CastMember[] = [
  reg({ id: "p_mochi", name: "Mochi", archetype: "Round Cream Cat", img: "img/cast-pet-1.jpg", pos: 0, tag: "Purrs in stereo.", aff: ["slice", "shojo"], role: "pet" }),
  reg({ id: "p_pudding", name: "Pudding", archetype: "Wobbly Blob Dog", img: "img/cast-pet-1.jpg", pos: 1, tag: "Jiggles when excited.", aff: ["slice", "romance"], role: "pet" }),
  reg({ id: "p_koro", name: "Koro", archetype: "Space Hamster", img: "img/cast-pet-1.jpg", pos: 2, tag: "Cheeks store stardust.", aff: ["mecha", "cyber", "isekai"], role: "pet" }),
  reg({ id: "p_tama", name: "Tama", archetype: "Floating Baby Whale", img: "img/cast-pet-1.jpg", pos: 3, tag: "Sings the sky to sleep.", aff: ["fantasy", "slice"], role: "pet" }),
  reg({ id: "p_peko", name: "Peko", archetype: "Leaf Chick", img: "img/cast-pet-2.jpg", pos: 0, tag: "Peeps on beat.", aff: ["slice", "shojo"], role: "pet" }),
  reg({ id: "p_umi", name: "Umi", archetype: "Blue Axolotl", img: "img/cast-pet-2.jpg", pos: 1, tag: "Regrows its bad days.", aff: ["slice", "mystery"], role: "pet" }),
  reg({ id: "p_baku", name: "Baku", archetype: "Dream Eater", img: "img/cast-pet-2.jpg", pos: 2, tag: "Naps nightmares away.", aff: ["fantasy", "horror"], role: "pet" }),
  reg({ id: "p_kuro", name: "Kuro", archetype: "Shadow Fox", img: "img/cast-pet-2.jpg", pos: 3, tag: "Hides in plain sight.", aff: ["mystery", "horror", "cyber"], role: "pet" }),
  reg({ id: "p_momo2", name: "Momo", archetype: "Peach Rabbit", img: "img/cast-pet-3.jpg", pos: 0, tag: "Bounces like a fruit.", aff: ["shojo", "slice"], role: "pet" }),
  reg({ id: "p_gon", name: "Gon", archetype: "Baby Dinosaur", img: "img/cast-pet-3.jpg", pos: 1, tag: "Rawrs in squeaky.", aff: ["shonen", "fantasy"], role: "pet" }),
  reg({ id: "p_chibi", name: "Chibi", archetype: "Tuxedo Penguin", img: "img/cast-pet-3.jpg", pos: 2, tag: "Always overdressed.", aff: ["slice", "mystery"], role: "pet" }),
  reg({ id: "p_nya", name: "Nya", archetype: "Witch Cat", img: "img/cast-pet-3.jpg", pos: 3, tag: "Curses are purr-fect.", aff: ["fantasy", "shojo"], role: "pet" }),
  reg({ id: "p_pochi", name: "Pochi", archetype: "Robot Puppy", img: "img/cast-pet-4.jpg", pos: 0, tag: "Wags its antenna.", aff: ["mecha", "cyber"], role: "pet" }),
  reg({ id: "p_ruri", name: "Ruri", archetype: "Crystal Bird", img: "img/cast-pet-4.jpg", pos: 1, tag: "Sings in rainbows.", aff: ["fantasy", "idol"], role: "pet" }),
  reg({ id: "p_toro", name: "Toro", archetype: "Tanuki", img: "img/cast-pet-4.jpg", pos: 2, tag: "Shapeshifts into a kettle.", aff: ["slice", "fantasy"], role: "pet" }),
  reg({ id: "p_piko", name: "Piko", archetype: "Pixel Slime", img: "img/cast-pet-4.jpg", pos: 3, tag: "8-bit bounces.", aff: ["cyber", "isekai"], role: "pet" }),
  reg({ id: "p_mugi", name: "Mugi", archetype: "Bear Cub", img: "img/cast-pet-5.jpg", pos: 0, tag: "Honey-powered.", aff: ["slice", "shonen"], role: "pet" }),
  reg({ id: "p_sora", name: "Sora", archetype: "Cloud Sheep", img: "img/cast-pet-5.jpg", pos: 1, tag: "Counts you to sleep.", aff: ["slice", "fantasy"], role: "pet" }),
  reg({ id: "p_hachi", name: "Hachi", archetype: "Bumblebee", img: "img/cast-pet-5.jpg", pos: 2, tag: "Buzzes in harmony.", aff: ["slice", "sports"], role: "pet" }),
  reg({ id: "p_fuu", name: "Fuu", archetype: "Wind Spirit", img: "img/cast-pet-5.jpg", pos: 3, tag: "Whistles secrets.", aff: ["fantasy", "mystery"], role: "pet" }),
  reg({ id: "p_kona", name: "Kona", archetype: "Snow Yeti Cub", img: "img/cast-pet-6.jpg", pos: 0, tag: "Melts in hugs.", aff: ["slice", "horror"], role: "pet" }),
  reg({ id: "p_maru", name: "Maru", archetype: "Round Owl", img: "img/cast-pet-6.jpg", pos: 1, tag: "Hoots at 3AM.", aff: ["mystery", "fantasy"], role: "pet" }),
  reg({ id: "p_teto", name: "Teto", archetype: "Frog", img: "img/cast-pet-6.jpg", pos: 2, tag: "Ribbits on cue.", aff: ["slice", "sports"], role: "pet" }),
  reg({ id: "p_kiki2", name: "Kiki", archetype: "Fire Salamander", img: "img/cast-pet-6.jpg", pos: 3, tag: "Warm hugs, warm hugs only.", aff: ["fantasy", "shonen"], role: "pet" }),
  reg({ id: "p_nemu", name: "Nemu", archetype: "Sleepy Sloth", img: "img/cast-pet-7.jpg", pos: 0, tag: "Moves at plot speed.", aff: ["slice", "romance"], role: "pet" }),
  reg({ id: "p_pomu", name: "Pomu", archetype: "Apple Squirrel", img: "img/cast-pet-7.jpg", pos: 1, tag: "Stashes shiny things.", aff: ["slice", "shojo"], role: "pet" }),
  reg({ id: "p_chacha", name: "Chacha", archetype: "Monkey", img: "img/cast-pet-7.jpg", pos: 2, tag: "Steals the spotlight.", aff: ["shonen", "slice"], role: "pet" }),
  reg({ id: "p_rin2", name: "Rin", archetype: "Pearl Koi", img: "img/cast-pet-7.jpg", pos: 3, tag: "Swims through wishes.", aff: ["fantasy", "shojo"], role: "pet" }),
  reg({ id: "p_mocha", name: "Mocha", archetype: "Coffee Ferret", img: "img/cast-pet-8.jpg", pos: 0, tag: "Brews trouble.", aff: ["slice", "cyber"], role: "pet" }),
  reg({ id: "p_yuzu", name: "Yuzu", archetype: "Citrus Cat", img: "img/cast-pet-8.jpg", pos: 1, tag: "Zesty zoomies.", aff: ["slice", "shojo"], role: "pet" }),
  reg({ id: "p_goma", name: "Goma", archetype: "Sesame Dog", img: "img/cast-pet-8.jpg", pos: 2, tag: "Sprinkled with love.", aff: ["slice", "romance"], role: "pet" }),
  reg({ id: "p_puri", name: "Puri", archetype: "Cream Dragon", img: "img/cast-pet-8.jpg", pos: 3, tag: "Toasts marshmallows.", aff: ["fantasy", "shonen", "isekai"], role: "pet" }),
  /* --- wave two (sheets 9-10) --- */
  reg({ id: "p_drakko", name: "Drakko", archetype: "Dragon Hatchling", img: "img/cast-pet-9.jpg", pos: 0, tag: "Hoards socks. Guards them fiercely.", aff: ["fantasy", "isekai", "shonen"], role: "pet" }),
  reg({ id: "p_sakumi", name: "Sakumi", archetype: "Blossom Ferret", img: "img/cast-pet-9.jpg", pos: 1, tag: "Sheds petals, not fur.", aff: ["shojo", "slice", "romance"], role: "pet" }),
  reg({ id: "p_cogsworth", name: "Cogsworth", archetype: "Clockwork Owl", img: "img/cast-pet-9.jpg", pos: 2, tag: "Ticks. Judges. Ticks again.", aff: ["mystery", "mecha", "cyber"], role: "pet" }),
  reg({ id: "p_bloop", name: "Bloop", archetype: "Prism Jelly", img: "img/cast-pet-9.jpg", pos: 3, tag: "Glows brightest when hugged.", aff: ["fantasy", "slice", "cyber"], role: "pet" }),
  reg({ id: "p_ponta", name: "Ponta", archetype: "Grumpy Red Panda", img: "img/cast-pet-10.jpg", pos: 0, tag: "Sighs like a middle manager.", aff: ["slice", "romance"], role: "pet" }),
  reg({ id: "p_lumen", name: "Lumen", archetype: "Crystal Fawn", img: "img/cast-pet-10.jpg", pos: 1, tag: "Antlers hum near the truth.", aff: ["fantasy", "mystery", "shojo"], role: "pet" }),
  reg({ id: "p_nibi", name: "Nibi", archetype: "Two-Tail Cat", img: "img/cast-pet-10.jpg", pos: 2, tag: "Two tails, twice the trouble.", aff: ["horror", "mystery", "fantasy"], role: "pet" }),
  reg({ id: "p_fuwa", name: "Fuwa", archetype: "Cloud Sheep", img: "img/cast-pet-10.jpg", pos: 3, tag: "Naps loudly. Thunders quietly.", aff: ["slice", "shojo", "sports"], role: "pet" }),
];

/* ---------------------------------------------------------------- villains */
export const VILLAINS: CastMember[] = [
  reg({ id: "v_kurogane", name: "Kurogane", archetype: "The Iron Tyrant", img: "img/cast-villain-1.jpg", pos: 0, tag: "Ruled by the sword.", aff: ["shonen", "fantasy", "mecha"], role: "villain" }),
  reg({ id: "v_nocturne", name: "Nocturne", archetype: "Queen of Shadows", img: "img/cast-villain-1.jpg", pos: 1, tag: "Darkness obeys her.", aff: ["horror", "mystery", "shojo"], role: "villain" }),
  reg({ id: "v_baron", name: "Baron Skull", archetype: "The Bone Baron", img: "img/cast-villain-1.jpg", pos: 2, tag: "Collects rival titles.", aff: ["horror", "fantasy"], role: "villain" }),
  reg({ id: "v_venom", name: "Madame Venom", archetype: "The Poison Tongue", img: "img/cast-villain-1.jpg", pos: 3, tag: "Every word stings.", aff: ["mystery", "shojo", "horror"], role: "villain" }),
  reg({ id: "v_volt", name: "General Volt", archetype: "The Thunder Warlord", img: "img/cast-villain-2.jpg", pos: 0, tag: "Strikes without warning.", aff: ["mecha", "shonen", "cyber"], role: "villain" }),
  reg({ id: "v_hollow", name: "The Hollow King", archetype: "Crown of Nothing", img: "img/cast-villain-2.jpg", pos: 1, tag: "His gaze empties rooms.", aff: ["horror", "mystery"], role: "villain" }),
  reg({ id: "v_reaper", name: "Crimson Reaper", archetype: "The Red Harvest", img: "img/cast-villain-2.jpg", pos: 2, tag: "Counts down every episode.", aff: ["horror", "shonen"], role: "villain" }),
  reg({ id: "v_mirage", name: "Doctor Mirage", archetype: "The Illusionist", img: "img/cast-villain-2.jpg", pos: 3, tag: "Reality is negotiable.", aff: ["mystery", "cyber", "fantasy"], role: "villain" }),
  reg({ id: "v_obsidian", name: "Empress Obsidian", archetype: "The Glass Throne", img: "img/cast-villain-3.jpg", pos: 0, tag: "Shatters and rebuilds.", aff: ["shojo", "fantasy", "horror"], role: "villain" }),
  reg({ id: "v_tempest", name: "Lord Tempest", archetype: "The Storm Court", img: "img/cast-villain-3.jpg", pos: 1, tag: "Weathers every siege.", aff: ["fantasy", "sports", "shonen"], role: "villain" }),
  reg({ id: "v_sinister", name: "Sister Sinister", archetype: "The Sweet Fang", img: "img/cast-villain-3.jpg", pos: 2, tag: "Smiles while scheming.", aff: ["shojo", "horror", "mystery"], role: "villain" }),
  reg({ id: "v_puppeteer", name: "The Puppeteer", archetype: "Strings of Fate", img: "img/cast-villain-3.jpg", pos: 3, tag: "Everyone dances for him.", aff: ["mystery", "horror", "cyber"], role: "villain" }),
  reg({ id: "v_fang", name: "Count Fang", archetype: "The Midnight Peer", img: "img/cast-villain-4.jpg", pos: 0, tag: "Invites you in. Permanently.", aff: ["horror", "romance", "mystery"], role: "villain" }),
  reg({ id: "v_zero", name: "Zero", archetype: "The Erased One", img: "img/cast-villain-4.jpg", pos: 1, tag: "No records. No past.", aff: ["cyber", "mystery", "horror"], role: "villain" }),
  reg({ id: "v_glitch", name: "Overlord Glitch", archetype: "The System Error", img: "img/cast-villain-4.jpg", pos: 2, tag: "Corrupts everything it touches.", aff: ["cyber", "mecha", "mystery"], role: "villain" }),
  reg({ id: "v_hex", name: "Mistress Hex", archetype: "The Curse Weaver", img: "img/cast-villain-4.jpg", pos: 3, tag: "Bad luck follows her.", aff: ["fantasy", "horror", "shojo"], role: "villain" }),
  reg({ id: "v_carnage", name: "King Carnage", archetype: "The Arena Tyrant", img: "img/cast-villain-5.jpg", pos: 0, tag: "The crowd roars his name.", aff: ["shonen", "sports", "fantasy"], role: "villain" }),
  reg({ id: "v_silence", name: "The Silence", archetype: "The Unspoken", img: "img/cast-villain-5.jpg", pos: 1, tag: "Never says a word.", aff: ["horror", "mystery"], role: "villain" }),
  reg({ id: "v_paradox", name: "Professor Paradox", archetype: "The Timeline Breaker", img: "img/cast-villain-5.jpg", pos: 2, tag: "Wins before you start.", aff: ["mecha", "cyber", "mystery"], role: "villain" }),
  reg({ id: "v_frostbite", name: "Lady Frostbite", archetype: "The Cold Court", img: "img/cast-villain-5.jpg", pos: 3, tag: "Freezes hearts first.", aff: ["horror", "shojo", "fantasy"], role: "villain" }),
  reg({ id: "v_warden", name: "The Warden", archetype: "The Locked Door", img: "img/cast-villain-6.jpg", pos: 0, tag: "Nothing gets out.", aff: ["mystery", "horror"], role: "villain" }),
  reg({ id: "v_magus", name: "Chaos Magus", archetype: "The Wild Spell", img: "img/cast-villain-6.jpg", pos: 1, tag: "Spells first, asks never.", aff: ["fantasy", "isekai", "horror"], role: "villain" }),
  reg({ id: "v_blackout", name: "Blackout", archetype: "The Power Failure", img: "img/cast-villain-6.jpg", pos: 2, tag: "The city goes dark.", aff: ["cyber", "mecha", "horror"], role: "villain" }),
  reg({ id: "v_collector", name: "The Collector", archetype: "The Hoard", img: "img/cast-villain-6.jpg", pos: 3, tag: "Takes what shines.", aff: ["mystery", "fantasy", "shojo"], role: "villain" }),
  reg({ id: "v_ash", name: "Warlord Ash", archetype: "The Scorched March", img: "img/cast-villain-7.jpg", pos: 0, tag: "Leaves nothing behind.", aff: ["shonen", "fantasy", "sports"], role: "villain" }),
  reg({ id: "v_dread", name: "Duchess Dread", archetype: "The Velvet Doom", img: "img/cast-villain-7.jpg", pos: 1, tag: "Polite. Absolute. Final.", aff: ["shojo", "mystery", "horror"], role: "villain" }),
  reg({ id: "v_lich", name: "Lich of Laughter", archetype: "The Joke That Kills", img: "img/cast-villain-7.jpg", pos: 2, tag: "His punchlines land forever.", aff: ["horror", "fantasy", "slice"], role: "villain" }),
  reg({ id: "v_scuttle", name: "Captain Scuttlebutt", archetype: "The Rumour Raider", img: "img/cast-villain-7.jpg", pos: 3, tag: "Plunders reputations.", aff: ["fantasy", "shonen", "mystery"], role: "villain" }),
  reg({ id: "v_moth", name: "Mother Moth", archetype: "The Light That Lures", img: "img/cast-villain-8.jpg", pos: 0, tag: "Follow her glow.", aff: ["horror", "fantasy", "shojo"], role: "villain" }),
  reg({ id: "v_inquisitor", name: "The Grand Inquisitor", archetype: "The Perfect Verdict", img: "img/cast-villain-8.jpg", pos: 1, tag: "No appeals accepted.", aff: ["mystery", "mecha", "horror"], role: "villain" }),
  reg({ id: "v_nightshade", name: "Nightshade", archetype: "The Poison Garden", img: "img/cast-villain-8.jpg", pos: 2, tag: "Everything she plants dies.", aff: ["horror", "mystery", "shojo"], role: "villain" }),
  reg({ id: "v_titanus", name: "Titanus Rex", archetype: "The Apex Monster", img: "img/cast-villain-8.jpg", pos: 3, tag: "The city is his nest.", aff: ["shonen", "mecha", "horror"], role: "villain" }),
  /* --- wave two (sheets 9-10) --- */
  reg({ id: "v_amethyst", name: "Empress Amethyst", archetype: "The Violet Crown", img: "img/cast-villain-9.jpg", pos: 0, tag: "Her throne is lit by other people's fire.", aff: ["fantasy", "shojo", "horror"], role: "villain" }),
  reg({ id: "v_gravemark", name: "Gravemark", archetype: "The Cracked Warlord", img: "img/cast-villain-9.jpg", pos: 1, tag: "Armour older than the war.", aff: ["shonen", "fantasy", "horror"], role: "villain" }),
  reg({ id: "v_kairos", name: "CEO Kairos", archetype: "The Friendly Contract", img: "img/cast-villain-9.jpg", pos: 2, tag: "Everything is negotiable. Including you.", aff: ["cyber", "mecha", "mystery"], role: "villain" }),
  reg({ id: "v_plague", name: "The Green Doctor", archetype: "The Cure That Isn't", img: "img/cast-villain-9.jpg", pos: 3, tag: "Prescribes silence.", aff: ["horror", "mystery", "fantasy"], role: "villain" }),
  reg({ id: "v_harlequin", name: "Harlequin", archetype: "The Laughing Trick", img: "img/cast-villain-10.jpg", pos: 0, tag: "The punchline is always you.", aff: ["horror", "mystery", "slice"], role: "villain" }),
  reg({ id: "v_onikage", name: "Onikage", archetype: "The Cursed Blade", img: "img/cast-villain-10.jpg", pos: 1, tag: "The mask cracked. He didn't.", aff: ["shonen", "horror", "fantasy"], role: "villain" }),
  reg({ id: "v_hollowchild", name: "The Pale Empress", archetype: "The Quiet Void", img: "img/cast-villain-10.jpg", pos: 2, tag: "She asks nicely. Once.", aff: ["horror", "shojo", "mystery"], role: "villain" }),
  reg({ id: "v_bioform", name: "Bioform IX", archetype: "The Failed Experiment", img: "img/cast-villain-10.jpg", pos: 3, tag: "Built to win. Nobody said at what.", aff: ["mecha", "cyber", "shonen"], role: "villain" }),
];

/* ------------------------------------------------------------------- arcs */
export const ARCS: Arc[] = [
  { id: "hook", name: "Cold Open Hook", cost: 8_000, q: 4, f: 0.04, desc: "Start with a bang. Critics rewatch it." },
  { id: "lore", name: "Worldbuilding Dive", cost: 15_000, q: 3, f: 0.03, syn: ["fantasy", "cyber", "mystery"], synQ: 3, desc: "Lore so deep the wiki needs editors." },
  { id: "montage", name: "Training Montage", cost: 10_000, q: 2, f: 0.03, syn: ["shonen", "sports"], synQ: 3, desc: "Push-ups! Friendship! Power levels!" },
  { id: "tournament", name: "Tournament Arc", cost: 26_000, q: 1, f: 0.14, syn: ["shonen", "sports"], synQ: 4, desc: "Bracket of dreams. Merch prints money." },
  { id: "beach", name: "Beach Episode", cost: 6_000, q: -1, f: 0.09, syn: ["romance", "slice"], synQ: 3, desc: "Pure fanservice. Critics sigh. Fans scream." },
  { id: "festival", name: "Festival Episode", cost: 11_000, q: 2, f: 0.05, syn: ["romance", "slice", "shojo"], synQ: 3, desc: "Yukata, fireworks, almost-confessions." },
  { id: "launch", name: "Mecha Launch", cost: 24_000, q: 1, f: 0.05, syn: ["mecha", "cyber"], synQ: 5, desc: "90 uninterrupted seconds of launch sequence." },
  { id: "live", name: "Idol Live", cost: 21_000, q: 1, f: 0.1, syn: ["idol"], synQ: 5, synF: 0.03, desc: "A full episode concert. Glowsticks sold separately." },
  { id: "case", name: "Phantom Case", cost: 12_000, q: 3, f: 0.04, syn: ["mystery", "horror"], synQ: 4, desc: "A locked-room mystery. In space. Maybe." },
  { id: "twist", name: "Tragic Twist", cost: 14_000, q: 5, f: 0, syn: ["horror", "mystery", "shojo"], synQ: 3, desc: "Nobody saw it coming. Nobody recovered." },
  { id: "filler", name: "Filler Saga", cost: -12_000, q: -4, f: 0.02, desc: "Cheap padding. The manga isn't ready." },
  { id: "timeskip", name: "Timeskip Reboot", cost: 14_000, q: 2, f: 0.05, syn: ["shonen", "isekai"], synQ: 2, desc: "Three years pass. Everyone's buffer now." },
  { id: "crossover", name: "Crossover Special", cost: 28_000, q: 0, f: 0.12, franchiseOnly: true, desc: "Your past casts collide in one hour of chaos." },
  { id: "finale", name: "Finale Climax", cost: 22_000, q: 4, f: 0.08, desc: "Everything pays off. Better nail the landing." },
  { id: "origin", name: "Villain Origin", cost: 18_000, q: 5, f: 0.04, syn: ["horror", "mystery", "shonen"], synQ: 3, cast: "villain", castQ: 3, desc: "The villain's tragic past. Critics weep." },
  { id: "redemption", name: "Villain Redemption", cost: 22_000, q: 4, f: 0.08, syn: ["shonen", "shojo", "romance"], synQ: 3, cast: "villain", castQ: 2, desc: "The big bad switches sides. Merch explodes." },
  { id: "mascot", name: "Mascot Episode", cost: 14_000, q: 0, f: 0.12, cast: "pet", castQ: 4, desc: "The mascot carries a whole episode. Toys sell out." },
  { id: "musical", name: "Full Musical Episode", cost: 24_000, q: 2, f: 0.08, syn: ["idol"], synQ: 4, desc: "Everyone sings. Even the narrator." },
  { id: "confession", name: "Confession Episode", cost: 18_000, q: 4, f: 0.06, syn: ["romance", "shojo"], synQ: 3, desc: "It finally happens. Fans pass out." },
  { id: "cliffhanger", name: "Mid-Season Cliffhanger", cost: 16_000, q: 3, f: 0.07, syn: ["mystery", "horror"], synQ: 3, desc: "The season ends on a scream." },
  { id: "sakuga", name: "Sakuga Showcase", cost: 26_000, q: 2, f: 0.05, syn: ["mecha", "cyber", "shonen"], synQ: 4, desc: "Nine minutes of animation so clean it hurts." },
  { id: "collab", name: "Merch Collab", cost: 20_000, q: 0, f: 0.1, syn: ["idol", "slice"], synQ: 2, desc: "The crossover toy drop. Bots crash the site." },
  { id: "ova", name: "OVA Special", cost: 30_000, q: 2, f: 0.1, franchiseOnly: true, desc: "A bonus disc for the true believers." },
  { id: "war", name: "All-Out War", cost: 42_000, q: 6, f: 0.1, syn: ["shonen", "mecha", "fantasy"], synQ: 4, desc: "The entire cast fights at once. Budget dies." },
  /* ------------------------------------------------- unlockable arcs */
  { id: "movienight", name: "Movie Night Special", cost: 12_000, q: 1, f: 0.04, desc: "A low-stakes breather the fans rewatch.", unlock: { kind: "shows", n: 2 } },
  { id: "heist", name: "Heist Caper", cost: 19_000, q: 2, f: 0.06, syn: ["mystery", "comedy"], synQ: 3, desc: "One last score. This time it's personal.", unlock: { kind: "genre", genre: "comedy" } },
  { id: "cookingbattle", name: "Cooking Battle", cost: 16_000, q: 1, f: 0.09, syn: ["cooking"], synQ: 4, synF: 0.02, desc: "Judges weep. Merch sells out.", unlock: { kind: "genre", genre: "cooking" } },
  { id: "grandprix", name: "Grand Prix", cost: 25_000, q: 2, f: 0.09, syn: ["racing", "sports"], synQ: 4, desc: "Tyre strategy, friendship, and the finish line.", unlock: { kind: "genre", genre: "racing" } },
  { id: "bootcamp", name: "Boot Camp", cost: 17_000, q: 2, f: 0.04, syn: ["military", "shonen"], synQ: 3, desc: "They'll break you. Then they'll build you.", unlock: { kind: "genre", genre: "military" } },
  { id: "ghosthunt", name: "Ghost Hunt", cost: 15_000, q: 3, f: 0.05, syn: ["supernatural", "horror"], synQ: 4, desc: "The cameras catch something. Nobody rewatches.", unlock: { kind: "genre", genre: "supernatural" } },
  { id: "orbital", name: "Orbital Rescue", cost: 23_000, q: 2, f: 0.06, syn: ["space", "mecha"], synQ: 4, desc: "Six minutes of fuel left. Hold the line.", unlock: { kind: "genre", genre: "space" } },
  { id: "raincity", name: "Rain City Chase", cost: 20_000, q: 3, f: 0.03, syn: ["noir", "mystery"], synQ: 4, desc: "Every shadow is a suspect.", unlock: { kind: "genre", genre: "noir" } },
  { id: "transformation", name: "Transformation Test", cost: 18_000, q: 2, f: 0.05, syn: ["magical", "shojo"], synQ: 4, desc: "The new form fails at the worst moment.", unlock: { kind: "genre", genre: "magical" } },
  { id: "directorscut", name: "Director's Cut", cost: 21_000, q: 3, f: 0.02, syn: ["cyber", "mystery"], synQ: 3, desc: "Forty minutes nobody asked for. Critics adore it.", unlock: { kind: "rd", cost: 18 } },
  { id: "fanservice", name: "Fan Service Deluxe", cost: 9_000, q: -2, f: 0.12, desc: "Cheap. Shameless. Financially unwise to skip.", unlock: { kind: "rd", cost: 10 } },
  { id: "mega", name: "Mega Crossover", cost: 30_000, q: 2, f: 0.14, franchiseOnly: true, desc: "Every franchise you own, one timeline.", unlock: { kind: "franchise" } },
  { id: "awardpush", name: "Award Season Push", cost: 26_000, q: 4, f: 0.03, desc: "Screeners, galas, and one very tired director.", unlock: { kind: "score", n: 30 } },
  { id: "guildwar", name: "Guild War", cost: 34_000, q: 5, f: 0.07, syn: ["fantasy", "shonen"], synQ: 4, desc: "Factions, betrayals, and a siege that spans two episodes.", unlock: { kind: "hits", n: 3 } },
  { id: "expansion", name: "Studio Expansion Arc", cost: 24_000, q: 3, f: 0.05, desc: "The meta-narrative: your own studio, animated.", unlock: { kind: "staff", n: 6 } },
  { id: "idolfest", name: "Idol Festival", cost: 22_000, q: 2, f: 0.1, syn: ["idol"], synQ: 4, desc: "Three nights. One stage. Zero dry eyes.", unlock: { kind: "genre", genre: "idol" } },
];

/* ------------------------------------------- hidden arc synergies (shipped to discover) */
export interface ArcCombo {
  id: string;
  name: string;
  /** every arc in this list must be in the season for the synergy to fire */
  arcs: string[];
  q: number;
  f: number;
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
];

/** synergies whose arcs are all present in the season */
export const arcCombosFor = (arcIds: string[]): ArcCombo[] =>
  ARC_COMBOS.filter((c) => c.arcs.every((a) => arcIds.includes(a)));

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
export const WORKER_LOOKS: WorkerLook[] = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11].map((n) => ({
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
  id: "steady" | "vision";
  name: string;
  title: string;
  img: string;
  perk: string;
}
export const SHOWRUNNERS: Showrunner[] = [
  { id: "steady", name: "Genji Ashida", title: "The Master Animator", img: "img/showrunner-a.jpg", perk: "Steady Hand — bubbles float 20% longer and editing notes are rarer." },
  { id: "vision", name: "Akari Natsume", title: "The Visionary Director", img: "img/showrunner-b.jpg", perk: "Vision — dramatic arcs hit harder, no review below 3/10." },
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
];

export interface RivalShow {
  studio: string;
  title: string;
  score: number; // 0..40, revealed at the awards ceremony
  week: number;
  year: number;
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
export const WEEKS_PER_MONTH = 4;
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const yearOfWeek = (w: number) => Math.floor(w / 48) + 1;
export const monthOfWeek = (w: number) => Math.floor((w % 48) / 4);
export const weekOfMonth = (w: number) => (w % 4) + 1;
export const dateLabel = (w: number) => `Y${yearOfWeek(w)} ${MONTHS[monthOfWeek(w)]} W${weekOfMonth(w)}`;
