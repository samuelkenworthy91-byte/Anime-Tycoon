import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, text) => fs.writeFileSync(path.join(root, p), text);
function replaceExact(p, needle, replacement) {
  const src = read(p);
  if (!src.includes(needle)) throw new Error(`Missing patch target in ${p}: ${needle.slice(0, 120)}`);
  write(p, src.replace(needle, replacement));
}
function replaceRegex(p, regex, replacement) {
  const src = read(p);
  if (!regex.test(src)) throw new Error(`Missing regex patch target in ${p}: ${regex}`);
  regex.lastIndex = 0;
  write(p, src.replace(regex, replacement));
}

const visionModule = `import {
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
`;
write("src/engine/creatorVision.ts", visionModule);

const visionTest = `import { describe, expect, it } from "vitest";
import { generateCreatorVision, genreTitle, visionAlignment, visionEffects } from "../creatorVision";
import type { Draft, Staff } from "../data";

const staff: Staff = { id: "auteur", name: "Auteur", role: "writer", level: 6, story: 80, art: 30, sound: 30, salary: 1000, cost: 5000, portrait: 0, stamina: 100, morale: 80, favGenre: "horror" };

describe("creator vision", () => {
  it("generates deterministic genre-specific passion briefs", () => {
    const a = generateCreatorVision("pitch:auteur:24", "horror", ["horror", "mystery", "romance"], staff);
    const b = generateCreatorVision("pitch:auteur:24", "horror", ["horror", "mystery", "romance"], staff);
    expect(a).toEqual(b);
    expect(a.title).toBe(genreTitle("pitch:auteur:24", "horror"));
    expect(a.arcs.length).toBeGreaterThanOrEqual(2);
  });

  it("rewards following the creator and penalises overriding most of the brief", () => {
    const v = generateCreatorVision("vision", "horror", ["horror", "mystery"], staff);
    const aligned = {
      title: v.title, medium: "tv", budget: "standard", scope: "standard", slot: "midnight", animeType: "shonen",
      genres: [v.primaryGenre, ...(v.secondaryGenre ? [v.secondaryGenre] : [])], audience: v.audience,
      protag: v.cast.protag!, protagName: "Lead", secondary: v.cast.secondary!, pet: v.cast.pet!, villain: v.cast.villain!,
      arcs: [...v.arcs], sliders: [...v.sliders], season: 1,
    } as Draft;
    const ignored = { ...aligned, title: "Management Rewrite", audience: v.audience === "kids" ? "adults" : "kids", genres: ["romance"], protag: "kai", secondary: "none", pet: "none", villain: "none", arcs: [], sliders: [0, 0, 0] } as Draft;
    const good = visionAlignment(aligned, v);
    const bad = visionAlignment(ignored, v);
    expect(good.score).toBeGreaterThan(85);
    expect(bad.score).toBeLessThan(50);
    expect(visionEffects(good).outputMult).toBeGreaterThan(1);
    expect(visionEffects(bad).outputMult).toBeLessThan(1);
  });
});
`;
write("src/engine/__tests__/creator-vision.test.ts", visionTest);

// studioExpansion: store the creator brief on pitches/promises and apply morale when leadership is appointed.
replaceExact("src/engine/studioExpansion.ts",
  'import { genreTargetFor } from "./genreTargets";\n',
  'import { genreTargetFor } from "./genreTargets";\nimport { generateCreatorVision, visionAlignment, visionEffects, type CreatorVision } from "./creatorVision";\n');
replaceExact("src/engine/studioExpansion.ts",
  '  editApproved?: boolean;\n  history: string[];\n',
  '  editApproved?: boolean;\n  vision?: CreatorVision;\n  visionAlignment?: number;\n  history: string[];\n');
replaceExact("src/engine/studioExpansion.ts",
  '  report?: string;\n  developmentDays?: Policies["development"];\n',
  '  report?: string;\n  developmentDays?: Policies["development"];\n  vision?: CreatorVision;\n');
