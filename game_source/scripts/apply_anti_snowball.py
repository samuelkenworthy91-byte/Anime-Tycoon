from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def write(rel: str, text: str) -> None:
    (ROOT / rel).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# ---------------------------------------------------------------- scoring
p = "src/engine/scoring.ts"
s = read(p)
s = replace_once(
    s,
    'import { genreTargetFor } from "./genreTargets";',
    'import { genreTargetFor } from "./genreTargets";\nimport { fanBaseSalesMultiplier } from "./difficulty";',
    "scoring difficulty import",
)
s = replace_once(
    s,
    '(1 + Math.log1p(fanBase / 60_000) * 0.8);',
    'fanBaseSalesMultiplier(fanBase);',
    "fanbase sales multiplier",
)
s = replace_once(
    s,
    '    { label: `Hype`, pts: `${Math.round(hype)}%` },\n    { label: "Commercial impact", pts: commercial.label },',
    '    { label: `Hype`, pts: `${Math.round(hype)}%` },\n    { label: "Established audience", pts: `×${fanBaseSalesMultiplier(fanBase).toFixed(2)} sales (cap ×1.80)` },\n    { label: "Commercial impact", pts: commercial.label },',
    "fanbase breakdown",
)
write(p, s)

# ---------------------------------------------------------------- market
p = "src/engine/market.ts"
s = read(p)
s = replace_once(
    s,
    '/** each extra show you have on air splits the audience\'s attention */\nexport const attentionMult = (airingCount: number) => Math.max(0.8, 1 - 0.07 * airingCount);',
    '/** each OTHER show you have on air splits the audience\'s attention.\n *  Scale remains powerful, but four simultaneous broadcasts now compete\n *  meaningfully for the same viewers instead of bottoming out at ×0.80. */\nexport const attentionMult = (airingCount: number) => Math.max(0.65, 1 - 0.10 * Math.max(0, airingCount));',
    "attention multiplier",
)
write(p, s)

