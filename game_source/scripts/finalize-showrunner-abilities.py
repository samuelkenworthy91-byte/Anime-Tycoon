from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GAME = ROOT / "game_source"
SRC = GAME / "src"


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write(path: Path, text: str) -> None:
    path.write_text(text, encoding="utf-8")


def must_replace(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"missing replacement anchor: {label}")
    return text.replace(old, new, 1)


def must_sub(text: str, pattern: str, repl: str, label: str, flags: int = 0) -> str:
    out, count = re.subn(pattern, repl, text, count=1, flags=flags)
    if count != 1:
        raise RuntimeError(f"expected one regex replacement for {label}, got {count}")
    return out


final_art = [
    "portrait-showrunner-hype.webp", "sprite-showrunner-hype.webp",
    "portrait-showrunner-contrarian.webp", "sprite-showrunner-contrarian.webp",
    "portrait-showrunner-savant.webp", "sprite-showrunner-savant.webp",
    "portrait-showrunner-trailblazer.webp", "sprite-showrunner-trailblazer.webp",
]
out_dir = GAME / "public" / "img"
for final in final_art:
    p = out_dir / final
    if not p.exists() or p.stat().st_size < 2500:
        raise RuntimeError(f"final art missing/invalid: {p}")

perks = '''import genreRuntime from "./generated/genreV3.json";
import { arcCombosFor, comboKey, comboMult, type Draft, type GenreId, type PointType } from "./data";

export const HYPE_ARCHITECT_ID = "casting";
export const CONTRARIAN_ID = "festival";
export const PRODUCTION_SAVANT_ID = "dealmaker";
export const TRAILBLAZER_ID = "genre";

export const storyStructureMult = (showrunner: string, value: number) =>
  showrunner === HYPE_ARCHITECT_ID && value > 0 ? value * 1.15 : value;

export function narrativeMomentumFanMult(
  showrunner: string,
  draft: Pick<Draft, "arcs">,
  points: Record<PointType, number>,
): number {
  if (showrunner !== HYPE_ARCHITECT_ID) return 1;
  const coherent = arcCombosFor(draft.arcs).some((c) => c.q > 0 || c.f > 0);
  const storyLeads = points.story >= points.art && points.story >= points.sound;
  return coherent && storyLeads ? 1.50 : 1.25;
}

export function contrarianComboMult(showrunner: string, genres: GenreId[]): number {
  const base = comboMult(genres, true);
  if (showrunner !== CONTRARIAN_ID || genres.length !== 2) return base;
  const row = genreRuntime.combos.find((c) => c.key === comboKey(genres));
  return row?.discovery_class === "experimental" ? 1 + (base - 1) * 1.60 : base;
}

export function engineerEyeRange(showrunner: string, target: number, exactKnown: boolean): { low: number; high: number } | null {
  if (showrunner !== PRODUCTION_SAVANT_ID || exactKnown) return null;
  return { low: Math.max(0, Math.round(target - 10)), high: Math.min(100, Math.round(target + 10)) };
}

export function trailblazerProductionMult(showrunner: string, genres: GenreId[], comboLevels: Record<string, number>): number {
  if (showrunner !== TRAILBLAZER_ID || genres.length !== 2) return 1;
  return (comboLevels[comboKey(genres)] ?? 0) <= 0 ? 1.35 : 1;
}
'''
write(SRC / "engine" / "showrunnerPerks.ts", perks)