replaceExact("src/engine/studioExpansion.ts",
  '        cost: Math.round(8000 * (1 + r.officeLevel * 0.75)),\n      };',
  '        cost: Math.round(8000 * (1 + r.officeLevel * 0.75)),\n        vision: generateCreatorVision("pitch:" + s.id + ":" + week, genre, r.genresUnlocked, s),\n      };');
replaceExact("src/engine/studioExpansion.ts",
`  if (action === "accept") {
    const next = promiseLeadership(r, pitch.staffId, pitch.genre);
    if (!next) return null;
    return write(next, {
      ...expansionOf(next),
      pitches: x.pitches.map((p) =>
        p.id === id ? { ...p, status: "accepted" } : p,
      ),
    });
  }`,
`  if (action === "accept") {
    const next = promiseLeadership(r, pitch.staffId, pitch.genre);
    if (!next) return null;
    const nx = expansionOf(next);
    return write(next, {
      ...nx,
      promises: nx.promises.map((p) =>
        p.staffId === pitch.staffId && p.status === "active" && p.createdDay === gameDay(r)
          ? { ...p, vision: pitch.vision }
          : p,
      ),
      pitches: x.pitches.map((p) =>
        p.id === id ? { ...p, status: "accepted" } : p,
      ),
    });
  }`);
replaceExact("src/engine/studioExpansion.ts",
`  return write(r, {
    ...x,
    promises: x.promises.map((a) =>
      a.id === promiseId ? { ...a, projectId } : a,
    ),
    credits: {
      ...x.credits,
      [projectId]: {
        ...c,
        leads: { ...c.leads, [promise.role]: promise.staffId },
      },
    },
  });
}`,
`  const alignment = promise.vision ? visionAlignment(p.draft, promise.vision) : null;
  const effects = alignment ? visionEffects(alignment) : null;
  return {
    ...write(r, {
      ...x,
      promises: x.promises.map((a) =>
        a.id === promiseId
          ? {
              ...a,
              projectId,
              visionAlignment: alignment?.score,
              history: alignment
                ? [...a.history, "Creator vision alignment locked at " + alignment.score + "% (" + effects!.label + ")."]
                : a.history,
            }
          : a,
      ),
      credits: {
        ...x.credits,
        [projectId]: {
          ...c,
          leads: { ...c.leads, [promise.role]: promise.staffId },
        },
      },
    }),
    staff: effects
      ? r.staff.map((s) => s.id === promise.staffId ? moraleDelta(s, effects.moraleDelta) : s)
      : r.staff,
  };
}`);

// Staff stories: mentoring now creates tangible catch-up skill and genre learning.
replaceExact("src/engine/staffStories.ts",
  'import { bondBetween, bondKey, moraleDelta } from "./careers";\n',
  'import { bondBetween, bondKey, genreFamiliarity, moraleDelta } from "./careers";\nimport { ROLE_POINT, STAFF_STAT_CAP, type GenreId } from "./data";\n');
