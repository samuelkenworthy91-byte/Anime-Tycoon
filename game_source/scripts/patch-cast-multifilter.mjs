#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.dirname(HERE);
const CREATE = path.join(ROOT, "src", "components", "Create.tsx");
const DISPLAY = path.join(ROOT, "src", "engine", "castDisplayOrder.ts");
const TEST = path.join(ROOT, "src", "engine", "__tests__", "cast-display-filter.test.ts");

const displaySource = `import type { AnimeType, CastMember, GenreId } from "./data";

export type CastBrowseFilter =
  | { kind: "type"; value: AnimeType }
  | { kind: "genre"; value: GenreId };

/** Stable presentation only. Hidden affinities never influence browsing order. */
export function mixedCastOrder(members: readonly CastMember[]): CastMember[] {
  const hash = (id: string) => {
    let h = 2166136261;
    for (const char of id) h = Math.imul(h ^ char.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const remaining = [...members].sort((a, b) => hash(a.id) - hash(b.id) || a.id.localeCompare(b.id));
  const result: CastMember[] = [];
  // Track proportional genre demand, so common genres are spread throughout
  // the list rather than left as a large block at its end.
  const totals = new Map<string, number>();
  const used = new Map<string, number>();
  for (const member of members) for (const genre of member.visibleAff) totals.set(genre, (totals.get(genre) ?? 0) + 1);
  while (remaining.length) {
    const score = (member: CastMember) => {
      let value = 0;
      for (const genre of member.visibleAff) {
        value += ((result.length + 1) * (totals.get(genre) ?? 0) / members.length - (used.get(genre) ?? 0)) * 3;
        for (let back = 1; back <= 5; back++) {
          if (result[result.length - back]?.visibleAff.includes(genre)) value -= 6 / back;
        }
      }
      if (result.at(-1)?.type === member.type) value -= 1;
      return value;
    };
    let best = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const value = score(remaining[i]);
      if (value > bestScore) { best = i; bestScore = value; }
    }
    const [next] = remaining.splice(best, 1);
    result.push(next);
    for (const genre of next.visibleAff) used.set(genre, (used.get(genre) ?? 0) + 1);
  }
  return result;
}

/**
 * Browse-time cast filter. Every active filter must match.
 * Anime type uses the public Shonen/Shojo field; genre matching uses visible
 * affinities only, so hidden affinities can never leak through filtering.
 */
export function filterCastByFilters(
  members: readonly CastMember[],
  filters: readonly CastBrowseFilter[],
): CastMember[] {
  if (!filters.length) return [...members];
  return members.filter((member) =>
    filters.every((filter) =>
      filter.kind === "type"
        ? member.type === filter.value
        : member.visibleAff.includes(filter.value)
    )
  );
}

/** Backwards-compatible one-genre wrapper. */
export function filterCastByVisibleGenre(
  members: readonly CastMember[],
  genre: GenreId | null,
): CastMember[] {
  return filterCastByFilters(members, genre ? [{ kind: "genre", value: genre }] : []);
}
`;
fs.writeFileSync(DISPLAY, displaySource);

let create = fs.readFileSync(CREATE, "utf8");

const importOld = `import { filterCastByVisibleGenre, mixedCastOrder } from "../engine/castDisplayOrder";`;
const importNew = `import { filterCastByFilters, mixedCastOrder, type CastBrowseFilter } from "../engine/castDisplayOrder";`;
if (create.includes(importOld)) create = create.replace(importOld, importNew);
else if (!create.includes(importNew)) throw new Error("Could not patch castDisplayOrder import");

const stateOld = `  const [castGenreFilter, setCastGenreFilter] = useState<GenreId | null>(null);`;
const stateNew = `  const [castFilters, setCastFilters] = useState<CastBrowseFilter[]>([]);`;
if (create.includes(stateOld)) create = create.replace(stateOld, stateNew);
else if (!create.includes(stateNew)) throw new Error("Could not patch cast filter state");