data_p = SRC / "engine" / "data.ts"
data = read(data_p)
new_rows = {
    "casting": '  { id: "casting", name: "Ren Mercer", title: "The Hype Architect", img: "img/portrait-showrunner-hype.webp", sprite: "img/sprite-showrunner-hype.webp", portrait: "img/portrait-showrunner-hype.webp", perk: "Narrative Momentum — positive story structures are 15% stronger; release fan gains ×1.25, rising to ×1.50 when Story leads a coherent release." },',
    "festival": '  { id: "festival", name: "Soren Berg", title: "The Contrarian", img: "img/portrait-showrunner-contrarian.webp", sprite: "img/sprite-showrunner-contrarian.webp", portrait: "img/portrait-showrunner-contrarian.webp", perk: "Against the Grain — experimental genre pairings have 60% stronger synergy, turning strange concepts into a genuine studio strategy." },',
    "dealmaker": '  { id: "dealmaker", name: "Mina Arata", title: "The Production Savant", img: "img/portrait-showrunner-savant.webp", sprite: "img/sprite-showrunner-savant.webp", portrait: "img/portrait-showrunner-savant.webp", perk: "Engineer’s Eye — every show and licensed IP reveals a 20-point likely ideal range for each direction slider, even on an unseen blend." },',
    "genre": '  { id: "genre", name: "Roxie Kade", title: "The Trailblazer", img: "img/portrait-showrunner-trailblazer.webp", sprite: "img/sprite-showrunner-trailblazer.webp", portrait: "img/portrait-showrunner-trailblazer.webp", perk: "No Blueprint — a two-genre combination your studio has never shipped gets +35% production output throughout its first production." },',
}
for sid, row in new_rows.items():
    data = must_sub(data, rf'^  \{{ id: "{sid}"[^\n]*$', row, f"showrunner row {sid}", flags=re.M)
write(data_p, data)

career_p = SRC / "engine" / "showrunnerCareer.ts"
career = read(career_p)
for old, new in [
    ('  casting: { story: 78, art: 76, sound: 68 },', '  casting: { story: 88, art: 76, sound: 70 },'),
    ('  festival: { story: 86, art: 76, sound: 76 },', '  festival: { story: 82, art: 80, sound: 72 },'),
    ('  dealmaker: { story: 68, art: 70, sound: 80 },', '  dealmaker: { story: 78, art: 86, sound: 72 },'),
    ('  genre: { story: 88, art: 72, sound: 70 },', '  genre: { story: 82, art: 80, sound: 78 },'),
]:
    career = must_replace(career, old, new, old)
write(career_p, career)

scoring_p = SRC / "engine" / "scoring.ts"
scoring = read(scoring_p)
scoring = must_replace(scoring, 'import { arcClashesFor, genreReleaseEffect } from "./creativeDiscovery";\n', 'import { arcClashesFor, genreReleaseEffect } from "./creativeDiscovery";\nimport { contrarianComboMult, narrativeMomentumFanMult, storyStructureMult } from "./showrunnerPerks";\n', "scoring perk import")
scoring = must_replace(scoring, '  const casting = castingBase * (showrunner === "casting" ? 1.25 : 1);', '  const casting = castingBase;', "legacy casting bonus")
scoring = must_replace(scoring, '  const castFitMult = clamp(1 - zeroAffinityRoles * (showrunner === "casting" ? 0.045 : 0.075) - wrongTypeRoles * (showrunner === "casting" ? 0.02 : 0.035), 0.62, 1.02);', '  const castFitMult = clamp(1 - zeroAffinityRoles * 0.075 - wrongTypeRoles * 0.035, 0.62, 1.02);', "legacy casting protection")
scoring = must_replace(scoring, '  arcQ *= arcWeight;\n  arcsF *= arcWeight;', '  arcQ = storyStructureMult(showrunner, arcQ) * arcWeight;\n  arcsF = storyStructureMult(showrunner, arcsF) * arcWeight;', "base story structure multiplier")
scoring = must_replace(scoring, '  const arcComboQ = (baseArcComboQ > 0 ? baseArcComboQ * 1.6 : baseArcComboQ) * arcWeight;\n  const arcComboF = (baseArcComboF > 0 ? baseArcComboF * 1.5 : baseArcComboF) * arcWeight;', '  const arcComboQ = (baseArcComboQ > 0 ? storyStructureMult(showrunner, baseArcComboQ * 1.6) : baseArcComboQ) * arcWeight;\n  const arcComboF = (baseArcComboF > 0 ? storyStructureMult(showrunner, baseArcComboF * 1.5) : baseArcComboF) * arcWeight;', "combo story structure multiplier")
scoring = must_replace(scoring, '  const actualComboMult = comboMult(draft.genres, true);', '  const actualComboMult = contrarianComboMult(showrunner, draft.genres);', "contrarian combo mult")
scoring = must_sub(scoring, r'  const comboFactor = showrunner === "genre"\n    \? 1 \+ \(comboFactorBase - 1\) \* \(comboFactorBase >= 1 \? 1\.3 : 0\.7\)\n    : comboFactorBase;', '  const comboFactor = comboFactorBase;', "legacy genre perk")
scoring = must_replace(scoring, '  const fans = Math.round(units * (web ? web.fanPerView : 0.09) * tierFan);', '  const fans = Math.round(units * (web ? web.fanPerView : 0.09) * tierFan * narrativeMomentumFanMult(showrunner, draft, points));', "narrative fan multiplier")
write(scoring_p, scoring)