replaceExact("src/engine/staffStories.ts",
`    const key = bondKey(s.staffIds[0], s.staffIds[1]);
    bonds = { ...bonds, [key]: Math.max(8, bonds[key] ?? 0) };
    staff = staff.map((st) =>
      s.staffIds.includes(st.id) ? moraleDelta(st, 4) : st,
    );
    return {
      ...s,
      progress,
      status: "resolved" as const,
      outcome:
        "Eight mentoring days completed: both gained morale and established a working relationship.",
    };`,
`    const key = bondKey(s.staffIds[0], s.staffIds[1]);
    bonds = { ...bonds, [key]: Math.max(8, bonds[key] ?? 0) };
    const mentor = staff.find((st) => st.id === s.staffIds[0])!;
    const junior = staff.find((st) => st.id === s.staffIds[1])!;
    const focus = ROLE_POINT[junior.role];
    const skillGap = Math.max(0, mentor[focus] - junior[focus]);
    const skillGain = Math.max(1, Math.min(5, Math.ceil(skillGap / 20)));
    const strongestGenre = (mentor.favGenre ?? Object.entries(mentor.genreExperience ?? {}).sort((a, b) => Number(b[1] ?? 0) - Number(a[1] ?? 0))[0]?.[0]) as GenreId | undefined;
    const mentorGenre = strongestGenre ? genreFamiliarity(mentor, strongestGenre) : 0;
    const juniorGenre = strongestGenre ? genreFamiliarity(junior, strongestGenre) : 0;
    const genreGain = strongestGenre && mentorGenre > juniorGenre ? Math.min(2, mentorGenre - juniorGenre) : 0;
    staff = staff.map((st) => {
      let next = s.staffIds.includes(st.id) ? moraleDelta(st, 4) : st;
      if (st.id !== junior.id) return next;
      next = { ...next, [focus]: Math.min(STAFF_STAT_CAP, next[focus] + skillGain) };
      if (strongestGenre && genreGain > 0) {
        next = {
          ...next,
          genreExperience: {
            ...(next.genreExperience ?? {}),
            [strongestGenre]: Math.max(next.genreExperience?.[strongestGenre] ?? 0, juniorGenre + genreGain),
          },
        };
      }
      return next;
    });
    return {
      ...s,
      progress,
      status: "resolved" as const,
      outcome:
        "Eight mentoring days completed: " + junior.name + " gained +" + skillGain + " " + focus + (strongestGenre && genreGain ? " and " + genreGain + " steps of " + strongestGenre + " familiarity" : "") + "; both gained morale and established a working relationship.",
    };`);

// Morale now contributes to career velocity and salary satisfaction.
replaceExact("src/engine/careers.ts",
`export const moraleF = (s: Staff) => 0.75 + moraleOf(s) / 280;
/** Fragile Confidence doubles every swing */`,
`export const moraleF = (s: Staff) => 0.75 + moraleOf(s) / 280;
/** Happier staff learn faster from real production work. */
export const moraleXpMultiplier = (s: Staff) => {
  const morale = moraleOf(s);
  if (morale >= 90) return 1.20;
  if (morale >= 75) return 1.10;
  if (morale < 25) return 0.85;
  if (morale < 50) return 0.95;
  return 1;
};
/** High morale softens salary demands; miserable stars demand a premium to stay. */
export const moraleSalaryDemandMultiplier = (s: Staff) => {
  const morale = moraleOf(s);
  if (morale >= 90) return 0.92;
  if (morale >= 75) return 0.97;
  if (morale < 25) return 1.08;
  if (morale < 50) return 1.03;
  return 1;
};
/** Fragile Confidence doubles every swing */`);
replaceExact("src/engine/careers.ts", "  let xpMult = 1;", "  let xpMult = moraleXpMultiplier(s);");
replaceExact("src/engine/careers.ts",
`export const marketSalary = (s: Staff) =>
  Math.round((280 + staffPoint(s, ROLE_POINT[s.role]) * 13 + s.level * 140) / 10) * 10;`,
`export const marketSalary = (s: Staff) =>
  Math.round(((280 + staffPoint(s, ROLE_POINT[s.role]) * 13 + s.level * 140) * moraleSalaryDemandMultiplier(s)) / 10) * 10;`);

// Core production output + XP uses creator alignment while that creator is the appointed lead.
replaceExact("src/engine/state.ts",
  'import { REVIEW_EXPECTATION_SEED, nextReviewExpectation } from "./production";\n',
  'import { REVIEW_EXPECTATION_SEED, nextReviewExpectation } from "./production";\nimport { creatorVisionEffectsForProject } from "./creatorVision";\n');
replaceExact("src/engine/state.ts",
  '  moraleDelta,\n  moraleOf,\n  personMod,\n',
  '  moraleDelta,\n  moraleOf,\n  moraleXpMultiplier,\n  personMod,\n');