const derivedOld = `  const filteredCastList = filterCastByVisibleGenre(castRow.list, castGenreFilter);\n  const filterGenre = castGenreFilter ? GENRES.find((g) => g.id === castGenreFilter) : null;`;
const derivedNew = `  const filteredCastList = filterCastByFilters(castRow.list, castFilters);\n  const castFilterAtLimit = castFilters.length >= 3;\n  const isCastFilterActive = (kind: CastBrowseFilter["kind"], value: AnimeType | GenreId) =>\n    castFilters.some((filter) => filter.kind === kind && filter.value === value);\n  const toggleCastFilter = (next: CastBrowseFilter) => {\n    sfx.click();\n    setCastFilters((current) => {\n      const existing = current.findIndex((filter) => filter.kind === next.kind && filter.value === next.value);\n      if (existing >= 0) return current.filter((_, index) => index !== existing);\n      const base = next.kind === "type" ? current.filter((filter) => filter.kind !== "type") : current;\n      if (base.length >= 3) return current;\n      return [...base, next];\n    });\n  };\n  const castFilterLabel = (filter: CastBrowseFilter) =>\n    filter.kind === "type"\n      ? ANIME_TYPE_LABEL[filter.value]\n      : (GENRES.find((genre) => genre.id === filter.value)?.label ?? filter.value);`;
if (create.includes(derivedOld)) create = create.replace(derivedOld, derivedNew);
else if (!create.includes(`const filteredCastList = filterCastByFilters(castRow.list, castFilters);`)) throw new Error("Could not patch cast filter derivation");

const startMarker = `              {/* genre filter — visible affinities only, so hidden affinities never leak */}`;
const endMarker = `              {/* chosen-so-far strip — sticky so the current pick stays visible`;
const start = create.indexOf(startMarker);
const end = create.indexOf(endMarker);
if (start < 0 || end < 0 || end <= start) {
  if (!create.includes(`CAST FILTERS · UP TO 3`)) throw new Error("Could not locate cast filter UI block");
} else {
  const ui = `              {/* cast filters — anime type + visible affinities only; hidden affinities never leak */}\n              <div className="rounded-xl border border-line bg-panel2/70 p-2.5">\n                <div className="flex flex-wrap items-center gap-2">\n                  <button\n                    onClick={() => { sfx.click(); setCastFilterOpen((open) => !open); }}\n                    className={cn(\n                      "btn-press flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[10px] font-extrabold tracking-wider",\n                      castFilters.length ? "border-cyanx bg-cyanx/10 text-cyanx" : "border-line bg-panel3 text-paper/70"\n                    )}\n                  >\n                    <Filter size={13} />\n                    CAST FILTERS · {castFilters.length}/3\n                    <span className="rounded bg-abyss/60 px-1.5 py-0.5 text-[9px] text-paper/55">{filteredCastList.length}/{castRow.list.length}</span>\n                  </button>\n                  {castFilters.length > 0 && (\n                    <button\n                      onClick={() => { sfx.click(); setCastFilters([]); }}\n                      className="btn-press flex items-center gap-1 rounded-lg border border-line px-2 py-1.5 text-[9px] font-bold text-paper/55"\n                    >\n                      <X size={11} /> CLEAR ALL\n                    </button>\n                  )}\n                  {d.genres.map((genre) => {\n                    const g = GENRES.find((x) => x.id === genre);\n                    const active = isCastFilterActive("genre", genre);\n                    const blocked = castFilterAtLimit && !active;\n                    return (\n                      <button\n                        key={genre}\n                        disabled={blocked}\n                        onClick={() => toggleCastFilter({ kind: "genre", value: genre })}\n                        className={cn(\n                          "btn-press rounded-lg border px-2 py-1.5 text-[9px] font-bold",\n                          active ? "border-mint bg-mint/10 text-mint" : "border-line text-paper/50",\n                          blocked && "cursor-not-allowed opacity-35"\n                        )}\n                      >\n                        {active ? "FILTERING: " : "FILTER: "}{g?.label ?? genre}\n                      </button>\n                    );\n                  })}\n                </div>\n\n                {castFilters.length > 0 && (\n                  <div className="mt-2 flex flex-wrap items-center gap-1.5">\n                    <span className="text-[9px] font-extrabold tracking-[0.16em] text-paper/35">ACTIVE</span>\n                    {castFilters.map((filter) => (\n                      <button\n                        key={\\`\${filter.kind}:\${filter.value}\\`}\n                        onClick={() => toggleCastFilter(filter)}\n                        className="btn-press flex items-center gap-1 rounded-full border border-cyanx/45 bg-cyanx/10 px-2 py-1 text-[9px] font-bold text-cyanx"\n                        title="Remove this filter"\n                      >\n                        {castFilterLabel(filter)} <X size={10} />\n                      </button>\n                    ))}\n                  </div>\n                )}\n\n                {castFilterOpen && (\n                  <div className="mt-2 border-t border-line/60 pt-2">\n                    <div className="text-[9px] font-extrabold tracking-[0.18em] text-paper/40">ANIME TYPE</div>\n                    <div className="mt-1.5 flex flex-wrap gap-1.5">\n                      {(["shonen", "shojo"] as AnimeType[]).map((type) => {\n                        const active = isCastFilterActive("type", type);\n                        const hasTypeFilter = castFilters.some((filter) => filter.kind === "type");\n                        const blocked = castFilterAtLimit && !active && !hasTypeFilter;\n                        return (\n                          <button\n                            key={type}\n                            disabled={blocked}\n                            onClick={() => toggleCastFilter({ kind: "type", value: type })}\n                            className={cn(\n                              "btn-press rounded-full border px-2.5 py-1 text-[9px] font-extrabold",\n                              active ? "border-neon bg-neon/10 text-neon" : "border-line text-paper/55",\n                              blocked && "cursor-not-allowed opacity-35"\n                            )}\n                          >\n                            {ANIME_TYPE_LABEL[type]}\n                          </button>\n                        );\n                      })}\n                    </div>\n\n                    <div className="mt-2.5 text-[9px] font-extrabold tracking-[0.18em] text-paper/40">VISIBLE AFFINITY</div>\n                    <div className="mt-1.5 flex flex-wrap gap-1.5">\n                      {GENRES.map((g) => {\n                        const active = isCastFilterActive("genre", g.id);\n                        const blocked = castFilterAtLimit && !active;\n                        return (\n                          <button\n                            key={g.id}\n                            disabled={blocked}\n                            onClick={() => toggleCastFilter({ kind: "genre", value: g.id })}\n                            className={cn(\n                              "btn-press rounded-full border px-2 py-1 text-[9px] font-bold",\n                              active ? "border-cyanx bg-cyanx/10 text-cyanx" : "border-line text-paper/50",\n                              blocked && "cursor-not-allowed opacity-35"\n                            )}\n                          >\n                            {g.label}\n                          </button>\n                        );\n                      })}\n                    </div>\n                    <div className="mt-2 text-[9px] italic text-paper/35">\n                      Up to three filters combine with AND logic. Shonen/Shojo are mutually exclusive. Genre filters use visible affinities only — hidden affinities never affect results.\n                    </div>\n                  </div>\n                )}\n              </div>\n\n`;
  create = create.slice(0, start) + ui + create.slice(end);
}

