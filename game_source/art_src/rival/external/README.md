# RIVAL POSTER DROP FOLDER

This folder is the source drop for externally-produced rival poster art.

## Current canonical import format

The live rival-poster expansion uses **160 already-cropped individual PNGs** named `poster_001.png` through `poster_160.png`.

The stable poster-to-studio/type/genre/family assignment is stored in `src/engine/generated/rivalPosterCatalog.tsv`.

Run `node scripts/finalize-rival-posters.mjs` to verify and materialize the runtime set. It retains the six original Toe-i posters and generates a manifest with **28 slots per studio × 6 studios = 168 total**, currently **166 live + 2 reserve**.

The staging workflow `.github/workflows/finalize-rival-posters.yml` runs the import, test suite, production build, and Cast V3 coverage audit on `work/final-awards-rival-posters`.

## Future art drops

Already-cropped individual files are preferred. If art is generated on 4×2 sheets with black dividers, crop it to individual images first, then assign stable IDs/tags in the catalog.

## Artwork requirements

- Textless key art only: no titles, letters, logos, watermarks, signatures, or fake Japanese text.
- Strong portrait/key-visual composition; runtime cards may crop slightly depending on screen aspect ratio.
- Keep each rival studio visually distinct and use franchise `family` tags for related sequel/spinoff art.
- Original work only; no copyrighted characters or lifted frames.