replaceExact("src/engine/state.ts",
`  const mods: StaffModFn = (st, p, team) => {
    const base = personMod(st, p, team, { bonds });
    const signature = specialisationProjectEffects(r, p.draft);
    return { ...base, out: base.out * signature.outputMult, pace: base.pace * signature.paceMult };
  };`,
`  const mods: StaffModFn = (st, p, team) => {
    const base = personMod(st, p, team, { bonds });
    const signature = specialisationProjectEffects(r, p.draft);
    const creator = creatorVisionEffectsForProject(r.expansion?.promises, p, st.id);
    return {
      ...base,
      out: base.out * signature.outputMult * creator.outputMult,
      pace: base.pace * signature.paceMult,
      xpMult: base.xpMult * creator.xpMult,
    };
  };`);
replaceRegex("src/engine/state.ts",
  /const m = personMod\(nx, proj, staffArr\.filter\(\(x\) => proj\.staffIds\.includes\(x\.id\)\), \{ bonds \}\);/,
  'const m = mods(nx, proj, staffArr.filter((x) => proj.staffIds.includes(x.id)));');
replaceExact("src/engine/state.ts",
  '        const g = gainXp(nx, xp);',
  '        const creatorXp = creatorVisionEffectsForProject(r.expansion?.promises, p, nx.id).xpMult;\n        const g = gainXp(nx, xp * moraleXpMultiplier(nx) * creatorXp);');

// Creation UI: show the creator brief and purple creator picks without confusing them with research recommendations.
replaceExact("src/components/Create.tsx",
  'import { type ContinuationPlan } from "./Library";\n',
  'import { type ContinuationPlan } from "./Library";\nimport { visionAlignment } from "../engine/creatorVision";\n');
replaceExact("src/components/Create.tsx",
`  blocked,
}: {
  m: CastMember;
  on: boolean;
  onPick: () => void;
  blocked?: string;
}) {`,
`  blocked,
  creatorPick = false,
}: {
  m: CastMember;
  on: boolean;
  onPick: () => void;
  blocked?: string;
  creatorPick?: boolean;
}) {`);
replaceExact("src/components/Create.tsx",
`        on ? "border-neon shadow-[0_0_26px_rgba(255,77,141,.4)]" : "border-line hover:border-neon/40",
        blocked && "opacity-40 grayscale",`,
`        on ? "border-neon shadow-[0_0_26px_rgba(255,77,141,.4)]" : creatorPick ? "border-viol shadow-[0_0_24px_rgba(167,139,250,.42)]" : "border-line hover:border-neon/40",
        blocked && "opacity-40 grayscale",`);
replaceExact("src/components/Create.tsx",
`      {blocked && <div className="absolute inset-x-1 top-1 z-20 rounded-md border border-neon/60 bg-ink/90 px-1.5 py-1 text-center text-[7px] font-black tracking-wider text-neon">RIGHTS SOLD · {blocked}</div>}
      {on && (`,
`      {blocked && <div className="absolute inset-x-1 top-1 z-20 rounded-md border border-neon/60 bg-ink/90 px-1.5 py-1 text-center text-[7px] font-black tracking-wider text-neon">RIGHTS SOLD · {blocked}</div>}
      {creatorPick && !blocked && <div className="absolute right-1 top-1 z-20 rounded-md border border-viol/70 bg-ink/90 px-1.5 py-1 text-[7px] font-black tracking-wider text-viol">CREATOR PICK</div>}
      {on && (`);
