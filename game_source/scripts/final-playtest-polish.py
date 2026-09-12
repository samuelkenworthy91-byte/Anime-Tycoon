from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def patch(rel: str, old: str, new: str, expected: int = 1) -> None:
    p = ROOT / rel
    text = p.read_text(encoding="utf-8")
    found = text.count(old)
    if found != expected:
        raise RuntimeError(f"{rel}: expected {expected} copies, found {found}: {old[:140]!r}")
    p.write_text(text.replace(old, new, expected), encoding="utf-8")


# Every unowned genre must remain purchasable after the two random starters,
# including the legacy zero-static-cost Slice/Fantasy entries.
patch(
    "src/components/Office.tsx",
    '{GENRES.filter((g) => g.rd > 0).map((g) => {',
    '{GENRES.map((g) => {',
)

# Original shows are about free narrative construction. Licensed adaptations
# may apply a learned studio blueprint, but ordinary ARCS should be secondary
# to source handling and production execution rather than dominate the score.
patch(
    "src/engine/scoring.ts",
    '''  });

  /* ---- hidden story structures: synergies are rewarding, clashes hurt */''',
    '''  });

  const arcWeight = licensed ? 0.45 : 1;
  arcQ *= arcWeight;
  arcsF *= arcWeight;

  /* ---- hidden story structures: synergies are rewarding, clashes hurt */''',
)
patch(
    "src/engine/scoring.ts",
    '''  const arcComboQ = baseArcComboQ > 0 ? baseArcComboQ * 1.6 : baseArcComboQ;
  const arcComboF = baseArcComboF > 0 ? baseArcComboF * 1.5 : baseArcComboF;
  const arcClashesHit = arcClashesFor(draft.arcs);
  const arcClashQ = arcClashesHit.reduce((a, c) => a + c.q, 0);
  const arcClashF = arcClashesHit.reduce((a, c) => a + c.f, 0);''',
    '''  const arcComboQ = (baseArcComboQ > 0 ? baseArcComboQ * 1.6 : baseArcComboQ) * arcWeight;
  const arcComboF = (baseArcComboF > 0 ? baseArcComboF * 1.5 : baseArcComboF) * arcWeight;
  const arcClashesHit = arcClashesFor(draft.arcs);
  const arcClashQ = arcClashesHit.reduce((a, c) => a + c.q, 0) * arcWeight;
  const arcClashF = arcClashesHit.reduce((a, c) => a + c.f, 0) * arcWeight;''',
)
patch(
    "src/engine/scoring.ts",
    '  const arcClashSeverity = arcClashesHit.reduce((sum, clash) => sum + Math.abs(clash.q), 0);',
    '  const arcClashSeverity = arcClashesHit.reduce((sum, clash) => sum + Math.abs(clash.q), 0) * arcWeight;',
)
patch(
    "src/engine/scoring.ts",
    '    { label: "Story arcs", pts: `${arcQ >= 0 ? "+" : ""}${arcQuality.toFixed(1)}` },',
    '    { label: licensed ? "Studio blueprint influence (adaptation-weighted)" : "Story arcs", pts: `${arcQ >= 0 ? "+" : ""}${arcQuality.toFixed(1)}` },',
)