# ---------------------------------------------------------------- rivals
p = "src/engine/rivals.ts"
s = read(p)
s = replace_once(
    s,
    '  if (studio.momentum < -20) count = Math.max(1, count - 1);\n  if (studio.momentum >= 15) count = Math.min(5, count + 1);',
    '  if (studio.momentum < -20) count = Math.max(1, count - 1);\n  if (studio.momentum >= 15) count = Math.min(5, count + 1);\n  /* Once the player becomes a serious contender, major rivals answer with\n     denser slates rather than politely leaving the calendar empty. */\n  if (boost >= 2.25 && studio.tier >= 3) count = Math.min(5, count + 1);\n  if (boost >= 4.5 && studio.tier >= 4) count = Math.min(5, count + 1);',
    "rival slate pressure",
)
s = replace_once(
    s,
    '      const score = computeScore(studio, { genres, franchiseKey: fr ? fr.key : null, kind });',
    '      const responseBoost = world.playerRank === 1 ? Math.min(3, 1 + Math.max(0, world.year - 1) * 0.25) : 0;\n      const score = computeScore(studio, { genres, franchiseKey: fr ? fr.key : null, kind }, responseBoost);',
    "surprise rival pressure",
)
old_finalize = '''export function finalizeYear(world: RivalWorld, player: RankingInput): { world: RivalWorld; notices: string[] } {
  const ranked = computeRankings(world, player);
  const notices: string[] = [];
  const studios = world.studios.map((st) => {
    const entry = ranked.find((r) => r.id === st.id);
    return { ...st, prevRank: st.rank || (entry?.rank ?? 1), rank: entry?.rank ?? 1 };
  });
  const playerEntry = ranked.find((r) => r.id === "player");
  return {
    world: {
      ...world,
      studios,
      playerPrevRank: world.playerRank || (playerEntry?.rank ?? 1),
      playerRank: playerEntry?.rank ?? 1,
    },
    notices,
  };
}'''
new_finalize = '''export function finalizeYear(world: RivalWorld, player: RankingInput): { world: RivalWorld; notices: string[] } {
  const ranked = computeRankings(world, player);
  const notices: string[] = [];
  const playerEntry = ranked.find((r) => r.id === "player");
  const playerRank = playerEntry?.rank ?? 1;
  /* Dominance creates enemies. A champion studio makes every serious rival
     more motivated and more willing to fight over releases, talent and IP. */
  const dominanceHeat = playerRank === 1
    ? Math.min(12, 5 + player.masterpieces * 0.6 + player.awards * 0.12)
    : playerRank <= 3 ? 2 : playerRank >= 6 ? -1 : 0;
  const studios = world.studios.map((st) => {
    const entry = ranked.find((r) => r.id === st.id);
    const proximity = playerRank === 1 && (entry?.rank ?? 99) <= 4 ? 2 : 0;
    const rivalry = clampPct(st.rivalry + dominanceHeat + proximity);
    const momentumLift = playerRank === 1 && st.status !== "collapsed" ? ((entry?.rank ?? 99) <= 3 ? 3 : 1) : 0;
    return {
      ...st,
      prevRank: st.rank || (entry?.rank ?? 1),
      rank: entry?.rank ?? 1,
      rivalry,
      momentum: clamp(st.momentum + momentumLift, -30, 30),
    };
  });
  if (playerRank === 1 && player.releases >= 2) {
    notices.push("🔥 INDUSTRY RESPONSE — the #1 studio has a target on its back. Rivals are investing to catch you.");
  }
  return {
    world: {
      ...world,
      studios,
      playerPrevRank: world.playerRank || playerRank,
      playerRank,
    },
    notices,
  };
}'''
s = replace_once(s, old_finalize, new_finalize, "finalize year pressure")
old_remove = '''export function removeRivalTalent(world: RivalWorld, talentId: string): RivalWorld {
  return {
    ...world,
    studios: world.studios.map((s) => ({ ...s, talent: s.talent.filter((t) => t.id !== talentId) })),
  };
}'''
new_remove = '''export function removeRivalTalent(world: RivalWorld, talentId: string, week = world.yearStartWeek, compensation = 0): RivalWorld {
  return {
    ...world,
    studios: world.studios.map((s) => {
      if (!s.talent.some((t) => t.id === talentId)) return s;
      const remaining = s.talent.filter((t) => t.id !== talentId);
      /* A poached studio recruits again. The replacement is unavailable for
         at least half a year, so stealing a star hurts without permanently
         emptying every rival roster. */
      const replacementIndex = 10_000 + yearOfWeek(week) * 1_000 + (hashStr(talentId) % 997);
      const replacement = genTalent(s, replacementIndex, week + 24);
      return {
        ...s,
        talent: [...remaining, replacement],
        revenue: s.revenue + Math.max(0, Math.round(compensation)),
        reputation: clampPct(s.reputation + 1),
      };
    }),
  };
}'''
s = replace_once(s, old_remove, new_remove, "rival talent replenishment")
write(p, s)

# ---------------------------------------------------------------- awards
p = "src/engine/awards.ts"
s = read(p)
old_rank = '''function rankFor(def: AwardCategoryDef, pool: AwardNominee[]): AwardNominee[] {
  return [...pool].sort((a, b) => {
    const m = def.metric(b) - def.metric(a);
    if (m !== 0) return m;
    if (b.score !== a.score) return b.score - a.score;
    if (b.audience !== a.audience) return b.audience - a.audience;
    return a.title.localeCompare(b.title);
  });
}'''
new_rank = '''function juryTaste(year: number, def: AwardCategoryDef, n: AwardNominee): number {
  /* Fan Favourite remains a literal audience vote. Jury categories have a
     small deterministic taste swing: enough to split close races, never
     enough to make a mediocre show beat an obvious masterpiece. */
  if (def.id === "fanfav") return 0;
  const h = hashStr(`${year}|${def.id}|${awardNomineeKey(n)}`);
  const unit = (h % 10_001) / 10_000; // stable 0..1
  const range = def.id === "aoty" ? 0.85 : def.tier === 2 ? 0.70 : 1.05;
  return (unit - 0.5) * 2 * range;
}

function rankFor(def: AwardCategoryDef, pool: AwardNominee[], year: number): AwardNominee[] {
  return [...pool].sort((a, b) => {
    const rawA = def.metric(a);
    const rawB = def.metric(b);
    /* Exact metric ties keep the documented score/audience/title tie-break. */
    if (rawA !== rawB) {
      const m = (rawB + juryTaste(year, def, b)) - (rawA + juryTaste(year, def, a));
      if (m !== 0) return m;
    }
    if (b.score !== a.score) return b.score - a.score;
    if (b.audience !== a.audience) return b.audience - a.audience;
    return a.title.localeCompare(b.title);
  });
}'''
s = replace_once(s, old_rank, new_rank, "awards jury taste")
s = replace_once(s, '    const ranked = rankFor(def, pool);', '    const ranked = rankFor(def, pool, year);', "awards rank call")
write(p, s)