replaceExact("src/components/Create.tsx",
`  const marketBrief = (run.decisionModifiers ?? []).find((m) => m.kind === "marketBrief" && m.expiresWeek >= run.week && m.uses > 0);
  const unavailableCast = useMemo(() => soldCastRights(run), [run.franchises]);`,
`  const marketBrief = (run.decisionModifiers ?? []).find((m) => m.kind === "marketBrief" && m.expiresWeek >= run.week && m.uses > 0);
  const creatorPromise = useMemo(() => {
    if (plan || commission) return null;
    const open = (run.expansion?.promises ?? []).filter((p) => p.status === "active" && !p.projectId && p.vision);
    if (!open.length) return null;
    if (d.genres.length) return open.find((p) => d.genres.includes(p.genre)) ?? null;
    return open.length === 1 ? open[0] : null;
  }, [run.expansion, d.genres, plan, commission]);
  const creatorVision = creatorPromise?.vision;
  const creatorStaff = creatorPromise ? run.staff.find((s) => s.id === creatorPromise.staffId) : undefined;
  const creatorAlignment = creatorVision ? visionAlignment(d, creatorVision) : null;
  const [creatorTitleApplied, setCreatorTitleApplied] = useState<string | null>(null);
  useEffect(() => {
    if (!creatorPromise || !creatorVision || creatorTitleApplied === creatorPromise.id || !d.genres.includes(creatorPromise.genre)) return;
    setD((old) => ({ ...old, title: creatorVision.title }));
    setCreatorTitleApplied(creatorPromise.id);
  }, [creatorPromise, creatorVision, creatorTitleApplied, d.genres]);
  const unavailableCast = useMemo(() => soldCastRights(run), [run.franchises]);`);
replaceExact("src/components/Create.tsx",
`      {marketBrief && (
        <div className="relative z-10 border-b border-gold/30 bg-gold/10 px-3 py-2 text-[10px] text-paper/80">`,
`      {creatorVision && creatorPromise && (
        <div className="relative z-10 border-b border-viol/40 bg-viol/10 px-3 py-2 text-[10px] text-paper/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2">
            <b className="tracking-wider text-viol">CREATOR VISION · {creatorStaff?.name ?? "CREATOR"}</b>
            <span>“{creatorVision.title}” · {GENRES.find((g) => g.id === creatorVision.primaryGenre)?.label}{creatorVision.secondaryGenre ? " + " + GENRES.find((g) => g.id === creatorVision.secondaryGenre)?.label : ""}</span>
            <span className="text-viol">Alignment {creatorAlignment?.score ?? 0}%</span>
            <span className="text-paper/45">Purple glow = their preference, not a studio meta recommendation.</span>
          </div>
        </div>
      )}

      {marketBrief && (
        <div className="relative z-10 border-b border-gold/30 bg-gold/10 px-3 py-2 text-[10px] text-paper/80">`);
replaceExact("src/components/Create.tsx",
`                    blocked={unavailableCast[m.id]?.title}
                    onPick={() => {`,
`                    blocked={unavailableCast[m.id]?.title}
                    creatorPick={creatorVision?.cast[castRow.role] === m.id}
                    onPick={() => {`);
replaceExact("src/components/Create.tsx",
`                    const on = d.arcs.includes(a.id);
                    const reason = arcLockReason(a, run);`,
`                    const on = d.arcs.includes(a.id);
                    const creatorPick = creatorVision?.arcs.includes(a.id) ?? false;
                    const reason = arcLockReason(a, run);`);
replaceExact("src/components/Create.tsx",
`                          on ? "border-neon bg-neon/10" : "border-line bg-panel2/70 hover:border-neon/40",
                          locked && "cursor-not-allowed opacity-60 saturate-50"`,
`                          on ? "border-neon bg-neon/10" : creatorPick && !locked ? "border-viol/80 bg-viol/10 shadow-[0_0_22px_rgba(167,139,250,.28)]" : "border-line bg-panel2/70 hover:border-neon/40",
                          locked && "cursor-not-allowed opacity-60 saturate-50"`);
replaceExact("src/components/Create.tsx",
`                        <div className="mt-0.5 text-[10px] text-paper/50">{a.desc}</div>
                        {locked ? (`,
`                        <div className="mt-0.5 text-[10px] text-paper/50">{a.desc}</div>
                        {creatorPick && <div className="mt-1 inline-flex rounded border border-viol/60 bg-viol/10 px-1.5 py-0.5 text-[8px] font-black tracking-wider text-viol">CREATOR PICK</div>}
                        {locked ? (`);

