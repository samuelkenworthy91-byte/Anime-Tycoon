# RIVAL POSTER DROP FOLDER

Put externally-produced rival poster art here. Two supported forms:

## 1. Single posters (preferred)
One finished portrait poster per file, named by the manifest slot id:

    art_src/rival/external/sunrise_orbknights.png
    art_src/rival/external/bones_hollowtide.png

Slot ids live in `src/engine/generated/rivalPosterManifest.json`
(24 per studio). Any aspect ratio is fine — the pack script center-crops
to 4:5 and blows each up to 720×900 WebP.

## 2. Contact sheets (2×4, black dividers)
8 posters on one sheet, 2 columns × 4 rows, separated by black lines:

    art_src/rival/external/sheets/<anything>.png

Then register the sheet's cell order in `scripts/rivalPosterPack.py`
→ `SHEET_MAP` (row-major: top-left, top-right, …, bottom-right), then:

    python3 scripts/rivalPosterPack.py

The packer crops every cell, upscales to 720×900, writes
`public/rival-posters/<slot>.webp`, and re-runs `scripts/rivalPosterPlan.mjs`
so the engine's manifest flips that slot from `pending` to live.

## Requirements
- Textless key art only — no words, letters, logos, watermarks, or fake
  Japanese characters (the ceremony adds its own typography).
- Portrait composition works best (4:5), sharp blades — images are shown
  up to ~400px wide on screen.
- Original work only — no copyrighted characters/frames.