state_p = SRC / "engine" / "state.ts"
state = read(state_p)
state = must_replace(state, 'import { buildSellerAuction, type SellerAuction } from "./sellerAuction";\n', 'import { buildSellerAuction, type SellerAuction } from "./sellerAuction";\nimport { trailblazerProductionMult } from "./showrunnerPerks";\n', "state perk import")
state = must_replace(state, '  const mods: StaffModFn = (st, p, team) => personMod(st, p, team, { bonds: nx.bonds ?? {} });', '  const mods: StaffModFn = (st, p, team) => {\n    const base = personMod(st, p, team, { bonds: nx.bonds ?? {} });\n    const discovery = trailblazerProductionMult(nx.showrunner, p.draft.genres, nx.comboLevels ?? {});\n    return { ...base, out: base.out * discovery, pace: base.pace * discovery };\n  };', "trailblazer daily production")
state = must_replace(state, '  const dealmaker=r.showrunner==="dealmaker"?1.15:1;', '  const dealmaker=1;', "legacy show-sale dealmaker")
state = must_replace(state, '  const awardCraft = r.showrunner === "festival" ? { story: Math.round(baseAwardCraft.story * 1.08 * 10) / 10, art: Math.round(baseAwardCraft.art * 1.08 * 10) / 10, sound: Math.round(baseAwardCraft.sound * 1.08 * 10) / 10 } : baseAwardCraft;', '  const awardCraft = baseAwardCraft;', "legacy festival award craft")
state = must_replace(state, '    audience: Math.round(result.fans * (r.showrunner === "festival" ? 1.10 : 1)),', '    audience: Math.round(result.fans),', "legacy festival award audience")
write(state_p, state)

seller_p = SRC / "engine" / "sellerAuction.ts"
seller = read(seller_p)
seller = must_replace(seller, 'export function buildSellerAuction(franchiseKey: string, fr: Franchise, week: number, world: RivalWorld, showrunner: string): SellerAuction {', 'export function buildSellerAuction(franchiseKey: string, fr: Franchise, week: number, world: RivalWorld, _showrunner: string): SellerAuction {', "seller auction param")
seller = must_replace(seller, '  const dealHeat = showrunner === "dealmaker" ? 1.14 : 1;', '  const dealHeat = 1;', "legacy auction deal heat")
seller = must_replace(seller, '    ceiling: round25(fair * (0.07 + rng() * 0.16) * (showrunner === "dealmaker" ? 1.08 : 1)),', '    ceiling: round25(fair * (0.07 + rng() * 0.16)),', "legacy liquidation deal heat")
write(seller_p, seller)

produce_p = SRC / "components" / "Produce.tsx"
produce = read(produce_p)
produce = must_replace(produce, 'import { genreTargetFor } from "../engine/genreTargets";\n', 'import { genreTargetFor } from "../engine/genreTargets";\nimport { engineerEyeRange, trailblazerProductionMult } from "../engine/showrunnerPerks";\n', "Produce perk import")
produce = must_replace(produce, '              const exactKnown = exactDirectionKnown(known, genres.length === 2 ? testedSeries : 0);', '              const exactKnown = exactDirectionKnown(known, genres.length === 2 ? testedSeries : 0);\n              const engineerHint = engineerEyeRange(run.showrunner, exactTarget, exactKnown);', "Engineer Eye calculation")
produce = must_replace(produce, '                  {exactKnown ? (', '                  {engineerHint && (\n                    <div className="mb-2 rounded-lg border border-gold/45 bg-gold/10 px-2 py-1.5 text-[10px] font-bold text-gold">\n                      ENGINEER’S EYE · LIKELY SWEET SPOT <span className="text-neon2">{engineerHint.low}–{engineerHint.high}% {phase!.a}</span> · works even on unseen blends and licensed IP.\n                    </div>\n                  )}\n                  {exactKnown ? (', "Engineer Eye UI")
produce = must_replace(produce, '    if (crunch) {\n      base = Math.max(base + 1, Math.round(base * 1.25));\n      min = Math.round(min * 1.25);\n      max = Math.round(max * 1.25);\n    }', '    if (crunch) {\n      base = Math.max(base + 1, Math.round(base * 1.25));\n      min = Math.round(min * 1.25);\n      max = Math.round(max * 1.25);\n    }\n    const discoveryMult = trailblazerProductionMult(run.showrunner, project.draft.genres, run.comboLevels ?? {});\n    if (discoveryMult > 1) {\n      base = Math.round(base * discoveryMult);\n      min = Math.round(min * discoveryMult);\n      max = Math.round(max * discoveryMult);\n    }', "Trailblazer rush boost")
write(produce_p, produce)