# ---------------------------------------------------------------- state
p = "src/engine/state.ts"
s = read(p)
s = replace_once(
    s,
    'import { initIPMarket, licensedRevenue, migrateIPMarket, tickIPMarket, ipById, type IPMarketState } from "./ip";',
    'import { initIPMarket, licensedRevenue, migrateIPMarket, tickIPMarket, ipById, type IPMarketState } from "./ip";\nimport { industryPressure, managementOutputMult, talentPoachTerms, type TalentPoachTerms } from "./difficulty";',
    "state difficulty import",
)
old_outgoings = '''export const office = (r: RunState) => OFFICES[r.officeLevel];
export const weeklyOutgoings = (r: RunState) =>
  office(r).rent + r.staff.reduce((a, s) => a + s.salary, 0) * dynastySalaryMult(r) + facilityUpkeep(r.facilities);'''
new_outgoings = '''export const office = (r: RunState) => OFFICES[r.officeLevel];

/** Campaign pressure is derived from existing save fields: no migration or
 * hidden difficulty state. Exposed for the Rivals screen and tuning tests. */
export const campaignPressureFor = (r: RunState) => industryPressure({
  week: r.week,
  cash: r.cash,
  fans: r.fans,
  awards: r.awards,
  hits: r.hits,
  bestScore: r.bestScore,
  showsMade: r.showsMade,
  playerRank: r.rivalWorld?.playerRank,
});

export const weeklyOutgoings = (r: RunState) =>
  office(r).rent + r.staff.reduce((a, s) => a + s.salary, 0) * dynastySalaryMult(r) * campaignPressureFor(r).salaryMult + facilityUpkeep(r.facilities);'''