fs.writeFileSync(CREATE, create);

const testSource = `import { describe, expect, it } from "vitest";
import { GENRES, PROTAGONISTS } from "../data";
import { filterCastByFilters, filterCastByVisibleGenre } from "../castDisplayOrder";

describe("cast browse filters", () => {
  it("keeps the mixed source order when no filter is active", () => {
    const result = filterCastByFilters(PROTAGONISTS, []);
    expect(result.map((m) => m.id)).toEqual(PROTAGONISTS.map((m) => m.id));
    expect(result).not.toBe(PROTAGONISTS);
  });

  it("filters directly by Shonen or Shojo", () => {
    for (const type of ["shonen", "shojo"] as const) {
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "type", value: type }]);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.type === type)).toBe(true);
    }
  });

  it("supports three simultaneous AND filters", () => {
    const target = PROTAGONISTS.find((member) => member.visibleAff.length >= 2)!;
    const filters = [
      { kind: "type" as const, value: target.type },
      { kind: "genre" as const, value: target.visibleAff[0] },
      { kind: "genre" as const, value: target.visibleAff[1] },
    ];
    const result = filterCastByFilters(PROTAGONISTS, filters);
    expect(result.some((member) => member.id === target.id)).toBe(true);
    expect(result.every((member) =>
      member.type === target.type &&
      member.visibleAff.includes(target.visibleAff[0]) &&
      member.visibleAff.includes(target.visibleAff[1])
    )).toBe(true);
  });

  it("returns only cast with each requested visible affinity", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const result = filterCastByVisibleGenre(PROTAGONISTS, genre);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.visibleAff.includes(genre))).toBe(true);
    }
  });

  it("never uses hidden affinities to satisfy genre filters", () => {
    for (const genre of GENRES.map((g) => g.id)) {
      const hiddenOnly = PROTAGONISTS.find((m) => m.hiddenAff === genre && !m.visibleAff.includes(genre));
      if (!hiddenOnly) continue;
      const result = filterCastByFilters(PROTAGONISTS, [{ kind: "genre", value: genre }]);
      expect(result.some((m) => m.id === hiddenOnly.id)).toBe(false);
    }
  });
});
`;
fs.writeFileSync(TEST, testSource);

console.log("Cast multi-filter patch applied: Shonen/Shojo + up to three AND filters, visible affinities only.");