test = '''import { describe, expect, it } from "vitest";
import { ARC_COMBOS, SHOWRUNNERS, comboMult, type Draft } from "../data";
import { contrarianComboMult, engineerEyeRange, narrativeMomentumFanMult, storyStructureMult, trailblazerProductionMult } from "../showrunnerPerks";

const draft = (arcs: string[] = []): Draft => ({
  title: "Test", medium: "fanweb", budget: "indie", scope: "short", slot: "web",
  animeType: "shonen", genres: ["mecha", "romance"], audience: "teens",
  protag: "kai", protagName: "Kai", secondary: "none", pet: "none", villain: "none",
  arcs, sliders: [50, 50, 50], season: 1,
});

describe("new showrunner quartet", () => {
  it("wires dedicated art with no placeholder flags", () => {
    const ids = ["casting", "festival", "dealmaker", "genre"];
    const four = SHOWRUNNERS.filter((s) => ids.includes(s.id));
    expect(four).toHaveLength(4);
    for (const s of four) {
      expect(s.artPending).not.toBe(true);
      expect(s.sprite).toMatch(/sprite-showrunner-(hype|contrarian|savant|trailblazer)\\.webp$/);
      expect(s.portrait).toMatch(/portrait-showrunner-(hype|contrarian|savant|trailblazer)\\.webp$/);
    }
  });

  it("Hype Architect strengthens positive story structures and fan conversion", () => {
    expect(storyStructureMult("casting", 10)).toBeCloseTo(11.5);
    expect(storyStructureMult("casting", -4)).toBe(-4);
    const positive = ARC_COMBOS.find((c) => c.q > 0 || c.f > 0);
    expect(positive).toBeTruthy();
    expect(narrativeMomentumFanMult("casting", draft(positive!.arcs), { story: 90, art: 70, sound: 60 })).toBe(1.5);
    expect(narrativeMomentumFanMult("casting", draft([]), { story: 90, art: 70, sound: 60 })).toBe(1.25);
  });

  it("Contrarian specifically amplifies experimental pairings", () => {
    const base = comboMult(["mecha", "romance"], true);
    expect(base).toBeGreaterThan(1);
    expect(contrarianComboMult("festival", ["mecha", "romance"])).toBeCloseTo(1 + (base - 1) * 1.6);
    expect(contrarianComboMult("steady", ["mecha", "romance"])).toBeCloseTo(base);
  });

  it("Production Savant exposes a 20-point range but not when exact knowledge is known", () => {
    expect(engineerEyeRange("dealmaker", 63, false)).toEqual({ low: 53, high: 73 });
    expect(engineerEyeRange("dealmaker", 63, true)).toBeNull();
    expect(engineerEyeRange("steady", 63, false)).toBeNull();
  });

  it("Trailblazer boosts only an untried two-genre combination", () => {
    expect(trailblazerProductionMult("genre", ["mecha", "romance"], {})).toBe(1.35);
    expect(trailblazerProductionMult("genre", ["mecha", "romance"], { "mecha|romance": 1 })).toBe(1);
    expect(trailblazerProductionMult("steady", ["mecha", "romance"], {})).toBe(1);
  });
});
'''
write(SRC / "engine" / "__tests__" / "showrunner-abilities.test.ts", test)

print("Showrunner art + abilities patched successfully")