s = replace_once(s, old_outgoings, new_outgoings, "weekly pressure")
s = replace_once(
    s,
    '    const wages = r.staff.reduce((a, s) => a + s.salary, 0) * dynastySalaryMult(r) * 4;',
    '    const wages = r.staff.reduce((a, s) => a + s.salary, 0) * dynastySalaryMult(r) * campaignPressureFor(r).salaryMult * 4;',
    "forecast pressure wages",
)
# Headless/legacy project tick: management multiplier belongs in the same shared production FX.
s = replace_once(
    s,
    '  const dynFx = dynastyFX(r);\n  const fx = {\n    ...baseFx,\n    pointMult: {\n      story: baseFx.pointMult.story * spm.story * dynFx.pointMult,\n      art: baseFx.pointMult.art * spm.art * dynFx.pointMult,\n      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult,\n    },',
    '  const dynFx = dynastyFX(r);\n  const managementMult = managementOutputMult(activeProjects(projects).length, r.officeLevel, Object.values(heads).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n  const fx = {\n    ...baseFx,\n    pointMult: {\n      story: baseFx.pointMult.story * spm.story * dynFx.pointMult * managementMult,\n      art: baseFx.pointMult.art * spm.art * dynFx.pointMult * managementMult,\n      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult * managementMult,\n    },',
    "headless management pressure",
)
# Year-end industry response.
s = replace_once(
    s,
    '      rivalWorld = fy.world;\n      const py = planRivalYear(rivalWorld, year + 1, w, { qualityBoost: r.dynasty ? dynastyDifficulty(r).rivalBoost : 0 });\n      rivalWorld = py.world;\n      notices.push(...py.notices);',
    '      rivalWorld = fy.world;\n      notices.push(...fy.notices);\n      const pressure = industryPressure({ week: w, cash, fans, awards, hits: r.hits, bestScore: r.bestScore, showsMade: r.showsMade, playerRank: rivalWorld.playerRank });\n      const py = planRivalYear(rivalWorld, year + 1, w, { qualityBoost: pressure.rivalBoost + (r.dynasty ? dynastyDifficulty(r).rivalBoost : 0) });\n      rivalWorld = py.world;\n      notices.push(...py.notices);\n      if (pressure.level >= 1) notices.push(`📈 INDUSTRY PRESSURE ${pressure.level.toFixed(1)}/6 · ${pressure.band.toUpperCase()} — next year rivals gain +${pressure.rivalBoost.toFixed(1)} quality pressure.`);',
    "next-year rival pressure",
)
# Live contribution output: management strain must affect the visible bubbles that create quality.
s = replace_once(
    s,
    '    effective *= personMod(st, project, team, { bonds: r.bonds ?? {} }).out;\n  } else {',
    '    effective *= personMod(st, project, team, { bonds: r.bonds ?? {} }).out;\n    effective *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n  } else {',
    "live staff management pressure",
)
s = replace_once(
    s,
    '  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;\n  if (r.showrunner === "steady") skill *= 1.5;',
    '  if (type === "art" && r.research.includes("mocap")) skill *= 1.12;\n  skill *= managementOutputMult(activeProjects(r.projects).length, r.officeLevel, Object.values(r.heads ?? {}).filter(Boolean).length, r.capitalProjects.includes("flagship_hq"));\n  if (r.showrunner === "steady") skill *= 1.5;',
    "showrunner management pressure",
)
# Daily pipeline FX mirrors the visible contribution model.
s = replace_once(
    s,
    '  const dynFx = dynastyFX(nx);\n  const fx = {\n    ...baseFx,\n    pointMult: {\n      story: baseFx.pointMult.story * spm.story * dynFx.pointMult,\n      art: baseFx.pointMult.art * spm.art * dynFx.pointMult,\n      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult,\n    },',
    '  const dynFx = dynastyFX(nx);\n  const managementMult = managementOutputMult(activeProjects(nx.projects).length, nx.officeLevel, Object.values(nx.heads ?? {}).filter(Boolean).length, nx.capitalProjects.includes("flagship_hq"));\n  const fx = {\n    ...baseFx,\n    pointMult: {\n      story: baseFx.pointMult.story * spm.story * dynFx.pointMult * managementMult,\n      art: baseFx.pointMult.art * spm.art * dynFx.pointMult * managementMult,\n      sound: baseFx.pointMult.sound * spm.sound * dynFx.pointMult * managementMult,\n    },',
    "daily management pressure",
)
s = replace_once(
    s,
    '    audienceBar: dynastyAudienceBar(r),',
    '    audienceBar: dynastyAudienceBar(r) + campaignPressureFor(r).audienceBar,',
    "campaign audience expectation",
)
old_hire = '''/** hire a notable away from a rival studio: pay the signing fee, they join
    your crew with a full career — and the rival studio remembers the insult */
export function hireRivalTalent(r: RunState, talentId: string): RunState | null {
  const t = rivalTalentById(r.rivalWorld, talentId);
  if (!t) return null;
  if (r.staff.length >= staffCapacity(r)) return null;
  if (r.cash < t.cost) return null;
  const staff = rivalTalentToStaff(t, r.week);
  const studioName = r.rivalWorld.studios.find((s) => s.id === t.studioId)?.name ?? "a rival studio";
  return {
    ...r,
    cash: r.cash - t.cost,
    staff: [...r.staff, staff],
    rivalWorld: bumpRivalry(removeRivalTalent(r.rivalWorld, talentId), t.studioId, 4),
    notices: [
      ...r.notices,
      `🤝 ${t.name} (Lv${t.level} ${staff.role}) leaves ${studioName} and signs with ${r.studio} for £${t.cost.toLocaleString("en-GB")}. They won't forget this.`,
    ],
  };
}'''
new_hire = '''/** live buyout / willingness terms for one rival notable */
export function rivalTalentPoachTerms(r: RunState, talentId: string): TalentPoachTerms | null {
  const t = rivalTalentById(r.rivalWorld, talentId);
  const studio = t ? r.rivalWorld.studios.find((s) => s.id === t.studioId) : undefined;
  if (!t || !studio || studio.status === "collapsed" || t.availableWeek > r.week) return null;
  return talentPoachTerms({
    week: r.week,
    cash: r.cash,
    fans: r.fans,
    awards: r.awards,
    hits: r.hits,
    bestScore: r.bestScore,
    showsMade: r.showsMade,
    playerRank: r.rivalWorld.playerRank,
    officeLevel: r.officeLevel,
  }, t, studio);
}

/** Rival stars are under contract: reputation earns the conversation, then
    the player pays a real buyout + signing package. The rival recruits again. */
export function hireRivalTalent(r: RunState, talentId: string): RunState | null {
  const t = rivalTalentById(r.rivalWorld, talentId);
  const terms = rivalTalentPoachTerms(r, talentId);
  if (!t || !terms || terms.blockedReason) return null;
  if (r.staff.length >= staffCapacity(r)) return null;
  if (r.cash < terms.askingPrice) return null;
  const staff = rivalTalentToStaff(t, r.week);
  const studioName = r.rivalWorld.studios.find((s) => s.id === t.studioId)?.name ?? "a rival studio";
  const compensation = Math.round(terms.askingPrice * 0.35);
  return {
    ...r,
    cash: r.cash - terms.askingPrice,
    staff: [...r.staff, staff],
    rivalWorld: bumpRivalry(removeRivalTalent(r.rivalWorld, talentId, r.week, compensation), t.studioId, 10),
    notices: [
      ...r.notices,
      `🤝 ${t.name} (Lv${t.level} ${staff.role}) leaves ${studioName}: £${terms.askingPrice.toLocaleString("en-GB")} buyout/signing package after their employer counter-offer. ${studioName} will recruit a replacement.`,
    ],
  };
}'''
s = replace_once(s, old_hire, new_hire, "rival talent market")
write(p, s)

