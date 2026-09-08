#!/usr/bin/env node
import fs from "node:fs";

// One-shot branch migration for award key-visual identity.
function patch(path, replacements) {
  let source = fs.readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    if (source.includes(to)) continue;
    if (!source.includes(from)) throw new Error(`Could not find expected text in ${path}: ${from.slice(0, 100)}`);
    source = source.replace(from, to);
  }
  fs.writeFileSync(path, source);
}

patch("game_source/src/engine/awards.ts", [
  [
    'import type { AnimeType, GenreId } from "./data";',
    'import type { AnimeType, Draft, GenreId } from "./data";',
  ],
  [
    '  /** player shows render their poster from the lead cast portrait */\n  protag?: string | null;',
    '  /** frozen production identity used to reproduce the player show\'s exact official key visual */\n  draft?: Draft | null;\n  /** lead id retained for legacy saves / safe fallback poster rendering */\n  protag?: string | null;',
  ],
  [
    '    posterId: r.posterId ?? null,\n    protag: null,',
    '    posterId: r.posterId ?? null,\n    draft: null,\n    protag: null,',
  ],
]);

patch("game_source/src/engine/state.ts", [
  [
    '            posterId: n.posterId ?? null,\n            protag: n.protag ?? null,',
    '            posterId: n.posterId ?? null,\n            draft: n.draft ? migrateDraftV2(n.draft) : null,\n            protag: n.protag ?? null,',
  ],
  [
    '        posterId: null,\n        protag: draft.protag,',
    '        posterId: null,\n        draft: {\n          ...draft,\n          genres: [...draft.genres],\n          arcs: [...draft.arcs],\n          sliders: [...draft.sliders] as [number, number, number],\n        },\n        protag: draft.protag,',
  ],
]);

patch("game_source/src/engine/__tests__/awards.test.ts", [
  [
    '      expect(() => rivalNominee(r)).not.toThrow();\n      expect(rivalNominee(r).posterId === null || typeof rivalNominee(r).posterId === "string").toBe(true);',
    '      expect(() => rivalNominee(r)).not.toThrow();\n      expect(rivalNominee(r).posterId === null || typeof rivalNominee(r).posterId === "string").toBe(true);\n      expect(rivalNominee(r).draft).toBeNull();',
  ],
  [
    '    expect(entry.title).toBe("Award Bait Zero");\n    /* real production/result data — story actually dominates the point mix */',
    '    expect(entry.title).toBe("Award Bait Zero");\n    expect(entry.draft).toEqual(expect.objectContaining({ title: "Award Bait Zero", protag: d.protag, animeType: d.animeType }));\n    expect(entry.draft?.genres).toEqual(d.genres);\n    /* real production/result data — story actually dominates the point mix */',
  ],
]);

console.log("Awards poster identity data and regression assertions patched.");