// Pitch cards surface the actual named vision before the player commits.
replaceExact("src/components/StudioExpansionPanel.tsx",
`            <p>
              {p.status === "developing"
                ? "Development: " + p.progress + "/28 paid working days"
                : (p.report ??
                  "A personal pitch. Funding a prototype reserves the creator's working time and reveals a single-genre direction report.")}
            </p>`,
`            {p.vision && (
              <div className="rounded-lg border border-viol/40 bg-viol/10 p-2 text-xs">
                <b className="text-viol">“{p.vision.title}”</b>
                <p>{genreName(p.vision.primaryGenre)}{p.vision.secondaryGenre ? " + " + genreName(p.vision.secondaryGenre) : ""} · {p.vision.audience} audience</p>
                <p>Creator requests {p.vision.arcs.length} specific story beats and has preferred character designs for the four main cast roles.</p>
              </div>
            )}
            <p>
              {p.status === "developing"
                ? "Development: " + p.progress + "/28 paid working days"
                : (p.report ??
                  "A personal pitch. Funding a prototype reserves the creator's working time and reveals a single-genre direction report.")}
            </p>`);

// Tests for morale economics and tangible mentorship development.
const extraTest = `import { describe, expect, it } from "vitest";
import { initialRun } from "../state";
import { expansionOf } from "../studioExpansion";
import { advanceStaffStories, type StaffStory } from "../staffStories";
import { marketSalary, moraleXpMultiplier, personMod } from "../careers";
import type { Staff } from "../data";

const worker = (id: string, patch: Partial<Staff> = {}): Staff => ({ id, name: id, role: "writer", level: 1, story: 30, art: 20, sound: 20, salary: 500, cost: 5000, portrait: 0, stamina: 100, morale: 70, ...patch });

describe("passion-project people loop", () => {
  it("high morale improves XP velocity and softens salary demand", () => {
    const happy = worker("happy", { morale: 95 });
    const neutral = worker("neutral", { morale: 70 });
    expect(moraleXpMultiplier(happy)).toBeGreaterThan(moraleXpMultiplier(neutral));
    expect(marketSalary(happy)).toBeLessThan(marketSalary(neutral));
    const project = { id: "p", draft: { title: "x", medium: "tv", budget: "standard", scope: "standard", slot: "midnight", animeType: "shonen", genres: ["horror"], audience: "teens", protag: "kai", protagName: "Kai", secondary: "x", pet: "x", villain: "x", arcs: [], sliders: [50,50,50], season: 1 }, stage: "concept", staffIds: [], points: {story:0,art:0,sound:0}, issues:0 } as any;
    expect(personMod(happy, project, [], { bonds: {} }).xpMult).toBeGreaterThan(personMod(neutral, project, [], { bonds: {} }).xpMult);
  });

  it("completed mentorship closes a skill gap and transfers genre familiarity", () => {
    const mentor = worker("mentor", { level: 7, story: 95, favGenre: "horror", genreExperience: { horror: 8 } });
    const junior = worker("junior", { level: 1, story: 25, genreExperience: { horror: 0 } });
    let run = { ...initialRun("Mentors", "producer"), day: 0, week: 0, staff: [mentor, junior] };
    const story: StaffStory = { id: "mentoring", source: "test", kind: "mentorship", staffIds: [mentor.id, junior.id], openedDay: 0, expiresDay: 28, status: "active", title: "Mentor", text: "Test", decision: "mentor", progress: 7 };
    run = { ...run, expansion: { ...expansionOf(run), stories: [story] } };
    const next = advanceStaffStories(run);
    const trained = next.staff.find((s) => s.id === junior.id)!;
    expect(trained.story).toBeGreaterThan(junior.story);
    expect(trained.genreExperience?.horror ?? 0).toBeGreaterThan(0);
    expect(expansionOf(next).stories?.[0].status).toBe("resolved");
  });
});
`;
write("src/engine/__tests__/passion-project-people.test.ts", extraTest);

console.log("Passion project creator-vision patch applied.");