# ---------------------------------------------------------------- Rivals UI
p = "src/components/Rivals.tsx"
s = read(p)
s = replace_once(
    s,
    'import { hireRivalTalent, studioRankings, type RunState } from "../engine/state";',
    'import { campaignPressureFor, hireRivalTalent, rivalTalentPoachTerms, studioRankings, type RunState } from "../engine/state";',
    "rivals UI imports",
)
s = replace_once(
    s,
    '        const studio = run.rivalWorld.studios.find((s) => s.id === t.studioId);\n        const blocked = run.cash < t.cost;',
    '        const studio = run.rivalWorld.studios.find((s) => s.id === t.studioId);\n        const terms = rivalTalentPoachTerms(run, t.id);\n        const price = terms?.askingPrice ?? t.cost;\n        const blocked = !terms || !!terms.blockedReason || run.cash < price;',
    "rivals UI talent terms",
)
s = replace_once(
    s,
    '              <div className="font-display text-xs font-extrabold text-gold">{formatGBP(t.cost)}</div>\n              <div className="text-[9px] text-paper/40">signing fee</div>',
    '              <div className="font-display text-xs font-extrabold text-gold">{formatGBP(price)}</div>\n              <div className={cn("max-w-[150px] text-[9px]", terms?.blockedReason ? "text-neon" : "text-paper/40")}>{terms?.blockedReason ?? "buyout + signing"}</div>',
    "rivals UI talent price",
)
s = replace_once(
    s,
    '              {full ? "FULL" : "POACH"}',
    '              {full ? "FULL" : terms?.blockedReason ? "LOCKED" : "POACH"}',
    "rivals UI button",
)
s = replace_once(
    s,
    '  const [tab, setTab] = useState<"rankings" | "studios" | "talent">("rankings");\n  const entries = studioRankings(run);',
    '  const [tab, setTab] = useState<"rankings" | "studios" | "talent">("rankings");\n  const entries = studioRankings(run);\n  const pressure = campaignPressureFor(run);',
    "rivals UI pressure data",
)
s = replace_once(
    s,
    '    <div className="space-y-2 text-[12px]">\n      <div className="mb-2 flex gap-1">',
    '    <div className="space-y-2 text-[12px]">\n      <div className="rounded-lg border border-gold/25 bg-gold/5 px-2.5 py-2">\n        <div className="flex items-center justify-between gap-2">\n          <span className="text-[9px] font-bold tracking-[0.18em] text-paper/50">INDUSTRY PRESSURE</span>\n          <span className="font-display text-xs font-extrabold text-gold">{pressure.level.toFixed(1)}/6 · {pressure.band.toUpperCase()}</span>\n        </div>\n        <div className="mt-0.5 text-[9px] text-paper/45">Success attracts competition: next-year rival pressure +{pressure.rivalBoost.toFixed(1)} · payroll ×{pressure.salaryMult.toFixed(2)} · parallel productions suffer management strain.</div>\n      </div>\n      <div className="mb-2 flex gap-1">',
    "rivals UI pressure banner",
)
write(p, s)