# Awards may genuinely go unpresented when nobody clears the published floor.
# Preserve winner-only category shapes for the existing ceremony flow, while
# archiving and explicitly displaying every unawarded category at the summary.
patch(
    "src/engine/awards.ts",
    '''  /** just the player's wins, for the summary board */
  playerWins: { category: AwardCategoryId; name: string; title: string; cash: number; fans: number }[];
}''',
    '''  /** just the player's wins, for the summary board */
  playerWins: { category: AwardCategoryId; name: string; title: string; cash: number; fans: number }[];
  /** categories withheld because no production cleared the published standard */
  unawarded?: { id: AwardCategoryId; name: string; qualification: string }[];
}''',
)
patch(
    "src/engine/awards.ts",
    '''  const uniqueShows = dedupeAwardSlate(shows);
  const categories: AwardCategory[] = [];
  for (const def of AWARD_CATEGORIES) {
    const pool = uniqueShows.filter((n) => def.eligible(n) && awardQualifies(def.id, year, n));
    if (!pool.length) continue;''',
    '''  const uniqueShows = dedupeAwardSlate(shows);
  const categories: AwardCategory[] = [];
  const unawarded: NonNullable<AwardCeremony["unawarded"]> = [];
  for (const def of AWARD_CATEGORIES) {
    const pool = uniqueShows.filter((n) => def.eligible(n) && awardQualifies(def.id, year, n));
    if (!pool.length) {
      unawarded.push({ id: def.id, name: def.name, qualification: awardQualificationText(def.id, year) });
      continue;
    }''',
)
patch(
    "src/engine/awards.ts",
    '''    presentation: PRESENTATION_ORDER.filter((id) => !!byId(id)),
    playerWins,
  };''',
    '''    presentation: PRESENTATION_ORDER.filter((id) => !!byId(id)),
    playerWins,
    unawarded,
  };''',
)
patch(
    "src/components/AwardsCeremony.tsx",
    '''              })}
            </div>

            <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-5 text-center">''',
    '''              })}
              {(ceremony.unawarded ?? []).map((row, index) => (
                <div key={`unawarded-${row.id}`} className="aw-rise flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-[#0d0915aa] px-4 py-3" style={{ animationDelay: `${(ceremony.presentation.length + index) * 0.08}s` }}>
                  <div>
                    <div className="text-[8px] font-black tracking-[0.25em] text-paper/45">{row.name.toUpperCase()}</div>
                    <div className="mt-0.5 font-extrabold text-paper/55">NO AWARD PRESENTED</div>
                  </div>
                  <div className="max-w-[48%] text-right text-[8px] font-bold text-paper/35">No production cleared {row.qualification}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-2xl border border-gold/35 bg-gold/10 p-5 text-center">''',
)

# Focused regression coverage for the two polish fixes.
patch(
    "src/engine/__tests__/playtest-plan.test.ts",
    'import type { ShowResult } from "../scoring";',
    'import type { ShowResult } from "../scoring";\nimport { buildCeremony } from "../awards";',
)
patch(
    "src/engine/__tests__/playtest-plan.test.ts",
    '''      expect(Number.isFinite(out!.result.fans), ip.title).toBe(true);
    }
  });''',
    '''      expect(Number.isFinite(out!.result.fans), ip.title).toBe(true);
      expect(out!.result.breakdown.some((row) => row.label.includes("adaptation-weighted")), ip.title).toBe(true);
    }
  });''',
)
patch(
    "src/engine/__tests__/playtest-plan.test.ts",
    '''  it("escalates genre licence costs while preserving an affordable first expansion", () => {
    const target = "cosmic_horror" as GenreId;''',
    '''  it("escalates genre licence costs while preserving an affordable first expansion", () => {
    expect(genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, "slice")).toBeGreaterThan(0);
    expect(genreUnlockCost({ genresUnlocked: ["kaiju", "romance"] }, "fantasy")).toBeGreaterThan(0);
    const target = "cosmic_horror" as GenreId;''',
)
patch(
    "src/engine/__tests__/playtest-plan.test.ts",
    '''  it("requires sustained studio growth for relocation, not cash alone", () => {''',
    '''  it("records categories as explicitly unawarded when nobody clears the standard", () => {
    const ceremony = buildCeremony(1, [{
      title: "Not Ready", studio: "Tiny Studio", player: true, animeType: "shonen",
      genres: ["slice"], score: 10, story: 10, art: 10, sound: 10, audience: 100,
      sourceId: "low-1", studioId: "player", draft: null, protag: null, licensedIpAward: null,
    }]);
    expect(ceremony.categories).toHaveLength(0);
    expect(ceremony.unawarded).toHaveLength(7);
    expect(ceremony.unawarded?.some((row) => row.id === "aoty")).toBe(true);
  });

  it("requires sustained studio growth for relocation, not cash alone", () => {''',
)

print("Final playtest polish applied.")