# ---------------------------------------------------------------- tests
p = "src/engine/__tests__/rivals.test.ts"
s = read(p)
s = replace_once(
    s,
    '  hireRivalTalent,\n  initialRun,',
    '  hireRivalTalent,\n  rivalTalentPoachTerms,\n  initialRun,',
    "rivals test import",
)
old_test = '''  it("hireRivalTalent pays the fee, adds staff, and heats the rivalry", () => {
    const r = richRun();
    const t = rivalTalentAvailable(r.rivalWorld, r.week)[0];
    const before = r.rivalWorld.studios.find((s) => s.id === t.studioId)!.rivalry;
    const out = hireRivalTalent(r, t.id)!;
    expect(out).toBeTruthy();
    expect(out.cash).toBe(r.cash - t.cost);
    expect(out.staff.length).toBe(r.staff.length + 1);
    expect(rivalTalentAvailable(out.rivalWorld, r.week).some((x) => x.id === t.id)).toBe(false);
    const after = out.rivalWorld.studios.find((s) => s.id === t.studioId)!.rivalry;
    expect(after).toBeGreaterThan(before);
  });'''
new_test = '''  it("hireRivalTalent requires prestige, pays a real buyout, and the rival recruits again", () => {
    const r = richRun({ week: 48, bestScore: 36, hits: 8, awards: 8, fans: 800_000, showsMade: 12 });
    const t = rivalTalentAvailable(r.rivalWorld, r.week)[0];
    const terms = rivalTalentPoachTerms(r, t.id)!;
    expect(terms.blockedReason).toBeNull();
    expect(terms.askingPrice).toBeGreaterThan(t.cost);
    const before = r.rivalWorld.studios.find((s) => s.id === t.studioId)!.rivalry;
    const beforeRoster = r.rivalWorld.studios.find((s) => s.id === t.studioId)!.talent.length;
    const out = hireRivalTalent(r, t.id)!;
    expect(out).toBeTruthy();
    expect(out.cash).toBe(r.cash - terms.askingPrice);
    expect(out.staff.length).toBe(r.staff.length + 1);
    expect(rivalTalentAvailable(out.rivalWorld, r.week).some((x) => x.id === t.id)).toBe(false);
    const source = out.rivalWorld.studios.find((s) => s.id === t.studioId)!;
    expect(source.rivalry).toBeGreaterThan(before);
    expect(source.talent.length).toBe(beforeRoster);
    expect(source.talent.some((x) => x.availableWeek > r.week)).toBe(true);
  });'''
s = replace_once(s, old_test, new_test, "rivals poach test")
write(p, s)

# New pure difficulty regression suite.
p = ROOT / "src/engine/__tests__/difficulty.test.ts"
p.write_text('''import { describe, expect, it } from "vitest";
import {
  FANBASE_SALES_CAP,
  fanBaseSalesMultiplier,
  industryPressure,
  managementOutputMult,
  talentPoachTerms,
} from "../difficulty";

describe("campaign anti-snowball difficulty", () => {
  it("starts neutral, then reacts to an early breakout rather than waiting for Dynasty Mode", () => {
    const rookie = industryPressure({ week: 0, cash: 90_000, fans: 0, awards: 0, hits: 0, bestScore: 0, showsMade: 0, playerRank: 1 });
    const breakout = industryPressure({ week: 30, cash: 750_000, fans: 100_000, awards: 0, hits: 2, bestScore: 33, showsMade: 2, playerRank: 1 });
    const champion = industryPressure({ week: 144, cash: 8_000_000, fans: 750_000, awards: 10, hits: 12, bestScore: 37, showsMade: 18, playerRank: 1 });
    expect(rookie.level).toBe(0);
    expect(breakout.level).toBeGreaterThan(1);
    expect(champion.level).toBeGreaterThan(breakout.level);
    expect(champion.rivalBoost).toBeGreaterThan(3);
  });

  it("keeps fanbase valuable but caps the compounding lifetime sales multiplier", () => {
    expect(fanBaseSalesMultiplier(0)).toBe(1);
    expect(fanBaseSalesMultiplier(75_000)).toBeGreaterThan(1.25);
    expect(fanBaseSalesMultiplier(300_000)).toBeLessThanOrEqual(FANBASE_SALES_CAP);
    expect(fanBaseSalesMultiplier(50_000_000)).toBe(FANBASE_SALES_CAP);
  });

  it("makes parallel productions a management problem that infrastructure can mitigate", () => {
    expect(managementOutputMult(1, 0, 0)).toBe(1);
    const overloaded = managementOutputMult(4, 1, 0);
    const managed = managementOutputMult(4, 4, 3, true);
    expect(overloaded).toBeLessThan(0.85);
    expect(managed).toBeGreaterThan(overloaded);
    expect(managed).toBeLessThanOrEqual(1);
  });

  it("prevents a cash-rich rookie from instantly stripping elite rival talent", () => {
    const talent = { skill: 92, level: 8, cost: 85_000 };
    const studio = { tier: 4, reputation: 78, rivalry: 0 };
    const rookie = talentPoachTerms({ week: 20, cash: 50_000_000, fans: 20_000, awards: 0, hits: 1, bestScore: 31, showsMade: 2, playerRank: 1, officeLevel: 0 }, talent, studio);
    expect(rookie.askingPrice).toBeGreaterThan(500_000);
    expect(rookie.blockedReason).not.toBeNull();

    const established = talentPoachTerms({ week: 144, cash: 50_000_000, fans: 1_000_000, awards: 12, hits: 14, bestScore: 38, showsMade: 22, playerRank: 1, officeLevel: 4 }, talent, studio);
    expect(established.blockedReason).toBeNull();
    expect(established.askingPrice).toBeGreaterThan(rookie.askingPrice);
  });
});
''', encoding="utf-8")

# Difficulty notes live with the repo so later balance passes know the intent.
p = ROOT / "docs/DIFFICULTY_REBALANCE_V2.md"
p.write_text('''# Difficulty Rebalance V2 — Anti-Snowball Campaign

Implemented against live `main` after playtesting showed that an early high-scoring second production could effectively solve the economy.

## Design rule

Success remains rewarding, but success makes the industry react. Difficulty is not implemented as a flat price multiplier.

## Industry Pressure

Pressure is derived from existing save data (career year, best score, hits, awards, fans, cash and #1 ranking), so the change is additive and save-compatible. It runs from 0–6 and begins during the normal twelve-year campaign rather than waiting for Dynasty Mode.

Pressure raises next-year rival greenlight quality, can expand strong rivals' slates, gently raises audience expectations, increases payroll pressure and is shown on the Rivals screen.

## Fanbase commercial ceiling

The old logarithmic audience flywheel had no practical ceiling. The new established-audience sales multiplier approaches and caps at ×1.80. Fans still create a meaningful commercial floor without turning the second hit into unlimited capital.

## Rival talent

Rival notables are no longer cheap shop items. Poaching now requires studio prestige and charges a contract buyout/signing package based on talent quality, employer tier/reputation/rivalry and current Industry Pressure. Rival employers effectively counter-offer through a protection premium. The source studio receives compensation and recruits a delayed replacement, preventing permanent roster stripping.

## Management strain

One production is unaffected. Every parallel major production adds management strain. Larger offices, department heads and the Global Flagship Headquarters mitigate the penalty. This makes simultaneous pipelines an empire-management choice instead of free throughput.

## Awards

Fan Favourite remains a literal audience ranking. Jury categories retain their real craft/score metrics but add a small deterministic annual taste swing. It can decide close contests but cannot make mediocre work beat a clearly superior production. Exact metric ties retain the documented score → audience → title tie-break.

## Rival response

Finishing #1 increases rivalry heat and momentum among competing studios. At higher pressure, tier 3–5 studios may greenlight denser slates. Surprise productions also receive a modest champion-response boost while the player holds the top ranking.

## Core tuning constants

- Industry Pressure: `0..6`
- Rival quality pressure: up to `+6`
- Campaign audience expectation: up to `+6` bar units (review effect remains mild)
- Campaign payroll multiplier: up to `×1.28`
- Fanbase sales multiplier: cap `×1.80`
- Parallel-production output cost: `−7.5%` per extra active project before mitigation
- Multi-airing attention floor: `×0.65`

The intent is that an excellent second production is still exciting; it simply causes the rest of the industry to notice the player instead of ending the competitive game.
''', encoding="utf-8")

print("anti-snowball patch applied")
